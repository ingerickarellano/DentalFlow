import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalado
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    setIsInstalled(
  ('standalone' in window.navigator && (window.navigator as any).standalone) || 
  window.matchMedia('(display-mode: standalone)').matches
);

    // Evento para instalar PWA
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Detectar cambios en modo display
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      setIsStandalone(e.matches);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la PWA');
      setDeferredPrompt(null);
      return true;
    }
    
    console.log('Usuario rechazó instalar la PWA');
    return false;
  };

  const checkConnection = () => {
    return navigator.onLine;
  };

  const showInstallButton = () => {
    return deferredPrompt !== null && !isInstalled;
  };

  return {
    installApp,
    showInstallButton,
    isInstalled,
    isStandalone,
    checkConnection,
    deferredPrompt
  };
};