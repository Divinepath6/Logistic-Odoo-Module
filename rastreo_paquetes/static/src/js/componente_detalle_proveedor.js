/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 
import { PdfUploader } from "./Pdf_uploader";

export class componente_detalle_proveedor extends Component {
    static template = "rastreo_paquetes.componente_detalle_proveedor_embed";
    static components = { Dialog, PdfUploader }; 

    setup() {
        this.notification = useService("notification");
        this.action = useService("action");
        this.orm = useService("orm");
        this.dialogService = useService("dialog");
        
        this.state = useState({
            anticipoId: 0,
            pedidoId: 0,
            fechaEdicion: "",
            fechaAnticipo: "",
            cantidadAnticipo: 0.0,
            precioDolar: 0.0,
            numero: 0,
            referencia: "",
            journalId: 0,
            journalNombre: "",
            diarios: [],
            PDFAnticipo: "",
            PDFAnticipoNombre: "",
            crearEditar: "Crear",
            get esEdicion() {
                return Boolean(this.anticipoId && this.anticipoId !== 0);
            },
            get montoMxnText() {
                const total = (this.cantidadAnticipo || 0) * (this.precioDolar || 0);
                return total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
            }
        });

        onWillStart(async () => {
            const r = this.props.objeto;
            if (r) {
                this.state.anticipoId = r.anticipoId || 0;
                this.state.crearEditar = this.state.anticipoId ? "Editar" : "Crear";
                this.state.pedidoId = r.pedidoId;
                this.state.numero = r.numero;
                this.state.referencia = r.referencia || "";
                this.state.journalId = r.journalId || 0;
                this.state.journalNombre = r.journalNombre || "";
                this.state.fechaEdicion = r.fechaEdicion || "";
                this.state.fechaAnticipo = r.fechaAnticipo || "";
                this.state.cantidadAnticipo = r.cantidadAnticipo || 0.0;
                this.state.precioDolar = r.precioDolar || 0.0;

                if (this.state.esEdicion) {
                    await this.obtenerPDF();
                } else {
                    await this.cargarDiariosPago();
                }
            }
        });
    }

    async cargarDiariosPago() {
        try {
            const diarios = await this.orm.searchRead(
                "account.journal",
                [["type", "in", ["bank", "cash"]]],
                ["id", "name", "type"]
            );
            this.state.diarios = diarios;
            if (diarios.length > 0 && !this.state.journalId) {
                this.state.journalId = diarios[0].id;
            }
        } catch (e) {
            this.notification.add("No se pudieron cargar los métodos de pago" + (e.error), { type: "warning" });
        }
    }

    onPdfChange(base64, filename) {
        this.state.PDFAnticipo = base64;
        this.state.PDFAnticipoNombre = filename;
    }

    async obtenerPDF() {
        if (!this.state.anticipoId || this.state.anticipoId === 0) {
            return;
        }
        try {
            const resultado = await this.orm.call(
                "rastreo.detalle_proveedor",
                "obtener_pdf",
                [this.state.anticipoId]
            );
            if (resultado.success) {
                this.state.PDFAnticipo = resultado.pdf || "";
                this.state.PDFAnticipoNombre = resultado.filename || "";
            } else {
                this.notification.add("Hubo un error " + (resultado.error || "desconocido"), { type: "danger" });          
            }
        } catch (e) {
            this.notification.add("Hubo un error desconocido: " + (e.message || e), { type: "danger" });  
        }
    }

    async onConfirmar() {
        if (!this.state.pedidoId) {
            this.notification.add("No hay pedido asociado", { type: "danger" });
            return;
        }
        if (!this.state.esEdicion) {
            if (!this.state.journalId) {
                this.notification.add("Necesita seleccionar un método de pago", { type: "danger" });
                return;
            }
            if (!this.state.cantidadAnticipo || this.state.cantidadAnticipo <= 0) {
                this.notification.add("Necesita indicar una cantidad válida en dólares", { type: "danger" });
                return;
            }
            if (!this.state.PDFAnticipo) {
                this.notification.add("Necesita subir el archivo PDF del comprobante", { type: "danger" });
                return;
            }
        }
        if (!this.state.precioDolar || this.state.precioDolar <= 0) {
            this.notification.add("Necesita indicar el precio del dólar", { type: "danger" });
            return;
        }

        try {
            const payload = this.state.esEdicion
                ? {
                      precio_dolar: Number(this.state.precioDolar),
                  }
                : {
                      cantidad: Number(this.state.cantidadAnticipo),
                      precio_dolar: Number(this.state.precioDolar),
                      fecha_anticipo: this.state.fechaAnticipo,
                      journal_id: Number(this.state.journalId),
                  };

            const resultado = await this.orm.call(
                "rastreo.detalle_proveedor",
                "guardar_detalle",
                [
                    this.state.pedidoId, 
                    this.state.anticipoId, 
                    payload, 
                    this.state.PDFAnticipo || false, 
                    this.state.PDFAnticipoNombre || false
                ]
            );
            
            if (resultado.success) {
                this.notification.add(
                    this.state.esEdicion
                        ? "Precio del dólar actualizado correctamente"
                        : "Anticipo guardado correctamente",
                    { type: "success" }
                );
                this.props.confirm({
                    cantidadAnticipo: this.state.cantidadAnticipo,
                    precioDolar: this.state.precioDolar,
                    fechaAnticipo: this.state.fechaAnticipo,
                    PDFAnticipo: true,
                });
                this.props.close();
            } else {
                this.notification.add("Hubo un error: " + (resultado.error || "desconocido"), { type: "danger" });          
            }
        } catch (e) {
            console.error(e);
            this.notification.add("Error al comunicarse con el servidor", { type: "danger" });
        }
    }

    onCancelar() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}