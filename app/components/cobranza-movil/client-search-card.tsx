
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { offlineStorage } from '@/lib/offline-storage';
import { 
  Search, 
  User, 
  Phone, 
  MapPin, 
  CreditCard,
  DollarSign,
  Calendar,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface ClientSearchCardProps {
  selectedClient: any;
  onClientSelect: (client: any) => void;
  isOnline: boolean;
}

export function ClientSearchCard({ selectedClient, onClientSelect, isOnline }: ClientSearchCardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadRecentClients();
  }, []);

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery.trim().length > 2) {
      searchTimeout.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]);

  const loadRecentClients = async () => {
    try {
      const clients = isOnline 
        ? await fetchClientsFromServer() 
        : await offlineStorage.getClientes();
      
      setRecentClients(clients.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent clients:', error);
      toast.error('Error al cargar clientes recientes');
    }
  };

  const fetchClientsFromServer = async () => {
    const response = await fetch('/api/clientes?limit=50');
    if (!response.ok) throw new Error('Error fetching clients');
    return response.json();
  };

  const performSearch = async (query: string) => {
    setLoading(true);
    try {
      let results = [];
      
      if (isOnline) {
        const response = await fetch(`/api/clientes/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          results = await response.json();
        }
      } else {
        results = await offlineStorage.searchClientes(query);
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error performing search:', error);
      toast.error('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = async (client: any) => {
    onClientSelect(client);
    
    // Guardar en historial de clientes recientes
    try {
      await offlineStorage.saveConfig('lastSelectedClient', client);
    } catch (error) {
      console.error('Error saving recent client:', error);
    }
  };

  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const ClientItem = ({ client, onSelect }: { client: any; onSelect: (client: any) => void }) => (
    <div 
      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
      onClick={() => onSelect(client)}
    >
      <div className="flex items-center space-x-3">
        <Avatar>
          <AvatarFallback className="bg-blue-100 text-blue-600">
            {getClientInitials(client.nombre)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">{client.nombre}</p>
            <Badge variant={client.status === 'ACTIVO' ? 'default' : 'destructive'} className="text-xs">
              {client.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {client.codigoCliente}
            </span>
            {client.telefono1 && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {client.telefono1}
              </span>
            )}
          </div>
          {client.direccion && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {client.direccion}
            </p>
          )}
        </div>
      </div>
      
      <div className="text-right">
        {client.saldoActual && (
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-3 w-3 text-red-500" />
            <span className={`font-medium ${client.saldoActual > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(client.saldoActual)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <Calendar className="h-3 w-3" />
          {client.periodicidad}
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Buscar Cliente
          {!isOnline && (
            <Badge variant="secondary" className="text-xs">
              Offline
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, código o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>

        {/* Resultados de búsqueda */}
        <ScrollArea className="h-80">
          {searchQuery.trim().length > 2 ? (
            <div className="space-y-2">
              {searchResults.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    {searchResults.length} resultado(s) encontrado(s)
                  </p>
                  {searchResults.map((client) => (
                    <ClientItem
                      key={client.id}
                      client={client}
                      onSelect={handleClientSelect}
                    />
                  ))}
                </>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron clientes</p>
                  {!isOnline && (
                    <p className="text-xs text-gray-400 mt-2">
                      Búsqueda limitada en modo offline
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Clientes Recientes</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadRecentClients}
                >
                  Actualizar
                </Button>
              </div>
              
              {recentClients.length > 0 ? (
                <div className="space-y-2">
                  {recentClients.map((client) => (
                    <ClientItem
                      key={client.id}
                      client={client}
                      onSelect={handleClientSelect}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {isOnline ? 'No hay clientes disponibles' : 'Sincroniza para cargar clientes'}
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Cliente seleccionado */}
        {selectedClient && (
          <div className="border-t pt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getClientInitials(selectedClient.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900">{selectedClient.nombre}</p>
                    <p className="text-sm text-gray-600">{selectedClient.codigoCliente}</p>
                  </div>
                </div>
                <Badge variant="secondary">
                  Seleccionado
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
