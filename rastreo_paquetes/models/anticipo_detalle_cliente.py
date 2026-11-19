from odoo import models, fields, api, _
from odoo.exceptions import UserError


class rastreo_anticipo_detalle_cliente(models.Model):
    _name = 'rastreo.detalle_cliente'
    _description = 'Anticipos de clientes (pago o factura) ligados a una cotización'

    numero = fields.Integer(string='Número de anticipo', required=True)
    pedido_id = fields.Many2one(
        'rastreo.pedido',
        string='Pedido',
        ondelete='cascade',
        required=True,
    )
    currency_id = fields.Many2one(
        'res.currency',
        string='Moneda',
        default=lambda self: self.env.company.currency_id,
        readonly=True,
    )
    fecha_editado = fields.Datetime(
        string='Fecha de edición',
        default=fields.Datetime.now,
    )
    fecha_anticipo = fields.Date(
        string='Fecha del anticipo',
        default=fields.Date.context_today,
        required=True,
    )

    # Campos limpios para montos en ambas monedas y tipo de cambio
    monto_usd = fields.Monetary(
        string='Monto en USD',
        currency_field='currency_id',
        required=True,
    )
    precio_dolar = fields.Float(
        string='Tipo de Cambio (Precio del Dólar)',
        digits=(16, 4),
        required=True,
    )
    monto_mxn = fields.Monetary(
        string='Monto Equivalente en MXN',
        currency_field='currency_id',
        compute='_compute_monto_mxn',
        store=True,
    )

    pdf_anticipo_cliente = fields.Binary(
        string='Documento PDF',
        attachment=True,
    )
    pdf_anticipo_cliente_nombre = fields.Char(
        string='Nombre del PDF',
    )

    tipo_registro = fields.Selection(
        selection=[
            ('pago', 'Pago'),
            ('factura', 'Factura'),
        ],
        string='Tipo de registro',
        default='pago',
    )
    account_payment_id = fields.Many2one(
        'account.payment',
        string='Pago generado',
        ondelete='set null',
    )
    account_move_id = fields.Many2one(
        'account.move',
        string='Factura generada',
        ondelete='set null',
    )

    @api.depends('monto_usd', 'precio_dolar')
    def _compute_monto_mxn(self):
        for record in self:
            record.monto_mxn = (record.monto_usd or 0.0) * (record.precio_dolar or 0.0)

    def _get_sale_order(self, pedido):
        return pedido.sale_order_id

    def _get_bank_journal(self):
        journal = self.env['account.journal'].search(
            [('type', 'in', ('bank', 'cash')), ('company_id', '=', self.env.company.id)],
            limit=1,
        )
        if not journal:
            raise UserError(_('No hay diario de banco o caja configurado.'))
        return journal

    def _get_tipo_cambio_dia(self, fecha):
        usd = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)
        company_curr = self.env.company.currency_id
        if not usd:
            return 1.0
        rate = usd._get_conversion_rate(usd, company_curr, self.env.company, fecha or fields.Date.today())
        if rate and rate < 1.0:
            return 1.0 / rate
        return rate or 1.0

    def _crear_pago(self, sale_order, monto_usd, fecha, memo_ref, usd_currency):
        journal = self._get_bank_journal()
        # En Odoo 19 se usa 'memo' en account.payment
        payment = self.env['account.payment'].create({
            'payment_type': 'inbound',
            'partner_type': 'customer',
            'partner_id': sale_order.partner_id.id,
            'amount': monto_usd,
            'date': fecha,
            'journal_id': journal.id,
            'currency_id': usd_currency.id,
            'memo': memo_ref,
        })

        payment.action_post()

        # Conciliar automáticamente si existen facturas publicadas pendientes de la cotización
        facturas_pendientes = sale_order.invoice_ids.filtered(
            lambda f: f.move_type == 'out_invoice' and f.state == 'posted' and f.payment_state != 'paid'
        )
        if facturas_pendientes and payment.move_id:
            lines = (payment.move_id.line_ids + facturas_pendientes.line_ids).filtered(
                lambda l: l.account_id.account_type == 'asset_receivable' and not l.reconciled
            )
            if lines:
                lines.reconcile()

        return payment

    def _crear_factura(self, sale_order, monto_usd, fecha, ref, usd_currency):
        journal = self.env['account.journal'].search([
            ('type', '=', 'sale'),
            ('company_id', '=', self.env.company.id),
        ], limit=1)

        if not journal:
            raise UserError(_('No hay un diario de ventas configurado para la compañía.'))

        move_vals = {
            'move_type': 'out_invoice',
            'partner_id': sale_order.partner_id.id,
            'invoice_date': fecha,
            'currency_id': usd_currency.id,
            'invoice_origin': sale_order.name,
            'ref': ref,
            'journal_id': journal.id,
            'invoice_line_ids': [(0, 0, {
                'name': f'Asociado a {sale_order.name}',
                'quantity': 1.0,
                'price_unit': monto_usd,
            })],
        }
        invoice = self.env['account.move'].create(move_vals)
        invoice.action_post()
        return invoice

    @api.model
    def guardar_detalle(self, pedido_id, anticipoId, datos, pdf=None, pdf_name=None):
        if not pedido_id:
            return {'success': False, 'error': 'Pedido no indicado'}

        pedido = self.env['rastreo.pedido'].browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}

        sale_order = self._get_sale_order(pedido)
        if not sale_order:
            return {'success': False, 'error': 'El pedido no tiene una cotización asociada.'}

        monto_usd = float(datos.get('cantidad') or datos.get('monto_usd') or 0.0)
        fecha_anticipo = datos.get('fecha_anticipo') or fields.Date.today()
        precio_dolar = float(datos.get('precio_dolar') or 0.0) or self._get_tipo_cambio_dia(fecha_anticipo)

        anticipo = self.browse(anticipoId) if anticipoId else self.browse()

        try:
            with self.env.cr.savepoint():
                if anticipo.exists():
                    vals_edit = {
                        'monto_usd': monto_usd,
                        'precio_dolar': precio_dolar,
                        'fecha_anticipo': fecha_anticipo,
                        'fecha_editado': fields.Datetime.now(),
                    }
                    if pdf:
                        vals_edit['pdf_anticipo_cliente'] = pdf
                        vals_edit['pdf_anticipo_cliente_nombre'] = (
                            pdf_name or anticipo.pdf_anticipo_cliente_nombre or f"anticipo_{sale_order.name}_{anticipo.numero}.pdf"
                        )
                    anticipo.write(vals_edit)
                    return {'success': True, 'anticipo_id': anticipo.id}

                tipo = datos.get('tipo') or 'pago'
                usd_currency = self.env['res.currency'].search([('name', '=', 'USD')], limit=1) or self.env.company.currency_id
                numero = self.search_count([('pedido_id', '=', pedido_id)]) + 1

                ref = f"Anticipo {sale_order.name}"
                if pedido.numero_contrato:
                    ref = f"Anticipo {sale_order.name} / {pedido.numero_contrato}"

                payment = self.env['account.payment']
                invoice = self.env['account.move']

                if tipo == 'pago':
                    payment = self._crear_pago(sale_order, monto_usd, fecha_anticipo, ref, usd_currency)
                else:
                    invoice = self._crear_factura(sale_order, monto_usd, fecha_anticipo, ref, usd_currency)

                valores = {
                    'pedido_id': pedido_id,
                    'numero': numero,
                    'currency_id': self.env.company.currency_id.id,
                    'fecha_editado': fields.Datetime.now(),
                    'fecha_anticipo': fecha_anticipo,
                    'monto_usd': monto_usd,
                    'precio_dolar': precio_dolar,
                    'tipo_registro': tipo,
                    'account_payment_id': payment.id if payment else False,
                    'account_move_id': invoice.id if invoice else False,
                }
                if pdf:
                    valores['pdf_anticipo_cliente'] = pdf
                    valores['pdf_anticipo_cliente_nombre'] = (
                        pdf_name or f"anticipo_{sale_order.name}_{numero}.pdf"
                    )
                detalle = self.create(valores)

            return {'success': True, 'anticipo_id': detalle.id}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def cargar_detalle_pago(self):
        self.ensure_one()
        referencia_odoo = ''
        if self.account_payment_id:
            referencia_odoo = self.account_payment_id.name or self.account_payment_id.memo or ''
        elif self.account_move_id:
            referencia_odoo = self.account_move_id.name or self.account_move_id.ref or ''

        return {
            'id': self.id,
            'numero_anticipo': self.numero,
            'cotizacion': self.pedido_id.sale_order_id.name if self.pedido_id.sale_order_id else 'Sin Cotización',
            'referencia_odoo': referencia_odoo or f"{self.numero}",
            'tipo_registro': self.tipo_registro,
            'fecha_anticipo': self.fecha_anticipo,
            'monto_usd': self.monto_usd,
            'precio_dolar': self.precio_dolar,
            'monto_mxn': self.monto_mxn,
            'tiene_pdf': bool(self.pdf_anticipo_cliente),
            'nombre_pdf': self.pdf_anticipo_cliente_nombre or 'Sin archivo',
        }

    @api.model
    def obtener_pdf(self, detalle_id):
        detalle = self.browse(detalle_id)
        if not detalle.exists():
            return {'success': False, 'error': 'Detalle no encontrado'}
        pdf = detalle.pdf_anticipo_cliente
        if isinstance(pdf, bytes):
            pdf = pdf.decode('utf-8')
        return {
            'success': True,
            'pdf': pdf or False,
            'filename': detalle.pdf_anticipo_cliente_nombre or 'anticipo.pdf',
        }