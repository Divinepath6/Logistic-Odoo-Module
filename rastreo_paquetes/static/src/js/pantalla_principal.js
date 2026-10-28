/** @odoo-module **/
import { registry } from "@web/core/registry";
import { Component, onWillStart, useState, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks"; 
import { componente_creacion_pedido } from "./componente_creacion_pedido";
import { componente_edicion_racks } from "./componente_edicion_racks";
import { componente_cargar_cotizacion } from "./componente_cargar_cotizacion";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

export class PantallaPrincipal extends Component { 
    static components = { componente_creacion_pedido, componente_edicion_racks, componente_cargar_cotizacion };
    
    setup() {
        this.notification = useService("notification");
        this.action = useService("action");
        this.orm = useService("orm");
        this.dialogService = useService("dialog");
 
        this._isResizing = false;
        this._colIndex = -1;
        this._startX = 0;
        this._startWidth = 0;

        this.state = useState({
            pedidos: [],
            modoTablero: true,
            cargando: false,
            kpiClientes: 0,
            kpiProveedor: 0,
            columns: [],
            headers : [
                { label: "Estado" },
                { label: "Cotización" },
                { label: "Cliente" },
                { label: "Aviso" },
                { label: "Saldo cliente" },
                { label: "Total cliente" },
                { label: "Saldo proveedor" },
                { label: "Total proveedor" },
                { label: "Racks" },
                { label: "Última act." }
            ],
            colWidths : [100, 100, 150, 200, 120, 120, 120, 130, 130, 80, 160],
        });

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);

        document.addEventListener('mousedown', this.onMouseDown);

        onWillUnmount(() => {
            document.removeEventListener('mousedown', this.onMouseDown);
            document.removeEventListener('mousemove', this.onMouseMove);
            document.removeEventListener('mouseup', this.onMouseUp);
        });

        onWillStart(async () => {
            await this.cargarPedidos();
        });
        this.searchTimeout = null;
    }



    onMouseDown(e) {
        if (e.target && e.target.classList.contains('resizer')) {
            this._isResizing = true;
            this._startX = e.clientX;
            
            const th = e.target.parentElement;
            this._colIndex = parseInt(th.getAttribute('data-col')); 
            this._startWidth = this.state.colWidths[this._colIndex]; 
            
            e.target.classList.add('is-resizing');
            
            document.addEventListener('mousemove', this.onMouseMove);
            document.addEventListener('mouseup', this.onMouseUp);
        }
    }

    onMouseMove(e) {
        if (!this._isResizing || this._colIndex === -1) return;
        
        const deltaX = e.clientX - this._startX;
        const newWidth = Math.max(80, this._startWidth + deltaX);
        
        const newWidths = [...this.state.colWidths];
        newWidths[this._colIndex] = newWidth;
        this.state.colWidths = newWidths;
    }

    onMouseUp() {
        this._isResizing = false;
        this._colIndex = -1;
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        
        document.querySelectorAll('.resizer').forEach(r => r.classList.remove('is-resizing'));
    }


    
    async onClickCrearPedido(ev) {
        this.dialogService.add(componente_creacion_pedido,  {
                title: "Confirmación",
                confirm: async (clienteId) => {
                    const resultado = await this.crearPedido(clienteId)
                    if(!resultado){
                    }
                    if(resultado != 0){
                        this.notification.add(
                        `Exitoso `,
                        { type: "success" }
                    );
                    }
                },
                cancel: () => {
                    console.log("Cancelado");
                }
        });
    }
       
    async onClickCargarPedidos(){
        await this.cargarPedidos();
    }

    async onClickEditarPedido(p) {
        if(p.estado === 'fase_inicial'){
            await this.action.doAction({
                type: "ir.actions.client",
                tag: "rastreo_paquetes.pantalla_croquis",
                params: { pedido_id: p.id , cliente_nombre : p.cliente_nombre, guia: p.numero_guia },  
                target: "current",
            });
        } else {
            await this.action.doAction({
            type: "ir.actions.client",
            tag: "rastreo_paquetes.pantalla_pedido",
            params: { pedido_id: p.id , cliente_id : p.clienteId },  
            target: "current",
            });
        }
    }

    async onclickEditarRacks(){
        this.dialogService.add(componente_edicion_racks, {
                confirm: async () => {},
                cancel: () => {}
        });
    }

    onBusqueda(ev){
        const valorBuscado = ev.target.value;
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        this.searchTimeout = setTimeout(() => {
            this.cargarPedidos(valorBuscado);
        }, 500);
    }

    async crearPedido(id) {
        const resultado = await this.orm.call(
            "rastreo.pedido", 
            "crear_pedido",
            [id]
        );
        await this.cargarPedidos();
        return resultado.id;
    }

    async onCargarCotizacion(){
        this.dialogService.add(componente_cargar_cotizacion, {
            title: ("¿Estás seguro?"),
            body: ("Introduzca la cotizacion"),
            confirm: async (numero,estado) => {
                const resultado = await this.orm.call(
                    "rastreo.pedido", 
                    "crear_pedido_cotizacion",
                    [
                        numero,
                        estado
                    ]
                );
                if(resultado.success){
                    this.notification.add(`Exitoso `,{ type: "success" });
                }
                else{
                    this.notification.add("Error al guardar detalle",{ type: "danger" });
                }
                await this.cargarPedidos();
            },
            cancel: () => {},
        });
    }

    async onClickEliminarPedido(p){
         this.dialogService.add(ConfirmationDialog, {
            title: ("¿Estás seguro?"),
            body: ("Esta acción no se puede deshacer ¿Está seguro?"),
            confirm: async () => {
                const resultado = await this.orm.call(
                    "rastreo.pedido", 
                    "eliminar_pedido",
                    [p.id]
                );
                if(resultado.success){
                    this.notification.add(`Exitoso `,{ type: "success" });
                }
                else{
                    this.notification.add("Error al guardar detalle",{ type: "danger" });
                }
                await this.cargarPedidos();
            },
            cancel: () => {},
        });
    }
    
    async cargarPedidos(filtro = null) {
        this.state.cargando = true;
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "listar_pedidos",
                [filtro]
            );
            if(resultado.success){
                this.state.pedidos = resultado.lista;
                this.state.kpiClientes = resultado.kpi.cliente
                this.state.kpiProveedor  = resultado.kpi.proveedor
                this.asignarColumnas();
            }
           
        } finally {
            this.state.cargando = false;
        }
    }

    asignarColumnas(){
        const estados = 
        [
            ["fase_inicial", "Fase Inicial"], 
            ["produccion", "En Producción"], 
            ["forwarder", "A punto de salir a mar"], 
            ["enviado", "En mar"],
            ["entregado", "Finalizado"]
        ];
        this.state.columns = estados.map(estado => ({
            name: estado[1],
            packages: this.state.pedidos.filter(p => p.estado === estado[0]),
        }));
    }
}

PantallaPrincipal.template = "rastreo_paquetes.pantalla_principal";
registry.category("actions").add("rastreo_paquetes.pantalla_principal", PantallaPrincipal);