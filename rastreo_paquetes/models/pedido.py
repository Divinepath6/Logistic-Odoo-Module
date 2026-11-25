from odoo import models, fields, api
from odoo.exceptions import UserError
import base64
from datetime import datetime, timedelta

class rastreo_paquetes(models.Model):
    _name = 'rastreo.pedido'
    _description = 'Clase principal del modulo'
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
        ('produccion', 'En producción'),
        ('en_origen','En origen'),
        ('puerto_origen', 'En el puerto de origen'),
        ('agua', 'En el Agua'),
        ('puerto_destino', 'Puerto de Destino'),
        ('camino_cliente', 'Camino a cliente'),
        ('entregado', 'Entregado'),
    ], string = 'Estado', default='fase_inicial')

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

   

    pdf_flete= fields.Binary(
        string='Documento flete',
        attachment=True
    )
    pdf_flete_nombre = fields.Char(
        string='Nombre de PDF'
    )

    pdf_evidencia_entregado = fields.Binary(
        string='Documento evidencia de entregado',
        attachment=True
    )
    pdf_evidencia_entregado_nombre = fields.Char(
        string='Nombre de PDF'
    )
    # ADUANA ¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡
    pdf_aviso = fields.Binary(
        string='Documento Aviso de arribo',
        attachment=True
    )
    pdf_aviso_nombre = fields.Char(
        string='Nombre de PDF'
    )


    cotizacion_aduana = fields.Monetary(
        string='Costo de la cotizacion aduanal',
    )
    cotizacion_aduana_costo_dolar = fields.Float(
        string='Tipo de cambio cotización aduanal',
        digits=(12, 4)
    )
    
    pdf_cotizacion_aduana = fields.Binary(
        string='Costo de la cotizacion aduanal',
    )
    pdf_cotizacion_aduana_nombre = fields.Char(
        string='Nombre del PDF de la cotizacion aduanal',
    )
    
    salida_aduana= fields.Boolean(
        string="Salio de Aduana", 
        default=False
    )
    currency_id = fields.Many2one(
        'res.currency', 
        string='Moneda', 
        default=lambda self: self.env.company.currency_id
    )

    ## Proveedor ----------------------------------------------------------------------------
    proveedor_id = fields.Many2one(
        'res.partner',
        string='Proveedor',
        domain="[('supplier_rank', '>', 0)]",
    )
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
    total_proveedor_costo_dolar = fields.Monetary(
        string= 'Costo del dolar al momento de el total',
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

    pago_compromiso_cliente_1 = fields.Float(
        string= 'Porcentaje de pago acordado con el cliente',
        digits=(5, 2),
        required=True
    )
            
    pago_compromiso_cliente_2 = fields.Float(
        string= 'Porcentaje de pago acordado con el cliente',
        digits=(5, 2),
        required=True
    )
    pago_compromiso_cliente_3 = fields.Float(
        string= 'Porcentaje de pago acordado con el cliente',
        digits=(5, 2),
        required=True
    )
    pago_compromiso_cliente_4 = fields.Float(
        string= 'Porcentaje de pago acordado con el cliente',
        digits=(5, 2),
        required=True
    )
        
    fecha_termino_produccion = fields.Date(
        string = 'Fecha de termino de produccion'
    ) 
       ## Cliente ///////////////////////////////////////////////////////////////////////////////
    total_cliente = fields.Monetary(
        string= 'Total acordado con el cliente',
        currency_field='currency_id' 
    )
    total_cliente_costo_dolar = fields.Monetary(
        string= 'Total acordado con el cliente',
        currency_field='currency_id' 
    )

    racks_acordados = fields.Integer(
        string = 'Total de rack acordados con el cliente'
    )
    contenedores = fields.Integer(
        string = 'Total de contenedores'
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
    termino_ids = fields.One2many(
        'rastreo.termino', 
        'pedido_id', 
        string='Términos de Pago'
    )
    aviso_ids = fields.One2many(
        'rastreo.aviso',
        'pedido_id',
        string='Avisos Activos'
    )
    eta_ids = fields.One2many(
        'rastreo.etas',
        'pedido_id',
        string='Historial de ETAs'
    )

    ETA = fields.Date(
        string='Fecha de la Estimated Time of Arrival (Más reciente)',
        compute='_compute_eta_actual',
        store=True
    )
    @api.depends('eta_ids', 'eta_ids.fecha', 'eta_ids.numero')
    def _compute_eta_actual(self):
        for record in self:
            if record.eta_ids:
                # Obtiene el ETA con el número más alto
                ultimo_eta = record.eta_ids.sorted(key=lambda e: e.numero, reverse=True)[0]
                record.ETA = ultimo_eta.fecha
            else:
                record.ETA = False

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

        usd_currency = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)
        if not usd_currency:
            raise UserError("No se encontró la moneda USD en el sistema.")

        cotizacion = self.env['sale.order'].create({
            'partner_id': cliente_id,
            'origin': f'Rastreo pedido #{pedido.id}',
            'currency_id': usd_currency.id, 
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
        
        return pedido.id
    
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
                'fecha_compromiso_cliente_1': fields.Date.today(),
                'fecha_creacion' : fields.Date.today(),
            })
            self.crear_aviso(pedido.id)
            texto = 'Creación de pedido'            
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
    def cambiar_estado_inicial(self, pedido_id,costoDolar = 10.0, estado=None):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        
        siguiente_estado = 'produccion'
        if pedido.sale_order_id.exists():
            if pedido.sale_order_id.state in ('draft', 'sent'):
                pedido.sale_order_id.action_confirm()
        pedido.write({
            'fecha_compromiso_cliente_1': fields.Date.today(),
            'total_proveedor_costo_dolar': costoDolar or 10.0,
            'total_cliente_costo_dolar': costoDolar or 10.0,
            'fecha_creacion': fields.Date.today(),
        })
        pedido.write({'estado': siguiente_estado})
        self.crear_aviso(pedido.id)

        return {
            'success': True, 
            'id': pedido.id, 
            'nuevo_estado': siguiente_estado
        }
    
    @api.model
    def cambiar_estado(self, pedido_id, estado=None):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        if pedido.estado == 'fase_inicial':
            return {
                'success': False,
                'error': 'El pedido aún está en fase inicial.'
            }

        hoy = fields.Date.context_today(self.with_context(tz='America/Mazatlan'))
        siguiente_estado = ''

        estados_validos = [
            'produccion',
            'en_origen',
            'puerto_origen',
            'agua',
            'puerto_destino',
            'camino_cliente',
            'entregado',
        ]

        if estado and estado in estados_validos and estado != pedido.estado:
            siguiente_estado = estado

        elif pedido.estado == 'produccion':
            fecha_limite_prod = pedido.fecha_termino_produccion or (
                pedido.fecha_creacion + timedelta(days=20) if pedido.fecha_creacion else False
            )
            if fecha_limite_prod and hoy >= fecha_limite_prod:
                siguiente_estado = 'en_origen'

        elif pedido.estado == 'en_origen':
            if pedido.CRD and hoy >= pedido.CRD:
                siguiente_estado = 'puerto_origen'

        elif pedido.estado == 'puerto_origen':
            if pedido.ETD and hoy >= pedido.ETD:
                siguiente_estado = 'agua'

        elif pedido.estado == 'agua':
            if pedido.ETA and hoy >= pedido.ETA:
                siguiente_estado = 'puerto_destino'

        elif pedido.estado == 'puerto_destino':
            if pedido.salida_aduana:
                siguiente_estado = 'camino_cliente'

        elif pedido.estado == 'camino_cliente':
            if pedido.pdf_evidencia_entregado:
                siguiente_estado = 'entregado'

        if not siguiente_estado or siguiente_estado == pedido.estado:
            return {
                'success': False,
                'id': pedido.id,
                'estado_actual': pedido.estado,
                'mensaje': 'Aún no se cumplen las condiciones de fecha o evidencia para cambiar de fase.'
            }

        pedido.write({'estado': siguiente_estado})

        estados_dict = dict(self._fields['estado'].selection)
        nombre_estado = estados_dict.get(siguiente_estado, siguiente_estado)
        ultima = self.env['rastreo.pedido_actualizacion'].search(
            [('pedido_id', '=', pedido.id)],
            order='numero_actualizacion desc',
            limit=1
        )
        numero_act = (ultima.numero_actualizacion or 0) + 1
        self.env['rastreo.pedido_actualizacion'].create({
            'pedido_id': pedido.id,
            'numero_actualizacion': numero_act,
            'fecha_actualizacion': datetime.now(),
            'actualizacion_texto': f'Cambio de estado a: {nombre_estado}',
            'usuario_id': self.env.user.id,
        })

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
            'pdf_aviso',
            'pdf_flete',
            'pdf_evidencia_entregado',
            'pdf_cotizacion_aduana',
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
            'pdf_aviso',
            'pdf_flete',
            'pdf_evidencia_entregado',
            'pdf_cotizacion_aduana',
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
    def guardar_terminos(self, tipo_documento, pdf, pedido_id, nombre_archivo, terminos, totalProveedor,invoice, cambio):
        if not pedido_id:
            return {'success': False, 'error': "Debes indicar un pedido"}
        
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': "El pedido indicado no existe."}
            
        if not terminos or len(terminos) == 0:
            return {
                'success': False, 
                'error': "Debe haber al menos un término de pago"
            }
            
        ##try:
           # with self.env.cr.savepoint():
        res_pdf = self.guardar_pdf(tipo_documento, pdf, pedido_id, nombre_archivo)
        if not res_pdf.get('success'):
            return res_pdf
                ##try:
        proveedor_total_num = float(totalProveedor) if totalProveedor else 0.0
                ##except (ValueError, TypeError):
                    #proveedor_total_num = 0.0
        if cambio == True:
            pedido.write({
                        'total_proveedor': proveedor_total_num or 0.0,
                        'numero_contrato': invoice, 
                    })
        if hasattr(pedido, 'termino_ids'):
                    pedido.termino_ids.unlink()

                    nuevos_terminos_vals = []
                    for index, t in enumerate(terminos, start=1):
                        nuevos_terminos_vals.append({
                            'pedido_id': pedido.id,
                            'numero': index,
                            'porcentaje': t.get('porcentaje', 0),
                            'texto': t.get('nombre', f'Término {index}'),
                        })
                    
                    self.env['rastreo.termino'].create(nuevos_terminos_vals)
        else:
            return {
                        'success': False, 
                        'error': "El modelo de pedido no tiene configurado el campo relacional 'termino_ids'."
                    }
        return {
                'success': True,
        }
        #except Exception as e:
        #    return {
        #        'success': False,
        #        'error': str(e)
        #    }
        
    @api.model
    def actualizar_pedido(self, pedido_id, detalle_pedido, datos):
        if not pedido_id:
            raise UserError("Debes indicar un pedido")
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            raise UserError("El pedido indicado no existe.")
        
        with self.env.cr.savepoint():
            pedido.write({
                'racks_acordados': datos.get('racks_acordados') or 0,
                'forwarder': datos.get('forwarder') or False,
                'total_cliente': datos.get('total_cliente'),
                'contenedores': datos.get('contenedores') or 0,
                'proveedor_id': datos.get('proveedor_id') or False,
                'total_proveedor_costo_dolar': datos.get('total_proveedor_costo_dolar') or 0.0,
                'total_cliente_costo_dolar':  datos.get('total_cliente_costo_dolar') or 0.0,

                'ETD': datos.get('ETD') or False,
                'CRD': datos.get('CRD') or False,

                'cotizacion_aduana': datos.get('cotizacion_aduana') or 0.0,
                'salida_aduana': datos.get('salida_aduana') or False,

                'fecha_creacion': datos.get('fecha_creacion') or False,
                'fecha_termino_produccion' : datos.get('fecha_termino_produccion') or False,

                'fecha_compromiso_cliente_1': datos.get('fecha_compromiso_cliente_1') or False,
                'fecha_compromiso_cliente_2': datos.get('fecha_compromiso_cliente_2') or False,
                'fecha_compromiso_cliente_3': datos.get('fecha_compromiso_cliente_3') or False,
                'fecha_compromiso_cliente_4': datos.get('fecha_compromiso_cliente_4') or False,
            })

            if 'etas' in datos:
                etas_data = datos.get('etas') or []
                pedido.eta_ids.unlink()
                
                nuevas_etas_vals = []
                for index, eta_item in enumerate(etas_data, start=1):
                    fecha_eta = eta_item.get('fecha')
                    if not fecha_eta:
                        continue
                    nuevas_etas_vals.append({
                        'pedido_id': pedido.id,
                        'numero': int(eta_item.get('numero') or index),
                        'texto': eta_item.get('texto') or f'ETA #{index}',
                        'fecha': fecha_eta,
                    })
                
                if nuevas_etas_vals:
                    self.env['rastreo.etas'].create(nuevas_etas_vals)
            elif datos.get('ETA') and not pedido.eta_ids:
                self.env['rastreo.etas'].create({
                    'pedido_id': pedido.id,
                    'numero': 1,
                    'texto': 'ETA Inicial',
                    'fecha': datos.get('ETA'),
                })

            terminos_data = datos.get('terminos', [])
            for t in terminos_data:
                numero_termino = t.get('numero')
                fecha_nueva = t.get('fecha_compromiso') or False
                
                termino_rec = self.env['rastreo.termino'].search([
                    ('pedido_id', '=', pedido.id),
                    ('numero', '=', numero_termino)
                ], limit=1)
                
                if termino_rec:
                    termino_rec.write({
                        'fecha_compromiso': fecha_nueva
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
        self.crear_aviso(pedido.id)
        return {
            'success': True,
        }

    def _calcular_pagos_realizados(self, pedido):
        moneda_usd = self.env.ref('base.USD', raise_if_not_found=False)
        company_currency = self.env.company.currency_id

        def _tc(fecha):
            if not moneda_usd:
                return 1.0
            rate = moneda_usd._get_conversion_rate(
                moneda_usd, company_currency, self.env.company, fecha or fields.Date.today()
            )
            return (1.0 / rate) if (rate and rate < 1.0) else (rate or 1.0)

        cotizacion = pedido.sale_order_id
        total_cot = cotizacion.amount_total if cotizacion else (pedido.total_cliente or 0.0)
        moneda_cot = cotizacion.currency_id.name if cotizacion else 'USD'
        tc_cliente = pedido.total_cliente_costo_dolar or _tc(pedido.fecha_creacion)

        if moneda_cot == 'USD':
            total_cliente_usd = total_cot
        else:
            total_cliente_usd = (total_cot / tc_cliente) if tc_cliente else 0.0

        anticipos_cli = pedido.detalle_cliente_ids
        pagado_cliente_usd = sum(a.monto_usd for a in anticipos_cli)
        pagos_vinculados = anticipos_cli.mapped('account_payment_id').ids

        if cotizacion:
            facturas = cotizacion.invoice_ids.filtered(
                lambda f: f.move_type == 'out_invoice' and f.state == 'posted'
            )
            pagos_factura = self.env['account.payment'].search([
                ('reconciled_invoice_ids', 'in', facturas.ids),
                ('id', 'not in', pagos_vinculados),
            ]) if facturas else self.env['account.payment']

            domain_pagos = [
                ('partner_id', '=', cotizacion.partner_id.id),
                ('state', '=', 'posted'),
                ('payment_type', '=', 'inbound'),
                ('id', 'not in', pagos_vinculados),
            ]
            if cotizacion.name:
                domain_pagos.extend([
                    '|',
                    ('memo', 'ilike', cotizacion.name),
                    ('move_id.ref', 'ilike', cotizacion.name),
                ])
            pagos_directos = self.env['account.payment'].search(domain_pagos) if cotizacion.partner_id else self.env['account.payment']

            for pago in (pagos_factura | pagos_directos):
                tc_p = _tc(pago.date)
                if pago.currency_id.name == 'USD':
                    pagado_cliente_usd += pago.amount
                else:
                    pagado_cliente_usd += (pago.amount / tc_p) if tc_p else 0.0

        total_proveedor_usd = pedido.total_proveedor or 0.0
        pagado_proveedor_usd = sum(a.monto_usd for a in pedido.detalle_proveedor_ids)

        return pagado_cliente_usd, total_cliente_usd, pagado_proveedor_usd, total_proveedor_usd

    @api.model
    def crear_aviso(self, id):
        pedido = self.browse(id)
        if not pedido.exists():
            return []

        avisos_a_crear = []
        INFO = 'info'
        MEDIA = 'media'
        URGENTE = 'urgente'

        hoy = fields.Date.context_today(self.with_context(tz='America/Mazatlan'))

        if pedido.estado == 'produccion':
            if not pedido.numero_contrato:
                avisos_a_crear.append({'severidad': MEDIA, 'mensaje': "Número de contrato"})

            if not pedido.pdf_contrato_proveedor:
                avisos_a_crear.append({'severidad': URGENTE, 'mensaje': "Contrato del proveedor"})

            if pedido.fecha_termino_produccion:
                dias_restantes = (pedido.fecha_termino_produccion - hoy).days

                if not pedido.forwarder and dias_restantes <= 13:
                    avisos_a_crear.append({
                        'severidad': URGENTE,
                        'mensaje': f"Faltan {dias_restantes} días, conseguir Forwarder",
                    })
                    if not pedido.CRD:
                        avisos_a_crear.append({'severidad': MEDIA, 'mensaje': "Conseguir CRD"})
                elif 0 < dias_restantes <= 20:
                    avisos_a_crear.append({
                        'severidad': INFO,
                        'mensaje': f"Producción en curso, quedan {dias_restantes} días.",
                    })
                elif pedido.CRD:
                    dias_restantes = (pedido.CRD - hoy).days
                    if dias_restantes <= 5:
                        avisos_a_crear.append({
                            'severidad': INFO,
                            'mensaje': f"Quedan {dias_restantes} para puerto",
                        })
        
        elif pedido.estado == 'en_origen':         
            if not pedido.CRD:
                avisos_a_crear.append({'severidad': URGENTE, 'mensaje': "Conseguir y capturar el CRD"})
            else:
                dias_restantes = (pedido.CRD - hoy).days
                avisos_a_crear.append({'severidad': INFO, 'mensaje': f"Quedan {dias_restantes} para puerto"})

        elif pedido.estado == 'puerto_origen':
            if not pedido.ETD:
                avisos_a_crear.append({'severidad': URGENTE, 'mensaje': "Conseguir y capturar el ETD"})

            if pedido.ETD:
                dias_restantes = (pedido.ETD - hoy).days
                if 0 <= dias_restantes <= 3:
                    avisos_a_crear.append({
                        'severidad': MEDIA,
                        'mensaje': f"El contenedor sale del puerto en {dias_restantes} días"
                    })      

        elif pedido.estado in ('agua', 'embarcado'):
            if not pedido.ETA:
                avisos_a_crear.append({'severidad': URGENTE, 'mensaje': "Conseguir y capturar el ETA"})

            if not pedido.pdf_BL:
                avisos_a_crear.append({'severidad': MEDIA, 'mensaje': "Subir BL (Bill of Lading)"})

            if not pedido.pdf_PL:
                avisos_a_crear.append({'severidad': MEDIA, 'mensaje': "Subir PL (Packing List)"})

            if not pedido.pdf_invoice:
                avisos_a_crear.append({'severidad': MEDIA, 'mensaje': "Subir Invoice"})
            if not pedido.pdf_prefactura:
                avisos_a_crear.append({'severidad': MEDIA, 'mensaje': "Pedir prefactura a proveedor de flete marítimo"})
            if not pedido.cotizacion_aduana: 
                avisos_a_crear.append({'severidad': MEDIA, 'mensaje': "Cotizar Agente Aduanal"})
            if not pedido.pdf_aviso:
                avisos_a_crear.append({'severidad': MEDIA, 'mensaje': "Aviso de arribo"})

        elif pedido.estado in ('puerto_destino', 'descargado'):
            if not pedido.salida_aduana:
                avisos_a_crear.append({'severidad': INFO, 'mensaje': "Esperado despacho Aduanal"})

        elif pedido.estado == 'camino_cliente':
            if not pedido.pdf_evidencia_entregado:
                avisos_a_crear.append({'severidad': INFO, 'mensaje': "Capturar entregado con evidencia"})
          

        (
            pagado_cli_usd,
            total_cli_usd,
            pagado_prov_usd,
            total_prov_usd,
        ) = self._calcular_pagos_realizados(pedido)

        def _texto_vencimiento(dias):
            if dias < 0:
                return f"vencido hace {abs(dias)} día(s)"
            if dias == 0:
                return "vence HOY"
            return f"vence en {dias} día(s)"

        porcentaje_acum_prov = 0.0
        for termino in pedido.termino_ids.sorted(key=lambda t: t.numero):
            porcentaje_acum_prov += (termino.porcentaje or 0.0)
            if not termino.fecha_compromiso:
                continue

            dias_prov = (termino.fecha_compromiso - hoy).days
            if dias_prov <= 3:
                monto_esperado_usd = total_prov_usd * (porcentaje_acum_prov / 100.0)
                if total_prov_usd <= 0 or (pagado_prov_usd + 0.50) < monto_esperado_usd:
                    monto_tramo = total_prov_usd * ((termino.porcentaje or 0.0) / 100.0)
                    severidad_pago = URGENTE if dias_prov <= 2 else MEDIA
                    etiqueta = termino.texto or f"Pago #{termino.numero}"
                    detalle_monto = f" (${monto_tramo:,.2f} USD)" if monto_tramo > 0 else ""

                    avisos_a_crear.append({
                        'severidad': severidad_pago,
                        'mensaje': (
                            f"Pago a proveedor {termino.porcentaje:g}%{detalle_monto}"
                            f"{_texto_vencimiento(dias_prov)}."
                        ),
                    })

        porcentaje_acum_cli = 0.0
        for idx in range(1, 5):
            fecha_cli = getattr(pedido, f'fecha_compromiso_cliente_{idx}', False)
            porcentaje_cli = getattr(pedido, f'pago_compromiso_cliente_{idx}', 0.0) or 0.0
            porcentaje_acum_cli += porcentaje_cli

            if not fecha_cli or porcentaje_cli <= 0:
                continue

            dias_cli = (fecha_cli - hoy).days
            if dias_cli <= 3:
                monto_esperado_cli = total_cli_usd * (porcentaje_acum_cli / 100.0)
                if total_cli_usd <= 0 or (pagado_cli_usd + 0.50) < monto_esperado_cli:
                    monto_tramo_cli = total_cli_usd * (porcentaje_cli / 100.0)
                    severidad_cobro = URGENTE if dias_cli <= 2 else MEDIA
                    detalle_monto_cli = f" (${monto_tramo_cli:,.2f} USD)" if monto_tramo_cli > 0 else ""

                    avisos_a_crear.append({
                        'severidad': severidad_cobro,
                        'mensaje': (
                            f"Cobro a cliente (Pago #{idx} - {porcentaje_cli:g}%{detalle_monto_cli}) "
                            f"{_texto_vencimiento(dias_cli)}."
                        ),
                    })
        pedido.aviso_ids.unlink()

        nuevos_avisos = [
            (0, 0, {
                'importancia': av['severidad'],
                'texto': av['mensaje'],
                'pedido_id': pedido.id,
            })
            for av in avisos_a_crear
        ]

        if nuevos_avisos:
            pedido.write({'aviso_ids': nuevos_avisos})

        return [{'severidad': av['severidad'], 'mensaje': av['mensaje']} for av in avisos_a_crear]

    @api.model
    def _cron_actualizar_avisos_diarios(self):
        pedidos_activos = self.search([('estado', 'not in', ['fase_inicial', 'entregado'])])
        for pedido in pedidos_activos:
            res = self.cambiar_estado(pedido.id)
            if not res.get('success'):
                self.crear_aviso(pedido.id)

        
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

        pedidos = self.search(domain, limit=100)
        lista = []

        kpi_saldo_clientes_mxn = 0.0
        kpi_saldo_clientes_usd = 0.0
        kpi_saldo_proveedores_mxn = 0.0
        kpi_saldo_proveedores_usd = 0.0

        moneda_usd = self.env.ref('base.USD', raise_if_not_found=False)
        company_currency = self.env.company.currency_id

        def _obtener_tc(fecha):
            if not moneda_usd:
                return 1.0
            rate = moneda_usd._get_conversion_rate(moneda_usd, company_currency, self.env.company, fecha or fields.Date.today())
            if rate and rate < 1.0:
                return 1.0 / rate
            return rate or 1.0

        for p in pedidos:
            aviso = self.crear_aviso(p.id)
            actualizacion = self.env['rastreo.pedido_actualizacion'].search_read(
                [('pedido_id', '=', p.id)],
                ['fecha_actualizacion', 'actualizacion_texto'],
                order='fecha_actualizacion desc',
                limit=1,
            )
            lista_avisos = [
                {'id': av.id, 'importancia': av.importancia, 'texto': av.texto}
                for av in p.aviso_ids
            ]

            cotizacion = p.sale_order_id
            total_cotizacion = cotizacion.amount_total if cotizacion else 0.0
            moneda_cotizacion = cotizacion.currency_id if cotizacion else company_currency
            moneda_nombre = moneda_cotizacion.name

            fecha_cot = cotizacion.date_order.date() if (cotizacion and cotizacion.date_order) else (p.fecha_creacion or fields.Date.today())
            precio_dolar_cliente = p.total_cliente_costo_dolar or _obtener_tc(fecha_cot)

            if moneda_nombre == 'USD':
                total_cliente_usd = total_cotizacion
                total_cliente_mxn = total_cotizacion * precio_dolar_cliente
            else:
                total_cliente_mxn = total_cotizacion
                total_cliente_usd = (total_cotizacion / precio_dolar_cliente) if precio_dolar_cliente else 0.0

            anticipos_cliente_mod = p.detalle_cliente_ids
            total_pagos_cliente_usd = sum(a.monto_usd for a in anticipos_cliente_mod)
            total_pagos_cliente_mxn = sum(a.monto_mxn for a in anticipos_cliente_mod)
            count_pagos_cliente = len(anticipos_cliente_mod)
            pagos_ya_vinculados = anticipos_cliente_mod.mapped('account_payment_id').ids

            if cotizacion:
                facturas = cotizacion.invoice_ids.filtered(
                    lambda f: f.move_type == 'out_invoice' and f.state == 'posted'
                )
                pagos_factura = self.env['account.payment'].search([
                    ('reconciled_invoice_ids', 'in', facturas.ids),
                    ('id', 'not in', pagos_ya_vinculados),
                ]) if facturas else self.env['account.payment']

                domain_pagos = [
                    ('partner_id', '=', cotizacion.partner_id.id),
                    ('state', '=', 'posted'),
                    ('payment_type', '=', 'inbound'),
                    ('id', 'not in', pagos_ya_vinculados),
                ]
                if cotizacion.name:
                    domain_pagos.extend([
                        '|',
                        ('memo', 'ilike', cotizacion.name),
                        ('move_id.ref', 'ilike', cotizacion.name),
                    ])

                pagos_directos = self.env['account.payment'].search(domain_pagos) if cotizacion.partner_id else self.env['account.payment']
                pagos_externos = pagos_factura | pagos_directos

                for pago in pagos_externos:
                    count_pagos_cliente += 1
                    tc_pago = _obtener_tc(pago.date or fields.Date.today())
                    if pago.currency_id.name == 'USD':
                        total_pagos_cliente_usd += pago.amount
                        total_pagos_cliente_mxn += pago.amount * tc_pago
                    else:
                        total_pagos_cliente_mxn += pago.amount
                        total_pagos_cliente_usd += (pago.amount / tc_pago) if tc_pago else 0.0

            saldo_cliente_usd = total_cliente_usd - total_pagos_cliente_usd
            saldo_cliente_mxn = total_cliente_mxn - total_pagos_cliente_mxn

            anticipos_proveedor = p.detalle_proveedor_ids
            total_anticipos_proveedor_usd = sum(a.monto_usd for a in anticipos_proveedor)
            total_anticipos_proveedor_mxn = sum(a.monto_mxn for a in anticipos_proveedor)
            count_anticipos_proveedor = len(anticipos_proveedor)

            total_racks = 0
            total_detalle = 0.0
            count_lineas_detalle = 0
            if cotizacion:
                for linea in cotizacion.order_line:
                    count_lineas_detalle += 1
                    total_racks += linea.product_uom_qty or 0
                    total_detalle += linea.price_subtotal or 0.0

            total_proveedor_usd = p.total_proveedor or 0.0
            precio_dolar_proveedor = p.total_proveedor_costo_dolar or _obtener_tc(
                p.create_date.date() if p.create_date else fields.Date.today()
            )
            if precio_dolar_proveedor and precio_dolar_proveedor < 1.0:
                precio_dolar_proveedor = 1.0 / precio_dolar_proveedor

            total_proveedor_mxn = total_proveedor_usd * precio_dolar_proveedor
            saldo_proveedor_usd = total_proveedor_usd - total_anticipos_proveedor_usd
            saldo_proveedor_mxn = total_proveedor_mxn - total_anticipos_proveedor_mxn

            kpi_saldo_clientes_usd += saldo_cliente_usd
            kpi_saldo_clientes_mxn += saldo_cliente_mxn
            kpi_saldo_proveedores_usd += saldo_proveedor_usd
            kpi_saldo_proveedores_mxn += saldo_proveedor_mxn

            estados_dict = dict(p._fields['estado'].selection)

            lista.append({
                'id': p.id,
                'cliente_nombre': p.cliente_id.name if p.cliente_id else '',
                'estado': p.estado,
                'invoice': p.numero_contrato or '',
                'estado_nombre': estados_dict.get(p.estado, p.estado),
                'numero_guia': p.numero_guia or '',
                'bool_contrato_proveedor': bool(p.pdf_contrato_proveedor),
                'avisos': lista_avisos,

                'ultima_actualizacion': {
                    'fecha': actualizacion[0]['fecha_actualizacion'] if actualizacion else '',
                    'texto': actualizacion[0]['actualizacion_texto'] if actualizacion else '',
                },

                'cotizacion': {
                    'id': cotizacion.id if cotizacion else False,
                    'nombre': cotizacion.name if cotizacion else '',
                    'total': total_cotizacion,
                    'total_usd': total_cliente_usd,
                    'total_mxn': total_cliente_mxn,
                    'moneda': moneda_nombre,
                },

                'anticipos_cliente': {
                    'count': count_pagos_cliente,
                    'total': total_pagos_cliente_usd if moneda_nombre == 'USD' else total_pagos_cliente_mxn,
                    'saldo_cliente': saldo_cliente_usd if moneda_nombre == 'USD' else saldo_cliente_mxn,
                    'total_acordado': total_cotizacion,
                    'total_usd': total_pagos_cliente_usd,
                    'total_mxn': total_pagos_cliente_mxn,
                    'saldo_cliente_usd': saldo_cliente_usd,
                    'saldo_cliente_mxn': saldo_cliente_mxn,
                    'total_acordado_usd': total_cliente_usd,
                    'total_acordado_mxn': total_cliente_mxn,
                    'precio_dolar': precio_dolar_cliente,
                },

                'anticipos_proveedor': {
                    'count': count_anticipos_proveedor,
                    'total_usd': total_anticipos_proveedor_usd,
                    'total_mxn': total_anticipos_proveedor_mxn,
                    'saldo_proveedor_usd': saldo_proveedor_usd,
                    'saldo_proveedor_mxn': saldo_proveedor_mxn,
                    'total_acordado_usd': total_proveedor_usd,
                    'total_acordado_mxn': total_proveedor_mxn,
                    'precio_dolar': precio_dolar_proveedor,
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
                'cliente': {
                    'mxn': kpi_saldo_clientes_mxn,
                    'usd': kpi_saldo_clientes_usd,
                },
                'proveedor': {
                    'mxn': kpi_saldo_proveedores_mxn,
                    'usd': kpi_saldo_proveedores_usd,
                },
            },
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

        lista_actualizaciones = [
            {
                'id': actualizacion.id,
                'numero_actualizacion': actualizacion.numero_actualizacion,
                'fecha': actualizacion.fecha_actualizacion,
                'texto': actualizacion.actualizacion_texto or '',
                'usuario_id': actualizacion.usuario_id.id or False,
                'usuario': actualizacion.usuario_id.sudo().name or '',
            }
            for actualizacion in actualizaciones
        ]

        lista_etas = [
            {
                'id': e.id,
                'numero': e.numero,
                'texto': e.texto or '',
                'fecha': str(e.fecha) if e.fecha else '',
            }
            for e in self.env['rastreo.etas'].search([('pedido_id', '=', pedido_id)], order='numero asc')
        ]
        lista_avisos = [
            {
                'id': av.id,
                'importancia': av.importancia,
                'texto': av.texto,
                'fecha_creacion': str(av.create_date) if av.create_date else '',
            }
            for av in pedido.aviso_ids
        ]

        lista_pagos_cliente = []
        anticipos_cliente_mod = self.env['rastreo.detalle_cliente'].search(
            [('pedido_id', '=', pedido_id)],
            order='numero desc',
        )
        pagos_ya_vinculados = []

        for c in anticipos_cliente_mod:
            referencia_odoo = ''
            factura_origen = ''
            diario = c.journal_id.name if c.journal_id else ''
            metodo_pago = c.payment_method_line_id.name if c.payment_method_line_id else ''
            estado = 'posted'

            if c.account_payment_id:
                pagos_ya_vinculados.append(c.account_payment_id.id)
                referencia_odoo = c.account_payment_id.name or c.account_payment_id.memo or ''
                diario = c.account_payment_id.journal_id.name or diario
                estado = c.account_payment_id.state
                if c.account_payment_id.reconciled_invoice_ids:
                    factura_origen = ', '.join(c.account_payment_id.reconciled_invoice_ids.mapped('name'))

            lista_pagos_cliente.append({
                'detalle_id': c.id,
                'anticipo_id': c.id,
                'payment_id': c.account_payment_id.id if c.account_payment_id else False,
                'move_id': False,
                'numero': c.numero or 0,
                'tipo_registro': c.tipo_registro,
                'referencia': referencia_odoo or f"ANTICIPO-{c.numero}",
                'monto': c.monto_usd or 0.0,
                'monto_usd': c.monto_usd or 0.0,
                'precio_dolar': c.precio_dolar or 0.0,
                'monto_mxn': c.monto_mxn or 0.0,
                'moneda': 'USD',
                'fecha': str(c.fecha_anticipo) if c.fecha_anticipo else '',
                'fecha_editado': str(c.fecha_editado or c.write_date or ''),
                'estado': estado,
                'diario': diario,
                'metodo_pago': metodo_pago,
                'factura': factura_origen or (cotizacion.name if cotizacion else ''),
                'pdf_anticipo_cliente': bool(c.pdf_anticipo_cliente),
            })

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
                ('reconciled_invoice_ids', 'in', facturas.ids),
                ('id', 'not in', pagos_ya_vinculados),
            ]) if facturas else self.env['account.payment']

            pagos_anticipo = self.env['account.payment'].search([
                ('partner_id', '=', cotizacion.partner_id.id),
                ('payment_type', '=', 'inbound'),
                ('state', '=', 'posted'),
                ('id', 'not in', pagos_ya_vinculados),
                '|',
                ('memo', 'ilike', cotizacion.name),
                ('move_id.ref', 'ilike', cotizacion.name),
            ]) if cotizacion.partner_id else self.env['account.payment']

            pagos_totales = pagos_factura | pagos_directos_filtrados if False else (pagos_factura | pagos_anticipo)
            moneda_usd = self.env.ref('base.USD', raise_if_not_found=False)
            company_currency = self.env.company.currency_id

            for pago in pagos_totales:
                if any(x['payment_id'] == pago.id for x in lista_pagos_cliente):
                    continue

                factura_origen = ''
                if pago.reconciled_invoice_ids:
                    factura_origen = ', '.join(pago.reconciled_invoice_ids.mapped('name'))
                elif pago.reconciled_bill_ids:
                    factura_origen = ', '.join(pago.reconciled_bill_ids.mapped('name'))

                rate = moneda_usd._get_conversion_rate(
                    moneda_usd, company_currency, self.env.company, pago.date or fields.Date.today()
                ) if moneda_usd else 1.0
                tc_pago = (1.0 / rate) if (rate and rate < 1.0) else (rate or 1.0)

                if pago.currency_id.name == 'USD':
                    monto_usd = pago.amount
                    monto_mxn = pago.amount * tc_pago
                else:
                    monto_mxn = pago.amount
                    monto_usd = (pago.amount / tc_pago) if tc_pago else 0.0

                lista_pagos_cliente.append({
                    'detalle_id': 0,
                    'anticipo_id': 0,
                    'payment_id': pago.id,
                    'move_id': False,
                    'numero': len(lista_pagos_cliente) + 1,
                    'tipo_registro': 'pago',
                    'referencia': pago.name or pago.memo or '',
                    'monto': monto_usd,
                    'monto_usd': monto_usd,
                    'precio_dolar': tc_pago,
                    'monto_mxn': monto_mxn,
                    'moneda': pago.currency_id.name or '',
                    'fecha': str(pago.date) if pago.date else '',
                    'fecha_editado': '',
                    'estado': pago.state,
                    'diario': pago.journal_id.name or '',
                    'factura': factura_origen,
                    'pdf_anticipo_cliente': False,
                })

        anticipos_proveedor = self.env['rastreo.detalle_proveedor'].search(
            [('pedido_id', '=', pedido_id)],
            order='numero desc',
        )

        lista_anticipos_proveedor = []
        for a in anticipos_proveedor:
            referencia_odoo = ''
            if a.account_payment_id and a.account_payment_id.name and a.account_payment_id.name != '/':
                referencia_odoo = a.account_payment_id.name
            elif a.account_payment_id and a.account_payment_id.memo:
                referencia_odoo = a.account_payment_id.memo

            lista_anticipos_proveedor.append({
                'anticipo_id': a.id,
                'numero': a.numero or 0,
                'fecha_editado': str(a.write_date) if a.write_date else "",
                'fecha_anticipo': str(a.fecha_anticipo) if a.fecha_anticipo else "",
                'cantidad': a.monto_usd or 0.0,
                'precio_dolar': a.precio_dolar or 0.0,
                'monto_mxn': a.monto_mxn or 0.0,
                'referencia': referencia_odoo or f"ANTICIPO-{a.numero}",
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

        lista_terminos = [
            {
                'numero': t.numero,
                'porcentaje': t.porcentaje,
                'texto': t.texto,
                'fecha_compromiso': t.fecha_compromiso,
            }
            for t in self.env['rastreo.termino'].search([('pedido_id', '=', pedido_id)], order='numero asc')
        ]

        return {
            'success': True,
            'data': {
                'id': pedido.id,
                'estado': pedido.estado,
                'numero_guia': pedido.numero_guia or '',
                'cliente_id': pedido.cliente_id.id if pedido.cliente_id else None,
                'cliente_nombre': pedido.cliente_id.name if pedido.cliente_id else '',

                'proveedor_id': pedido.proveedor_id.id if pedido.proveedor_id else None,
                'proveedor_nombre': pedido.proveedor_id.name if pedido.proveedor_id else '',

                'total_cliente': cotizacion.amount_total or 0,
                'total_proveedor': pedido.total_proveedor or 0,
                'total_proveedor_costo_dolar': pedido.total_proveedor_costo_dolar or 0,
                'total_cliente_costo_dolar': pedido.total_cliente_costo_dolar or 0,
                'contenedores': pedido.contenedores or 0,
                'cotizacion_aduana': pedido.cotizacion_aduana or 0,
                'avisos': lista_avisos,
                'numero_contrato': pedido.numero_contrato or '',
                'fecha_creacion': pedido.fecha_creacion or '',

                'cotizacion_aduana': pedido.cotizacion_aduana or 0,
                'cotizacion_aduana_costo_dolar': pedido.cotizacion_aduana_costo_dolar or 0,
                'pdf_cotizacion_aduana': bool(pedido.pdf_cotizacion_aduana),

                'ETA':pedido.ETA or '',
                'CRD': pedido.CRD or '',
                'ETD': pedido.ETD or '',               
                'fecha_termino_produccion': pedido.fecha_termino_produccion or '',

                'fecha_compromiso_cliente_1': pedido.fecha_compromiso_cliente_1 or '',
                'fecha_compromiso_cliente_2': pedido.fecha_compromiso_cliente_2 or '',
                'fecha_compromiso_cliente_3': pedido.fecha_compromiso_cliente_3 or '',
                'fecha_compromiso_cliente_4': pedido.fecha_compromiso_cliente_4 or '',
                'pago_compromiso_cliente_1': pedido.pago_compromiso_cliente_1 or 0.0,
                'pago_compromiso_cliente_2': pedido.pago_compromiso_cliente_2 or 0.0,
                'pago_compromiso_cliente_3': pedido.pago_compromiso_cliente_3 or 0.0,
                'pago_compromiso_cliente_4': pedido.pago_compromiso_cliente_4 or 0.0,
                'terminos': lista_terminos,

                

                # booleanos
                'forwarder': bool(pedido.forwarder),
                'bool_contrato_proveedor': bool(pedido.pdf_contrato_proveedor),
                'bool_factura_proveedor': bool(pedido.pdf_factura_proveedor),
                'pdf_BL': bool(pedido.pdf_BL),
                'pdf_PL': bool(pedido.pdf_PL),
                'pdf_invoice': bool(pedido.pdf_invoice),
                'pdf_prefactura': bool(pedido.pdf_prefactura),
                'pdf_aviso': bool(pedido.pdf_aviso),
                'pdf_flete': bool(pedido.pdf_flete),
                'pdf_evidencia_entregado':bool(pedido.pdf_evidencia_entregado),
                'salida_aduana': bool(pedido.salida_aduana),
    
                # listas
                'lista_etas': lista_etas,
                'lista_anticipos_proveedor': lista_anticipos_proveedor,
                'lista_pagos_cliente': lista_pagos_cliente,
                'actualizaciones': lista_actualizaciones,
                'detalle_racks': lista_cotizacion_detalle,
            }
        }


    @api.model
    def guardar_terminos_cliente(self, pedido_id, terminos, totalCliente):
        if not pedido_id:
            return {'success': False, 'error': "Debes indicar un pedido"}

        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': "El pedido indicado no existe."}

        if not terminos or len(terminos) == 0:
            return {
                'success': False,
                'error': "Debe haber al menos un término de pago"
            }

        try:
            with self.env.cr.savepoint():
                try:
                    total_cliente_num = float(totalCliente) if totalCliente else 0.0
                except (ValueError, TypeError):
                    total_cliente_num = 0.0

                valores = {
                    'total_cliente': total_cliente_num,
                    'pago_compromiso_cliente_1': 0.0,
                    'pago_compromiso_cliente_2': 0.0,
                    'pago_compromiso_cliente_3': 0.0,
                    'pago_compromiso_cliente_4': 0.0,
                }

                for index, t in enumerate(terminos[:4], start=1):
                    try:
                        porcentaje_val = float(t.get('porcentaje', 0.0) or 0.0)
                    except (ValueError, TypeError):
                        porcentaje_val = 0.0
                    valores[f'pago_compromiso_cliente_{index}'] = porcentaje_val

                pedido.write(valores)

            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}
        

    @api.model
    def agregar_eta(self, pedido_id, fecha, texto=''):
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'Pedido no encontrado'}
        if not fecha:
            return {'success': False, 'error': 'La fecha del ETA es obligatoria'}

        ultimo = self.env['rastreo.etas'].search(
            [('pedido_id', '=', pedido_id)],
            order='numero desc',
            limit=1
        )
        siguiente_numero = (ultimo.numero or 0) + 1

        nueva_eta = self.env['rastreo.etas'].create({
            'pedido_id': pedido.id,
            'numero': siguiente_numero,
            'texto': texto or f'ETA #{siguiente_numero}',
            'fecha': fecha,
        })

        # Registrar en el historial de actualizaciones
        ultima_act = self.env['rastreo.pedido_actualizacion'].search(
            [('pedido_id', '=', pedido_id)],
            order='numero_actualizacion desc',
            limit=1
        )
        num_act = (ultima_act.numero_actualizacion or 0) + 1
        self.env['rastreo.pedido_actualizacion'].create({
            'pedido_id': pedido.id,
            'numero_actualizacion': num_act,
            'fecha_actualizacion': datetime.now(),
            'actualizacion_texto': f'Nueva ETA #{siguiente_numero} ({texto or "Sin observaciones"})',
            'usuario_id': self.env.user.id,
        })

        self.crear_aviso(pedido.id)
        return {
            'success': True,
            'eta': {
                'id': nueva_eta.id,
                'numero': nueva_eta.numero,
                'texto': nueva_eta.texto,
                'fecha': str(nueva_eta.fecha),
            }
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
    
    @api.model
    def guardar_cotizacion_aduana(self, pedido_id, pdf, nombre_archivo, costo_usd, costo_dolar):
        if not pedido_id:
            return {'success': False, 'error': 'Debes indicar un pedido'}
        
        pedido = self.browse(pedido_id)
        if not pedido.exists():
            return {'success': False, 'error': 'El pedido indicado no existe'}

        if pdf:
            res_pdf = self.guardar_pdf('pdf_cotizacion_aduana', pdf, pedido_id, nombre_archivo)
            if not res_pdf.get('success'):
                return res_pdf

        pedido.write({
            'cotizacion_aduana': float(costo_usd or 0.0),
            'cotizacion_aduana_costo_dolar': float(costo_dolar or 0.0),
        })

        return {'success': True}