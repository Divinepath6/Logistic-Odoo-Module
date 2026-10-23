from odoo import models, fields

class rastreo_bodega_adicional(models.Model):
    _name = 'rastreo.bodega_adicional'
    _description = 'Clase para guardar el detalle adicional en la bodega'
    
    numero = fields.Char(
        string = 'Número de la bodega'
    )

    costo_rack = fields.Monetary(
        string='Costo Unitario',
        currency_field='currency_id'    
    )
    almacenaje_rack = fields.Integer(
        string='almacenaje de cada rack',
        currency_field='currency_id'    
    )
    racks_ocupados = fields.Integer(
        string='Cantidad de racks ocupados totales'
    )
    rack_id = fields.Many2one(
        'rastreo.rack_detalle',
        string='Rack',  
        required=True,  
    )


  

    bodega_adicional_id = fields.Many2one(
        'rastreo.bodega',
        required=True,
        ondelete='cascade',
    ) 
    
    currency_id = fields.Many2one(
        'res.currency', 
        string='Moneda', 
        default=lambda self: self.env.company.currency_id
    )