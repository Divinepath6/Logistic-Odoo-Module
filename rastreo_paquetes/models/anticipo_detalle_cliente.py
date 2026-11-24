from odoo import models, fields, api, _
from odoo.exceptions import UserError


class rastreo_anticipo_detalle_cliente(models.Model):
    _name = 'rastreo.detalle_cliente'
    _description = 'Anticipos de clientes (pagos) ligados a una cotización'

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
        selection=[('pago', 'Pago')],
        string='Tipo de registro',
        default='pago',
    )
    journal_id = fields.Many2one(
        'account.journal',
        string='Diario de pago',
        domain="[('type', 'in', ('bank', 'cash'))]",
        ondelete='set null',
    )
    payment_method_line_id = fields.Many2one(
        'account.payment.method.line',
        string='Método de pago',
        ondelete='set null',
    )
    account_payment_id = fields.Many2one(
        'account.payment',
        string='Pago generado',
        ondelete='set null',
    )

    @api.depends('monto_usd', 'precio_dolar')
    def _compute_monto_mxn(self):
        for record in self:
            record.monto_mxn = (record.monto_usd or 0.0) * (record.precio_dolar or 0.0)

    def _get_tipo_cambio_dia(self, fecha):
        usd = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)
        company_curr = self.env.company.currency_id
        if not usd:
            return 1.0
        rate = usd._get_conversion_rate(usd, company_curr, self.env.company, fecha or fields.Date.today())
        if rate and rate < 1.0:
            return 1.0 / rate
        return rate or 1.0

    @api.model
    def obtener_opciones_pago(self, anticipo_id=0):
        """Devuelve los diarios de banco/caja y sus métodos de pago entrantes disponibles en Odoo."""
        journals = self.env['account.journal'].search([
            ('type', 'in', ('bank', 'cash')),
            ('company_id', '=', self.env.company.id),
        ])

        diarios_data = []
        for j in journals:
            metodos = [
                {
                    'id': line.id,
                    'name': line.name,
                    'code': line.code,
                }
                for line in j.inbound_payment_method_line_ids
            ]
            diarios_data.append({
                'id': j.id,
                'name': j.name,
                'type': j.type,
                'metodos': metodos,
            })

        seleccion_actual = {}
        if anticipo_id:
            anticipo = self.browse(anticipo_id)
            if anticipo.exists():
                pago = anticipo.account_payment_id
                journal = anticipo.journal_id or (pago.journal_id if pago else False)
                method_line = anticipo.payment_method_line_id or (pago.payment_method_line_id if pago else False)
                seleccion_actual = {
                    'journal_id': journal.id if journal else 0,
                    'journal_name': journal.name if journal else '',
                    'payment_method_line_id': method_line.id if method_line else 0,
                    'payment_method_name': method_line.name if method_line else '',
                }

        return {
            'success': True,
            'diarios': diarios_data,
            'seleccion_actual': seleccion_actual,
        }

    @api.model
    def buscar_referencia_existente(self, pedido_id, referencia):
        """Busca un pago de cliente ya registrado en Odoo por su referencia o memo."""
        if not referencia or not referencia.strip():
            return {'success': False, 'error': 'Ingrese una referencia para buscar.'}

        ref = referencia.strip()
        pedido = self.env['rastreo.pedido'].browse(pedido_id)
        sale_order = pedido.sale_order_id if pedido.exists() else False
        partner_id = sale_order.partner_id.id if sale_order else False

        usd_currency = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)

        domain_pago = [
            ('partner_type', '=', 'customer'),
            ('payment_type', '=', 'inbound'),
            ('state', 'in', ('posted', 'paid', 'in_process')),
            '|', ('name', 'ilike', ref), ('memo', 'ilike', ref),
        ]
        if partner_id:
            domain_pago.append(('partner_id', '=', partner_id))

        pago = self.env['account.payment'].search(domain_pago, limit=1)
        if not pago:
            return {
                'success': False,
                'error': 'No se encontró ningún pago publicado con esa referencia para este cliente.'
            }

        ya_usado = self.search([('account_payment_id', '=', pago.id)], limit=1)
        if ya_usado:
            return {
                'success': False,
                'error': f'El pago {pago.name} ya está vinculado en el anticipo #{ya_usado.numero}.'
            }

        monto_usd = pago.amount
        if usd_currency and pago.currency_id != usd_currency:
            monto_usd = pago.currency_id._convert(
                pago.amount, usd_currency, self.env.company, pago.date or fields.Date.today()
            )

        return {
            'success': True,
            'tipo': 'pago',
            'record_id': pago.id,
            'referencia_encontrada': pago.name,
            'fecha': str(pago.date),
            'monto_usd': round(monto_usd, 2),
            'tipo_cambio': self._get_tipo_cambio_dia(pago.date),
            'journal_id': pago.journal_id.id if pago.journal_id else 0,
            'journal_name': pago.journal_id.name if pago.journal_id else '',
            'payment_method_line_id': pago.payment_method_line_id.id if pago.payment_method_line_id else 0,
            'payment_method_name': pago.payment_method_line_id.name if pago.payment_method_line_id else '',
        }

    @api.model
    def guardar_detalle(self, pedido_id, anticipoId, datos, pdf=None, pdf_name=None):
        if not pedido_id:
            return {'success': False, 'error': 'Pedido no indicado'}

        pedido = self.env['rastreo.pedido'].browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}

        sale_order = pedido.sale_order_id
        if not sale_order:
            return {'success': False, 'error': 'El pedido no tiene una cotización asociada.'}

        monto_usd = float(datos.get('cantidad') or datos.get('monto_usd') or 0.0)
        fecha_anticipo = datos.get('fecha_anticipo') or fields.Date.today()
        precio_dolar = float(datos.get('precio_dolar') or 0.0) or self._get_tipo_cambio_dia(fecha_anticipo)
        journal_id = int(datos.get('journal_id') or 0)
        payment_method_line_id = int(datos.get('payment_method_line_id') or 0)

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

                modo_vinculo = datos.get('modo_vinculo') or 'crear'
                existing_record_id = int(datos.get('existing_record_id') or 0)

                usd_currency = self.env['res.currency'].search([('name', '=', 'USD')], limit=1) or self.env.company.currency_id
                numero = self.search_count([('pedido_id', '=', pedido_id)]) + 1

                if modo_vinculo == 'vincular' and existing_record_id:
                    payment = self.env['account.payment'].browse(existing_record_id)
                    if not payment.exists():
                        return {'success': False, 'error': 'El pago seleccionado ya no existe.'}
                    journal_id = payment.journal_id.id
                    payment_method_line_id = payment.payment_method_line_id.id
                else:
                    if not journal_id:
                        return {'success': False, 'error': 'Debe seleccionar un diario (banco o caja).'}

                    ref = f"Anticipo {sale_order.name}"
                    if pedido.numero_contrato:
                        ref = f"Anticipo {sale_order.name} / {pedido.numero_contrato}"

                    payment = self._crear_pago(
                        sale_order=sale_order,
                        monto_usd=monto_usd,
                        fecha=fecha_anticipo,
                        memo_ref=ref,
                        usd_currency=usd_currency,
                        journal_id=journal_id,
                        payment_method_line_id=payment_method_line_id,
                    )

                valores = {
                    'pedido_id': pedido_id,
                    'numero': numero,
                    'currency_id': self.env.company.currency_id.id,
                    'fecha_editado': fields.Datetime.now(),
                    'fecha_anticipo': fecha_anticipo,
                    'monto_usd': monto_usd,
                    'precio_dolar': precio_dolar,
                    'tipo_registro': 'pago',
                    'journal_id': journal_id or False,
                    'payment_method_line_id': payment_method_line_id or False,
                    'account_payment_id': payment.id if payment else False,
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

    def _crear_pago(self, sale_order, monto_usd, fecha, memo_ref, usd_currency, journal_id, payment_method_line_id=0):
        journal = self.env['account.journal'].browse(journal_id)
        if not journal.exists():
            raise UserError(_('El diario de pago seleccionado no es válido.'))

        payment_vals = {
            'payment_type': 'inbound',
            'partner_type': 'customer',
            'partner_id': sale_order.partner_id.id,
            'amount': monto_usd,
            'date': fecha,
            'journal_id': journal.id,
            'currency_id': usd_currency.id,
            'memo': memo_ref,
        }
        if payment_method_line_id:
            payment_vals['payment_method_line_id'] = payment_method_line_id

        payment = self.env['account.payment'].create(payment_vals)
        payment.action_post()

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