
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

  // Determinar gradiente y acento por estatus
  const getHeaderGradient = (status: string) => {
    switch (status) {
      case 'ACTIVO':
        return 'from-emerald-500/15 via-indigo-500/5 to-transparent border-emerald-500/20';
      case 'MOROSO':
        return 'from-rose-500/15 via-slate-500/5 to-transparent border-rose-500/20';
      case 'BLOQUEADO':
        return 'from-amber-500/15 via-slate-500/5 to-transparent border-amber-500/20';
      case 'PROSPECTO':
        return 'from-blue-500/15 via-slate-500/5 to-transparent border-blue-500/20';
      default:
        return 'from-slate-500/15 via-slate-500/5 to-transparent border-slate-700/30';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header con gradiente dinámico */}
        {cliente && (
          <div className={cn(
            "relative px-6 py-6 border-b bg-gradient-to-r",
            getHeaderGradient(cliente.status)
          )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                  <User className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Detalles del Cliente</span>
                </div>
                <h2 className="text-2xl font-black text-white leading-tight tracking-tight mt-1">{cliente.nombre}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono mt-1">
                  <span>Código: <strong className="text-slate-200">{cliente.codigoCliente}</strong></span>
                  {cliente.rfc && (
                    <>
                      <span className="text-slate-700">•</span>
                      <span>RFC: <strong className="text-slate-200">{cliente.rfc}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* Acciones principales y Badge */}
              <div className="flex flex-row md:flex-col items-start md:items-end justify-between md:justify-center gap-3">
                <div className="flex items-center gap-2">
                  {getStatusBadge(cliente.status)}
                  <span className="text-[10px] text-slate-500 font-medium">
                    Miembro desde: {formatDate(cliente.fechaAlta)}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncContpaqi}
                    disabled={syncing}
                    className="h-8 rounded-lg border-slate-850 hover:border-blue-500 hover:bg-blue-500/5 text-blue-400 text-xs font-semibold"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
                    {syncing ? 'Sincronizando...' : 'CONTPAQi'}
                  </Button>
                  {onEdit && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEdit(clienteId)}
                      className="h-8 rounded-lg border-slate-850 hover:border-indigo-500 hover:bg-indigo-500/5 text-indigo-400 text-xs font-semibold"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {cliente.contpaqiSyncAt && (
              <p className="absolute bottom-2 left-6 text-[9px] text-emerald-400/80 font-medium">
                Última sincronización CONTPAQi: {new Date(cliente.contpaqiSyncAt).toLocaleString('es-MX')}
              </p>
            )}
          </div>
        )}

        {/* Contenido con scrollbar personalizado */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Cargando información...</p>
            </div>
          ) : cliente ? (
            <div className="space-y-6">
              
              {/* Grid de 4 columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Contacto */}
                <Card className="bg-slate-900/40 border-slate-800/80 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-sky-400" /> Contacto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Teléfono Principal</span>
                      <span className="font-semibold text-slate-200">{cliente.telefono1 || 'No registrado'}</span>
                    </div>
                    {cliente.telefono2 && (
                      <div>
                        <span className="text-slate-500 block">Teléfono Secundario</span>
                        <span className="font-semibold text-slate-200">{cliente.telefono2}</span>
                      </div>
                    )}
                    {cliente.email && (
                      <div>
                        <span className="text-slate-500 block">Email corporativo</span>
                        <a href={`mailto:${cliente.email}`} className="font-semibold text-indigo-400 hover:underline break-all">
                          {cliente.email}
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dirección */}
                <Card className="bg-slate-900/40 border-slate-800/80 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-rose-400" /> Dirección
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-xs text-slate-300">
                    {cliente.calle ? (
                      <>
                        <p className="font-semibold text-slate-200">{cliente.calle} {cliente.numeroExterior}</p>
                        {cliente.colonia && <p className="text-slate-400">Col. {cliente.colonia}</p>}
                        <p className="text-slate-400">{cliente.municipio}, {cliente.estado}</p>
                        {cliente.codigoPostal && <p className="font-mono text-slate-500 mt-1">CP: {cliente.codigoPostal}</p>}
                      </>
                    ) : (
                      <p className="text-slate-500 italic py-2">Sin dirección registrada</p>
                    )}
                  </CardContent>
                </Card>

                {/* Datos Fiscales */}
                <Card className="bg-slate-900/40 border-slate-800/80 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 text-amber-400" /> Datos Fiscales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Uso de CFDI</span>
                      <span className="font-mono font-bold text-slate-300">{cliente.usoCfdi || 'G03 - Adquisición de mercancías'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Método de Pago</span>
                      <span className="font-mono font-bold text-slate-300">{cliente.metodoPago || 'PPD - Pago en parcialidades'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Régimen Fiscal</span>
                      <span className="text-slate-300 font-semibold truncate block" title={cliente.regimenFiscal || 'No asignado'}>
                        {cliente.regimenFiscal || 'No asignado'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Financiero */}
                <Card className="bg-slate-900/40 border-slate-800/80 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-400" /> Financiero
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-500 block">Saldo Actual</span>
                      <span className={cn(
                        "text-lg font-black block",
                        cliente.saldoActual > 0 ? "text-rose-400" : "text-emerald-400"
                      )}>
                        {formatCurrency(cliente.saldoActual)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/60 pt-2 text-[11px]">
                      <span className="text-slate-500">Abono Pactado</span>
                      <span className="font-semibold text-slate-200">{formatCurrency(cliente.pagosPeriodicos)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Periodicidad</span>
                      <span className="font-bold text-indigo-400">{cliente.periodicidad}</span>
                    </div>
                    {cliente.diaCobro && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Día de Cobro</span>
                        <span className="font-bold text-slate-300">{cliente.diaCobro}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>

              {/* Personal Asignado */}
              <Card className="bg-slate-900/30 border-slate-800/80 rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-indigo-400" /> Personal Asignado
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Gestor */}
                  <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/50">
                    <div className="h-8 w-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      {cliente.gestor?.firstName?.[0] || 'G'}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Gestor de Cobranza</span>
                      <span className="text-xs font-semibold text-slate-200">
                        {cliente.gestor?.firstName ? `${cliente.gestor.firstName} ${cliente.gestor.lastName || ''}` : 'No asignado'}
                      </span>
                    </div>
                  </div>

                  {/* Vendedor */}
                  <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/50">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      {cliente.vendedor?.firstName?.[0] || 'V'}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Vendedor Asignado</span>
                      <span className="text-xs font-semibold text-slate-200">
                        {cliente.vendedor?.firstName ? `${cliente.vendedor.firstName} ${cliente.vendedor.lastName || ''}` : 'No asignado'}
                      </span>
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Historial de Pagos */}
              {cliente.ultimosPagos && cliente.ultimosPagos.length > 0 && (
                <Card className="bg-slate-900/30 border-slate-800/80 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-3 border-b border-slate-800/60 bg-slate-900/20">
                    <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Últimos Pagos Registrados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-800/50">
                      {cliente.ultimosPagos.map((pago, index) => (
                        <div key={index} className="flex justify-between items-center px-4 py-3 hover:bg-slate-900/10 transition-colors">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-slate-200">{pago.concepto}</p>
                            <p className="text-[10px] text-slate-500">{formatDate(pago.fecha)}</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            +{formatCurrency(pago.monto)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <User className="h-10 w-10 text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">No se pudo cargar la información</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
