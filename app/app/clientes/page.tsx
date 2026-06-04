
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RolePermissions } from '@/lib/types';
import { ClienteDetailModal } from '@/components/clientes/cliente-detail-modal';
import { ClienteFormModal } from '@/components/clientes/cliente-form-modal';
import { ClienteImportModal } from '@/components/clientes/cliente-import-modal';
import { WhatsAppModal } from '@/components/comunicacion/whatsapp-modal';
import { SMSModal } from '@/components/comunicacion/sms-modal';
import { BulkSMSModal } from '@/components/comunicacion/bulk-sms-modal';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  MapPin,
  CreditCard,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Upload,
  MessageCircle,
  MessageSquare
} from 'lucide-react';

interface Cliente {
  id: string;
  codigoCliente: string;
  nombre: string;
  telefono1?: string;
  municipio?: string;
  estado?: string;
  saldoActual: number;
  pagosPeriodicos: number;
  periodicidad: string;
  status: string;
  diaCobro?: string;
  gestor?: { firstName?: string; lastName?: string; };
  vendedor?: { firstName?: string; lastName?: string; };
}

export default function ClientesPage() {
  const { data: session } = useSession() || {};
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para modales
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [comunicacionCliente, setComunicacionCliente] = useState<Cliente | null>(null);

  const userRole = session?.user?.role;
  const permissions = userRole ? RolePermissions[userRole] : null;
  const canCreate = permissions?.clientes?.create === true;
  const canUpdate = permissions?.clientes?.update === true;
  const canDelete = permissions?.clientes?.delete === true;

  useEffect(() => {
    if (session?.user) {
      fetchClientes();
    }
  }, [session]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clientes?.filter?.(cliente =>
        cliente?.nombre?.toLowerCase()?.includes?.(searchTerm?.toLowerCase()) ||
        cliente?.codigoCliente?.toLowerCase()?.includes?.(searchTerm?.toLowerCase()) ||
        cliente?.telefono1?.includes?.(searchTerm) ||
        cliente?.municipio?.toLowerCase()?.includes?.(searchTerm?.toLowerCase())
      ) || [];
      setFilteredClientes(filtered);
    } else {
      setFilteredClientes(clientes);
    }
  }, [searchTerm, clientes]);

  const fetchClientes = async () => {
    try {
      // Obtener ID del gestor de la sesión si es necesario
      const gestorId = (session?.user as any)?.id;
      
      const url = gestorId && !['ADMIN', 'SUPERADMIN'].includes(session?.user?.role || '') 
        ? `/api/clientes?gestorId=${encodeURIComponent(gestorId)}`
        : '/api/clientes';
      
      const response = await fetch(url);
      if (response?.ok) {
        const data = await response.json();
        setClientes(data || []);
      } else {
        console.error('Error response:', response.status, response.statusText);
        toast.error('Error al cargar clientes');
      }
    } catch (error) {
      console.error('Error fetching clientes:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'ACTIVO': { color: 'bg-green-100 text-green-800', text: 'Activo' },
      'INACTIVO': { color: 'bg-gray-100 text-gray-800', text: 'Inactivo' },
      'MOROSO': { color: 'bg-red-100 text-red-800', text: 'Moroso' },
      'BLOQUEADO': { color: 'bg-orange-100 text-orange-800', text: 'Bloqueado' },
      'PROSPECTO': { color: 'bg-blue-100 text-blue-800', text: 'Prospecto' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['ACTIVO'];
    
    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const handleShowFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleNewCliente = () => {
    setEditingClienteId(null);
    setShowFormModal(true);
  };

  const handleImportClientes = () => {
    setShowImportModal(true);
  };

  const handleViewCliente = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    setShowDetailModal(true);
  };

  const handleEditCliente = (clienteId: string) => {
    setEditingClienteId(clienteId);
    setShowFormModal(true);
  };

  const handleDeleteCliente = async (clienteId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      return;
    }

    try {
      const response = await fetch(`/api/clientes/${clienteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Cliente eliminado exitosamente');
        // Remover el cliente de la lista local
        setClientes(prev => prev.filter(c => c.id !== clienteId));
      } else {
        toast.error('Error al eliminar el cliente');
      }
    } catch (error) {
      console.error('Error deleting cliente:', error);
      toast.error('Error al eliminar el cliente');
    }
  };

  const handleModalSuccess = () => {
    // Recargar la lista de clientes después de crear/editar
    fetchClientes();
  };

  const handleEditFromDetail = (clienteId: string) => {
    setShowDetailModal(false);
    setEditingClienteId(clienteId);
    setShowFormModal(true);
  };

  const handleWhatsAppCliente = (cliente: Cliente) => {
    setComunicacionCliente(cliente);
    setShowWhatsAppModal(true);
  };

  const handleSMSCliente = (cliente: Cliente) => {
    setComunicacionCliente(cliente);
    setShowSMSModal(true);
  };

  const handleBulkSMS = () => {
    setShowBulkSMSModal(true);
  };

  const closeModals = () => {
    setShowDetailModal(false);
    setShowFormModal(false);
    setShowImportModal(false);
    setShowWhatsAppModal(false);
    setShowSMSModal(false);
    setShowBulkSMSModal(false);
    setSelectedClienteId(null);
    setEditingClienteId(null);
    setComunicacionCliente(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Header 
        title="Gestión de Clientes"
        description="Administra la información de tus clientes y su cartera"
      />

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button variant="outline" onClick={handleShowFilters}>
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {canCreate && (
            <Button onClick={handleNewCliente}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          )}
          <Button variant="outline" onClick={handleImportClientes}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button variant="outline" onClick={handleBulkSMS}>
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS Masivo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Clientes registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {clientes?.filter?.(c => c?.status === 'ACTIVO')?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Morosos</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {clientes?.filter?.(c => c?.status === 'MOROSO')?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren seguimiento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cartera Total</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                clientes?.reduce?.((sum, c) => sum + (c?.saldoActual || 0), 0) || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo por cobrar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClientes?.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No hay clientes
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No se encontraron clientes con ese criterio de búsqueda.' : 'Comienza agregando un nuevo cliente.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Contacto</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Ubicación</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Saldo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Pago</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Asignado</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClientes?.map?.((cliente) => (
                    <tr key={cliente?.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{cliente?.nombre}</div>
                          <div className="text-sm text-gray-500">{cliente?.codigoCliente}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone className="mr-2 h-4 w-4 text-gray-400" />
                          {cliente?.telefono1 || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                          {cliente?.municipio ? `${cliente.municipio}, ${cliente?.estado}` : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(cliente?.saldoActual)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(cliente?.pagosPeriodicos)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {cliente?.periodicidad} - {cliente?.diaCobro}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(cliente?.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900">
                          Gestor: {cliente?.gestor?.firstName || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Ventas: {cliente?.vendedor?.firstName || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewCliente(cliente?.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canUpdate && (
                            <Button variant="ghost" size="sm" onClick={() => handleEditCliente(cliente?.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {cliente?.telefono1 && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleWhatsAppCliente(cliente)} title="Enviar WhatsApp">
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleSMSCliente(cliente)} title="Enviar SMS">
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteCliente(cliente?.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <ClienteDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        clienteId={selectedClienteId || ''}
        onEdit={handleEditFromDetail}
      />

      <ClienteFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        clienteId={editingClienteId || undefined}
        onSuccess={handleModalSuccess}
      />

      <ClienteImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleModalSuccess}
      />

      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        clienteNombre={comunicacionCliente?.nombre}
        clienteTelefono={comunicacionCliente?.telefono1}
        mensajePredefinido={(comunicacionCliente?.saldoActual || 0) > 0 
          ? `Estimado ${comunicacionCliente?.nombre}, le recordamos que tiene un saldo pendiente de $${(comunicacionCliente?.saldoActual || 0).toFixed(2)}. Favor de contactarnos para más información.`
          : ''
        }
      />

      <SMSModal
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
        clienteNombre={comunicacionCliente?.nombre}
        clienteTelefono={comunicacionCliente?.telefono1}
        mensajePredefinido={(comunicacionCliente?.saldoActual || 0) > 0 
          ? `Estimado cliente, saldo pendiente: $${(comunicacionCliente?.saldoActual || 0).toFixed(2)}. Contactanos.`
          : ''
        }
      />

      <BulkSMSModal
        isOpen={showBulkSMSModal}
        onClose={() => setShowBulkSMSModal(false)}
      />
    </div>
  );
}
