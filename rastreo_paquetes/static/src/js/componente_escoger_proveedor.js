/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class componente_escoger_proveedor extends Component {
    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");

        this.state = useState({
            busqueda: "",
            proveedores: [],
            cargando: false,
            seleccionadoId: this.props.proveedorActualId || false,
        });

        this.searchTimeout = null;

        onWillStart(async () => {
            await this.buscarProveedores("");
        });
    }

    async buscarProveedores(termino) {
        this.state.cargando = true;
        try {
            const domain = termino
                ? [
                      "|",
                      "|",
                      ["name", "ilike", termino],
                      ["email", "ilike", termino],
                      ["vat", "ilike", termino],
                  ]
                : [];

            const resultados = await this.orm.searchRead(
                "res.partner",
                domain,
                ["id", "name", "email", "phone", "vat", "supplier_rank"],
                { limit: 30, order: "supplier_rank desc, name asc" }
            );
            this.state.proveedores = resultados;
        } catch (error) {
            this.notification.add("Error al cargar proveedores de Odoo", {
                type: "danger",
            });
        } finally {
            this.state.cargando = false;
        }
    }

    onInputBusqueda(ev) {
        const valor = ev.target.value;
        this.state.busqueda = valor;
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.buscarProveedores(valor);
        }, 300);
    }

    seleccionarProveedor(prov) {
        if (this.props.confirm) {
            this.props.confirm({
                id: prov.id,
                nombre: prov.name,
            });
        }
        this.props.close();
    }

    onCancelar() {
        if (this.props.cancel) {
            this.props.cancel();
        }
        this.props.close();
    }
}

componente_escoger_proveedor.template = "rastreo_paquetes.componente_escoger_proveedor";