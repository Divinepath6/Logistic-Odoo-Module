from odoo import models, fields, api
from odoo.exceptions import UserError
import base64
from datetime import datetime, timedelta

class rastreo_paquetes(models.Model):
    _name = 'rastreo.pedido'
    _description = 'Clase principal del modulo'
    #_inherit = ['mail.thread', 'mail.activity.mixin']
    numero_guia = fields.Char(string='Número de guía o cotización')
    
    sale_order_id = fields.Many2one(
        'sale.order',
        string='Cotización de Odoo',
        ondelete='set null',
    )
    origen_cotizacion = fields.Selection([
        ('manual', 'Manual (bodegas del módulo)'),
        ('sale_order', 'Desde cotización de Odoo'),
    ], string='Origen de la cotización', default='manual')

    estado = fields.Selection([
        ('fase_inicial', 'Fase inicial'),
        ('produccion', 'En Producción'),
        ('puerto_origen', 'En el puerto de origen'),
        ('embarcado', 'Embarcado'),
        ('descargado', 'Descargado'),
        ('aduana', 'En Aduana'),
        ('entregado', 'Entregado'),
    ], string = 'Estado', default='fase_inicial')

    aviso = fields.Char(
        string= 'Aviso para el usuario'
    )
    # FORWARDER ¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡
    forwarder = fields.Boolean(
        string="Forwarder conseguido", 
        default=False
    )
    pdf_BL = fields.Binary(
            string='Documento BL',
            attachment=True
        )
    pdf_BL_nombre = fields.Char(
        string='Nombre de PDF'
    )
    pdf_PL = fields.Binary(
            string='Documento PL',
            attachment=True
        )
    pdf_PL_nombre = fields.Char(
        string='Nombre de PDF'
    )
    pdf_invoice = fields.Binary(
            string='Documento invoice',
            attachment=True
        )
    pdf_invoice_nombre = fields.Char(
        string='Nombre de PDF'
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
    pdf_contrato_proveedor_nombre = fields.Char(
        string='Nombre de PDF'
    )
    numero_contrato = fields.Char(
        string='Número de Guia'
    )
    pdf_factura_proveedor = fields.Binary(
        string='Factura del proveedor',
        attachment=True
    )
    pdf_factura_proveedor_nombre = fields.Char(
        string='Nombre de PDF'
    )
    total_proveedor = fields.Monetary(
        string= 'Total acordado con el proveedor',
        currency_field='currency_id' 
    )
    pdf_prefactura  = fields.Binary(
        string='Prefactura del proveedor',
        attachment=True
    )
    pdf_prefactura_nombre = fields.Char(
        string='Nombre de PDF'
    )
   ## FECHAS %$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$%$
    fecha_creacion = fields.Date(
        string = 'Fecha de la creacion del pedido'
    )

    CRD = fields.Date(
        string = 'Fecha de la Cargo Ready Date'
    )

    ETD = fields.Date(
        string = 'Fecha de la Estimated Time of Departure'
    )
    ETA = fields.Date(
        string = 'Fecha de la  Estimated Time of Arrival'
    )


    fecha_compromiso_proveedor_1 = fields.Date(
        string = '1 Fecha acordada con el proveedor'
    )
    fecha_compromiso_proveedor_2 = fields.Date(
        string =  '2 Fecha acordada con el proveedor'
    )
    fecha_compromiso_proveedor_3 = fields.Date(
        string =  '3 Fecha acordada con el proveedor'
    )
    fecha_compromiso_proveedor_4 = fields.Date(
        string =  '4 Fecha acordada con el proveedor'
    )

    fecha_compromiso_cliente_1 = fields.Date(
        string = '1 Fecha acordada con el cliente'
    )
    fecha_compromiso_cliente_2 = fields.Date(
        string = '2 Fecha acordada con el cliente'
    )
    fecha_compromiso_cliente_3 = fields.Date(
        string = '3 Fecha acordada con el cliente'
    )
    fecha_compromiso_cliente_4 = fields.Date(
        string = '4 Fecha acordada con el cliente'
    )    

    termino_1 = fields.Integer(
        string = 'Termino de pago numero 1'
    )
    termino_2 = fields.Integer(
        string = 'Termino de pago numero 2'
    )    
    termino_3 = fields.Integer(
        string = 'Termino de pago numero 3'
    )    
    termino_4 = fields.Integer(
        string = 'Termino de pago numero 4'
    )

    termino_5 = fields.Integer(
        string = 'Termino de pago numero 5'
    )

    fecha_termino_produccion = fields.Date(
        string = 'Fecha de termino de produccion'
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
        'rastreo.detalle_cliente', 
        'pedido_id',                    
        string='Detalles de los anticipos recibidos del cliente',
    )
    detalle_proveedor_ids = fields.One2many(
        'rastreo.detalle_proveedor', 
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
    def crear_pedido(self, cliente_id):
        if not cliente_id:
            raise UserError("El cliente es obligatorio")
        cliente = self.env['res.partner'].browse(cliente_id)
        if not cliente.exists():
            raise UserError("El cliente indicado no existe")

        pedido = self.create({
            'cliente_id': cliente_id,
            'estado': 'fase_inicial',
        })

        cotizacion = self.env['sale.order'].create({
            'partner_id': cliente_id,
            'origin': f'Rastreo pedido #{pedido.id}',
        })

        pedido.write({
            'sale_order_id': cotizacion.id,
            'numero_guia': cotizacion.name
        
        })

        self.env['rastreo.pedido_actualizacion'].create({
            'pedido_id': pedido.id,
            'numero_actualizacion': 1,
            'fecha_actualizacion': datetime.now(),
            'actualizacion_texto': 'Fase inicial comenzada',
            'usuario_id': self.env.user.id,
        })

        return {'id': pedido.id, 'sale_order_id': cotizacion.id}
    
    @api.model
    def crear_pedido_cotizacion(self, numero, fase):
        if not numero:
            raise UserError("El numero de cotización es obligatorio")

        domain = [
            ('state', 'in', ['draft', 'sent','sale','done']),
            ('name', '=', numero)
        ]
                    
        cotizacion = self.env['sale.order'].search(domain, order='id desc',limit=1)

        if not cotizacion.exists():
            return  {'error': 'Cotización no encontrada', 'success': False}
        texto = ''
        if fase == 'fase_inicial':
            pedido = self.create({
                'sale_order_id': cotizacion.id,
                'cliente_id': cotizacion.partner_id.id,
                'numero_guia': cotizacion.name,
                'estado': 'fase_inicial',
            })    
            texto = 'Fase inicial comenzada'
        if fase == 'produccion':
            pedido = self.create({
                'sale_order_id': cotizacion.id,
                'cliente_id': cotizacion.partner_id.id,
                'numero_guia': cotizacion.name,
                'estado': 'produccion',
                'fecha_compromiso_proveedor_1': fields.Date.today(),
                'fecha_compromiso_cliente_1': fields.Date.today(),
            })
            self.crear_aviso(pedido.id)
            texto = 'Comienzo de producción'            
        else:
            return {'success': False, 'error' : 'Fase no existente en el sistema'}


        self.env['rastreo.pedido_actualizacion'].create({
            'pedido_id': pedido.id,
            'numero_actualizacion': 1,
            'fecha_actualizacion': datetime.now(),
            'actualizacion_texto': texto,
            'usuario_id': self.env.user.id,
        })
        
        return {'success': True}
    
    @api.model
    def eliminar_pedido(self, pedido_id):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        
        pedido.unlink()
        return {'success': True}

    @api.model
    def cambiar_estado(self, pedido_id, estado=None):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        siguiente_estado = estado
            ### rellenaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaar
        match pedido.estado:
            case "fase_inicial":
                siguiente_estado = 'produccion'
                if pedido.sale_order_id.exists():
                    if pedido.sale_order_id.state in ('draft', 'sent'):
                        pedido.sale_order_id.action_confirm()

                pedido.write({
                    'fecha_compromiso_proveedor_1': fields.Date.today(),
                    'fecha_compromiso_cliente_1': fields.Date.today(),
                })
            case "produccion":
                if not pedido.pdf_contrato_proveedor:
                    return {'success': False, 'error': 'Falta el contrato del proveedor para continuar'}
                
                siguiente_estado = 'puerto_origen'
            case _:
                if not siguiente_estado:
                    return {'success': False, 'error': 'Estado no especificado'}

        pedido.write({'estado': siguiente_estado})
        self.crear_aviso(pedido.id)

        return {
            'success': True, 
            'id': pedido.id, 
            'nuevo_estado': siguiente_estado
        }

    ## PDFSSSS //////////////////////////////////////////////////
    @api.model
    def guardar_pdf(self, tipo_documento, pdf, pedido_id,nombre_archivo):
        campos_permitidos = [
            'pdf_contrato_proveedor',
            'pdf_ETD',
            'pdf_ETA',
            'pdf_factura_proveedor',
            'pdf_anticipo_cliente',
            'pdf_BL',
            'pdf_PL',
            'pdf_invoice',
            'pdf_prefactura',
        ]
        #verificacion de campos aaa
        if not pedido_id:
            return {'success': False, 'error': 'Pedido no indicado'}
        if tipo_documento not in campos_permitidos:
            return {'success': False,'error': 'Campo de PDF no permitido'}
        if not pdf:
            return {'success': False, 'error': 'PDF vacío'}
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False,'error': 'Pedido no encontrado'}
        campo_nombre = f"{tipo_documento}_nombre"
        if campo_nombre not in self._fields:
            return {
                'success': False,
                'error': f'El modelo no tiene el campo {campo_nombre}'
            }
        guia = pedido.numero_guia or pedido.id

        base = nombre_archivo.rsplit('.', 1)[0] if nombre_archivo else tipo_documento
        nombre_final = f"{base}_{guia}.pdf"
        
        pedido.write({
            tipo_documento: pdf,
            campo_nombre: nombre_final
        })
        
        field_obj = self._fields.get(tipo_documento)
        nombre_amigable = field_obj.string if field_obj else tipo_documento

        ultima = self.env['rastreo.pedido_actualizacion'].search(
            [('pedido_id', '=', pedido_id)],
            order='numero_actualizacion desc',
            limit=1
        )
        numero = (ultima.numero_actualizacion or 0) + 1
        self.crear_aviso(pedido.id)
        self.env['rastreo.pedido_actualizacion'].create({
            'pedido_id': pedido.id,
            'numero_actualizacion': numero,
            'fecha_actualizacion': datetime.now(),
            'actualizacion_texto': f'Archivo subido: {nombre_amigable}',
            'usuario_id': self.env.user.id,
        })

        return {'success': True}

    @api.model
    def obtener_pdf(self, pedido_id, nombre_pdf):
        campos_permitidos = [
            'pdf_contrato_proveedor',
            'pdf_factura_proveedor',
            'pdf_anticipo_cliente',
            'pdf_BL',
            'pdf_PL',
            'pdf_invoice',
            'pdf_prefactura',
        ]
        if not pedido_id:
            return {'success': False, 'error': 'Necesita un Id de pedido'}
        if nombre_pdf not in campos_permitidos:
            return {
                'success': False,
                'error': 'Campo de PDF no permitido'
            }
        
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': '¨Pedido no encontrado'}
        pdf = getattr(pedido, nombre_pdf, False)
        if isinstance(pdf, bytes):
            pdf = pdf.decode('utf-8')

        campo_nombre_documento = f"{nombre_pdf}_nombre"
        nombre_documento = getattr(pedido, campo_nombre_documento, False)

        if not nombre_documento:
            guia = pedido.numero_guia or pedido.id
            nombre_documento = f"{nombre_pdf}_{guia}.pdf"

        return {
            'success': True,
            'pdf': pdf or False,
            'filename': nombre_documento,
        }

    @api.model
    def actualizar_pedido(self, pedido_id, detalle_pedido, datos):
        if not pedido_id:
            raise UserError("Debes indicar un pedido")
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            raise UserError("El pedido indicado no existe.")
        
        with self.env.cr.savepoint():
            pedido.write({
                'numero_guia': datos.get('numero_guia') or '',
                'total_proveedor': datos.get('total_proveedor') or 0,
                'numero_contrato': datos.get('numero_contrato') or '',
                'racks_acordados': datos.get('racks_acordados') or 0,
                'forwarder': datos.get('forwarder') or False,
                'total_cliente': datos.get('total_cliente'),

                'ETA': datos.get('ETA') or False,
                'ETD': datos.get('ETD') or False,
                'CRD': datos.get('CRD') or False,

                'fecha_creacion': datos.get('fecha_creacion') or False,
                'fecha_termino_produccion' : datos.get('fecha_termino_produccion') or False,
                'fecha_compromiso_proveedor_1': datos.get('fecha_compromiso_proveedor_1') or False,
                'fecha_compromiso_proveedor_2': datos.get('fecha_compromiso_proveedor_2') or False,
                'fecha_compromiso_proveedor_3': datos.get('fecha_compromiso_proveedor_3') or False,
                'fecha_compromiso_proveedor_4': datos.get('fecha_compromiso_proveedor_4') or False,

                'fecha_compromiso_cliente_1': datos.get('fecha_compromiso_cliente_1') or False,
                'fecha_compromiso_cliente_2': datos.get('fecha_compromiso_cliente_2') or False,
                'fecha_compromiso_cliente_3': datos.get('fecha_compromiso_cliente_3') or False,
                'fecha_compromiso_cliente_4': datos.get('fecha_compromiso_cliente_4') or False,
            })

            fecha_termino_produccion = pedido.fecha_termino_produccion
            if not fecha_termino_produccion:
                pedido.fecha_termino_produccion = fields.Date.today() + timedelta(days=20)

            cambio = datos.get('cambio_racks') or False
            if cambio == False:
                self.crear_aviso(pedido.id)
                return {
                    'success': True,
                }

            dp = self.env['rastreo.cotizacion_detalle']

            pedido.detalle_cotizacion_ids.unlink()
            for d in detalle_pedido:
                try:
                    numero_val = int(d.get('numero') or 0)
                except (ValueError, TypeError):
                    numero_val = 0

                try:
                    rack_id_val = int(d.get('rack_id') or 0)
                except (ValueError, TypeError):
                    rack_id_val = False

                try:
                    product_id_val = int(d.get('product_id') or d.get('id') or 0)
                except (ValueError, TypeError):
                    product_id_val = False

                if not product_id_val:
                    continue

                color_id_val = int(d.get('color_id') or 0) if d.get('color_id') else False
                costo_val = float(d.get('costo_rack_raw') or d.get('costo_rack') or 0.0)
                cantidad_val = int(d.get('cantidad_racks') or 0)

                dp.create({
                    'numero': numero_val,
                    'costo_rack': costo_val,
                    'product_id': product_id_val,
                    'rack_id': rack_id_val,
                    'cantidad_racks': cantidad_val,
                    'color': color_id_val,
                    'pedido_id': pedido_id
                })

        return {
            'success': True,
        }


    @api.model
    def cargar_pedido(self, pedido_id):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        
        cotizacion = pedido.sale_order_id

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
                'usuario_id': actualizacion.usuario_id.id or False,
                'usuario': actualizacion.usuario_id.name or '',
            })

        anticipos_cliente = self.env['rastreo.detalle_cliente'].search(
            [('pedido_id', '=', pedido_id)],
            order='numero desc',
        )

        lista_pagos_cliente = []
        if cotizacion and cotizacion.exists():
            facturas = cotizacion.invoice_ids
            facturas_origen = self.env['account.move'].search([
                ('move_type', '=', 'out_invoice'),
                ('state', '=', 'posted'),
                ('invoice_origin', '=', cotizacion.name),
            ])
            facturas = (facturas | facturas_origen).filtered(
                lambda f: f.move_type == 'out_invoice' and f.state == 'posted'
            )

            pagos_factura = self.env['account.payment'].search([
                ('reconciled_invoice_ids', 'in', facturas.ids)
            ]) if facturas else self.env['account.payment']

            pagos_anticipo = self.env['account.payment'].search([
                ('partner_id', '=', cotizacion.partner_id.id),
                ('payment_type', '=', 'inbound'),
                ('state', '=', 'posted'),
                ('move_id.ref', 'ilike', cotizacion.name),  
            ]) if cotizacion.partner_id else self.env['account.payment']

            pagos_totales = pagos_factura | pagos_anticipo

            for pago in pagos_totales:
                if any(x['payment_id'] == pago.id for x in lista_pagos_cliente):
                    continue

                factura_origen = ''
                if pago.reconciled_invoice_ids:
                    factura_origen = ', '.join(pago.reconciled_invoice_ids.mapped('name'))
                elif pago.reconciled_bill_ids:
                    factura_origen = ', '.join(pago.reconciled_bill_ids.mapped('name'))

                lista_pagos_cliente.append({
                    'payment_id': pago.id,
                    'referencia': pago.name or '',
                    'monto': pago.amount,
                    'moneda': pago.currency_id.name or '',
                    'fecha': str(pago.date) if pago.date else '',
                    'estado': pago.state,
                    'diario': pago.journal_id.name or '',
                    'factura': factura_origen,
                })

        anticipos_proveedor = self.env['rastreo.detalle_proveedor'].search(
            [('pedido_id', '=', pedido_id)],
            order='numero desc',
        )

        lista_anticipos_proveedor = []
        for a in anticipos_proveedor:
            lista_anticipos_proveedor.append({
                'anticipo_id': a.id,
                'numero': a.numero or 0,
                'fecha_editado': a.fecha_editado or "",
                'fecha_anticipo': a.fecha_anticipo or "",
                'cantidad': a.cantidad or 0,
                'precio_dolar': a.precio_dolar or 0,
                'pdf_anticipo_proveedor': bool(a.pdf_anticipo_proveedor),
            })
 
        lista_cotizacion_detalle = []

        detalles_guardados = self.env['rastreo.cotizacion_detalle'].search([('pedido_id', '=', pedido_id)])
        if detalles_guardados:
            for d in detalles_guardados:
                lista_cotizacion_detalle.append({
                    'id': d.product_id.id,
                    'nombre': d.product_id.name,
                    'rack_id': d.rack_id.id if d.rack_id else 0,
                    'precio': d.costo_rack,
                    'unidad': d.product_id.uom_id.name if d.product_id.uom_id else '',
                    'cantidad': d.cantidad_racks,
                    'subtotal': d.costo_rack * d.cantidad_racks,
                    'color_id': d.color.id if d.color else False,
                    'color_hex': d.color.color_hex if d.color else "#ffffff",
                    'color_clave': d.color.clave if d.color else '',
                })
        elif cotizacion and cotizacion.exists() and cotizacion.order_line:
            for linea in cotizacion.order_line:
                rack = self.env['rastreo.rack_detalle'].search(
                    [('producto_id', '=', linea.product_id.id)],
                    order='id desc',
                    limit=1,
                )
                lista_cotizacion_detalle.append({
                    'id': linea.product_id.id,
                    'nombre': linea.product_id.name,
                    'rack_id': rack.id if rack else 0,
                    'precio': linea.price_unit,
                    'unidad': linea.product_uom_id.name,
                    'cantidad': linea.product_uom_qty,
                    'subtotal': linea.price_subtotal,
                    'color_id': False,
                    'color_hex': '#cccccc',
                    'color_clave': '',
                })
        
        return {
            'success': True,
            'data': {
                'id': pedido.id,
                'estado': pedido.estado,
                'numero_guia': pedido.numero_guia or '',
                'cliente_id': pedido.cliente_id.id if pedido.cliente_id else None,
                'cliente_nombre': pedido.cliente_id.name if pedido.cliente_id else '',
                'total_cliente': cotizacion.amount_total or 0,
                'total_proveedor': pedido.total_proveedor or 0,
                'numero_contrato': pedido.numero_contrato or '',
                'fecha_creacion': pedido.fecha_creacion or '',
                'CRD': pedido.CRD or '',
                'ETD': pedido.ETD or '',
                'ETA': pedido.ETA or '',
                'fecha_termino_produccion': pedido.fecha_termino_produccion or '',
                'fecha_compromiso_cliente_1': pedido.fecha_compromiso_cliente_1 or '',
                'fecha_compromiso_cliente_2': pedido.fecha_compromiso_cliente_2 or '',
                'fecha_compromiso_cliente_3': pedido.fecha_compromiso_cliente_3 or '',
                'fecha_compromiso_cliente_4': pedido.fecha_compromiso_cliente_4 or '',
                'fecha_compromiso_proveedor_1' : pedido.fecha_compromiso_proveedor_1 or '',
                'fecha_compromiso_proveedor_2' : pedido.fecha_compromiso_proveedor_2 or '',
                'fecha_compromiso_proveedor_3' : pedido.fecha_compromiso_proveedor_3 or '',
                'fecha_compromiso_proveedor_4' : pedido.fecha_compromiso_proveedor_4 or '',

                'aviso': pedido.aviso,

                # booleanos
                'forwarder': bool(pedido.forwarder),
                'bool_contrato_proveedor': bool(pedido.pdf_contrato_proveedor),
                'bool_factura_proveedor': bool(pedido.pdf_factura_proveedor),
                'pdf_BL' : bool(pedido.pdf_BL),
                'pdf_PL': bool(pedido.pdf_PL) ,
                'pdf_invoice': bool(pedido.pdf_invoice),
                'pdf_prefactura': bool(pedido.pdf_prefactura),

                #listas
                'lista_anticipos_proveedor': lista_anticipos_proveedor,
                'lista_pagos_cliente': lista_pagos_cliente,
                'actualizaciones': lista_actualizaciones,
                'detalle_racks': lista_cotizacion_detalle
            }
        }

    def crear_aviso(self, id):
        avisoDB = ""
        aviso = []
        INFO = 'info'     
        MEDIA = 'media'     
        URGENTE = 'urgente'
        pedido = self.browse(id)
        cotizacion = pedido.sale_order_id
        hoy = fields.Date.today()

        cotizacion = False #pedido.sale_order_id
        total_cotizacion = cotizacion.amount_total if cotizacion else 0.0
        moneda = cotizacion.currency_id.name if cotizacion else ''
        total_pagos_cliente = 0.0
        count_pagos_cliente = 0

        if cotizacion:
            facturas = cotizacion.invoice_ids.filtered(
                lambda f: f.move_type == 'out_invoice' and f.state == 'posted'
            )
                
            domain_pagos = [
                ('partner_id', '=', cotizacion.partner_id.id),
                ('state', 'in', ['paid', 'in_process']), 
                ('payment_type', '=', 'inbound'), 
            ]
            pagos_directos = self.env['account.payment'].search(domain_pagos)
            pagos_totales = facturas.mapped('payment_ids') | pagos_directos

        count_proveedor = self.env['rastreo.detalle_proveedor'].search_count(
            [('pedido_id', '=', id)],
        )
        
        if pedido.estado == 'produccion':
            if not pedido.numero_contrato:
                aviso.append({'severidad': MEDIA, 'mensaje': "Número de contrato"})
            else:
                fecha_termino_produccion = pedido.fecha_termino_produccion
                if not fecha_termino_produccion:
                    aviso.append({'severidad': MEDIA, 'mensaje': "Fecha de Término de Producción"})
                else:
                    dias_restantes = (fecha_termino_produccion - hoy).days
                    if not pedido.forwarder and dias_restantes <= 13:
                            aviso.append({
                                'severidad': URGENTE,
                                'mensaje': f"Forwarder faltan: {dias_restantes} días",
                            })
            if not pedido.pdf_contrato_proveedor:
                aviso.append({'severidad': URGENTE, 'mensaje': "Contrato del proveedor"})
            

        elif pedido.estado == 'puerto_origen':


            if not pedido.ETA:
                aviso.append({ MEDIA , "Conseguir ETA "}) 
            if not pedido.ETD:
                aviso.append({ URGENTE , "Conseguir ETD "}) 

            else:
                hoy = fields.Date.today()           
                diferencia = pedido.ETD - hoy  
                dias_restantes = diferencia.days
                if not pedido.forwarder and dias_restantes <= 3:
                    aviso.append({'severidad': INFO, 'mensaje': f"Apunto de salir de puerto: {dias_restantes} "})
            
        elif pedido.estado == 'Embarcado':
            if not pedido.ETA:
                aviso.append({ URGENTE , "Conseguir ETA "}) 
            if not pedido.pdf_BL:
                aviso.append({ MEDIA , "Subir BL"}) 
            if not pedido.pdf_PL:
                aviso.append({ MEDIA , "Subir PL"}) 
            if not pedido.ETA:
                aviso.append({ MEDIA , "Conseguir ETA"}) 

        elif pedido.estado == 'Descargado':
            if pedido.numero_contrato:
                aviso.append({ MEDIA , "Cotizar A.A"}) 
            if pedido.numero_contrato:
                aviso.append({ MEDIA , "Pedir flete terreste"}) 
                aviso.append({ MEDIA , "Aviso de arribo"}) 
        
        elif pedido.estado == 'Aduana':  
            pass

        ## Avisos de Pagos

        pagado = 0.0
        if pagado < pedido.termino_1:
            if pedido.fecha_compromiso_proveedor_1:
                dias_restantes = (pedido.fecha_compromiso_proveedor_1 - hoy).days
                if dias_restantes <= 1:
                    aviso.append({ URGENTE , "Anticipo de proveedor 1"}) 
                else:
                    aviso.append({ MEDIA , "Anticipo de proveedor 1"}) 

        if pagado < pedido.termino_2:
            if pedido.fecha_compromiso_proveedor_3:
                dias_restantes = (pedido.fecha_compromiso_proveedor_3 - hoy).days
                if dias_restantes <= 5:
                    if dias_restantes <= 1:
                        aviso.append({ URGENTE , "Anticipo de proveedor 3"}) 
                    else:
                        aviso.append({ MEDIA , "Anticipo de proveedor 3"}) 


        if pagado < pedido.termino_3:
            if pedido.fecha_compromiso_cliente_3:
                dias_restantes = (pedido.fecha_compromiso_cliente_3 - hoy).days
                if dias_restantes <= 5:
                    if dias_restantes <= 1:
                        aviso.append({ URGENTE , "Anticipo de cliente 3"}) 
                    else:
                        aviso.append({ MEDIA , "Anticipo de cliente 3"}) 




        pedido.write({
            'aviso' : aviso
        })
        return (aviso)

        
    @api.model
    def listar_pedidos(self, termino_busqueda=None):
        domain = []
        if termino_busqueda:
            domain = [
                '|', '|',
                ('numero_guia', 'ilike', termino_busqueda),
                ('cliente_id.name', 'ilike', termino_busqueda),
                ('numero_contrato', 'ilike', termino_busqueda),
            ]

        pedidos = self.search(domain, limit=50)
        lista = []
        kpi_saldo_clientes = 0
        kpi_saldo_proveedores = 0

        moneda_usd = self.env.ref('base.USD', raise_if_not_found=False)

        for p in pedidos:
            aviso = self.crear_aviso(p.id)
            actualizacion = self.env['rastreo.pedido_actualizacion'].search_read(
                [('pedido_id', '=', p.id)],
                ['fecha_actualizacion', 'actualizacion_texto'],
                order='fecha_actualizacion desc',
                limit=1,
            )

            cotizacion = p.sale_order_id
            total_cotizacion = cotizacion.amount_total if cotizacion else 0.0
            moneda = cotizacion.currency_id.name if cotizacion else ''

            total_pagos_cliente = 0.0
            count_pagos_cliente = 0
            if cotizacion:
                # 1. Facturas publicadas de la venta
                facturas = cotizacion.invoice_ids.filtered(
                    lambda f: f.move_type == 'out_invoice' and f.state == 'posted'
                )

                # 2. Buscar pagos relacionados directamente mediante las facturas
                pagos_factura = self.env['account.payment'].search([
                    ('reconciled_invoice_ids', 'in', facturas.ids)
                ]) if facturas else self.env['account.payment']

                # 3. Buscar pagos/anticipos directos utilizando la referencia del asiento contable (move_id.ref)
                domain_pagos = [
                    ('partner_id', '=', cotizacion.partner_id.id),
                    ('state', '=', 'posted'),  # Estado correcto para pagos confirmados
                    ('payment_type', '=', 'inbound'),
                ]
                
                if cotizacion.name:
                    domain_pagos.extend([
                        '|',
                        ('move_id.ref', 'ilike', cotizacion.name),
                        ('move_id.ref', 'ilike', 'INV'),
                    ])

                pagos_directos = self.env['account.payment'].search(domain_pagos) if cotizacion.partner_id else self.env['account.payment']
                
                # Unir pagos de factura y pagos directos sin duplicados
                pagos_totales = pagos_factura | pagos_directos
                
                for pago in pagos_totales:
                    count_pagos_cliente += 1
                    total_pagos_cliente += pago.currency_id._convert(
                        pago.amount,
                        self.env.company.currency_id,
                        self.env.company,
                        pago.date or fields.Date.today(),
                    )

            anticipos_proveedor = p.detalle_proveedor_ids
            total_anticipos_proveedor = sum(a.cantidad or 0.0 for a in anticipos_proveedor)
            count_anticipos_proveedor = len(anticipos_proveedor)

            total_racks = 0
            total_detalle = 0.0
            count_lineas_detalle = 0
            if cotizacion:
                for linea in cotizacion.order_line:
                    count_lineas_detalle += 1
                    total_racks += linea.product_uom_qty or 0
                    total_detalle += linea.price_subtotal or 0.0

            saldo_cliente = (total_cotizacion or 0.0) - total_pagos_cliente
            saldo_proveedor = (p.total_proveedor or 0.0) - total_anticipos_proveedor

            kpi_saldo_clientes += saldo_cliente
            kpi_saldo_proveedores += saldo_proveedor
            estados_dict = dict(p._fields['estado'].selection)

            lista.append({
                'id': p.id,
                'cliente_nombre': p.cliente_id.name if p.cliente_id else '',
                'estado': p.estado,
                'invoice': p.numero_contrato or '',
                'estado_nombre': estados_dict.get(p.estado, p.estado),
                'numero_guia': p.numero_guia or '',
                'bool_contrato_proveedor': bool(p.pdf_contrato_proveedor),
                'aviso': aviso or {},

                'ultima_actualizacion': {
                    'fecha': actualizacion[0]['fecha_actualizacion'] if actualizacion else '',
                    'texto': actualizacion[0]['actualizacion_texto'] if actualizacion else '',
                },

                'cotizacion': {
                    'id': cotizacion.id if cotizacion else False,
                    'nombre': cotizacion.name if cotizacion else '',
                    'total': total_cotizacion,
                    'moneda': moneda,
                },

                'anticipos_cliente': {
                    'count': count_pagos_cliente,
                    'total': total_pagos_cliente,
                    'saldo_cliente': saldo_cliente,
                    'total_acordado': p.total_cliente or 0.0,
                },

                'anticipos_proveedor': {
                    'count': count_anticipos_proveedor,
                    'total': total_anticipos_proveedor,
                    'saldo_proveedor': saldo_proveedor,
                    'total_acordado': p.total_proveedor or 0.0,
                },

                'detalle_cotizacion': {
                    'count': count_lineas_detalle,
                    'total_racks': total_racks,
                    'total_costo': total_detalle,
                },
            })

        return {
            'success': True,
            'lista': lista,
            'kpi': {
                'cliente': kpi_saldo_clientes,
                'proveedor': kpi_saldo_proveedores,
            },
        }

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
                'color': b.color.id or False,
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
        if not termino_busqueda:
            return {'error': 'Se necesita un número', 'success': False}

        cotizacion = self.env['sale.order'].search(
            [('state', 'in', ['draft', 'sent', 'sale', 'done']),
            ('name', '=', termino_busqueda)],
            order='id desc',
            limit=1,
        )
        if not cotizacion.exists():
            return {'error': 'Cotización no encontrada', 'success': False}

        lista_productos = []
        for linea in cotizacion.order_line:
            rack = self.env['rastreo.rack_detalle'].search(
                [('producto_id', '=', linea.product_id.id)],
                order='id desc',
                limit=1,
            )
            if rack:
                lista_productos.append({
                    'id': linea.product_id.id,
                    'nombre': linea.product_id.name,
                    'codigo': rack.clave or '',
                    'rack_id': rack.id,
                    'precio': linea.price_unit,
                    'unidad': linea.product_uom_id.name,
                    'cantidad': linea.product_uom_qty,
                    'subtotal': linea.price_subtotal,
                })
            else:
                lista_productos.append({
                    'id': linea.product_id.id,
                    'nombre': linea.product_id.name,
                    'codigo': linea.product_id.default_code or '',
                    'rack_id': False,
                    'precio': linea.price_unit,
                    'unidad': linea.product_uom_id.name,
                    'cantidad': linea.product_uom_qty,
                    'subtotal': linea.price_subtotal,
                })

        return {
            'success': True,
            'cotizacion_info': {
                'id': cotizacion.id,
                'nombre': cotizacion.name,
                'cliente': cotizacion.partner_id.name,
                'cliente_id': cotizacion.partner_id.id,
                'total': cotizacion.amount_total,
                'moneda': cotizacion.currency_id.name,
                'fecha': cotizacion.date_order,
            },
            'data': lista_productos,
        }