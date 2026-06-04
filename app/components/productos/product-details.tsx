
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Edit3, 
  X, 
  Package, 
  DollarSign, 
  BarChart3, 
  MapPin,
  Calendar,
  Star,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface ProductDetailsProps {
  product: any;
  onClose: () => void;
  onEdit?: () => void;
}

export function ProductDetails({ product, onClose, onEdit }: ProductDetailsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getStockStatus = (stock: number, stockMinimo: number) => {
    if (stock === 0) {
      return { 
        text: 'Sin Stock', 
        color: 'destructive' as const,
        icon: AlertTriangle,
        bgColor: 'bg-red-50 text-red-700'
      };
    }
    if (stock <= stockMinimo) {
      return { 
        text: 'Stock Bajo', 
        color: 'secondary' as const,
        icon: AlertTriangle,
        bgColor: 'bg-yellow-50 text-yellow-700'
      };
    }
    return { 
      text: 'En Stock', 
      color: 'default' as const,
      icon: CheckCircle,
      bgColor: 'bg-green-50 text-green-700'
    };
  };

  const stockStatus = getStockStatus(product.stock, product.stockMinimo);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{product.nombre}</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Código: {product.codigo}</p>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant={product.isActive ? 'default' : 'secondary'}>
              {product.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
            
            <Badge {...stockStatus}>
              <stockStatus.icon className="w-3 h-3 mr-1" />
              {stockStatus.text}
            </Badge>

            {product.destacado && (
              <Badge className="bg-yellow-500 text-white">
                <Star className="w-3 h-3 mr-1" />
                Destacado
              </Badge>
            )}

            {product.oferta && (
              <Badge className="bg-red-500 text-white">
                Oferta
              </Badge>
            )}

            {product.requiereReceta && (
              <Badge variant="outline" className="border-red-300 text-red-600">
                Requiere Receta
              </Badge>
            )}

            {product.controlado && (
              <Badge variant="outline" className="border-orange-300 text-orange-600">
                Controlado
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="precios">Precios</TabsTrigger>
            <TabsTrigger value="inventario">Inventario</TabsTrigger>
            <TabsTrigger value="ubicacion">Ubicación</TabsTrigger>
          </TabsList>

          {/* Información General */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Info className="w-5 h-5 mr-2" />
                    Información Básica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Código:</span>
                      <p className="font-medium">{product.codigo}</p>
                    </div>

                    {product.codigoBarras && (
                      <div>
                        <span className="text-gray-600">Código de Barras:</span>
                        <p className="font-medium">{product.codigoBarras}</p>
                      </div>
                    )}

                    {product.categoria && (
                      <div>
                        <span className="text-gray-600">Categoría:</span>
                        <p className="font-medium">{product.categoria}</p>
                      </div>
                    )}

                    {product.marca && (
                      <div>
                        <span className="text-gray-600">Marca:</span>
                        <p className="font-medium">{product.marca}</p>
                      </div>
                    )}

                    {product.modelo && (
                      <div>
                        <span className="text-gray-600">Modelo:</span>
                        <p className="font-medium">{product.modelo}</p>
                      </div>
                    )}

                    {product.presentacion && (
                      <div>
                        <span className="text-gray-600">Presentación:</span>
                        <p className="font-medium">{product.presentacion}</p>
                      </div>
                    )}
                  </div>

                  {product.descripcion && (
                    <div>
                      <span className="text-gray-600 text-sm">Descripción:</span>
                      <p className="font-medium mt-1">{product.descripcion}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Package className="w-5 h-5 mr-2" />
                    Características
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {product.contenido && (
                      <div>
                        <span className="text-gray-600">Contenido:</span>
                        <p className="font-medium">{product.contenido}</p>
                      </div>
                    )}

                    {product.peso && (
                      <div>
                        <span className="text-gray-600">Peso:</span>
                        <p className="font-medium">{product.peso} kg</p>
                      </div>
                    )}

                    {product.dimensiones && (
                      <div>
                        <span className="text-gray-600">Dimensiones:</span>
                        <p className="font-medium">{product.dimensiones}</p>
                      </div>
                    )}

                    {product.color && (
                      <div>
                        <span className="text-gray-600">Color:</span>
                        <p className="font-medium">{product.color}</p>
                      </div>
                    )}

                    {product.talla && (
                      <div>
                        <span className="text-gray-600">Talla:</span>
                        <p className="font-medium">{product.talla}</p>
                      </div>
                    )}

                    {product.lote && (
                      <div>
                        <span className="text-gray-600">Lote:</span>
                        <p className="font-medium">{product.lote}</p>
                      </div>
                    )}
                  </div>

                  {product.fechaVencimiento && (
                    <div>
                      <span className="text-gray-600 text-sm">Fecha de Vencimiento:</span>
                      <p className="font-medium mt-1">
                        {formatDate(product.fechaVencimiento)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Precios */}
          <TabsContent value="precios" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Estructura de Precios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Costo y Margen */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Precio de Compra</p>
                        <p className="text-lg font-semibold text-red-600">
                          {formatPrice(product.precioCompra)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Margen de Ganancia</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {product.porcentajeGanancia.toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Precio Principal</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatPrice(product.precio1)}
                        </p>
                      </div>
                    </div>

                    {/* Precios de Venta */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Precios de Venta</h4>
                      <div className="grid gap-2">
                        {[
                          { label: product.etiquetaPrecio1, precio: product.precio1, primary: true },
                          { label: product.etiquetaPrecio2, precio: product.precio2 },
                          { label: product.etiquetaPrecio3, precio: product.precio3 },
                          { label: product.etiquetaPrecio4, precio: product.precio4 },
                          { label: product.etiquetaPrecio5, precio: product.precio5 },
                        ].map((precio, index) => (
                          precio.precio > 0 && (
                            <div 
                              key={index}
                              className={`flex justify-between items-center p-3 rounded-lg border ${
                                precio.primary ? 'bg-green-50 border-green-200' : 'bg-white'
                              }`}
                            >
                              <span className="font-medium">{precio.label}</span>
                              <span className={`font-semibold ${
                                precio.primary ? 'text-green-700' : 'text-gray-700'
                              }`}>
                                {formatPrice(precio.precio)}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inventario */}
          <TabsContent value="inventario" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Control de Stock
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Stock actual con indicador visual */}
                    <div className={`p-4 rounded-lg ${stockStatus.bgColor}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-80">Stock Actual</p>
                          <p className="text-2xl font-bold">
                            {product.stock} {product.unidadMedida}
                          </p>
                        </div>
                        <stockStatus.icon className="w-8 h-8 opacity-80" />
                      </div>
                    </div>

                    {/* Niveles de stock */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Stock Mínimo</p>
                        <p className="text-lg font-semibold">
                          {product.stockMinimo} {product.unidadMedida}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Stock Máximo</p>
                        <p className="text-lg font-semibold">
                          {product.stockMaximo} {product.unidadMedida}
                        </p>
                      </div>
                    </div>

                    {/* Barra de progreso de stock */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Nivel de Stock</span>
                        <span>{((product.stock / product.stockMaximo) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            product.stock === 0 ? 'bg-red-500' :
                            product.stock <= product.stockMinimo ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min((product.stock / product.stockMaximo) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Calendar className="w-5 h-5 mr-2" />
                    Información de Proveedor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-3 text-sm">
                    {product.proveedorPrincipal && (
                      <div>
                        <span className="text-gray-600">Proveedor Principal:</span>
                        <p className="font-medium">{product.proveedorPrincipal}</p>
                      </div>
                    )}

                    {product.tiempoEntrega > 0 && (
                      <div>
                        <span className="text-gray-600">Tiempo de Entrega:</span>
                        <p className="font-medium">{product.tiempoEntrega} días</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Creado:</span>
                        <p className="font-medium">{formatDate(product.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Actualizado:</span>
                        <p className="font-medium">{formatDate(product.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ubicación */}
          <TabsContent value="ubicacion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <MapPin className="w-5 h-5 mr-2" />
                  Ubicación en Almacén
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(product.pasillo || product.estante || product.nivel) ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Pasillo</p>
                        <p className="text-xl font-bold text-blue-600">
                          {product.pasillo || 'N/A'}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Estante</p>
                        <p className="text-xl font-bold text-green-600">
                          {product.estante || 'N/A'}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Nivel</p>
                        <p className="text-xl font-bold text-purple-600">
                          {product.nivel || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No se ha especificado ubicación en almacén</p>
                    </div>
                  )}

                  {/* Información adicional de ubicación */}
                  {(product.fechaVencimiento || product.lote) && (
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      {product.fechaVencimiento && (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-gray-600">Fecha de Vencimiento</p>
                          <p className="font-semibold text-yellow-700">
                            {formatDate(product.fechaVencimiento)}
                          </p>
                        </div>
                      )}

                      {product.lote && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Lote</p>
                          <p className="font-semibold text-gray-700">{product.lote}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
