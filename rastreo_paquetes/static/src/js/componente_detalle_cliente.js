/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 


export class componente_detalle_cliente extends Component{
    static template = "rastreo_paquetes.componente_detalle_cliente_embed";
    static components = { Dialog }; 
    setup(){
        this.state = useState({
            fechaEdicion: "",
            fechaAnticipo: "",
            cantidadAnticipo: 0.0,
            precioDolar: 0.0,
            numeroAnticipo: 0,
            PDFAnticipo: null,
        })
    }
    async cargarAnticipo(){
        
    }
    async guardarPDF(){

    }
    async onConfirmar() {
        await guardarPDF();
        const anticipo = {
            fechaEdicion: this.state.fechaEdicion,
            fechaAnticipo: this.state.fechaAnticipo,
            cantidadAnticipo: this.state.cantidadAnticipo,
            precioDolar: this.state.precioDolar,
            numeroAnticipo: this.state.numeroAnticipo,
            PDFAnticipo: true,
        };

        this.props.confirm(anticipo);
        this.props.close();
    }
    onCancel() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}
