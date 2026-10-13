/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 

export class componente_creacion_pedido extends Component {
        static template = "rastreo_paquetes.componente_creacion_pedido_embed";
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
            clienteSeleccionadoId: 0,
            termino_busqueda: "",
            clienteSeleccionadoNombre: "",
            clientes: [],
            cargando: false,
        })
        onWillStart(async () => {
            if (this.props.action && this.props.action.params) {
                this.listarClientes();
            }
            
        });
    }
     async listarClientes() {
        try {
            this.state.cargando = true;
            const resultado = await this.orm.call(
                "rastreo.cliente",
                "listar_clientes",
                [this.state.termino_busqueda]
            );
            this.state.clientes = resultado
        } catch (e) {
            this.state.clientes = [];
        } finally {
            this.state.cargando = false;
        }
    }

    onBuscarInput(ev) {
        this.state.termino_busqueda = ev.target.value;
    }

    async onBuscar(ev) {
        ev.preventDefault();
        await this.listarClientes();
    }
    
    onKeyDown(ev) {
        if (ev.key === "Enter") {
            ev.preventDefault();
            this.onBuscar(ev);
        }
    }

    onSeleccionarCliente(cliente) {
        this.state.clienteSeleccionadoId = cliente.id;
        this.state.clienteSeleccionadoNombre = cliente.name;
    }

    _onConfirm() {
        if (this.state.clienteSeleccionadoId === 0) {
            return;
        }
        if (this.props.confirm) {
            this.props.confirm(this.state.clienteSeleccionadoId);
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

