
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  MapPin,
  CreditCard,
  Filter,
  Eye,
  Edit,
  Trash2,
  Upload,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Link2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function SmartPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const [inputPage, setInputPage] = useState('');

  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | 'ellipsis')[] = [];
    const range = 2;

    const addPage = (p: number) => {
      if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
    };

    addPage(1);
    for (let p = currentPage - range; p <= currentPage + range; p++) addPage(p);
    addPage(totalPages);

    pages.sort((a, b) => (a as number) - (b as number));
    const result: (number | 'ellipsis')[] = [];
    for (let i = 0; i < pages.length; i++) {
      result.push(pages[i]);
      if (i < pages.length - 1 && (pages[i + 1] as number) - (pages[i] as number) > 1) {
        result.push('ellipsis');
      }
    }
    return result;
  };

  const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const p = parseInt(inputPage);
      if (p >= 1 && p <= totalPages) {
        onPageChange(p);
        setInputPage('');
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      <Button
        variant="outline" size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        title="Primera página"
      >
        <ChevronsLeft className="w-4 h-4" />
      </Button>
      <Button
        variant="outline" size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {getPages().map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400 select-none">…</span>
        ) : (
          <Button
            key={p}
            variant={currentPage === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(p as number)}
            className="min-w-[36px]"
          >
            {p}
          </Button>
        )
      )}

      <Button
        variant="outline" size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      <Button
        variant="outline" size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        title="Última página"
      >
        <ChevronsRight className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1 ml-2">
        <span className="text-sm text-gray-500">Ir a:</span>
        <Input
          className="w-16 h-8 text-center text-sm"
          placeholder="Pág"
          value={inputPage}
          onChange={(e) => setInputPage(e.target.value)}
          onKeyDown={handleJump}
          type="number"
          min={1}
          max={totalPages}
        />
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const { data: session } = useSession() || {};
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para filtros
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterPeriodicidad, setFilterPeriodicidad] = useState<string>('TODOS');
  const [filterConSaldo, setFilterConSaldo] = useState<boolean>(false);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState({
    total: 0,
    activos: 0,
    morosos: 0,
    saldoTotal: 0
  });

  const debouncedSearch = useDebounce(searchTerm, DEBOUNCE_MS);

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

  // Estado para diálogo de confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; clienteId: string | null; nombre: string }>({
    open: false, clienteId: null, nombre: ''
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const userRole = session?.user?.role;
  const permissions = userRole ? RolePermissions[userRole as keyof typeof RolePermissions] : null;
  const canCreate = permissions?.clientes?.create === true;
  const canUpdate = permissions?.clientes?.update === true;
  const canDelete = permissions?.clientes?.delete === true;

  // Reset a página 1 al cambiar filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, filterPeriodicidad, filterConSaldo]);

  useEffect(() => {
    if (session?.user) {
      fetchClientes();
    }
  }, [session, currentPage, debouncedSearch, filterStatus, filterPeriodicidad, filterConSaldo]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const gestorId = (session?.user as any)?.id;
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: PAGE_SIZE.toString(),
        search: debouncedSearch,
        status: filterStatus,
        periodicidad: filterPeriodicidad,
        conSaldo: filterConSaldo.toString(),
      });

      if (gestorId && !['ADMIN', 'SUPERADMIN'].includes(session?.user?.role || '')) {
        params.append('gestorId', gestorId);
      }

      const response = await fetch(`/api/clientes?${params}`);
      if (response?.ok) {
        const data = await response.json();
        setClientes(data.clientes || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.pages || 1);
        if (data.statistics) {
          setStatistics(data.statistics);
        }
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

  const handleDeleteCliente = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setDeleteConfirm({ open: true, clienteId, nombre: cliente?.nombre ?? 'este cliente' });
  };

  const confirmDeleteCliente = async () => {
    if (!deleteConfirm.clienteId) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/clientes/${deleteConfirm.clienteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        if (data.modo === 'eliminado') {
          toast.success(`Cliente eliminado permanentemente`);
        } else {
          // Soft-delete: tiene movimientos, se desactivó
          toast.success(`Cliente desactivado: ${data.message}`, { duration: 5000 });
        }
        // En ambos casos lo quitamos de la vista (eliminado o ahora inactivo)
        setClientes(prev => prev.filter(c => c.id !== deleteConfirm.clienteId));
      } else {
        toast.error(data.error ?? 'Error al procesar la solicitud');
      }
    } catch (error) {
      console.error('Error deleting cliente:', error);
      toast.error('Error al eliminar el cliente');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm({ open: false, clienteId: null, nombre: '' });
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

  const handleSyncContpaqi = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/contpaqi/sync/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'pull' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al sincronizar');
      const { importados = 0, fallidos = 0 } = data.data ?? {};
      toast.success(`Sincronización completada: ${importados} importados, ${fallidos} fallidos`);
      fetchClientes();
    } catch (err: any) {
      toast.error(`Error al sincronizar: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
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
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Gestión de Clientes"
        description="Administra la información de tus clientes y su cartera"
      />
      <div className="p-6 space-y-6">

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
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            onClick={handleShowFilters}
            className={showFilters ? "border-purple-500 text-purple-600 bg-purple-50" : ""}
          >
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
          <Button
            variant="outline"
            onClick={handleSyncContpaqi}
            disabled={syncLoading}
            title="Importar clientes desde CONTPAQi Comercial Premium"
          >
            {syncLoading
              ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              : <Link2 className="mr-2 h-4 w-4 text-blue-600" />}
            {syncLoading ? 'Sincronizando...' : 'Sync CONTPAQi'}
          </Button>
          <Button variant="outline" onClick={handleBulkSMS}>
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS Masivo
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="border border-purple-500/20 bg-card/60 backdrop-blur-md transition-all duration-300">
          <CardContent className="p-4 grid gap-4 grid-cols-1 md:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="ACTIVO">Activo</SelectItem>
                  <SelectItem value="INACTIVO">Inactivo</SelectItem>
                  <SelectItem value="MOROSO">Moroso</SelectItem>
                  <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                  <SelectItem value="PROSPECTO">Prospecto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Periodicidad</Label>
              <Select value={filterPeriodicidad} onValueChange={setFilterPeriodicidad}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="DIARIO">Diario</SelectItem>
                  <SelectItem value="SEMANAL">Semanal</SelectItem>
                  <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                  <SelectItem value="MENSUAL">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 h-10 border rounded-md px-3 bg-background">
              <Checkbox
                id="onlyDebt"
                checked={filterConSaldo}
                onCheckedChange={(checked) => setFilterConSaldo(checked as boolean)}
              />
              <Label htmlFor="onlyDebt" className="text-sm font-medium cursor-pointer select-none">
                Solo con saldo pendiente
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterStatus('TODOS');
                  setFilterPeriodicidad('TODOS');
                  setFilterConSaldo(false);
                }}
                className="w-full"
                disabled={filterStatus === 'TODOS' && filterPeriodicidad === 'TODOS' && !filterConSaldo}
              >
                Limpiar filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total.toLocaleString()}</div>
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
              {statistics.activos.toLocaleString()}
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
              {statistics.morosos.toLocaleString()}
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
              {formatCurrency(statistics.saldoTotal)}
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
          {clientes?.length === 0 ? (
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
                  {clientes?.map?.((cliente) => (
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-sm text-gray-500">
            Mostrando{' '}
            <span className="font-medium">{((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}</span>
            {' '}–{' '}
            <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, total).toLocaleString()}</span>
            {' '}de{' '}
            <span className="font-medium">{total.toLocaleString()}</span> clientes
          </p>
          <SmartPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

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

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Eliminar cliente"
        message={`¿Eliminar a "${deleteConfirm.nombre}"?\n\n• Si no tiene ventas, pagos ni pedidos → se eliminará permanentemente.\n• Si tiene movimientos registrados → se marcará como Inactivo para preservar el historial.`}
        confirmLabel="Sí, eliminar"
        variant="danger"
        loading={deleteLoading}
        onConfirm={confirmDeleteCliente}
        onCancel={() => setDeleteConfirm({ open: false, clienteId: null, nombre: '' })}
      />
      </div>
    </div>
  );
}
