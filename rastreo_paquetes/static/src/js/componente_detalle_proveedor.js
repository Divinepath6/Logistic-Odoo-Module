/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 


export class componente_detalle_proveedor extends Component{
    static template = "rastreo_paquetes.componente_detalle_proveedor_embed";
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
        await this.guardarPDF();
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
    onCancelar() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}
