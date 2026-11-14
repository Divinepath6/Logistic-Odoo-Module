/** @odoo-module **/
import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";

export class componente_confimacion_dolar extends Component {
    static template = "rastreo_paquetes.componente_confimacion_dolar_embed";
    static components = { Dialog };
    static props = {
        close: Function,
        confirm: Function,
    };

    setup() {
        this.state = useState({
            costoDolar: 1.00,
        });
    }

    onConfirm() {
        if (this.state.costoDolar <= 0) {
            return;
        }
        this.props.confirm(this.state.costoDolar);
        this.props.close();
    }
}