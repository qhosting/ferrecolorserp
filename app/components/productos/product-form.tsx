
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
import { Loader2, Save, X } from 'lucide-react';

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
    },
  });

  const precioCompra = watch('precioCompra');
  const precio1 = watch('precio1');

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="prices">Precios</TabsTrigger>
              <TabsTrigger value="inventory">Inventario</TabsTrigger>
              <TabsTrigger value="location">Ubicación</TabsTrigger>
              <TabsTrigger value="advanced">Avanzado</TabsTrigger>
            </TabsList>

            {/* Información Básica */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Información Básica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="codigo">Código *</Label>
                      <Input
                        id="codigo"
                        {...register('codigo')}
                        placeholder="Ingresa el código del producto"
                      />
                      {errors.codigo && (
                        <p className="text-sm text-red-600 mt-1">{errors.codigo.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="codigoBarras">Código de Barras</Label>
                      <Input
                        id="codigoBarras"
                        {...register('codigoBarras')}
                        placeholder="Código de barras"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      {...register('nombre')}
                      placeholder="Nombre del producto"
                    />
                    {errors.nombre && (
                      <p className="text-sm text-red-600 mt-1">{errors.nombre.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      {...register('descripcion')}
                      placeholder="Descripción detallada del producto"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="categoria">Categoría</Label>
                      <Input
                        id="categoria"
                        {...register('categoria')}
                        placeholder="Categoría"
                        list="categorias"
                      />
                      <datalist id="categorias">
                        {categorias?.map?.(categoria => (
                          <option key={categoria} value={categoria} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <Label htmlFor="marca">Marca</Label>
                      <Input
                        id="marca"
                        {...register('marca')}
                        placeholder="Marca"
                        list="marcas"
                      />
                      <datalist id="marcas">
                        {marcas?.map?.(marca => (
                          <option key={marca} value={marca} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <Label htmlFor="modelo">Modelo</Label>
                      <Input
                        id="modelo"
                        {...register('modelo')}
                        placeholder="Modelo"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="presentacion">Presentación</Label>
                      <Input
                        id="presentacion"
                        {...register('presentacion')}
                        placeholder="ej: Caja, Botella, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="contenido">Contenido</Label>
                      <Input
                        id="contenido"
                        {...register('contenido')}
                        placeholder="ej: 500ml, 1kg, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="peso">Peso (kg)</Label>
                      <Input
                        id="peso"
                        type="number"
                        step="0.01"
                        {...register('peso')}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dimensiones">Dimensiones</Label>
                      <Input
                        id="dimensiones"
                        {...register('dimensiones')}
                        placeholder="ej: 10x20x30cm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        {...register('color')}
                        placeholder="Color"
                      />
                    </div>

                    <div>
                      <Label htmlFor="talla">Talla</Label>
                      <Input
                        id="talla"
                        {...register('talla')}
                        placeholder="ej: S, M, L, XL"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Precios */}
            <TabsContent value="prices" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Precios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="precioCompra">Precio de Compra</Label>
                      <Input
                        id="precioCompra"
                        type="number"
                        step="0.01"
                        {...register('precioCompra')}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="porcentajeGanancia">% Ganancia (calculado)</Label>
                      <Input
                        id="porcentajeGanancia"
                        type="number"
                        step="0.01"
                        {...register('porcentajeGanancia')}
                        placeholder="0.00"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Precios de Venta</h4>
                    
                    {/* Precio 1 - Obligatorio */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="etiquetaPrecio1">Etiqueta Precio 1 *</Label>
                        <Input
                          id="etiquetaPrecio1"
                          {...register('etiquetaPrecio1')}
                          placeholder="Público"
                        />
                      </div>
                      <div>
                        <Label htmlFor="precio1">Precio 1 *</Label>
                        <Input
                          id="precio1"
                          type="number"
                          step="0.01"
                          {...register('precio1')}
                          placeholder="0.00"
                        />
                        {errors.precio1 && (
                          <p className="text-sm text-red-600 mt-1">{errors.precio1.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Precios 2-5 - Opcionales */}
                    {[2, 3, 4, 5].map(num => (
                      <div key={num} className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`etiquetaPrecio${num}`}>Etiqueta Precio {num}</Label>
                          <Input
                            id={`etiquetaPrecio${num}`}
                            {...register(`etiquetaPrecio${num}` as keyof ProductFormData)}
                            placeholder={num === 2 ? 'Mayorista' : num === 3 ? 'Distribuidor' : num === 4 ? 'Especial' : 'Promocional'}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`precio${num}`}>Precio {num}</Label>
                          <Input
                            id={`precio${num}`}
                            type="number"
                            step="0.01"
                            {...register(`precio${num}` as keyof ProductFormData)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventario */}
            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Control de Inventario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stock">Stock Actual</Label>
                      <Input
                        id="stock"
                        type="number"
                        {...register('stock')}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="unidadMedida">Unidad de Medida *</Label>
                      <Select onValueChange={(value) => setValue('unidadMedida', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar unidad" />
                        </SelectTrigger>
                        <SelectContent>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                      <Input
                        id="stockMinimo"
                        type="number"
                        {...register('stockMinimo')}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="stockMaximo">Stock Máximo</Label>
                      <Input
                        id="stockMaximo"
                        type="number"
                        {...register('stockMaximo')}
                        placeholder="1000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="proveedorPrincipal">Proveedor Principal</Label>
                      <Input
                        id="proveedorPrincipal"
                        {...register('proveedorPrincipal')}
                        placeholder="Nombre del proveedor"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tiempoEntrega">Tiempo de Entrega (días)</Label>
                      <Input
                        id="tiempoEntrega"
                        type="number"
                        {...register('tiempoEntrega')}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ubicación */}
            <TabsContent value="location" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ubicación en Almacén</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="pasillo">Pasillo</Label>
                      <Input
                        id="pasillo"
                        {...register('pasillo')}
                        placeholder="A, B, C..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="estante">Estante</Label>
                      <Input
                        id="estante"
                        {...register('estante')}
                        placeholder="1, 2, 3..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="nivel">Nivel</Label>
                      <Input
                        id="nivel"
                        {...register('nivel')}
                        placeholder="Superior, Medio, Inferior"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fechaVencimiento">Fecha de Vencimiento</Label>
                      <Input
                        id="fechaVencimiento"
                        type="date"
                        {...register('fechaVencimiento')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="lote">Lote</Label>
                      <Input
                        id="lote"
                        {...register('lote')}
                        placeholder="Número de lote"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Avanzado */}
            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración Avanzada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="imagen">URL de Imagen</Label>
                    <Input
                      id="imagen"
                      type="url"
                      {...register('imagen')}
                      placeholder="https://upload.wikimedia.org/wikipedia/commons/6/63/Generic_placeholder_page.jpg"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requiereReceta"
                        {...register('requiereReceta')}
                      />
                      <Label htmlFor="requiereReceta">Requiere receta médica</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="controlado"
                        {...register('controlado')}
                      />
                      <Label htmlFor="controlado">Producto controlado</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="destacado"
                        {...register('destacado')}
                      />
                      <Label htmlFor="destacado">Producto destacado</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="oferta"
                        {...register('oferta')}
                      />
                      <Label htmlFor="oferta">En oferta</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        {...register('isActive')}
                      />
                      <Label htmlFor="isActive">Producto activo</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEditing ? 'Actualizar' : 'Crear'} Producto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
