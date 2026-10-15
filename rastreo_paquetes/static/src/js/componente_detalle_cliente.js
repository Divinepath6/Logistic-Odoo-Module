/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 
import { PdfUploader } from "./Pdf_uploader";

export class componente_detalle_cliente extends Component{
    static template = "rastreo_paquetes.componente_detalle_cliente_embed";
    static components = { Dialog ,PdfUploader}; 
    setup(){
        this.notification = useService("notification");
        this.action = useService("action");
        this.orm = useService("orm");
        this.dialogService = useService("dialog");
        this.state = useState({
            pedidoId:0,
            anticipoId:0,
            numero: 0,
            fechaEdicion: "",
            fechaAnticipo: "",
            cantidadAnticipo: 0.0,
            precioDolar: 0.0,
            PDFAnticipo: "",   // base64
            PDFAnticipoNombre: "",
        })
         onWillStart(async () => {
            const r = this.props.objeto;
            if (r) {
                this.state.anticipoId = r.anticipoId;
                this.state.pedidoId = r.pedidoId;
                this.state.numero = r.numero;
                this.state.fechaEdicion = r.fechaEdicion;
                this.state.fechaAnticipo= r.fechaAnticipo;
                this.state.cantidadAnticipo = r.cantidadAnticipo;
                this.state.precioDolar= r.precioDolar;
                this.state.PDFAnticipo= r.PDFAnticipo;
            }
        });
    }

    onPdfChange(base64, filename) {
        this.state.PDFAnticipo = base64;
        this.state.PDFAnticipoNombre = filename;
    }
    async obtenerPDF(){

    }
    async onConfirmar() {
         console.log("onConfirmar state:", this.state);
        if (!this.state.pedidoId) {
            this.notification.add("No hay pedido asociado",{ type: "danger" });
            return;
        }
        if (!this.state.cantidadAnticipo) {
            this.notification.add("Necesita indicar una cantidad recibida",{ type: "danger" });
            return;
        }
        if (!this.state.precioDolar) {
            this.notification.add("Necesita indicar el precio de Dolar",{ type: "danger" });
            return;
        }
        if (!this.state.PDFAnticipo) {
            this.notification.add("Necesita subir PDF",{ type: "danger" });
            return;
        }
        try{
            const resultado = await this.orm.call(
                "rastreo.detalle_cliente",
                "guardar_detalle",
                [this.state.pedidoId, {
                    cantidad: this.state.cantidadAnticipo,
                    precio_dolar: this.state.precioDolar,
                    fecha_anticipo: this.state.fechaAnticipo,
                }, this.state.PDFAnticipo || false, this.state.PDFAnticipoNombre || false]
            );
            if (resultado.success){
                this.props.confirm({
                    cantidadAnticipo: this.state.cantidadAnticipo,
                    precioDolar: this.state.precioDolar,
                    fechaAnticipo: this.state.fechaAnticipo,
                    PDFAnticipo: true,
                });
                this.props.close();
            }
            else{
              this.notification.add("Hubo un error "  + (resultado.error || "desconocido"),{ type: "danger" });          
            }
        }catch(e){
            console.error(e);
            return;
        }
    }
    onCancel() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}
