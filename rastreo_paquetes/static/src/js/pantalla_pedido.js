/** @odoo-module **/
import { registry } from "@web/core/registry";
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

import { componente_detalle_proveedor } from "./componente_detalle_proveedor"
import { componente_detalle_racks } from "./componente_detalle_racks"
import { componente_detalle_cliente } from "./componente_detalle_cliente"
import { componente_subir_pdf } from "./componente_subir_pdf";
import { componente_rack_colores_escoger } from "./componente_rack_colores_escoger"; 
import { componente_terminos_condiciones} from "./componente_terminos_condiciones";
import { componente_detalle_eta } from "./componente_detalle_eta";
import { componente_terminos_cliente } from "./componente_terminos_cliente";
import { componente_escoger_proveedor } from "./componente_escoger_proveedor";
import { componente_cotizacion_aduana } from "./componente_cotizacion_aduana";
import { componente_confirmar_eliminar } from "./componente_confirmar_eliminar";

export class PantallaPedido extends Component {
    static components = { 
        componente_detalle_proveedor, 
        componente_detalle_racks, 
        componente_detalle_cliente, 
        componente_subir_pdf,
        componente_rack_colores_escoger,
        componente_terminos_condiciones,
        componente_detalle_eta,
        componente_terminos_cliente,
        componente_escoger_proveedor,
        componente_confirmar_eliminar,
    };
    setup() {
        this.action = useService("action");
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialogService = useService("dialog")
        this.state = useState({
            // Valores "Generales"
            pedidoId: 0,
            nombre: "",
            guia: "",
            origen: "",
            destino: "",
            guiaConfirmada: "",
            clienteId: 0,
            clienteNombre: "",
            proveedorId: 0,
            proveedorNombre: "",

            estado: "",
            cambioRacks: false,
            
            // Listas de detalles
            detalleRacks:[],
            detalleCliente: [],
            detalleProveedor: [],
            actualizaciones: [],
            terminos: [],
            listaEtas: [],
            terminosCliente: [],

            contenedores : 0,
            //bool de PDF
            forwarder: false,
            PDFBL: false,
            PDFPL: false,
            PDFInvoice: false,
            pdfContratoProveedor:false,
            pdfFacturaProveedor: false,
            PDFETA: false,
            PDFETD: false,
            pdfPrefactura: false,
            pdfAviso:false,
            salidaAduana: false,
            pdfCotizacionAduana: false,

            // Monedas
            totalProveedor: 0,
            totalCliente: 0,
            totalAnticiposCliente: 0,
            totalAnticiposProveedor: 0,
            cotizacionAduana:0,
            cotizacionAduanaCostoDolar: 0,
    
            proveedorCostoDolar: 0,
            clienteCostoDolar: 0,

            totalClienteFmt: "$ 0.00",
            totalClienteMxnFmt: "$ 0.00",
            totalAnticiposClienteFmt: "$ 0.00",
            totalAnticiposClienteMxnFmt: "$ 0.00",
            totalProveedorFmt: "$ 0.00",
            totalProveedorMxnFmt: "$ 0.00",
            totalAnticiposProveedorFmt: "$ 0.00",
            totalAnticiposProveedorMxnFmt: "$ 0.00",
            balanceClienteMxn: "$ 0.00",
            balanceProveedorMxn: "$ 0.00",
            
            cotizacionAduanaFmt: "$ 0.00",
            cotizacionAduanaMxnFmt: "$ 0.00",

            balanceCliente : "",
            balancePorcentajeProveedor: "",
            balanceProveedor: "",
            balancePorcentajeCliente: "",

            numeroContrato: "",
            
            cargando: false,

            // fechas
            ETA: "",
            ETD: "",
            CRD: "",
            fecha_compromiso_proveedor_1 : "",
            fecha_compromiso_proveedor_3 : "",
            fecha_compromiso_proveedor_2 : "",
            fecha_compromiso_proveedor_4 : "",
            
            fecha_compromiso_cliente_1 : "",
            fecha_compromiso_cliente_2 : "",
            fecha_compromiso_cliente_3 : "",
            fecha_compromiso_cliente_4 : "",
            
        });
        onWillStart(async () => {
            if (this.props.action && this.props.action.params) {
                const pedidoId = this.props.action.params.pedido_id || null;
                this.state.pedidoId = pedidoId;
                await this.cargarPedido()
            }
        });
        this.searchTimeout = null;
    }
 
    async cargarPedido() {
        const pedidoId = this.state.pedidoId;
        this.state.cargando = true;
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "cargar_pedido",
                [pedidoId]
            );

            if (!resultado.success) {
                this.notification.add("No se pudo cargar el pedido", { type: "danger" });
                return;
            }

            const p = resultado.data;
            const fmt = (n) => {
                const num = Number(n) || 0;
                return num.toLocaleString('es-MX', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
            };
            const fmtMoney = (n) => {
                const num = Number(n) || 0;
                return "$ " + num.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
            };
            const toNum = (n) => Number(n) || 0;

            this.state.guia = p.numero_guia || '';
            this.state.guiaConfirmada = p.numero_guia || '';
            this.state.estado = p.estado || '';
            this.state.clienteId = p.cliente_id || 0;
            this.state.clienteNombre = p.cliente_nombre || '';
            this.state.proveedorId = p.proveedor_id || 0;
            this.state.proveedorNombre = p.proveedor_nombre || '';

            this.state.origen = p.origen || '';
            this.state.destino = p.destino || '';

            this.state.numeroContrato = p.numero_contrato || '';
            this.state.salidaAduana = !!p.salida_aduana;

            const totalCliUsd = toNum(p.total_cliente);
            const totalProvUsd = toNum(p.total_proveedor);
            const tcCliente = toNum(p.total_cliente_costo_dolar);
            const tcProveedor = toNum(p.total_proveedor_costo_dolar) || tcCliente;
            const cotAduanaUsd = toNum(p.cotizacion_aduana);
            const tcAduana = toNum(p.cotizacion_aduana_costo_dolar) || tcCliente;

            this.state.totalProveedor = totalProvUsd.toFixed(2);
            this.state.totalCliente = totalCliUsd.toFixed(2);
            this.state.proveedorCostoDolar = tcProveedor;
            this.state.clienteCostoDolar = tcCliente;
            this.state.contenedores = toNum(p.contenedores);
            this.state.cotizacionAduana = cotAduanaUsd;
            this.state.cotizacionAduanaCostoDolar = tcAduana;
            this.state.pdfCotizacionAduana = !!p.pdf_cotizacion_aduana;

            this.state.forwarder = !!p.forwarder;
            this.state.pdfContratoProveedor = !!p.bool_contrato_proveedor;
            this.state.pdfFacturaProveedor = !!p.bool_factura_proveedor;
            this.state.pdfBL = !!p.pdf_BL;
            this.state.pdfPL = !!p.pdf_PL;
            this.state.pdfInvoice = !!p.pdf_invoice;
            this.state.pdfPrefactura = !!p.pdf_prefactura;
            
            this.state.pdfAviso = !!p.pdf_aviso;
            this.state.pdfFlete = !!p.pdf_flete;
            this.state.pdfEvidenciaEntregado = !!p.pdf_evidencia_entregado;

            this.state.actualizaciones = (p.actualizaciones || []).map((a) => ({
                id: a.id,
                numero_actualizacion: a.numero_actualizacion,
                fecha: a.fecha || '',
                texto: a.texto || '',
                usuario: a.usuario || '',
            }));

            this.state.detalleRacks = (p.detalle_racks || []).map((d, i) => {
                const costo = toNum(d.precio);
                const cantidad = toNum(d.cantidad);
                const subtotal = costo * cantidad;
                return {
                    id: d.id,
                    colorId: d.color_id,
                    colorHex: d.color_hex,
                    colorClave: d.color_clave,
                    numero: i + 1,
                    costo_rack_raw: costo,
                    costo_rack: fmt(costo),
                    rack_id: d.rack_id || 0,
                    rack_nombre: d.nombre || '',
                    cantidad_racks: cantidad,
                    subtotal_raw: subtotal,
                    subtotal: fmt(subtotal),
                };
            });

            const pagos = p.lista_pagos_cliente || [];
            let totalAnticiposCliente = 0;
            let totalAnticiposClienteMxn = 0;

            this.state.detalleCliente = pagos.map((d, index) => {
                const monto = toNum(d.monto);
                const precioDolar = toNum(d.precio_dolar);
                const montoMxn = toNum(d.monto_mxn) || (monto * precioDolar);
                totalAnticiposCliente += monto;
                totalAnticiposClienteMxn += montoMxn;
                return {
                    crearEditar: "Editar",
                    paymentId: d.payment_id,
                    anticipoId: d.detalle_id || d.anticipo_id || 0,
                    numero: d.numero || (index + 1),
                    tipo: d.tipo_registro || 'pago',
                    referencia: d.referencia || '',
                    factura: d.factura || '',
                    diario: d.diario || '',
                    moneda: d.moneda || '',
                    fechaEdicion: d.fecha_editado || '',
                    fechaAnticipo: d.fecha || '',
                    estado: d.estado || '',
                    monto_raw: monto,
                    monto: fmt(monto),
                    cantidadAnticipo: monto,
                    precioDolar: precioDolar,
                    precioDolar_fmt: fmt(precioDolar),
                    montoMxn_raw: montoMxn,
                    montoMxn: fmt(montoMxn),
                    PDFAnticipo: !!d.pdf_anticipo_cliente,
                };
            });

            this.state.terminos = p.terminos.map((t) => { 
                let cantidadMonto = 0;
                if (this.state.totalProveedor != 0) {
                    cantidadMonto = (this.state.totalProveedor / 100) * t.porcentaje;
                }
                return {
                    numero: t.numero,
                    nombre: t.texto || "",
                    porcentaje: t.porcentaje,
                    cantidad: cantidadMonto,
                    fecha_compromiso: t.fecha_compromiso || "" 
                };
            });

            this.state.totalAnticiposCliente = totalAnticiposCliente.toFixed(2);
            
            const anticiposProv = p.lista_anticipos_proveedor || [];
            let totalAnticiposProveedor = 0;
            let totalAnticiposProveedorMxn = 0;

            this.state.detalleProveedor = anticiposProv.map((d) => {
                const cantidad = toNum(d.cantidad);
                const precioDolar = toNum(d.precio_dolar);
                const montoMxn = toNum(d.monto_mxn) || (cantidad * precioDolar);
                totalAnticiposProveedor += cantidad;
                totalAnticiposProveedorMxn += montoMxn;
                return {
                    anticipoId: d.anticipo_id,
                    numero: d.numero || 0,
                    fechaEdicion: d.fecha_editado || '',
                    fechaAnticipo: d.fecha_anticipo || '',
                    cantidadAnticipo: cantidad,
                    referencia: d.referencia || '',
                    journalId: d.journal_id || 0,
                    journalNombre: d.journal_nombre || '',
                    cantidadAnticipo_fmt: fmt(cantidad),
                    precioDolar: precioDolar,
                    precioDolar_fmt: fmt(precioDolar),
                    PDFAnticipo: !!d.pdf_anticipo_proveedor,
                };
            });
            this.state.totalAnticiposProveedor = totalAnticiposProveedor.toFixed(2);

            // Totales y balances formateados en USD y MXN
            const totalClienteMxn = totalCliUsd * tcCliente;
            const totalProveedorMxn = totalProvUsd * tcProveedor;
            const cotAduanaMxn = cotAduanaUsd * tcAduana;

            const balanceC = totalCliUsd - totalAnticiposCliente;
            const balanceCMxn = totalClienteMxn - totalAnticiposClienteMxn;
            const balanceP = totalProvUsd - totalAnticiposProveedor;
            const balancePMxn = totalProveedorMxn - totalAnticiposProveedorMxn;

            const porC = totalCliUsd > 0 ? (totalAnticiposCliente * 100) / totalCliUsd : 0;
            const porP = totalProvUsd > 0 ? (totalAnticiposProveedor * 100) / totalProvUsd : 0;

            this.state.totalClienteFmt = fmtMoney(totalCliUsd);
            this.state.totalClienteMxnFmt = fmtMoney(totalClienteMxn);

            this.state.totalAnticiposClienteFmt = fmtMoney(totalAnticiposCliente);
            this.state.totalAnticiposClienteMxnFmt = fmtMoney(totalAnticiposClienteMxn);

            this.state.totalProveedorFmt = fmtMoney(totalProvUsd);
            this.state.totalProveedorMxnFmt = fmtMoney(totalProveedorMxn);

            this.state.totalAnticiposProveedorFmt = fmtMoney(totalAnticiposProveedor);
            this.state.totalAnticiposProveedorMxnFmt = fmtMoney(totalAnticiposProveedorMxn);

            this.state.balanceCliente = fmtMoney(balanceC);
            this.state.balanceClienteMxn = fmtMoney(balanceCMxn);
            this.state.balancePorcentajeCliente = fmt(porC) + " %";

            this.state.balanceProveedor = fmtMoney(balanceP);
            this.state.balanceProveedorMxn = fmtMoney(balancePMxn);
            this.state.balancePorcentajeProveedor = fmt(porP) + " %";

            this.state.cotizacionAduanaFmt = fmtMoney(cotAduanaUsd);
            this.state.cotizacionAduanaMxnFmt = fmtMoney(cotAduanaMxn);

            // Fechas
            this.state.CRD = p.CRD || '';
            this.state.fecha_creacion = p.fecha_creacion || '';
            this.state.ETA = p.ETA || '';
            this.state.ETD = p.ETD || '';
            this.state.fecha_termino_produccion = p.fecha_termino_produccion || '';

            this.state.fecha_compromiso_cliente_1 = p.fecha_compromiso_cliente_1 || '';
            this.state.fecha_compromiso_cliente_2 = p.fecha_compromiso_cliente_2 || '';
            this.state.fecha_compromiso_cliente_3 = p.fecha_compromiso_cliente_3 || '';
            this.state.fecha_compromiso_cliente_4 = p.fecha_compromiso_cliente_4 || '';

            this.state.listaEtas = (p.lista_etas || []).map((e, index) => ({
                id: e.id || 0,
                numero: e.numero || (index + 1),
                fecha: e.fecha || '',
                texto: e.texto || '',
            }));

            this.state.aviso = p.aviso || [];

            const totalCliNum = toNum(this.state.totalCliente);
            const definicionesCliente = [
                {
                    numero: 1,
                    nombreDefecto: "Fecha 1",
                    porcentaje: toNum(p.pago_compromiso_cliente_1),
                    fecha: p.fecha_compromiso_cliente_1 || '',
                    campoFecha: 'fecha_compromiso_cliente_1',
                },
                {
                    numero: 2,
                    nombreDefecto: "Anticipo 2",
                    porcentaje: toNum(p.pago_compromiso_cliente_2),
                    fecha: p.fecha_compromiso_cliente_2 || '',
                    campoFecha: 'fecha_compromiso_cliente_2',
                },
                {
                    numero: 3,
                    nombreDefecto: "Anticipo 3",
                    porcentaje: toNum(p.pago_compromiso_cliente_3),
                    fecha: p.fecha_compromiso_cliente_3 || '',
                    campoFecha: 'fecha_compromiso_cliente_3',
                },
                {
                    numero: 4,
                    nombreDefecto: "Balance",
                    porcentaje: toNum(p.pago_compromiso_cliente_4),
                    fecha: p.fecha_compromiso_cliente_4 || '',
                    campoFecha: 'fecha_compromiso_cliente_4',
                },
            ];

            this.state.terminosCliente = definicionesCliente
                .filter((item) => item.porcentaje > 0 || item.fecha)
                .map((item) => {
                    const cantidadMonto = totalCliNum !== 0
                        ? parseFloat(((totalCliNum / 100) * item.porcentaje).toFixed(2))
                        : 0;
                    return {
                        numero: item.numero,
                        nombre: item.nombreDefecto,
                        porcentaje: item.porcentaje,
                        cantidad: cantidadMonto,
                        fecha_compromiso: item.fecha,
                        campoFecha: item.campoFecha,
                    };
                });
         
        } catch (e) {
            this.notification.add("Error al cargar el pedido", { type: "danger" });
            console.log(e);
        } finally {
            this.state.cargando = false;
        }
    }

    async onClickCambiarEstado(){

        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t("Esta acción no se podra deshacer"),
            confirm: async () => {
                await this.cambiarEstado();
            },
            cancel: () => {
                return;
            },
        });
       
    }
    async onClickRegresar() {
        await this.onGuardarDetalleGeneral();
        await this.action.doAction("rastreo_paquetes.action_pantalla_principal");
    }

    async cambiarEstado(){
        const pedidoId = this.state.pedidoId;
        this.state.cargando = true;
        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "cambiar_estado",
                [pedidoId]
            );
            this.state.pedido = resultado.data ?? resultado;
            if(resultado.success){
                await this.cargarPedido()
            }else{
                
            }
        }catch(e){
            console.log(e)
        } finally {
            this.state.cargando = false;
        }
    }

  
    async autoGuardado(){
        await onClickGuardar;
    }

    async onClickGuardar() {
        await this.guardarDetalleGeneral();
    }


    async onEditarDetalleRacks(r) {    
        const fila = r || {
            numero: this.state.detalleRacks.length + 1,
            rackNombre: '',
            rackId: false,
            precioUnitario: 0,
            cantidadRacks: 1,
            costoTotal: 0,
            colorId: false,
            colorHex: "#cccccc",
            colorClave: "",
        };
        fila.pedidoId = this.state.pedidoId;
        this.dialogService.add(componente_detalle_racks, {
                title: fila.numero === 0 ? _t("Nuevo Rack") : _t("Editar Rack"),
                objeto: fila,
                confirm: async (rEditado) => {
                    this.state.cambioRacks = true;
                    if(rEditado.numero == 0){
                        rEditado.numero = this.state.detalleRacks.length;
                        this.state.detalleRacks.push(rEditado);
                    }else{
                        this.state.detalleRacks[rEditado.numero - 1] = rEditado;
                    }
                    this.state.detalleRacks = [...this.state.detalleRacks];
                },
                cancel: () => {}
        });
    }

    async onEditarDetalleCliente(d) {
        const esCargar = d === "cargar";
        let objetoModal;

        if (!d || esCargar) {
            objetoModal = {
                crearEditar: esCargar ? "Cargar" : "Crear",
                modoVinculo: esCargar ? "vincular" : "crear",
                anticipoId: 0,
                pedidoId: this.state.pedidoId,
                numero: this.state.detalleCliente.length + 1,
                fechaEdicion: "",
                fechaAnticipo: "",
                cantidadAnticipo: 0.0,
                precioDolar: 0.0,
                tipo: "pago",
                PDFAnticipo: null,
            };
        } else {
            objetoModal = {
                ...d,
                crearEditar: "Editar",
                modoVinculo: "crear",
                pedidoId: this.state.pedidoId,
            };
        }

        this.dialogService.add(componente_detalle_cliente, {
            title: "Confirmación",
            objeto: objetoModal,
            confirm: async () => {
                await this.cargarPedido();
            },
            cancel: () => {},
        });
    }

    async onEditarColorRack(r) {
        this.dialogService.add(componente_rack_colores_escoger, {
            confirm: (colorSeleccionado) => {
                r.colorId = colorSeleccionado.id;
                r.colorHex = colorSeleccionado.color_hex;
                r.colorClave = colorSeleccionado.clave;
                
                this.state.cambioRacks = true;
                this.state.detalleRacks = [...this.state.detalleRacks];
                
                this.notification.add("Color actualizado correctamente.", { type: "success" });
            },
            cancel: () => {}
        });
    }


    async onEditarDetalleProveedor(d) {
        const esCargar = d === "cargar";
        let objetoModal;

        if (!d || esCargar) {
            objetoModal = {
                crearEditar: esCargar ? "Cargar" : "Crear",
                modoVinculo: esCargar ? "vincular" : "crear",
                anticipoId: 0,
                pedidoId: this.state.pedidoId,
                numero: this.state.detalleProveedor.length + 1,
                fechaEdicion: "",
                fechaAnticipo: "",
                cantidadAnticipo: 0.0,
                precioDolar: 0.0,
                PDFAnticipo: null,
            };
        } else {
            objetoModal = {
                ...d,
                crearEditar: "Editar",
                modoVinculo: "crear",
                pedidoId: this.state.pedidoId,
            };
        }

        this.dialogService.add(componente_detalle_proveedor, {
            title: "Confirmación",
            objeto: objetoModal,
            confirm: async () => {
                await this.cargarPedido();
            },
            cancel: () => {},
        });
    }

    async onEditarDetalleEta(eta) {
        const esCrear = !eta;
        const objetoModal = esCrear
            ? {
                crearEditar: "Crear",
                id: 0,
                pedidoId: this.state.pedidoId,
                numero: this.state.listaEtas.length + 1,
                fecha: "",
                texto: "",
            }
            : {
                ...eta,
                crearEditar: "Editar",
                pedidoId: this.state.pedidoId,
            };

        this.dialogService.add(componente_detalle_eta, {
            title: esCrear ? _t("Agregar Nueva ETA") : _t("Editar ETA"),
            objeto: objetoModal,
            confirm: async (etaGuardada) => {
                if (esCrear) {
                    await this.cargarPedido();
                } else {
                    const idx = this.state.listaEtas.findIndex(
                        (item) => item.numero === etaGuardada.numero
                    );
                    if (idx !== -1) {
                        this.state.listaEtas[idx] = {
                            ...this.state.listaEtas[idx],
                            fecha: etaGuardada.fecha,
                            texto: etaGuardada.texto,
                        };
                        this.state.listaEtas = [...this.state.listaEtas];
                    }
                    await this.onGuardarDetalleGeneral();
                }
            },
            cancel: () => {},
        });
    }   

    async onVerificarForwarder(ev) {
        const valorAnterior = this.state.forwarder;
        const nuevoValor = ev.target.checked;

        ev.target.checked = valorAnterior;

        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: nuevoValor
                ? _t("¿Ya consiguió el forwarder?")
                : _t("¿Deseas desmarcar el forwarder?"),
            confirm: () => {
                this.state.forwarder = nuevoValor;
                ev.target.checked = nuevoValor;
            },
            cancel: () => {
                this.state.forwarder = valorAnterior;
                ev.target.checked = valorAnterior;
            },
        });
    }

    async onVerificarSalidaAduana(ev) {
        const valorAnterior = this.state.salidaAduana;
        const nuevoValor = ev.target.checked;

        ev.target.checked = valorAnterior;

        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: nuevoValor
                ? _t("¿Ya salió de la Agencia Aduanal?")
                : _t("¿Deseas desmarcar la salida de Aduana?"),
            confirm: () => {
                this.state.salidaAduana = nuevoValor;
                ev.target.checked = nuevoValor;
            },
            cancel: () => {
                this.state.salidaAduana = valorAnterior;
                ev.target.checked = valorAnterior;
            },
        });
    }


    async onVerificarFecha(ev) {
        const campo = ev.target.dataset.field;
        const nuevoValor = ev.target.value;
        const valorAnterior = this.state[campo];

        if (!campo) {
            return;
        }

        if (!valorAnterior) {
            this.state[campo] = nuevoValor;
            return;
        }

        if (nuevoValor === valorAnterior) {
            return;
        }

        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t("¿Estás seguro de cambiar la fecha? La fecha anterior es: ") + valorAnterior,
            confirm: async () => {
                this.state[campo] = nuevoValor;
                await this.onGuardarDetalleGeneral();
            },
            cancel: () => {
                ev.target.value = valorAnterior;
            },
        });
    }

    async onCambiarCotizacion (){
        const guiaActual = this.state.guia; 

        const guiaConfirmada = this.state.guiaConfirmada;
        if (!guiaConfirmada) {
            this.state.guiaConfirmada = guiaActual;
        }
        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t("Esta acción no se podrá deshacer. ¿Deseas cambiar la cotización?"),
            confirm: async () => {
                this.state.cargando = true;
                try {
                    const resultado = await this.orm.call(
                        "rastreo.pedido",
                        "buscar_cotizacion",
                        [guiaActual] 
                    );
                    if(resultado.success){
                        const c = resultado.cotizacion_info;
                        this.state.guiaActual =  c.nombre;         
                        this.state.clienteNombre = c.cliente;
                        this.state.clienteId = c.cliente_id;
                        this.state.totalCliente = c.total;
                        this.state.fechaCreacion = c.fecha;
                        const l = resultado.data;
                        this.state.detalleRacks = l.map((d,i)=> {
                            return{
                                clave: d.codigo,
                                numero: i + 1,
                                costo_rack: d.precio, 
                                rack_id: d.rack_id,
                                rack_nombre: d.nombre,
                                cantidad_racks: d.cantidad,
                                total: d.subtotal
                            }
                        })
                        this.state.cambioRacks = true; 
                        this.notification.add("Cotización cambiada Exitosamente",{ type: "success" });               
                    }
                } catch (error) {
                    this.notification.add("Hubo un error",{ type: "danger" });
                } finally {
                    this.state.cargando = false;
                    this.state.guiaActual = guiaActual; 
                }
            },
            cancel: () => {
                console.log(this.state.guia , guiaConfirmada)
                this.state.guia = guiaConfirmada; 
                return 
            },
        });
    }
    
    async onGuardarDetalleGeneral(){
        if(!this.state.pedidoId){
            return
        }

        const datos = {
            cliente_id: this.state.clienteId,
            proveedor_id: this.state.proveedorId || false,


            cambio_racks: this.state.cambioRacks,

            //bool de PDF
            forwarder: this.state.forwarder,
            salida_aduana: this.state.salidaAduana,

            pdf_BL: this.state.pdf_BL,
            pdf_PL: this.state.pdf_PL,
            pdf_invoice: this.state.pdf_invoice,
            pdf_contrato_proveedor:this.state.pdfContratoProveedor,
            pdfFacturaProveedor: this.state.pdfFacturaProveedor,

            total_proveedor: this.state.totalProveedor,
            total_cliente: this.state.totalCliente,
            
            total_proveedor_costo_dolar:this.state.proveedorCostoDolar,
            total_cliente_costo_dolar: this.state.clienteCostoDolar,

            contenedores : this.state.contenedores,
            racks_acordados: 0,
            CRD: this.state.CRD,
            fecha_creacion : this.state.fecha_creacion,
            ETD : this.state.ETD,
            etas: this.state.listaEtas,
            fecha_termino_produccion: this.state.fecha_termino_produccion,
           
            fecha_compromiso_cliente_1:this.state.fecha_compromiso_cliente_1,
            fecha_compromiso_cliente_2:this.state.fecha_compromiso_cliente_2,
            fecha_compromiso_cliente_3:this.state.fecha_compromiso_cliente_3,
            fecha_compromiso_cliente_4:this.state.fecha_compromiso_cliente_4,

            terminos: this.state.terminos,
        }
        const pedido_id = this.state.pedidoId;
        const detalle_pedido = this.state.detalleRacks.map(d => ({
            ...d,
            color_id: d.colorId || false
        }));

        try {
            const resultado = await this.orm.call(
                "rastreo.pedido",
                "actualizar_pedido",
                [ pedido_id, 
                detalle_pedido, 
                datos] 
            );
            if(resultado.success){
                this.notification.add("Información guardada Exitosamente",{ type: "success" });  
                
            }
            await this.cargarPedido()
        } catch (e) {
            this.notification.add("Hubo un error",{ type: "danger" });     
            console.log(e) 
        } finally {
            this.state.cargando = false;
        }        
    }
    async verPDF(documentoNombre){
        if(!documentoNombre){
            return;
        }
        const objeto = {
            pedidoId:       this.state.pedidoId,
            documentoNombre:documentoNombre
        }
        this.dialogService.add(componente_subir_pdf,  {
            title: "Confirmación",
            objeto: objeto,
            confirm: async (documento) => {
                await this.cargarPedido()
            },
            cancel: () => {
            }
        });
    }

    async terminosCondiciones(documentoNombre){
        if(!documentoNombre){
            return;
        }
        const objeto = {
            pedidoId: this.state.pedidoId,
            documentoNombre: documentoNombre,
            pdfContratoProveedor: this.state.pdfContratoProveedor,
            terminos: this.state.terminos,
            totalProveedor: this.state.totalProveedor,
            numeroContrato: this.state.numeroContrato,
            origen: this.state.origen,
            destino: this.state.destino,
            ETD: this.state.ETD,
        };
        this.dialogService.add(componente_terminos_condiciones, {
            title: "Confirmación",
            objeto: objeto,
            confirm: async (terminos, totalProveedor, datosExtra) => {
                if (datosExtra) {
                    this.state.origen = datosExtra.origen ?? this.state.origen;
                    this.state.destino = datosExtra.destino ?? this.state.destino;
                    this.state.ETD = datosExtra.ETD ?? this.state.ETD;
                }
                await this.onGuardarDetalleGeneral();
            },
            cancel: () => {}
        });
    }

    async onEscogerProveedor() {
        this.dialogService.add(componente_escoger_proveedor, {
            proveedorActualId: this.state.proveedorId,
            confirm: async (proveedorSeleccionado) => {
                this.state.proveedorId = proveedorSeleccionado.id;
                this.state.proveedorNombre = proveedorSeleccionado.nombre;
                await this.onGuardarDetalleGeneral();
            },
            cancel: () => {},
        });
    }

    async terminosCondicionesCliente(){
        const objeto = {
            pedidoId: this.state.pedidoId,
            totalCliente: this.state.totalCliente,
            terminos: this.state.terminosCliente || [], 
        }
        this.dialogService.add(componente_terminos_cliente, {
            title: "Términos de Pago Cliente",
            objeto: objeto,
            confirm: async () => {
                await this.cargarPedido();
            },
            cancel: () => {}
        });
    }

    async onVerificarFechaTermino(index, ev) {
        const nuevoValor = ev.target.value;
        const termino = this.state.terminos[index];
        const valorAnterior = termino.fecha_compromiso || "";

        if (nuevoValor === valorAnterior) {
            return;
        }
        
        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t("¿Estás seguro de cambiar la fecha de este término? La fecha anterior es: ") + (valorAnterior || "Ninguna"),
            confirm: async () => {
                termino.fecha_compromiso = nuevoValor;
                await this.onGuardarDetalleGeneral();
            },
            cancel: () => {
                ev.target.value = valorAnterior;
            },
        });
    }


    async onVerificarFechaTerminoCliente(index, ev) {
        const nuevoValor = ev.target.value;
        const termino = this.state.terminosCliente[index];
        if (!termino) {
            return;
        }
        const valorAnterior = termino.fecha_compromiso || "";

        if (nuevoValor === valorAnterior) {
            return;
        }

        this.dialogService.add(ConfirmationDialog, {
            title: _t("¿Estás seguro?"),
            body: _t("¿Estás seguro de cambiar la fecha de este término? La fecha anterior es: ") + (valorAnterior || "Ninguna"),
            confirm: async () => {
                termino.fecha_compromiso = nuevoValor;
                if (termino.campoFecha) {
                    this.state[termino.campoFecha] = nuevoValor;
                }
                await this.onGuardarDetalleGeneral();
            },
            cancel: () => {
                ev.target.value = valorAnterior;
            },
        });
    }

    async abrirCotizacionAduana() {
        this.dialogService.add(componente_cotizacion_aduana, {
            objeto: {
                pedidoId: this.state.pedidoId,
                documentoNombre: "pdf_cotizacion_aduana",
                cotizacionAduana: this.state.cotizacionAduana,
                cotizacionAduanaCostoDolar: this.state.cotizacionAduanaCostoDolar,
                tienePdf: this.state.pdfCotizacionAduana,
            },
            confirm: async () => {
                await this.cargarPedido();
            },
            cancel: () => {},
        });
    }
    onClickEliminarPedido() {
        if (!this.state.pedidoId) {
            return;
        }

        this.dialogService.add(componente_confirmar_eliminar, {
            numeroContrato: this.state.numeroContrato,
            guia: this.state.guia,
            confirm: async () => {
                await this.eliminarPedido();
            },
        });
    }

async eliminarPedido() {
    const pedidoId = this.state.pedidoId;
    this.state.cargando = true;
    try {
        const resultado = await this.orm.call(
            "rastreo.pedido",
            "eliminar_pedido",
            [pedidoId]
        );

        if (resultado && resultado.success) {
            this.notification.add("Pedido eliminado correctamente", {
                type: "success",
            });
            // Regresamos directo sin llamar a onGuardarDetalleGeneral() porque el registro ya no existe
            await this.action.doAction("rastreo_paquetes.action_pantalla_principal");
        } else {
            this.notification.add(
                resultado?.error || "No se pudo eliminar el pedido",
                { type: "danger" }
            );
        }
    } catch (e) {
        console.error(e);
        this.notification.add("Error al eliminar el pedido", {
            type: "danger",
        });
    } finally {
        this.state.cargando = false;
    }
}
}

PantallaPedido.template = "rastreo_paquetes.pantalla_pedido";
registry.category("actions").add("rastreo_paquetes.pantalla_pedido", PantallaPedido);