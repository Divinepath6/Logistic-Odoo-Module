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
            PDF: "",   // base64 del archivo
            PDFNombre: "", //nombre del archivooo
            documentoNombre: "", //saber que tipo de documento es
        })
         onWillStart(async () => {
            const d = this.props.objeto;
            if (d) {
                this.state.pedidoId = d.pedidoId;
                this.state.documentoNombre = d.documentoNombre;
                await this.obtenerPDF();
            }else{
                this.notification.add("Hubo un error desconocido",{ type: "danger" });  
                this.props.close();  
            }
        });
    }
        onDescargarPDF() {
        if (!this.state.PDF) {
            this.notification.add("No hay PDF para descargar", { type: "warning" });
            return;
        }
        try {
            let base64 = this.state.PDF;
            if (base64.startsWith("data:")) {
                base64 = base64.split(",")[1];
            }
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = this.state.PDFNombre || "documento.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            this.notification.add("Error al descargar: " + e.message, { type: "danger" });
        }
    }

    onPdfChange(base64, filename) {
        this.state.PDF = base64;
        this.state.PDFNombre = filename;
    }

    async obtenerPDF(){
        if(!this.state.pedidoId || this.state.pedidoId === 0){
            return;
        }
        try{
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "obtener_pdf",
                [
                    this.state.pedidoId,
                    this.state.documentoNombre
                ]
            );
            console.log(resultado)   
            if (resultado.success){
                this.state.PDF = resultado.pdf || "";
                this.state.PDFNombre = resultado.filename || "";
            }
        }catch(e){
            this.notification.add("Hubo un error " + (e.error),{ type: "danger" });  
        }
    }


    async onConfirmar() {
         console.log("onConfirmar state:", this.state);
        if (!this.state.pedidoId) {
            this.notification.add("No hay pedido asociado ",{ type: "danger" });
            return;
        }
        if (!this.state.PDF) {
            this.notification.add("Necesita subir documento ",{ type: "danger" });
            return;
        }

        try{
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "guardar_pdf",
                [   
                    this.state.documentoNombre,
                    this.state.PDF,
                    this.state.pedidoId, 
                    this.state.PDFNombre,
                ]
            );
            if (resultado.success){
                this.notification.add("Archivo guardado exitosamente ",{ type: "success" });   
                this.props.close();
            }
            else{
              this.notification.add("Hubo un error "  + (resultado.error || "desconocido"),{ type: "danger" });          
            }
        }catch(e){
            this.notification.add("Hubo un error " + (e.error),{ type: "danger" });   
            return;
        }
    }
    onCancelar() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}