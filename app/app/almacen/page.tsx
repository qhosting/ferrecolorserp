'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Package, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  MapPin, 
  History, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Sliders,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RolePermissions } from '@/lib/types';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria?: string;
  marca?: string;
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  unidadMedida: string;
  pasillo?: string;
  estante?: string;
  nivel?: string;
  isActive: boolean;
}

interface Movimiento {
  id: string;
  productoId: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo: string;
  referencia?: string;
  fechaMovimiento: string;
  userId?: string;
  producto: {
    codigo: string;
    nombre: string;
    unidadMedida: string;
  };
}

export default function AlmacenPage() {
  const { data: session } = useSession() || {};
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovs, setLoadingMovs] = useState(false);
  
  // Filters & Pagination (Products)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categorias, setCategorias] = useState<string[]>([]);
  
  // Pagination (Movements)
  const [movCurrentPage, setMovCurrentPage] = useState(1);
  const [movTotalPages, setMovTotalPages] = useState(1);

  // Modals
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Form States
  const [selectedProd, setSelectedProd] = useState<Producto | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [adjType, setAdjType] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [adjQty, setAdjQty] = useState<number>(1);
  const [adjMotive, setAdjMotive] = useState<string>('');
  const [adjRef, setAdjRef] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Location Form State
  const [locPasillo, setLocPasillo] = useState('');
  const [locEstante, setLocEstante] = useState('');
  const [locNivel, setLocNivel] = useState('');

  const userRole = session?.user?.role;
  const permissions = userRole ? RolePermissions[userRole] : {};
  const canUpdate = permissions?.almacen?.update;

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
  }, [currentPage, searchTerm, selectedCategoria]);

  useEffect(() => {
    fetchMovimientos();
  }, [movCurrentPage]);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
        search: searchTerm,
        activos: 'true',
      });
      if (selectedCategoria !== 'all') {
        params.append('categoria', selectedCategoria);
      }

      const response = await fetch(`/api/productos?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProductos(data.productos || []);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        toast.error('Error al obtener productos');
      }
    } catch (error) {
      console.error('Error fetching productos:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/productos/categorias');
      if (response.ok) {
        const data = await response.json();
        setCategorias(data.categorias || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMovimientos = async () => {
    try {
      setLoadingMovs(true);
      const response = await fetch(`/api/sistema/inventario?page=${movCurrentPage}&limit=15`);
      if (response.ok) {
        const data = await response.json();
        setMovimientos(data.movimientos || []);
        setMovTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching movimientos:', error);
    } finally {
      setLoadingMovs(false);
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) {
      toast.error('Selecciona un producto');
      return;
    }
    if (adjQty <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    if (!adjMotive) {
      toast.error('Proporciona un motivo');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/sistema/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: selectedProd.id,
          tipo: adjType,
          cantidad: adjQty,
          motivo: adjMotive,
          referencia: adjRef,
        }),
      });

      if (response.ok) {
        toast.success('Movimiento registrado exitosamente');
        setShowAdjustmentModal(false);
        resetAdjForm();
        fetchProductos();
        fetchMovimientos();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al registrar movimiento');
      }
    } catch (error) {
      console.error('Error saving movement:', error);
      toast.error('Error de red al registrar movimiento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/productos/${selectedProd.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pasillo: locPasillo,
          estante: locEstante,
          nivel: locNivel,
        }),
      });

      if (response.ok) {
        toast.success('Ubicación actualizada correctamente');
        setShowLocationModal(false);
        fetchProductos();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al actualizar ubicación');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Error de red al actualizar ubicación');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAdjForm = () => {
    setSelectedProd(null);
    setModalSearch('');
    setAdjType('ENTRADA');
    setAdjQty(1);
    setAdjMotive('');
    setAdjRef('');
  };

  const openAdjustmentModal = (prod?: Producto) => {
    resetAdjForm();
    if (prod) {
      setSelectedProd(prod);
    }
    setShowAdjustmentModal(true);
  };

  const openLocationModal = (prod: Producto) => {
    setSelectedProd(prod);
    setLocPasillo(prod.pasillo || '');
    setLocEstante(prod.estante || '');
    setLocNivel(prod.nivel || '');
    setShowLocationModal(true);
  };

  // Stats calculations
  const totalInCatalog = productos.length;
  const alertProducts = productos.filter(p => p.stock <= p.stockMinimo && p.stock > 0).length;
  const outOfStock = productos.filter(p => p.stock === 0).length;
  const lastMovDate = movimientos[0]?.fechaMovimiento 
    ? new Date(movimientos[0].fechaMovimiento).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
    : 'Sin registros';

  const filteredModalProducts = modalSearch.trim() === ''
    ? productos.slice(0, 5)
    : productos.filter(p => 
        p.nombre.toLowerCase().includes(modalSearch.toLowerCase()) || 
        p.codigo.toLowerCase().includes(modalSearch.toLowerCase())
      ).slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      <Header 
        title="Gestión de Almacén"
        description="Monitoreo de stock en tiempo real, ubicaciones físicas y auditorías de inventario."
      />

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Total en Catálogo</p>
              <h3 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{totalInCatalog}</h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Package className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Stock Mínimo Alerta</p>
              <h3 className="text-3xl font-bold tracking-tight text-yellow-600 dark:text-yellow-400">{alertProducts}</h3>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 rounded-2xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Productos Agotados</p>
              <h3 className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{outOfStock}</h3>
            </div>
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Última Operación</p>
              <p className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50 truncate mt-1">{lastMovDate}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl">
              <History className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="inventario" className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="inventario" className="flex items-center gap-2 rounded-lg">
              <Package className="h-4 w-4" />
              Inventario Físico
            </TabsTrigger>
            <TabsTrigger value="kardex" className="flex items-center gap-2 rounded-lg">
              <History className="h-4 w-4" />
              Kardex de Movimientos
            </TabsTrigger>
          </TabsList>

          {canUpdate && (
            <Button onClick={() => openAdjustmentModal()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajuste Manual
            </Button>
          )}
        </div>

        {/* Tab 1: Current Inventory */}
        <TabsContent value="inventario" className="space-y-4 outline-none">
          <Card className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardHeader className="p-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xl font-bold">Existencias Físicas</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Filtrar por código o nombre..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
                <Select
                  value={selectedCategoria}
                  onValueChange={(val) => {
                    setSelectedCategoria(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-48 rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categorias.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => fetchProductos()} className="rounded-xl border-slate-200 dark:border-slate-800">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                    <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Código</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Producto</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Categoría</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Existencia</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Estado Stock</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Ubicación Física</TableHead>
                      {canUpdate && <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                          Cargando inventario...
                        </TableCell>
                      </TableRow>
                    ) : productos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                          No se encontraron existencias en el catálogo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      productos.map((prod) => {
                        let stockBadge = <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-0 flex items-center w-fit gap-1"><CheckCircle className="h-3 w-3" /> En Stock</Badge>;
                        if (prod.stock === 0) {
                          stockBadge = <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-0 flex items-center w-fit gap-1"><XCircle className="h-3 w-3" /> Agotado</Badge>;
                        } else if (prod.stock <= prod.stockMinimo) {
                          stockBadge = <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-0 flex items-center w-fit gap-1"><AlertTriangle className="h-3 w-3" /> Stock Mínimo</Badge>;
                        }

                        const hasLocation = prod.pasillo || prod.estante || prod.nivel;

                        return (
                          <TableRow key={prod.id} className="border-slate-200 dark:border-slate-800">
                            <TableCell className="font-mono text-sm">{prod.codigo}</TableCell>
                            <TableCell className="font-medium">
                              <div>
                                <p className="text-slate-900 dark:text-slate-100">{prod.nombre}</p>
                                {prod.marca && <span className="text-xs text-slate-500">{prod.marca}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">{prod.categoria || 'Sin clasificar'}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {prod.stock} <span className="text-xs font-normal text-slate-500">{prod.unidadMedida}</span>
                            </TableCell>
                            <TableCell>{stockBadge}</TableCell>
                            <TableCell>
                              {hasLocation ? (
                                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 text-sm">
                                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                                  <span>P: {prod.pasillo || '-'} | E: {prod.estante || '-'} | N: {prod.nivel || '-'}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No asignada</span>
                              )}
                            </TableCell>
                            {canUpdate && (
                              <TableCell className="text-right space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openLocationModal(prod)}
                                  className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 flex-inline items-center gap-1.5"
                                >
                                  <MapPin className="h-3 w-3" />
                                  Ubicación
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openAdjustmentModal(prod)}
                                  className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 flex-inline items-center gap-1.5"
                                >
                                  <Sliders className="h-3 w-3" />
                                  Ajustar
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-500">Página {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl"
                >
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Kardex History */}
        <TabsContent value="kardex" className="space-y-4 outline-none">
          <Card className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardHeader className="p-6 pb-4 flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Bitácora de Ajustes y Movimientos</CardTitle>
              <Button variant="outline" size="sm" onClick={() => fetchMovimientos()} className="rounded-xl">
                <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                    <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Fecha/Hora</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Producto</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Tipo</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Cant.</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Previo</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Nuevo</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Motivo</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Referencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMovs ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                          Cargando movimientos...
                        </TableCell>
                      </TableRow>
                    ) : movimientos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                          No hay movimientos registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      movimientos.map((mov) => {
                        let typeBadge = <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/10 border-0 flex items-center w-fit gap-0.5"><Sliders className="h-3 w-3" /> Ajuste</Badge>;
                        if (mov.tipo === 'ENTRADA') {
                          typeBadge = <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-0 flex items-center w-fit gap-0.5"><ArrowDownLeft className="h-3 w-3" /> Entrada</Badge>;
                        } else if (mov.tipo === 'SALIDA') {
                          typeBadge = <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-0 flex items-center w-fit gap-0.5"><ArrowUpRight className="h-3 w-3" /> Salida</Badge>;
                        }

                        return (
                          <TableRow key={mov.id} className="border-slate-200 dark:border-slate-800">
                            <TableCell className="text-slate-500 text-xs">
                              {new Date(mov.fechaMovimiento).toLocaleString('es-MX')}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <span className="font-mono text-slate-500 block">{mov.producto?.codigo}</span>
                                <span className="font-medium text-slate-900 dark:text-slate-100">{mov.producto?.nombre}</span>
                              </div>
                            </TableCell>
                            <TableCell>{typeBadge}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {mov.cantidad} <span className="text-[10px] font-normal text-slate-500">{mov.producto?.unidadMedida}</span>
                            </TableCell>
                            <TableCell className="text-right text-slate-500 text-sm">{mov.cantidadAnterior}</TableCell>
                            <TableCell className="text-right text-slate-900 dark:text-slate-100 font-semibold text-sm">{mov.cantidadNueva}</TableCell>
                            <TableCell className="text-slate-700 dark:text-slate-300 text-sm font-medium">{mov.motivo}</TableCell>
                            <TableCell className="text-slate-500 font-mono text-xs">{mov.referencia || '-'}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {movTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-500">Página {movCurrentPage} de {movTotalPages}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMovCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={movCurrentPage === 1}
                  className="rounded-xl"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMovCurrentPage(prev => Math.min(prev + 1, movTotalPages))}
                  disabled={movCurrentPage === movTotalPages}
                  className="rounded-xl"
                >
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal 1: Adjustment */}
      <Dialog open={showAdjustmentModal} onOpenChange={(open) => !open && setShowAdjustmentModal(false)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar Existencia Física</DialogTitle>
            <DialogDescription>
              Aumenta, disminuye o ajusta el stock de un producto directamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustmentSubmit} className="space-y-4 py-2">
            {!selectedProd ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Seleccionar Producto</label>
                <Input
                  placeholder="Buscar producto por nombre o código..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="rounded-xl"
                />
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredModalProducts.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 text-center">No hay productos sugeridos</div>
                  ) : (
                    filteredModalProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProd(p)}
                        className="w-full p-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-900 flex justify-between items-center transition-colors"
                      >
                        <div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{p.nombre}</span>
                          <span className="font-mono text-xs text-slate-500 block">{p.codigo}</span>
                        </div>
                        <Badge variant="outline">{p.stock} {p.unidadMedida}</Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{selectedProd.nombre}</h4>
                  <p className="font-mono text-xs text-slate-500">{selectedProd.codigo}</p>
                  <p className="text-xs text-slate-500 mt-1">Stock Actual: <span className="font-bold">{selectedProd.stock} {selectedProd.unidadMedida}</span></p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedProd(null)} className="text-blue-500 hover:text-blue-600 hover:bg-transparent">
                  Cambiar
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de Operación</label>
                <Select value={adjType} onValueChange={(val: any) => setAdjType(val)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ENTRADA">Entrada (+)</SelectItem>
                    <SelectItem value="SALIDA">Salida (-)</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste Físico (=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Cantidad</label>
                <Input
                  type="number"
                  min="1"
                  value={adjQty}
                  onChange={(e) => setAdjQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Motivo del Ajuste</label>
              <Select value={adjMotive} onValueChange={setAdjMotive}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Compra / Entrada de almacén">Compra / Entrada de almacén</SelectItem>
                  <SelectItem value="Venta / Despacho">Venta / Despacho</SelectItem>
                  <SelectItem value="Ajuste por Inventario Físico">Ajuste por Inventario Físico</SelectItem>
                  <SelectItem value="Merma, Rotura o Daño">Merma, Rotura o Daño</SelectItem>
                  <SelectItem value="Devolución de Cliente">Devolución de Cliente</SelectItem>
                  <SelectItem value="Corrección de captura">Corrección de captura</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Referencia / Folio (Opcional)</label>
              <Input
                placeholder="Ej. Factura, Orden, Ticket..."
                value={adjRef}
                onChange={(e) => setAdjRef(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdjustmentModal(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl" disabled={submitting || !selectedProd}>
                {submitting ? 'Guardando...' : 'Aplicar Ajuste'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Edit Location */}
      <Dialog open={showLocationModal} onOpenChange={(open) => !open && setShowLocationModal(false)}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Asignar Ubicación Física</DialogTitle>
            <DialogDescription>
              Especifica las coordenadas de almacenamiento en pasillo, estante y nivel.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLocationSubmit} className="space-y-4 py-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">{selectedProd?.nombre}</h4>
              <p className="font-mono text-xs text-slate-500">{selectedProd?.codigo}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Pasillo</label>
                <Input
                  placeholder="Ej. A1"
                  value={locPasillo}
                  onChange={(e) => setLocPasillo(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Estante</label>
                <Input
                  placeholder="Ej. 03"
                  value={locEstante}
                  onChange={(e) => setLocEstante(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Nivel</label>
                <Input
                  placeholder="Ej. B"
                  value={locNivel}
                  onChange={(e) => setLocNivel(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowLocationModal(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar Ubicación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
