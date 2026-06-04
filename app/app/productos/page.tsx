
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Filter, 
  Package, 
  Edit3, 
  Trash2,
  Eye,
  AlertTriangle,
  Star,
  ShoppingCart,
  Download,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RolePermissions } from '@/lib/types';
import { ProductForm } from '@/components/productos/product-form';
import { ProductDetails } from '@/components/productos/product-details';
import { ProductFilters } from '@/components/productos/product-filters';

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

export default function ProductosPage() {
  const { data: session } = useSession() || {};
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [selectedMarca, setSelectedMarca] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);

  const userRole = session?.user?.role;
  const permissions = userRole ? RolePermissions[userRole] : {};

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
    fetchMarcas();
  }, [currentPage, searchTerm, selectedCategoria, selectedMarca, showActiveOnly]);

  const fetchProductos = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        activos: showActiveOnly.toString(),
      });

      if (selectedCategoria !== 'all') {
        params.append('categoria', selectedCategoria);
      }

      if (selectedMarca !== 'all') {
        params.append('marca', selectedMarca);
      }

      const response = await fetch(`/api/productos?${params}`);
      if (response?.ok) {
        const data = await response.json();
        setProductos(data.productos || []);
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

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) {
      return;
    }

    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: 'DELETE',
      });

      if (response?.ok) {
        toast.success('Producto eliminado exitosamente');
        fetchProductos();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al eliminar producto');
      }
    } catch (error) {
      console.error('Error deleting producto:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const handleEdit = (producto: Producto) => {
    setSelectedProduct(producto);
    setShowForm(true);
  };

  const handleView = (producto: Producto) => {
    setSelectedProduct(producto);
    setShowDetails(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedProduct(null);
    fetchProductos();
  };

  const handleDetailsClose = () => {
    setShowDetails(false);
    setSelectedProduct(null);
  };

  const getStockStatus = (stock: number, stockMinimo: number) => {
    if (stock === 0) return { text: 'Sin Stock', color: 'destructive' as const };
    if (stock <= stockMinimo) return { text: 'Stock Bajo', color: 'secondary' as const };
    return { text: 'En Stock', color: 'default' as const };
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header 
        title="Gestión de Productos"
        description="Administra el catálogo de productos con múltiples precios"
      />

      {/* Toolbar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por código, nombre, descripción, marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias?.map?.(categoria => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMarca} onValueChange={setSelectedMarca}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {marcas?.map?.(marca => (
                    <SelectItem key={marca} value={marca}>
                      {marca}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className={showActiveOnly ? 'bg-green-50 text-green-700' : ''}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showActiveOnly ? 'Solo Activos' : 'Todos'}
              </Button>

              {permissions?.productos?.create && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Producto
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {productos?.map?.(producto => (
          <Card key={producto.id} className="relative">
            {producto.destacado && (
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-yellow-500 text-white">
                  <Star className="w-3 h-3 mr-1" />
                  Destacado
                </Badge>
              </div>
            )}
            
            {producto.oferta && (
              <div className="absolute top-2 right-2 z-10">
                <Badge className="bg-red-500 text-white">
                  Oferta
                </Badge>
              </div>
            )}

            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {producto.nombre}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {producto.codigo}
                  </p>
                </div>
                <div className="ml-2">
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Product Info */}
              <div className="space-y-2">
                {producto.marca && (
                  <p className="text-sm text-gray-600">
                    <strong>Marca:</strong> {producto.marca}
                  </p>
                )}
                {producto.categoria && (
                  <Badge variant="outline">
                    {producto.categoria}
                  </Badge>
                )}
              </div>

              {/* Prices */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{producto.etiquetaPrecio1}:</span>
                  <span className="font-semibold text-green-600">
                    {formatPrice(producto.precio1)}
                  </span>
                </div>
                {producto.precio2 > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{producto.etiquetaPrecio2}:</span>
                    <span className="text-sm text-blue-600">
                      {formatPrice(producto.precio2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Stock */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Stock:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {producto.stock} {producto.unidadMedida}
                  </span>
                  <Badge {...getStockStatus(producto.stock, producto.stockMinimo)}>
                    {getStockStatus(producto.stock, producto.stockMinimo).text}
                  </Badge>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estado:</span>
                <Badge variant={producto.isActive ? 'default' : 'secondary'}>
                  {producto.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(producto)}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                
                {permissions?.productos?.update && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(producto)}
                    className="flex-1"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                )}
                
                {permissions?.productos?.delete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(producto.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {productos?.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedCategoria !== 'all' || selectedMarca !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza agregando tu primer producto'
              }
            </p>
            {permissions?.productos?.create && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Producto
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNumber = i + 1;
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <ProductForm
          product={selectedProduct}
          onClose={handleFormClose}
        />
      )}

      {showDetails && selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onClose={handleDetailsClose}
          onEdit={() => {
            setShowDetails(false);
            handleEdit(selectedProduct);
          }}
        />
      )}
    </div>
  );
}
