
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/navigation/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  UserCheck,
  Plus,
  Search,
  Edit3,
  Eye,
  CheckCircle,
  XCircle,
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

export default function AgentesPage() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');

  const fetchAgentes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contpaqi/sync/agentes');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAgentes(data.agentes ?? []);
    } catch {
      setAgentes([]);
    } finally {
      setLoading(false);
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
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20">
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
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600">
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
    </div>
  );
}
