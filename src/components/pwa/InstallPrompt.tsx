'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode || isIOSStandalone);
      setIsInstalled(isStandaloneMode || isIOSStandalone);
    };

    // Check if iOS
    const checkIfIOS = () => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(isIOSDevice);
    };

    checkIfInstalled();
    checkIfIOS();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install prompt after a delay if not already installed
      if (!isInstalled) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
      } else {
      }
    } catch (error) {
      console.error('Error during installation:', error);
    } finally {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('installPromptDismissed', 'true');
    }
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled ||
      (typeof window !== 'undefined' && sessionStorage.getItem('installPromptDismissed') === 'true') ||
      (!showInstallPrompt && !isIOS)) {
    return null;
  }

  // iOS Install Instructions
  if (isIOS && !isStandalone) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-sm text-blue-900">Install App</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-blue-800 text-xs mb-3">
            Install DTPS Nutrition for a better experience:
          </CardDescription>
          <div className="space-y-2 text-xs text-blue-800">
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Tap the Share button</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Select "Add to Home Screen"</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Tap "Add" to install</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Android/Desktop Install Prompt
  if (showInstallPrompt && deferredPrompt) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-green-600" />
              <CardTitle className="text-sm text-green-900">Install App</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <CardDescription className="text-green-800 text-xs">
            Install DTPS Nutrition for faster access and offline features
          </CardDescription>
          
          <div className="flex space-x-2">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              Later
            </Button>
          </div>

          <div className="text-xs text-green-700 space-y-1">
            <div className="flex items-center space-x-1">
              <Monitor className="h-3 w-3" />
              <span>Works offline</span>
            </div>
            <div className="flex items-center space-x-1">
              <Smartphone className="h-3 w-3" />
              <span>Native app experience</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
