from odoo import models, fields, api

class rastreo_rack_color(models.Model):
    _name = 'rastreo.rack_color'
    _description = 'Colores disponibles para Racks'

    clave = fields.Char(
        string='Clave del Color',
    )
    nombre = fields.Char(
        string='Nombre del Color', required=True
    )
    color_hex = fields.Char(
        string='Código Hexadecimal',
        required=True, 
        help="Ej: #FF5733 para mostrar el color visualmente"
    )

    
    @api.model
    def listar_colores(self, busqueda=None):
        dominio = []
        if busqueda:
            dominio = [
                '|', 
                ('nombre', 'ilike', busqueda), 
                ('clave', 'ilike', busqueda)
            ]
        
        colores = self.search(dominio)
        return [{
            'id': c.id,
            'clave': c.clave or '',
            'nombre': c.nombre,
            'color_hex': c.color_hex
        } for c in colores]
    
    @api.model
    def guardar_color(self, vals):
        color_id = vals.get('id')
        if color_id:
            color = self.browse(color_id)
            if color.exists():
                color.write({
                    'clave': vals.get('clave'),
                    'nombre': vals.get('nombre'),
                    'color_hex': vals.get('color_hex')
                })
                return { "success": True , "id" : nuevo_color.id} 
        
        nuevo_color = self.create({
            'clave': vals.get('clave'),
            'nombre': vals.get('nombre'),
            'color_hex': vals.get('color_hex')
        })
        return { "success": False , "id" : nuevo_color.id} 

    @api.model
    def eliminar_color(self, color_id):
        color = self.browse(color_id)
        if color.exists():
            color.unlink()
            return { "success": True}
        return { "success": False}