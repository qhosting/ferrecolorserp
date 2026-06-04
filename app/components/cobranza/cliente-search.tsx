
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, Phone, MapPin, DollarSign, Calendar, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { offlineStorage, useOfflineStorage } from '@/lib/offline-storage';
import { syncManager } from '@/lib/sync-manager';

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

interface ClienteSearchProps {
  codigoGestor: string;
  onClienteSelect: (cliente: Cliente) => void;
}

export default function ClienteSearch({ codigoGestor, onClienteSelect }: ClienteSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { isInitialized, isOnline } = useOfflineStorage();

  // Cargar clientes al inicializar
  useEffect(() => {
    if (isInitialized) {
      loadClientes();
    }
  }, [isInitialized, codigoGestor]);

  const loadClientes = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (isOnline) {
        // Intentar descargar clientes actualizados del servidor
        try {
          await syncManager.downloadClientes(codigoGestor);
        } catch (syncError) {
          console.warn('Error sincronizando clientes, usando datos offline:', syncError);
        }
      }
      
      // Cargar clientes desde almacenamiento offline
      const clientesOffline = await offlineStorage.getClientes(codigoGestor);
      setClientes(clientesOffline);
      
      if (clientesOffline.length === 0 && !isOnline) {
        setError('No hay clientes disponibles offline. Conecte a internet para descargar.');
      }
      
    } catch (err) {
      setError('Error cargando clientes: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes basado en búsqueda
  const clientesFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    
    const term = searchTerm.toLowerCase();
    return clientes.filter(cliente =>
      cliente.cod_cliente.toLowerCase().includes(term) ||
      cliente.nombre_ccliente.toLowerCase().includes(term) ||
      cliente.tel1_cliente?.toLowerCase().includes(term)
    );
  }, [clientes, searchTerm]);

  const handleRefresh = () => {
    loadClientes();
  };

  if (!isInitialized) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Inicializando almacenamiento offline...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Buscar Cliente
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? 'default' : 'secondary'} className="flex items-center gap-1">
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'En línea' : 'Offline'}
            </Badge>
            <Button 
              onClick={handleRefresh} 
              size="sm" 
              disabled={loading}
              variant="outline"
            >
              Actualizar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por código, nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Cargando clientes...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Lista de clientes */}
        {!loading && !error && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {clientesFiltrados.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
              </p>
            ) : (
              clientesFiltrados.map((cliente) => (
                <ClienteCard 
                  key={cliente.cod_cliente} 
                  cliente={cliente} 
                  onSelect={() => onClienteSelect(cliente)}
                />
              ))
            )}
          </div>
        )}

        {/* Información de estado */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <p>Total de clientes: {clientes.length}</p>
          {searchTerm && <p>Resultados filtrados: {clientesFiltrados.length}</p>}
          {!isOnline && <p className="text-orange-600">⚠️ Trabajando en modo offline</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ClienteCard({ cliente, onSelect }: { cliente: Cliente; onSelect: () => void }) {
  const saldo = parseFloat(cliente.saldo_actualcli) || 0;
  const diasVencidos = parseInt(cliente.semdv) || 0;
  
  return (
    <Card 
      className="cursor-pointer hover:bg-gray-50 transition-colors border-l-4 border-l-blue-500"
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium text-gray-900">{cliente.nombre_ccliente}</h3>
            <p className="text-sm text-gray-600">Código: {cliente.cod_cliente}</p>
          </div>
          <Badge variant={saldo > 0 ? 'destructive' : 'default'}>
            ${saldo.toFixed(2)}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          {cliente.tel1_cliente && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span className="truncate">{cliente.tel1_cliente}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{cliente.periodicidad_cliente}</span>
          </div>
          
          {cliente.calle_dom && (
            <div className="flex items-center gap-1 col-span-2">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{cliente.calle_dom}, {cliente.colonia_dom}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>Pago: ${cliente.pagos_cliente}</span>
          </div>
          
          {diasVencidos > 0 && (
            <div className="text-red-600">
              <span>Vencido: {diasVencidos} días</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
