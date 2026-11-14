/** @odoo-module **/

export function calcularLayoutCroquis(props) {
    const anchoBodega  = Number(props.anchoBodega) || 0;
    const largoBodega  = Number(props.largoBodega) || 0;
    const anchoRack    = Number(props.anchoRack)   || 0;
    const largoRack    = Number(props.largoRack)   || 0;
    const porAncho     = Number(props.porAncho)    || 0;
    const porLargo     = Number(props.porLargo)    || 0;
    //Largo
    const separacionParedArr = Number(props.sepParedArr)/ 100 || .30;
    const separacionParedAba = Number(props.sepParedAba)/ 100 || .30;
    //Ancho
    const separacionParedIzq = Number(props.sepParedIzq)/ 100 || .30;
    const separacionParedDer = Number(props.sepParedDer)/ 100|| .30;
    if (!anchoBodega || !largoBodega || !porAncho || !porLargo) {
        return { valido: false, ancho: 0, largo: 0, racks: [], pasillos: [] };
    }
    const SEP_RACK  = 0.15;

    const espacioOcupadoRacksX = (porAncho * anchoRack) + ((porAncho - 1) * SEP_RACK);
    const espacioOcupadoRacksY = (porLargo * largoRack) + ((porLargo - 1) * SEP_RACK);
 
    let anchoPasilloX = 0;
    let anchoPasilloY = 0;
    
    if (porAncho > 1) {
        anchoPasilloX = (anchoBodega - (separacionParedIzq + separacionParedDer)) - (espacioOcupadoRacksX - SEP_RACK);
        if (anchoPasilloX < 0) anchoPasilloX = 0; 
    }

    if (porLargo > 1) {
        anchoPasilloY = (largoBodega - (separacionParedArr + separacionParedAba)) - (espacioOcupadoRacksY - SEP_RACK);
        if (anchoPasilloY < 0) anchoPasilloY = 0; 
    }

    const racksIzq = Math.ceil(porAncho / 2);
    const racksArr = Math.ceil(porLargo / 2);

    const anchoSVG = 800;
    const altoSVG  = 500;
    const padding  = 40;

    const areaW  = anchoSVG - (2 * padding);
    const areaH  = altoSVG  - (2 * padding);
    const escalaX = areaW / anchoBodega;
    const escalaY = areaH / largoBodega;
    const escala  = Math.min(escalaX, escalaY);

    const anchoDibujo = anchoBodega * escala;
    const largoDibujo = largoBodega * escala;
    const offsetX = padding + (areaW - anchoDibujo) / 2;
    const offsetY = padding + (areaH - largoDibujo) / 2;

    const racks = [];
    
    for (let i = 0; i < porAncho; i++) {
        for (let j = 0; j < porLargo; j++) {
            let sumPasilloX = (i >= racksIzq && porAncho > 1) ? (anchoPasilloX - SEP_RACK) : 0;
            let sumPasilloY = (j >= racksArr && porLargo > 1) ? (anchoPasilloY - SEP_RACK) : 0;

            const xm = separacionParedIzq + (i * (anchoRack + SEP_RACK)) + sumPasilloX;
            const ym = separacionParedArr + (j * (largoRack + SEP_RACK)) + sumPasilloY;

            racks.push({
                id: `r-${i}-${j}`,
                x: offsetX + xm * escala,
                y: offsetY + ym * escala,
                w: anchoRack * escala,
                h: largoRack * escala,
            });
        }
    }

    const pasillos = [];
    
    if (porAncho > 1) {
        const px = separacionParedIzq + (racksIzq * anchoRack) + ((racksIzq - 1) * SEP_RACK);
        pasillos.push({
            id: `px-central`,
            x: offsetX + px * escala,
             y: offsetY + separacionParedArr * escala, 
            w: anchoPasilloX * escala,
            h: (largoBodega - (separacionParedArr + separacionParedAba)) * escala, 
            orientacion: "vertical",
        });
    }

    if (porLargo > 1) {
        const py = separacionParedArr + (racksArr * largoRack) + ((racksArr - 1) * SEP_RACK);
        pasillos.push({
            id: `py-central`,
             x: offsetX + separacionParedIzq * escala,
            y: offsetY + py * escala,
            w: (anchoBodega - (separacionParedIzq + separacionParedDer)) * escala,
            h: anchoPasilloY * escala,
            orientacion: "horizontal",
        });
    }

    return {
        valido: true,
        ancho: anchoDibujo,
        largo: largoDibujo,
        offsetX,
        offsetY,
        racks,
        pasillos,
        anchoSVG,
        altoSVG,
        escala,
    };
}