/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks";

export class componente_cargar_cotizacion extends Component {
    static template = "rastreo_paquetes.componente_cargar_cotizacion_embed";
    static components = { Dialog };
    static props = {
        close: Function,
        title: { type: String, optional: true },
        confirm: { type: Function, optional: true },
        cancel: { type: Function, optional: true },
    };

    setup() {
        this.notification = useService("notification");
        this.action = useService("action");
        this.dialogService = useService("dialog");
        this.orm = useService("orm");
        this.state = useState({
            id: 0,
            nombre: "",
            cliente: "",
            clienteId: 0,
            total: 0.0,
            fecha: "",
            termino_busqueda: "",
            detalle: [],
            estado: "",
            cargando: false,
            index: 0,
            estados:[
                ["-- Selecciona un Estado inicial --", ""],
                ["Fase Inicial","fase_inicial"],
                ["A Producción","produccion"]
            ]
        })
    }


    async onCargarCotizacion() {

        if (!this.state.termino_busqueda) {
            this.notification.add("Necesita colocar un numero", { type: "danger" });
            return
        }
        this.state.cargando = true;
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "buscar_cotizacion",
                [
                    this.state.termino_busqueda
                ]
            );
            if (resultado.success) {
                const c = resultado.cotizacion_info;
                this.state.id = c.id;
                this.state.nombre = c.nombre;
                this.state.cliente = c.cliente;
                this.state.clienteId = c.cliente_id;
                this.state.total = c.total;
                this.state.fecha = c.fecha;
                this.state.detalle = resultado.data;
                this.state.cambioRacks = true;
            }
        } catch (error) {
            this.notification.add("Hubo un error" + (error), { type: "danger" });
        } finally {
            this.state.cargando = false;
        }

    }

    onBuscarInput(ev) {
        this.state.termino_busqueda = ev.target.value;
    }

    async onBuscar(ev) {
        ev.preventDefault();
        await this.onCargarCotizacion();
    }

    onKeyDown(ev) {
        if (ev.key === "Enter") {
            ev.preventDefault();
            this.onBuscar(ev);
        }
    }



    _onConfirm() {
        const idx = Number(this.state.index);
        if (this.state.id === 0) {
            console.log("Falla id", this.state.id )
            return;
        }
        if (idx === 0) {
            console.log("Falla idx", idx )
            return;
        }
        const e = this.state.estados[idx]
        if (this.props.confirm) {
            this.props.confirm(
                this.state.nombre,
                e[1]
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
