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
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  diasCredito: number;
  limiteCredito: number;
  saldoActual: number;
  activo: boolean;
  createdAt: string;
}

interface DetalleOrdenCompra {
  id: string;
  producto: { id: string; codigo: string; nombre: string };
  cantidad: number;
  precio: number;
  subtotal: number;
  cantidadRecibida: number;
}

interface OrdenCompra {
  id: string;
  folio: string;
  proveedor: { id: string; nombre: string; codigo: string };
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

interface RecepcionMercancia {
  id: string;
  ordenCompra: { id: string; folio: string; proveedor: { nombre: string } };
  folio: string;
  fecha: string;
  detalles: any[];
  observaciones: string;
  estado: string;
  createdAt: string;
}

interface ProductoOpt {
  id: string;
  codigo: string;
  nombre: string;
  precioCompra?: number;
}

interface LineaOrden {
  productoId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio: number;
}

const emptyProveedor = {
  codigo: '', nombre: '', contacto: '', telefono: '', email: '',
  direccion: '', diasCredito: '', limiteCredito: '',
};

export default function ComprasPage() {
  const [activeTab, setActiveTab] = useState('ordenes');
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([]);
  const [recepciones, setRecepciones] = useState<RecepcionMercancia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProveedor, setSelectedProveedor] = useState<string>('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');

  // Dialog state
  const [dialogType, setDialogType] = useState<'proveedor' | 'orden' | 'recepcion' | 'ver' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Proveedor form
  const [proveedorForm, setProveedorForm] = useState({ ...emptyProveedor });

  // Orden form
  const [ordenProveedor, setOrdenProveedor] = useState('');
  const [ordenObs, setOrdenObs] = useState('');
  const [lineas, setLineas] = useState<LineaOrden[]>([]);
  const [productos, setProductos] = useState<ProductoOpt[]>([]);
  const [productoBusqueda, setProductoBusqueda] = useState('');

  // Recepcion form
  const [recepcionOrden, setRecepcionOrden] = useState<OrdenCompra | null>(null);
  const [recepcionCantidades, setRecepcionCantidades] = useState<Record<string, number>>({});
  const [recepcionObs, setRecepcionObs] = useState('');

  // Ver detalle
  const [ordenVer, setOrdenVer] = useState<OrdenCompra | null>(null);

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
        fetch('/api/compras/recepciones'),
      ]);
      const [proveedoresData, ordenesData, recepcionesData] = await Promise.all([
        proveedoresRes.json(),
        ordenesRes.json(),
        recepcionesRes.json(),
      ]);
      setProveedores(proveedoresData.proveedores || []);
      setOrdenesCompra(ordenesData.ordenes || []);
      setRecepciones(recepcionesData.recepciones || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: "Error", description: "Error al cargar los datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredProveedores = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrdenes = ordenesCompra.filter(orden => {
    const matchesSearch = orden.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProveedor = !selectedProveedor || selectedProveedor === 'all' || orden.proveedor.id === selectedProveedor;
    const matchesEstado = !selectedEstado || selectedEstado === 'all' || orden.estado === selectedEstado;
    return matchesSearch && matchesProveedor && matchesEstado;
  });

  const closeDialog = () => {
    setDialogType(null);
    setProveedorForm({ ...emptyProveedor });
    setOrdenProveedor('');
    setOrdenObs('');
    setLineas([]);
    setProductoBusqueda('');
    setRecepcionOrden(null);
    setRecepcionCantidades({});
    setRecepcionObs('');
    setOrdenVer(null);
  };

  // ---- Proveedor ----
  const openProveedor = () => { setProveedorForm({ ...emptyProveedor }); setDialogType('proveedor'); };

  const submitProveedor = async () => {
    if (!proveedorForm.codigo || !proveedorForm.nombre) {
      toast({ title: "Datos incompletos", description: "Código y nombre son obligatorios", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/compras/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proveedorForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear proveedor');
      toast({ title: "Proveedor creado", description: data.proveedor?.nombre });
      closeDialog();
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Orden ----
  const openOrden = async () => {
    setDialogType('orden');
    if (productos.length === 0) {
      try {
        const res = await fetch('/api/productos?activos=true&limit=500');
        const data = await res.json();
        setProductos(data.productos || []);
      } catch {
        toast({ title: "Error", description: "No se pudieron cargar los productos", variant: "destructive" });
      }
    }
  };

  const agregarLinea = (prod: ProductoOpt) => {
    if (lineas.some(l => l.productoId === prod.id)) return;
    setLineas([...lineas, {
      productoId: prod.id,
      codigo: prod.codigo,
      nombre: prod.nombre,
      cantidad: 1,
      precio: prod.precioCompra ?? 0,
    }]);
    setProductoBusqueda('');
  };

  const updateLinea = (id: string, field: 'cantidad' | 'precio', value: number) => {
    setLineas(lineas.map(l => l.productoId === id ? { ...l, [field]: value } : l));
  };

  const removeLinea = (id: string) => setLineas(lineas.filter(l => l.productoId !== id));

  const ordenSubtotal = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
  const ordenIva = ordenSubtotal * 0.16;
  const ordenTotal = ordenSubtotal + ordenIva;

  const submitOrden = async () => {
    if (!ordenProveedor) {
      toast({ title: "Falta proveedor", description: "Selecciona un proveedor", variant: "destructive" });
      return;
    }
    if (lineas.length === 0) {
      toast({ title: "Sin productos", description: "Agrega al menos un producto", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/compras/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedorId: ordenProveedor,
          observaciones: ordenObs,
          detalles: lineas.map(l => ({ productoId: l.productoId, cantidad: l.cantidad, precio: l.precio })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear orden');
      toast({ title: "Orden creada", description: data.orden?.folio });
      closeDialog();
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Recepcion ----
  const openRecepcion = (orden: OrdenCompra) => {
    setRecepcionOrden(orden);
    const init: Record<string, number> = {};
    orden.detalles.forEach(d => { init[d.producto.id] = d.cantidad; });
    setRecepcionCantidades(init);
    setRecepcionObs('');
    setDialogType('recepcion');
  };

  const submitRecepcion = async () => {
    if (!recepcionOrden) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/compras/recepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordenCompraId: recepcionOrden.id,
          observaciones: recepcionObs,
          detalles: recepcionOrden.detalles.map(d => ({
            productoId: d.producto.id,
            cantidadRecibida: recepcionCantidades[d.producto.id] ?? d.cantidad,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear recepción');
      toast({ title: "Recepción registrada", description: "Stock e inventario actualizados" });
      closeDialog();
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Reportes ----
  const descargarReporte = () => {
    const rows = [
      ['Folio', 'Proveedor', 'Fecha', 'Subtotal', 'IVA', 'Total', 'Estado'],
      ...ordenesCompra.map(o => [
        o.folio, o.proveedor.nombre, new Date(o.fecha).toLocaleDateString(),
        o.subtotal.toFixed(2), o.iva.toFixed(2), o.total.toFixed(2), o.estado,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-compras-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const descargarAnalisisProveedores = () => {
    const rows = [
      ['Código', 'Proveedor', 'Días Crédito', 'Límite Crédito', 'Saldo Actual', 'Estado'],
      ...proveedores.map(p => [
        p.codigo, p.nombre, String(p.diasCredito), p.limiteCredito.toFixed(2),
        p.saldoActual.toFixed(2), p.activo ? 'Activo' : 'Inactivo',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analisis-proveedores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      'PENDIENTE': 'default', 'CONFIRMADA': 'secondary', 'PARCIAL': 'default',
      'RECIBIDA': 'secondary', 'CANCELADA': 'destructive',
    };
    return <Badge variant={variants[estado] || 'default'}>{estado}</Badge>;
  };

  const productosFiltrados = productoBusqueda
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(productoBusqueda.toLowerCase()) ||
        p.codigo.toLowerCase().includes(productoBusqueda.toLowerCase())
      ).slice(0, 8)
    : [];

  const comprasDelMes = ordenesCompra
    .filter(o => {
      const f = new Date(o.fecha);
      const now = new Date();
      return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + o.total, 0);

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
          <Button onClick={openProveedor}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Proveedor
          </Button>
          <Button onClick={openOrden}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proveedores.filter(p => p.activo).length}</div>
            <p className="text-xs text-muted-foreground">
              {proveedores.length - proveedores.filter(p => p.activo).length} inactivos
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
            <div className="text-2xl font-bold">${comprasDelMes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total del mes en curso</p>
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
            <p className="text-xs text-muted-foreground">Requieren seguimiento</p>
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
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ordenes">Órdenes de Compra</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
          <TabsTrigger value="recepciones">Recepciones</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        {/* Ordenes */}
        <TabsContent value="ordenes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes de Compra</CardTitle>
              <CardDescription>Gestión de órdenes de compra y seguimiento de estado</CardDescription>
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
                    {filteredOrdenes.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {loading ? 'Cargando...' : 'No hay órdenes de compra'}
                      </td></tr>
                    )}
                    {filteredOrdenes.map((orden) => (
                      <tr key={orden.id} className="border-b">
                        <td className="px-4 py-3 font-medium">{orden.folio}</td>
                        <td className="px-4 py-3">{orden.proveedor.nombre}</td>
                        <td className="px-4 py-3">{new Date(orden.fecha).toLocaleDateString()}</td>
                        <td className="px-4 py-3">${orden.total.toLocaleString()}</td>
                        <td className="px-4 py-3">{getEstadoBadge(orden.estado)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setOrdenVer(orden); setDialogType('ver'); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(orden.estado === 'PENDIENTE' || orden.estado === 'CONFIRMADA' || orden.estado === 'PARCIAL') && (
                              <Button variant="ghost" size="sm" title="Recibir mercancía" onClick={() => openRecepcion(orden)}>
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

        {/* Proveedores */}
        <TabsContent value="proveedores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Catálogo de Proveedores</CardTitle>
              <CardDescription>Gestión completa de proveedores y condiciones comerciales</CardDescription>
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProveedores.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {loading ? 'Cargando...' : 'No hay proveedores'}
                      </td></tr>
                    )}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recepciones */}
        <TabsContent value="recepciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recepción de Mercancía</CardTitle>
              <CardDescription>Control de entrada de productos y actualización de inventario</CardDescription>
            </CardHeader>
            <CardContent>
              {recepciones.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No hay recepciones registradas</h3>
                  <p className="text-muted-foreground">
                    Usa el botón de recepción en una orden pendiente para registrar la entrada de mercancía
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left">Folio</th>
                        <th className="px-4 py-3 text-left">Orden</th>
                        <th className="px-4 py-3 text-left">Proveedor</th>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Productos</th>
                        <th className="px-4 py-3 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recepciones.map((r) => (
                        <tr key={r.id} className="border-b">
                          <td className="px-4 py-3 font-medium">{r.folio}</td>
                          <td className="px-4 py-3">{r.ordenCompra.folio}</td>
                          <td className="px-4 py-3">{r.ordenCompra.proveedor.nombre}</td>
                          <td className="px-4 py-3">{new Date(r.fecha).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{r.detalles.length}</td>
                          <td className="px-4 py-3"><Badge variant="secondary">{r.estado}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reportes */}
        <TabsContent value="reportes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reporte de Compras</CardTitle>
                <CardDescription>Listado de órdenes de compra por período y proveedor</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={descargarReporte} disabled={ordenesCompra.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Reporte (CSV)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis de Proveedores</CardTitle>
                <CardDescription>Condiciones comerciales y saldos de proveedores</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={descargarAnalisisProveedores} disabled={proveedores.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Análisis (CSV)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Proveedor */}
      <Dialog open={dialogType === 'proveedor'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nuevo Proveedor</DialogTitle>
            <DialogDescription>Complete la información del proveedor.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input id="codigo" placeholder="PROV001" value={proveedorForm.codigo}
                  onChange={(e) => setProveedorForm({ ...proveedorForm, codigo: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input id="nombre" placeholder="Nombre del proveedor" value={proveedorForm.nombre}
                  onChange={(e) => setProveedorForm({ ...proveedorForm, nombre: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contacto">Persona de Contacto</Label>
              <Input id="contacto" placeholder="Nombre del contacto" value={proveedorForm.contacto}
                onChange={(e) => setProveedorForm({ ...proveedorForm, contacto: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" placeholder="(555) 123-4567" value={proveedorForm.telefono}
                  onChange={(e) => setProveedorForm({ ...proveedorForm, telefono: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="contacto@proveedor.com" value={proveedorForm.email}
                  onChange={(e) => setProveedorForm({ ...proveedorForm, email: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Textarea id="direccion" placeholder="Dirección completa" value={proveedorForm.direccion}
                onChange={(e) => setProveedorForm({ ...proveedorForm, direccion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="diasCredito">Días de Crédito</Label>
                <Input id="diasCredito" type="number" placeholder="30" value={proveedorForm.diasCredito}
                  onChange={(e) => setProveedorForm({ ...proveedorForm, diasCredito: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="limiteCredito">Límite de Crédito</Label>
                <Input id="limiteCredito" type="number" placeholder="100000" value={proveedorForm.limiteCredito}
                  onChange={(e) => setProveedorForm({ ...proveedorForm, limiteCredito: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={submitProveedor} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear Proveedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Orden */}
      <Dialog open={dialogType === 'orden'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[750px]">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Compra</DialogTitle>
            <DialogDescription>Selecciona proveedor y agrega productos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Proveedor *</Label>
              <Select value={ordenProveedor} onValueChange={setOrdenProveedor}>
                <SelectTrigger><SelectValue placeholder="Selecciona un proveedor" /></SelectTrigger>
                <SelectContent>
                  {proveedores.filter(p => p.activo).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Agregar productos</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Buscar producto por nombre o código..."
                  value={productoBusqueda} onChange={(e) => setProductoBusqueda(e.target.value)} />
                {productosFiltrados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-auto">
                    {productosFiltrados.map((p) => (
                      <button key={p.id} type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => agregarLinea(p)}>
                        <span>{p.nombre}</span>
                        <span className="text-muted-foreground">{p.codigo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {lineas.length > 0 && (
              <div className="rounded-md border max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-left w-20">Cant.</th>
                      <th className="px-3 py-2 text-left w-28">Precio</th>
                      <th className="px-3 py-2 text-left w-28">Subtotal</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l) => (
                      <tr key={l.productoId} className="border-b">
                        <td className="px-3 py-2">
                          <div>{l.nombre}</div>
                          <div className="text-xs text-muted-foreground">{l.codigo}</div>
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" min={1} value={l.cantidad}
                            onChange={(e) => updateLinea(l.productoId, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))} />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" min={0} step="0.01" value={l.precio}
                            onChange={(e) => updateLinea(l.productoId, 'precio', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="px-3 py-2">${(l.cantidad * l.precio).toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <Button variant="ghost" size="sm" onClick={() => removeLinea(l.productoId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {lineas.length > 0 && (
              <div className="flex flex-col items-end gap-1 text-sm">
                <div>Subtotal: <span className="font-medium">${ordenSubtotal.toFixed(2)}</span></div>
                <div>IVA (16%): <span className="font-medium">${ordenIva.toFixed(2)}</span></div>
                <div className="text-base">Total: <span className="font-bold">${ordenTotal.toFixed(2)}</span></div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="ordenObs">Observaciones</Label>
              <Textarea id="ordenObs" value={ordenObs} onChange={(e) => setOrdenObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={submitOrden} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear Orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Recepcion */}
      <Dialog open={dialogType === 'recepcion'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Recibir Mercancía</DialogTitle>
            <DialogDescription>
              {recepcionOrden && `Orden ${recepcionOrden.folio} — ${recepcionOrden.proveedor.nombre}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {recepcionOrden && (
              <div className="rounded-md border max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-left w-28">Ordenado</th>
                      <th className="px-3 py-2 text-left w-32">Recibido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recepcionOrden.detalles.map((d) => (
                      <tr key={d.id} className="border-b">
                        <td className="px-3 py-2">
                          <div>{d.producto.nombre}</div>
                          <div className="text-xs text-muted-foreground">{d.producto.codigo}</div>
                        </td>
                        <td className="px-3 py-2">{d.cantidad}</td>
                        <td className="px-3 py-2">
                          <Input type="number" min={0} max={d.cantidad}
                            value={recepcionCantidades[d.producto.id] ?? d.cantidad}
                            onChange={(e) => setRecepcionCantidades({
                              ...recepcionCantidades,
                              [d.producto.id]: Math.max(0, parseInt(e.target.value) || 0),
                            })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="recepcionObs">Observaciones</Label>
              <Textarea id="recepcionObs" value={recepcionObs} onChange={(e) => setRecepcionObs(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Al confirmar se actualizará el stock, se registrará el movimiento de inventario y se generará la cuenta por pagar.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={submitRecepcion} disabled={submitting}>
              {submitting ? 'Procesando...' : 'Confirmar Recepción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Orden */}
      <Dialog open={dialogType === 'ver'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{ordenVer?.folio}</DialogTitle>
            <DialogDescription>
              {ordenVer && `${ordenVer.proveedor.nombre} — ${new Date(ordenVer.fecha).toLocaleDateString()}`}
            </DialogDescription>
          </DialogHeader>
          {ordenVer && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-2">{getEstadoBadge(ordenVer.estado)}</div>
              <div className="rounded-md border max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-left">Cant.</th>
                      <th className="px-3 py-2 text-left">Precio</th>
                      <th className="px-3 py-2 text-left">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenVer.detalles.map((d) => (
                      <tr key={d.id} className="border-b">
                        <td className="px-3 py-2">{d.producto.nombre}</td>
                        <td className="px-3 py-2">{d.cantidad}</td>
                        <td className="px-3 py-2">${d.precio.toFixed(2)}</td>
                        <td className="px-3 py-2">${d.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col items-end gap-1 text-sm">
                <div>Subtotal: <span className="font-medium">${ordenVer.subtotal.toFixed(2)}</span></div>
                <div>IVA: <span className="font-medium">${ordenVer.iva.toFixed(2)}</span></div>
                <div className="text-base">Total: <span className="font-bold">${ordenVer.total.toFixed(2)}</span></div>
              </div>
              {ordenVer.observaciones && (
                <div className="text-sm text-muted-foreground">Obs: {ordenVer.observaciones}</div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
