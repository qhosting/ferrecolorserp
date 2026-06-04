
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Calendar,
  DollarSign,
  Users,
  Edit,
  X,
  RefreshCw,
  Database
} from 'lucide-react';

interface ClienteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  onEdit?: (clienteId: string) => void;
}

interface ClienteDetalle {
  id: string;
  codigoCliente: string;
  nombre: string;
  rfc?: string | null;
  usoCfdi?: string | null;
  metodoPago?: string | null;
  regimenFiscal?: string | null;
  codigoPostalFiscal?: string | null;
  telefono1?: string;
  telefono2?: string;
  email?: string;
  municipio?: string;
  estado?: string;
  colonia?: string;
  calle?: string;
  numeroExterior?: string;
  codigoPostal?: string;
  saldoActual: number;
  pagosPeriodicos: number;
  periodicidad: string;
  status: string;
  diaCobro?: string;
  fechaAlta?: string;
  contpaqiCodigo?: string | null;
  contpaqiSyncAt?: string | null;
  gestor?: { firstName?: string; lastName?: string; };
  vendedor?: { firstName?: string; lastName?: string; };
  // Historial de pagos reciente
  ultimosPagos?: Array<{
    fecha: string;
    monto: number;
    concepto: string;
  }>;
}

export function ClienteDetailModal({ isOpen, onClose, clienteId, onEdit }: ClienteDetailModalProps) {
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (isOpen && clienteId) {
      fetchClienteDetail();
    }
  }, [isOpen, clienteId]);

  const fetchClienteDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/clientes/${clienteId}`);
      if (response.ok) {
        const data = await response.json();
        setCliente(data);
      }
    } catch (error) {
      console.error('Error fetching cliente detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncContpaqi = async () => {
    if (!cliente) return;
    setSyncing(true);
    const toastId = toast.loading('Sincronizando datos con CONTPAQi...');
    
    try {
      const response = await fetch('/api/contpaqi/sync/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accion: 'push',
          id: clienteId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || 'Cliente sincronizado exitosamente con CONTPAQi', { id: toastId });
        // Recargar para ver los datos actualizados
        fetchClienteDetail();
      } else {
        toast.error(data.error || 'Error al sincronizar el cliente', { id: toastId });
      }
    } catch (error) {
      console.error('Error syncing client:', error);
      toast.error('Error de red al sincronizar con CONTPAQi', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'ACTIVO': { color: 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400', text: 'Activo' },
      'INACTIVO': { color: 'bg-gray-100 text-gray-800 dark:bg-gray-950/30 dark:text-gray-400', text: 'Inactivo' },
      'MOROSO': { color: 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400', text: 'Moroso' },
      'BLOQUEADO': { color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400', text: 'Bloqueado' },
      'PROSPECTO': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400', text: 'Prospecto' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['ACTIVO'];
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalles del Cliente
          </DialogTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncContpaqi}
              disabled={syncing || !cliente}
              className="border-blue-500/20 hover:border-blue-500 hover:bg-blue-500/5 text-blue-600 dark:text-blue-400"
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} />
              {syncing ? 'Sincronizando...' : 'Sincronizar CONTPAQi'}
            </Button>
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(clienteId)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : cliente ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{cliente.nombre}</h2>
                <p className="text-gray-600 dark:text-gray-400">Código: {cliente.codigoCliente}</p>
                {cliente.rfc && (
                  <p className="text-sm font-mono mt-1 text-slate-500 dark:text-slate-400">RFC: {cliente.rfc}</p>
                )}
              </div>
              <div className="text-right">
                {getStatusBadge(cliente.status)}
                <p className="text-sm text-gray-500 mt-1">
                  Cliente desde: {formatDate(cliente.fechaAlta)}
                </p>
                {cliente.contpaqiSyncAt && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    Sincronizado: {new Date(cliente.contpaqiSyncAt).toLocaleString('es-MX')}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Información de Contacto */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Teléfono 1:</span>
                    <p>{cliente.telefono1 || 'N/A'}</p>
                  </div>
                  {cliente.telefono2 && (
                    <div>
                      <span className="font-medium">Teléfono 2:</span>
                      <p>{cliente.telefono2}</p>
                    </div>
                  )}
                  {cliente.email && (
                    <div>
                      <span className="font-medium">Email:</span>
                      <p className="break-all">{cliente.email}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dirección */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Dirección
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {cliente.calle && (
                    <p>{cliente.calle} {cliente.numeroExterior}</p>
                  )}
                  {cliente.colonia && (
                    <p>Col. {cliente.colonia}</p>
                  )}
                  <p>{cliente.municipio || 'N/A'}, {cliente.estado || 'N/A'}</p>
                  {cliente.codigoPostal && (
                    <p>CP: {cliente.codigoPostal}</p>
                  )}
                </CardContent>
              </Card>

              {/* Datos Fiscales */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Datos Fiscales (CFDI 4.0)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Uso de CFDI:</span>
                    <p className="font-mono text-xs">{cliente.usoCfdi || 'No asignado'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Método de Pago:</span>
                    <p className="font-mono text-xs">{cliente.metodoPago || 'No asignado'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Régimen Fiscal:</span>
                    <p className="text-xs">{cliente.regimenFiscal || 'No asignado'}</p>
                  </div>
                  {cliente.codigoPostalFiscal && (
                    <div>
                      <span className="font-medium">CP Fiscal:</span>
                      <p className="font-mono">{cliente.codigoPostalFiscal}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Información Financiera */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Financiero
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Saldo Actual:</span>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(cliente.saldoActual)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Pago Periódico:</span>
                    <p className="font-medium">
                      {formatCurrency(cliente.pagosPeriodicos)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Periodicidad:</span>
                    <p>{cliente.periodicidad}</p>
                  </div>
                  {cliente.diaCobro && (
                    <div>
                      <span className="font-medium">Día de Cobro:</span>
                      <p>{cliente.diaCobro}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Asignaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Personal Asignado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-sm">Gestor de Cobranza:</span>
                    <p>{cliente.gestor?.firstName || 'No asignado'} {cliente.gestor?.lastName || ''}</p>
                  </div>
                  <div>
                    <span className="font-medium text-sm">Vendedor:</span>
                    <p>{cliente.vendedor?.firstName || 'No asignado'} {cliente.vendedor?.lastName || ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Historial de Pagos Reciente */}
            {cliente.ultimosPagos && cliente.ultimosPagos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Últimos Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cliente.ultimosPagos.map((pago, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{pago.concepto}</p>
                          <p className="text-sm text-gray-500">{formatDate(pago.fecha)}</p>
                        </div>
                        <div className="font-bold text-green-600">
                          {formatCurrency(pago.monto)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p>No se pudo cargar la información del cliente.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
