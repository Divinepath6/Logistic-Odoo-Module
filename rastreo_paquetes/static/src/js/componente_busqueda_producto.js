/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 

export class componente_busqueda_producto extends Component {
    static template = "rastreo_paquetes.componente_busqueda_producto_embed";
    static components = { Dialog };
    static props = {
        close: Function,
        title: { type: String, optional: true },
        confirm: { type: Function, optional: true },
        cancel: { type: Function, optional: true },
    };
    setup() {
        this.orm = useService("orm");
        this.state = useState({
            productoSeleccionadoId: 0,
            termino_busqueda: "",
            productoSeleccionadoNombre: "",
            productoSeleccionadoPrecio: "$0.00",
            
            rackExiste: false,
            rackId:  0,
            rackClave: "",
            rackPrecio: 0,
            rackNombre: "",
            rackAlmacenaje: 0,
            productos: [],
            cargando: false,
        })
        onWillStart(async () => {
            this.listarProductos();
        });
    }
    
     async listarProductos() {
        try {
            this.state.cargando = true;
            const resultado = await this.orm.call(
                "rastreo.rack_detalle",
                "listar_productos",
                [this.state.termino_busqueda]
            );
            if(resultado.success){
                this.state.productos = resultado.data
            }else{
                this.state.productos = []
            }
        } catch (e) {
            console.error("Error al listar productos:", e);
            this.state.productos = [];
        } finally {
            this.state.cargando = false;
        }
    }

    onBuscarInput(ev) {
        this.state.termino_busqueda = ev.target.value;
    }

    async onBuscar(ev) {
        ev.preventDefault();
        await this.listarProductos();
    }
    
    onKeyDown(ev) {
        if (ev.key === "Enter") {
            ev.preventDefault();
            this.onBuscar(ev);
        }
    }

    onSeleccionarProducto(p) {
        this.state.productoSeleccionadoId = p.id;
        this.state.productoSeleccionadoNombre = p.nombre;
        this.state.productoSeleccionadoPrecio = p.precio;
        if(p.rack_existe){
            this.state.rackExiste = p.rack_existe;
            this.state.rackId =  p.rack_id;
            this.state.rackClave = p.rack_clave;
            this.state.rackPrecio = p.rack_precio;
            this.state.rackNombre = p.rack_nombre;
            this.state.rackAlmacenaje = (p.rack_almacenaje/1000).toFixed(3);
        }
    }

    _onConfirm() {
        if (this.state.productoSeleccionadoId === 0) {
            return;
        }
        if (this.props.confirm) {
            this.props.confirm(
                this.state.productoSeleccionadoId,
                this.state.productoSeleccionadoNombre,
                this.state.productoSeleccionadoPrecio,
                this.state.rackExiste,
                this.state.rackId,
                this.state.rackClave,
                this.state.rackPrecio,
                this.state.rackNombre,
                this.state.rackAlmacenaje,
            );
        }
        this.props.close();
    }

    _onCancel() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}

