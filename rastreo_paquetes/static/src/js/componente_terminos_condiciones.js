/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 
import { PdfUploader } from "./Pdf_uploader";

export class componente_terminos_condiciones extends Component {
    static template = "rastreo_paquetes.componente_terminos_condiciones_embed";
    static components = { Dialog, PdfUploader }; 

    setup(){
        this.notification = useService("notification");
        this.action = useService("action");
        this.orm = useService("orm");
        this.dialogService = useService("dialog");
        
        this.state = useState({
            pedidoId: 0,
            PDF: "",   
            PDFNombre: "", 
            documentoNombre: "", 
            terminos: [], // Estructura: [{nombre: "", porcentaje: 0, cantidad: 0}]
            totalProveedor: 0.0,
            nuevo: true,
            editado: false,
        });

        onWillStart(async () => {
            const d = this.props.objeto;
            if (d) {
                this.state.pedidoId = d.pedidoId || 0;
                this.state.documentoNombre = d.documentoNombre || "";
                this.state.totalProveedor = d.totalProveedor || 0.0;
                this.state.terminos = d.terminos ? JSON.parse(JSON.stringify(d.terminos)) : [];
                
                if (d.pdfContratoProveedor) {
                    this.state.nuevo = false;
                    await this.obtenerPDF();
                } else {
                    this.state.nuevo = true;
                }
            } else {
                this.notification.add("Hubo un error desconocido", { type: "danger" });  
                this.props.close();  
            }
        });
    }
    
    get sumaPorcentajes() {
        return this.state.terminos.reduce((acc, t) => acc + (Number(t.porcentaje) || 0), 0);
    }

    recalcularMontos() {
        this.state.editado = true;
        const total = Number(this.state.totalProveedor) || 0;
        for (let t of this.state.terminos) {
            const porc = Number(t.porcentaje) || 0;
            t.cantidad = parseFloat(((total * porc) / 100).toFixed(2));
        }
    }

    onPorcentajeChange(index) {
        this.state.editado = true;
        const term = this.state.terminos[index];
        const total = Number(this.state.totalProveedor) || 0;
        const porc = Number(term.porcentaje) || 0;
        term.cantidad = parseFloat(((total * porc) / 100).toFixed(2));
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
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
            a.download = this.state.PDFNombre || "contrato_proveedor.pdf";
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
        this.state.editado = true;
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
            if (resultado && resultado.success){
                this.state.PDF = resultado.pdf || "";
                this.state.PDFNombre = resultado.filename || "";
            }
        }catch(e){
            this.notification.add("Hubo un error al obtener el PDF: " + (e.message || e), { type: "danger" });  
        }
    }

    nuevoTermino(){
        if(this.state.terminos.length >= 4){
            this.notification.add("Solo se permite un máximo de 4 términos de pago.", { type: "warning" });
            return;
        }
        this.state.terminos.push({
            nombre: `Término ${this.state.terminos.length + 1}`,
            porcentaje: 0,
            cantidad: 0
        });
        this.state.editado = true;
    }

    eliminarTermino(index){
        this.state.terminos.splice(index, 1);
        this.state.editado = true;
    }

    async onConfirmar() {
        if (!this.state.pedidoId) {
            this.notification.add("No hay pedido asociado", { type: "danger" });
            return;
        }
        if (!this.state.PDF) {
            this.notification.add("Necesita subir documento de contrato PDF", { type: "danger" });
            return;
        }
        if(!this.state.terminos || this.state.terminos.length === 0){
            this.notification.add("Necesita agregar al menos un término de pago", { type: "danger" });
            return;
        }
        if (this.sumaPorcentajes !== 100) {
            this.notification.add("La suma de los porcentajes de los términos debe ser exactamente 100%", { type: "warning" });
            return;
        }
        if (this.state.totalProveedor <= 0) {
            this.notification.add("Por favor colocar un total de proveedor", { type: "warning" });
            return;
        }
        const total = Number(this.state.totalProveedor) || 0.0;
        console.log( this.state )
        try{
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "guardar_terminos",
                [   
                    "pdf_contrato_proveedor",
                    this.state.PDF,
                    this.state.pedidoId, 
                    this.state.PDFNombre,
                    this.state.terminos,
                    total,
                ]
            );
            if (resultado && resultado.success){
                this.notification.add("Guardado exitosamente", { type: "success" }); 
                if (this.props.confirm) {
                    this.props.confirm(this.state.terminos, this.state.totalProveedor);
                }
                this.props.close();  
            } else {
                this.notification.add("Hubo un error: " + (resultado.error || "desconocido"), { type: "danger" });         
            }
        }catch(e){
            this.notification.add("Hubo un error en el servidor: " + (e.message || e), { type: "danger" });  
        }
    }

    onCancelar() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}