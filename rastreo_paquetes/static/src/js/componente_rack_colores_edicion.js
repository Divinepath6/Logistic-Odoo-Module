/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks";

export class componente_rack_colores_edicion extends Component {
    static template = "rastreo_paquetes.componente_rack_colores_edicion_embed";
    static components = { Dialog };

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");

        this.state = useState({
            colores: [],
            cargando: true,
            editandoId: null,
            clave: "",
            nombre: "",
            color_hex: "#ec962e",
        });

        onWillStart(async () => {
            await this.cargarColores();
        });
    }

    async cargarColores() {
        this.state.cargando = true;
        try {
            const resultados = await this.orm.call(
                "rastreo.rack_color",
                "listar_colores",
                []
            );
            this.state.colores = resultados;
        } catch (error) {
            this.notification.add("Error al cargar los colores de racks.", { type: "danger" });
        } finally {
            this.state.cargando = false;
        }
    }

    seleccionarColor(color) {
        this.state.editandoId = color.id;
        this.state.clave = color.clave || "";
        this.state.nombre = color.nombre || "";
        this.state.color_hex = color.color_hex || "#ec962e";
    }

    limpiarFormulario() {
        this.state.editandoId = null;
        this.state.clave = "";
        this.state.nombre = "";
        this.state.color_hex = "#ec962e";
    }

    async guardarColor() {
        if (!this.state.nombre.trim() || !this.state.color_hex.trim()) {
            this.notification.add("El nombre y el código hexadecimal son obligatorios.", { type: "warning" });
            return;
        }

        try {
            const vals = {
                id: this.state.editandoId,
                clave: this.state.clave,
                nombre: this.state.nombre,
                color_hex: this.state.color_hex
            };

            await this.orm.call(
                "rastreo.rack_color",
                "guardar_color",
                [vals]
            );

            this.notification.add("Color guardado exitosamente.", { type: "success" });
            this.limpiarFormulario();
            await this.cargarColores();
        } catch (error) {
            this.notification.add("Error al guardar el color.", { type: "danger" });
        }
    }

    async eliminarColor(colorId) {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este color?")) {
            return;
        }

        try {
            await this.orm.call(
                "rastreo.rack_color",
                "eliminar_color",
                [colorId]
            );
            this.notification.add("Color eliminado correctamente.", { type: "success" });
            if (this.state.editandoId === colorId) {
                this.limpiarFormulario();
            }
            await this.cargarColores();
        } catch (error) {
            this.notification.add("No se puede eliminar el color porque está en uso.", { type: "danger" });
        }
    }
}