
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { ClientSearchCard } from '@/components/cobranza-movil/client-search-card';
import { PaymentFormCard } from '@/components/cobranza-movil/payment-form-card';
import { OfflineIndicator } from '@/components/cobranza-movil/offline-indicator';
import { RecentPayments } from '@/components/cobranza-movil/recent-payments';
import { SyncStatusCard } from '@/components/cobranza-movil/sync-status-card';
import { DailySummary } from '@/components/cobranza-movil/daily-summary';
import { useOfflineStorage } from '@/lib/offline-storage';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  CreditCard, 
  Users, 
  RefreshCw,
  MapPin,
  Calendar,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function CobranzaMovilPage() {
  const { data: session } = useSession() || {};
  const { isInitialized, isOnline } = useOfflineStorage();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [syncStatus, setSyncStatus] = useState({
    pendingPayments: 0,
    lastSync: null as Date | null,
    syncing: false
  });

  useEffect(() => {
    requestLocationPermission();
    loadSyncStatus();
  }, []);

  const requestLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast.success('Ubicación obtenida correctamente');
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          toast.warning('No se pudo obtener la ubicación. Los pagos se registrarán sin coordenadas.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const loadSyncStatus = async () => {
    // Aquí cargaríamos el estado de sincronización
    // Por ahora usamos datos de ejemplo
    setSyncStatus({
      pendingPayments: 0,
      lastSync: new Date(),
      syncing: false
    });
  };

  const handlePaymentSuccess = () => {
    setSelectedClient(null);
    loadSyncStatus(); // Actualizar estado de sync
    toast.success('Pago registrado correctamente');
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Inicializando almacenamiento offline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Header 
        title="Cobranza Móvil"
        description="Registro de pagos con funcionalidad offline"
      />

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <OfflineIndicator isOnline={isOnline} />
        
        <Badge variant={location ? "default" : "secondary"} className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {location ? 'GPS Activo' : 'Sin GPS'}
        </Badge>

        <Badge variant="outline" className="flex items-center gap-1">
          <Smartphone className="h-3 w-3" />
          {session?.user?.role}
        </Badge>

        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date().toLocaleDateString('es-MX')}
        </Badge>

        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </Badge>
      </div>

      <Tabs defaultValue="cobranza" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cobranza" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Cobranza
          </TabsTrigger>
          <TabsTrigger value="resumen" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sincronizar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cobranza" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Búsqueda de Clientes */}
            <ClientSearchCard 
              selectedClient={selectedClient}
              onClientSelect={setSelectedClient}
              isOnline={isOnline}
            />

            {/* Formulario de Pago */}
            {selectedClient && (
              <PaymentFormCard
                client={selectedClient}
                location={location}
                onPaymentSuccess={handlePaymentSuccess}
                onCancel={() => setSelectedClient(null)}
                isOnline={isOnline}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="resumen" className="space-y-6">
          <DailySummary 
            gestorId={session?.user?.id} 
            isOnline={isOnline}
          />
        </TabsContent>

        <TabsContent value="historial" className="space-y-6">
          <RecentPayments 
            gestorId={session?.user?.id}
            isOnline={isOnline}
          />
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <SyncStatusCard 
            syncStatus={syncStatus}
            onSync={loadSyncStatus}
            isOnline={isOnline}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
