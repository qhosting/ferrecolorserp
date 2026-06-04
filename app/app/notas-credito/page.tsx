
'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Calendar, User, DollarSign, Check, X, Package } from 'lucide-react';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotaCredito {
  id: string;
  folio: string;
  cliente: {
    nombre: string;
    codigoCliente: string;
  };
  venta?: {
    folio: string;
    numeroFactura?: string;
  };
  concepto: string;
  descripcion: string;
  monto: number;
  referencia?: string;
  afectaInventario: boolean;
  inventarioAfectado: boolean;
  aplicada: boolean;
  fechaAplicacion?: string;
  aplicadaPor?: {
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  detalles: Array<{
    id: string;
    producto?: {
      nombre: string;
      codigo: string;
    };
    cantidad?: number;
    precioUnitario?: number;
    subtotal: number;
    motivo: string;
  }>;
  fecha: string;
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
}

interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  precio1: number;
}

export default function NotasCreditoPage() {
  const [notasCredito, setNotasCredito] = useState<NotaCredito[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('all');
  const [filtroCliente, setFiltroCliente] = useState('all');
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [notaSeleccionada, setNotaSeleccionada] = useState<NotaCredito | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clienteId: '',
    ventaId: '',
    concepto: 'DEVOLUCION_MERCANCIA',
    descripcion: '',
    monto: '',
    referencia: '',
    afectaInventario: false,
  });

  const [detalles, setDetalles] = useState<Array<{
    productoId: string;
    cantidad: string;
    precioUnitario: string;
    subtotal: string;
    motivo: string;
  }>>([]);

  const conceptos = [
    { value: 'DEVOLUCION_MERCANCIA', label: 'Devolución de Mercancía' },
    { value: 'DESCUENTO_COMERCIAL', label: 'Descuento Comercial' },
    { value: 'AJUSTE_PRECIO', label: 'Ajuste de Precio' },
    { value: 'COMPENSACION', label: 'Compensación' },
    { value: 'GARANTIA', label: 'Garantía' },
    { value: 'OTROS', label: 'Otros' },
  ];

  useEffect(() => {
    cargarDatos();
    cargarProductos();
  }, [filtroEstado, filtroCliente]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar notas de crédito
      let url = '/api/notas-credito?';
      if (filtroEstado !== 'all') {
        url += `estado=${filtroEstado}&`;
      }
      if (filtroCliente !== 'all') {
        url += `clienteId=${filtroCliente}&`;
      }
      
      const [notasRes, clientesRes] = await Promise.all([
        fetch(url),
        fetch('/api/clientes'),
      ]);

      if (notasRes.ok && clientesRes.ok) {
        const [notasData, clientesData] = await Promise.all([
          notasRes.json(),
          clientesRes.json(),
        ]);
        
        setNotasCredito(notasData);
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
    setFormData({ ...formData, clienteId, ventaId: '' });
    setVentas([]);
    if (clienteId) {
      cargarVentasCliente(clienteId);
    }
  };

  const agregarDetalle = () => {
    setDetalles([...detalles, {
      productoId: '',
      cantidad: '',
      precioUnitario: '',
      subtotal: '',
      motivo: '',
    }]);
  };

  const eliminarDetalle = (index: number) => {
    const nuevosDetalles = detalles.filter((_, i) => i !== index);
    setDetalles(nuevosDetalles);
    calcularMonto(nuevosDetalles);
  };

  const actualizarDetalle = (index: number, campo: string, valor: string) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index] = { ...nuevosDetalles[index], [campo]: valor };

    // Auto-calcular subtotal si es cantidad o precio unitario
    if (campo === 'cantidad' || campo === 'precioUnitario') {
      const cantidad = parseFloat(nuevosDetalles[index].cantidad) || 0;
      const precio = parseFloat(nuevosDetalles[index].precioUnitario) || 0;
      nuevosDetalles[index].subtotal = (cantidad * precio).toFixed(2);
    }

    // Auto-completar precio unitario al seleccionar producto
    if (campo === 'productoId' && valor) {
      const producto = productos.find(p => p.id === valor);
      if (producto) {
        nuevosDetalles[index].precioUnitario = producto.precio1.toString();
      }
    }

    setDetalles(nuevosDetalles);
    calcularMonto(nuevosDetalles);
  };

  const calcularMonto = (detallesActuales: typeof detalles) => {
    const total = detallesActuales.reduce((sum, detalle) => 
      sum + (parseFloat(detalle.subtotal) || 0), 0
    );
    setFormData({ ...formData, monto: total.toFixed(2) });
  };

  const crearNotaCredito = async () => {
    try {
      setIsCreating(true);
      
      const payload = {
        ...formData,
        monto: parseFloat(formData.monto),
        detalles: formData.afectaInventario ? detalles.filter(d => d.productoId) : [],
      };

      const response = await fetch('/api/notas-credito', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Nota de crédito creada exitosamente',
        });
        setDialogAbierto(false);
        resetForm();
        cargarDatos();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear nota de crédito');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear nota de crédito',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const aplicarNotaCredito = async (notaId: string) => {
    try {
      const response = await fetch(`/api/notas-credito/${notaId}/aplicar`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Nota de crédito aplicada exitosamente',
        });
        cargarDatos();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al aplicar nota de crédito');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al aplicar nota de crédito',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      clienteId: '',
      ventaId: '',
      concepto: 'DEVOLUCION_MERCANCIA',
      descripcion: '',
      monto: '',
      referencia: '',
      afectaInventario: false,
    });
    setDetalles([]);
    setVentas([]);
    setNotaSeleccionada(null);
  };

  const notasFiltradas = notasCredito.filter((nota) => {
    const matchesSearch = 
      nota.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.cliente.codigoCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.descripcion.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const estadisticas = {
    total: notasCredito.length,
    pendientes: notasCredito.filter(n => !n.aplicada).length,
    aplicadas: notasCredito.filter(n => n.aplicada).length,
    montoTotal: notasCredito.reduce((sum, n) => sum + n.monto, 0),
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
          <h1 className="text-3xl font-bold text-gray-900">Notas de Crédito</h1>
          <p className="text-gray-500 mt-2">Gestión de notas de crédito para clientes</p>
        </div>

        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Nota de Crédito
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nota de Crédito</DialogTitle>
              <DialogDescription>
                Complete los datos para crear una nueva nota de crédito
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
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
                  <Label>Venta (Opcional)</Label>
                  <Select value={formData.ventaId} onValueChange={(value) => setFormData({ ...formData, ventaId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar venta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin venta asociada</SelectItem>
                      {ventas.map((venta) => (
                        <SelectItem key={venta.id} value={venta.id}>
                          {venta.folio} {venta.numeroFactura && `- ${venta.numeroFactura}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Concepto *</Label>
                  <Select value={formData.concepto} onValueChange={(value) => setFormData({ ...formData, concepto: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conceptos.map((concepto) => (
                        <SelectItem key={concepto.value} value={concepto.value}>
                          {concepto.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Monto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    placeholder="0.00"
                    readOnly={formData.afectaInventario && detalles.length > 0}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Descripción *</Label>
                  <Textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción detallada de la nota de crédito"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Referencia</Label>
                  <Input
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                    placeholder="Referencia externa (opcional)"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="afectaInventario"
                    checked={formData.afectaInventario}
                    onCheckedChange={(checked) => {
                      setFormData({ ...formData, afectaInventario: !!checked });
                      if (!checked) {
                        setDetalles([]);
                      }
                    }}
                  />
                  <Label htmlFor="afectaInventario">Afecta inventario (devolución de productos)</Label>
                </div>
              </div>

              {/* Detalles de productos - Solo si afecta inventario */}
              {formData.afectaInventario && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold">Productos a devolver</h4>
                    <Button onClick={agregarDetalle} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Producto
                    </Button>
                  </div>

                  {detalles.map((detalle, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-2">
                          <Label>Producto</Label>
                          <Select 
                            value={detalle.productoId} 
                            onValueChange={(value) => actualizarDetalle(index, 'productoId', value)}
                          >
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

                        <div>
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={detalle.cantidad}
                            onChange={(e) => actualizarDetalle(index, 'cantidad', e.target.value)}
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <Label>Precio Unit.</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={detalle.precioUnitario}
                            onChange={(e) => actualizarDetalle(index, 'precioUnitario', e.target.value)}
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <Label>Subtotal</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={detalle.subtotal}
                            readOnly
                            className="bg-gray-50"
                          />
                        </div>

                        <div className="flex items-end">
                          <Button
                            onClick={() => eliminarDetalle(index)}
                            size="sm"
                            variant="destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="col-span-6">
                          <Label>Motivo de devolución</Label>
                          <Input
                            value={detalle.motivo}
                            onChange={(e) => actualizarDetalle(index, 'motivo', e.target.value)}
                            placeholder="Motivo de la devolución"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
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
                onClick={crearNotaCredito}
                disabled={isCreating || !formData.clienteId || !formData.descripcion || !formData.monto}
              >
                {isCreating ? 'Creando...' : 'Crear Nota de Crédito'}
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
                <p className="text-sm font-medium text-gray-500">Total Notas</p>
                <p className="text-3xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pendientes</p>
                <p className="text-3xl font-bold text-orange-600">{estadisticas.pendientes}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Aplicadas</p>
                <p className="text-3xl font-bold text-green-600">{estadisticas.aplicadas}</p>
              </div>
              <Check className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Monto Total</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${estadisticas.montoTotal.toFixed(2)}
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
                  placeholder="Buscar por folio, cliente o descripción..."
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
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="aplicada">Aplicadas</SelectItem>
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

      {/* Lista de Notas de Crédito */}
      <div className="grid gap-4">
        {notasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron notas de crédito</p>
            </CardContent>
          </Card>
        ) : (
          notasFiltradas.map((nota) => (
            <Card key={nota.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {nota.folio}
                      </Badge>
                      <Badge
                        variant={nota.aplicada ? "default" : "secondary"}
                        className={nota.aplicada ? "bg-green-500" : "bg-orange-500"}
                      >
                        {nota.aplicada ? 'Aplicada' : 'Pendiente'}
                      </Badge>
                      {nota.venta && (
                        <Badge variant="outline">
                          Venta: {nota.venta.folio}
                        </Badge>
                      )}
                      {nota.afectaInventario && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <Package className="w-3 h-3 mr-1" />
                          Afecta Inventario
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Cliente</p>
                        <p className="font-medium">
                          {nota.cliente.codigoCliente} - {nota.cliente.nombre}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Concepto</p>
                        <p className="font-medium">
                          {conceptos.find(c => c.value === nota.concepto)?.label || nota.concepto}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Monto</p>
                        <p className="font-bold text-lg text-green-600">${nota.monto.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Fecha</p>
                        <p className="font-medium">
                          {format(new Date(nota.fecha), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-gray-500 text-sm">Descripción</p>
                      <p className="text-gray-700">{nota.descripcion}</p>
                    </div>

                    {/* Mostrar detalles de productos si los hay */}
                    {nota.detalles && nota.detalles.length > 0 && (
                      <div className="mt-3">
                        <p className="text-gray-500 text-sm mb-2">Productos:</p>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          {nota.detalles.map((detalle, index) => (
                            <div key={detalle.id || index} className="flex justify-between text-sm">
                              <span>
                                {detalle.producto ? `${detalle.producto.codigo} - ${detalle.producto.nombre}` : 'Producto eliminado'}
                                {detalle.cantidad && ` (${detalle.cantidad})`}
                              </span>
                              <span className="font-medium">${detalle.subtotal.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {nota.aplicada && nota.aplicadaPor && (
                      <div className="mt-3 text-sm text-gray-500">
                        Aplicada por: {nota.aplicadaPor.firstName || nota.aplicadaPor.name} el{' '}
                        {format(new Date(nota.fechaAplicacion!), 'dd/MM/yyyy HH:mm', { locale: es })}
                        {nota.inventarioAfectado && (
                          <span className="text-blue-600 font-medium ml-2">
                            (Inventario actualizado)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-6">
                    {!nota.aplicada && (
                      <Button
                        size="sm"
                        onClick={() => aplicarNotaCredito(nota.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aplicar
                      </Button>
                    )}
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
