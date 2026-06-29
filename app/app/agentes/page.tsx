
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/navigation/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UserCheck,
  Plus,
  Search,
  Edit3,
  Eye,
  CheckCircle,
  RefreshCw,
  ShoppingCart,
  Coins,
  Link2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Agente {
  id: string;
  contpaqiId: number;
  codigo: string;
  nombre: string;
  tipo: number; // 1=Vendedor, 2=Cobrador
  isActive: boolean;
  syncAt: string;
  user?: { name?: string; email?: string } | null;
}

const TIPO_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Vendedor', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  2: { label: 'Cobrador', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
};

const emptyAgente = { codigo: '', nombre: '', tipo: '1', userId: '' };

export default function AgentesPage() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');

  const [dialogMode, setDialogMode] = useState<'crear' | 'editar' | 'ver' | null>(null);
  const [form, setForm] = useState({ ...emptyAgente });
  const [editId, setEditId] = useState<string | null>(null);
  const [verAgente, setVerAgente] = useState<Agente | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchAgentes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agentes');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAgentes(data.agentes ?? []);
    } catch {
      setAgentes([]);
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogMode(null);
    setForm({ ...emptyAgente });
    setEditId(null);
    setVerAgente(null);
  };

  const openCrear = () => { setForm({ ...emptyAgente }); setEditId(null); setDialogMode('crear'); };

  const openEditar = (a: Agente) => {
    setForm({ codigo: a.codigo, nombre: a.nombre, tipo: String(a.tipo), userId: '' });
    setEditId(a.id);
    setDialogMode('editar');
  };

  const submitAgente = async () => {
    if (!form.codigo || !form.nombre) {
      toast({ title: 'Datos incompletos', description: 'Código y nombre son obligatorios', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const url = editId ? `/api/agentes/${editId}` : '/api/agentes';
      const method = editId ? 'PUT' : 'POST';
      const payload: any = editId
        ? { nombre: form.nombre, tipo: form.tipo }
        : { codigo: form.codigo, nombre: form.nombre, tipo: form.tipo };
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el agente');
      toast({ title: editId ? 'Agente actualizado' : 'Agente creado', description: data.agente?.nombre });
      closeDialog();
      fetchAgentes();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const syncAgentes = async () => {
    setSyncing(true);
    try {
      await fetch('/api/contpaqi/sync/agentes', { method: 'POST' });
      await fetchAgentes();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchAgentes();
  }, []);

  const agentesFiltrados = agentes.filter((a) => {
    const matchSearch =
      a.nombre.toLowerCase().includes(search.toLowerCase()) ||
      a.codigo.toLowerCase().includes(search.toLowerCase());
    const matchTipo =
      tipoFiltro === 'todos' ? true : a.tipo === parseInt(tipoFiltro);
    const matchEstado =
      estadoFiltro === 'todos'
        ? true
        : estadoFiltro === 'activos'
        ? a.isActive
        : !a.isActive;
    return matchSearch && matchTipo && matchEstado;
  });

  const totalVendedores = agentes.filter((a) => a.tipo === 1).length;
  const totalCobradores = agentes.filter((a) => a.tipo === 2).length;
  const totalActivos = agentes.filter((a) => a.isActive).length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Agentes" description="Vendedores y cobradores sincronizados desde CONTPAQi" />

      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <UserCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agentes</h1>
              <p className="text-sm text-muted-foreground">
                Vendedores y cobradores importados desde CONTPAQi Comercial Premium
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={syncAgentes}
              disabled={syncing || loading}
              className="gap-2"
            >
              <Link2 className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sync CONTPAQi'}
            </Button>
            <Button onClick={openCrear} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20">
              <Plus className="h-4 w-4" />
              Nuevo Agente
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-t-2 border-t-indigo-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Total Agentes</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{agentes.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <UserCheck className="h-5 w-5 text-indigo-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Vendedores</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalVendedores}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ShoppingCart className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Cobradores</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalCobradores}</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Coins className="h-5 w-5 text-purple-500" />
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
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="1">Vendedores</SelectItem>
                  <SelectItem value="2">Cobradores</SelectItem>
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

        {/* Agents Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-sm">Cargando agentes desde CONTPAQi...</span>
              </div>
            ) : agentesFiltrados.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Sin agentes</p>
                <p className="text-sm mt-1">
                  Usa el botón <strong>Sync CONTPAQi</strong> para importar agentes desde la API.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Código / Nombre</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Usuario ERP</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Sincronización</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Última Sync</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Estado</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentesFiltrados.map((a) => {
                      const tipoInfo = TIPO_LABEL[a.tipo] ?? { label: 'Desconocido', color: 'bg-slate-500/15 text-slate-500' };
                      return (
                        <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-mono text-[11px] text-muted-foreground">{a.codigo}</p>
                              <p className="font-semibold text-foreground">{a.nombre}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`text-[10px] ${tipoInfo.color}`}>
                              {tipoInfo.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {a.user ? (
                              <div>
                                <p className="text-sm text-foreground">{a.user.name ?? '—'}</p>
                                <p className="text-xs text-muted-foreground">{a.user.email}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">Sin usuario asignado</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px] py-0.5 px-2">
                                ERP
                              </Badge>
                              {a.contpaqiId >= 0 ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0.5 px-2 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                                  CONTPAQi
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] py-0.5 px-2">
                                  Solo Local
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">
                              {new Date(a.syncAt).toLocaleDateString('es-MX', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              className={`text-[10px] ${a.isActive
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {a.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              <Button variant="ghost" size="sm" title="Ver" onClick={() => { setVerAgente(a); setDialogMode('ver'); }} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Editar" onClick={() => openEditar(a)} className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600">
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-xs text-muted-foreground py-2 border-t">
          <span>
            Mostrando <strong>{agentesFiltrados.length}</strong> de <strong>{agentes.length}</strong> agentes
          </span>
          <span className="flex items-center gap-1.5">
            <Link2 className="h-3 w-3 text-indigo-400" />
            Datos sincronizados desde CONTPAQi Comercial Premium
          </span>
        </div>
      </div>

      {/* Dialog Crear/Editar */}
      <Dialog open={dialogMode === 'crear' || dialogMode === 'editar'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'editar' ? 'Editar Agente' : 'Nuevo Agente'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'editar'
                ? 'Modifica el nombre o tipo del agente.'
                : 'Crea un agente manual. Los agentes de CONTPAQi se importan con el botón Sync.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input id="codigo" placeholder="AG001" value={form.codigo} disabled={dialogMode === 'editar'}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Vendedor</SelectItem>
                    <SelectItem value="2">Cobrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" placeholder="Nombre del agente" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={submitAgente} disabled={submitting}>
              {submitting ? 'Guardando...' : (dialogMode === 'editar' ? 'Guardar Cambios' : 'Crear Agente')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver */}
      <Dialog open={dialogMode === 'ver'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{verAgente?.nombre}</DialogTitle>
            <DialogDescription>{verAgente?.codigo}</DialogDescription>
          </DialogHeader>
           {verAgente && (
            <div className="grid gap-2 py-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{TIPO_LABEL[verAgente.tipo]?.label ?? 'Desconocido'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Usuario ERP</span><span>{verAgente.user?.email ?? 'Sin asignar'}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sincronización</span>
                <span>
                  {verAgente.contpaqiId >= 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Sincronizado con CONTPAQi (ID: {verAgente.contpaqiId})</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Solo Local (Sin CONTPAQi)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><span>{verAgente.isActive ? 'Activo' : 'Inactivo'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Última sync</span><span>{new Date(verAgente.syncAt).toLocaleString('es-MX')}</span></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cerrar</Button>
            {verAgente && <Button onClick={() => openEditar(verAgente)}>Editar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
