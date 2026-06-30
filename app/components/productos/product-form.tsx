
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import {
  Loader2, Save, X, Package, DollarSign, BarChart3, MapPin, Sliders, Info
} from 'lucide-react';

const productSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  descripcion: z.string().optional(),
  categoria: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  codigoBarras: z.string().optional(),
  presentacion: z.string().optional(),
  contenido: z.string().optional(),
  peso: z.coerce.number().min(0).optional(),
  dimensiones: z.string().optional(),
  color: z.string().optional(),
  talla: z.string().optional(),
  precio1: z.coerce.number().min(0, 'Precio debe ser mayor o igual a 0'),
  precio2: z.coerce.number().min(0).optional(),
  precio3: z.coerce.number().min(0).optional(),
  precio4: z.coerce.number().min(0).optional(),
  precio5: z.coerce.number().min(0).optional(),
  etiquetaPrecio1: z.string().min(1, 'Etiqueta es requerida'),
  etiquetaPrecio2: z.string().optional(),
  etiquetaPrecio3: z.string().optional(),
  etiquetaPrecio4: z.string().optional(),
  etiquetaPrecio5: z.string().optional(),
  precioCompra: z.coerce.number().min(0).optional(),
  porcentajeGanancia: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0),
  stockMinimo: z.coerce.number().int().min(0),
  stockMaximo: z.coerce.number().int().min(1),
  unidadMedida: z.string().min(1, 'Unidad de medida es requerida'),
  pasillo: z.string().optional(),
  estante: z.string().optional(),
  nivel: z.string().optional(),
  proveedorPrincipal: z.string().optional(),
  tiempoEntrega: z.coerce.number().int().min(0).optional(),
  fechaVencimiento: z.string().optional(),
  lote: z.string().optional(),
  requiereReceta: z.boolean().optional(),
  controlado: z.boolean().optional(),
  imagen: z.string().optional(),
  destacado: z.boolean().optional(),
  oferta: z.boolean().optional(),
  isActive: z.boolean().optional(),
  claveSat: z.string().optional(),
  claveUnidadSat: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: any;
  onClose: () => void;
}

export function ProductForm({ product, onClose }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);

  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: '',
      marca: '',
      modelo: '',
      codigoBarras: '',
      presentacion: '',
      contenido: '',
      peso: 0,
      dimensiones: '',
      color: '',
      talla: '',
      precio1: 0,
      precio2: 0,
      precio3: 0,
      precio4: 0,
      precio5: 0,
      etiquetaPrecio1: 'Público',
      etiquetaPrecio2: 'Mayorista',
      etiquetaPrecio3: 'Distribuidor',
      etiquetaPrecio4: 'Especial',
      etiquetaPrecio5: 'Promocional',
      precioCompra: 0,
      porcentajeGanancia: 0,
      stock: 0,
      stockMinimo: 0,
      stockMaximo: 1000,
      unidadMedida: 'PZA',
      pasillo: '',
      estante: '',
      nivel: '',
      proveedorPrincipal: '',
      tiempoEntrega: 0,
      fechaVencimiento: '',
      lote: '',
      requiereReceta: false,
      controlado: false,
      imagen: '',
      destacado: false,
      oferta: false,
      isActive: true,
      claveSat: '',
      claveUnidadSat: '',
    },
  });

  const precioCompra = watch('precioCompra');
  const precio1 = watch('precio1');
  const unidadMedida = watch('unidadMedida');

  useEffect(() => {
    if (product) {
      reset({
        codigo: product.codigo || '',
        nombre: product.nombre || '',
        descripcion: product.descripcion || '',
        categoria: product.categoria || '',
        marca: product.marca || '',
        modelo: product.modelo || '',
        codigoBarras: product.codigoBarras || '',
        presentacion: product.presentacion || '',
        contenido: product.contenido || '',
        peso: product.peso || 0,
        dimensiones: product.dimensiones || '',
        color: product.color || '',
        talla: product.talla || '',
        precio1: product.precio1 || 0,
        precio2: product.precio2 || 0,
        precio3: product.precio3 || 0,
        precio4: product.precio4 || 0,
        precio5: product.precio5 || 0,
        etiquetaPrecio1: product.etiquetaPrecio1 || 'Público',
        etiquetaPrecio2: product.etiquetaPrecio2 || 'Mayorista',
        etiquetaPrecio3: product.etiquetaPrecio3 || 'Distribuidor',
        etiquetaPrecio4: product.etiquetaPrecio4 || 'Especial',
        etiquetaPrecio5: product.etiquetaPrecio5 || 'Promocional',
        precioCompra: product.precioCompra || 0,
        porcentajeGanancia: product.porcentajeGanancia || 0,
        stock: product.stock || 0,
        stockMinimo: product.stockMinimo || 0,
        stockMaximo: product.stockMaximo || 1000,
        unidadMedida: product.unidadMedida || 'PZA',
        pasillo: product.pasillo || '',
        estante: product.estante || '',
        nivel: product.nivel || '',
        proveedorPrincipal: product.proveedorPrincipal || '',
        tiempoEntrega: product.tiempoEntrega || 0,
        fechaVencimiento: product.fechaVencimiento ? new Date(product.fechaVencimiento).toISOString().split('T')[0] : '',
        lote: product.lote || '',
        requiereReceta: product.requiereReceta || false,
        controlado: product.controlado || false,
        imagen: product.imagen || '',
        destacado: product.destacado || false,
        oferta: product.oferta || false,
        isActive: product.isActive !== false,
        claveSat: product.claveSat || '',
        claveUnidadSat: product.claveUnidadSat || '',
      });
    }
    fetchCategorias();
    fetchMarcas();
  }, [product, reset]);

  // Calcular porcentaje de ganancia automáticamente
  useEffect(() => {
    if (precioCompra && precioCompra > 0 && precio1 && precio1 > 0) {
      const ganancia = ((precio1 - precioCompra) / precioCompra) * 100;
      setValue('porcentajeGanancia', parseFloat(ganancia.toFixed(2)));
    }
  }, [precioCompra, precio1, setValue]);

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

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);

    try {
      const url = isEditing ? `/api/productos/${product.id}` : '/api/productos';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response?.ok) {
        toast.success(isEditing ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar producto');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 pr-6">
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600 animate-pulse" />
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full mt-4">
            <TabsList className="flex w-full overflow-x-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl scrollbar-none gap-1 sm:grid sm:grid-cols-5">
              <TabsTrigger value="basic" className="flex-1 min-w-[80px] sm:min-w-0 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-lg">Básico</TabsTrigger>
              <TabsTrigger value="prices" className="flex-1 min-w-[80px] sm:min-w-0 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-lg">Precios</TabsTrigger>
              <TabsTrigger value="inventory" className="flex-1 min-w-[80px] sm:min-w-0 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-lg">Inventario</TabsTrigger>
              <TabsTrigger value="location" className="flex-1 min-w-[80px] sm:min-w-0 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-lg">Ubicación</TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1 min-w-[80px] sm:min-w-0 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-lg">Avanzado</TabsTrigger>
            </TabsList>

            {/* Información Básica */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card className="border border-slate-150 shadow-sm rounded-xl">
                <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center gap-2 space-y-0">
                  <Info className="w-4.5 h-4.5 text-indigo-500" />
                  <CardTitle className="text-base font-semibold text-slate-800">Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="codigo" className="text-xs font-bold text-slate-600">Código *</Label>
                      <Input
                        id="codigo"
                        {...register('codigo')}
                        placeholder="Ingresa el código del producto"
                        className="mt-1"
                      />
                      {errors.codigo && (
                        <p className="text-xs text-red-600 mt-1 font-medium">{errors.codigo.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="codigoBarras" className="text-xs font-bold text-slate-600">Código de Barras</Label>
                      <Input
                        id="codigoBarras"
                        {...register('codigoBarras')}
                        placeholder="Código de barras"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="nombre" className="text-xs font-bold text-slate-600">Nombre *</Label>
                    <Input
                      id="nombre"
                      {...register('nombre')}
                      placeholder="Nombre del producto"
                      className="mt-1"
                    />
                    {errors.nombre && (
                      <p className="text-xs text-red-600 mt-1 font-medium">{errors.nombre.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="descripcion" className="text-xs font-bold text-slate-600">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      {...register('descripcion')}
                      placeholder="Descripción detallada del producto"
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="categoria" className="text-xs font-bold text-slate-600">Categoría</Label>
                      <Input
                        id="categoria"
                        {...register('categoria')}
                        placeholder="Categoría"
                        list="categorias"
                        className="mt-1"
                      />
                      <datalist id="categorias">
                        {categorias?.map?.(categoria => (
                          <option key={categoria} value={categoria} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <Label htmlFor="marca" className="text-xs font-bold text-slate-600">Marca</Label>
                      <Input
                        id="marca"
                        {...register('marca')}
                        placeholder="Marca"
                        list="marcas"
                        className="mt-1"
                      />
                      <datalist id="marcas">
                        {marcas?.map?.(marca => (
                          <option key={marca} value={marca} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <Label htmlFor="modelo" className="text-xs font-bold text-slate-600">Modelo</Label>
                      <Input
                        id="modelo"
                        {...register('modelo')}
                        placeholder="Modelo"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="presentacion" className="text-xs font-bold text-slate-600">Presentación</Label>
                      <Input
                        id="presentacion"
                        {...register('presentacion')}
                        placeholder="ej: Caja, Botella, etc."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contenido" className="text-xs font-bold text-slate-600">Contenido</Label>
                      <Input
                        id="contenido"
                        {...register('contenido')}
                        placeholder="ej: 500ml, 1kg, etc."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="peso" className="text-xs font-bold text-slate-600">Peso (kg)</Label>
                      <Input
                        id="peso"
                        type="number"
                        step="0.01"
                        {...register('peso')}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dimensiones" className="text-xs font-bold text-slate-600">Dimensiones</Label>
                      <Input
                        id="dimensiones"
                        {...register('dimensiones')}
                        placeholder="ej: 10x20x30cm"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="color" className="text-xs font-bold text-slate-600">Color</Label>
                      <Input
                        id="color"
                        {...register('color')}
                        placeholder="Color"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="talla" className="text-xs font-bold text-slate-600">Talla</Label>
                      <Input
                        id="talla"
                        {...register('talla')}
                        placeholder="ej: S, M, L, XL"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Precios */}
            <TabsContent value="prices" className="space-y-4 mt-4">
              <Card className="border border-slate-150 shadow-sm rounded-xl">
                <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center gap-2 space-y-0">
                  <DollarSign className="w-4.5 h-4.5 text-green-500" />
                  <CardTitle className="text-base font-semibold text-slate-800">Configuración de Precios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="precioCompra" className="text-xs font-bold text-slate-600">Precio de Compra</Label>
                      <Input
                        id="precioCompra"
                        type="number"
                        step="0.01"
                        {...register('precioCompra')}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="porcentajeGanancia" className="text-xs font-bold text-slate-600">% Ganancia (calculado)</Label>
                      <Input
                        id="porcentajeGanancia"
                        type="number"
                        step="0.01"
                        {...register('porcentajeGanancia')}
                        placeholder="0.00"
                        readOnly
                        className="mt-1 bg-slate-50 text-slate-500 border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-indigo-500" />
                      Precios de Venta
                    </h4>
                    
                    {/* Precio 1 - Obligatorio */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-green-50/50 rounded-xl border border-green-100/50">
                      <div>
                        <Label htmlFor="etiquetaPrecio1" className="text-xs font-bold text-green-800">Etiqueta Precio 1 *</Label>
                        <Input
                          id="etiquetaPrecio1"
                          {...register('etiquetaPrecio1')}
                          placeholder="Público"
                          className="mt-1 border-green-200 focus-visible:ring-green-400 bg-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="precio1" className="text-xs font-bold text-green-800">Precio 1 *</Label>
                        <Input
                          id="precio1"
                          type="number"
                          step="0.01"
                          {...register('precio1')}
                          placeholder="0.00"
                          className="mt-1 border-green-200 focus-visible:ring-green-400 bg-white"
                        />
                        {errors.precio1 && (
                          <p className="text-xs text-red-600 mt-1 font-medium">{errors.precio1.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Precios 2-5 - Opcionales */}
                    {[2, 3, 4, 5].map(num => (
                      <div key={num} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <div>
                          <Label htmlFor={`etiquetaPrecio${num}`} className="text-xs font-bold text-slate-600">Etiqueta Precio {num}</Label>
                          <Input
                            id={`etiquetaPrecio${num}`}
                            {...register(`etiquetaPrecio${num}` as keyof ProductFormData)}
                            placeholder={num === 2 ? 'Mayorista' : num === 3 ? 'Distribuidor' : num === 4 ? 'Especial' : 'Promocional'}
                            className="mt-1 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`precio${num}`} className="text-xs font-bold text-slate-600">Precio {num}</Label>
                          <Input
                            id={`precio${num}`}
                            type="number"
                            step="0.01"
                            {...register(`precio${num}` as keyof ProductFormData)}
                            placeholder="0.00"
                            className="mt-1 bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventario */}
            <TabsContent value="inventory" className="space-y-4 mt-4">
              <Card className="border border-slate-150 shadow-sm rounded-xl">
                <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center gap-2 space-y-0">
                  <BarChart3 className="w-4.5 h-4.5 text-blue-500" />
                  <CardTitle className="text-base font-semibold text-slate-800">Control de Inventario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stock" className="text-xs font-bold text-slate-600">Stock Actual (Matriz)</Label>
                      <Input
                        id="stock"
                        type="number"
                        {...register('stock')}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="unidadMedida" className="text-xs font-bold text-slate-600">Unidad de Medida *</Label>
                      <div className="mt-1">
                        <Select value={unidadMedida} onValueChange={(value) => setValue('unidadMedida', value)}>
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Seleccionar unidad" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-slate-200">
                            <SelectItem value="PZA">Pieza</SelectItem>
                            <SelectItem value="KG">Kilogramo</SelectItem>
                            <SelectItem value="L">Litro</SelectItem>
                            <SelectItem value="M">Metro</SelectItem>
                            <SelectItem value="M2">Metro Cuadrado</SelectItem>
                            <SelectItem value="M3">Metro Cúbico</SelectItem>
                            <SelectItem value="CAJA">Caja</SelectItem>
                            <SelectItem value="PAR">Par</SelectItem>
                            <SelectItem value="DOCENA">Docena</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stockMinimo" className="text-xs font-bold text-slate-600">Stock Mínimo</Label>
                      <Input
                        id="stockMinimo"
                        type="number"
                        {...register('stockMinimo')}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="stockMaximo" className="text-xs font-bold text-slate-600">Stock Máximo</Label>
                      <Input
                        id="stockMaximo"
                        type="number"
                        {...register('stockMaximo')}
                        placeholder="1000"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <Label htmlFor="proveedorPrincipal" className="text-xs font-bold text-slate-600">Proveedor Principal</Label>
                      <Input
                        id="proveedorPrincipal"
                        {...register('proveedorPrincipal')}
                        placeholder="Nombre del proveedor"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tiempoEntrega" className="text-xs font-bold text-slate-600">Tiempo de Entrega (días)</Label>
                      <Input
                        id="tiempoEntrega"
                        type="number"
                        {...register('tiempoEntrega')}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ubicación */}
            <TabsContent value="location" className="space-y-4 mt-4">
              <Card className="border border-slate-150 shadow-sm rounded-xl">
                <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center gap-2 space-y-0">
                  <MapPin className="w-4.5 h-4.5 text-rose-500" />
                  <CardTitle className="text-base font-semibold text-slate-800">Ubicación en Almacén</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="pasillo" className="text-xs font-bold text-slate-600">Pasillo</Label>
                      <Input
                        id="pasillo"
                        {...register('pasillo')}
                        placeholder="A, B, C..."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="estante" className="text-xs font-bold text-slate-600">Estante</Label>
                      <Input
                        id="estante"
                        {...register('estante')}
                        placeholder="1, 2, 3..."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="nivel" className="text-xs font-bold text-slate-600">Nivel</Label>
                      <Input
                        id="nivel"
                        {...register('nivel')}
                        placeholder="Superior, Medio, Inferior"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <Label htmlFor="fechaVencimiento" className="text-xs font-bold text-slate-600">Fecha de Vencimiento</Label>
                      <Input
                        id="fechaVencimiento"
                        type="date"
                        {...register('fechaVencimiento')}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lote" className="text-xs font-bold text-slate-600">Lote</Label>
                      <Input
                        id="lote"
                        {...register('lote')}
                        placeholder="Número de lote"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Avanzado */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <Card className="border border-slate-150 shadow-sm rounded-xl">
                <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center gap-2 space-y-0">
                  <Sliders className="w-4.5 h-4.5 text-purple-500" />
                  <CardTitle className="text-base font-semibold text-slate-800">Configuración Avanzada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="imagen" className="text-xs font-bold text-slate-600">URL de Imagen</Label>
                    <Input
                      id="imagen"
                      type="url"
                      {...register('imagen')}
                      placeholder="https://example.com/imagen.jpg"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="claveSat" className="text-xs font-bold text-slate-600">Clave SAT (CFDI 4.0)</Label>
                      <Input
                        id="claveSat"
                        {...register('claveSat')}
                        placeholder="ej. 31211507"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="claveUnidadSat" className="text-xs font-bold text-slate-600">Clave Unidad SAT (CFDI 4.0)</Label>
                      <Input
                        id="claveUnidadSat"
                        {...register('claveUnidadSat')}
                        placeholder="ej. E48"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2.5 p-1">
                        <Checkbox
                          id="requiereReceta"
                          checked={watch('requiereReceta')}
                          onCheckedChange={(checked) => setValue('requiereReceta', !!checked)}
                        />
                        <Label htmlFor="requiereReceta" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">Requiere receta médica</Label>
                      </div>

                      <div className="flex items-center space-x-2.5 p-1">
                        <Checkbox
                          id="controlado"
                          checked={watch('controlado')}
                          onCheckedChange={(checked) => setValue('controlado', !!checked)}
                        />
                        <Label htmlFor="controlado" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">Producto controlado</Label>
                      </div>

                      <div className="flex items-center space-x-2.5 p-1">
                        <Checkbox
                          id="destacado"
                          checked={watch('destacado')}
                          onCheckedChange={(checked) => setValue('destacado', !!checked)}
                        />
                        <Label htmlFor="destacado" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">Producto destacado</Label>
                      </div>
                    </div>

                    <div className="space-y-3 sm:border-l sm:border-slate-100 sm:pl-6">
                      <div className="flex items-center space-x-2.5 p-1">
                        <Checkbox
                          id="oferta"
                          checked={watch('oferta')}
                          onCheckedChange={(checked) => setValue('oferta', !!checked)}
                        />
                        <Label htmlFor="oferta" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">En oferta</Label>
                      </div>

                      <div className="flex items-center space-x-2.5 p-1">
                        <Checkbox
                          id="isActive"
                          checked={watch('isActive')}
                          onCheckedChange={(checked) => setValue('isActive', !!checked)}
                        />
                        <Label htmlFor="isActive" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">Producto activo</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 text-slate-600 hover:bg-slate-50">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm">
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
