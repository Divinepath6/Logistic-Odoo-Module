/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 
import { PdfUploader } from "./Pdf_uploader";

export class componente_cotizacion_aduana extends Component {
    static template = "rastreo_paquetes.componente_cotizacion_aduana_embed";
    static components = { Dialog, PdfUploader }; 

    setup() {
        this.notification = useService("notification");
        this.orm = useService("orm");
        
        this.state = useState({
            pedidoId: 0,
            PDF: "",   
            PDFNombre: "", 
            documentoNombre: "pdf_cotizacion_aduana", 
            costoUsd: 0.0,
            costoDolar: 0.0,
            tienePdfPrevio: false,
            editado: false,
        });

        onWillStart(async () => {
            const d = this.props.objeto;
            if (d) {
                this.state.pedidoId = d.pedidoId || 0;
                this.state.documentoNombre = d.documentoNombre || "pdf_cotizacion_aduana";
                this.state.costoUsd = d.cotizacionAduana || 0.0;
                this.state.costoDolar = d.cotizacionAduanaCostoDolar || 0.0;
                this.state.tienePdfPrevio = !!d.tienePdf;

                if (this.state.tienePdfPrevio) {
                    await this.obtenerPDF();
                }
            } else {
                this.notification.add("No se recibieron datos del pedido", { type: "danger" });  
                this.props.close();  
            }
        });
    }

    get totalMxn() {
        return (Number(this.state.costoUsd) || 0) * (Number(this.state.costoDolar) || 0);
    }

    formatCurrency(value, currency = "USD") {
        return new Intl.NumberFormat("es-MX", { 
            style: "currency", 
            currency: currency 
        }).format(value || 0);
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
            a.download = this.state.PDFNombre || "cotizacion_aduana.pdf";
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

    async obtenerPDF() {
        if (!this.state.pedidoId) return;
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "obtener_pdf",
                [this.state.pedidoId, this.state.documentoNombre]
            );
            if (resultado && resultado.success) {
                this.state.PDF = resultado.pdf || "";
                this.state.PDFNombre = resultado.filename || "";
            }
        } catch (e) {
            this.notification.add("Hubo un error al obtener el PDF: " + (e.message || e), { type: "danger" });  
        }
    }

    async onConfirmar() {
        if (!this.state.pedidoId) {
            this.notification.add("No hay pedido asociado", { type: "danger" });
            return;
        }
        if (!this.state.PDF) {
            this.notification.add("Necesita subir el PDF de la cotización aduanal", { type: "danger" });
            return;
        }
        if (Number(this.state.costoUsd) <= 0) {
            this.notification.add("Ingrese un costo en dólares válido", { type: "warning" });
            return;
        }
        if (Number(this.state.costoDolar) <= 0) {
            this.notification.add("Ingrese el costo del dólar (tipo de cambio)", { type: "warning" });
            return;
        }

        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "guardar_cotizacion_aduana",
                [
                    this.state.pedidoId,
                    this.state.PDF,
                    this.state.PDFNombre,
                    Number(this.state.costoUsd),
                    Number(this.state.costoDolar),
                ]
            );
            if (resultado && resultado.success) {
                this.notification.add("Cotización aduanal guardada exitosamente", { type: "success" }); 
                if (this.props.confirm) {
                    await this.props.confirm({
                        costoUsd: Number(this.state.costoUsd),
                        costoDolar: Number(this.state.costoDolar),
                    });
                }
                this.props.close();  
            } else {
                this.notification.add("Hubo un error: " + (resultado.error || "desconocido"), { type: "danger" });         
            }
        } catch (e) {
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