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
            totalProveedor: 0.0,
            totalCliente: 0.0,
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
                console.log(resultado.data);
                const p = resultado.data;
                this.state.guia = p.numero_guia;
                this.state.guiaConfirmada = p.numero_guia;
                this.state.estado = p.estado;
                this.state.clienteId = p.cliente_id;
                this.state.clienteNombre = p.cliente_nombre;
                this.state.totalCliente = p.total_cliente;
                this.state.totalProveedor = p.total_proveedor;
                this.state.numeroContrato = p.numero_contrato;
                //bool
                this.state.forwarder = p.forwarder;
                this.state.pdfContratoProveedor = p.bool_contrato_proveedor;
                this.state.pdfFacturaProveedor = p.bool_factura_proveedor;
                this.state.numeroContrato = p.numero_contrato;
                //listas
                this.state.actualizaciones = p.actualizaciones;
                this.state.detalleRacks = p.detalle_racks.map((d,i)=> {
                    this.state.totalCliente = (this.state.totalCliente + (d.costo_rack * d.cantidad_racks)).toFixed(2);
                    return{
                        clave: d.clave,
                        numero: d.numero,
                        costo_rack: d.costo_rack, 
                        rack_id: d.rack_id,
                        rack_nombre: d.rack_nombre,
                        cantidad_racks: d.cantidad_racks,
                        total: (d.costo_rack * d.cantidad_racks).toFixed(2)
                    }
                })
                this.state.detalleCliente= p.detalle_cliente || [];
                this.state.detalleProveedor= p.detalle_proveedor || [];
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
        numero: 0,
        clave: '',
        rack_nombre: '',
        rack_id: false,
        costo_rack: 0,
        cantidad_racks: 1,
    };
    console.log("PantallaPedido: ",fila)

        this.dialogService.add(componente_detalle_racks,  {
                title: fila.numero === 0 ? _t("Nuevo Rack") : _t("Editar Rack"),
                objeto: fila,
                confirm: async (rEditado) => {
                    if(rEditado.numero == 0){
                        rEditado = this.state.detalleRacks.length;
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
        this.dialogService.add(componente_detalle_cliente,  {
                title: "Confirmación",
                objeto:d,
                confirm: async (editado) => {
                    if(editado.numero == 0){
                        editado.numero = this.state.detalleCliente.length;
                        this.state.detalleCliente.push(editado);
                    }else{
                        this.state.detalleCliente[editado.numero - 1] = d;
                    }
                    this.state.detalleCliente = [...this.state.detalleCliente];
                },
                cancel: () => {
                }
        });
    }
    async onEditarDetalleProveedor(d) {
        this.dialogService.add(componente_detalle_proveedor,  {
                title: "Confirmación",
                objeto:d,
                confirm: async (editado) => {
                    if(editado.numero == 0){
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
        console.log(this.state.guia)
        const guiaActual = this.state.guia; 
        console.log(guiaActual)

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
                    console.log(resultado)

                } catch (error) {
                    console.error("Error al buscar cotización:", error);
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
    async guardarDetalleGeneral(){

    }
    async guardarPDF(){

    }

    // Descargar PDF ¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿
    async onClickDescargarPDF() {
        
    }


  
}

PantallaPedido.template = "rastreo_paquetes.pantalla_pedido";
registry.category("actions").add("rastreo_paquetes.pantalla_pedido", PantallaPedido);