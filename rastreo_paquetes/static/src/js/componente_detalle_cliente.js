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
        this.orm = useService("orm");

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
            targetCurrency: "MXN",
            fetchingRate: false,

            // Opciones de pago (Diario y Método de pago)
            diarios: [],
            journalId: 0,
            journalNombre: "",
            paymentMethodLineId: 0,
            paymentMethodNombre: "",

            modoVinculo: "crear",
            referenciaBuscar: "",
            buscandoRef: false,
            existingRecordId: 0,

            get metodosDisponibles() {
                const diario = this.diarios.find((d) => d.id === Number(this.journalId));
                return diario ? diario.metodos : [];
            },

            get montoMxnText() {
                const total = (Number(this.cantidadAnticipo) || 0) * (Number(this.precioDolar) || 0);
                return total.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
            },
        });

        onWillStart(async () => {
            const r = this.props.objeto;
            if (r) {
                this.state.modoVinculo = r.modoVinculo || "crear";
                this.state.crearEditar = r.crearEditar || (r.anticipoId ? "Editar" : "Crear");
                this.state.anticipoId = r.anticipoId || r.detalle_id || 0;
                this.state.pedidoId = r.pedidoId || 0;
                this.state.numero = r.numero || 0;
                this.state.referenciaOdoo = r.referencia || "";
                this.state.fechaEdicion = r.fechaEdicion || r.fecha_editado || "";
                this.state.fechaAnticipo = r.fechaAnticipo || r.fecha || new Date().toISOString().split("T")[0];
                this.state.cantidadAnticipo = Number(r.cantidadAnticipo ?? r.monto_usd ?? r.monto_raw ?? 0) || 0.0;
                this.state.precioDolar = Number(r.precioDolar ?? r.precio_dolar ?? 0) || 0.0;
                await this.obtenerPDF();
            }

            await this.cargarOpcionesPago();

            if (!this.state.precioDolar || this.state.precioDolar === 0) {
                await this.fetchDollarRate();
            }
        });
    }

    async cargarOpcionesPago() {
        try {
            const res = await this.orm.call(
                "rastreo.detalle_cliente",
                "obtener_opciones_pago",
                [this.state.anticipoId]
            );
            if (res && res.success) {
                this.state.diarios = res.diarios || [];
                const sel = res.seleccion_actual || {};

                if (sel.journal_id) {
                    this.state.journalId = sel.journal_id;
                    this.state.journalNombre = sel.journal_name || "";
                    this.state.paymentMethodLineId = sel.payment_method_line_id || 0;
                    this.state.paymentMethodNombre = sel.payment_method_name || "";
                } else if (this.state.diarios.length > 0 && !this.state.anticipoId) {
                    // Seleccionar por defecto el primer diario y su primer método
                    const primero = this.state.diarios[0];
                    this.state.journalId = primero.id;
                    this.state.journalNombre = primero.name;
                    if (primero.metodos && primero.metodos.length > 0) {
                        this.state.paymentMethodLineId = primero.metodos[0].id;
                        this.state.paymentMethodNombre = primero.metodos[0].name;
                    }
                }
            }
        } catch (e) {
            console.error("Error cargando métodos de pago:", e);
        }
    }

    onDiarioChange(ev) {
        const nuevoId = Number(ev.target.value) || 0;
        this.state.journalId = nuevoId;
        const diario = this.state.diarios.find((d) => d.id === nuevoId);
        this.state.journalNombre = diario ? diario.name : "";

        if (diario && diario.metodos && diario.metodos.length > 0) {
            this.state.paymentMethodLineId = diario.metodos[0].id;
            this.state.paymentMethodNombre = diario.metodos[0].name;
        } else {
            this.state.paymentMethodLineId = 0;
            this.state.paymentMethodNombre = "";
        }
    }

    onMetodoChange(ev) {
        const metodoId = Number(ev.target.value) || 0;
        this.state.paymentMethodLineId = metodoId;
        const metodo = this.state.metodosDisponibles.find((m) => m.id === metodoId);
        this.state.paymentMethodNombre = metodo ? metodo.name : "";
    }

    cambiarModoVinculo(modo) {
        this.state.modoVinculo = modo;
        this.state.existingRecordId = 0;
        this.state.referenciaOdoo = "";
        if (modo === "crear") {
            this.state.referenciaBuscar = "";
            this.state.cantidadAnticipo = 0.0;
        }
    }

    async onBuscarReferencia() {
        if (!this.state.referenciaBuscar || !this.state.referenciaBuscar.trim()) {
            this.notification.add("Escribe la referencia del pago a buscar.", { type: "warning" });
            return;
        }

        this.state.buscandoRef = true;
        try {
            const res = await this.orm.call(
                "rastreo.detalle_cliente",
                "buscar_referencia_existente",
                [this.state.pedidoId, this.state.referenciaBuscar.trim()]
            );

            if (res.success) {
                this.state.existingRecordId = res.record_id;
                this.state.referenciaOdoo = res.referencia_encontrada;
                this.state.fechaAnticipo = res.fecha;
                this.state.cantidadAnticipo = Number(res.monto_usd) || 0.0;
                this.state.journalId = res.journal_id || 0;
                this.state.journalNombre = res.journal_name || "";
                this.state.paymentMethodLineId = res.payment_method_line_id || 0;
                this.state.paymentMethodNombre = res.payment_method_name || "";

                if (res.tipo_cambio) {
                    this.state.precioDolar = parseFloat(Number(res.tipo_cambio).toFixed(4));
                }
                this.notification.add(
                    `Pago encontrado: ${res.referencia_encontrada} ($${res.monto_usd} USD)`,
                    { type: "success" }
                );
            } else {
                this.state.existingRecordId = 0;
                this.state.referenciaOdoo = "";
                this.notification.add(res.error || "No se encontró el pago.", { type: "danger" });
            }
        } catch (e) {
            this.notification.add("Error al buscar la referencia: " + (e.message || ""), { type: "danger" });
        } finally {
            this.state.buscandoRef = false;
        }
    }

    async fetchDollarRate() {
        this.state.fetchingRate = true;
        try {
            const response = await fetch("https://open.er-api.com/v6/latest/USD");
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data && data.result === "success" && data.rates) {
                const rate = data.rates[this.state.targetCurrency] || data.rates.USD || null;
                if (rate) {
                    this.state.precioDolar = parseFloat(Number(rate).toFixed(2));
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
            }
        } catch (e) {
            this.notification.add(
                "Hubo un error al obtener el PDF: " + (e.error || e.message || ""),
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
            if (this.state.modoVinculo === "vincular" && !this.state.existingRecordId) {
                this.notification.add("Primero busque y seleccione un pago válido", { type: "danger" });
                return;
            }
            if (!this.state.cantidadAnticipo || this.state.cantidadAnticipo <= 0) {
                this.notification.add("Necesita indicar una cantidad recibida", { type: "danger" });
                return;
            }
            if (this.state.modoVinculo === "crear" && !this.state.journalId) {
                this.notification.add("Seleccione un diario de pago (Banco o Caja)", { type: "danger" });
                return;
            }
            if (this.state.modoVinculo === "crear" && !this.state.PDFAnticipo) {
                this.notification.add("Necesita subir el comprobante PDF del pago", { type: "danger" });
                return;
            }
        }

        try {
            const datos = {
                cantidad: Number(this.state.cantidadAnticipo),
                precio_dolar: Number(this.state.precioDolar),
                fecha_anticipo: this.state.fechaAnticipo,
                tipo: "pago",
                journal_id: Number(this.state.journalId) || 0,
                payment_method_line_id: Number(this.state.paymentMethodLineId) || 0,
                modo_vinculo: this.state.modoVinculo,
                existing_record_id: this.state.existingRecordId,
            };

            const pdf = this.state.PDFAnticipo || false;
            const pdfName = this.state.PDFAnticipoNombre || false;

            const resultado = await this.orm.call(
                "rastreo.detalle_cliente",
                "guardar_detalle",
                [this.state.pedidoId, this.state.anticipoId, datos, pdf, pdfName]
            );

            if (resultado.success) {
                this.notification.add("Pago del cliente guardado correctamente", { type: "success" });
                this.props.confirm({
                    cantidadAnticipo: Number(this.state.cantidadAnticipo),
                    precioDolar: Number(this.state.precioDolar),
                    fechaAnticipo: this.state.fechaAnticipo,
                    PDFAnticipo: Boolean(this.state.PDFAnticipo),
                    tipo: "pago",
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