/** @odoo-module **/
import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks";

export class componente_detalle_eta extends Component {
    static template = "rastreo_paquetes.componente_detalle_eta";
    static components = { Dialog };
    static props = {
        close: Function,
        title: { type: String, optional: true },
        objeto: Object,
        confirm: Function,
        cancel: { type: Function, optional: true },
    };

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");

        const obj = this.props.objeto || {};
        this.state = useState({
            crearEditar: obj.crearEditar || "Crear",
            id: obj.id || 0,
            pedidoId: obj.pedidoId || 0,
            numero: obj.numero || 1,
            fecha: obj.fecha || "",
            texto: obj.texto || "",
            guardando: false,
        });
    }

    async onConfirmar() {
        if (!this.state.fecha) {
            this.notification.add("La fecha del ETA es obligatoria", { type: "warning" });
            return;
        }

        this.state.guardando = true;
        try {
            if (this.state.crearEditar === "Crear") {
                const res = await this.orm.call(
                    "rastreo.pedido",
                    "agregar_eta",
                    [this.state.pedidoId, this.state.fecha, this.state.texto]
                );
                if (!res.success) {
                    this.notification.add(res.error || "Error al registrar la ETA", { type: "danger" });
                    return;
                }
                this.notification.add("ETA agregada correctamente", { type: "success" });
            }

            await this.props.confirm({
                crearEditar: this.state.crearEditar,
                id: this.state.id,
                numero: this.state.numero,
                fecha: this.state.fecha,
                texto: this.state.texto,
            });
            this.props.close();
        } catch (error) {
            this.notification.add("Ocurrió un error al procesar la ETA", { type: "danger" });
        } finally {
            this.state.guardando = false;
        }
    }

    onCancelar() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}