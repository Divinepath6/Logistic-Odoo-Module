/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 
import { PdfUploader } from "./Pdf_uploader";

export class componente_subir_pdf extends Component {
    static template = "rastreo_paquetes.componente_subir_pdf_embed";
    static components = { Dialog ,PdfUploader}; 
    setup(){
        this.notification = useService("notification");
        this.action = useService("action");
        this.orm = useService("orm");
        this.dialogService = useService("dialog");
        this.state = useState({
            
            pedidoId:0,
           
            PDF: "",   // base64
            PDFNombre: "",
            documentoNombre: "", //saber que tipo de documento es
        })
         onWillStart(async () => {
            const r = this.props.objeto;
            if (r) {
                this.state.pedidoId = r.pedidoId;
                this.state.documentoNombre = r.documentoNombre;
                await this.obtenerPDF();
            }
        });
    }
onPdfChange(base64, filename) {
        this.state.PDFAnticipo = base64;
        this.state.PDFAnticipoNombre = filename;
    }
    async obtenerPDF(){
        if(!this.state.anticipoId || this.state.anticipoId === 0){
            return;
        }
        try{
            const resultado = await this.orm.call(
                "rastreo.detalle_cliente",
                "obtener_pdf",
                [
                    this.state.anticipoId
                ]
            );
            if (resultado.success){
                this.state.PDFAnticipo = resultado.pdf || "";
                this.state.PDFAnticipoNombre = resultado.filename || "";
            }
            else{
              this.notification.add("Hubo un error "  + (resultado.error || "desconocido"),{ type: "danger" });          
            }
        }catch(e){
            this.notification.add("Hubo un error desconocido" + (e.error),{ type: "danger" });  
        }
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
                [this.state.pedidoId, this.state.anticipoId, {
                    cantidad: this.state.cantidadAnticipo,
                    precio_dolar: this.state.precioDolar,
                    fecha_anticipo: this.state.fechaAnticipo,
                }, this.state.PDFAnticipo || false, this.state.PDFAnticipoNombre || false]
            );
            if (resultado.success){
                this.notification.add("Hubo un error "  + (resultado.error || "desconocido"),{ type: "danger" });   
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