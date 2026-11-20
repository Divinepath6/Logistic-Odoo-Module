from odoo import models, fields, api


class rastreo_anticipo_detalle_proveedor(models.Model):
    _name = 'rastreo.detalle_proveedor'
    _description = 'Detalle de pagos y anticipos a proveedores'

    numero = fields.Integer(
        string='Número de anticipo',
        required=True
    )
    pedido_id = fields.Many2one(
        'rastreo.pedido',
        string='Pedido',
        ondelete='cascade',
        required=True
    )
    account_payment_id = fields.Many2one(
        'account.payment',
        string='Pago contable en Odoo',
        ondelete='set null'
    )
    fecha_anticipo = fields.Date(
        string='Fecha del anticipo',
        default=fields.Date.context_today,
        required=True
    )
    currency_id = fields.Many2one(
        'res.currency',
        string='Moneda',
        default=lambda self: self.env.company.currency_id,
        readonly=True
    )
    monto_usd = fields.Monetary(
        string='Monto en USD',
        currency_field='currency_id',
        required=True
    )
    precio_dolar = fields.Float(
        string='Tipo de Cambio (Precio del Dólar)',
        digits=(16, 4),
        required=True
    )
    monto_mxn = fields.Monetary(
        string='Monto Equivalente en MXN',
        currency_field='currency_id',
        compute='_compute_monto_mxn',
        store=True
    )
    pdf_anticipo_proveedor = fields.Binary(
        string='Comprobante PDF',
        attachment=True
    )
    pdf_anticipo_proveedor_nombre = fields.Char(
        string='Nombre del PDF'
    )

    journal_id = fields.Many2one(
        'account.journal',
        string='Diario / Método de pago',
        domain="[('type', 'in', ('bank', 'cash'))]",
        ondelete='set null'
    )

    @api.depends('monto_usd', 'precio_dolar')
    def _compute_monto_mxn(self):
        """Calcula automáticamente el total en MXN multiplicando los dólares por el tipo de cambio."""
        for record in self:
            record.monto_mxn = record.monto_usd * record.precio_dolar

    def _obtener_tc_usd(self, fecha):
        usd = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)
        if not usd:
            return 1.0
        company_curr = self.env.company.currency_id
        rate = usd._get_conversion_rate(usd, company_curr, self.env.company, fecha or fields.Date.today())
        if rate and rate < 1.0:
            return 1.0 / rate
        return rate or 1.0

    @api.model
    def crear_pago_proveedor(self, vals):
        """
        Registra el anticipo/pago, captura el tipo de cambio del día si no se provee,
        y crea un único pago contable vinculado al proveedor del pedido.
        """
        if not vals.get('precio_dolar'):
            vals['precio_dolar'] = self._obtener_tc_usd(vals.get('fecha_anticipo'))

        detalle = self.create(vals)
        pedido = detalle.pedido_id
        referencia_invoice = pedido.numero_contrato or pedido.numero_guia or f"ANTICIPO-{detalle.numero}"

        payment_vals = {
            'payment_type': 'outbound',
            'partner_type': 'supplier',
            'amount': detalle.monto_mxn,
            'currency_id': detalle.currency_id.id,
            'date': detalle.fecha_anticipo,
            'memo': f"Invoice: {referencia_invoice}",
            'partner_id': pedido.proveedor_id.id if pedido.proveedor_id else False,
        }
        pago = self.env['account.payment'].create(payment_vals)
        pago.action_post()
        detalle.account_payment_id = pago.id

        pedido.crear_aviso(pedido.id)
        return detalle

    def cargar_detalle_pago(self):
        self.ensure_one()
        return {
            'id': self.id,
            'numero_anticipo': self.numero,
            'referencia_invoice': self.pedido_id.numero_contrato or self.pedido_id.numero_guia or 'Sin Invoice',
            'fecha_anticipo': self.fecha_anticipo,
            'monto_usd': self.monto_usd,
            'precio_dolar': self.precio_dolar,
            'monto_mxn': self.monto_mxn,
            'tiene_pdf': bool(self.pdf_anticipo_proveedor),
            'nombre_pdf': self.pdf_anticipo_proveedor_nombre or 'Sin archivo',
        }

    @api.model
    def guardar_detalle(self, pedido_id, anticipo_id, vals, pdf=False, pdf_nombre=False):
        """
        - Si anticipo_id == 0 (Creación): crea el detalle, crea un único account.payment
          en el diario seleccionado y lo confirma con action_post().
        - Si anticipo_id != 0 (Edición): solo actualiza el precio del dólar (y PDF si cambió),
          sin duplicar ni volver a crear pagos en Odoo.
        """
        try:
            if 'cantidad' in vals:
                vals['monto_usd'] = vals.pop('cantidad')

            if not vals.get('precio_dolar'):
                vals['precio_dolar'] = self._obtener_tc_usd(vals.get('fecha_anticipo'))

            # =========================================================
            # MODO EDICIÓN: Solo actualizar precio_dolar (y PDF)
            # =========================================================
            if anticipo_id and int(anticipo_id) != 0:
                detalle = self.browse(int(anticipo_id))
                if not detalle.exists():
                    return {'success': False, 'error': 'El anticipo a editar no existe.'}

                vals_edicion = {
                    'precio_dolar': vals['precio_dolar'],
                }
                if pdf:
                    vals_edicion['pdf_anticipo_proveedor'] = pdf
                if pdf_nombre:
                    vals_edicion['pdf_anticipo_proveedor_nombre'] = pdf_nombre

                detalle.write(vals_edicion)
                detalle.pedido_id.crear_aviso(detalle.pedido_id.id)

                return {'success': True, 'id': detalle.id}

            # =========================================================
            # MODO CREACIÓN: Crear detalle + 1 único pago en Odoo
            # =========================================================
            vals['pedido_id'] = pedido_id
            if pdf:
                vals['pdf_anticipo_proveedor'] = pdf
            if pdf_nombre:
                vals['pdf_anticipo_proveedor_nombre'] = pdf_nombre

            ultimo_anticipo = self.search(
                [('pedido_id', '=', pedido_id)],
                order='numero desc',
                limit=1
            )
            vals['numero'] = (ultimo_anticipo.numero + 1) if ultimo_anticipo else 1

            detalle = self.create(vals)
            pedido = detalle.pedido_id
            referencia_invoice = pedido.numero_contrato or pedido.numero_guia or f"ANTICIPO-{detalle.numero}"

            payment_vals = {
                'payment_type': 'outbound',
                'partner_type': 'supplier',
                'amount': detalle.monto_mxn,
                'currency_id': detalle.currency_id.id,
                'date': detalle.fecha_anticipo,
                'memo': f"Invoice: {referencia_invoice}",
                'partner_id': pedido.proveedor_id.id if pedido.proveedor_id else False,
            }
            if vals.get('journal_id'):
                payment_vals['journal_id'] = int(vals['journal_id'])

            pago = self.env['account.payment'].create(payment_vals)
            pago.action_post()
            detalle.account_payment_id = pago.id

            pedido.crear_aviso(pedido.id)
            return {'success': True, 'id': detalle.id}

        except Exception as e:
            return {'success': False, 'error': str(e)}

    @api.model
    def obtener_pdf(self, detalle_id):
        detalle = self.browse(detalle_id)
        if not detalle.exists():
            return {'success': False, 'error': 'Detalle no encontrado'}
        pdf = detalle.pdf_anticipo_proveedor
        if isinstance(pdf, bytes):
            pdf = pdf.decode('utf-8')
        return {
            'success': True,
            'pdf': pdf or False,
            'filename': detalle.pdf_anticipo_proveedor_nombre or 'anticipo.pdf',
        }