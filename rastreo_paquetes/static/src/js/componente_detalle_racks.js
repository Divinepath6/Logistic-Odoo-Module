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
            rackClave: "Sin Rack existente",
            rackNombre: "",
            rackId: 0,
            precioUnitario: 0.0,
            cantidadRacks: 0,
            costoTotal: 0.0,

            productoId: 0,
            productoNombre: "",
            productoPrecio: 0,
            rackExiste: false,
            rackPrecio: 0,
            almacenaje: 0,
            almacenajeTotal: 0,
        })
        
        onWillStart(async () => {
            const r = this.props.objeto;
            if (r) {
                if(r.id != 0){
                    this.state.rackExiste = true
                }
                this.state.numero = r.numero;
                this.state.rackClave = r.rackClave || '';
                this.state.rackNombre = r.rackNombre || '';
                this.state.rackId = r.rackId || false;
                this.state.almacenaje = r.almacenaje || 0;
                this.state.precioUnitario = r.precioUnitario || 0;
                this.state.cantidadRacks = r.cantidadRacks || 1;
                this.onCambiarCantidad();
            }
        });
    }

    async onBuscarProducto(ev) {
        this.dialogService.add(componente_busqueda_producto, {
            title: "Buscar producto",
            confirm: (id, nombre, precio, rackExiste, rackId, rackClave, rackPrecio,rackNombre,rackAlmacenaje) => {
                if(rackExiste){
                    this.state.productoId = id;
                    this.state.productoNombre = nombre;
                    this.state.precioUnitario = precio;
                    this.state.rackExiste = rackExiste;
                    this.state.rackId =  rackId;
                    this.state.rackNombre = rackNombre;
                    
                    this.state.rackClave = rackClave;
                    this.state.precioUnitario =  rackPrecio;
                    this.state.almacenaje = rackAlmacenaje;
                    this.onCambiarCantidad();
                }else{
                    this.notification.add("Este rack no esta registrado en el sistema", { type: "warning" });
                }
            },
            cancel: () => {
            },
        });
    }
       

    onCambiarCantidad() {
        this.state.costoTotal = (
            this.state.cantidadRacks * this.state.precioUnitario 
        )
        this.state.costoTotalDisplay = this.state.costoTotal.toFixed(2);
        this.state.almacenajeTotal = (
            this.state.almacenaje * this.state.cantidadRacks
        )
        this.state.almacenajeTotalDisplay = this.state.almacenajeTotal.toFixed(3);
    }

    
    async onConfirmar() {
        if(!this.state.productoId || !this.state.rackExiste){
            this.notification.add("Busca un Rack para guardar", { type: "warning" });
            return;
        }
        if(this.state.cantidadRacks <0 || this.state.precioUnitario <0){
            this.notification.add("Las cantidades no deben ser negativas", { type: "warning" });
            return;
        }  
        const rack = {
            numero: this.state.numero,
            rackClave: this.state.rackClave,
            rackNombre: this.state.rackNombre,
            rackId: this.state.rackId,
            productoId: this.state.productoId,
            precioUnitario: this.state.precioUnitario,
            cantidadRacks: this.state.cantidadRacks,
            costoTotal: this.state.costoTotal,
            almacenaje: this.state.almacenaje,
            almacenajeTotal: this.state.almacenajeTotal,
            almacenajeTotalDisplay: this.state.almacenajeTotalDisplay,
            costoTotalDisplay : this.state.costoTotalDisplay,
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
