
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { offlineStorage } from '@/lib/offline-storage';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Upload,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatusCardProps {
  syncStatus: {
    pendingPayments: number;
    lastSync: Date | null;
    syncing: boolean;
  };
  onSync: () => void;
  isOnline: boolean;
}

export function SyncStatusCard({ syncStatus, onSync, isOnline }: SyncStatusCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStats, setSyncStats] = useState({
    totalItems: 0,
    processedItems: 0,
    errors: 0
  });

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('No hay conexión a Internet');
      return;
    }

    setSyncing(true);
    setSyncProgress(0);
    setSyncStats({ totalItems: 0, processedItems: 0, errors: 0 });

    try {
      // Obtener elementos pendientes de sincronización
      const pendingItems = await offlineStorage.getPendingSync();
      
      if (pendingItems.length === 0) {
        toast.success('No hay elementos pendientes de sincronización');
        setSyncing(false);
        return;
      }

      setSyncStats(prev => ({ ...prev, totalItems: pendingItems.length }));
      
      // Procesar cada elemento
      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        
        try {
          await syncItem(item);
          setSyncStats(prev => ({ ...prev, processedItems: prev.processedItems + 1 }));
          setSyncProgress(((i + 1) / pendingItems.length) * 100);
          
          // Remover elemento de la cola
          await offlineStorage.removeSyncItem(item.id);
          
        } catch (error) {
          console.error('Error syncing item:', item, error);
          setSyncStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        }

        // Pequeña pausa para evitar saturar el servidor
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Sincronizar datos maestros (clientes) desde el servidor
      await syncMasterData();
      
      const successCount = syncStats.processedItems;
      const errorCount = syncStats.errors;
      
      if (errorCount === 0) {
        toast.success(`Sincronización completada: ${successCount} elementos`);
      } else {
        toast.warning(`Sincronización parcial: ${successCount} exitosos, ${errorCount} errores`);
      }
      
      onSync(); // Actualizar estado padre

    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Error durante la sincronización');
    } finally {
      setSyncing(false);
      setSyncProgress(0);
    }
  };

  const syncItem = async (item: any) => {
    switch (item.type) {
      case 'pago':
        await syncPayment(item.data);
        break;
      default:
        throw new Error(`Tipo de sincronización no soportado: ${item.type}`);
    }
  };

  const syncPayment = async (paymentData: any) => {
    const response = await fetch('/api/pagos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      throw new Error(`Error syncing payment: ${response.statusText}`);
    }

    return response.json();
  };

  const syncMasterData = async () => {
    try {
      // Descargar clientes actualizados
      const response = await fetch('/api/clientes?sync=true');
      if (response.ok) {
        const clientes = await response.json();
        await offlineStorage.saveClientes(clientes);
      }
    } catch (error) {
      console.error('Error syncing master data:', error);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Hace menos de un minuto';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minuto(s)`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)} hora(s)`;
    
    return date.toLocaleDateString('es-MX');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Estado de Sincronización
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estado de conexión */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-8 w-8 text-green-600" />
            ) : (
              <WifiOff className="h-8 w-8 text-red-600" />
            )}
            <div>
              <p className="font-medium">
                {isOnline ? 'Conectado' : 'Sin conexión'}
              </p>
              <p className="text-sm text-gray-500">
                {isOnline ? 'Listo para sincronizar' : 'Trabajando en modo offline'}
              </p>
            </div>
          </div>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {/* Estadísticas de sincronización */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {syncStatus.pendingPayments}
            </div>
            <p className="text-sm text-orange-700">
              Pagos Pendientes
            </p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatLastSync(syncStatus.lastSync)}
            </div>
            <p className="text-sm text-blue-700">
              Última Sincronización
            </p>
          </div>
        </div>

        {/* Progreso de sincronización */}
        {syncing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sincronizando...</span>
              <span className="text-sm text-gray-500">
                {syncStats.processedItems}/{syncStats.totalItems}
              </span>
            </div>
            <Progress value={syncProgress} className="h-2" />
            
            {syncStats.errors > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                {syncStats.errors} elemento(s) con error
              </div>
            )}
          </div>
        )}

        {/* Acciones de sincronización */}
        <div className="space-y-3">
          <Button
            onClick={handleManualSync}
            disabled={!isOnline || syncing}
            className="w-full"
          >
            {syncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Sincronizar Ahora
              </>
            )}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!isOnline || syncing}
              onClick={async () => {
                try {
                  await syncMasterData();
                  toast.success('Datos maestros actualizados');
                } catch (error) {
                  toast.error('Error al actualizar datos');
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Actualizar Datos
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar Estado
            </Button>
          </div>
        </div>

        {/* Información adicional */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Los pagos se guardan localmente cuando no hay conexión</p>
          <p>• La sincronización es automática al recuperar conexión</p>
          <p>• Los datos maestros se actualizan cada sincronización</p>
        </div>
      </CardContent>
    </Card>
  );
}
