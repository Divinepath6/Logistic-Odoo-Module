from odoo import models, fields, api
from odoo.exceptions import UserError
import base64
import json
class rastreo_bodega_cliente(models.Model):
    _name = 'rastreo.bodega_cliente'
    _description = 'Clase para guardar la relacion entre bodegas'
    
    pedido_id = fields.Many2one(
        'rastreo.pedido',
        string='Pedido',
        required=True,   
        ondelete='cascade',  
    )

    bodegas_ids = fields.One2many(
        'rastreo.bodega',
        'bodega_cliente_id',   
        string='Bodegas',
    )
    ubicacion = fields.Char(  
        string='Ubicación de la bodega',
    )

    @api.model
    def guardar_bodega(self, pedido_id, ubicacion, bodegas, guardar_cotizacion):
        if not pedido_id:
            raise UserError("Bodega: Debes indicar un pedido")

        if not bodegas:
            raise UserError("Bodega: Debes enviar al menos una bodega")

        pedido = self.env['rastreo.pedido'].browse(pedido_id)
        if not pedido.exists():
            raise UserError("El pedido indicado no existe.")

        if not pedido.sale_order_id:
            raise UserError("El pedido no tiene una cotización de Odoo vinculada.")

        bodega_cliente = self.search([('pedido_id', '=', pedido_id)], limit=1)
        
        usd_currency = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)
        
        with self.env.cr.savepoint():
            if bodega_cliente:
                bodega_cliente.write({'ubicacion': ubicacion or ''})
                bodega_cliente.bodegas_ids.unlink()
            else:
                bodega_cliente = self.create({
                    'ubicacion': ubicacion or '',
                    'pedido_id': pedido.id,
                })

            Bodega = self.env['rastreo.bodega']
            racks_info = []
            for b in bodegas:
                rack_id = int(b.get('rack_id')) if b.get('rack_id') else False
                if not rack_id:
                    raise UserError("Cada bodega debe tener un rack asociado.")

                rack = self.env['rastreo.rack_detalle'].browse(rack_id)
                if not rack.exists() or not rack.producto_id:
                    raise UserError(
                        f"El rack {rack_id} no existe o no tiene producto de inventario."
                    )

                bodega_creada = Bodega.create({
                    'bodega_cliente_id': bodega_cliente.id,
                    'nombre': b.get('nombre') or '',
                    'descripcion': b.get('descripcion') or '',
                    'numero_bodega': b.get('numero_bodega') or '',
                    'ancho': float(b.get('ancho') or 0.0),
                    'largo': float(b.get('largo') or 0.0),
                    'niveles': int(b.get('niveles') or 0),
                    'costoRack': float(b.get('costoRack') or 0.0),
                    'rack_id': rack.id,
                    'separacion_arriba': int(b.get('separacion_arriba') or 30),
                    'separacion_abajo': int(b.get('separacion_abajo') or 30),
                    'separacion_izquierda': int(b.get('separacion_izquierda') or 30),
                    'separacion_derecha': int(b.get('separacion_derecha') or 30),
                    'racks_ocupados': int(b.get('racks_ocupados') or 0),
                })

                racks_info.append({
                    'rack': rack,
                    'costo': float(b.get('costoRack') or 0.0),
                    'cantidad': int(b.get('racks_ocupados') or 0),
                    'numero': b.get('numero_bodega') or '',
                })

                bodega_adicional = self.env['rastreo.bodega_adicional']
                detalle_adicional = list(b.get('detalle_adicional') or [])
                for d in detalle_adicional:
                    rack_id_ad = int(d.get('rack_id')) if d.get('rack_id') else False
                    if not rack_id_ad:
                        raise UserError("Cada bodega debe tener un rack asociado.")
                    rack_ad = self.env['rastreo.rack_detalle'].browse(rack_id_ad)
                    if not rack.exists() or not rack.producto_id:
                        raise UserError(
                            f"El rack {rack_id_ad} no existe o no tiene producto de inventario."
                        )
                    
                    bodega_adicional.create({
                        'numero': float(d.get('numero') or 0.0),
                        'costo_rack': float(d.get('costo_rack') or 0.0),
                        'almacenaje_rack': int(d.get('almacenaje_rack') or 0),
                        'racks_ocupados': float(d.get('racks_ocupados') or 0),
                        'rack_id': rack_id_ad,
                        'bodega_adicional_id': bodega_creada.id,
                        'currency_id': usd_currency.id,
                    })
                    racks_info.append({
                        'rack': rack_ad,
                        'costo': float(d.get('costo_rack') or 0.0),
                        'cantidad': int(d.get('racks_ocupados') or 0),
                        'numero': d.get('numero') or '',
                    })
            if not guardar_cotizacion:
                return {'success': True,'id': pedido.id}
            
            sale = pedido.sale_order_id
            if not sale.exists():
                return {'success': False, 'error' : "No existe la Cotización"}
            lineas_vals = []
            for info in racks_info:
                lineas_vals.append((0, 0, {
                    'product_id': info['rack'].producto_id.id,
                    'product_uom_qty': info['cantidad'] or 1,
                    'price_unit': info['costo'],
                    'name': info['rack'].nombre or info['rack'].producto_id.name,
                }))

            sale.write({
                'order_line': [(5, 0, 0)] + lineas_vals, 
                'partner_id': pedido.cliente_id.id,
            })

            detalle = self.env['rastreo.cotizacion_detalle']
            detalle.search([('pedido_id', '=', pedido_id)]).unlink()

            for linea in sale.order_line:
                if linea.display_type:
                    continue
                rack = self.env['rastreo.rack_detalle'].search(
                    [('producto_id', '=', linea.product_id.id)],
                    order='id desc', limit=1,
                )
                detalle.create({
                    'numero': len(pedido.detalle_cotizacion_ids) + 1,
                    'costo_rack': linea.price_unit,
                    'rack_id': rack.id if rack else False,
                    'currency_id': usd_currency.id,
                    'cantidad_racks': int(linea.product_uom_qty),
                    'pedido_id': pedido_id,
                    'sale_order_line_id': linea.id,
                })

        return {
            'id': pedido.id,
            'numero_guia': pedido.numero_guia,
            'bodega_cliente_id': bodega_cliente.id,
            'sale_order_id': pedido.sale_order_id.id,
            'sale_order_name': pedido.sale_order_id.name,
        }


    @api.model
    def obtener_bodega(self, pedido_id):
        if not pedido_id:
            raise UserError("Bodega: Debes indicar un pedido")
        pedido = self.env['rastreo.pedido'].browse(pedido_id)
        if not pedido.exists():
            raise UserError("Bodega: El pedido indicado no existe.")
            
        bodega = self.search([('pedido_id', '=', pedido_id)], limit=1)

        if not bodega.exists():
            return{
                'success':False
            }                    
        bodegas = self.env['rastreo.bodega'].search(
            [('bodega_cliente_id', '=', bodega.id)],
            order='numero_bodega',
        )
        bodegas_lista = []
        for b in bodegas:
            detalle_racks = []
            detalle_adicional = self.env['rastreo.bodega_adicional'].search(
                [('bodega_adicional_id', '=', b.id)],
                order='numero',
            )
            for d in detalle_adicional:
                rack = self.env['rastreo.rack_detalle'].browse(d.rack_id)
                detalle_racks.append({
                    'numero': d.numero or 0,
                    'costo_rack': d.costo_rack or 0.0,
                    'almacenaje': d.almacenaje_rack or 0,
                    'racks_ocupados': d.racks_ocupados or 0,
                    'rack_id': d.rack_id.id,
                    'rack_clave': d.rack_id.clave or '',
                    'rack_nombre':  d.rack_id.nombre or '',              
                })
            bodegas_lista.append({
                'nombre': b.nombre or '',
                'bodega_cliente_id': bodega.id,
                'descripcion': b.descripcion or '',
                'numero_bodega': b.numero_bodega or '',
                'ancho': float(b.ancho or 0.0),
                'largo': float(b.largo or 0.0),
                'niveles': int(b.niveles or 0),
                'costoRack': float(b.costoRack or 0.0),
                'rack_id': b.rack_id.id if hasattr(b.rack_id, 'id') else int(b.rack_id or 0),
                'separacion_arriba' : int(b.separacion_arriba or 30),
                'separacion_abajo' : int(b.separacion_abajo or 30),
                'separacion_izquierda' : int(b.separacion_izquierda or 30),
                'separacion_derecha' : int(b.separacion_derecha or 30),
                'racks_ocupados': int(b.racks_ocupados or 0),
                'detalle_racks' : detalle_racks or [],
            })
            

        return {
                'success': True,
                'data': {
                    'id': bodega.id,
                    'ubicacion': bodega.ubicacion or '',
                    'bodegas': bodegas_lista
                }
        }
    
  
    @api.model
    def generar_pdf_croquis(self, datos):
     
        company = self.env.company
        if company.logo:
            logo_b64 = company.logo.decode('utf-8') if isinstance(company.logo, bytes) else company.logo
        else:
            logo_b64 = ''
        datos['logo_b64'] = logo_b64
        datos['base_url'] = self.env['ir.config_parameter'].sudo().get_param('web.base.url') or 'http://localhost:8069'

        pdf_content, _ = self.env['ir.actions.report']._render_qweb_pdf(
            'rastreo_paquetes.report_croquis_bodega_doc',
            res_ids=[],
            data={'datos': datos},
        )
        return {
            'filename': 'croquis_bodega_%s.pdf' % (datos.get('clienteNombre') or 'cliente'),
            'file_content': base64.b64encode(pdf_content).decode('utf-8'),
            'mimetype': 'application/pdf',
        }