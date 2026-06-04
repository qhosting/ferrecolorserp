
// Gestor de sincronización automática
import { offlineStorage } from './offline-storage';

class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = true;
  private isSyncing = false;

  private baseUrl = process.env.NEXT_PUBLIC_SYNC_URL || '';

  init() {
    // Monitorear estado de conexión
    this.updateOnlineStatus();
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Sincronizar cada 5 minutos si está online
    this.startSyncInterval();
  }

  private updateOnlineStatus() {
    this.isOnline = navigator.onLine;
  }

  private handleOnline() {
    this.isOnline = true;
    console.log('Conexión restaurada - iniciando sincronización');
    this.syncPendingData();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('Sin conexión - modo offline activado');
    this.stopSyncInterval();
  }

  private startSyncInterval() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncPendingData();
      }
    }, 5 * 60 * 1000); // 5 minutos
  }

  private stopSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncPendingData(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;

    this.isSyncing = true;
    console.log('Iniciando sincronización...');

    try {
      const pendingItems = await offlineStorage.getPendingSync();
      
      for (const item of pendingItems) {
        await this.syncItem(item);
      }

      console.log(`Sincronización completada: ${pendingItems.length} elementos`);
    } catch (error) {
      console.error('Error en sincronización:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(item: any): Promise<void> {
    try {
      if (item.type === 'pago') {
        await this.syncPago(item);
      }
      
      // Remover item de cola de sincronización después del éxito
      await offlineStorage.removeSyncItem(item.id);
    } catch (error) {
      console.error(`Error sincronizando item ${item.id}:`, error);
      // No removemos el item si falla, se intentará en la próxima sincronización
    }
  }

  private async syncPago(item: any): Promise<void> {
    const pagoData = {
      ...item.data,
      // Mapear campos según la estructura de la base de datos
      fechap: new Date().toISOString().split('T')[0],
      fechahora: new Date().toISOString(),
    };

    // Simular envío al servidor - aquí iría la llamada real a tu API
    const response = await fetch('/api/pagos/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pagoData),
    });

    if (!response.ok) {
      throw new Error(`Error sincronizando pago: ${response.statusText}`);
    }
  }

  async downloadClientes(codigoGestor: string): Promise<void> {
    if (!this.isOnline) {
      console.log('Sin conexión - usando datos offline');
      return;
    }

    try {
      const response = await fetch(`/api/clientes?codigo_gestor=${codigoGestor}`);
      if (!response.ok) throw new Error('Error descargando clientes');

      const clientes = await response.json();
      await offlineStorage.saveClientes(clientes);
      
      console.log(`${clientes.length} clientes descargados y guardados offline`);
    } catch (error) {
      console.error('Error descargando clientes:', error);
      throw error;
    }
  }

  // Forzar sincronización manual
  async forcSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Sin conexión a internet');
    }

    await this.syncPendingData();
  }

  // Obtener estado de sincronización
  async getSyncStatus(): Promise<{ pending: number; lastSync: Date | null }> {
    const pending = await offlineStorage.getPendingSync();
    const lastSync = await offlineStorage.getConfig('lastSyncTime');
    
    return {
      pending: pending.length,
      lastSync: lastSync ? new Date(lastSync) : null
    };
  }
}

export const syncManager = new SyncManager();
