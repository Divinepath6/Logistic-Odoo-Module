from odoo import models, fields

class rastreo_termino(models.Model):
    _name = 'rastreo.termino'
    _description = 'Clase de los terminos del contrato'

    pedido_id = fields.Many2one(
        'rastreo.pedido', 
        string='Pedido', 
        ondelete='cascade'
    )
    numero = fields.Integer(
        string = 'Numero de termino'
    )
    porcentaje = fields.Float(
        string='Porcentaje de pago', 
        digits=(5, 2),
        required=True
    )
    texto = fields.Char(
        string = 'Texto de termino'
    )
    fecha_compromiso = fields.Date(
        string = 'Fecha acordada con el proveedor'
    )