/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks";
import { PdfUploader } from "./Pdf_uploader";

export class componente_detalle_cliente extends Component {
    static template = "rastreo_paquetes.componente_detalle_cliente_embed";
    static components = { Dialog, PdfUploader };

    setup() {
        this.notification = useService("notification");
        this.action = useService("action");
        this.orm = useService("orm");
        this.dialogService = useService("dialog");

        this.state = useState({
            pedidoId: 0,
            anticipoId: 0,
            numero: 0,
            referenciaOdoo: "",
            fechaEdicion: "",
            fechaAnticipo: "",
            cantidadAnticipo: 0.0,
            precioDolar: 0.0,
            PDFAnticipo: "",
            PDFAnticipoNombre: "",
            crearEditar: "Editar",
            tipo: "pago",
            targetCurrency: "MXN",
            fetchingRate: false,
            get montoMxnText() {
                const total = (Number(this.cantidadAnticipo) || 0) * (Number(this.precioDolar) || 0);
                return total.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
            },
        });

        onWillStart(async () => {
            const r = this.props.objeto;
            if (r) {
                this.state.crearEditar = r.crearEditar || (r.anticipoId ? "Editar" : "Crear");
                this.state.anticipoId = r.anticipoId || r.detalle_id || 0;
                this.state.pedidoId = r.pedidoId || 0;
                this.state.numero = r.numero || 0;
                this.state.referenciaOdoo = r.referencia || "";
                this.state.fechaEdicion = r.fechaEdicion || r.fecha_editado || "";
                this.state.fechaAnticipo = r.fechaAnticipo || r.fecha || new Date().toISOString().split("T")[0];
                this.state.cantidadAnticipo = Number(r.cantidadAnticipo ?? r.monto_usd ?? r.monto_raw ?? 0) || 0.0;
                this.state.precioDolar = Number(r.precioDolar ?? r.precio_dolar ?? 0) || 0.0;
                this.state.tipo = r.tipo || r.tipo_registro || "pago";
                await this.obtenerPDF();
            }

            if (!this.state.precioDolar || this.state.precioDolar === 0) {
                await this.fetchDollarRate();
            }
        });
    }

    async fetchDollarRate() {
        this.state.fetchingRate = true;
        try {
            const response = await fetch("https://open.er-api.com/v6/latest/USD");
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data && data.result === "success" && data.rates) {
                const rate =
                    data.rates[this.state.targetCurrency] ||
                    data.rates.USD ||
                    null;
                if (rate) {
                    this.state.precioDolar = parseFloat(Number(rate).toFixed(4));
                }
            }
        } catch (e) {
            console.warn("No se pudo obtener el tipo de cambio automáticamente:", e);
        } finally {
            this.state.fetchingRate = false;
        }
    }

    onPdfChange(base64, filename) {
        this.state.PDFAnticipo = base64;
        this.state.PDFAnticipoNombre = filename;
    }

    async obtenerPDF() {
        if (!this.state.anticipoId || this.state.anticipoId === 0) return;
        try {
            const resultado = await this.orm.call(
                "rastreo.detalle_cliente",
                "obtener_pdf",
                [this.state.anticipoId]
            );
            if (resultado.success) {
                this.state.PDFAnticipo = resultado.pdf || "";
                this.state.PDFAnticipoNombre = resultado.filename || "";
            } else {
                this.notification.add(
                    "Hubo un error " + (resultado.error || "desconocido"),
                    { type: "danger" }
                );
            }
        } catch (e) {
            this.notification.add(
                "Hubo un error desconocido " + (e.error || e.message || ""),
                { type: "danger" }
            );
        }
    }

    async onConfirmar() {
        if (!this.state.pedidoId) {
            this.notification.add("No hay pedido asociado", { type: "danger" });
            return;
        }
        if (!this.state.precioDolar || this.state.precioDolar <= 0) {
            this.notification.add("Necesita indicar el precio del Dólar", { type: "danger" });
            return;
        }

        const esEdicion = Boolean(this.state.anticipoId && this.state.anticipoId !== 0);

        if (!esEdicion) {
            if (!this.state.cantidadAnticipo || this.state.cantidadAnticipo <= 0) {
                this.notification.add(
                    "Necesita indicar una cantidad recibida",
                    { type: "danger" }
                );
                return;
            }
            if (this.state.tipo === "pago" && !this.state.PDFAnticipo) {
                this.notification.add(
                    "Necesita subir el PDF del pago",
                    { type: "danger" }
                );
                return;
            }
        }

        try {
            const datos = {
                cantidad: Number(this.state.cantidadAnticipo),
                precio_dolar: Number(this.state.precioDolar),
                fecha_anticipo: this.state.fechaAnticipo,
                tipo: this.state.tipo,
            };

            const pdf = this.state.PDFAnticipo || false;
            const pdfName = this.state.PDFAnticipoNombre || false;

            const resultado = await this.orm.call(
                "rastreo.detalle_cliente",
                "guardar_detalle",
                [this.state.pedidoId, this.state.anticipoId, datos, pdf, pdfName]
            );

            if (resultado.success) {
                this.notification.add("Anticipo del cliente guardado correctamente", { type: "success" });
                this.props.confirm({
                    cantidadAnticipo: Number(this.state.cantidadAnticipo),
                    precioDolar: Number(this.state.precioDolar),
                    fechaAnticipo: this.state.fechaAnticipo,
                    PDFAnticipo: Boolean(this.state.PDFAnticipo),
                    tipo: this.state.tipo,
                });
                this.props.close();
            } else {
                this.notification.add(
                    "Hubo un error: " + (resultado.error || "desconocido"),
                    { type: "danger" }
                );
            }
        } catch (e) {
            console.error(e);
            this.notification.add(
                "Hubo un error: " + (e.message || "desconocido"),
                { type: "danger" }
            );
        }
    }

    onCancel() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}