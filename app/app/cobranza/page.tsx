
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Smartphone, Users, DollarSign, RefreshCw as Sync, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClienteSearch from '@/components/cobranza/cliente-search';
import PagoForm from '@/components/cobranza/pago-form';
import TicketConfigPage from '@/components/cobranza/ticket-config';
import { syncManager } from '@/lib/sync-manager';
import { useOfflineStorage } from '@/lib/offline-storage';
import { toast } from 'sonner';

interface Cliente {
  cod_cliente: string;
  nombre_ccliente: string;
  codigo_gestor: string;
  periodicidad_cliente: string;
  pagos_cliente: number;
  tel1_cliente: string;
  saldo_actualcli: string;
  calle_dom: string;
  colonia_dom: string;
  dia_cobro: string;
  semv: string;
  semdv: string;
}

export default function CobranzaPage() {
  const { data: session, status } = useSession();
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, lastSync: null as Date | null });
  const [activeTab, setActiveTab] = useState('cobranza');
  const { isInitialized, isOnline } = useOfflineStorage();

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }
  }, [status]);

  useEffect(() => {
    if (isInitialized) {
      // Inicializar el gestor de sincronización
      syncManager.init();
      
      // Cargar estado de sincronización
      loadSyncStatus();
      
      // Actualizar estado cada minuto
      const interval = setInterval(loadSyncStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  const loadSyncStatus = async () => {
    try {
      const status = await syncManager.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error cargando estado de sincronización:', error);
    }
  };

  const handleSyncNow = async () => {
    try {
      toast.info('Iniciando sincronización...');
      await syncManager.forcSync();
      await loadSyncStatus();
      toast.success('Sincronización completada');
    } catch (error) {
      console.error('Error en sincronización:', error);
      toast.error('Error en sincronización: ' + (error as Error).message);
    }
  };

  const handlePagoCompletado = () => {
    // Limpiar cliente seleccionado para mostrar búsqueda nuevamente
    setClienteSeleccionado(null);
    
    // Actualizar estado de sincronización
    loadSyncStatus();
    
    toast.success('Pago registrado y guardado offline');
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  // Obtener código del gestor desde la sesión
  const codigoGestor = (session.user as any).codigo || 'DQBOT';

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Smartphone className="h-6 w-6" />
          Cobranza Móvil
        </h1>
        <p className="text-gray-600">
          Gestión offline de cobranza - {session.user.name || codigoGestor}
        </p>
        
        {/* Estado de conexión y sincronización */}
        <div className="flex gap-2 mt-3">
          <Badge variant={isOnline ? 'default' : 'secondary'}>
            {isOnline ? 'Conectado' : 'Offline'}
          </Badge>
          {syncStatus.pending > 0 && (
            <Badge variant="destructive">
              {syncStatus.pending} pagos pendientes
            </Badge>
          )}
          {syncStatus.lastSync && (
            <Badge variant="outline">
              Última sync: {syncStatus.lastSync.toLocaleString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes Sync</p>
                <p className="text-2xl font-bold">{syncStatus.pending}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <p className="text-lg font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <Sync className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center justify-center">
            <Button 
              onClick={handleSyncNow} 
              disabled={!isOnline || syncStatus.pending === 0}
              className="w-full"
            >
              <Sync className="h-4 w-4 mr-2" />
              Sincronizar Ahora
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal con tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cobranza">Cobranza</TabsTrigger>
          <TabsTrigger value="configuracion">Tickets</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        {/* Tab de Cobranza */}
        <TabsContent value="cobranza" className="space-y-4">
          {!clienteSeleccionado ? (
            <ClienteSearch
              codigoGestor={codigoGestor}
              onClienteSelect={setClienteSeleccionado}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setClienteSeleccionado(null)}
                  variant="outline"
                  size="sm"
                >
                  ← Volver a búsqueda
                </Button>
              </div>
              
              <PagoForm
                cliente={clienteSeleccionado}
                codigoGestor={codigoGestor}
                onPagoCompletado={handlePagoCompletado}
              />
            </div>
          )}
        </TabsContent>

        {/* Tab de Configuración de Tickets */}
        <TabsContent value="configuracion">
          <TicketConfigPage />
        </TabsContent>

        {/* Tab de Historial */}
        <TabsContent value="historial" className="space-y-4">
          <HistorialPagos codigoGestor={codigoGestor} />
        </TabsContent>
      </Tabs>

      {/* Información offline */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 md:right-auto md:w-96">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-orange-800">
                  Trabajando offline
                </span>
              </div>
              <p className="text-xs text-orange-700 mt-1">
                Los pagos se guardarán localmente y se sincronizarán automáticamente cuando se restaure la conexión.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Componente para mostrar historial de pagos
function HistorialPagos({ codigoGestor }: { codigoGestor: string }) {
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorial();
  }, [codigoGestor]);

  const loadHistorial = async () => {
    try {
      const { offlineStorage } = await import('@/lib/offline-storage');
      const pagosData = await offlineStorage.getPagos(codigoGestor);
      setPagos(pagosData.reverse()); // Más recientes primero
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Cargando historial...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Pagos Offline</CardTitle>
      </CardHeader>
      <CardContent>
        {pagos.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No hay pagos registrados offline
          </p>
        ) : (
          <div className="space-y-3">
            {pagos.map((pago, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{pago.nombre_ccliente}</p>
                    <p className="text-sm text-gray-600">Cliente: {pago.cod_cliente}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${pago.montop}</p>
                    {pago.mora > 0 && (
                      <p className="text-sm text-orange-600">Mora: ${pago.mora}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{pago.fechap || 'Hoy'}</span>
                  <div className="flex gap-2">
                    {pago.offline && <Badge variant="secondary">Offline</Badge>}
                    {!pago.synced && <Badge variant="destructive">Pendiente</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
