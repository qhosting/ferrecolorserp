
'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, Calendar, User, DollarSign, CheckCircle, AlertCircle, Eye, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Reestructura {
  id: string;
  cliente: {
    nombre: string;
    codigoCliente: string;
    saldoActual: number;
  };
  venta: {
    folio: string;
    numeroFactura?: string;
    total: number;
    saldoPendiente: number;
  };
  // Condiciones anteriores
  saldoAnterior: number;
  periodicidadAnterior: string;
  montoPagoAnterior: number;
  numeroPagosAnterior: number;
  fechaProximoPagoAnterior?: string;
  // Nuevas condiciones
  saldoNuevo: number;
  periodicidadNueva: string;
  montoPagoNuevo: number;
  numeroPagosNuevo: number;
  fechaProximoPagoNueva: string;
  // Control
  motivo: string;
  observaciones?: string;
  descuentoOtorgado: number;
  interesesCondonados: number;
  autorizadaPor: {
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  fechaReestructura: string;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Cliente {
  id: string;
  nombre: string;
  codigoCliente: string;
  saldoActual: number;
}

interface Venta {
  id: string;
  folio: string;
  numeroFactura?: string;
  total: number;
  saldoPendiente: number;
  periodicidadPago: string;
  montoPago: number;
  numeroPagos: number;
  fechaProximoPago?: string;
}

export default function ReestructurasPage() {
  const [reestructuras, setReestructuras] = useState<Reestructura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('all');
  const [filtroCliente, setFiltroCliente] = useState('all');
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [reestructuraSeleccionada, setReestructuraSeleccionada] = useState<Reestructura | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clienteId: '',
    ventaId: '',
    motivo: 'DIFICULTADES_ECONOMICAS',
    observaciones: '',
    periodicidadNueva: 'SEMANAL',
    montoPagoNuevo: '',
    numeroPagosNuevo: '',
    fechaProximoPagoNueva: '',
    descuentoOtorgado: '',
    interesesCondonados: '',
  });

  const motivos = [
    { value: 'DIFICULTADES_ECONOMICAS', label: 'Dificultades Económicas' },
    { value: 'PERDIDA_EMPLEO', label: 'Pérdida de Empleo' },
    { value: 'ENFERMEDAD', label: 'Enfermedad' },
    { value: 'DESASTRE_NATURAL', label: 'Desastre Natural' },
    { value: 'ACUERDO_COMERCIAL', label: 'Acuerdo Comercial' },
    { value: 'RETENCION_CLIENTE', label: 'Retención de Cliente' },
    { value: 'OTROS', label: 'Otros' },
  ];

  const periodicidades = [
    { value: 'SEMANAL', label: 'Semanal' },
    { value: 'QUINCENAL', label: 'Quincenal' },
    { value: 'MENSUAL', label: 'Mensual' },
    { value: 'BIMENSUAL', label: 'Bimensual' },
  ];

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, filtroCliente]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar reestructuras
      let url = '/api/reestructuras?';
      if (filtroEstado !== 'all') {
        url += `activa=${filtroEstado}&`;
      }
      if (filtroCliente !== 'all') {
        url += `clienteId=${filtroCliente}&`;
      }
      
      const [reestructurasRes, clientesRes] = await Promise.all([
        fetch(url),
        fetch('/api/clientes'),
      ]);

      if (reestructurasRes.ok && clientesRes.ok) {
        const [reestructurasData, clientesData] = await Promise.all([
          reestructurasRes.json(),
          clientesRes.json(),
        ]);
        
        setReestructuras(reestructurasData);
        setClientes(clientesData);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const cargarVentasCliente = async (clienteId: string) => {
    try {
      const response = await fetch(`/api/ventas?clienteId=${clienteId}&conSaldo=true`);
      if (response.ok) {
        const ventasData = await response.json();
        // Filtrar solo ventas con saldo pendiente
        const ventasConSaldo = ventasData.filter((v: Venta) => v.saldoPendiente > 0);
        setVentas(ventasConSaldo);
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    }
  };

  const handleClienteChange = (clienteId: string) => {
    setFormData({ ...formData, clienteId, ventaId: '' });
    setVentas([]);
    if (clienteId) {
      cargarVentasCliente(clienteId);
    }
  };

  const handleVentaChange = (ventaId: string) => {
    setFormData({ ...formData, ventaId });
    
    // Auto-completar algunos campos basados en la venta seleccionada
    const ventaSeleccionada = ventas.find(v => v.id === ventaId);
    if (ventaSeleccionada) {
      const numeroPagosCalculado = Math.ceil(ventaSeleccionada.saldoPendiente / parseFloat(formData.montoPagoNuevo || '1'));
      setFormData({
        ...formData,
        ventaId,
        numeroPagosNuevo: numeroPagosCalculado.toString(),
      });
    }
  };

  const handleMontoPagoChange = (montoPago: string) => {
    setFormData({ ...formData, montoPagoNuevo: montoPago });
    
    // Auto-calcular número de pagos si hay venta seleccionada
    const ventaSeleccionada = ventas.find(v => v.id === formData.ventaId);
    if (ventaSeleccionada && parseFloat(montoPago) > 0) {
      const saldoConDescuento = ventaSeleccionada.saldoPendiente - (parseFloat(formData.descuentoOtorgado) || 0);
      const numeroPagosCalculado = Math.ceil(saldoConDescuento / parseFloat(montoPago));
      setFormData({
        ...formData,
        montoPagoNuevo: montoPago,
        numeroPagosNuevo: numeroPagosCalculado.toString(),
      });
    }
  };

  const crearReestructura = async () => {
    try {
      setIsCreating(true);
      
      const response = await fetch('/api/reestructuras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Reestructura creada exitosamente',
        });
        setDialogAbierto(false);
        resetForm();
        cargarDatos();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear reestructura');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear reestructura',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const cambiarEstadoReestructura = async (reestructuraId: string, activa: boolean) => {
    try {
      const response = await fetch(`/api/reestructuras/${reestructuraId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activa }),
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: `Reestructura ${activa ? 'activada' : 'desactivada'} exitosamente`,
        });
        cargarDatos();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al cambiar estado');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al cambiar estado',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      clienteId: '',
      ventaId: '',
      motivo: 'DIFICULTADES_ECONOMICAS',
      observaciones: '',
      periodicidadNueva: 'SEMANAL',
      montoPagoNuevo: '',
      numeroPagosNuevo: '',
      fechaProximoPagoNueva: '',
      descuentoOtorgado: '',
      interesesCondonados: '',
    });
    setVentas([]);
    setReestructuraSeleccionada(null);
  };

  const reestructurasFiltradas = reestructuras.filter((reestructura) => {
    const matchesSearch = 
      reestructura.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reestructura.cliente.codigoCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reestructura.venta.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reestructura.venta.numeroFactura && reestructura.venta.numeroFactura.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const estadisticas = {
    total: reestructuras.length,
    activas: reestructuras.filter(r => r.activa).length,
    inactivas: reestructuras.filter(r => !r.activa).length,
    montoDescuentos: reestructuras.reduce((sum, r) => sum + r.descuentoOtorgado, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reestructuras de Crédito</h1>
          <p className="text-gray-500 mt-2">Gestión de reestructuras de crédito para clientes</p>
        </div>

        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Reestructura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Crear Reestructura de Crédito</DialogTitle>
              <DialogDescription>
                Complete los datos para crear una nueva reestructura de crédito
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={formData.clienteId} onValueChange={handleClienteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.codigoCliente} - {cliente.nombre}
                        <span className="text-sm text-gray-500 ml-2">
                          (Saldo: ${cliente.saldoActual.toFixed(2)})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Venta a Reestructurar *</Label>
                <Select value={formData.ventaId} onValueChange={handleVentaChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar venta" />
                  </SelectTrigger>
                  <SelectContent>
                    {ventas.map((venta) => (
                      <SelectItem key={venta.id} value={venta.id}>
                        {venta.folio} {venta.numeroFactura && `- ${venta.numeroFactura}`}
                        <span className="text-sm text-gray-500 ml-2">
                          (Saldo: ${venta.saldoPendiente.toFixed(2)})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select value={formData.motivo} onValueChange={(value) => setFormData({ ...formData, motivo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {motivos.map((motivo) => (
                      <SelectItem key={motivo.value} value={motivo.value}>
                        {motivo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nueva Periodicidad *</Label>
                <Select value={formData.periodicidadNueva} onValueChange={(value) => setFormData({ ...formData, periodicidadNueva: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodicidades.map((periodicidad) => (
                      <SelectItem key={periodicidad.value} value={periodicidad.value}>
                        {periodicidad.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nuevo Monto de Pago *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.montoPagoNuevo}
                  onChange={(e) => handleMontoPagoChange(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Número de Pagos</Label>
                <Input
                  type="number"
                  value={formData.numeroPagosNuevo}
                  onChange={(e) => setFormData({ ...formData, numeroPagosNuevo: e.target.value })}
                  placeholder="Calculado automáticamente"
                />
              </div>

              <div className="space-y-2">
                <Label>Próximo Pago *</Label>
                <Input
                  type="date"
                  value={formData.fechaProximoPagoNueva}
                  onChange={(e) => setFormData({ ...formData, fechaProximoPagoNueva: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descuento Otorgado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.descuentoOtorgado}
                  onChange={(e) => setFormData({ ...formData, descuentoOtorgado: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Intereses Condonados</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.interesesCondonados}
                  onChange={(e) => setFormData({ ...formData, interesesCondonados: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div></div>

              <div className="col-span-2 space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Observaciones adicionales sobre la reestructura"
                  rows={3}
                />
              </div>
            </div>

            {/* Resumen de la reestructura */}
            {formData.ventaId && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Resumen de Reestructura</h4>
                {ventas.find(v => v.id === formData.ventaId) && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Saldo Original:</strong> ${ventas.find(v => v.id === formData.ventaId)!.saldoPendiente.toFixed(2)}</p>
                      <p><strong>Descuento:</strong> ${(parseFloat(formData.descuentoOtorgado) || 0).toFixed(2)}</p>
                      <p><strong>Nuevo Saldo:</strong> ${(ventas.find(v => v.id === formData.ventaId)!.saldoPendiente - (parseFloat(formData.descuentoOtorgado) || 0)).toFixed(2)}</p>
                    </div>
                    <div>
                      <p><strong>Pago Anterior:</strong> ${ventas.find(v => v.id === formData.ventaId)!.montoPago.toFixed(2)}</p>
                      <p><strong>Nuevo Pago:</strong> ${(parseFloat(formData.montoPagoNuevo) || 0).toFixed(2)}</p>
                      <p><strong>Número de Pagos:</strong> {formData.numeroPagosNuevo}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setDialogAbierto(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={crearReestructura}
                disabled={isCreating || !formData.clienteId || !formData.ventaId || !formData.montoPagoNuevo || !formData.fechaProximoPagoNueva}
              >
                {isCreating ? 'Creando...' : 'Crear Reestructura'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-3xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Activas</p>
                <p className="text-3xl font-bold text-green-600">{estadisticas.activas}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Inactivas</p>
                <p className="text-3xl font-bold text-orange-600">{estadisticas.inactivas}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Descuentos</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${estadisticas.montoDescuentos.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  className="pl-10"
                  placeholder="Buscar por cliente, folio de venta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="true">Activas</SelectItem>
                  <SelectItem value="false">Inactivas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.codigoCliente} - {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Reestructuras */}
      <div className="grid gap-4">
        {reestructurasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron reestructuras</p>
            </CardContent>
          </Card>
        ) : (
          reestructurasFiltradas.map((reestructura) => (
            <Card key={reestructura.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <Badge
                        variant={reestructura.activa ? "default" : "secondary"}
                        className={reestructura.activa ? "bg-green-500" : "bg-gray-500"}
                      >
                        {reestructura.activa ? 'Activa' : 'Inactiva'}
                      </Badge>
                      <Badge variant="outline">
                        Venta: {reestructura.venta.folio}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {motivos.find(m => m.value === reestructura.motivo)?.label || reestructura.motivo}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Cliente</p>
                        <p className="font-medium">
                          {reestructura.cliente.codigoCliente} - {reestructura.cliente.nombre}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Saldo Anterior / Nuevo</p>
                        <p className="font-medium">
                          <span className="text-red-600">${reestructura.saldoAnterior.toFixed(2)}</span>
                          {' → '}
                          <span className="text-green-600">${reestructura.saldoNuevo.toFixed(2)}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Pago Anterior / Nuevo</p>
                        <p className="font-medium">
                          <span className="text-red-600">${reestructura.montoPagoAnterior.toFixed(2)}</span>
                          {' → '}
                          <span className="text-green-600">${reestructura.montoPagoNuevo.toFixed(2)}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Fecha Reestructura</p>
                        <p className="font-medium">
                          {format(new Date(reestructura.fechaReestructura), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Periodicidad</p>
                        <p className="font-medium">
                          {reestructura.periodicidadAnterior} → {reestructura.periodicidadNueva}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Número de Pagos</p>
                        <p className="font-medium">
                          {reestructura.numeroPagosAnterior} → {reestructura.numeroPagosNuevo}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Descuento Otorgado</p>
                        <p className="font-bold text-green-600">${reestructura.descuentoOtorgado.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Próximo Pago</p>
                        <p className="font-medium">
                          {format(new Date(reestructura.fechaProximoPagoNueva), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>

                    {reestructura.observaciones && (
                      <div className="mt-3">
                        <p className="text-gray-500 text-sm">Observaciones</p>
                        <p className="text-gray-700">{reestructura.observaciones}</p>
                      </div>
                    )}

                    <div className="mt-3 text-sm text-gray-500">
                      Autorizada por: {reestructura.autorizadaPor.firstName || reestructura.autorizadaPor.name} el{' '}
                      {format(new Date(reestructura.fechaReestructura), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-6">
                    <Button
                      size="sm"
                      variant={reestructura.activa ? "destructive" : "default"}
                      onClick={() => cambiarEstadoReestructura(reestructura.id, !reestructura.activa)}
                    >
                      {reestructura.activa ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
