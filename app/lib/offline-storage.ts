
// Gestión de almacenamiento offline con IndexedDB
class OfflineStorageManager {
  private dbName = 'ERPOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  private stores = {
    clientes: 'clientes',
    pagos: 'pagos',
    configuraciones: 'configuraciones',
    pendingSync: 'pendingSync',
    tickets: 'tickets'
  };

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store para clientes
        if (!db.objectStoreNames.contains(this.stores.clientes)) {
          const clientesStore = db.createObjectStore(this.stores.clientes, { keyPath: 'cod_cliente' });
          clientesStore.createIndex('nombre_ccliente', 'nombre_ccliente', { unique: false });
          clientesStore.createIndex('codigo_gestor', 'codigo_gestor', { unique: false });
        }

        // Store para pagos
        if (!db.objectStoreNames.contains(this.stores.pagos)) {
          const pagosStore = db.createObjectStore(this.stores.pagos, { keyPath: 'idpag', autoIncrement: true });
          pagosStore.createIndex('cod_cliente', 'cod_cliente', { unique: false });
          pagosStore.createIndex('codigo_gestor', 'codigo_gestor', { unique: false });
          pagosStore.createIndex('fechap', 'fechap', { unique: false });
        }

        // Store para configuraciones
        if (!db.objectStoreNames.contains(this.stores.configuraciones)) {
          db.createObjectStore(this.stores.configuraciones, { keyPath: 'key' });
        }

        // Store para sincronización pendiente
        if (!db.objectStoreNames.contains(this.stores.pendingSync)) {
          const syncStore = db.createObjectStore(this.stores.pendingSync, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para tickets
        if (!db.objectStoreNames.contains(this.stores.tickets)) {
          const ticketsStore = db.createObjectStore(this.stores.tickets, { keyPath: 'id', autoIncrement: true });
          ticketsStore.createIndex('cod_cliente', 'cod_cliente', { unique: false });
          ticketsStore.createIndex('fecha', 'fecha', { unique: false });
        }
      };
    });
  }

  // OPERACIONES DE CLIENTES
  async saveClientes(clientes: any[]): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const transaction = this.db.transaction([this.stores.clientes], 'readwrite');
    const store = transaction.objectStore(this.stores.clientes);
    
    // Limpiar store existente
    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve(clearRequest.result);
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Agregar nuevos clientes
    for (const cliente of clientes) {
      await new Promise((resolve, reject) => {
        const request = store.add(cliente);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getClientes(codigoGestor?: string): Promise<any[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const transaction = this.db.transaction([this.stores.clientes], 'readonly');
    const store = transaction.objectStore(this.stores.clientes);
    
    return new Promise((resolve, reject) => {
      const request = codigoGestor 
        ? store.index('codigo_gestor').getAll(codigoGestor)
        : store.getAll();
        
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async searchClientes(query: string, codigoGestor?: string): Promise<any[]> {
    const clientes = await this.getClientes(codigoGestor);
    const searchTerm = query.toLowerCase();
    
    return clientes.filter(cliente => 
      cliente.cod_cliente.toLowerCase().includes(searchTerm) ||
      cliente.nombre_ccliente.toLowerCase().includes(searchTerm) ||
      cliente.tel1_cliente?.toLowerCase().includes(searchTerm)
    );
  }

  // OPERACIONES DE PAGOS
  async savePago(pago: any): Promise<number> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const transaction = this.db.transaction([this.stores.pagos, this.stores.pendingSync], 'readwrite');
    const pagoStore = transaction.objectStore(this.stores.pagos);
    const syncStore = transaction.objectStore(this.stores.pendingSync);
    
    // Agregar pago local
    const pagoRequest = await new Promise<number>((resolve, reject) => {
      const request = pagoStore.add({
        ...pago,
        fechap: new Date().toISOString().split('T')[0],
        fechahora: new Date().toISOString(),
        offline: true,
        synced: false
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });

    // Agregar a cola de sincronización
    await new Promise((resolve, reject) => {
      const request = syncStore.add({
        type: 'pago',
        data: { ...pago, localId: pagoRequest },
        timestamp: new Date().getTime()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return pagoRequest;
  }

  async getPagos(codigoGestor?: string): Promise<any[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const transaction = this.db.transaction([this.stores.pagos], 'readonly');
    const store = transaction.objectStore(this.stores.pagos);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let result = request.result;
        if (codigoGestor) {
          result = result.filter(pago => pago.codigo_gestor === codigoGestor);
        }
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // OPERACIONES DE CONFIGURACIÓN
  async saveConfig(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const transaction = this.db.transaction([this.stores.configuraciones], 'readwrite');
    const store = transaction.objectStore(this.stores.configuraciones);
    
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getConfig(key: string): Promise<any> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const transaction = this.db.transaction([this.stores.configuraciones], 'readonly');
    const store = transaction.objectStore(this.stores.configuraciones);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  // SINCRONIZACIÓN
  async getPendingSync(): Promise<any[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const transaction = this.db.transaction([this.stores.pendingSync], 'readonly');
    const store = transaction.objectStore(this.stores.pendingSync);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncItem(id: number): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const transaction = this.db.transaction([this.stores.pendingSync], 'readwrite');
    const store = transaction.objectStore(this.stores.pendingSync);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // TICKETS
  async saveTicket(ticket: any): Promise<number> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const transaction = this.db.transaction([this.stores.tickets], 'readwrite');
    const store = transaction.objectStore(this.stores.tickets);
    
    return new Promise((resolve, reject) => {
      const request = store.add({
        ...ticket,
        fecha: new Date().toISOString(),
        impreso: false
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getTickets(): Promise<any[]> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const transaction = this.db.transaction([this.stores.tickets], 'readonly');
    const store = transaction.objectStore(this.stores.tickets);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton para el manager de almacenamiento offline
export const offlineStorage = new OfflineStorageManager();

// Hook para inicializar el almacenamiento offline
export const useOfflineStorage = () => {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    const initStorage = async () => {
      try {
        await offlineStorage.init();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error inicializando almacenamiento offline:', error);
      }
    };

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    initStorage();
    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return { isInitialized, isOnline };
};

import React from 'react';
