from odoo import models, fields, api
from odoo.exceptions import UserError
import base64
from datetime import datetime

class rastreo_paquetes(models.Model):
    _name = 'rastreo.pedido'
    _description = 'Clase principal del modulo'
    #_inherit = ['mail.thread', 'mail.activity.mixin']
    numero_guia = fields.Char(string='Número de guía o cotización')

    estado = fields.Selection([
        ('fase_inicial', 'Fase inicial'),
        ('produccion', 'En Producción'),
        ('puerto_origen', 'En el puerto de origen'),
        ('Embarcado', 'Embarcado'),
        ('Descargado', 'Descargado'),
        ('Aduana', 'En Aduana'),
        ('sin_pendiente', 'Sin Pendientes'),
    ], string = 'Estado', default='fase_inicial')

    # FORWARDER ¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡
    forwarder = fields.Boolean(
        string="Forwarder conseguido", 
        default=False
    )
    pdf_BL = fields.Binary(
            string='Documento BL',
            attachment=True
        )
    pdf_PL = fields.Binary(
            string='Documento PL',
            attachment=True
        )
    pdf_invoice = fields.Binary(
            string='Documento invoice',
            attachment=True
        )

  
    currency_id = fields.Many2one(
        'res.currency', 
        string='Moneda', 
        default=lambda self: self.env.company.currency_id
    )

    ## Proveedor ----------------------------------------------------------------------------
    pdf_contrato_proveedor = fields.Binary(
        string='Contrato con el proveedor',
        attachment=True
    )
    numero_contrato = fields.Char(
        string='Número de Guia'
    )
    pdf_factura_proveedor = fields.Binary(
        string='Factura del proveedor',
        attachment=True
    )
    total_proveedor = fields.Monetary(
        string= 'Total acordado con el proveedor',
        currency_field='currency_id' 
    )

    ## Cliente ///////////////////////////////////////////////////////////////////////////////
    total_cliente = fields.Monetary(
        string= 'Total acordado con el cliente',
        currency_field='currency_id' 
    )
    racks_acordados = fields.Integer(
        string = 'Total de rack acordados con el cliente'
    )


    ##LLave foranea para lo de clientes %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    cliente_id = fields.Many2one(
        'res.partner',  
        string='Cliente',  
        required=True,  
    )


    ##LLave foraneassssss **************************************************
    actualizacion_ids = fields.One2many(
        'rastreo.pedido_actualizacion', 
        'pedido_id',                    
        string='Actualizaciones',
    )
    bodegas_ids = fields.One2many(
        'rastreo.bodega_cliente', 
        'pedido_id',                    
        string='Id de la bodega',
    )
    detalle_cliente_ids = fields.One2many(
        'rastreo.detalle_proveedor', 
        'pedido_id',                    
        string='Detalles de los anticipos recibidos del cliente',
    )
    detalle_proveedor_ids = fields.One2many(
        'rastreo.detalle_cliente', 
        'pedido_id',                    
        string='Detalles de los anticipos dados al proveedor',
    )
    detalle_cotizacion_ids = fields.One2many(
        'rastreo.cotizacion_detalle', 
        'pedido_id',                    
        string='Detalles de la cotización',
    )
    
    # anticipo
    # =============================================================================================================
    # MÉTODOS CRUD
    # =============================================================================================================
    @api.model
    def crear_pedido(self, cliente_id):#cliente_id
        if not cliente_id:
            raise UserError("El cliente es obligatorio")
        cliente = self.env['res.partner'].browse(cliente_id)
        if not cliente.exists():
            raise UserError("El cliente indicado no existe")
        
        pedido = self.create({
            'cliente_id': cliente_id,
            'estado': 'fase_inicial',
        })

        self.env['rastreo.pedido_actualizacion'].create({
            'pedido_id': pedido.id,
            'numero_actualizacion': 1,
            'fecha_actualizacion': datetime.now(),
            'actualizacion_texto': 'Fase inicial comenzada',
        })
        
        return {'id': pedido.id}

    

    @api.model
    def cambiar_estado(self, pedido_id, estado=None):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        siguiente_estado = estado
            ### rellenaaaaaaaaaaaaaaaaaaaaaaaaaaaar cuando v
        match pedido.estado:
            case "fase_inicial":
                siguiente_estado = 'produccion'
                
            case "produccion":
                if not pedido.pdf_contrato_proveedor:
                    return {'success': False, 'error': 'Falta el contrato del proveedor para continuar'}
                siguiente_estado = 'puerto_origen'
            case _:
                if not siguiente_estado:
                    return {'success': False, 'error': 'Estado no especificado'}

        pedido.write({'estado': siguiente_estado})
        return {
            'success': True, 
            'id': pedido.id, 
            'nuevo_estado': siguiente_estado
        }

    ## PDFSSSS //////////////////////////////////////////////////
    @api.model
    def subir_pdf(self, nombre, archivo, pedido_id):

        campos_permitidos = [
            'pdf_contrato_proveedor',
            'pdf_factura_proveedor',
            'pdf_anticipo_cliente',
            'pdf_BL',
            'pdf_PL',
            'pdf_invoice'
        ]

        if nombre not in campos_permitidos:
            return {
                'success': False,
                'error': 'Campo de PDF no permitido'
            }

        pedido = self.browse(pedido_id)

        if not pedido.exists():
            return {
                'success': False,
                'error': 'Pedido no encontrado'
            }

        pedido.write({
            nombre: archivo
        })
        field_obj = self._fields.get(nombre)
        nombre_amigable = field_obj.string if field_obj else nombre

        cantidad = self.env['rastreo.pedido_actualizacion'].search_count([
            ('pedido_id', '=', pedido_id)
        ])
        numero = cantidad + 1
        self.env['rastreo.pedido_actualizacion'].create({
                'pedido_id': pedido.id,
                'numero_actualizacion': numero,
                'fecha_actualizacion': datetime.now(),
                'actualizacion_texto': f'Archivo subido: {nombre_amigable} - {self.env.user.name}'
            })
        return {
            'success': True
        }




    @api.model
    def actualizar_pedido(self, pedido_id, detalle_pedido ,detalle_cliente,detalle_proveedor,datos):
        if not pedido_id:
            raise UserError("Debes indicar un pedido")
        pedido = self.env['rastreo.pedido'].browse(pedido_id)
        if not pedido.exists():
            raise UserError("El pedido indicado no existe.")
        
        with self.env.cr.savepoint():
            pedido.write({
                'total_proveedor': datos.get('total_proveedor') or 0,
                'numero_contrato': datos.get('numero_contrato') or '',
                'racks_acordados': datos.get('racks_acordados') or 0,
                'forwarder': datos.get('forwarder') or False,
            })
            pedido.detalle_cotizacion_ids.unlink()
            dp = self.env['rastreo.cotizacion_detalle']

            for d in detalle_pedido:
                dp.create({
                    'clave': d.get('clave') or '',
                    'numero': d.get('numero') or '',
                    'costo_rack': d.get('costo_rack') or '',
                    'rack_id': int(d.get('rack_id')) or '',
                    'rack_nombre':d.get('rack_nombre') or '',
                    'cantidad_racks': d.get('cantidad_racks') or '',
                })
                
        return {
            'success': True,
        }



    @api.model
    def eliminar_pedido(self, pedido_id):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        
        pedido.unlink()
        return {'success': True}


    @api.model
    def cargar_pedido(self, pedido_id):
        pedido = self.browse(pedido_id)

        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}

        actualizaciones = self.env['rastreo.pedido_actualizacion'].search(
            [('pedido_id', '=', pedido_id)],
            order='fecha_actualizacion desc',
        )
        lista_actualizaciones = []
        for actualizacion in actualizaciones:
            lista_actualizaciones.append({
                'id': actualizacion.id,
                'numero_actualizacion': actualizacion.numero_actualizacion,
                'fecha': actualizacion.fecha_actualizacion,
                'texto': actualizacion.actualizacion_texto or '',
            })

        anticipos_cliente = self.env['rastreo.detalle_cliente'].search(
            [('pedido_id', '=', pedido_id)],
            order='numero desc',
        )
        lista_anticipos_cliente = []
        for a in anticipos_cliente:
            lista_anticipos_cliente.append({
                'numero': a.numero or 0,
                'fecha_editado': a.fecha_editado or "",
                'cantidad': a.cantidad or 0,
                'precio_dolar': a.precio_dolar or 0,
                'pdf_anticipo_cliente': bool(a.pdf_anticipo_cliente),
            })
        anticipos_proveedor = self.env['rastreo.detalle_proveedor'].search(
            [('pedido_id', '=', pedido_id)],
            order='numero desc',
        )
        lista_anticipos_proveedor = []
        for a in anticipos_proveedor:
            lista_anticipos_proveedor.append({
                'numero': a.numero or 0,
                'fecha_editado': a.fecha_editado or "",
                'cantidad': a.cantidad or 0,
                'precio_dolar': a.precio_dolar or 0,
                'pdf_anticipo_proveedor': bool(a.pdf_anticipo_proveedor),
            })
        cotizacion_detalle = self.env['rastreo.cotizacion_detalle'].search(
            [('pedido_id', '=', pedido_id)],
            order='numero desc',
        )        
        lista_cotizacion_detalle = []
        for a in cotizacion_detalle:
            lista_cotizacion_detalle.append({
                'clave': a.rack_id.clave or "",
                'numero': a.numero or 0,
                'costo_rack': a.costo_rack or 0,
                'rack_id': a.rack_id.id or 0,
                'rack_nombre': a.rack_id.nombre or 0,
                'cantidad_racks': a.cantidad_racks or 0,
            })
         
        return {
            'success': True,
            'data': {
                'id': pedido.id,
                'estado': pedido.estado,
                'numero_guia': pedido.numero_guia or '',
                'cliente_id': pedido.cliente_id.id if pedido.cliente_id else None,
                'cliente_nombre': pedido.cliente_id.name if pedido.cliente_id else '',
                'total_cliente': pedido.total_cliente or 0,
                'total_proveedor': pedido.total_proveedor or 0,
                'numero_contrato': pedido.numero_contrato or 0,
                
                # booleanos
                'forwarder': bool(pedido.forwarder),
                'bool_contrato_proveedor': bool(pedido.pdf_contrato_proveedor),
                'bool_factura_proveedor': bool(pedido.pdf_factura_proveedor),
                #listas
                'lista_anticipos_cliente': lista_anticipos_cliente,
                'lista_anticipos_proveedor': lista_anticipos_proveedor,
                'actualizaciones': lista_actualizaciones,
                'detalle_racks': lista_cotizacion_detalle
            }
        }

    @api.model
    def listar_pedidos(self, termino_busqueda=None):
        domain = []
        if termino_busqueda:
            domain = [
                '|',
                ('numero_guia', 'ilike', termino_busqueda),
                ('cliente_id.name', 'ilike', termino_busqueda),
            ]

        pedidos = self.search(domain, limit=50)

        pedido_ids = pedidos.ids
        ultimas_por_pedido = {}
        if pedido_ids:
            actualizaciones = self.env['rastreo.pedido_actualizacion'].search_read(
                [('pedido_id', 'in', pedido_ids)],
                ['pedido_id', 'fecha_actualizacion', 'actualizacion_texto'],
                order='fecha_actualizacion desc',
            )
            for a in actualizaciones:
                pid = a['pedido_id'][0]
                if pid not in ultimas_por_pedido:
                    ultimas_por_pedido[pid] = a

        lista = []
        for p in pedidos:
            ultima = ultimas_por_pedido.get(p.id)
            lista.append({
                'id': p.id,
                'cliente_nombre': p.cliente_id.name if p.cliente_id else '',
                'estado': p.estado,
                'numero_guia': p.numero_guia or '',
                'bool_contrato_proveedor': bool(p.pdf_contrato_proveedor),
                'ultima_actualizacion': {
                    'fecha': ultima['fecha_actualizacion'] if ultima else '',
                    'texto': ultima['actualizacion_texto'] if ultima else '',
                },
            })
        return lista    


# =============================================================================================================
# MÉTODOS CRUD detalles
# =============================================================================================================
    @api.model
    def guardar_detalle_cliente(self, pedido_id, numero, datos, pdf_anticipo_cliente=None):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}

        currency_id = pedido.currency_id.id or self.env.company.currency_id.id

        valores = {
            'pedido_id': pedido.id,
            'currency_id': currency_id,
            'fecha_editado': datetime.now(),
            'cantidad': datos.get('cantidad') if datos else 0,
            'precio_dolar': datos.get('precio_dolar') if datos else 0,
        }

        if pdf_anticipo_cliente:
            valores['pdf_anticipo_cliente'] = pdf_anticipo_cliente

        Detalle = self.env['rastreo.detalle_cliente']

   
        if not numero:  
            cantidad = Detalle.search_count([('pedido_id', '=', pedido_id)])
            valores['numero'] = cantidad + 1
            detalle = Detalle.create(valores)
        else:
            detalle = Detalle.search([
                ('pedido_id', '=', pedido_id),
                ('numero', '=', numero),
            ], limit=1)
            if not detalle:
                return {'success': False, 'error': 'Detalle no encontrado'}
            valores['numero'] = numero
            detalle.write(valores)

        return {'success': True, 'id': detalle.id}

    @api.model
    def eliminar_detalle_cliente(self, pedido_id):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        
        pedido.unlink()
        return {'success': True}


    
    @api.model
    def guardar_detalle_proveedor(self, pedido_id,numero, datos, pdf_anticipo_proveedor=None):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}

        currency_id = pedido.currency_id.id or self.env.company.currency_id.id

        valores = {
            'pedido_id': pedido.id,
            'currency_id': currency_id,
            'fecha_editado': datetime.now(),
            'cantidad': datos.get('cantidad') if datos else 0,
            'precio_dolar': datos.get('precio_dolar') if datos else 0,
        }

        if pdf_anticipo_proveedor:
            valores['pdf_anticipo_proveedor'] = pdf_anticipo_proveedor

        Detalle = self.env['rastreo.detalle_proveedor']

   
        if not numero:  
            cantidad = Detalle.search_count([('pedido_id', '=', pedido_id)])
            valores['numero'] = cantidad + 1
            detalle = Detalle.create(valores)
        else:
            detalle = Detalle.search([
                ('pedido_id', '=', pedido_id),
                ('numero', '=', numero),
            ], limit=1)
            if not detalle:
                return {'success': False, 'error': 'Detalle no encontrado'}
            valores['numero'] = numero
            detalle.write(valores)

        return {'success': True, 'id': detalle.id}


    @api.model
    def eliminar_detalle_proveedor(self, pedido_id):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        
        pedido.unlink()
        return {'success': True}    







    @api.model
    def guardar_detalle_cotizacion(self, pedido_id):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}

        currency_id = pedido.currency_id.id or self.env.company.currency_id.id
        bodega = self.env['rastreo.bodega_cliente'].search(
            [('pedido_id', '=', pedido_id)],
            limit=1
        )
        if not bodega.exists():
            return {'success': False, 'error': 'Bodega no encontrada'}
        bodegas = self.env['rastreo.bodega'].search(
            [('bodega_cliente_id', '=', bodega.id)],
            order='numero_bodega',
        )
        if not bodegas.exists():
            return {'success': False, 'error': 'Bodegas no guardadas'}
        
        detalle = self.env['rastreo.cotizacion_detalle']
        detalle.search([('pedido_id', '=', pedido_id)]).unlink()

        for b in bodegas:
            detalle.create({
                'numero': b.numero_bodega or 0,
                'costo_rack': b.costoRack or 0.0,
                'rack_id': b.rack_id.id if b.rack_id else False,
                'currency_id': currency_id,
                'cantidad_racks': b.racks_ocupados or 0,
                'pedido_id': pedido_id
            })       

        return {'success': True, 'id': pedido_id}



    ############### Buscar la cotización ###########################
    @api.model
    def buscar_cotizacion(self, termino_busqueda=None):
        domain = []
        if not termino_busqueda:
            return {'error': 'Se necesita un número', 'success': False}
    
        domain = [
            ('state', 'in', ['draft', 'sent','sale','done']),
            ('name', '=', termino_busqueda)
        ]
                    
        cotizacion = self.env['sale.order'].search(domain, order='id desc',limit=1)

        if not cotizacion.exists():
            return  {'error': 'Cotización no encontrada', 'success': False}
        
        lista_productos = []

        for linea in cotizacion.order_line:
            lista_productos.append({
                'id': linea.product_id.id,
                'nombre': linea.product_id.name,
                'codigo': linea.product_id.default_code or '',
                'precio': linea.price_unit,
                'unidad': linea.product_uom_id.name, 
                'cantidad': linea.product_uom_qty,
                'subtotal': linea.price_subtotal
            })

        return {
            'success': True,
            'cotizacion_info': {
                'id': cotizacion.id,
                'nombre': cotizacion.name,
                'cliente': cotizacion.partner_id.name,
                'total': cotizacion.amount_total,
                'moneda': cotizacion.currency_id.name,
                'fecha': cotizacion.date_order,
            },
            'data': lista_productos
        }