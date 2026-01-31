import { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import MainContent from './components/MainContent';
import AddServiceModal from './components/AddServiceModal';
import TranslationPanel, { type TranslationSettings } from './components/TranslationPanel';
import InvitationLogin from './components/InvitationLogin';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import type { ServiceItem, AddedService } from './types';
import { AVAILABLE_SERVICES } from './constants/services';
import './App.css';

function App() {
  // Auth State
  const [invitationCode, setInvitationCode] = useState<string | null>(() => {
    // Migration: Move local storage to session storage to enforce fresh login on new tabs
    const local = localStorage.getItem('invitation_code');
    if (local) {
      sessionStorage.setItem('invitation_code', local);
      localStorage.removeItem('invitation_code');
      return local;
    }
    return sessionStorage.getItem('invitation_code');
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(!!localStorage.getItem('admin_token'));
  
  // Check URL for /admin
  const isUrlAdmin = window.location.pathname === '/admin' || window.location.pathname === '/admin/';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addedServices, setAddedServices] = useState<AddedService[]>([]);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  
  // Translation State
  const [isTranslationPanelOpen, setIsTranslationPanelOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [settingsMode, setSettingsMode] = useState<'current' | 'global'>('global');

  const [globalSettings, setGlobalSettings] = useState<TranslationSettings>(() => {
    try {
      const saved = localStorage.getItem('translation_global_settings');
      return saved ? JSON.parse(saved) : {
        sourceLang: 'auto',
        targetLang: 'en',
        translateBeforeSendingLang: 'he',
        autoTranslateIncoming: false,
        autoTranslateOutgoing: false
      };
    } catch (e) {
      return {
        sourceLang: 'auto',
        targetLang: 'en',
        translateBeforeSendingLang: 'he',
        autoTranslateIncoming: false,
        autoTranslateOutgoing: false
      };
    }
  });

  const [chatSettings, setChatSettings] = useState<Record<string, TranslationSettings>>(() => {
    try {
      const saved = localStorage.getItem('translation_chat_settings');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Persist settings
  useEffect(() => {
    localStorage.setItem('translation_global_settings', JSON.stringify(globalSettings));
  }, [globalSettings]);

  useEffect(() => {
    localStorage.setItem('translation_chat_settings', JSON.stringify(chatSettings));
  }, [chatSettings]);

  // Helper to normalize Chat IDs (strip suffixes)
  const normalizeId = (id: string) => {
    if (!id) return '';
    return id.split('@')[0];
  };

  // Determine effective settings for MainContent
  const activeSettings = activeChatId && chatSettings[normalizeId(activeChatId)] 
      ? chatSettings[normalizeId(activeChatId)] 
      : globalSettings;

  // Handler for updating settings from panel
  const handleUpdateSettings = (newSettings: TranslationSettings) => {
      if (settingsMode === 'current' && activeChatId) {
          const normId = normalizeId(activeChatId);
          setChatSettings(prev => ({
              ...prev,
              [normId]: newSettings
          }));
      } else {
          setGlobalSettings(newSettings);
      }
  };

  // Switch to 'current' mode automatically if opening panel while in a chat
  useEffect(() => {
      if (isTranslationPanelOpen && activeChatId) {
          setSettingsMode('current');
      } else if (!activeChatId) {
          setSettingsMode('global');
      }
  }, [isTranslationPanelOpen, activeChatId]);

  useEffect(() => {
    if (!invitationCode) return;

    // Use owner_code to match backend expectation
    fetch(`/api/services?owner_code=${invitationCode}`)
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;  
        const mappedServices = data.map((item: any) => {
          const serviceDef = AVAILABLE_SERVICES.find(s => s.id === item.service_id);
          // Fallback if exact match not found (e.g. legacy IDs), try to guess by name or default to WA
          const def = serviceDef || (
            item.service_id.startsWith('tg') ? AVAILABLE_SERVICES.find(s => s.id === 'tg1') : 
            item.service_id.startsWith('fb') ? AVAILABLE_SERVICES.find(s => s.id === 'fb') :
            AVAILABLE_SERVICES.find(s => s.id === 'wa1')
          );
          
          if (!def) return null;
          return {
            id: item.id,
            service: def,
            customName: item.custom_name,
            port: item.port
          };
        }).filter(Boolean) as AddedService[];
        setAddedServices(mappedServices);
      })
      .catch(console.error);
  }, [invitationCode]);

  const handleAddService = async (service: ServiceItem, name: string, quantity: number) => {
    if (!invitationCode) return;

    for (let i = 0; i < quantity; i++) {
        try {
            const res = await fetch('/api/create_service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customName: name,
                    serviceType: service.id, // Backend checks startsWith('tg') or defaults to wa
                    ownerCode: invitationCode
                })
            });
            const data = await res.json();
            
            if (data.success && data.service) {
                const newService: AddedService = {
                    id: data.service.id,
                    service: service,
                    customName: data.service.custom_name,
                    port: data.service.port
                };
                
                setAddedServices(prev => [...prev, newService]);
                
                // Set last added as active if it's the last one
                if (i === quantity - 1) {
                    setActiveServiceId(newService.id);
                }
            }
        } catch (e) {
            console.error('Failed to create service:', e);
        }
    }
  };

  const handleDeleteService = async (id: string) => {
    // 1. Optimistic UI removal
    setAddedServices(prev => prev.filter(s => s.id !== id));
    if (activeServiceId === id) {
        setActiveServiceId(null);
    }
    
    // 2. Notify backend to remove from DB
    try {
        await fetch('/api/delete_service', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
    } catch (e) {
        console.error('Failed to delete service from DB:', e);
    }
  };

  const handleRefreshService = (id: string) => {
    console.log('Refreshing service:', id);
    // In a real implementation with webviews, this would reload the webview
  };

  // Auth Handlers
  const handleInvitationLogin = (code: string) => {
    sessionStorage.setItem('invitation_code', code);
    setInvitationCode(code);
  };

  const handleAdminLoginSuccess = (token: string) => {
    localStorage.setItem('admin_token', token);
    setIsAdmin(true);
    // Reload to apply admin view if on admin route
    if (isUrlAdmin) window.location.reload(); 
    else window.location.href = '/admin';
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
    // Reload to show login screen
    window.location.reload();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('invitation_code');
    setInvitationCode(null);
    setAddedServices([]);
    setActiveServiceId(null);
  };

  // Routing Logic
  if (isUrlAdmin) {
      if (isAdmin) {
          return <AdminPanel onLogout={handleAdminLogout} />;
      }
      return <AdminLogin onLogin={handleAdminLoginSuccess} onBack={() => window.location.href = '/'} />;
  }

  if (!invitationCode) {
    return <InvitationLogin onLogin={handleInvitationLogin} />;
  }

  const activeService = addedServices.find(s => s.id === activeServiceId);

  return (
    <div className="flex flex-col h-screen bg-white text-gray-800 font-sans relative overflow-hidden">
      <TopBar onLogout={handleLogout} invitationCode={invitationCode} />
      <div className="flex flex-1 overflow-hidden relative z-0">
        <SidebarLeft 
          onAddNewClick={() => setIsAddModalOpen(true)} 
          addedServices={addedServices}
          activeServiceId={activeServiceId}
          onServiceClick={setActiveServiceId}
          onDeleteService={handleDeleteService}
          onRefreshService={handleRefreshService}
        />
        <MainContent 
          activeService={activeService} 
          translationSettings={activeSettings}
          onChatSelect={setActiveChatId}
        />
        <SidebarRight 
          onLangClick={() => setIsTranslationPanelOpen(!isTranslationPanelOpen)} 
          isLangActive={isTranslationPanelOpen}
        />
        {isTranslationPanelOpen && (
          <TranslationPanel 
            settings={settingsMode === 'current' && activeChatId ? (chatSettings[normalizeId(activeChatId)] || globalSettings) : globalSettings} 
            onUpdateSettings={handleUpdateSettings} 
            onClose={() => setIsTranslationPanelOpen(false)} 
            mode={settingsMode}
            onModeChange={setSettingsMode}
            activeChatId={activeChatId}
          />
        )}
      </div>
      
      {isAddModalOpen && (
        <AddServiceModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={handleAddService}
        />
      )}
    </div>
  );
}

export default App;
