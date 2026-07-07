
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Package,
  Edit3,
  Trash2,
  Eye,
  Star,
  Download,
  RefreshCw,
  Link2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RolePermissions } from '@/lib/types';
import { ProductForm } from '@/components/productos/product-form';
import { ProductDetails } from '@/components/productos/product-details';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  codigoBarras?: string;
  precio1: number;
  precio2: number;
  precio3: number;
  precio4: number;
  precio5: number;
  etiquetaPrecio1: string;
  etiquetaPrecio2: string;
  etiquetaPrecio3: string;
  etiquetaPrecio4: string;
  etiquetaPrecio5: string;
  precioCompra: number;
  porcentajeGanancia: number;
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  unidadMedida: string;
  imagen?: string;
  isActive: boolean;
  destacado: boolean;
  oferta: boolean;
  createdAt: string;
  updatedAt: string;
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

  // Generar páginas visibles: siempre mostrar primera, última y páginas cercanas al actual
  const getPages = () => {
    const pages: (number | 'ellipsis')[] = [];
    const range = 2; // páginas a cada lado del actual

    const addPage = (p: number) => {
      if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
    };

    addPage(1);
    for (let p = currentPage - range; p <= currentPage + range; p++) addPage(p);
    addPage(totalPages);

    // Ordenar e insertar elipsis
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

export default function ProductosPage() {
  const { data: session } = useSession() || {};
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [selectedMarca, setSelectedMarca] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null; nombre: string }>({
    open: false, id: null, nombre: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounce en el buscador — evita peticiones por cada tecla
  const debouncedSearch = useDebounce(searchTerm, DEBOUNCE_MS);

  const userRole = session?.user?.role;
  const permissions = userRole ? RolePermissions[userRole as keyof typeof RolePermissions] : {};

  // Reset a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCategoria, selectedMarca, showActiveOnly]);

  useEffect(() => {
    fetchProductos();
  }, [currentPage, debouncedSearch, selectedCategoria, selectedMarca, showActiveOnly]);

  useEffect(() => {
    fetchCategorias();
    fetchMarcas();
  }, []);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: PAGE_SIZE.toString(),
        search: debouncedSearch,
        activos: showActiveOnly.toString(),
      });
      if (selectedCategoria !== 'all') params.append('categoria', selectedCategoria);
      if (selectedMarca !== 'all') params.append('marca', selectedMarca);

      const response = await fetch(`/api/productos?${params}`);
      if (response?.ok) {
        const data = await response.json();
        setProductos(data.productos || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        toast.error('Error al cargar productos');
      }
    } catch (error) {
      console.error('Error fetching productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/productos/categorias');
      if (response?.ok) {
        const data = await response.json();
        setCategorias(data.categorias || []);
      }
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const fetchMarcas = async () => {
    try {
      const response = await fetch('/api/productos/marcas');
      if (response?.ok) {
        const data = await response.json();
        setMarcas(data.marcas || []);
      }
    } catch (error) {
      console.error('Error fetching marcas:', error);
    }
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        activos: showActiveOnly.toString(),
      });
      if (selectedCategoria !== 'all') params.append('categoria', selectedCategoria);
      if (selectedMarca !== 'all') params.append('marca', selectedMarca);

      const response = await fetch(`/api/productos/export?${params}`);
      if (!response.ok) throw new Error('Error al exportar');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exportando ${total.toLocaleString()} productos...`);
    } catch (err: any) {
      toast.error(`Error al exportar: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleSyncContpaqi = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/contpaqi/sync/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'pull' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al sincronizar');
      const { importados = 0, fallidos = 0 } = data.data ?? {};
      toast.success(`Sincronización completada: ${importados} importados, ${fallidos} fallidos`);
      fetchProductos();
      fetchCategorias();
      fetchMarcas();
    } catch (err: any) {
      toast.error(`Error al sincronizar: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    const producto = productos.find((p) => p.id === id);
    setDeleteConfirm({ open: true, id, nombre: producto?.nombre ?? 'este producto' });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/productos/${deleteConfirm.id}`, { method: 'DELETE' });
      if (response?.ok) {
        toast.success('Producto eliminado exitosamente');
        fetchProductos();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al eliminar producto');
      }
    } catch (error) {
      toast.error('Error al eliminar producto');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm({ open: false, id: null, nombre: '' });
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  const getStockBadge = (stock: number, stockMinimo: number) => {
    if (stock === 0) return <Badge variant="destructive">Sin Stock</Badge>;
    if (stock <= stockMinimo) return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Stock Bajo</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-800">En Stock</Badge>;
  };

  return (
    <div className="space-y-4">
      <Header
        title="Gestión de Productos"
        description={`Catálogo con soporte para grandes volúmenes — ${total.toLocaleString()} producto${total !== 1 ? 's' : ''}`}
      />

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Buscador con debounce */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por código, nombre, marca, código de barras…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMarca} onValueChange={setSelectedMarca}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {marcas.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline" size="sm"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className={showActiveOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : ''}
              >
                {showActiveOnly ? 'Solo Activos' : 'Todos'}
              </Button>

              {permissions?.productos?.create && (
                <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Nuevo
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exportLoading} title="Exportar a CSV">
                {exportLoading
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />}
              </Button>

              <Button variant="outline" size="sm" onClick={handleSyncContpaqi} disabled={syncLoading} title="Sincronizar desde CONTPAQi">
                {syncLoading
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Link2 className="w-4 h-4 text-blue-600" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de productos */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3 font-medium w-8"></th>
                  <th className="text-left px-4 py-3 font-medium">Código</th>
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Categoría / Marca</th>
                  <th className="text-right px-4 py-3 font-medium">Precio Público</th>
                  <th className="text-right px-4 py-3 font-medium">P. Mayorista</th>
                  <th className="text-center px-4 py-3 font-medium">Stock</th>
                  <th className="text-center px-4 py-3 font-medium">Estado</th>
                  <th className="text-center px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-4" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16 ml-auto" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16 ml-auto" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-12 mx-auto" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16 mx-auto" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24 mx-auto" /></td>
                    </tr>
                  ))
                ) : productos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-500">
                      <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                      <p className="font-medium">No se encontraron productos</p>
                      <p className="text-sm mt-1">
                        {searchTerm || selectedCategoria !== 'all' || selectedMarca !== 'all'
                          ? 'Intenta ajustar los filtros de búsqueda'
                          : 'Comienza agregando tu primer producto'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  productos.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-4 py-2.5 text-center">
                        {p.destacado && <Star className="w-3.5 h-3.5 text-yellow-500 inline" />}
                        {p.oferta && <span className="text-red-500 text-xs font-bold">%</span>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{p.codigo}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900 line-clamp-1">{p.nombre}</p>
                        {p.modelo && <p className="text-xs text-gray-400">{p.modelo}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        {p.categoria && (
                          <Badge variant="outline" className="text-xs mr-1">{p.categoria}</Badge>
                        )}
                        {p.marca && <span className="text-xs text-gray-500">{p.marca}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                        {formatPrice(p.precio1)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-blue-600 text-sm">
                        {p.precio2 > 0 ? formatPrice(p.precio2) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-medium">
                            {p.stock.toLocaleString()} <span className="text-xs text-gray-400">{p.unidadMedida}</span>
                          </span>
                          {getStockBadge(p.stock, p.stockMinimo)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={p.isActive ? 'default' : 'secondary'}>
                          {p.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => { setSelectedProduct(p); setShowDetails(true); }}
                            className="h-7 w-7 p-0"
                            title="Ver detalles"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {permissions?.productos?.update && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => { setSelectedProduct(p); setShowForm(true); }}
                              className="h-7 w-7 p-0"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {permissions?.productos?.delete && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleDelete(p.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Paginación inteligente */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500">
            Mostrando{' '}
            <span className="font-medium">{((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}</span>
            {' '}–{' '}
            <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, total).toLocaleString()}</span>
            {' '}de{' '}
            <span className="font-medium">{total.toLocaleString()}</span> productos
          </p>
          <SmartPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Modales */}
      {showForm && (
        <ProductForm
          product={selectedProduct}
          onClose={() => { setShowForm(false); setSelectedProduct(null); fetchProductos(); }}
        />
      )}

      {showDetails && selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onClose={() => { setShowDetails(false); setSelectedProduct(null); }}
          onEdit={() => {
            setShowDetails(false);
            setShowForm(true);
          }}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Eliminar producto"
        message={`¿Estás seguro de que deseas eliminar "${deleteConfirm.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        variant="danger"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null, nombre: '' })}
      />
    </div>
  );
}
