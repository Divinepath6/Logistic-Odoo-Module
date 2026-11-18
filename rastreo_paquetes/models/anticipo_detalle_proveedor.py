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

    @api.depends('monto_usd', 'precio_dolar')
    def _compute_monto_mxn(self):
        """Calcula automáticamente el total en MXN multiplicando los dólares por el tipo de cambio."""
        for record in self:
            record.monto_mxn = record.monto_usd * record.precio_dolar

    @api.model
    def crear_pago_proveedor(self, vals):
        """
        Método para registrar el anticipo/pago, capturar el tipo de cambio del día 
        si no se provee, y crear el asiento de pago vinculado al Invoice del pedido.
        """

        if not vals.get('precio_dolar'):
            usd = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)
            company_curr = self.env.company.currency_id
            fecha = vals.get('fecha_anticipo', fields.Date.today())
            rate = usd._get_conversion_rate(usd, company_curr, self.env.company, fecha)
            vals['precio_dolar'] = (1.0 / rate) if rate else 1.0

        # 1. Crear el registro en tu modelo de detalle
        detalle = self.create(vals)

        # 2. Obtener la referencia del Invoice desde el pedido relacionado
        pedido = detalle.pedido_id
        referencia_invoice = pedido.numero_guia or f"ANTICIPO-{detalle.numero}"

        # 3. Registrar el pago contable en Odoo (account.payment) con la referencia del Invoice
        payment_vals = {
            'payment_type': 'outbound',  
            'partner_type': 'supplier',
            'amount': detalle.monto_mxn,
            'currency_id': detalle.currency_id.id,
            'date': detalle.fecha_anticipo,
            'ref': f"Invoice: {referencia_invoice}",
            'partner_id': pedido.cliente_id.id if hasattr(pedido, 'cliente_id') else False,
        }
        self.env['account.payment'].create(payment_vals)

        return detalle

    def cargar_detalle_pago(self):
        """
        Método para cargar y devolver toda la información guardada del pago,
        incluyendo montos en ambas monedas y la referencia del invoice.
        """
        self.ensure_one()
        return {
            'id': self.id,
            'numero_anticipo': self.numero,
            'referencia_invoice': self.pedido_id.numero_guia or 'Sin Invoice',
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
        Método ORM llamado desde el JS para crear o actualizar un anticipo de proveedor,
        manejar el PDF adjunto, calcular tipos de cambio y registrar el pago en Odoo.
        """
        try:
            # 1. Asignar el pedido_id a los valores
            vals['pedido_id'] = pedido_id
            
            # Mapear el campo 'cantidad' del JS a 'monto_usd' de tu modelo
            if 'cantidad' in vals:
                vals['monto_usd'] = vals.pop('cantidad')

            # Manejar el archivo PDF si se envía
            if pdf:
                vals['pdf_anticipo_proveedor'] = pdf
            if pdf_nombre:
                vals['pdf_anticipo_proveedor_nombre'] = pdf_nombre

            # 2. Si no mandan el precio del dólar, Odoo lo busca automáticamente para esa fecha
            if not vals.get('precio_dolar'):
                usd = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)
                company_curr = self.env.company.currency_id
                fecha = vals.get('fecha_anticipo', fields.Date.today())
                rate = usd._get_conversion_rate(usd, company_curr, self.env.company, fecha)
                vals['precio_dolar'] = (1.0 / rate) if rate else 1.0

            detalle = None
            if anticipo_id and anticipo_id != 0:
                # --- EDICIÓN ---
                detalle = self.browse(anticipo_id)
                if detalle.exists():
                    detalle.write(vals)
                else:
                    return {'success': False, 'error': 'El anticipo a editar no existe.'}
            else:
                # --- CREACIÓN ---
                # Calcular el número consecutivo de anticipo para este pedido
                ultimo_anticipo = self.search([('pedido_id', '=', pedido_id)], order='numero desc', limit=1)
                siguiente_numero = (ultimo_anticipo.numero + 1) if ultimo_anticipo else 1
                vals['numero'] = siguiente_numero

                detalle = self.create(vals)

            # 3. Registrar o actualizar el pago contable en Odoo (account.payment)
            pedido = detalle.pedido_id
            referencia_invoice = pedido.numero_guia or f"ANTICIPO-{detalle.numero}"

            payment_vals = {
                'payment_type': 'outbound',  # Pago a proveedor (salida)
                'partner_type': 'supplier',
                'amount': detalle.monto_mxn,
                'currency_id': detalle.currency_id.id,
                'date': detalle.fecha_anticipo,
                'memo': f"Invoice: {referencia_invoice}",  # <-- CAMBIADO DE 'ref' A 'memo' PARA ODOO 19
                'partner_id': pedido.cliente_id.id if hasattr(pedido, 'cliente_id') else False,
            }
            
            self.env['account.payment'].create(payment_vals)
            # Opcional: Si quieres registrar un nuevo pago contable cada vez que se guarde un anticipo:
            self.env['account.payment'].create(payment_vals)

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