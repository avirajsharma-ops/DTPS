'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Monitor, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface InstallButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export function InstallButton({ 
  className = '', 
  variant = 'default', 
  size = 'default' 
}: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isElectron = !!(window as any).electronAPI;
      
      setIsInstalled(isStandaloneMode || isIOSStandalone || isElectron);
    };

    // Detect platform
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('android')) {
        setPlatform('Android');
      } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        setPlatform('iOS');
      } else if (userAgent.includes('windows')) {
        setPlatform('Windows');
      } else if (userAgent.includes('mac')) {
        setPlatform('macOS');
      } else {
        setPlatform('Desktop');
      }
    };

    checkIfInstalled();
    detectPlatform();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast.success('App installed successfully! 🎉', {
        description: 'You can now access the app from your home screen or desktop.',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show manual installation instructions
      showManualInstructions();
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('Installing app...', {
          description: 'The app is being installed on your device.',
        });
      } else {
        toast.info('Installation cancelled', {
          description: 'You can install the app later from the browser menu.',
        });
      }
    } catch (error) {
      console.error('Error during installation:', error);
      toast.error('Installation failed', {
        description: 'Please try installing from the browser menu.',
      });
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const showManualInstructions = () => {
    let instructions = '';
    
    switch (platform) {
      case 'iOS':
        instructions = 'Tap the Share button (□↑) at the bottom, then select "Add to Home Screen"';
        break;
      case 'Android':
        instructions = 'Tap the menu (⋮) in Chrome, then select "Add to Home screen"';
        break;
      case 'Windows':
        instructions = 'Look for the install icon (⊕) in the address bar, or check the browser menu';
        break;
      case 'macOS':
        instructions = 'Look for the install option in Safari or Chrome browser menu';
        break;
      default:
        instructions = 'Look for the install option in your browser menu or address bar';
    }

    toast.info(`Install on ${platform}`, {
      description: instructions,
      duration: 8000,
    });
  };

  // Don't show button if already installed
  if (isInstalled) {
    return (
      <Button
        variant="outline"
        size={size}
        className={`${className} cursor-default`}
        disabled
      >
        <Check className="h-4 w-4 mr-2" />
        App Installed
      </Button>
    );
  }

  // Show install button
  return (
    <Button
      onClick={handleInstallClick}
      variant={variant}
      size={size}
      className={className}
      disabled={isInstalling}
    >
      {isInstalling ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          Installing...
        </>
      ) : (
        <>
          {platform === 'iOS' || platform === 'Android' ? (
            <Smartphone className="h-4 w-4 mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Install App
        </>
      )}
    </Button>
  );
}

// Hook for programmatic installation
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkIfInstalled = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandaloneMode || isIOSStandalone);
    };

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    checkIfInstalled();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      return outcome === 'accepted';
    } catch (error) {
      console.error('Installation error:', error);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    install,
    canInstall: !!deferredPrompt
  };
}
