
'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Calendar, User, DollarSign, Check, X, Edit3 } from 'lucide-react';
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

interface NotaCargo {
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
  aplicada: boolean;
  fechaAplicacion?: string;
  aplicadaPor?: {
    name?: string;
    firstName?: string;
    lastName?: string;
  };
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

export default function NotasCargoPage() {
  const [notasCargo, setNotasCargo] = useState<NotaCargo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('all');
  const [filtroCliente, setFiltroCliente] = useState('all');
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [notaSeleccionada, setNotaSeleccionada] = useState<NotaCargo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clienteId: '',
    ventaId: '',
    concepto: 'INTERESES_MORA',
    descripcion: '',
    monto: '',
    referencia: '',
  });

  const conceptos = [
    { value: 'INTERESES_MORA', label: 'Intereses de Mora' },
    { value: 'GASTOS_COBRANZA', label: 'Gastos de Cobranza' },
    { value: 'GASTOS_ADMINISTRATIVOS', label: 'Gastos Administrativos' },
    { value: 'COMISION_SERVICIOS', label: 'Comisión de Servicios' },
    { value: 'PENALIZACION', label: 'Penalización' },
    { value: 'OTROS', label: 'Otros' },
  ];

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, filtroCliente]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar notas de cargo
      let url = '/api/notas-cargo?';
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
        
        setNotasCargo(notasData);
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

  const crearNotaCargo = async () => {
    try {
      setIsCreating(true);
      
      const response = await fetch('/api/notas-cargo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Nota de cargo creada exitosamente',
        });
        setDialogAbierto(false);
        resetForm();
        cargarDatos();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear nota de cargo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear nota de cargo',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const aplicarNotaCargo = async (notaId: string) => {
    try {
      const response = await fetch(`/api/notas-cargo/${notaId}/aplicar`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Nota de cargo aplicada exitosamente',
        });
        cargarDatos();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al aplicar nota de cargo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al aplicar nota de cargo',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      clienteId: '',
      ventaId: '',
      concepto: 'INTERESES_MORA',
      descripcion: '',
      monto: '',
      referencia: '',
    });
    setVentas([]);
    setNotaSeleccionada(null);
  };

  const notasFiltradas = notasCargo.filter((nota) => {
    const matchesSearch = 
      nota.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.cliente.codigoCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.descripcion.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const estadisticas = {
    total: notasCargo.length,
    pendientes: notasCargo.filter(n => !n.aplicada).length,
    aplicadas: notasCargo.filter(n => n.aplicada).length,
    montoTotal: notasCargo.reduce((sum, n) => sum + n.monto, 0),
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
          <h1 className="text-3xl font-bold text-gray-900">Notas de Cargo</h1>
          <p className="text-gray-500 mt-2">Gestión de notas de cargo a clientes</p>
        </div>

        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Nota de Cargo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nota de Cargo</DialogTitle>
              <DialogDescription>
                Complete los datos para crear una nueva nota de cargo
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
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Descripción *</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción detallada de la nota de cargo"
                  rows={3}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Referencia</Label>
                <Input
                  value={formData.referencia}
                  onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                  placeholder="Referencia externa (opcional)"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setDialogAbierto(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={crearNotaCargo}
                disabled={isCreating || !formData.clienteId || !formData.descripcion || !formData.monto}
              >
                {isCreating ? 'Creando...' : 'Crear Nota de Cargo'}
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

      {/* Lista de Notas de Cargo */}
      <div className="grid gap-4">
        {notasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron notas de cargo</p>
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
                        <p className="font-bold text-lg">${nota.monto.toFixed(2)}</p>
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

                    {nota.aplicada && nota.aplicadaPor && (
                      <div className="mt-3 text-sm text-gray-500">
                        Aplicada por: {nota.aplicadaPor.firstName || nota.aplicadaPor.name} el{' '}
                        {format(new Date(nota.fechaAplicacion!), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-6">
                    {!nota.aplicada && (
                      <Button
                        size="sm"
                        onClick={() => aplicarNotaCargo(nota.id)}
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
