import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'zh';

export const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' }
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
        addService: string;
        serviceName: string;
        selectServicePlaceholder: string;
        qty: string;
        add: string;
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
        encrypted: 'End-to-end encrypted',
        addService: 'Add Service',
        serviceName: 'Service Name',
        selectServicePlaceholder: 'Select a service below...',
        qty: 'Qty',
        add: 'Add'
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
        selectService: '选择服务以开始消息传递',
        addService: '添加服务',
        serviceName: '服务名称',
        selectServicePlaceholder: '在下方选择服务...',
        qty: '数量',
        add: '添加'
    },
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
