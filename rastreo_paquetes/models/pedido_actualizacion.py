from odoo import models, fields

class rastreo_pedido_actualizacion(models.Model):
    _name = 'rastreo.pedido_actualizacion'
    _description = 'Clase para guardar las actualizaciones de los pedidos'
    numero_actualizacion = fields.Integer(
        string='Número de la actualizacion'
    )
    fecha_actualizacion = fields.Datetime(
        string='Fecha'
    )    
    actualizacion_texto = fields.Char(
        string='Texto de que se actualizo'
    )
    
    usuario_id = fields.Many2one(
        'res.users',
        string='Usuario',
        default=lambda self: self.env.user,
        readonly=True,
        index=True,
    )
    pedido_id = fields.Many2one(
        'rastreo.pedido',
        string='Pedido',
        required=True,   
        ondelete='cascade',  
    )