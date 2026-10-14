/** @odoo-module **/
import { Component, useRef, useState } from "@odoo/owl";

export class PdfUploader extends Component {
    static template = "rastreo_paquetes.PdfUploader";
    static props = {
        value: { type: String, optional: true },
        filename: { type: String, optional: true },
        onChange: { type: Function, optional: true },
        previewMaxWidth: { type: Number, optional: true },
    };
    static defaultProps = {
        value: "",
        filename: "",
        onChange: () => {},
        previewMaxWidth: 400,
    };

    setup() {
        this.inputRef = useRef("fileInput");
        this.state = useState({
            previewUrl: this.props.value
                ? `data:application/pdf;base64,${this.props.value}`
                : "",
            filename: this.props.filename || "",
        });
    }

    openFileDialog() {
        this.inputRef.el.click();
    }

    async onFileChange(ev) {
        const file = ev.target.files[0];
        if (!file) return;
        if (file.type !== "application/pdf") {
            alert("Solo se permiten archivos PDF");
            ev.target.value = "";
            return;
        }
        const base64 = await this.fileToBase64(file);
        this.state.previewUrl = `data:application/pdf;base64,${base64}`;
        this.state.filename = file.name;
        this.props.onChange(base64, file.name);
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(",")[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    clearFile() {
        this.state.previewUrl = "";
        this.state.filename = "";
        if (this.inputRef.el) this.inputRef.el.value = "";
        this.props.onChange("", "");
    }

    get hasFile() {
        return !!this.state.previewUrl;
    }
}