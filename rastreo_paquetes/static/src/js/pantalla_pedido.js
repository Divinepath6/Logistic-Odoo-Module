/** @odoo-module **/
import { registry } from "@web/core/registry";
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

import { componente_detalle_proveedor } from "./componente_detalle_proveedor"
import { componente_detalle_racks } from "./componente_detalle_racks"
import { componente_detalle_cliente } from "./componente_detalle_cliente"
import { componente_subir_pdf } from "./componente_subir_pdf";
import { componente_rack_colores_escoger } from "./componente_rack_colores_escoger"; 

export class PantallaPedido extends Component {
    static components = { 
        componente_detalle_proveedor, 
        componente_detalle_racks, 
        componente_detalle_cliente, 
        componente_subir_pdf,
        componente_rack_colores_escoger,
    };
    setup() {
        this.action = useService("action");
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialogService = useService("dialog")
        this.state = useState({
            // Valores "Generales"
            pedidoId: 0,
            nombre: "",
            guia: "",
            guiaConfirmada: "",
            clienteId: 0,
            clienteNombre: "",
            estado: "",
            cambioRacks: false,
            
            // Listas de detalles
            detalleRacks:[],
            detalleCliente: [],
            detalleProveedor: [],
            actualizaciones: [],
            
            //bool de PDF
            forwarder: false,
            PDFBL: false,
            PDFPL: false,
            PDFInvoice: false,
            pdfContratoProveedor:false,
            pdfFacturaProveedor: false,
            PDFETA: false,
            PDFETD: false,
            pdf_prefactura: false,

            // Monedas
            totalProveedor: 0,
            totalCliente: 0,
            totalAnticiposCliente: 0,
            totalAnticiposProveedor: 0,

            balanceCliente : "",
            balancePorcentajeProveedor: "",
            balanceProveedor: "",
            balancePorcentajeCliente: "",

            numeroContrato: "",
         
            cargando: false,
            // fechas
            ETA: "",
            ETD: "",
            CRD: "",
            fecha_compromiso_proveedor_1 : "",
            fecha_compromiso_proveedor_3 : "",
            fecha_compromiso_proveedor_2 : "",
            fecha_compromiso_proveedor_4 : "",
            
            fecha_compromiso_cliente_1 : "",
            fecha_compromiso_cliente_2 : "",
            fecha_compromiso_cliente_3 : "",
            fecha_compromiso_cliente_4 : "",
            
        });
        onWillStart(async () => {
            if (this.props.action && this.props.action.params) {
                const pedidoId = this.props.action.params.pedido_id || null;
                this.state.pedidoId = pedidoId;
                await this.cargarPedido()

            }
        });
        this.searchTimeout = null;
    }
 
    async cargarPedido() {
        const pedidoId = this.state.pedidoId;
        this.state.cargando = true;
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "cargar_pedido",
                [pedidoId]
            );

            if (!resultado.success) {
                this.notification.add("No se pudo cargar el pedido", { type: "danger" });
                return;
            }

            const p = resultado.data;
            const fmt = (n) => {
                const num = Number(n) || 0;
                return num.toLocaleString('es-MX', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
            };
            const toNum = (n) => Number(n) || 0;

            this.state.guia = p.numero_guia || '';
            this.state.guiaConfirmada = p.numero_guia || '';
            this.state.estado = p.estado || '';
            this.state.clienteId = p.cliente_id || 0;
            this.state.clienteNombre = p.cliente_nombre || '';
            this.state.numeroContrato = p.numero_contrato || '';

            this.state.totalProveedor = toNum(p.total_proveedor);
            this.state.totalCliente = toNum(p.total_cliente);

            this.state.forwarder = !!p.forwarder;
            this.state.pdfContratoProveedor = !!p.bool_contrato_proveedor;
            this.state.pdfFacturaProveedor = !!p.bool_factura_proveedor;
            this.state.pdfBL = !!p.pdf_BL;
            this.state.pdfPL = !!p.pdf_PL;
            this.state.pdfInvoice = !!p.pdf_invoice;
            this.state.pdf_prefactura = !!p.pdf_prefactura;
            this.state.actualizaciones = (p.actualizaciones || []).map((a) => ({
                id: a.id,
                numero_actualizacion: a.numero_actualizacion,
                fecha: a.fecha || '',
                texto: a.texto || '',
            }));

            let totalClienteCalculado = 0;
            this.state.detalleRacks = (p.detalle_racks || []).map((d, i) => {
                const costo = toNum(d.precio);
                const cantidad = toNum(d.cantidad);
                const subtotal = costo * cantidad;
                totalClienteCalculado += subtotal;
                return {
                    id: d.id,
                    colorId: d.color_id,
                    colorHex: d.color_hex,
                    colorClave: d.color_clave,
                    numero: i + 1,
                    costo_rack_raw: costo,
                    costo_rack: fmt(costo),
                    rack_id: d.rack_id || 0,
                    rack_nombre: d.nombre || '',
                    cantidad_racks: cantidad,
                    subtotal_raw: subtotal,
                    subtotal: fmt(subtotal),
                };
            });
            this.state.totalCliente = totalClienteCalculado;

            const pagos = p.lista_pagos_cliente || [];
            let totalAnticiposCliente = 0;

            this.state.detalleCliente = pagos.map((d) => {
                const monto = toNum(d.monto);
                totalAnticiposCliente += monto;
                return {
                    crearEditar: "Editar",
                    paymentId: d.payment_id,
                    anticipoId: d.detalle_id, 
                    referencia: d.referencia || '',
                    factura: d.factura || '',
                    diario: d.diario || '',
                    moneda: d.moneda || '',
                    fechaAnticipo: d.fecha || '',
                    estado: d.estado || '',
                    monto_raw: monto,
                    monto: fmt(monto),
                    // bandera útil para colorear
                    //pagado: d.estado === 'paid',
                };
            });
            this.state.totalAnticiposCliente = totalAnticiposCliente;

            const anticiposProv = p.lista_anticipos_proveedor || [];
            let totalAnticiposProveedor = 0;

            this.state.detalleProveedor = anticiposProv.map((d) => {
                const cantidad = toNum(d.cantidad);
                const precioDolar = toNum(d.precio_dolar);
                totalAnticiposProveedor += cantidad;
                return {
                    anticipoId: d.anticipo_id,
                    numero: d.numero || 0,
                    fechaEdicion: d.fecha_editado || '',
                    fechaAnticipo: d.fecha_anticipo || '',
                    cantidadAnticipo_raw: cantidad,
                    cantidadAnticipo: fmt(cantidad),
                    precioDolar_raw: precioDolar,
                    precioDolar: fmt(precioDolar),
                    PDFAnticipo: !!d.pdf_anticipo_proveedor,
                };
            });
            this.state.totalAnticiposProveedor = totalAnticiposProveedor;

            const balanceC = this.state.totalCliente - this.state.totalAnticiposCliente;
            const balanceP = this.state.totalProveedor - this.state.totalAnticiposProveedor;

            const porC = this.state.totalCliente > 0
                ? (this.state.totalAnticiposCliente * 100) / this.state.totalCliente
                : 0;
            const porP = this.state.totalProveedor > 0
                ? (this.state.totalAnticiposProveedor * 100) / this.state.totalProveedor
                : 0;

            this.state.balanceCliente = "$ " + fmt(balanceC);
            this.state.balancePorcentajeCliente = "% " + fmt(porC);
            this.state.balanceProveedor = "$ " + fmt(balanceP);
            this.state.balancePorcentajeProveedor = "% " + fmt(porP);

            // FechasFechas Fechas  
            this.state.CRD = p.CRD || '';
            this.state.fecha_creacion = p.fecha_creacion || '';
            this.state.ETA = p.ETA || '';
            this.state.ETD = p.ETD || '';
            this.state.fecha_termino_produccion = p.fecha_termino_produccion || '';

            this.state.fecha_compromiso_proveedor_1 = p.fecha_compromiso_proveedor_1 || '';
            this.state.fecha_compromiso_proveedor_2 = p.fecha_compromiso_proveedor_2 || '';
            this.state.fecha_compromiso_proveedor_3 = p.fecha_compromiso_proveedor_3 || '';
            this.state.fecha_compromiso_proveedor_4 = p.fecha_compromiso_proveedor_4 || '';
            this.state.fecha_compromiso_cliente_1 = p.fecha_compromiso_cliente_1 || '';
            this.state.fecha_compromiso_cliente_2 = p.fecha_compromiso_cliente_2 || '';
            this.state.fecha_compromiso_cliente_3 = p.fecha_compromiso_cliente_3 || '';
            this.state.fecha_compromiso_cliente_4 = p.fecha_compromiso_cliente_4 || '';


            this.state.aviso = p.aviso || [];

        } catch (e) {
            this.notification.add("Error al cargar el pedido", { type: "danger" });
        } finally {
            this.state.cargando = false;
        }
    }

    async onClickCambiarEstado(){

        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t(this.state.guia),
            confirm: async () => {
                await this.cambiarEstado();
            },
            cancel: () => {
                return;
            },
        });
       
    }
    async onClickRegresar() {
        await this.onGuardarDetalleGeneral();
        await this.action.doAction("rastreo_paquetes.action_pantalla_principal");
    }
    async cambiarEstado(){
        const pedidoId = this.state.pedidoId;
        this.state.cargando = true;
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "cambiar_estado",
                [pedidoId]
            );
            this.state.pedido = resultado.data ?? resultado;

        }catch(e){
            this.notification.add("No hay pedido asociado",{ type: "danger" });
        } finally {
            this.state.cargando = false;
        }
    }

  
    async autoGuardado(){
        await onClickGuardar;
    }

    async onClickGuardar() {
        await this.guardarDetalleGeneral();
    }


    async onEditarDetalleRacks(r) {    
        const fila = r || {
            numero: this.state.detalleRacks.length + 1,
            rackNombre: '',
            rackId: false,
            precioUnitario: 0,
            cantidadRacks: 1,
            costoTotal: 0,
            colorId: false,
            colorHex: "#cccccc",
            colorClave: "",
        };
        fila.pedidoId = this.state.pedidoId;
        this.dialogService.add(componente_detalle_racks, {
                title: fila.numero === 0 ? _t("Nuevo Rack") : _t("Editar Rack"),
                objeto: fila,
                confirm: async (rEditado) => {
                    this.state.cambioRacks = true;
                    if(rEditado.numero == 0){
                        rEditado.numero = this.state.detalleRacks.length;
                        this.state.detalleRacks.push(rEditado);
                    }else{
                        this.state.detalleRacks[rEditado.numero - 1] = rEditado;
                    }
                    this.state.detalleRacks = [...this.state.detalleRacks];
                },
                cancel: () => {}
        });
    }

    async onEditarDetalleCliente(d) {
        if(!d){
            d = {
                crearEditar: "Crear",
                anticipoId: 0,
                numero: this.state.detalleCliente.length + 1,
                fechaEdicion: "",
                fechaAnticipo: "",
                cantidadAnticipo: 0.0,
                precioDolar: 0.0,
                PDFAnticipo: null, 
            }
        }
        d.pedidoId = this.state.pedidoId;
        this.dialogService.add(componente_detalle_cliente,  {
                title: "Confirmación",
                objeto:d,
                confirm: async () => {
                    await this.cargarPedido();
                },
                cancel: () => {
                }
        });
    }
    async onEditarColorRack(r) {
        this.dialogService.add(componente_rack_colores_escoger, {
            confirm: (colorSeleccionado) => {
                r.colorId = colorSeleccionado.id;
                r.colorHex = colorSeleccionado.color_hex;
                r.colorClave = colorSeleccionado.clave;
                
                this.state.cambioRacks = true;
                this.state.detalleRacks = [...this.state.detalleRacks];
                
                this.notification.add("Color actualizado correctamente.", { type: "success" });
            },
            cancel: () => {}
        });
    }
    async onEditarDetalleProveedor(d) {
        if(!d){
            d = {
                crearEditar: "Crear",
                anticipoId: 0,
                numero: this.state.detalleProveedor.length + 1,
                fechaEdicion: "",
                fechaAnticipo: "",
                cantidadAnticipo: 0.0,
                precioDolar: 0.0,
                PDFAnticipo: null, 
            }
        }
        d.pedidoId = this.state.pedidoId;
        this.dialogService.add(componente_detalle_proveedor,  {
                title: "Confirmación",
                objeto:d,
                confirm: async () => {
                    await this.cargarPedido();
                },
                cancel: () => {
                }
        });
    }   

    async onVerificarForwarder(ev) {
        const nuevoValor = ev.target.checked; 
        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t("¿Ya consiguió el forwarder?"),
            confirm: async () => {
                this.state.forwarder = true;
            },
            cancel: () => {
                this.state.forwarder = false;
            },
        });
        ev.target.checked = this.state.forwarder;
    }


    async onVerificarFecha(ev) {
        const campo = ev.target.dataset.field;
        const nuevoValor = ev.target.value;
        const valorAnterior = this.state[campo];

        if (!campo) {
            return;
        }

        if (!valorAnterior) {
            this.state[campo] = nuevoValor;
            return;
        }

        if (nuevoValor === valorAnterior) {
            return;
        }

        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t("¿Estás seguro de cambiar la fecha? La fecha anterior es: ") + valorAnterior,
            confirm: async () => {
                this.state[campo] = nuevoValor;
                await this.onGuardarDetalleGeneral();
            },
            cancel: () => {
                ev.target.value = valorAnterior;
            },
        });
    }

    async onCambiarCotizacion (){

        const guiaActual = this.state.guia; 

        const guiaConfirmada = this.state.guiaConfirmada;
        if (!guiaConfirmada) {
            this.state.guiaConfirmada = guiaActual;
        }
        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t("Esta acción no se podrá deshacer. ¿Deseas cambiar la cotización?"),
            confirm: async () => {
                this.state.cargando = true;
                try {
                    const resultado = await this.orm.call(
                        "rastreo.pedido",
                        "buscar_cotizacion",
                        [guiaActual] 
                    );
                    if(resultado.success){
                        const c = resultado.cotizacion_info;
                        this.state.guiaActual =  c.nombre;         
                        this.state.clienteNombre = c.cliente;
                        this.state.clienteId = c.cliente_id;
                        this.state.totalCliente = c.total;
                        this.state.fechaCreacion = c.fecha;
                        const l = resultado.data;
                        this.state.detalleRacks = l.map((d,i)=> {
                            return{
                                clave: d.codigo,
                                numero: i + 1,
                                costo_rack: d.precio, 
                                rack_id: d.rack_id,
                                rack_nombre: d.nombre,
                                cantidad_racks: d.cantidad,
                                total: d.subtotal
                            }
                        })
                        this.state.cambioRacks = true; 
                        this.notification.add("Cotización cambiada Exitosamente",{ type: "success" });               
                    }
                } catch (error) {
                    this.notification.add("Hubo un error",{ type: "danger" });
                } finally {
                    this.state.cargando = false;
                    this.state.guiaActual = guiaActual; 
                }
            },
            cancel: () => {
                console.log(this.state.guia , guiaConfirmada)
                this.state.guia = guiaConfirmada; 
                return 
            },
        });
    }
    
    async onGuardarDetalleGeneral(){
        if(!this.state.pedidoId){
            return
        }

        const datos = {
            numero_guia: this.state.guia,
            cliente_id: this.state.clienteId,
            cambio_racks: this.state.cambioRacks,

            //bool de PDF
            forwarder: this.state.forwarder,
            pdf_BL: this.state.pdf_BL,
            pdf_PL: this.state.pdf_PL,
            pdf_invoice: this.state.pdf_invoice,
            pdf_contrato_proveedor:this.state.pdfContratoProveedor,
            pdfFacturaProveedor: this.state.pdfFacturaProveedor,

            total_proveedor: this.state.totalProveedor,
            total_cliente: this.state.totalCliente,
            numero_contrato: this.state.numeroContrato,
            racks_acordados: 0,
            CRD: this.state.CRD,
            fecha_creacion : this.state.fecha_creacion,
            ETD : this.state.ETD,
            ETA : this.state.ETA,
            fecha_termino_produccion: this.state.fecha_termino_produccion,

            fecha_compromiso_proveedor_1:this.state.fecha_compromiso_proveedor_1,
            fecha_compromiso_proveedor_2:this.state.fecha_compromiso_proveedor_2,
            fecha_compromiso_proveedor_3:this.state.fecha_compromiso_proveedor_3,
            fecha_compromiso_proveedor_4:this.state.fecha_compromiso_proveedor_4, 
            fecha_compromiso_cliente_1:this.state.fecha_compromiso_cliente_1,
            fecha_compromiso_cliente_2:this.state.fecha_compromiso_cliente_2,
            fecha_compromiso_cliente_3:this.state.fecha_compromiso_cliente_3,
            fecha_compromiso_cliente_4:this.state.fecha_compromiso_cliente_4,
            
        }
        const pedido_id = this.state.pedidoId;
        const detalle_pedido = this.state.detalleRacks.map(d => ({
            ...d,
            color_id: d.colorId || false
        }));

        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "actualizar_pedido",
                [ pedido_id, 
                detalle_pedido, 
                datos] 
            );
            if(resultado.success){
                this.notification.add("Información guardada Exitosamente",{ type: "success" });  

            }
            await this.cargarPedido()
        } catch (error) {
            this.notification.add("Hubo un error",{ type: "danger" });      
        } finally {
            this.state.cargando = false;
        }        
    }
    async verPDF(documentoNombre){
        if(!documentoNombre){
            return;
        }
        const objeto = {
            pedidoId:       this.state.pedidoId,
            documentoNombre:documentoNombre
        }
        this.dialogService.add(componente_subir_pdf,  {
            title: "Confirmación",
            objeto: objeto,
            confirm: async (documento) => {
                if(documento.editado){
                    // documento.documentoNombre <- tiene el nombre del documento
                    this.state.pdf_invoice = false;
                    this.state.pdf_BL = false
                }
            },
            cancel: () => {
            }
        });
    }
    
}

PantallaPedido.template = "rastreo_paquetes.pantalla_pedido";
registry.category("actions").add("rastreo_paquetes.pantalla_pedido", PantallaPedido);