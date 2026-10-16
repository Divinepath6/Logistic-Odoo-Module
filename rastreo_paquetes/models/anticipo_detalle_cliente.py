from odoo import models, fields, api
from odoo.exceptions import UserError
import base64
import json
from datetime import datetime

class rastreo_anticipo_detalle_cliente(models.Model):
    _name = 'rastreo.detalle_cliente'
    _description = 'Clase para guardar los anticipos de los clientes'
    numero = fields.Integer(
        string='Numero de anticipo'
    )    
    pedido_id = fields.Many2one(
        'rastreo.pedido', 
        string='Pedido', 
        ondelete='cascade', 
        required=True
    )
    currency_id = fields.Many2one(
        'res.currency', 
        string='Moneda',
        default=lambda self: self.env.company.currency_id
    )
    fecha_editado = fields.Datetime(
        string='Fecha'
    ) 
    cantidad = fields.Monetary(
        string='Cantidad en dolares '
    )
    precio_dolar = fields.Monetary(
        string='Precio de los dolares al momento'
    )
    pdf_anticipo_cliente = fields.Binary(
       string='Documento PDF', attachment=True
    )
    pdf_anticipo_cliente_nombre = fields.Char(
        string='Nombre del PDF'
    )

    fecha_anticipo = fields.Date(string='Fecha del anticipo')
    
    @api.model
    def guardar_detalle(self, pedido_id, anticipoId, datos, pdf=None, pdf_name=None):
        if not pedido_id:
            return {'success': False, 'error': 'Pedido no indicado'}
        pedido = self.env['rastreo.pedido'].browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        anticipo = self.browse(anticipoId)

        usd_currency = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)
        cantidad = self.search_count([('pedido_id', '=', pedido_id)])
        if cantidad == 0:
            cantidad = 1
        else:
            cantidad = cantidad + 1
        valores = {
            'pedido_id': pedido_id,
            'currency_id': usd_currency.id if usd_currency else False,
            'fecha_editado': fields.Datetime.now(),
            'fecha_anticipo': datos.get('fecha_anticipo') or False,
            'cantidad': datos.get('cantidad') or 0.0,
            'precio_dolar': datos.get('precio_dolar') or 0.0,
        }
        if pdf:
            valores['pdf_anticipo_cliente'] = pdf
            valores['pdf_anticipo_cliente_nombre'] = (
                pdf_name
                or f"anticipo_{pedido.numero_guia}_{cantidad}.pdf"
            )

        with self.env.cr.savepoint():
            if not anticipo.exists():
                valores['numero'] = cantidad
                self.create(valores)
            else:
                anticipo.write(
                    valores
                    )

        return {'success': True}


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