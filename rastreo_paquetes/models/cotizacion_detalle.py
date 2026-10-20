from odoo import models, fields

class rastreo_cotizacion_detalle(models.Model):
    _name = 'rastreo.cotizacion_detalle'
    _description = 'Clase para guardar el detalle de cada pedido'

    numero = fields.Integer(
        string='numero de la cotizacion', 
    )
    costo_rack = fields.Monetary(
        string='costo individual del rack',
        currency_field='currency_id'    
    )
    rack_id = fields.Many2one(
        'rastreo.rack_detalle',
        string='Id del rack',
        required=True,
        ondelete='cascade',
    )
    sale_order_line_id = fields.Many2one(
        'sale.order.line',
        string='Línea de cotización de Odoo',
        ondelete='set null',
    )
    currency_id = fields.Many2one(
        'res.currency', 
        string='Moneda', 
        default=lambda self: self.env.company.currency_id
    )
    cantidad_racks = fields.Integer(
        string='Cantidad de racks acordados', 
    )
    pedido_id = fields.Many2one(
        'rastreo.pedido',
        string='Pedido',
        required=True,   
        ondelete='cascade',  
    )
        