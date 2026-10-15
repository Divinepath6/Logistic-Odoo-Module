/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 
import {componente_busqueda_producto} from "./componente_busqueda_producto"

export class componente_detalle_racks extends Component{
    static template = "rastreo_paquetes.componente_detalle_racks_embed";
    static components = { Dialog, componente_busqueda_producto }; 
    static props = {
        // Props que recibe del diálogo
        fila: { type: Object, optional: true },
        confirm: { type: Function, optional: true },
        cancel: { type: Function, optional: true },
        close: { type: Function, optional: true },
        title: { type: String, optional: true },
    };
    setup() {
        this.action = useService("action");
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialogService = useService("dialog")
        this.state = useState({
            numero: 0,
            rackClave: "",
            rackNombre: "",
            rackId: 0,
            precioUnitario: 0.0,
            cantidadRacks: 0,
            costoTotal: 0.0,

            productoId: 0,
            productoNombre: "",
            productoPrecio: 0,

        })
        
        onWillStart(async () => {
            const r = this.props.objeto;
            console.log("componente: ",r)
            if (r) {
                this.state.numero = r.numero;
                this.state.rackClave = r.clave || '';
                this.state.rackNombre = r.rack_nombre || '';
                this.state.rackId = r.rack_id || false;
                this.state.precioUnitario = r.costo_rack || 0;
                this.state.cantidadRacks = r.cantidad_racks || 1;
                this.state.costoTotal = (
                    (r.cantidad_racks || 1) * (r.costo_rack || 0)
                ).toFixed(2);
            }
        });
    }

    async onBuscarProducto(ev) {
        this.dialogService.add(componente_busqueda_producto, {
            title: "Buscar producto",
            confirm: (id, nombre, precio) => {
                this.state.productoId = id;
                this.state.productoNombre = nombre;
                this.state.productoPrecio = precio;
            },
            cancel: () => {
            },
        });
    }
       

    onCambiarCantidad(ev) {
        this.state.cantidadRacks = parseFloat(ev.target.value) || 0;
        this.state.costoTotal = (
            this.state.cantidadRacks * this.state.precioUnitario
        ).toFixed(2);
    }

    async cargarRack(){
        
    }
    async onGuardar(){

    }
    async onCancelarEdicion(){

    }
    
    async onConfirmar() {
        if(!this.state.productoId){
            this.notification.add("Busca un Rack para guardar", { type: "warning" });
            return;
        }
        const rack = {
            numero: this.state.numero,
            clave: this.state.rackClave,
            rack_nombre: this.state.rackNombre,
            rack_id: this.state.rackId,
            costo_rack: this.state.precioUnitario,
            cantidad_racks: this.state.cantidadRacks,
            costo_total: parseFloat(this.state.costoTotal),
        };
        this.props.confirm(rack);
        this.props.close();
    }
    onCancel() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}
