
'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error durante la instalación:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    // Recordar que el usuario dismissó por un día
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // No mostrar si ya está instalada o si fue dismissada recientemente
  if (isInstalled || !showInstallBanner) {
    return null;
  }

  // Verificar si fue dismissada recientemente (24 horas)
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed) {
    const dismissedTime = parseInt(dismissed);
    const dayInMs = 24 * 60 * 60 * 1000;
    if (Date.now() - dismissedTime < dayInMs) {
      return null;
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Download className="h-5 w-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-blue-900 mb-1">
                Instalar ERP Cobranza
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                Instala la aplicación para acceso rápido y mejor funcionalidad offline
              </p>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Instalar
                </Button>
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="outline"
                  className="text-blue-600 border-blue-300"
                >
                  Ahora no
                </Button>
              </div>
            </div>
            
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="text-blue-600 p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
