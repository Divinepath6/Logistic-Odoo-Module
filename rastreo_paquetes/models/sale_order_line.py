from odoo import models, fields


class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    rastreo_rack_id = fields.Many2one(
        'rastreo.rack_detalle',
        string='Rack (rastreo)',
        ondelete='set null',
    )
    rastreo_color_id = fields.Many2one(
        'rastreo.rack_color',
        string='Color (rastreo)',
        ondelete='set null',
    )
    rastreo_numero = fields.Char(
        string='Número bodega (rastreo)',
    )