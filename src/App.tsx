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
  const [invitationCode, setInvitationCode] = useState<string | null>(localStorage.getItem('invitation_code'));
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

  const [globalSettings, setGlobalSettings] = useState<TranslationSettings>({
    sourceLang: 'auto',
    targetLang: 'en',
    translateBeforeSendingLang: 'he',
    autoTranslateIncoming: false,
    autoTranslateOutgoing: false
  });

  const [chatSettings, setChatSettings] = useState<Record<string, TranslationSettings>>({});

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

    fetch(`/api/services?code=${invitationCode}`)
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return; 
        const mappedServices = data.map((item: any) => {
          const serviceDef = AVAILABLE_SERVICES.find(s => s.id === item.service_id);
          if (!serviceDef) return null;
          return {
            id: item.id,
            service: serviceDef,
            customName: item.custom_name
          };
        }).filter(Boolean) as AddedService[];
        setAddedServices(mappedServices);
      })
      .catch(console.error);
  }, [invitationCode]);

  const handleAddService = (service: ServiceItem, name: string, quantity: number) => {
    if (!invitationCode) return;

    const newServices: AddedService[] = [];

    // Create local objects immediately
    for (let i = 0; i < quantity; i++) {
      const id = Date.now() + '-' + i;
      newServices.push({
        id,
        service,
        customName: name
      });

      // Send to backend in background (fire-and-forget for UI purposes)
      fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          serviceId: service.id,
          customName: name,
          ownerCode: invitationCode
        })
      }).catch(err => {
        console.error('Failed to save service:', err);
        // In a real app, we might show a toast error or revert state
      });
    }

    // Update state immediately (Optimistic UI)
    setAddedServices(prev => [...prev, ...newServices]);
    
    // Set last added as active
    if (newServices.length > 0) {
      setActiveServiceId(newServices[newServices.length - 1].id);
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
        await fetch(`/api/services/${id}`, { method: 'DELETE' });
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
    localStorage.setItem('invitation_code', code);
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
    localStorage.removeItem('invitation_code');
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
    return <InvitationLogin onLogin={handleInvitationLogin} onAdminClick={() => window.location.href = '/admin'} />;
  }

  const activeService = addedServices.find(s => s.id === activeServiceId);

  return (
    <div className="flex flex-col h-screen bg-white text-gray-800 font-sans relative overflow-hidden">
      <TopBar onLogout={handleLogout} />
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
