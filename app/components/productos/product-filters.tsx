
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  X, 
  Search,
  Package,
  DollarSign,
  BarChart3,
  Star,
  AlertTriangle
} from 'lucide-react';

interface ProductFiltersProps {
  filters: {
    search: string;
    categoria: string;
    marca: string;
    stockStatus: string;
    priceRange: { min: number; max: number };
    destacado: boolean;
    oferta: boolean;
    activos: boolean;
  };
  categorias: string[];
  marcas: string[];
  onFiltersChange: (filters: any) => void;
  onReset: () => void;
}

export function ProductFilters({
  filters,
  categorias,
  marcas,
  onFiltersChange,
  onReset,
}: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const updatePriceRange = (key: 'min' | 'max', value: number) => {
    onFiltersChange({
      ...filters,
      priceRange: {
        ...filters.priceRange,
        [key]: value,
      },
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categoria && filters.categoria !== 'all') count++;
    if (filters.marca && filters.marca !== 'all') count++;
    if (filters.stockStatus && filters.stockStatus !== 'all') count++;
    if (filters.priceRange.min > 0 || filters.priceRange.max > 0) count++;
    if (filters.destacado) count++;
    if (filters.oferta) count++;
    if (!filters.activos) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros de Productos
          </SheetTitle>
          <SheetDescription>
            Filtra y busca productos según tus criterios
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Búsqueda */}
          <div className="space-y-2">
            <Label className="flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Búsqueda
            </Label>
            <Input
              placeholder="Buscar por código, nombre, descripción..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label className="flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Categoría
            </Label>
            <Select 
              value={filters.categoria} 
              onValueChange={(value) => updateFilter('categoria', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
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
          </div>

          {/* Marca */}
          <div className="space-y-2">
            <Label>Marca</Label>
            <Select 
              value={filters.marca} 
              onValueChange={(value) => updateFilter('marca', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar marca" />
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
          </div>

          {/* Estado de Stock */}
          <div className="space-y-2">
            <Label className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Estado de Stock
            </Label>
            <Select 
              value={filters.stockStatus} 
              onValueChange={(value) => updateFilter('stockStatus', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado de stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="available">En stock</SelectItem>
                <SelectItem value="low">Stock bajo</SelectItem>
                <SelectItem value="out">Sin stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rango de Precios */}
          <div className="space-y-2">
            <Label className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Rango de Precios
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-500">Mínimo</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={filters.priceRange.min || ''}
                  onChange={(e) => updatePriceRange('min', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Máximo</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={filters.priceRange.max || ''}
                  onChange={(e) => updatePriceRange('max', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="space-y-3">
            <Label>Características Especiales</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="destacado"
                  checked={filters.destacado}
                  onCheckedChange={(checked) => updateFilter('destacado', checked)}
                />
                <Label htmlFor="destacado" className="text-sm flex items-center">
                  <Star className="w-4 h-4 mr-1 text-yellow-500" />
                  Productos destacados
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="oferta"
                  checked={filters.oferta}
                  onCheckedChange={(checked) => updateFilter('oferta', checked)}
                />
                <Label htmlFor="oferta" className="text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1 text-red-500" />
                  En oferta
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activos"
                  checked={filters.activos}
                  onCheckedChange={(checked) => updateFilter('activos', checked)}
                />
                <Label htmlFor="activos" className="text-sm">
                  Solo productos activos
                </Label>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2 pt-4 border-t">
            <Button 
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Aplicar Filtros
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                onReset();
                setIsOpen(false);
              }}
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div>

          {/* Resumen de filtros activos */}
          {activeFiltersCount > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Filtros Activos:</Label>
              <div className="flex flex-wrap gap-1">
                {filters.search && (
                  <Badge variant="secondary" className="text-xs">
                    Búsqueda: {filters.search.substring(0, 10)}...
                  </Badge>
                )}
                {filters.categoria && filters.categoria !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.categoria}
                  </Badge>
                )}
                {filters.marca && filters.marca !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.marca}
                  </Badge>
                )}
                {filters.destacado && (
                  <Badge variant="secondary" className="text-xs">
                    Destacados
                  </Badge>
                )}
                {filters.oferta && (
                  <Badge variant="secondary" className="text-xs">
                    En Oferta
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
