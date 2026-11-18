from odoo import models, fields

class rastreo_aviso(models.Model):
    _name = 'rastreo.aviso'
    _description = 'Avisos del sistema de logística'
    _order = 'create_date desc'

    importancia = fields.Selection([
        ('info', 'Información'),
        ('media', 'Media'),
        ('urgente', 'Urgente')
    ], string='Importancia', required=True, default='info')
    
    texto = fields.Char(string='Mensaje', required=True)
    
    pedido_id = fields.Many2one(
        'rastreo.pedido',
        string='Pedido',
        required=True,   
        ondelete='cascade',  
    )