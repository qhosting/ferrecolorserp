
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Briefcase,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  DollarSign,
  Tag,
  Clock,
  Star,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Servicio {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  categoria: CategoriaServicio;
  precio: number;
  unidad: string;
  isActive: boolean;
  claveSat?: string | null;
  claveUnidadSat?: string | null;
}

type CategoriaServicio =
  | 'INSTALACION'
  | 'APLICACION'
  | 'ASESORIA'
  | 'MANTENIMIENTO'
  | 'TRANSPORTE'
  | 'OTRO';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS: { value: CategoriaServicio | 'Todos'; label: string }[] = [
  { value: 'Todos', label: 'Todos' },
  { value: 'INSTALACION', label: 'Instalación' },
  { value: 'APLICACION', label: 'Aplicación' },
  { value: 'ASESORIA', label: 'Asesoría' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'OTRO', label: 'Otro' },
];

const CATEGORIA_LABEL: Record<CategoriaServicio, string> = {
  INSTALACION: 'Instalación',
  APLICACION: 'Aplicación',
  ASESORIA: 'Asesoría',
  MANTENIMIENTO: 'Mantenimiento',
  TRANSPORTE: 'Transporte',
  OTRO: 'Otro',
};

const CATEGORIA_COLOR: Record<CategoriaServicio, string> = {
  INSTALACION: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  APLICACION: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  ASESORIA: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  MANTENIMIENTO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  TRANSPORTE: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  OTRO: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

const UNIDADES = ['Servicio', 'Hora', 'Visita', 'Metro cuadrado', 'Litro aplicado', 'Día', 'Otro'];

const EMPTY_FORM: Omit<Servicio, 'id'> = {
  codigo: '',
  nombre: '',
  descripcion: '',
  categoria: 'OTRO',
  precio: 0,
  unidad: 'Servicio',
  isActive: true,
  claveSat: '',
  claveUnidadSat: '',
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ServiciosPage() {
  const { data: session } = useSession();
  const canDelete = ['SUPERADMIN', 'ADMIN'].includes((session?.user as any)?.role ?? '');

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todos');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');

  // Modales
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Servicio | null>(null);
  const [form, setForm] = useState<Omit<Servicio, 'id'>>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Servicio | null>(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchServicios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoriaFiltro !== 'Todos') params.set('categoria', categoriaFiltro);
      if (estadoFiltro !== 'todos') params.set('activo', estadoFiltro === 'activos' ? 'true' : 'false');

      const res = await fetch(`/api/servicios?${params}`);
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setServicios(data.servicios ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
    }
  }, [search, categoriaFiltro, estadoFiltro]);

  useEffect(() => { fetchServicios(); }, [fetchServicios]);

  // ─── Guardar (crear o editar) ─────────────────────────────────────────────

  const openCreate = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (s: Servicio) => {
    setEditando(s);
    setForm({
      codigo: s.codigo,
      nombre: s.nombre,
      descripcion: s.descripcion ?? '',
      categoria: s.categoria,
      precio: s.precio,
      unidad: s.unidad,
      isActive: s.isActive,
      claveSat: s.claveSat ?? '',
      claveUnidadSat: s.claveUnidadSat ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.codigo || !form.nombre || form.precio < 0) {
      toast.error('Completa los campos obligatorios (código, nombre y precio)');
      return;
    }
    setSaving(true);
    try {
      const url = editando ? `/api/servicios/${editando.id}` : '/api/servicios';
      const method = editando ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          precio: Number(form.precio),
          claveSat: form.claveSat || undefined,
          claveUnidadSat: form.claveUnidadSat || undefined,
          descripcion: form.descripcion || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');

      toast.success(editando ? 'Servicio actualizado' : 'Servicio creado');
      setDialogOpen(false);
      fetchServicios();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Eliminar ─────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/servicios/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Error al eliminar');
      }
      toast.success('Servicio eliminado');
      setDeleteTarget(null);
      fetchServicios();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ─── Stats ────────────────────────────────────────────────────────────────

  const totalActivos = servicios.filter((s) => s.isActive).length;
  const totalInactivos = servicios.filter((s) => !s.isActive).length;
  const precioPromedio = servicios.length
    ? servicios.reduce((acc, s) => acc + s.precio, 0) / servicios.length
    : 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Catálogo de Servicios" description="Servicios registrados para cotización y facturación" />

      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Catálogo de Servicios</h1>
              <p className="text-sm text-muted-foreground">
                {total} servicio{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''} · compatibles con CFDI 4.0
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchServicios} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              id="btn-nuevo-servicio"
              onClick={openCreate}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20"
            >
              <Plus className="h-4 w-4" />
              Nuevo Servicio
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Servicios', value: servicios.length, icon: Briefcase, color: 'purple' },
            { label: 'Activos', value: totalActivos, icon: CheckCircle, color: 'emerald' },
            { label: 'Inactivos', value: totalInactivos, icon: XCircle, color: 'rose' },
            { label: 'Precio Promedio', value: `$${precioPromedio.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'amber' },
          ].map((stat) => (
            <Card key={stat.label} className={`border-t-2 border-t-${stat.color}-500`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-${stat.color}-500/10`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}-500`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="input-buscar-servicio"
                  placeholder="Buscar por nombre, código o descripción..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger className="w-full sm:w-44" id="select-categoria-filtro">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger className="w-full sm:w-36" id="select-estado-filtro">
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
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Cargando servicios...</span>
          </div>
        ) : servicios.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Sin resultados</p>
            <p className="text-sm mt-1">Ajusta los filtros o agrega un nuevo servicio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {servicios.map((servicio) => (
              <Card
                key={servicio.id}
                className={`relative group transition-all duration-200 hover:shadow-md border ${!servicio.isActive ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${CATEGORIA_COLOR[servicio.categoria]}`}>
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-muted-foreground mb-0.5">{servicio.codigo}</p>
                        <h3 className="font-semibold text-foreground text-sm leading-snug">{servicio.nombre}</h3>
                      </div>
                    </div>
                    <Badge
                      className={`text-[10px] shrink-0 ml-2 ${
                        servicio.isActive
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {servicio.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {/* Description */}
                  {servicio.descripcion && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                      {servicio.descripcion}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                      <Tag className="h-3 w-3" />
                      {CATEGORIA_LABEL[servicio.categoria]}
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

                  {/* Price + Actions */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Precio base</p>
                      <p className="text-lg font-bold text-foreground">
                        ${servicio.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        <span className="text-xs font-normal text-muted-foreground ml-1">/ {servicio.unidad.toLowerCase()}</span>
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Button
                        id={`btn-editar-${servicio.id}`}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600"
                        onClick={() => openEdit(servicio)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          id={`btn-eliminar-${servicio.id}`}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                          onClick={() => setDeleteTarget(servicio)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground py-2 border-t">
          <span>
            Mostrando <strong>{servicios.length}</strong> de <strong>{total}</strong> servicios
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-3 w-3 text-amber-400" />
            Servicios SAT compatibles con CFDI 4.0
          </span>
        </div>
      </div>

      {/* ─── Modal Crear / Editar ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-codigo">Código *</Label>
                <Input
                  id="form-codigo"
                  placeholder="SRV-001"
                  value={form.codigo}
                  disabled={!!editando}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-categoria">Categoría</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as CategoriaServicio })}>
                  <SelectTrigger id="form-categoria">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.filter((c) => c.value !== 'Todos').map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-nombre">Nombre *</Label>
              <Input
                id="form-nombre"
                placeholder="Nombre del servicio"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-descripcion">Descripción</Label>
              <Textarea
                id="form-descripcion"
                placeholder="Descripción del servicio (opcional)"
                value={form.descripcion ?? ''}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-precio">Precio Base *</Label>
                <Input
                  id="form-precio"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-unidad">Unidad</Label>
                <Select value={form.unidad} onValueChange={(v) => setForm({ ...form, unidad: v })}>
                  <SelectTrigger id="form-unidad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-clave-sat">Clave SAT</Label>
                <Input
                  id="form-clave-sat"
                  placeholder="81111500"
                  value={form.claveSat ?? ''}
                  onChange={(e) => setForm({ ...form, claveSat: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-unidad-sat">Unidad SAT</Label>
                <Input
                  id="form-unidad-sat"
                  placeholder="E48, HUR, MTK..."
                  value={form.claveUnidadSat ?? ''}
                  onChange={(e) => setForm({ ...form, claveUnidadSat: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="form-activo"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="form-activo" className="cursor-pointer">
                {form.isActive ? 'Activo' : 'Inactivo'}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              id="btn-guardar-servicio"
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editando ? 'Guardar Cambios' : 'Crear Servicio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AlertDialog Eliminar ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente <strong>{deleteTarget?.nombre}</strong> ({deleteTarget?.codigo}).
              No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              id="btn-confirmar-eliminar"
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
