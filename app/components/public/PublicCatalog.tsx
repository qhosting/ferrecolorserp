'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, MessageSquare, Package, Tag, Filter, CheckCircle2, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  marca: string | null;
  precio1: number;
  stock: number;
  unidadMedida: string;
}

interface PublicCatalogProps {
  initialProducts: Product[];
}

// Helper to generate a colorful gradient based on a string (like product name)
function getProductGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % 5;
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-emerald-400 to-teal-600',
    'from-rose-500 to-orange-600',
    'from-purple-500 to-indigo-700',
    'from-cyan-400 to-blue-600',
  ];
  return gradients[colorIndex];
}

export default function PublicCatalog({ initialProducts }: PublicCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Extract categories dynamically
  const categories = useMemo(() => {
    const cats = new Set<string>();
    initialProducts.forEach((p) => {
      if (p.categoria) cats.add(p.categoria.trim());
    });
    return Array.from(cats);
  }, [initialProducts]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      const matchesSearch =
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.marca && product.marca.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        !selectedCategory || (product.categoria && product.categoria.trim() === selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [initialProducts, searchTerm, selectedCategory]);

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/40 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pinturas, brochas, herramientas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-background/50 border-slate-200/80 dark:border-slate-800 focus-visible:ring-indigo-500 rounded-xl"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end items-center">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="rounded-full h-8 px-4 text-xs font-semibold"
          >
            Todos
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="rounded-full h-8 px-4 text-xs font-semibold"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white/20 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-bold text-foreground">No encontramos productos</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Prueba ajustando tu búsqueda o seleccionando otra categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const gradientClass = getProductGradient(product.nombre);
            const isAvailable = product.stock > 0;
            const encodedMsg = encodeURIComponent(
              `Hola FerreColors, me interesa solicitar una cotización para el producto:\n\n- Código: ${product.codigo}\n- Producto: ${product.nombre}\n- Categoría: ${product.categoria || 'General'}\n\nQuedo al pendiente.`
            );
            // In a real application, you'd direct this to a business number.
            const whatsappLink = `https://wa.me/521234567890?text=${encodedMsg}`;

            return (
              <Card 
                key={product.id} 
                className="hover-glow glass-card border-none shadow-sm rounded-2xl overflow-hidden flex flex-col group"
              >
                {/* Product Image Fallback (Colorful Paint Box Gradient) */}
                <div className={`h-40 bg-gradient-to-tr ${gradientClass} flex flex-col items-center justify-center p-4 text-white relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                  <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {product.marca || 'FerreColors'}
                  </div>
                  <Package className="h-10 w-10 opacity-80 group-hover:scale-110 transition-transform duration-300 mb-2" />
                  <span className="text-xs font-mono font-medium opacity-90">{product.codigo}</span>
                </div>

                {/* Content */}
                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    {product.categoria && (
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                        {product.categoria}
                      </span>
                    )}
                    <h3 className="font-bold text-foreground text-sm line-clamp-2 min-h-[40px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {product.nombre}
                    </h3>
                    
                    {/* Stock status indicator */}
                    <div className="flex items-center gap-1 text-[11px] font-semibold">
                      {isAvailable ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> En Existencia
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> Bajo Pedido
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Price */}
                    <div className="flex items-baseline justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                      <span className="text-xs text-muted-foreground font-medium">Precio General</span>
                      <span className="text-lg font-black text-foreground">
                        ${product.precio1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs font-medium text-muted-foreground ml-0.5 uppercase">/{product.unidadMedida}</span>
                      </span>
                    </div>

                    {/* WhatsApp Action Button */}
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block w-full">
                      <Button 
                        variant="outline" 
                        className="w-full justify-center gap-2 h-10 text-xs font-bold border-indigo-500/20 hover:border-indigo-500 hover:bg-indigo-500/5 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Cotizar WhatsApp
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
