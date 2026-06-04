
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/navigation/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
  rfc?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  estado?: string;
  activo: boolean;
  saldoActual: number;
  diasCredito?: number;
  limiteCredito?: number;
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [saldoFiltro, setSaldoFiltro] = useState('todos');

  const fetchProveedores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estadoFiltro !== 'todos') params.set('activo', estadoFiltro === 'activos' ? 'true' : 'false');
      const res = await fetch(`/api/compras/proveedores?${params}`);
      if (!res.ok) throw new Error('Error al cargar proveedores');
      const data = await res.json();
      setProveedores(data.proveedores ?? []);
    } catch {
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro]);

  const proveedoresFiltrados = proveedores.filter((p) => {
    const matchSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (p.rfc?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (p.ciudad?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchSaldo =
      saldoFiltro === 'todos'
        ? true
        : saldoFiltro === 'con_saldo'
        ? p.saldoActual > 0
        : p.saldoActual === 0;
    return matchSearch && matchSaldo;
  });

  const totalActivos = proveedores.filter((p) => p.activo).length;
  const totalConSaldo = proveedores.filter((p) => p.saldoActual > 0).length;
  const saldoTotal = proveedores.reduce((acc, p) => acc + (p.saldoActual ?? 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Proveedores" description="Catálogo de proveedores y cuentas por pagar asociadas" />

      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Building2 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Proveedores</h1>
              <p className="text-sm text-muted-foreground">Catálogo de proveedores y créditos vigentes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProveedores}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-500/20">
              <Plus className="h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-t-2 border-t-cyan-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Total</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{proveedores.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Building2 className="h-5 w-5 text-cyan-500" />
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

          <Card className="border-t-2 border-t-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Con Saldo</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalConSaldo}</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-rose-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Saldo Total</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    ${saldoTotal.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10">
                  <DollarSign className="h-5 w-5 text-rose-500" />
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
                  placeholder="Buscar por nombre, código, RFC o ciudad..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
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
              <Select value={saldoFiltro} onValueChange={setSaldoFiltro}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Saldo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los saldos</SelectItem>
                  <SelectItem value="con_saldo">Con saldo pendiente</SelectItem>
                  <SelectItem value="sin_saldo">Sin saldo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Proveedores Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-sm">Cargando proveedores...</span>
              </div>
            ) : proveedoresFiltrados.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Sin proveedores</p>
                <p className="text-sm mt-1">Agrega tu primer proveedor para comenzar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Código / Proveedor</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">RFC</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Contacto</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Ciudad</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Saldo Pendiente</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Estado</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedoresFiltrados.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-mono text-[11px] text-muted-foreground">{p.codigo}</p>
                            <p className="font-semibold text-foreground">{p.nombre}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">{p.rfc ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {p.telefono && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" /> {p.telefono}
                              </div>
                            )}
                            {p.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" /> {p.email}
                              </div>
                            )}
                            {!p.telefono && !p.email && <span className="text-xs text-muted-foreground/50">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {p.ciudad ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {p.ciudad}{p.estado ? `, ${p.estado}` : ''}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold text-sm ${p.saldoActual > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            ${p.saldoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            className={`text-[10px] ${p.activo
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {p.activo ? 'Activo' : 'Inactivo'}
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
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-cyan-600">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-xs text-muted-foreground py-2 border-t">
          <span>
            Mostrando <strong>{proveedoresFiltrados.length}</strong> de <strong>{proveedores.length}</strong> proveedores
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            Saldos sincronizados desde Cuentas por Pagar
          </span>
        </div>
      </div>
    </div>
  );
}
