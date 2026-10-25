class AppConfig {
    static DEFAULT_PASSWORD = 'steban2026';

    static SUPABASE = {
        URL: 'https://cnokksazuhbyobcjhypz.supabase.co',
        ANON_KEY: 'sb_publishable_l35fK9_W9r9camI0YntIyg_4kK7J9jZ',
        BUCKET: 'cv-y-archivos',
        ADMIN_EMAIL: 'portafolio.stebangomez@gmail.com',
        TABLES: {
            PROJECTS: 'proyectos',
            TEXTS: 'textos_sitio',
            LINKS: 'enlaces_sitio'
        }
    };

    static STORAGE_KEYS = {
        PROJECTS: 'portfolio-privileged-projects-v6',
        TEXTS: 'portfolio-editable-texts-v1',
        LINKS: 'portfolio-editable-links-v1',
        CATEGORIES: 'portfolio-categories-v1',
        SOFTWARE: 'portfolio-software-stack-v1',
        ADMIN_PASSWORD: 'portfolio-admin-custom-pass-v1',
        ADMIN_SESSION: 'portfolio-admin-session-active',
        CV_META: 'portfolio-cv-meta-v1'
    };

    static CV_DB = {
        NAME: 'portfolio-cv-storage',
        VERSION: 1,
        STORE: 'cv-files',
        RECORD_KEY: 'current-cv'
    };

    static DEFAULT_CATEGORIES = [
        { slug: '2d', label: '2D' },
        { slug: 'chimeneas', label: 'Chimeneas' },
        { slug: 'columnas', label: 'Columnas' },
        { slug: 'counters', label: 'Counters' },
        { slug: 'balconeras', label: 'Balconeras' },
        { slug: 'cenefas', label: 'Cenefas' },
        { slug: 'arcos', label: 'Arcos' },
        { slug: 'otros', label: 'Otros' }
    ];

    static DEFAULT_SOFTWARE = [
        {
            id: 'rhinoceros',
            name: 'Rhinoceros',
            color: 'orange',
            description: 'Modelado tridimensional de superficies complejas, estructuras para retail y desarrollo geométrico de piezas.'
        },
        {
            id: 'keyshot',
            name: 'Keyshot',
            color: 'amber',
            description: 'Renderizado fotorrealista avanzado para la previsualización de materiales, texturas e iluminación en entornos comerciales.'
        },
        {
            id: 'illustrator',
            name: 'Adobe Ilustrator',
            color: 'orange-dark',
            description: 'Creación de gráficos vectoriales, diagramación de artes finales y preparación de archivos para preproducción.'
        },
        {
            id: 'photoshop',
            name: 'Adobe Photoshop',
            color: 'blue',
            description: 'Edición avanzada de imágenes, retoque fotográfico, creación de texturas y postproducción de renders.'
        },
        {
            id: 'inventor',
            name: 'Inventor',
            color: 'cyan',
            description: 'Modelado paramétrico y diseño mecánico orientado a la validación estructural de componentes y ensamblajes.'
        },
        {
            id: 'autocad',
            name: 'AutoCAD',
            color: 'blue-strong',
            description: 'Elaboración de planos técnicos precisos, despieces y esquemas de montaje para la fabricación.'
        },
        {
            id: '3dsmax',
            name: '3D Max',
            color: 'purple',
            description: 'Modelado poligonal y simulación de espacios comerciales complejos para presentaciones de alto impacto.'
        }
    ];

    static DEFAULT_LINKS = {
        contactBtn: {
            text: 'CONTACTAR',
            href: 'mailto:stebangomezlopez1224@gmail.com'
        },
        emailLink: {
            text: 'stebangomezlopez1224@gmail.com',
            href: 'mailto:stebangomezlopez1224@gmail.com'
        },
        instagramLink: {
            text: '@stebitannn',
            href: 'https://instagram.com'
        }
    };

    static SOFTWARE_COLORS = {
        orange: '#ff8a00',
        amber: '#f4b400',
        'orange-dark': '#ff6a00',
        blue: '#1f8fff',
        cyan: '#00d7ff',
        'blue-strong': '#1c63ff',
        purple: '#a259ff'
    };

    static DEFAULT_PROJECTS = [
        {
            name: 'Balconera Fabuloso Energía Naranja',
            category: 'balconeras',
            image: 'Assets/Renders/Balconera Fabuloso Energia Naranja.png',
            model: 'Assets/Archivos 3D Portafolio Steban/Balconera Fabuloso Energia Naranja/Balconera Fabuloso Energia Naranja.glb',
            description: 'Exhibidor tipo balconera diseñado para destacar la línea Fabuloso Energía Naranja en góndola, optimizando la visibilidad de marca y el aprovechamiento del espacio en punto de venta.'
        },
        {
            name: 'Chimenea Axion Blue 7 en 1',
            category: 'chimeneas',
            image: 'Assets/Renders/Chimenea Axion Blue 7 en 1.png',
            model: 'Assets/Archivos 3D Portafolio Steban/Chimenea Axion Blue 7 en 1/Chimenea Axion Blue 7 en 1.glb',
            description: 'Estructura vertical tipo chimenea para Axion Blue 7 en 1, desarrollada con bandejas de alta resistencia y cabezote promocional de alto impacto visual en retail.'
        },
        {
            name: 'Chimenea Axion Superioridad',
            category: 'chimeneas',
            image: 'Assets/Renders/Chimenea Axion Superioridad.png',
            model: 'Assets/Archivos 3D Portafolio Steban/Chimenea Axion Superioridad/Chimenea Axion Superioridad.glb',
            description: 'Exhibidor tipo chimenea enfocado en comunicar la campaña de superioridad de Axion, integrando laterales gráficos y distribución ergonómica de producto.'
        },
        {
            name: 'Chimenea Suavitel BBRL',
            category: 'chimeneas',
            image: 'Assets/Renders/Chimenea Suavitel BBRL.png',
            model: '',
            embedType: 'sketchfab',
            embedUrl: 'https://sketchfab.com/models/6e229879b47e436b91c56335d22d4b53/embed',
            description: 'Desarrollo 3D de chimenea promocional para Suavitel, concebida para maximizar la carga de producto y reforzar la identidad visual en pasillos principales.'
        },
        {
            name: 'Columna Luminous White Color Correct',
            category: 'columnas',
            image: 'Assets/Renders/CARA COLUMNA LW Color Correct Sinú.682.png',
            model: 'Assets/Archivos 3D Portafolio Steban/Columna Luminous White Color Correct Alameda del Sinú/Columna Luminous White Color Correct Alameda del Sinú.glb',
            description: 'Revestimiento y estructura de columna para Colgate Luminous White Color Correct, combinando iluminación estratégica, volumen 3D y exhibición perimetral.'
        },
        {
            name: 'Columna Suavitel & Fabuloso Avenida 6ta',
            category: 'columnas',
            image: 'Assets/Renders/Columna Suavitel BBRL & Fabuloso Alt Cloro Avenida 6ta (2).png',
            model: '',
            embedType: 'sketchfab',
            embedUrl: 'https://sketchfab.com/models/66e576b84c254aee98d279aa4e78414c/embed',
            description: 'Columna bipromocional para Suavitel y Fabuloso diseñada a medida para gran superficie, integrando exhibición de doble cara y elementos volumétricos superiores.'
        },
        {
            name: 'Counter Abierto LW Wand',
            category: 'counters',
            image: 'Assets/Renders/Counter Abierto LW Wand.png',
            model: 'Assets/Archivos 3D Portafolio Steban/Counter Abierto LW Wand/Counter Abierto LW Wand con Productos.glb',
            embedType: 'sketchfab',
            embedUrl: 'https://sketchfab.com/models/263f5b9ac75640418585ed6aa0b33ed3/embed',
            description: 'Counter abierto interactivo para lanzamiento de Luminous White Wand, diseñado para experiencia de marca, demostración de producto y almacenamiento integrado.'
        },
        {
            name: 'Balconera Suavitel Madres',
            category: 'balconeras',
            image: 'Assets/Renders/Balconera Suavitel Madres.png',
            model: 'Assets/Archivos 3D Portafolio Steban/Balconera Suavitel Madres/Balconera Suavitel Madres.glb',
            embedType: 'sketchfab',
            embedUrl: 'https://sketchfab.com/models/6c6f144b5b2b44c5a1605ff8f7cde568/embed',
            description: 'Balconera temática para campaña Día de las Madres de Suavitel, con acabados troquelados y estructura adaptable a estantería estándar de supermercado.'
        },
        {
            name: 'Cenefa L Arriba Freshficacia',
            category: 'cenefas',
            image: 'Assets/Renders/Cenefa L Arriba Freshficacia.png',
            model: 'Assets/Archivos 3D Portafolio Steban/Cenefa L Arriba Freshficacia/Cenefa L Arriba Freshficacia.glb',
            description: 'Cenefa en L superior para señalización y destaque de categoría en lineal, fabricada para fácil instalación y lectura a larga distancia.'
        },
        {
            name: 'Arco Blancox',
            category: 'arcos',
            image: 'Assets/Renders/Arco Blancox.png',
            model: 'Assets/Archivos 3D Portafolio Steban/Arco Blancox/Arco Blancox.glb',
            embedType: 'sketchfab',
            embedUrl: 'https://sketchfab.com/models/4364133bcf524671b2be2cd964520aa3/embed',
            description: 'Arco promocional envolvente para Blancox, estructurado con módulos laterales de exhibición y puente superior de alto impacto para cabeceras de góndola.'
        },
        {
            name: 'Bandejas Termoformadas LSS & SS',
            category: 'otros',
            image: 'Assets/Renders/Bandejas Termoformadas LSS & SS.png',
            model: '',
            embedType: 'sketchfab',
            embedUrl: 'https://sketchfab.com/models/af8f09f5016c4f538f8c9d0e6047f1ba/embed',
            description: 'Diseño industrial de bandejas termoformadas con cavidades a medida para organización, sujeción y presentación impecable de unidades en punto de venta.'
        },
        {
            name: 'Glorificador Aceite Gourmet',
            category: 'otros',
            image: 'Assets/Renders/Glorificador Aceite Gourmet.png',
            model: 'Assets/Archivos 3D Portafolio Steban/Glorificador Aceite Gourmet/Glorificador Aceite Gourmet.glb',
            description: 'Glorificador de mostrador para Aceite Gourmet, enfocado en resaltar los atributos premium del producto mediante geometría limpia y materiales de alta calidad.'
        },
        {
            name: 'Rejilla Éxito Freshficacia',
            category: 'otros',
            image: 'Assets/Renders/Rejilla Exito Freshficacia.png',
            model: 'Assets/Archivos 3D Portafolio Steban/Rejilla Exito Freshficacia/Rejilla Exito Freshficacia.glb',
            description: 'Exhibidor de rejilla lateral para almacenes Éxito, optimizado para exhibición cruzada, fácil reposición y resistencia estructural en tráfico pesado.'
        },
        {
            name: 'Columna Suavitel Madres Avenida 6ta',
            category: 'columnas',
            type: '2d',
            image: 'Assets/Renders/Columna Suavitel Madres Avenida 6ta.png',
            images: ['Assets/Renders/Columna Suavitel Madres Avenida 6ta.png'],
            model: '',
            description: 'Columna promocional de alto impacto visual diseñada para la campaña Día de las Madres de Suavitel en Avenida 6ta.'
        }
    ];
}
