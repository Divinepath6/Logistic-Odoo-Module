from odoo import models, fields

class rastreo_etas(models.Model):
    _name = 'rastreo.etas'
    _description = 'Clase para guardar ETAs'
    _order = 'numero desc'

    pedido_id = fields.Many2one(
        'rastreo.pedido', 
        string='Pedido', 
        ondelete='cascade',
        required=True
    )
    numero = fields.Integer(
        string='Número de ETA (Número más alto, ETA más reciente)',
        required=True
    )
    texto = fields.Char(
        string='Texto o motivo del ETA'
    )
    fecha = fields.Date(
        string='Fecha acordada con el proveedor',
        required=True
    )