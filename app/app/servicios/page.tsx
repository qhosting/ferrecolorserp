
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  Star,
  Clock,
  DollarSign,
  Tag,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Servicio {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precio: number;
  unidad: string;
  activo: boolean;
  claveSat?: string;
  claveUnidadSat?: string;
}

const CATEGORIAS = ['Todos', 'Instalación', 'Aplicación', 'Asesoría', 'Mantenimiento', 'Transporte', 'Otro'];
const UNIDADES = ['Servicio', 'Hora', 'Visita', 'Metro cuadrado', 'Litro aplicado'];

const SERVICIOS_DEMO: Servicio[] = [
  {
    id: '1',
    codigo: 'SRV-001',
    nombre: 'Igualación Computarizada de Color',
    descripcion: 'Servicio premium de igualación de color mediante espectrofotómetro digital para coincidir exactamente con cualquier muestra o código.',
    categoria: 'Asesoría',
    precio: 250.00,
    unidad: 'Servicio',
    activo: true,
    claveSat: '81111500',
    claveUnidadSat: 'E48',
  },
  {
    id: '2',
    codigo: 'SRV-002',
    nombre: 'Aplicación de Pintura en Obra',
    descripcion: 'Aplicación profesional de pinturas y recubrimientos en paredes, techos y fachadas.',
    categoria: 'Aplicación',
    precio: 180.00,
    unidad: 'Metro cuadrado',
    activo: true,
    claveSat: '72154200',
    claveUnidadSat: 'MTK',
  },
  {
    id: '3',
    codigo: 'SRV-003',
    nombre: 'Flete a Pie de Obra',
    descripcion: 'Entrega y descarga de materiales directamente en el punto de trabajo del cliente.',
    categoria: 'Transporte',
    precio: 350.00,
    unidad: 'Visita',
    activo: true,
    claveSat: '78101601',
    claveUnidadSat: 'E48',
  },
  {
    id: '4',
    codigo: 'SRV-004',
    nombre: 'Asesoría en Acabados Especiales',
    descripcion: 'Consultoría especializada para selección de texturas, acabados decorativos y técnicas de aplicación avanzadas.',
    categoria: 'Asesoría',
    precio: 500.00,
    unidad: 'Hora',
    activo: true,
    claveSat: '81111500',
    claveUnidadSat: 'HUR',
  },
  {
    id: '5',
    codigo: 'SRV-005',
    nombre: 'Mantenimiento Preventivo de Fachada',
    descripcion: 'Inspección, limpieza y aplicación de selladores para conservar el estado óptimo de fachadas.',
    categoria: 'Mantenimiento',
    precio: 800.00,
    unidad: 'Servicio',
    activo: false,
    claveSat: '72154200',
    claveUnidadSat: 'E48',
  },
];

export default function ServiciosPage() {
  const { data: session } = useSession();
  const [servicios, setServicios] = useState<Servicio[]>(SERVICIOS_DEMO);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');

  const serviciosFiltrados = servicios.filter((s) => {
    const matchSearch =
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (s.descripcion?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchCategoria = categoriaFiltro === 'Todos' || s.categoria === categoriaFiltro;
    const matchEstado =
      estadoFiltro === 'todos'
        ? true
        : estadoFiltro === 'activos'
        ? s.activo
        : !s.activo;
    return matchSearch && matchCategoria && matchEstado;
  });

  const totalActivos = servicios.filter((s) => s.activo).length;
  const totalInactivos = servicios.filter((s) => !s.activo).length;
  const precioPromedio = servicios.length
    ? servicios.reduce((acc, s) => acc + s.precio, 0) / servicios.length
    : 0;

  const categoriaIconColor: Record<string, string> = {
    Instalación: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    Aplicación: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    Asesoría: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    Mantenimiento: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Transporte: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    Otro: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Catálogo de Servicios" description="Servicios registrados para cotización y facturación" />

      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Catálogo de Servicios</h1>
                <p className="text-sm text-muted-foreground">
                  Servicios registrados y disponibles para cotización y facturación
                </p>
              </div>
            </div>
          </div>
          <Button className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20">
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-t-2 border-t-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Total Servicios</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{servicios.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Briefcase className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Activos</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalActivos}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-rose-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Inactivos</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalInactivos}</p>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10">
                  <XCircle className="h-5 w-5 text-rose-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Precio Promedio</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    ${precioPromedio.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, código o descripción..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {serviciosFiltrados.length === 0 ? (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Sin resultados</p>
              <p className="text-sm mt-1">Ajusta los filtros o agrega un nuevo servicio.</p>
            </div>
          ) : (
            serviciosFiltrados.map((servicio) => (
              <Card
                key={servicio.id}
                className={`relative group transition-all duration-200 hover:shadow-md border ${
                  !servicio.activo ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${categoriaIconColor[servicio.categoria] ?? 'bg-slate-500/10 text-slate-500'}`}>
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-muted-foreground mb-0.5">{servicio.codigo}</p>
                        <h3 className="font-semibold text-foreground text-sm leading-snug truncate">{servicio.nombre}</h3>
                      </div>
                    </div>
                    <Badge
                      variant={servicio.activo ? 'default' : 'secondary'}
                      className={`text-[10px] shrink-0 ml-2 ${
                        servicio.activo
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {servicio.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {/* Description */}
                  {servicio.descripcion && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                      {servicio.descripcion}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                      <Tag className="h-3 w-3" />
                      {servicio.categoria}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                      <Clock className="h-3 w-3" />
                      {servicio.unidad}
                    </span>
                    {servicio.claveSat && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md font-mono">
                        SAT: {servicio.claveSat}
                      </span>
                    )}
                  </div>

                  {/* Price & actions */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Precio base</p>
                      <p className="text-lg font-bold text-foreground">
                        ${servicio.precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs font-normal text-muted-foreground ml-1">/ {servicio.unidad.toLowerCase()}</span>
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-between text-xs text-muted-foreground py-2 border-t">
          <span>
            Mostrando <strong>{serviciosFiltrados.length}</strong> de <strong>{servicios.length}</strong> servicios
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-3 w-3 text-amber-400" />
            Servicios SAT compatibles con CFDI 4.0
          </span>
        </div>
      </div>
    </div>
  );
}
