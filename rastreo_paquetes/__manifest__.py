{
    'name': "Logística",
    'summary': "Modulo para el seguimiento de paquetes",
    'description': """
    Modulo para el seguimiento de paquetes en el cual el usuario podra editar,
    visualizar y recibir notificaciones de paquetes
    """,
    'author': "Jesus Cervantes",
    'website': "https://www.yourcompany.com",
    'license': 'LGPL-3',
    'category': 'Extra Tools',
    'version': '0.1',
    'depends': ['base', 'web', 'crm' , 'stock', 'sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
        'reportes/creacion_croquis_reporte.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'rastreo_paquetes/static/src/css/estilo_global.css',
            'rastreo_paquetes/static/src/css/estilos_pantallas.css',

            'rastreo_paquetes/static/src/xml/pantalla_principal.xml',
            'rastreo_paquetes/static/src/js/pantalla_principal.js',

            'rastreo_paquetes/static/src/js/pantalla_pedido.js',
            'rastreo_paquetes/static/src/xml/pantalla_pedido.xml',

            'rastreo_paquetes/static/src/xml/pantalla_croquis.xml',
            'rastreo_paquetes/static/src/js/pantalla_croquis.js',

            'rastreo_paquetes/static/src/js/creacion_croquis.js',
            'rastreo_paquetes/static/src/xml/creacion_croquis.xml',

            'rastreo_paquetes/static/src/js/componente_creacion_pedido.js',
            'rastreo_paquetes/static/src/xml/componente_creacion_pedido.xml',
            'rastreo_paquetes/static/src/js/funcion_calcular_layout.js',

            
            'rastreo_paquetes/static/src/js/componente_edicion_racks.js',
            'rastreo_paquetes/static/src/xml/componente_edicion_racks.xml',

            'rastreo_paquetes/static/src/js/componente_busqueda_producto.js',
            'rastreo_paquetes/static/src/xml/componente_busqueda_producto.xml',

            'rastreo_paquetes/static/src/xml/componente_detalle_racks.xml',
            'rastreo_paquetes/static/src/xml/componente_detalle_cliente.xml',
            'rastreo_paquetes/static/src/xml/componente_detalle_proveedor.xml',
            
            'rastreo_paquetes/static/src/js/componente_detalle_racks.js',
            'rastreo_paquetes/static/src/js/componente_detalle_cliente.js',
            'rastreo_paquetes/static/src/js/componente_detalle_proveedor.js',
            
            'rastreo_paquetes/static/src/js/Pdf_uploader.js',
            'rastreo_paquetes/static/src/xml/Pdf_uploader.xml',

            'rastreo_paquetes/static/src/js/componente_subir_pdf.js',
            'rastreo_paquetes/static/src/xml/componente_subir_pdf.xml',
            
            'rastreo_paquetes/static/src/js/componente_cargar_cotizacion.js',
            'rastreo_paquetes/static/src/xml/componente_cargar_cotizacion.xml',
            'rastreo_paquetes/static/src/js/componente_configuracion.js',
            'rastreo_paquetes/static/src/xml/componente_configuracion.xml',
        ],
    },
    'installable': True,
    'application': True
}