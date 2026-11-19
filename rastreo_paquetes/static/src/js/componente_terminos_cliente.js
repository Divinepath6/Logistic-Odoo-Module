/** @odoo-module **/
import { Component, useState, onWillStart } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks"; 

export class componente_terminos_cliente extends Component {
    static template = "rastreo_paquetes.componente_terminos_cliente_embed";
    static components = { Dialog }; 

    setup(){
        this.notification = useService("notification");
        this.orm = useService("orm");
        
        this.state = useState({
            pedidoId: 0,
            terminos: [], 
            totalCliente: 0.0,
        });

        onWillStart(async () => {
            const d = this.props.objeto;
            if (d) {
                this.state.pedidoId = d.pedidoId || 0;
                this.state.totalCliente = d.totalCliente || 0.0;
                this.state.terminos = d.terminos ? JSON.parse(JSON.stringify(d.terminos)) : [];
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
        const total = Number(this.state.totalCliente) || 0;
        for (let t of this.state.terminos) {
            const porc = Number(t.porcentaje) || 0;
            t.cantidad = parseFloat(((total * porc) / 100).toFixed(2));
        }
    }

    onPorcentajeChange(index) {
        const term = this.state.terminos[index];
        const total = Number(this.state.totalCliente) || 0;
        const porc = Number(term.porcentaje) || 0;
        term.cantidad = parseFloat(((total * porc) / 100).toFixed(2));
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
    }

    nuevoTermino(){
        if(this.state.terminos.length >= 4){
            this.notification.add("Solo se permite un máximo de 4 términos de pago.", { type: "warning" });
            return;
        }
        this.state.terminos.push({
            nombre: `Término ${this.state.terminos.length + 1}`,
            porcentaje: 0,
            cantidad: 0,
            fecha_compromiso: ""
        });
    }

    eliminarTermino(index) {
    if (index >= 0 && index < this.state.terminos.length) {
        this.state.terminos.splice(index, 1);
    }
}
    async onConfirmar() {
        if (!this.state.pedidoId) {
            this.notification.add("No hay pedido asociado", { type: "danger" });
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

        try{
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "guardar_terminos_cliente",
                [   
                    this.state.pedidoId, 
                    this.state.terminos,
                    this.state.totalCliente,
                ]
            );
            if (resultado && resultado.success){
                this.notification.add("Términos de cliente guardados exitosamente", { type: "success" }); 
                if (this.props.confirm) {
                    this.props.confirm(this.state.terminos);
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