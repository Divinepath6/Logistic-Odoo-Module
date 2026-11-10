/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks";

export class componente_rack_colores_escoger extends Component {
    static template = "rastreo_paquetes.componente_rack_colores_escoger_embed";
    static components = { Dialog };

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");

        this.state = useState({
            colores: [],
            cargando: true,
            busqueda: ""
        });

        onWillStart(async () => {
            await this.cargarColores();
        });
    }

    async cargarColores() {
        this.state.cargando = true;
        try {
            const resultados = await this.orm.call(
                "rastreo.rack_color",
                "listar_colores",
                [],
                { busqueda: this.state.busqueda }
            );
            this.state.colores = resultados;
        } catch (error) {
            this.notification.add("Error al buscar los colores.", { type: "danger" });
        } finally {
            this.state.cargando = false;
        }
    }

    onInputBusqueda(ev) {
        this.state.busqueda = ev.target.value;
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        this.searchTimeout = setTimeout(async () => {
            await this.cargarColores();
        }, 300);
    }

    seleccionarColor(color) {
        if (this.props.confirm) {
            this.props.confirm(color);
        }
        if (this.props.close) {
            this.props.close();
        }
    }
}