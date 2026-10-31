/** @odoo-module **/
import { registry } from "@web/core/registry";
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";
import { CreacionCroquis } from "./creacion_croquis";
import { calcularLayoutCroquis } from "./funcion_calcular_layout";
import { componente_detalle_racks } from "./componente_detalle_racks"

export class PantallaCroquis extends Component {
    static components = { CreacionCroquis, componente_detalle_racks };
    static template = "rastreo_paquetes.pantalla_croquis";
    setup() {
        this.action = useService("action");
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialogService = useService("dialog")
        this.state = useState({
            // Valores "Generales"
            pedido: null,
            pedidoId: 0,
            nombre: "",
            guia: "",
            cargando: false,
            separacion:15,
            rackTipos: [],
            bodegaIndex: 0,
            bodegas: [],
            clienteNombre: "",
            ubicacion: "",
            bodegaNombre: "",
            // Detalle adicional
            detalleRacks: [],
            // Valores "de la bodega"
                  
            rackSeleccionadomedidas: [],
            rackSeleccionadoIndex: 0,
            rackSeleccionadoCosto: 0,
            alturaBodega: 1, // entero
            anchoBodega: 0, // metros
            largoBodega: 0, // metros
            comentarios: "",
            racksOcupados: 0,
            rackSeleccionadoAlmacenaje: 0.00,

            //orillas
            sepParedArr: 30,
            sepParedAba: 30,
            sepParedIzq: 30,
            sepParedDer: 30,

            // Valores "calculables"
            anchoPasilloX: 0,
            pasillosX: 0, 
            anchoPasilloY: 0,         
            pasillosY: 0,  

            minimoPasilloX: 50,
            minimoPasilloY: 50,         

            anchoRack: 0,     // mm
            largoRack: 0,  // mm
            costoEstimado: 0.0,
            almacenajeTonelada: 0.0,
            porAncho: 0,      
            porLargo: 0, 
            
            
            costoEstimadoTotal: 0.0,

            espacioSobranteVer: 0,
            espacioSobranteHor: 0, 
            costoEstimadoDisplay: "$0.00",  
            almacenajeToneladaDisplay: "0.000",
        });
        onWillStart(async () => {
            if (this.props.action && this.props.action.params) {
                const pedidoId = this.props.action.params.pedido_id || null;
                const clienteNombre = this.props.action.params.cliente_nombre || null;
                const guia = this.props.action.params.guia || null;
                this.state.pedidoId = pedidoId;
                this.state.clienteNombre = clienteNombre;
                this.state.guia = guia;
                await this.cargarRacks();
                await this.cargarBodegaDB();
            }
        });
        this.searchTimeout = null;
    }
    //hechos para cargar y guardar en la lista de bodegas[] hechos para cargar y guardar en la lista de bodegas[]
    cargarBodega(index){
        const bodega = this.state.bodegas[index];
        if (!bodega) return; 
        this.state.minimoPasilloX = bodega.minimoPasilloX;
        this.state.minimoPasilloY = bodega.minimoPasilloY;        
        this.state.bodegaNombre = bodega.bodegaNombre;
        this.state.bodegaIndex = index;    
        this.state.rackSeleccionadoIndex = this.buscarRackPorId(bodega.rackId)
        const rack = this.state.rackTipos[this.state.rackSeleccionadoIndex];
        this.state.rackSeleccionadoAlmacenaje = rack[3];
        this.state.rackSeleccionadoCosto = bodega.rackSeleccionadoCosto;
        this.state.alturaBodega = bodega.alturaBodega;
        this.state.anchoBodega = bodega.anchoBodega;
        this.state.largoBodega = bodega.largoBodega;
        this.state.comentarios = bodega.comentarios;
        this.state.detalleRacks = [];
        this.state.detalleRacks = bodega.detalleRacks;
        this.state.sepParedArr = bodega.sepParedArr;
        this.state.sepParedAba = bodega.sepParedAba;
        this.state.sepParedIzq = bodega.sepParedIzq;
        this.state.sepParedDer = bodega.sepParedDer;
        this.state.racksOcupados = bodega.racksOcupados;
        this.calcularRacks();
    }
    crearBodegaLista(){
        this.guardarBodegaActual();
        const numero = (this.state.bodegas.length + 1)
        this.state.bodegas.push({
            minimoPasilloX: 50,
            minimoPasilloY: 50, 
            bodegaNombre: "bodega " + numero,
            rackSeleccionadoIndex: 0,
            rackSeleccionadoCosto: 0,
            racksOcupados: 0,
            alturaBodega: 1, 
            anchoBodega:0 ,
            largoBodega: 0, 
            comentarios: "",
            sepParedArr: 30,
            sepParedAba: 30,
            sepParedIzq: 30,
            sepParedDer: 30,
            detalleRacks: []
        });
        this.state.detalleRacks = []
        this.state.bodegaIndex = this.state.bodegas.length- 1; 
    }


    //hechos para cargar y guardar en la lista de bodegas[] hechos para cargar y guardar en la lista de bodegas[]
    guardarBodegaActual(){
        const idx = parseInt(this.state.rackSeleccionadoIndex, 10);
        const rackData = this.state.rackTipos[idx];
        const bodega ={ 
            minimoPasilloX : this.state.minimoPasilloX,
            minimoPasilloY : this.state.minimoPasilloY,     
            bodegaNombre: this.state.bodegaNombre,
            rackSeleccionadoIndex: this.state.rackSeleccionadoIndex,
            rackId: rackData ? rackData[4] : false, 
            rackSeleccionadoCosto: this.state.rackSeleccionadoCosto,
            alturaBodega: this.state.alturaBodega, 
            anchoBodega: this.state.anchoBodega, 
            largoBodega: this.state.largoBodega, 
            comentarios: this.state.comentarios,
            sepParedArr: this.state.sepParedArr,
            sepParedAba: this.state.sepParedAba,
            sepParedIzq: this.state.sepParedIzq,
            sepParedDer: this.state.sepParedDer,
            racksOcupados: this.state.racksOcupados,
            detalleRacks: this.state.detalleRacks,
        }
        this.state.bodegas[this.state.bodegaIndex] = bodega;
    }
  
    buscarRackPorId(id){
        if(id === 0){
            return;
        }
        const racks = this.state.rackTipos;
        for(let i = 0; i<racks.length; i++){
            const rackData = racks[i];   
            const rackId = rackData ? rackData[4] : false;
            if(rackId == id){
                return i;
            }
        }
        return 0;
    }

     async cargarBodegaDB(){
        try {
            const resultado = await this.orm.call(
                "rastreo.bodega_cliente",
                "obtener_bodega",
                [this.state.pedidoId]
            );
            if(resultado.success){
                this.state.ubicacion = resultado.data.ubicacion;
                const bodegas = resultado.data.bodegas
                this.state.bodegas = bodegas.map( b => {
                    return {
                        minimoPasilloX: 50,
                        minimoPasilloY: 50, 
                        bodegaNombre: b.nombre,
                        rackSeleccionadoIndex: this.buscarRackPorId(b.rack_id),
                        rackId: b.rack_id,
                        rackSeleccionadoCosto:b.costoRack,
                        alturaBodega:b.niveles,
                        anchoBodega:b.ancho,
                        largoBodega: b.largo,
                        comentarios: b.descripcion,
                        sepParedArr: b.separacion_arriba,    
                        sepParedAba: b.separacion_abajo, 
                        sepParedIzq: b.separacion_izquierda,
                        sepParedDer: b.separacion_derecha,
                        racksOcupados: b.racks_ocupados,
                        detalleRacks: b.detalle_racks.map((a,i) =>{
                            const costoTotal =  a.racks_ocupados * a.costo_rack;
                            const almacenajeTotal = ((a.almacenaje / 1000) * a.racks_ocupados); 
                            return{
                                numero: i+1,
                                rackClave: a.rack_clave,
                                rackNombre: a.rack_nombre,
                                rackId: a.rack_id,
                                almacenaje: (a.almacenaje / 1000),
                                productoId: 0,
                                precioUnitario: a.costo_rack,
                                cantidadRacks: a.racks_ocupados,
                                costoTotal: costoTotal,
                                almacenajeTotal: almacenajeTotal,
                                almacenajeTotalDisplay: almacenajeTotal.toFixed(3),
                                costoTotalDisplay: costoTotal.toFixed(2),
                            }
                            }) 
                    }
                });
                if (this.state.bodegas.length === 0) {
                        this.state.bodegas.push({
                            minimoPasilloX: 50,
                            minimoPasilloY: 50, 
                            bodegaNombre: "Bodega 1",
                            rackSeleccionadoIndex: 0,
                            rackSeleccionadoCosto: 0,
                            alturaBodega: 1, 
                            anchoBodega:0 ,
                            largoBodega: 0, 
                            comentarios: "",
                            sepParedArr: 30,
                            sepParedAba: 30,
                            sepParedIzq: 30,
                            sepParedDer: 30,
                            racksOcupados: 0,
                            detalleRacks: [],
                        });
                        this.state.bodegaIndex = 0; 
                    }
                    this.cargarBodega(0);
            }else{
                if (this.state.bodegas.length === 0) {
                        this.state.bodegas.push({
                            minimoPasilloX: 50,
                            minimoPasilloY: 50, 
                            bodegaNombre: "Bodega 1",
                            rackSeleccionadoIndex: 0,
                            rackSeleccionadoCosto: 0,
                            alturaBodega: 1, 
                            anchoBodega:0 ,
                            largoBodega: 0, 
                            comentarios: "",
                            sepParedArr: 30,
                            sepParedAba: 30,
                            sepParedIzq: 30,
                            sepParedDer: 30,
                            racksOcupados: 0,
                            detalleRacks: [],
                        });
                        this.state.bodegaIndex = 0; 
                    }
                    this.cargarBodega(0);
            }
        } finally {
            this.state.cargando = false;
        }
    }

    eliminarBodega(index, ev) {
        if (ev) ev.stopPropagation(); 

        if (this.state.bodegas.length <= 1) {
            this.notification.add("Debe haber al menos una bodega", { type: "warning" });
            return;
        } 
        this.state.bodegas.splice(index, 1);

        if (this.state.bodegaIndex >= this.state.bodegas.length) {
            this.state.bodegaIndex = this.state.bodegas.length - 1;
        }
        this.cargarBodega(this.state.bodegaIndex);
    }

   async cargarRacks(){
         try {
            const resultado = await this.orm.call(
                "rastreo.rack_detalle",
                "listar_racks",
            );
            if(resultado.success){
                this.state.rackTipos = resultado.data.map((r) => {
                return [r.nombre, r.medidas, r.precio_unitario, (r.almacenaje/1000), r.id];
                });
            }else{
               this.state.rackTipos = []
            }
        } finally {
            this.state.cargando = false;
        }
    }

    async onClickCambiarEstado(){
        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t("El cliente acepto la propuesta? ¿Desea continuar?"),
            confirm: async () => {
                this.guardarBodegaActual();
                const r1 = await this.onClickGuardar(true)
                if(r1.success === false){
                    this.notification.add("Ha habido un error al guardar", { type: "warning" });
                    return
                }
                const r = await this.guardarDetalle();
                if(r.success === false){
                    this.notification.add("Ha habido un error cambiar de estado", { type: "warning" });
                    return
                }
                await this.cambiarEstado();
                await this.action.doAction("rastreo_paquetes.action_pantalla_principal");
            },
            cancel: () => {
                return;
            },
        });
       
    }
    async onClickRegresar() {
        this.guardarBodegaActual();
        this.onClickGuardar();
        await this.action.doAction("rastreo_paquetes.action_pantalla_principal");
    }
    async guardarDetalle(){
        const pedidoId = this.state.pedidoId
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "guardar_detalle_cotizacion",
                [pedidoId]
            );
            return resultado
        } catch(e){
                this.notification.add(
                    e?.message || "Error al guardar detalle",
                    { type: "danger" }
                );
                return { success: false };
        }
    }
    async cambiarEstado(){
        const pedidoId = this.state.pedidoId
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "cambiar_estado",
                [pedidoId]
            );
            this.state.pedido = resultado.data ?? resultado;

        } finally {
            this.state.cargando = false;
        }
    }

    onRackChange(ev) {
        const idx = parseInt(ev.target.value, 10);
        this.state.rackSeleccionadoIndex = isNaN(idx) ? "" : idx;
        if (isNaN(idx)) {
            this.state.racksOcupados = 0;
            this.state.costoEstimado = "$0.00";
            this.state.rackSeleccionadoAlmacenaje = 0;
            return;
        }
        const [, , costo, almacenaje] = this.state.rackTipos[idx];
        this.state.rackSeleccionadoCosto = costo;
        this.state.rackSeleccionadoAlmacenaje = almacenaje;
        this.calcularRacks();
    }

    onClickCrearBodega(){
        this.guardarBodegaActual();
        this.crearBodegaLista();
    }
    onclickCambiarBodega(bodegaIndex){
        this.guardarBodegaActual();
        this.cargarBodega(bodegaIndex)
    } 
    async autoGuardado(){
        await onClickGuardar;
    }


    onCalcular(){
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        this.searchTimeout = setTimeout(() => {
            this.calcularRacks();
        }, 500);
    }

    async onEditarDetalleRacks(r) {     
        const fila = r || {
            numero: this.state.detalleRacks.length + 1,
            clave: '',
            rack_nombre: '',
            rack_id: false,
            costo_rack: 0,
            cantidad_racks: 1,
            total:0,
            almacenaje:0,
            almacenajeTotal: 0,
        };
        fila.pedidoId = this.state.pedidoId;
        this.dialogService.add(componente_detalle_racks,  {
                title: fila.numero === 0 ? _t("Nuevo Rack") : _t("Editar Rack"),
                objeto: fila,
                confirm: async (rEditado) => {
                    this.state.cambioRacks = true;
                    this.state.detalleRacks[rEditado.numero - 1] = rEditado;
                    this.state.detalleRacks = [...this.state.detalleRacks];
                    this.calcularRacks();
                },
                cancel: () => {
                }
        });
    }

    calcularRacks() {
        this.guardarBodegaActual()
        const idx = parseInt(this.state.rackSeleccionadoIndex, 10);
        if (isNaN(idx)) {
            this.notification.add("Primero selecciona un rack", { type: "warning" });
            return;
        }

        const separacionParedArr = this.state.sepParedArr / 100;
        const separacionParedAba = this.state.sepParedAba / 100;
        const separacionParedIzq = this.state.sepParedIzq / 100;
        const separacionParedDer = this.state.sepParedDer / 100;
    
        const separacionRack  = .15; 
        const minimoPasilloX = Number(this.state.minimoPasilloX) / 100 || 0; 
        const minimoPasilloY = Number(this.state.minimoPasilloY) / 100 || 0; 
        const anchoBodega  = Number(this.state.anchoBodega) || 0;
        const largoBodega  = Number(this.state.largoBodega) || 0;
        const altoBodega   = Number(this.state.alturaBodega) || 1;
        const costo        = Number(this.state.rackSeleccionadoCosto) || 0;
        const [, medidas]  = this.state.rackTipos[idx];
        const [anchoRackmm, largoRackmm] = medidas;

        if (!anchoBodega || !largoBodega) {
            this.notification.add("Ingresa ancho y largo de la bodega", { type: "warning" });
            return;
        }
        if (!costo) {
            this.notification.add("Ingresa un costo", { type: "warning" });
            return;
        }


        // convercion de mm a m  convercion de mm a m
        const anchoRackM = anchoRackmm / 1000; 
        const largoRackM  = largoRackmm / 1000; 

        const racksMathHor = ((anchoBodega - (separacionParedIzq + separacionParedDer + minimoPasilloY)) / (anchoRackM + separacionRack))+ .16 ;
        const racksMathVer = ((largoBodega - (separacionParedArr + separacionParedAba + minimoPasilloX)) / (largoRackM + separacionRack)) + .16  ;

        const porAncho = Math.max(0, Math.floor( racksMathHor ));
        const porLargo = Math.max(0, Math.floor( racksMathVer ));
        
      
        if (porAncho === 0 || porLargo === 0) {
            this.notification.add(
                "Con estas dimensiones y pasillos no cabe ningún rack.",
                { type: "warning" }
            );
            return;
        }


        let espacioSobranteHor = (anchoBodega - (separacionParedIzq + separacionParedDer) - ((anchoRackM + separacionRack) * (porAncho))) + separacionRack ;
        if(espacioSobranteHor < 0){ espacioSobranteHor = 0.00}
        this.state.anchoPasilloY = espacioSobranteHor;
        this.state.espacioSobranteHor = (espacioSobranteHor).toFixed(2);

        let espacioSobranteVer = (largoBodega - (separacionParedArr + separacionParedAba) - ((largoRackM  + separacionRack) * porLargo)) + separacionRack ;
        if(espacioSobranteVer < 0){ espacioSobranteVer = 0.00}
        this.state.anchoPasilloX = espacioSobranteVer;
        this.state.espacioSobranteVer = (espacioSobranteVer).toFixed(2);

        

        let racksOcupadosTotal = porAncho * porLargo * altoBodega;
        let costoEstimadoTotal = costo * racksOcupadosTotal;
        let almacenajeTotal = racksOcupadosTotal * Number(this.state.rackSeleccionadoAlmacenaje);

    for (let i = 0; i < this.state.detalleRacks.length; i++) {
        const r = this.state.detalleRacks[i];
        racksOcupadosTotal += Number(r.cantidadRacks) || 0;
        costoEstimadoTotal += Number(r.costoTotal) || 0;
        almacenajeTotal    += Number(r.almacenajeTotal) || 0;
    }

        this.state.racksOcupados = racksOcupadosTotal;
        this.state.costoEstimado = costoEstimadoTotal;
        this.state.almacenajeTonelada = almacenajeTotal;
        this.state.costoEstimadoDisplay = `$${costoEstimadoTotal.toFixed(2)}`;
        this.state.almacenajeToneladaDisplay = almacenajeTotal.toFixed(3);
        
        this.state.anchoRack      = anchoRackM;   // m
        this.state.largoRack      = largoRackM;   // m
        this.state.porAncho       = porAncho;
        this.state.porLargo       = porLargo;
        this.notification.add(
            `Cálculo actualizado: ${this.state.costoEstimado} (${this.state.racksOcupados} racks)`,
            { type: "success" }
        );
    }


    async onClickGuardar(cotizacion = false) {
        if (typeof cotizacion !== 'boolean') cotizacion = false;
        
        this.guardarBodegaActual();
        let altoBodega   = Number(this.state.alturaBodega) || 1;

        if(altoBodega < 1){
            altoBodega = 1;
        }
        
        const bodegas = this.state.bodegas.map((b, i) => { 
            const idx = parseInt(b.rackSeleccionadoIndex, 10);
            const rackData = this.state.rackTipos[idx];
            const rackId = rackData ? rackData[4] : false;
            return{
                descripcion:  b.comentarios,
                nombre: b.bodegaNombre,
                numero_bodega: i + 1,
                ancho:        Number(b.anchoBodega) || 0,
                largo:        Number(b.largoBodega) || 0,
                niveles:      Math.max(1, Math.round(Number(b.alturaBodega) || 1)),
                rack_id:      rackId,
                costoRack:    Number(b.rackSeleccionadoCosto) || 0,
                separacion_arriba :     Number(b.sepParedArr),
                separacion_abajo :      Number(b.sepParedAba),
                separacion_izquierda :  Number(b.sepParedIzq),
                separacion_derecha :    Number(b.sepParedDer),
                racks_ocupados:         Number(b.racksOcupados),
                detalle_adicional: b.detalleRacks.map((b, i) => { 
                    return{
                        numero: i+1,
                        costo_rack: b.precioUnitario,
                        almacenaje_rack: b.almacenaje * 1000, 
                        racks_ocupados: b.cantidadRacks,
                        rack_id: b.rackId,}})

                    }
        }); 
        

        const r = await this.orm.call(
            "rastreo.bodega_cliente", 
            "guardar_bodega",
            [
                this.state.pedidoId, 
                this.state.ubicacion, 
                bodegas,
                cotizacion
            ]
        );
        if(r.id != 0){
            this.notification.add( `Guardado exitoso `, { type: "success" });
            return r;
        }else{
            return r;
        }
    }

    
    async onGuardarCotizacion(){
                this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t("Esto guardara la propuesta en el modulo de cotizaciones"),
            confirm: async () => {
                await this.onClickGuardar(true)
            },
            cancel: () => {
                return;
            },
        });
    }
    // Descargar PDF ¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿
    async onClickDescargarPDF() {
        for (let i = 0; i < this.state.bodegas.length; i++) {
            const b = this.state.bodegas[i];
            if (!Number(b.anchoBodega) || !Number(b.largoBodega) || !Number(b.rackSeleccionadoCosto)) {
                this.notification.add(`${b.bodegaNombre}: faltan datos`, { type: "warning" });
                return;
            }else{
                this.guardarBodegaActual()
            }
        }

        this.guardarBodegaActual();
        await this.onClickGuardar();
     
        const { bodegas, costoEstimadoTotal } = this.convertirBodegasLista();
    

        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const formattedToday = `${dd}/${mm}/${yyyy}`;

        const datos = {
            bodegas: bodegas,                    
            costoEstimadoTotal: costoEstimadoTotal,
            ubicacion: this.state.ubicacion,
            clienteNombre: this.state.clienteNombre || '',
            fecha: formattedToday,
        };
        this.notification.add("Generando PDF, por favor espere...", { type: "info" });

        const result = await this.orm.call(
            "rastreo.bodega_cliente",
            "generar_pdf_croquis",
            [datos]
        );

        if (result?.file_content) {
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${result.file_content}`;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } else {
            this.notification.add("Error: no se logró generar el PDF", { type: "warning" });
        }
    }


    convertirBodegasLista() {
        let costoEstimadoTotal = 0;
        const bodegas = this.state.bodegas.map((b, i) => {
            const idx = parseInt(b.rackSeleccionadoIndex, 10);
            if (isNaN(idx) || !this.state.rackTipos[idx]) {
                return null; 
            }
            const nombre = b.bodegaNombre || '';
            const separacionRack  = 0.15;
            const anchoBodega     =     Number(b.anchoBodega)  || 0;
            const largoBodega     =     Number(b.largoBodega)  || 0;
            const altoBodega      =     Number(b.alturaBodega) || 1;
            const minimoPasilloX =      Number(this.state.minimoPasilloX) / 100 || .15; 
            const minimoPasilloY =      Number(this.state.minimoPasilloY) / 100 || .15; 
            const separacionParedArr =  (Number(b.sepParedArr) || 30)/ 100;
            const separacionParedAba =  (Number(b.sepParedAba) || 30)/ 100;
            const separacionParedIzq =  (Number(b.sepParedIzq) || 30)/ 100;
            const separacionParedDer =  (Number(b.sepParedDer) || 30)/ 100;
            
            console.log(separacionParedDer, separacionParedIzq, separacionParedAba, separacionParedArr )
            const [nombreRack, medidas, ,almacenajeRack] = this.state.rackTipos[idx];
            const [anchoRackmm, largoRackmm, altoRackmm] = medidas;

            const anchoRackM = anchoRackmm / 1000;
            const largoRackM = largoRackmm / 1000;

            const racksMathHor = ((anchoBodega - (separacionParedIzq + separacionParedDer + minimoPasilloY)) / (anchoRackM + separacionRack)) + 0.16;
            const racksMathVer = ((largoBodega - (separacionParedArr + separacionParedAba + minimoPasilloX)) / (largoRackM + separacionRack)) + 0.16;

            
            const porAncho       = Math.max(0, Math.floor(racksMathHor));
            const porLargo       = Math.max(0, Math.floor(racksMathVer));
            const racksOcupados  = porAncho * porLargo * altoBodega;
            const almacenaje = (racksOcupados * almacenajeRack).toFixed(3);
            const costoRack   = Number(b.rackSeleccionadoCosto) || 0;
            const costoBodega = costoRack * racksOcupados;
            costoEstimadoTotal += costoBodega;

            let espacioSobranteAncho = (anchoBodega - (separacionParedIzq + separacionParedDer) - (anchoRackM * porAncho) - (separacionRack * (porAncho)))+separacionRack;
            if(espacioSobranteAncho < 0){ espacioSobranteAncho = 0.00}
            const sobranteH = (espacioSobranteAncho ).toFixed(2);

            let espacioSobranteLargo = (largoBodega - (separacionParedArr + separacionParedAba) - ((largoRackM  + separacionRack) * (porLargo)))+separacionRack ;
            if(espacioSobranteLargo < 0){ espacioSobranteLargo = 0.00}
            const sobranteV = (espacioSobranteLargo ).toFixed(2);

            const layout = calcularLayoutCroquis({
                anchoBodega:  anchoBodega,
                largoBodega:  largoBodega,
                anchoRack:    anchoRackM,
                largoRack:    largoRackM,
                porAncho:     porAncho,
                porLargo:     porLargo,
                pasillosX:      0,
                pasillosY:      0,

                sepParedArr : Number(b.sepParedArr),
                sepParedAba : Number(b.sepParedAba),
                sepParedIzq : Number(b.sepParedIzq),
                sepParedDer : Number(b.sepParedDer),
                almacenaje : almacenaje
            });

            return {
                bodegaNombre : nombre,
                anchoBodega:   anchoBodega,
                largoBodega:   largoBodega,
                alturaBodega:  altoBodega,
                anchoRack:     anchoRackmm,
                largoRack:     largoRackmm,
                altoRack:      altoRackmm,

                sepParedArr : separacionParedArr,
                sepParedAba : separacionParedAba,
                sepParedIzq : separacionParedIzq,
                sepParedDer : separacionParedDer,
                almacenaje : almacenaje,

                sobranteH: sobranteH || 0,
                sobranteV: sobranteV || 0,
                porAncho:      porAncho,
                porLargo:      porLargo,
                racksOcupados: racksOcupados,

                costoRack:     costoRack,
                costoEstimado: costoBodega.toFixed(2),

                rackNombre:    nombreRack,
                descripcion:   b.comentarios || "",
                numero_bodega: i + 1,

                layout:        layout,
            };
        }).filter(Boolean);  

        return {
            bodegas: bodegas,
            costoEstimadoTotal: costoEstimadoTotal.toFixed(2),
        };
    }
    calcularLayoutParaPDF() {
        return calcularLayoutCroquis({
            anchoBodega:  this.state.anchoBodega,
            largoBodega:  this.state.largoBodega,
            anchoRack:    this.state.anchoRack,
            largoRack:    this.state.largoRack,
            porAncho:     this.state.porAncho,
            porLargo:     this.state.porLargo,
            pasillosX:    this.state.pasillosX,
            pasillosY:    this.state.pasillosY,
            anchoPasilloX: this.state.anchoPasilloX,
            anchoPasilloY: this.state.anchoPasilloY,
            sepParedArr : this.state.sepParedArr,
            sepParedAba : this.state.sepParedAba,
            sepParedIzq : this.state.sepParedIzq,
            sepParedDer : this.state.sepParedDer,
            almacenaje: this.state.rackSeleccionadoAlmacenaje,
        });
    }


}

PantallaCroquis.template = "rastreo_paquetes.pantalla_croquis";
registry.category("actions").add("rastreo_paquetes.pantalla_croquis", PantallaCroquis);