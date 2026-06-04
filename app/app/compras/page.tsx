
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  condicionesPago: string;
  diasCredito: number;
  limiteCredito: number;
  saldoActual: number;
  activo: boolean;
  createdAt: string;
}

interface OrdenCompra {
  id: string;
  folio: string;
  proveedor: Proveedor;
  fecha: string;
  fechaEntrega: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'PARCIAL' | 'RECIBIDA' | 'CANCELADA';
  detalles: DetalleOrdenCompra[];
  observaciones: string;
  createdAt: string;
  updatedAt: string;
}

interface DetalleOrdenCompra {
  id: string;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
  };
  cantidad: number;
  precio: number;
  subtotal: number;
  cantidadRecibida: number;
}

interface RecepcionMercancia {
  id: string;
  ordenCompra: OrdenCompra;
  folio: string;
  fecha: string;
  detalles: DetalleRecepcion[];
  observaciones: string;
  estado: 'COMPLETA' | 'PARCIAL';
  createdAt: string;
}

interface DetalleRecepcion {
  id: string;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
  };
  cantidadOrdenada: number;
  cantidadRecibida: number;
  precioUnitario: number;
  lote?: string;
  fechaVencimiento?: string;
}

export default function ComprasPage() {
  const [activeTab, setActiveTab] = useState('ordenes');
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([]);
  const [recepciones, setRecepciones] = useState<RecepcionMercancia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProveedor, setSelectedProveedor] = useState<string>('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'proveedor' | 'orden' | 'recepcion'>('proveedor');

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [proveedoresRes, ordenesRes, recepcionesRes] = await Promise.all([
        fetch('/api/compras/proveedores'),
        fetch('/api/compras/ordenes'),
        fetch('/api/compras/recepciones')
      ]);

      const [proveedoresData, ordenesData, recepcionesData] = await Promise.all([
        proveedoresRes.json(),
        ordenesRes.json(),
        recepcionesRes.json()
      ]);

      setProveedores(proveedoresData.proveedores || []);
      setOrdenesCompra(ordenesData.ordenes || []);
      setRecepciones(recepcionesData.recepciones || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProveedores = proveedores.filter(proveedor =>
    proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proveedor.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrdenes = ordenesCompra.filter(orden => {
    const matchesSearch = orden.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         orden.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProveedor = !selectedProveedor || selectedProveedor === 'all' || orden.proveedor.id === selectedProveedor;
    const matchesEstado = !selectedEstado || selectedEstado === 'all' || orden.estado === selectedEstado;
    
    return matchesSearch && matchesProveedor && matchesEstado;
  });

  const handleCreateProveedor = () => {
    setDialogType('proveedor');
    setDialogOpen(true);
  };

  const handleCreateOrden = () => {
    setDialogType('orden');
    setDialogOpen(true);
  };

  const handleCreateRecepcion = () => {
    setDialogType('recepcion');
    setDialogOpen(true);
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      'PENDIENTE': 'default',
      'CONFIRMADA': 'secondary',
      'PARCIAL': 'default',
      'RECIBIDA': 'secondary',
      'CANCELADA': 'destructive'
    };
    return <Badge variant={variants[estado] || 'default'}>{estado}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulo de Compras</h1>
          <p className="text-muted-foreground">
            Gestión integral de proveedores, órdenes de compra y recepción de mercancía
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateProveedor}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Proveedor
          </Button>
          <Button onClick={handleCreateOrden}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proveedores.filter(p => p.activo).length}</div>
            <p className="text-xs text-muted-foreground">
              +{proveedores.length - proveedores.filter(p => p.activo).length} inactivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordenesCompra.filter(o => o.estado === 'PENDIENTE' || o.estado === 'CONFIRMADA').length}
            </div>
            <p className="text-xs text-muted-foreground">
              ${ordenesCompra.filter(o => o.estado === 'PENDIENTE' || o.estado === 'CONFIRMADA')
                .reduce((sum, o) => sum + o.total, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compras del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${ordenesCompra.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +20.1% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recepciones Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordenesCompra.filter(o => o.estado === 'CONFIRMADA' || o.estado === 'PARCIAL').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren seguimiento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por folio, proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedProveedor} onValueChange={setSelectedProveedor}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {proveedores.map((proveedor) => (
                  <SelectItem key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedEstado} onValueChange={setSelectedEstado}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="CONFIRMADA">Confirmada</SelectItem>
                <SelectItem value="PARCIAL">Parcial</SelectItem>
                <SelectItem value="RECIBIDA">Recibida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ordenes">Órdenes de Compra</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
          <TabsTrigger value="recepciones">Recepciones</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="ordenes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes de Compra</CardTitle>
              <CardDescription>
                Gestión de órdenes de compra y seguimiento de estado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Folio</th>
                      <th className="px-4 py-3 text-left">Proveedor</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Total</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrdenes.map((orden) => (
                      <tr key={orden.id} className="border-b">
                        <td className="px-4 py-3 font-medium">{orden.folio}</td>
                        <td className="px-4 py-3">{orden.proveedor.nombre}</td>
                        <td className="px-4 py-3">
                          {new Date(orden.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">${orden.total.toLocaleString()}</td>
                        <td className="px-4 py-3">{getEstadoBadge(orden.estado)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {orden.estado === 'CONFIRMADA' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={handleCreateRecepcion}
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proveedores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Catálogo de Proveedores</CardTitle>
              <CardDescription>
                Gestión completa de proveedores y condiciones comerciales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Contacto</th>
                      <th className="px-4 py-3 text-left">Crédito</th>
                      <th className="px-4 py-3 text-left">Saldo</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProveedores.map((proveedor) => (
                      <tr key={proveedor.id} className="border-b">
                        <td className="px-4 py-3 font-medium">{proveedor.codigo}</td>
                        <td className="px-4 py-3">{proveedor.nombre}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{proveedor.contacto}</p>
                            <p className="text-sm text-muted-foreground">{proveedor.telefono}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">${proveedor.limiteCredito.toLocaleString()}</td>
                        <td className="px-4 py-3">${proveedor.saldoActual.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge variant={proveedor.activo ? 'secondary' : 'destructive'}>
                            {proveedor.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recepciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recepción de Mercancía</CardTitle>
              <CardDescription>
                Control de entrada de productos y actualización de inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No hay recepciones registradas</h3>
                <p className="text-muted-foreground">
                  Selecciona una orden confirmada para crear una recepción
                </p>
                <Button 
                  className="mt-4" 
                  onClick={handleCreateRecepcion}
                  disabled={!ordenesCompra.some(o => o.estado === 'CONFIRMADA')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Nueva Recepción
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reportes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reporte de Compras</CardTitle>
                <CardDescription>
                  Análisis de compras por período y proveedor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Reporte
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis de Proveedores</CardTitle>
                <CardDescription>
                  Performance y evaluación de proveedores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Análisis
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'proveedor' && 'Nuevo Proveedor'}
              {dialogType === 'orden' && 'Nueva Orden de Compra'}
              {dialogType === 'recepcion' && 'Nueva Recepción'}
            </DialogTitle>
            <DialogDescription>
              Complete la información requerida para continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {dialogType === 'proveedor' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="codigo">Código</Label>
                    <Input id="codigo" placeholder="PROV001" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input id="nombre" placeholder="Nombre del proveedor" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contacto">Persona de Contacto</Label>
                  <Input id="contacto" placeholder="Nombre del contacto" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input id="telefono" placeholder="(555) 123-4567" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="contacto@proveedor.com" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Textarea id="direccion" placeholder="Dirección completa" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="diasCredito">Días de Crédito</Label>
                    <Input id="diasCredito" type="number" placeholder="30" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="limiteCredito">Límite de Crédito</Label>
                    <Input id="limiteCredito" type="number" placeholder="100000" />
                  </div>
                </div>
              </>
            )}
            {dialogType === 'orden' && (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Formulario de Orden de Compra</h3>
                <p className="text-muted-foreground">
                  Funcionalidad en desarrollo
                </p>
              </div>
            )}
            {dialogType === 'recepcion' && (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Formulario de Recepción</h3>
                <p className="text-muted-foreground">
                  Funcionalidad en desarrollo
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button>
              {dialogType === 'proveedor' && 'Crear Proveedor'}
              {dialogType === 'orden' && 'Crear Orden'}
              {dialogType === 'recepcion' && 'Crear Recepción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
