
'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Shield, Calendar, User, DollarSign, CheckCircle, AlertTriangle, Clock, Package, Wrench, RefreshCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Garantia {
  id: string;
  folio: string;
  cliente: {
    nombre: string;
    codigoCliente: string;
    telefono1?: string;
  };
  venta: {
    folio: string;
    numeroFactura?: string;
    fechaVenta: string;
  };
  producto: {
    nombre: string;
    codigo: string;
    marca?: string;
    modelo?: string;
    descripcion?: string;
  };
  productoReemplazo?: {
    nombre: string;
    codigo: string;
    marca?: string;
    modelo?: string;
  };
  tipoGarantia: string;
  fechaCompra: string;
  fechaInicioGarantia: string;
  fechaFinGarantia: string;
  mesesGarantia: number;
  estatus: string;
  fechaReclamo?: string;
  descripcionFalla?: string;
  diagnostico?: string;
  solucionAplicada?: string;
  requiereReemplazo: boolean;
  costoReparacion?: number;
  costoReemplazo?: number;
  afectaInventario: boolean;
  inventarioAfectado: boolean;
  atendidaPor?: {
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  fechaRecepcion?: string;
  fechaEntrega?: string;
  createdAt: string;
  updatedAt: string;
}

interface Cliente {
  id: string;
  nombre: string;
  codigoCliente: string;
}

interface Venta {
  id: string;
  folio: string;
  numeroFactura?: string;
  fechaVenta: string;
}

interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  marca?: string;
  modelo?: string;
  precio1: number;
}

export default function GarantiasPage() {
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('all');
  const [filtroCliente, setFiltroCliente] = useState('all');
  const [filtroVigencia, setFiltroVigencia] = useState('all');
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [dialogProcesarAbierto, setDialogProcesarAbierto] = useState(false);
  const [garantiaSeleccionada, setGarantiaSeleccionada] = useState<Garantia | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clienteId: '',
    ventaId: '',
    productoId: '',
    tipoGarantia: 'FABRICANTE',
    mesesGarantia: '12',
    fechaCompra: '',
    descripcionFalla: '',
    requiereReemplazo: false,
    productoReemplazoId: '',
    afectaInventario: false,
  });

  const [formProcesar, setFormProcesar] = useState({
    accion: '',
    diagnostico: '',
    solucionAplicada: '',
    costoReparacion: '',
    costoReemplazo: '',
    productoReemplazoId: '',
    observaciones: '',
  });

  const tiposGarantia = [
    { value: 'FABRICANTE', label: 'Fabricante' },
    { value: 'TIENDA', label: 'Tienda' },
    { value: 'EXTENDIDA', label: 'Extendida' },
    { value: 'SEGURO', label: 'Seguro' },
  ];

  const estatusGarantia = [
    { value: 'ACTIVA', label: 'Activa', color: 'bg-green-500', icon: CheckCircle },
    { value: 'RECLAMADA', label: 'Reclamada', color: 'bg-orange-500', icon: AlertTriangle },
    { value: 'EN_PROCESO', label: 'En Proceso', color: 'bg-blue-500', icon: Clock },
    { value: 'RESUELTA', label: 'Resuelta', color: 'bg-green-600', icon: CheckCircle },
    { value: 'VENCIDA', label: 'Vencida', color: 'bg-red-500', icon: X },
    { value: 'CANCELADA', label: 'Cancelada', color: 'bg-gray-500', icon: X },
  ];

  const acciones = [
    { value: 'REPARAR', label: 'Reparar' },
    { value: 'REEMPLAZAR', label: 'Reemplazar' },
    { value: 'RECHAZAR', label: 'Rechazar' },
  ];

  useEffect(() => {
    cargarDatos();
    cargarProductos();
  }, [filtroEstado, filtroCliente, filtroVigencia]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar garantías
      let url = '/api/garantias?';
      if (filtroEstado !== 'all') {
        url += `estatus=${filtroEstado}&`;
      }
      if (filtroCliente !== 'all') {
        url += `clienteId=${filtroCliente}&`;
      }
      if (filtroVigencia === 'vigente') {
        url += `vigente=true&`;
      }
      
      const [garantiasRes, clientesRes] = await Promise.all([
        fetch(url),
        fetch('/api/clientes'),
      ]);

      if (garantiasRes.ok && clientesRes.ok) {
        const [garantiasData, clientesData] = await Promise.all([
          garantiasRes.json(),
          clientesRes.json(),
        ]);
        
        setGarantias(garantiasData);
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

  const cargarProductos = async () => {
    try {
      const response = await fetch('/api/productos');
      if (response.ok) {
        const productosData = await response.json();
        setProductos(productosData);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const cargarVentasCliente = async (clienteId: string) => {
    try {
      const response = await fetch(`/api/ventas?clienteId=${clienteId}`);
      if (response.ok) {
        const ventasData = await response.json();
        setVentas(ventasData);
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    }
  };

  const handleClienteChange = (clienteId: string) => {
    setFormData({ ...formData, clienteId, ventaId: '', productoId: '' });
    setVentas([]);
    if (clienteId) {
      cargarVentasCliente(clienteId);
    }
  };

  const crearGarantia = async () => {
    try {
      setIsCreating(true);
      
      const response = await fetch('/api/garantias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Garantía creada exitosamente',
        });
        setDialogAbierto(false);
        resetForm();
        cargarDatos();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear garantía');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear garantía',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const procesarGarantia = async () => {
    if (!garantiaSeleccionada) return;

    try {
      setIsProcessing(true);
      
      const response = await fetch(`/api/garantias/${garantiaSeleccionada.id}/procesar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formProcesar),
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Garantía procesada exitosamente',
        });
        setDialogProcesarAbierto(false);
        resetFormProcesar();
        cargarDatos();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar garantía');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al procesar garantía',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const cambiarEstatusGarantia = async (garantiaId: string, nuevoEstatus: string) => {
    try {
      const response = await fetch(`/api/garantias/${garantiaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estatus: nuevoEstatus }),
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Estatus actualizado exitosamente',
        });
        cargarDatos();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar estatus');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al actualizar estatus',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      clienteId: '',
      ventaId: '',
      productoId: '',
      tipoGarantia: 'FABRICANTE',
      mesesGarantia: '12',
      fechaCompra: '',
      descripcionFalla: '',
      requiereReemplazo: false,
      productoReemplazoId: '',
      afectaInventario: false,
    });
    setVentas([]);
  };

  const resetFormProcesar = () => {
    setFormProcesar({
      accion: '',
      diagnostico: '',
      solucionAplicada: '',
      costoReparacion: '',
      costoReemplazo: '',
      productoReemplazoId: '',
      observaciones: '',
    });
    setGarantiaSeleccionada(null);
  };

  const abrirDialogProcesar = (garantia: Garantia) => {
    setGarantiaSeleccionada(garantia);
    setDialogProcesarAbierto(true);
  };

  const estaVigente = (fechaFin: string) => {
    return new Date(fechaFin) > new Date();
  };

  const diasRestantes = (fechaFin: string) => {
    return differenceInDays(new Date(fechaFin), new Date());
  };

  const garantiasFiltradas = garantias.filter((garantia) => {
    const matchesSearch = 
      garantia.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      garantia.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      garantia.cliente.codigoCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      garantia.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      garantia.producto.codigo.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const estadisticas = {
    total: garantias.length,
    activas: garantias.filter(g => g.estatus === 'ACTIVA').length,
    reclamadas: garantias.filter(g => g.estatus === 'RECLAMADA' || g.estatus === 'EN_PROCESO').length,
    resueltas: garantias.filter(g => g.estatus === 'RESUELTA').length,
    vigentes: garantias.filter(g => estaVigente(g.fechaFinGarantia)).length,
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
          <h1 className="text-3xl font-bold text-gray-900">Garantías de Productos</h1>
          <p className="text-gray-500 mt-2">Gestión integral de garantías de productos</p>
        </div>

        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Garantía
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Crear Garantía</DialogTitle>
              <DialogDescription>
                Complete los datos para crear una nueva garantía de producto
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Venta *</Label>
                <Select value={formData.ventaId} onValueChange={(value) => setFormData({ ...formData, ventaId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar venta" />
                  </SelectTrigger>
                  <SelectContent>
                    {ventas.map((venta) => (
                      <SelectItem key={venta.id} value={venta.id}>
                        {venta.folio} {venta.numeroFactura && `- ${venta.numeroFactura}`}
                        <span className="text-sm text-gray-500 ml-2">
                          ({format(new Date(venta.fechaVenta), 'dd/MM/yyyy', { locale: es })})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Producto *</Label>
                <Select value={formData.productoId} onValueChange={(value) => setFormData({ ...formData, productoId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productos.map((producto) => (
                      <SelectItem key={producto.id} value={producto.id}>
                        {producto.codigo} - {producto.nombre}
                        {producto.marca && ` (${producto.marca})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Garantía *</Label>
                <Select value={formData.tipoGarantia} onValueChange={(value) => setFormData({ ...formData, tipoGarantia: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposGarantia.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Meses de Garantía *</Label>
                <Input
                  type="number"
                  value={formData.mesesGarantia}
                  onChange={(e) => setFormData({ ...formData, mesesGarantia: e.target.value })}
                  placeholder="12"
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha de Compra *</Label>
                <Input
                  type="date"
                  value={formData.fechaCompra}
                  onChange={(e) => setFormData({ ...formData, fechaCompra: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Descripción de la Falla (Opcional)</Label>
                <Textarea
                  value={formData.descripcionFalla}
                  onChange={(e) => setFormData({ ...formData, descripcionFalla: e.target.value })}
                  placeholder="Descripción de la falla si ya se presenta un reclamo..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiereReemplazo"
                  checked={formData.requiereReemplazo}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiereReemplazo: !!checked })}
                />
                <Label htmlFor="requiereReemplazo">Requiere reemplazo inmediato</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="afectaInventario"
                  checked={formData.afectaInventario}
                  onCheckedChange={(checked) => setFormData({ ...formData, afectaInventario: !!checked })}
                />
                <Label htmlFor="afectaInventario">Afecta inventario</Label>
              </div>

              {formData.requiereReemplazo && (
                <div className="col-span-2 space-y-2">
                  <Label>Producto de Reemplazo</Label>
                  <Select value={formData.productoReemplazoId} onValueChange={(value) => setFormData({ ...formData, productoReemplazoId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto de reemplazo" />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map((producto) => (
                        <SelectItem key={producto.id} value={producto.id}>
                          {producto.codigo} - {producto.nombre}
                          {producto.marca && ` (${producto.marca})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setDialogAbierto(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={crearGarantia}
                disabled={isCreating || !formData.clienteId || !formData.ventaId || !formData.productoId || !formData.fechaCompra}
              >
                {isCreating ? 'Creando...' : 'Crear Garantía'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog para Procesar Garantía */}
      <Dialog open={dialogProcesarAbierto} onOpenChange={setDialogProcesarAbierto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Procesar Garantía</DialogTitle>
            <DialogDescription>
              {garantiaSeleccionada && `Procesando garantía ${garantiaSeleccionada.folio}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Acción a Tomar *</Label>
              <Select value={formProcesar.accion} onValueChange={(value) => setFormProcesar({ ...formProcesar, accion: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar acción" />
                </SelectTrigger>
                <SelectContent>
                  {acciones.map((accion) => (
                    <SelectItem key={accion.value} value={accion.value}>
                      {accion.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Diagnóstico *</Label>
              <Textarea
                value={formProcesar.diagnostico}
                onChange={(e) => setFormProcesar({ ...formProcesar, diagnostico: e.target.value })}
                placeholder="Diagnóstico técnico de la falla..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Solución Aplicada</Label>
              <Textarea
                value={formProcesar.solucionAplicada}
                onChange={(e) => setFormProcesar({ ...formProcesar, solucionAplicada: e.target.value })}
                placeholder="Descripción de la solución aplicada..."
                rows={2}
              />
            </div>

            {formProcesar.accion === 'REPARAR' && (
              <div className="space-y-2">
                <Label>Costo de Reparación</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formProcesar.costoReparacion}
                  onChange={(e) => setFormProcesar({ ...formProcesar, costoReparacion: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}

            {formProcesar.accion === 'REEMPLAZAR' && (
              <>
                <div className="space-y-2">
                  <Label>Producto de Reemplazo *</Label>
                  <Select value={formProcesar.productoReemplazoId} onValueChange={(value) => setFormProcesar({ ...formProcesar, productoReemplazoId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map((producto) => (
                        <SelectItem key={producto.id} value={producto.id}>
                          {producto.codigo} - {producto.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Costo de Reemplazo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formProcesar.costoReemplazo}
                    onChange={(e) => setFormProcesar({ ...formProcesar, costoReemplazo: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={formProcesar.observaciones}
                onChange={(e) => setFormProcesar({ ...formProcesar, observaciones: e.target.value })}
                placeholder="Observaciones adicionales..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setDialogProcesarAbierto(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={procesarGarantia}
              disabled={isProcessing || !formProcesar.accion || !formProcesar.diagnostico}
            >
              {isProcessing ? 'Procesando...' : 'Procesar Garantía'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Estadísticas */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-3xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Vigentes</p>
                <p className="text-3xl font-bold text-green-600">{estadisticas.vigentes}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Activas</p>
                <p className="text-3xl font-bold text-blue-600">{estadisticas.activas}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Reclamadas</p>
                <p className="text-3xl font-bold text-orange-600">{estadisticas.reclamadas}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Resueltas</p>
                <p className="text-3xl font-bold text-green-600">{estadisticas.resueltas}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
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
                  placeholder="Buscar por folio, cliente, producto..."
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
                  {estatusGarantia.map((estatus) => (
                    <SelectItem key={estatus.value} value={estatus.value}>
                      {estatus.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroVigencia} onValueChange={setFiltroVigencia}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="vigente">Solo vigentes</SelectItem>
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

      {/* Lista de Garantías */}
      <div className="grid gap-4">
        {garantiasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron garantías</p>
            </CardContent>
          </Card>
        ) : (
          garantiasFiltradas.map((garantia) => {
            const EstatusIcon = estatusGarantia.find(e => e.value === garantia.estatus)?.icon || Shield;
            const vigente = estaVigente(garantia.fechaFinGarantia);
            const diasRest = diasRestantes(garantia.fechaFinGarantia);
            
            return (
              <Card key={garantia.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <Badge variant="outline" className="font-mono">
                          {garantia.folio}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`${estatusGarantia.find(e => e.value === garantia.estatus)?.color} text-white`}
                        >
                          <EstatusIcon className="w-3 h-3 mr-1" />
                          {estatusGarantia.find(e => e.value === garantia.estatus)?.label}
                        </Badge>
                        <Badge variant="outline">
                          {tiposGarantia.find(t => t.value === garantia.tipoGarantia)?.label}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={vigente ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}
                        >
                          {vigente ? `${diasRest} días restantes` : 'Vencida'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-gray-500">Cliente</p>
                          <p className="font-medium">
                            {garantia.cliente.codigoCliente} - {garantia.cliente.nombre}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Producto</p>
                          <p className="font-medium">
                            {garantia.producto.codigo} - {garantia.producto.nombre}
                          </p>
                          {garantia.producto.marca && (
                            <p className="text-xs text-gray-500">{garantia.producto.marca} {garantia.producto.modelo}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-500">Venta</p>
                          <p className="font-medium">{garantia.venta.folio}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(garantia.venta.fechaVenta), 'dd/MM/yyyy', { locale: es })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Vigencia</p>
                          <p className="font-medium">
                            {format(new Date(garantia.fechaInicioGarantia), 'dd/MM/yyyy', { locale: es })}
                            {' - '}
                            {format(new Date(garantia.fechaFinGarantia), 'dd/MM/yyyy', { locale: es })}
                          </p>
                          <p className="text-xs text-gray-500">{garantia.mesesGarantia} meses</p>
                        </div>
                      </div>

                      {garantia.descripcionFalla && (
                        <div className="mb-3">
                          <p className="text-gray-500 text-sm">Descripción de la Falla</p>
                          <p className="text-gray-700">{garantia.descripcionFalla}</p>
                        </div>
                      )}

                      {garantia.diagnostico && (
                        <div className="mb-3">
                          <p className="text-gray-500 text-sm">Diagnóstico</p>
                          <p className="text-gray-700">{garantia.diagnostico}</p>
                        </div>
                      )}

                      {garantia.solucionAplicada && (
                        <div className="mb-3">
                          <p className="text-gray-500 text-sm">Solución Aplicada</p>
                          <p className="text-gray-700">{garantia.solucionAplicada}</p>
                        </div>
                      )}

                      {garantia.productoReemplazo && (
                        <div className="mb-3">
                          <p className="text-gray-500 text-sm">Producto de Reemplazo</p>
                          <p className="text-gray-700">
                            {garantia.productoReemplazo.codigo} - {garantia.productoReemplazo.nombre}
                          </p>
                        </div>
                      )}

                      {(garantia.costoReparacion || garantia.costoReemplazo) && (
                        <div className="mb-3">
                          <p className="text-gray-500 text-sm">Costos</p>
                          <div className="flex gap-4">
                            {garantia.costoReparacion && (
                              <p className="text-gray-700">Reparación: ${garantia.costoReparacion.toFixed(2)}</p>
                            )}
                            {garantia.costoReemplazo && (
                              <p className="text-gray-700">Reemplazo: ${garantia.costoReemplazo.toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {garantia.atendidaPor && (
                        <div className="text-sm text-gray-500">
                          Atendida por: {garantia.atendidaPor.firstName || garantia.atendidaPor.name}
                          {garantia.fechaEntrega && ` - Entregada el ${format(new Date(garantia.fechaEntrega), 'dd/MM/yyyy', { locale: es })}`}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-6">
                      {(garantia.estatus === 'RECLAMADA' || garantia.estatus === 'EN_PROCESO') && (
                        <Button
                          size="sm"
                          onClick={() => abrirDialogProcesar(garantia)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Wrench className="w-4 h-4 mr-1" />
                          Procesar
                        </Button>
                      )}
                      
                      {garantia.estatus === 'ACTIVA' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cambiarEstatusGarantia(garantia.id, 'RECLAMADA')}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Reclamar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
