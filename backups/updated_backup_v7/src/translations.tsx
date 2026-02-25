import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'zh' | 'es' | 'hi';

export const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
    { code: 'es', name: 'Español' },
    { code: 'hi', name: 'हिन्दी' }
];

type Translations = {
    [key in Language]: {
        settings: string;
        lightMode: string;
        darkMode: string;
        language: string;
        logout: string;
        server: string;
        ai: string;
        image: string;
        profile: string;
        code: string;
        addNew: string;
        typeMessage: string;
        search: string;
        online: string;
        offline: string;
        connecting: string;
        noChats: string;
        selectChat: string;
        dragDrop: string;
        serverStatus: string;
        allChats: string;
        pinned: string;
        refresh: string;
        openExternal: string;
        reply: string;
        copy: string;
        delete: string;
        forward: string;
        star: string;
        original: string;
        translated: string;
        cancel: string;
        send: string;
        connectionLost: string;
        photo: string;
        file: string;
        authenticating: string;
        loadingChats: string;
        syncing: string;
        unknown: string;
        loginFailed: string;
        loggingIn: string;
        whatsappError: string;
        facebookLoginRequired: string;
        enterPassword: string;
        verifyPassword: string;
        loadingConversation: string;
        you: string;
        contact: string;
        attachment: string;
        mediaOmitted: string;
        clickToDownload: string;
        media: string;
        // Auth & 2FA
        twoStepVerification: string;
        twoStepDescription: string;
        hint: string;
        verifyingPassword: string;
        loginToFacebook: string;
        enterCredentials: string;
        emailOrPhone: string;
        password: string;
        login: string;
        // QR & Connection
        useServiceOnComputer: string;
        openAppOnPhone: string;
        goToSettings: string;
        tapLinkDevice: string;
        pointPhone: string;
        needHelp: string;
        generatingQR: string;
        clickToReloadQR: string;
        keepMeSignedIn: string;
        connectingTo: string;
        restoringSession: string;
        // Landing
        unichatWeb: string;
        sendReceiveMessages: string;
        encrypted: string;
        selectService: string;
    }
};

export const translations: Translations = {
    en: {
        settings: 'Settings',
        lightMode: 'Light Mode',
        darkMode: 'Dark Mode',
        language: 'Language',
        logout: 'Logout',
        server: 'Server',
        ai: 'AI',
        image: 'Image',
        profile: 'Profile',
        code: 'Code',
        addNew: 'Add New',
        typeMessage: 'Type a message...',
        search: 'Search...',
        online: 'Online',
        offline: 'Offline',
        connecting: 'Connecting...',
        noChats: 'No chats found',
        selectChat: 'Select a chat to start messaging',
        dragDrop: 'Drag & Drop images here',
        serverStatus: 'Server Status',
        allChats: 'All Chats',
        pinned: 'Pinned',
        refresh: 'Refresh',
        openExternal: 'Open External',
        reply: 'Reply',
        copy: 'Copy',
        delete: 'Delete',
        forward: 'Forward',
        star: 'Star',
        original: 'Original',
        translated: 'Translated',
        cancel: 'Cancel',
        send: 'Send',
        connectionLost: 'Connection lost. Please refresh the page.',
        photo: 'Photo',
        file: 'File',
        authenticating: 'Authenticating...',
        loadingChats: 'Loading chats...',
        syncing: 'Syncing',
        unknown: 'Unknown',
        loginFailed: 'Login Failed',
        loggingIn: 'Logging in...',
        whatsappError: 'WhatsApp Error',
        facebookLoginRequired: 'Facebook Login Required',
        enterPassword: 'Enter your password',
        verifyPassword: 'Verify Password',
        loadingConversation: 'Loading conversation...',
        you: 'You',
        contact: 'Contact',
        attachment: 'Attachment',
        mediaOmitted: 'Media omitted',
        clickToDownload: 'Click to download',
        media: 'Media',
        twoStepVerification: 'Two-Step Verification',
        twoStepDescription: 'Your account is protected with an additional password.',
        hint: 'Hint',
        verifyingPassword: 'Verifying password...',
        loginToFacebook: 'Login to Facebook',
        enterCredentials: 'Enter your credentials to sync messages',
        emailOrPhone: 'Email or Phone',
        password: 'Password',
        login: 'Login',
        useServiceOnComputer: 'Use service on your computer',
        openAppOnPhone: 'Open app on your phone',
        goToSettings: 'Go to Settings > Devices',
        tapLinkDevice: 'Tap Link Desktop Device',
        pointPhone: 'Point your phone to this screen',
        needHelp: 'Need help to get started?',
        generatingQR: 'Generating QR...',
        clickToReloadQR: 'Click to reload QR',
        keepMeSignedIn: 'Keep me signed in',
        connectingTo: 'Connecting to',
        restoringSession: 'Restoring your session. This may take a few seconds.',
        unichatWeb: 'UniChat for Web',
        sendReceiveMessages: 'Send and receive messages without keeping your phone online.',
        encrypted: 'End-to-end encrypted'
    },
    zh: {
        settings: '设置',
        lightMode: '亮色模式',
        darkMode: '暗色模式',
        language: '语言',
        logout: '退出登录',
        server: '服务器',
        ai: '人工智能',
        image: '图片',
        profile: '个人资料',
        code: '邀请码',
        addNew: '添加新服务',
        typeMessage: '输入消息...',
        search: '搜索...',
        online: '在线',
        offline: '离线',
        connecting: '连接中...',
        noChats: '未找到聊天',
        selectChat: '选择一个聊天开始发送消息',
        dragDrop: '拖放图片到此处',
        serverStatus: '服务器状态',
        allChats: '所有聊天',
        pinned: '置顶',
        refresh: '刷新',
        openExternal: '打开外部链接',
        reply: '回复',
        copy: '复制',
        delete: '删除',
        forward: '转发',
        star: '收藏',
        original: '原文',
        translated: '译文',
        cancel: '取消',
        send: '发送',
        connectionLost: '连接丢失。请刷新页面。',
        photo: '图片',
        file: '文件',
        authenticating: '正在验证...',
        loadingChats: '加载聊天中...',
        syncing: '同步中',
        unknown: '未知',
        loginFailed: '登录失败',
        loggingIn: '正在登录...',
        whatsappError: 'WhatsApp 错误',
        facebookLoginRequired: '需要 Facebook 登录',
        enterPassword: '输入密码',
        verifyPassword: '验证密码',
        loadingConversation: '加载对话中...',
        you: '你',
        contact: '联系人',
        attachment: '附件',
        mediaOmitted: '媒体已省略',
        clickToDownload: '点击下载',
        media: '媒体',
        unichatWeb: 'UniChat 网页版',
        sendReceiveMessages: '无需保持手机在线即可发送和接收消息。',
        encrypted: '端到端加密',
        selectService: '选择服务以开始消息传递'
    },
    es: {
        settings: 'Ajustes',
        lightMode: 'Modo Claro',
        darkMode: 'Modo Oscuro',
        language: 'Idioma',
        logout: 'Cerrar Sesión',
        server: 'Servidor',
        ai: 'IA',
        image: 'Imagen',
        profile: 'Perfil',
        code: 'Código',
        addNew: 'Añadir Nuevo',
        typeMessage: 'Escribe un mensaje...',
        search: 'Buscar...',
        online: 'En línea',
        offline: 'Desconectado',
        connecting: 'Conectando...',
        noChats: 'No se encontraron chats',
        selectChat: 'Selecciona un chat para comenzar',
        dragDrop: 'Arrastra y suelta imágenes aquí',
        serverStatus: 'Estado del Servidor',
        allChats: 'Todos los Chats',
        pinned: 'Fijado',
        refresh: 'Actualizar',
        openExternal: 'Abrir Externo',
        reply: 'Responder',
        copy: 'Copiar',
        delete: 'Eliminar',
        forward: 'Reenviar',
        star: 'Destacar',
        original: 'Original',
        translated: 'Traducido',
        cancel: 'Cancelar',
        send: 'Enviar',
        connectionLost: 'Conexión perdida. Por favor actualice la página.',
        photo: 'Foto',
        file: 'Archivo',
        authenticating: 'Autenticando...',
        loadingChats: 'Cargando chats...',
        syncing: 'Sincronizando',
        unknown: 'Desconocido',
        loginFailed: 'Inicio de sesión fallido',
        loggingIn: 'Iniciando sesión...',
        whatsappError: 'Error de WhatsApp',
        facebookLoginRequired: 'Se requiere inicio de sesión de Facebook',
        enterPassword: 'Ingrese su contraseña',
        verifyPassword: 'Verificar Contraseña',
        loadingConversation: 'Cargando conversación...',
        you: 'Tú',
        contact: 'Contacto',
        attachment: 'Adjunto',
        mediaOmitted: 'Medios omitidos',
        clickToDownload: 'Haga clic para descargar',
        media: 'Medios'
    },
    hi: {
        settings: 'सेटिंग्स',
        lightMode: 'लाइट मोड',
        darkMode: 'डार्क मोड',
        language: 'भाषा',
        logout: 'लॉग आउट',
        server: 'सर्वर',
        ai: 'एआई',
        image: 'छवि',
        profile: 'प्रोफ़ाइल',
        code: 'कोड',
        addNew: 'नया जोड़ें',
        typeMessage: 'संदेश टाइप करें...',
        search: 'खोजें...',
        online: 'ऑनलाइन',
        offline: 'ऑफ़लाइन',
        connecting: 'कनेक्ट हो रहा है...',
        noChats: 'कोई चैट नहीं मिली',
        selectChat: 'संदेश भेजने के लिए चैट चुनें',
        dragDrop: 'चित्रों को यहाँ खींचें और छोड़ें',
        serverStatus: 'सर्वर स्थिति',
        allChats: 'सभी चैट',
        pinned: 'पिन किया गया',
        refresh: 'ताज़ा करें',
        openExternal: 'बाहरी लिंक खोलें',
        reply: 'उत्तर दें',
        copy: 'कॉपी करें',
        delete: 'हटाएं',
        forward: 'अग्रेषित करें',
        star: 'तारांकित',
        original: 'मूल',
        translated: 'अनुवादित',
        cancel: 'रद्द करें',
        send: 'भेजें',
        connectionLost: 'कनेक्शन टूट गया। कृपया पृष्ठ रीफ्रेश करें।',
        photo: 'तस्वीर',
        file: 'फ़ाइल',
        authenticating: 'प्रमाणीकरण हो रहा है...',
        loadingChats: 'चैट लोड हो रहे हैं...',
        syncing: 'सिंक हो रहा है',
        unknown: 'अज्ञात',
        loginFailed: 'लॉगिन विफल',
        loggingIn: 'लॉगिन हो रहा है...',
        whatsappError: 'व्हाट्सएप त्रुटि',
        facebookLoginRequired: 'फेसबुक लॉगिन आवश्यक है',
        enterPassword: 'अपना पासवर्ड दर्ज करें',
        verifyPassword: 'पासवर्ड सत्यापित करें',
        loadingConversation: 'बातचीत लोड हो रही है...',
        you: 'आप',
        contact: 'संपर्क',
        attachment: 'संलग्नक',
        mediaOmitted: 'मीडिया छोड़ दिया गया',
        clickToDownload: 'डाउनलोड करने के लिए क्लिक करें',
        media: 'मीडिया',
        twoStepVerification: 'दो-चरणीय सत्यापन',
        twoStepDescription: 'आपका खाता एक अतिरिक्त पासवर्ड से सुरक्षित है।',
        hint: 'संकेत',
        verifyingPassword: 'पासवर्ड सत्यापित कर रहा है...',
        loginToFacebook: 'फेसबुक पर लॉगिन करें',
        enterCredentials: 'संदेश सिंक करने के लिए अपना विवरण दर्ज करें',
        emailOrPhone: 'ईमेल या फोन',
        password: 'पासवर्ड',
        login: 'लॉगिन',
        useServiceOnComputer: 'अपने कंप्यूटर पर सेवा का उपयोग करें',
        openAppOnPhone: 'अपने फोन पर ऐप खोलें',
        goToSettings: 'सेटिंग्स > डिवाइस पर जाएं',
        tapLinkDevice: 'लिंक डेस्कटॉप डिवाइस पर टैप करें',
        pointPhone: 'अपने फोन को इस स्क्रीन की ओर इंगित करें',
        needHelp: 'शुरू करने में सहायता चाहिए?',
        generatingQR: 'QR जनरेट हो रहा है...',
        clickToReloadQR: 'QR रीलोड करने के लिए क्लिक करें',
        keepMeSignedIn: 'मुझे साइन इन रखें',
        connectingTo: 'से कनेक्ट हो रहा है',
        restoringSession: 'आपका सत्र बहाल कर रहा है। इसमें कुछ सेकंड लग सकते हैं।',
        unichatWeb: 'UniChat वेब के लिए',
        sendReceiveMessages: 'अपने फोन को ऑनलाइन रखे बिना संदेश भेजें और प्राप्त करें।',
        encrypted: 'एंड-टू-एंड एन्क्रिप्टेड'
    }
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations['en'];
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>(() => {
        return (localStorage.getItem('ui_language') as Language) || 'en';
    });
    
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('ui_theme') as 'light' | 'dark') || 'light';
    });

    useEffect(() => {
        localStorage.setItem('ui_language', language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem('ui_theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const value = {
        language,
        setLanguage,
        t: translations[language],
        theme,
        setTheme
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
