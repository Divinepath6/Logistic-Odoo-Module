from odoo import models, fields, api, _
from odoo.exceptions import UserError


class rastreo_anticipo_detalle_cliente(models.Model):
    _name = 'rastreo.detalle_cliente'
    _description = 'Anticipos de clientes (pago o factura) ligados a una cotización'

    numero = fields.Integer(string='Numero de anticipo')
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
    )
    fecha_editado = fields.Datetime(string='Fecha de edición')
    fecha_anticipo = fields.Date(string='Fecha del anticipo')
    cantidad = fields.Monetary(string='Cantidad en dólares')
    precio_dolar = fields.Monetary(string='Precio del dólar al momento')

    pdf_anticipo_cliente = fields.Binary(string='Documento PDF', attachment=True)
    pdf_anticipo_cliente_nombre = fields.Char(string='Nombre del PDF')

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

    def _crear_pago(self, sale_order, cantidad, fecha, ref, currency):
            journal = self._get_bank_journal()
            payment = self.env['account.payment'].create({
                'payment_type': 'inbound',
                'partner_type': 'customer',
                'partner_id': sale_order.partner_id.id,
                'amount': cantidad,
                'date': fecha,
                'journal_id': journal.id,
                'currency_id': currency.id,
            })

            if payment.move_id:
                payment.move_id.write({'ref': ref})

            payment.action_post()
            
            facturas_pendientes = sale_order.invoice_ids.filtered(
                lambda f: f.move_type == 'out_invoice' and f.state == 'posted' and f.payment_state != 'paid'
            )
            if facturas_pendientes:
                lines = (payment.line_ids + facturas_pendientes.line_ids).filtered(
                    lambda l: l.account_id.account_type == 'asset_receivable' and not l.reconciled
                )
                if lines:
                    lines.reconcile()

            return payment

    
    def _crear_factura(self, sale_order, cantidad, fecha, ref, currency):
        journal = self.env['account.journal'].search([
            ('type', '=', 'sale'),
            ('company_id', '=', self.env.company.id)
        ], limit=1)

        if not journal:
            raise UserError(_('No hay un diario de ventas configurado para la compañía.'))

        move_vals = {
            'move_type': 'out_invoice',
            'partner_id': sale_order.partner_id.id,
            'invoice_date': fecha,
            'currency_id': currency.id,
            'invoice_origin': sale_order.name,
            'ref': ref,
            'journal_id': journal.id,
            'invoice_line_ids': [(0, 0, {
                'name': f'Anticipo / Factura asociada a {sale_order.name}',
                'quantity': 1.0,
                'price_unit': cantidad,
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

        anticipo = self.browse(anticipoId)

        with self.env.cr.savepoint():
            if anticipo.exists():
                anticipo.write({
                    'pedido_id': pedido_id,
                    'precio_dolar': datos.get('precio_dolar') or 0.0,
                })
                return {'success': True, 'anticipo_id': anticipo.id}

            sale_order = self._get_sale_order(pedido)
            if not sale_order:
                return {'success': False, 'error': 'El pedido no tiene una cotización asociada.'}

            tipo = datos.get('tipo') or 'pago'
            cantidad = datos.get('cantidad') or 0.0
            precio_dolar = datos.get('precio_dolar') or 0.0
            fecha_anticipo = datos.get('fecha_anticipo') or fields.Date.today()

            usd_currency = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)
            currency = usd_currency or self.env.company.currency_id
            ref = f'Anticipo {sale_order.name}'
            numero = self.search_count([('pedido_id', '=', pedido_id)]) + 1

            payment = self.env['account.payment']
            invoice = self.env['account.move']

            if tipo == 'pago':
                payment = self._crear_pago(sale_order, cantidad, fecha_anticipo, ref, currency)
            else:
                invoice = self._crear_factura(sale_order, cantidad, fecha_anticipo, ref, currency)

            valores = {
                'pedido_id': pedido_id,
                'numero': numero,
                'currency_id': currency.id,
                'fecha_editado': fields.Datetime.now(),
                'fecha_anticipo': fecha_anticipo,
                'cantidad': cantidad,
                'precio_dolar': precio_dolar,
                'tipo_registro': tipo,
                'account_payment_id': payment.id if payment else False,
                'account_move_id': invoice.id if invoice else False,
            }
            if pdf:
                valores['pdf_anticipo_cliente'] = pdf
                valores['pdf_anticipo_cliente_nombre'] = (
                    pdf_name or f"anticipo_{pedido.numero_guia}_{numero}.pdf"
                )
            detalle = self.create(valores)

        return {'success': True, 'anticipo_id': detalle.id}
    
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