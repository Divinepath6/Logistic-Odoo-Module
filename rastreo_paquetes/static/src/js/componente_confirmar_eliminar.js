/** @odoo-module **/
import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";

export class componente_confirmar_eliminar extends Component {
    static template = "rastreo_paquetes.componente_confirmar_eliminar";
    static components = { Dialog };
    static props = {
        close: Function,
        confirm: Function,
        numeroContrato: { type: String, optional: true },
        guia: { type: String, optional: true },
    };

    setup() {
        this.state = useState({
            inputContrato: "",
            eliminando: false,
        });
    }

    get codigoEsperado() {
        return (this.props.numeroContrato || this.props.guia || "").trim();
    }

    get tipoIdentificador() {
        return this.props.numeroContrato ? "número de contrato" : "número de guía";
    }

    get esValido() {
        return (
            this.codigoEsperado.length > 0 &&
            this.state.inputContrato.trim() === this.codigoEsperado
        );
    }

    onKeydown(ev) {
        if (ev.key === "Enter" && this.esValido) {
            ev.preventDefault();
            this.onConfirmar();
        }
    }

    async onConfirmar() {
        if (!this.esValido || this.state.eliminando) {
            return;
        }
        this.state.eliminando = true;
        try {
            await this.props.confirm();
            this.props.close();
        } finally {
            this.state.eliminando = false;
        }
    }
}