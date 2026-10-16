/** @odoo-module **/
import { registry } from "@web/core/registry";
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

import { componente_detalle_proveedor } from "./componente_detalle_proveedor"
import { componente_detalle_racks } from "./componente_detalle_racks"
import { componente_detalle_cliente } from "./componente_detalle_cliente"

export class PantallaPedido extends Component {
    static components = { componente_detalle_proveedor , componente_detalle_racks, componente_detalle_cliente };
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
            pdf_BL: false,
            pdf_PL: false,
            pdf_invoice: false,
            pdfContratoProveedor:false,
            pdfFacturaProveedor: false,

            // Monedas
            totalProveedor: 0,
            totalCliente: 0,
            totalAnticiposCliente: 0,
            totalAnticiposProveedor: 0,
        
            numeroContrato: "",
         
            cargando: false,

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
 
    async cargarPedido(){
        const pedidoId = this.state.pedidoId;
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "cargar_pedido",
                [pedidoId]
            );
            if(resultado.success){
                const p = resultado.data;
                this.state.guia = p.numero_guia;
                this.state.guiaConfirmada = p.numero_guia;
                this.state.estado = p.estado;
                this.state.clienteId = p.cliente_id;
                this.state.clienteNombre = p.cliente_nombre;
                this.state.totalCliente = Number(p.total_cliente) || 0;
                this.state.totalProveedor = Number(p.total_proveedor) || 0;
                this.state.numeroContrato = p.numero_contrato;
                //bool
                this.state.forwarder = p.forwarder;
                this.state.pdfContratoProveedor = p.bool_contrato_proveedor;
                this.state.pdfFacturaProveedor = p.bool_factura_proveedor;
                this.state.numeroContrato = p.numero_contrato;
                //listas
                let totalCliente = 0;
                this.state.actualizaciones = p.actualizaciones;
                this.state.detalleRacks = p.detalle_racks.map((d,i)=> {
                           const costo = Number(d.costo_rack) || 0;
                            const cantidad = Number(d.cantidad_racks) || 0;
                            const subtotal = costo * cantidad;
                            totalCliente += subtotal;
                            return {
                                clave: d.clave,
                                numero: d.numero,
                                costo_rack: costo.toFixed(2),
                                rack_id: d.rack_id,
                                rack_nombre: d.rack_nombre,
                                cantidad_racks: cantidad,
                                subtotal: subtotal.toFixed(2),
                            };
                })
                this.state.totalCliente = totalCliente.toFixed(2);
                let totalAnticiposCliente = 0;
                if(p.lista_anticipos_cliente != null || p.lista_anticipos_cliente != undefined){
                    this.state.detalleCliente = p.lista_anticipos_cliente.map((d,i)=> {
                        const cantidad = Number(d.cantidad) || 0;
                        const precioDolar = Number(d.precio_dolar) || 0;
                        totalAnticiposCliente += cantidad; 
                        return {
                            anticipoId: d.anticipo_id,
                            numero: d.numero,
                            fechaEdicion: d.fecha_editado,
                            fechaAnticipo: d.fecha_anticipo,
                            cantidadAnticipo: cantidad.toFixed(2),
                            precioDolar: precioDolar.toFixed(2),
                            PDFAnticipo: d.pdf_anticipo_cliente,
                        };
                })
                }else{
                    this.state.detalleCliente = []
                }
                this.state.totalAnticiposCliente =  (totalAnticiposCliente).toFixed(2); 
                let totalAnticiposProveedor = 0;
                if(p.lista_anticipos_proveedor != null || p.lista_anticipos_proveedor != undefined){
                    this.state.detalleProveedor = p.lista_anticipos_proveedor.map((d,i)=> {
                        const cantidad = Number(d.cantidad) || 0;
                        const precioDolar = Number(d.precio_dolar) || 0;
                        totalAnticiposProveedor += cantidad;
                        return {
                            anticipoId: d.anticipo_id,
                            numero: d.numero,
                            fechaEdicion: d.fecha_editado,
                            fechaAnticipo: d.fecha_anticipo,
                            cantidadAnticipo: cantidad.toFixed(2),
                            precioDolar: precioDolar.toFixed(2),
                            PDFAnticipo: d.pdf_anticipo_proveedor,
                        };
                    })
                }else{
                    this.state.detalleProveedor = [];
                }
                this.state.totalAnticiposProveedor =   (totalAnticiposProveedor).toFixed(2); 
            }else{
                console.log(resultado);
            }
        } finally {
            this.state.cargando = false;
        }
    }

    async onClickCambiarEstado(){
        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t(this.state.guia),
            confirm: async () => {
                //await this.cambiarEstado();
            },
            cancel: () => {
                return;
            },
        });
       
    }
    async onClickRegresar() {
        this.guardarDetalleGeneral();
        await this.action.doAction("rastreo_paquetes.action_pantalla_principal");
    }
    async cambiarEstado(){
        const pedidoId = this.state.pedido.id
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

    onCalcular(){
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        this.searchTimeout = setTimeout(() => {
            this.calcularRacks();
        }, 500);
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
            clave: '',
            rack_nombre: '',
            rack_id: false,
            costo_rack: 0,
            cantidad_racks: 1,
        };
        fila.pedidoId = this.state.pedidoId;
        this.dialogService.add(componente_detalle_racks,  {
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
                cancel: () => {
                }
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
                confirm: async (editado) => {
                    if(editado.numero >= this.state.detalleCliente.length){
                        this.state.detalleCliente.push(editado);
                    }else{
                        this.state.detalleCliente[editado.numero - 1] = editado;
                    }
                    this.state.detalleCliente = [...this.state.detalleCliente];
                },
                cancel: () => {
                }
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
                confirm: async (editado) => {
                    if(editado.numero >= this.state.detalleCliente.length){
                        this.state.detalleProveedor.push(editado);
                    }else{
                        this.state.detalleProveedor[editado.numero - 1] = d;
                    }
                    this.state.detalleProveedor = [...this.state.detalleProveedor];
                },
                cancel: () => {
                }
        });
    }   

    async onVerificarForwarder(p){
         this.dialogService.add(ConfirmationDialog, {
            title: ("¿Estás seguro?"),
            body: ("¿Ya consiguio el forwarder?"),
            confirm: async () => {
                forwarder = true;
            },
            cancel: () => {
                forwarder = false;
                return;
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
                                numero: d.codigo,
                                costo_rack: d.precio, 
                                rack_id: d.id,
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
        if(!this.state.guia){
            return
        }
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
        }
        const pedido_id = this.state.pedidoId;
        const detalle_pedido = this.state.detalleRacks;
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "actualizar_pedido",
                [ pedido_id, 
                detalle_pedido, 
                datos] 
            );
            console.log(resultado)
            this.notification.add("Información guardada Exitosamente",{ type: "success" });  
        } catch (error) {
            this.notification.add("Hubo un error",{ type: "danger" });       
        } finally {
            this.state.cargando = false;
        }        
    }
    async onguardarPDF(){

    }

    // Descargar PDF ¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿
    async onDescargarPDF() {
        
    }
    
}

PantallaPedido.template = "rastreo_paquetes.pantalla_pedido";
registry.category("actions").add("rastreo_paquetes.pantalla_pedido", PantallaPedido);