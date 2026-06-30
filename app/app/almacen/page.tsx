'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Package, Search, ArrowUpRight, ArrowDownLeft, Plus, MapPin, History,
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Sliders,
  ChevronLeft, ChevronRight, Building2, ArrowLeftRight, Truck,
  Eye, Clock, CheckCheck, Ban, SendHorizonal
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RolePermissions } from '@/lib/types';

// ─────────────── INTERFACES ───────────────
interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
  esMatriz: boolean;
  isActive: boolean;
}

interface StockSucursalInfo {
  sucursalId: string;
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  sucursal: { nombre: string; codigo: string };
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria?: string;
  marca?: string;
  stock: number;          // Total or per-branch
  stockMinimo: number;
  stockMaximo: number;
  unidadMedida: string;
  pasillo?: string;
  estante?: string;
  nivel?: string;
  isActive: boolean;
  stockSucursalesFull?: StockSucursalInfo[];
}

interface Movimiento {
  id: string;
  productoId: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo: string;
  referencia?: string;
  fechaMovimiento: string;
  producto: { codigo: string; nombre: string; unidadMedida: string };
  sucursal?: { nombre: string; codigo: string };
}

interface DetalleTransferencia {
  id: string;
  productoId: string;
  cantidadSolicitada: number;
  cantidadEnviada: number;
  cantidadRecibida: number;
  producto: { codigo: string; nombre: string; unidadMedida: string };
}

interface Transferencia {
  id: string;
  folio: string;
  sucursalOrigenId: string;
  sucursalDestinoId: string;
  estatus: 'PENDIENTE' | 'EN_TRANSITO' | 'RECIBIDA' | 'CANCELADA';
  observaciones?: string;
  fechaSolicitud: string;
  fechaEnvio?: string;
  fechaRecepcion?: string;
  sucursalOrigen: { nombre: string; codigo: string };
  sucursalDestino: { nombre: string; codigo: string };
  detalles: DetalleTransferencia[];
}

// ─────────────── STATUS HELPERS ───────────────
const ESTATUS_CONFIG = {
  PENDIENTE:   { label: 'Pendiente',    icon: Clock,       cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  EN_TRANSITO: { label: 'En Tránsito',  icon: Truck,       cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  RECIBIDA:    { label: 'Recibida',     icon: CheckCheck,  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  CANCELADA:   { label: 'Cancelada',    icon: Ban,         cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
};

// ─────────────── MAIN COMPONENT ───────────────
export default function AlmacenPage() {
  const { data: session } = useSession() || {};

  // Sucursales
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>('all');

  // Inventory tab
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categorias, setCategorias] = useState<string[]>([]);

  // Kardex tab
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [movCurrentPage, setMovCurrentPage] = useState(1);
  const [movTotalPages, setMovTotalPages] = useState(1);

  // Transferencias tab
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loadingTrans, setLoadingTrans] = useState(false);

  // Modals
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedTransferencia, setSelectedTransferencia] = useState<Transferencia | null>(null);
  const [processAction, setProcessAction] = useState<'enviar' | 'recibir' | 'cancelar'>('enviar');

  // Adjustment form
  const [selectedProd, setSelectedProd] = useState<Producto | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [adjType, setAdjType] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [adjQty, setAdjQty] = useState<number>(1);
  const [adjMotive, setAdjMotive] = useState<string>('');
  const [adjRef, setAdjRef] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Location form
  const [locPasillo, setLocPasillo] = useState('');
  const [locEstante, setLocEstante] = useState('');
  const [locNivel, setLocNivel] = useState('');

  // New Transfer form
  const [transOrigenId, setTransOrigenId] = useState('');
  const [transDestinoId, setTransDestinoId] = useState('');
  const [transObs, setTransObs] = useState('');
  const [transDetalles, setTransDetalles] = useState<{ productoId: string; nombre: string; codigo: string; unidad: string; cantidadSolicitada: number }[]>([]);
  const [transSearch, setTransSearch] = useState('');

  // Process Transfer quantities
  const [processQtys, setProcessQtys] = useState<Record<string, number>>({});

  const userRole = session?.user?.role;
  const permissions = userRole ? RolePermissions[userRole as keyof typeof RolePermissions] : {};
  const canUpdate = (permissions as any)?.almacen?.update;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  // ─── FETCH SUCURSALES ───
  useEffect(() => {
    fetch('/api/sucursales?active=true')
      .then(r => r.json())
      .then(d => {
        setSucursales(d.sucursales || []);
        const defaultSuc = (d.sucursales || []).find((s: Sucursal) => s.esMatriz);
        if (defaultSuc) setSelectedSucursalId(defaultSuc.id);
      })
      .catch(console.error);
    fetchCategorias();
  }, []);

  // ─── REFETCH on sucursal/page/search change ───
  useEffect(() => { fetchProductos(); }, [currentPage, searchTerm, selectedCategoria, selectedSucursalId]);
  useEffect(() => { fetchMovimientos(); }, [movCurrentPage, selectedSucursalId]);
  useEffect(() => { fetchTransferencias(); }, [selectedSucursalId]);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
        search: searchTerm,
        activos: 'true',
      });
      if (selectedCategoria !== 'all') params.append('categoria', selectedCategoria);
      if (selectedSucursalId !== 'all') params.append('sucursalId', selectedSucursalId);

      const res = await fetch(`/api/productos?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProductos(data.productos || []);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        toast.error('Error al obtener productos');
      }
    } catch { toast.error('Error al conectar con el servidor'); }
    finally { setLoading(false); }
  };

  const fetchCategorias = async () => {
    try {
      const res = await fetch('/api/productos/categorias');
      if (res.ok) {
        const data = await res.json();
        setCategorias(data.categorias || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchMovimientos = async () => {
    try {
      setLoadingMovs(true);
      const params = new URLSearchParams({ page: movCurrentPage.toString(), limit: '15' });
      if (selectedSucursalId !== 'all') params.append('sucursalId', selectedSucursalId);
      const res = await fetch(`/api/sistema/inventario?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data.movimientos || []);
        setMovTotalPages(data.pagination?.pages || 1);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingMovs(false); }
  };

  const fetchTransferencias = async () => {
    try {
      setLoadingTrans(true);
      const params = new URLSearchParams();
      if (selectedSucursalId !== 'all') params.append('sucursalId', selectedSucursalId);
      const res = await fetch(`/api/transferencias?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransferencias(data.transferencias || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingTrans(false); }
  };

  // ─── ADJUSTMENT SUBMIT ───
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return toast.error('Selecciona un producto');
    if (adjQty <= 0) return toast.error('La cantidad debe ser mayor a 0');
    if (!adjMotive) return toast.error('Proporciona un motivo');

    try {
      setSubmitting(true);
      const res = await fetch('/api/sistema/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: selectedProd.id,
          tipo: adjType,
          cantidad: adjQty,
          motivo: adjMotive,
          referencia: adjRef,
          sucursalId: selectedSucursalId !== 'all' ? selectedSucursalId : undefined,
        }),
      });
      if (res.ok) {
        toast.success('Movimiento registrado exitosamente');
        setShowAdjustmentModal(false);
        resetAdjForm();
        fetchProductos();
        fetchMovimientos();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al registrar movimiento');
      }
    } catch { toast.error('Error de red'); }
    finally { setSubmitting(false); }
  };

  // ─── LOCATION SUBMIT ───
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/productos/${selectedProd.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pasillo: locPasillo, estante: locEstante, nivel: locNivel }),
      });
      if (res.ok) {
        toast.success('Ubicación actualizada correctamente');
        setShowLocationModal(false);
        fetchProductos();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al actualizar ubicación');
      }
    } catch { toast.error('Error de red'); }
    finally { setSubmitting(false); }
  };

  // ─── TRANSFER SUBMIT ───
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transOrigenId || !transDestinoId) return toast.error('Selecciona sucursal origen y destino');
    if (transOrigenId === transDestinoId) return toast.error('Origen y destino deben ser diferentes');
    if (transDetalles.length === 0) return toast.error('Agrega al menos un producto');

    try {
      setSubmitting(true);
      const res = await fetch('/api/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sucursalOrigenId: transOrigenId,
          sucursalDestinoId: transDestinoId,
          observaciones: transObs,
          detalles: transDetalles.map(d => ({ productoId: d.productoId, cantidadSolicitada: d.cantidadSolicitada })),
        }),
      });
      if (res.ok) {
        toast.success('Transferencia creada exitosamente');
        setShowTransModal(false);
        resetTransForm();
        fetchTransferencias();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al crear transferencia');
      }
    } catch { toast.error('Error de red'); }
    finally { setSubmitting(false); }
  };

  // ─── PROCESS TRANSFER (Enviar / Recibir / Cancelar) ───
  const handleProcessTransfer = async () => {
    if (!selectedTransferencia) return;
    try {
      setSubmitting(true);

      let body: any = {};
      if (processAction === 'enviar') {
        body.detalles = selectedTransferencia.detalles.map(d => ({
          id: d.id,
          cantidadEnviada: processQtys[d.id] ?? d.cantidadSolicitada,
        }));
      } else if (processAction === 'recibir') {
        body.detalles = selectedTransferencia.detalles.map(d => ({
          id: d.id,
          cantidadRecibida: processQtys[d.id] ?? d.cantidadEnviada,
        }));
      }

      const res = await fetch(`/api/transferencias/${selectedTransferencia.id}?action=${processAction}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`Transferencia ${processAction === 'enviar' ? 'enviada' : processAction === 'recibir' ? 'recibida' : 'cancelada'} exitosamente`);
        setShowProcessModal(false);
        fetchTransferencias();
        fetchProductos();
        fetchMovimientos();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al procesar transferencia');
      }
    } catch { toast.error('Error de red'); }
    finally { setSubmitting(false); }
  };

  const resetAdjForm = () => {
    setSelectedProd(null); setModalSearch(''); setAdjType('ENTRADA');
    setAdjQty(1); setAdjMotive(''); setAdjRef('');
  };

  const resetTransForm = () => {
    setTransOrigenId(''); setTransDestinoId(''); setTransObs('');
    setTransDetalles([]); setTransSearch('');
  };

  const openLocationModal = (prod: Producto) => {
    setSelectedProd(prod); setLocPasillo(prod.pasillo || '');
    setLocEstante(prod.estante || ''); setLocNivel(prod.nivel || '');
    setShowLocationModal(true);
  };

  const openProcessModal = (trans: Transferencia, action: 'enviar' | 'recibir' | 'cancelar') => {
    setSelectedTransferencia(trans);
    setProcessAction(action);
    const qtys: Record<string, number> = {};
    trans.detalles.forEach(d => {
      qtys[d.id] = action === 'enviar' ? d.cantidadSolicitada : d.cantidadEnviada;
    });
    setProcessQtys(qtys);
    setShowProcessModal(true);
  };

  const addProductToTransfer = (prod: Producto) => {
    if (transDetalles.find(d => d.productoId === prod.id)) {
      return toast('Producto ya agregado', { icon: 'ℹ️' });
    }
    setTransDetalles(prev => [...prev, {
      productoId: prod.id, nombre: prod.nombre, codigo: prod.codigo,
      unidad: prod.unidadMedida, cantidadSolicitada: 1,
    }]);
    setTransSearch('');
  };

  // ─── Computed stats ───
  const totalInCatalog = productos.length;
  const alertProducts = productos.filter(p => p.stock <= p.stockMinimo && p.stock > 0).length;
  const outOfStock = productos.filter(p => p.stock === 0).length;
  const lastMovDate = movimientos[0]?.fechaMovimiento
    ? new Date(movimientos[0].fechaMovimiento).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
    : 'Sin registros';

  const filteredModalProducts = modalSearch.trim() === ''
    ? productos.slice(0, 5)
    : productos.filter(p =>
        p.nombre.toLowerCase().includes(modalSearch.toLowerCase()) ||
        p.codigo.toLowerCase().includes(modalSearch.toLowerCase())
      ).slice(0, 5);

  const filteredTransSearch = transSearch.trim() === ''
    ? productos.slice(0, 5)
    : productos.filter(p =>
        p.nombre.toLowerCase().includes(transSearch.toLowerCase()) ||
        p.codigo.toLowerCase().includes(transSearch.toLowerCase())
      ).slice(0, 5);

  const currentSucursal = sucursales.find(s => s.id === selectedSucursalId);

  // ─── RENDER ───
  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Gestión de Almacén"
        description="Inventario multi-sucursal en tiempo real, movimientos y transferencias."
      />
      <div className="p-6 space-y-6">

        {/* ── Sucursal Selector Bar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
            <Building2 className="h-4 w-4" />
            <span>Sucursal:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setSelectedSucursalId('all'); setCurrentPage(1); setMovCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedSucursalId === 'all'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200'
              }`}
            >
              Todas ({sucursales.length})
            </button>
            {sucursales.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedSucursalId(s.id); setCurrentPage(1); setMovCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSucursalId === s.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200'
                }`}
              >
                {s.esMatriz && <span className="text-[8px] bg-amber-400/20 text-amber-300 px-1 py-px rounded font-black uppercase">Matriz</span>}
                {s.codigo} — {s.nombre}
              </button>
            ))}
          </div>
          {selectedSucursalId !== 'all' && currentSucursal && (
            <span className="text-xs text-slate-500 ml-2">
              Mostrando datos de <span className="text-emerald-400 font-semibold">{currentSucursal.nombre}</span>
            </span>
          )}
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total en Catálogo', value: totalInCatalog, icon: Package, color: 'blue' },
            { label: 'Stock Mínimo Alerta', value: alertProducts, icon: AlertTriangle, color: 'yellow' },
            { label: 'Productos Agotados', value: outOfStock, icon: XCircle, color: 'rose' },
            { label: 'Última Operación', value: lastMovDate, icon: History, color: 'purple', isText: true },
          ].map((kpi) => {
            const Icon = kpi.icon;
            const colorMap: Record<string, string> = {
              blue: 'bg-blue-500/10 text-blue-400', yellow: 'bg-amber-500/10 text-amber-400',
              rose: 'bg-rose-500/10 text-rose-400', purple: 'bg-purple-500/10 text-purple-400',
            };
            return (
              <Card key={kpi.label} className="bg-slate-900/60 border border-slate-800/60 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                    <p className={`font-bold tracking-tight text-white ${kpi.isText ? 'text-base' : 'text-2xl'}`}>
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${colorMap[kpi.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Main Tabs ── */}
        <Tabs defaultValue="inventario" className="w-full space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <TabsTrigger value="inventario" className="flex items-center gap-2 rounded-lg text-xs data-[state=active]:bg-slate-700">
                <Package className="h-3.5 w-3.5" /> Inventario
              </TabsTrigger>
              <TabsTrigger value="kardex" className="flex items-center gap-2 rounded-lg text-xs data-[state=active]:bg-slate-700">
                <History className="h-3.5 w-3.5" /> Kardex
              </TabsTrigger>
              <TabsTrigger value="transferencias" className="flex items-center gap-2 rounded-lg text-xs data-[state=active]:bg-slate-700">
                <ArrowLeftRight className="h-3.5 w-3.5" /> Transferencias
                {transferencias.filter(t => t.estatus === 'PENDIENTE' || t.estatus === 'EN_TRANSITO').length > 0 && (
                  <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-px rounded-full">
                    {transferencias.filter(t => t.estatus === 'PENDIENTE' || t.estatus === 'EN_TRANSITO').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {canUpdate && (
                <Button
                  size="sm"
                  onClick={() => { resetAdjForm(); setShowAdjustmentModal(true); }}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-xl flex items-center gap-2"
                >
                  <Sliders className="h-3.5 w-3.5" /> Ajuste Manual
                </Button>
              )}
              {isAdmin && sucursales.length > 1 && (
                <Button
                  size="sm"
                  onClick={() => { resetTransForm(); setShowTransModal(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl flex items-center gap-2"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" /> Nueva Transferencia
                </Button>
              )}
            </div>
          </div>

          {/* ── TAB 1: Inventario Físico ── */}
          <TabsContent value="inventario" className="space-y-4 outline-none">
            <Card className="bg-slate-900/60 border border-slate-800/60 shadow-sm rounded-2xl">
              <CardHeader className="p-5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <CardTitle className="text-base font-bold text-white">Existencias Físicas</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-3.5 w-3.5" />
                    <Input
                      placeholder="Código o nombre..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="pl-8 h-9 text-xs rounded-xl bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                  <Select value={selectedCategoria} onValueChange={(v) => { setSelectedCategoria(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-9 w-40 text-xs rounded-xl bg-slate-800 border-slate-700 text-slate-200">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                      <SelectItem value="all">Todas</SelectItem>
                      {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchProductos}
                    className="h-9 w-9 rounded-xl border-slate-700 bg-slate-800 text-slate-400 hover:text-white shrink-0">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-900/80">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs font-semibold">Código</TableHead>
                        <TableHead className="text-slate-400 text-xs font-semibold">Producto</TableHead>
                        <TableHead className="text-slate-400 text-xs font-semibold">Categoría</TableHead>
                        <TableHead className="text-slate-400 text-xs font-semibold text-right">
                          {selectedSucursalId === 'all' ? 'Stock Total' : 'Stock Sucursal'}
                        </TableHead>
                        <TableHead className="text-slate-400 text-xs font-semibold">Estado</TableHead>
                        <TableHead className="text-slate-400 text-xs font-semibold">Ubicación</TableHead>
                        {canUpdate && <TableHead className="text-slate-400 text-xs font-semibold text-right">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={7} className="h-32 text-center text-slate-500 text-sm">Cargando...</TableCell></TableRow>
                      ) : productos.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="h-32 text-center text-slate-500 text-sm">Sin existencias.</TableCell></TableRow>
                      ) : (
                        productos.map((prod) => {
                          const stockBadge = prod.stock === 0
                            ? <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] flex items-center gap-1"><XCircle className="h-3 w-3" /> Agotado</Badge>
                            : prod.stock <= prod.stockMinimo
                              ? <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Mínimo</Badge>
                              : <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] flex items-center gap-1"><CheckCircle className="h-3 w-3" /> En Stock</Badge>;

                          return (
                            <TableRow key={prod.id} className="border-slate-800/60 hover:bg-slate-800/20">
                              <TableCell className="font-mono text-xs text-slate-400">{prod.codigo}</TableCell>
                              <TableCell>
                                <p className="text-sm font-medium text-slate-100">{prod.nombre}</p>
                                {prod.marca && <span className="text-xs text-slate-500">{prod.marca}</span>}
                              </TableCell>
                              <TableCell className="text-xs text-slate-400">{prod.categoria || '—'}</TableCell>
                              <TableCell className="text-right">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="font-semibold text-white cursor-help hover:underline decoration-dotted inline-block select-none">
                                        {prod.stock} <span className="text-xs font-normal text-slate-500">{prod.unidadMedida}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-slate-950 border-slate-800 text-slate-200 p-3 w-64 shadow-xl rounded-xl z-50">
                                      <p className="text-xs font-bold text-slate-400 border-b border-slate-800 pb-1.5 mb-1.5 flex items-center justify-between">
                                        <span>Distribución de Stock</span>
                                        <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                                      </p>
                                      <div className="space-y-1.5">
                                        {prod.stockSucursalesFull && prod.stockSucursalesFull.length > 0 ? (
                                          prod.stockSucursalesFull.map(ss => (
                                            <div key={ss.sucursalId} className="flex justify-between items-center text-xs">
                                              <span className="text-slate-400 font-medium truncate max-w-[150px]" title={ss.sucursal.nombre}>
                                                {ss.sucursal.nombre}
                                              </span>
                                              <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                                {ss.stock}
                                              </span>
                                            </div>
                                          ))
                                        ) : (
                                          <span className="text-xs text-slate-500">Sin datos de sucursales</span>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell>{stockBadge}</TableCell>
                              <TableCell>
                                {(prod.pasillo || prod.estante || prod.nivel) ? (
                                  <span className="text-xs text-slate-300 flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-indigo-400" />
                                    P:{prod.pasillo||'—'} E:{prod.estante||'—'} N:{prod.nivel||'—'}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-600 italic">Sin asignar</span>
                                )}
                              </TableCell>
                              {canUpdate && (
                                <TableCell className="text-right space-x-1">
                                  <Button variant="outline" size="sm" onClick={() => openLocationModal(prod)}
                                    className="h-7 text-xs rounded-lg border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white">
                                    <MapPin className="h-3 w-3 mr-1" /> Ubicar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => { resetAdjForm(); setSelectedProd(prod); setShowAdjustmentModal(true); }}
                                    className="h-7 text-xs rounded-lg border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white">
                                    <Sliders className="h-3 w-3 mr-1" /> Ajustar
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Pág. {currentPage} de {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    className="h-8 text-xs rounded-xl border-slate-700 bg-slate-800 text-slate-300">
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Ant.
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    className="h-8 text-xs rounded-xl border-slate-700 bg-slate-800 text-slate-300">
                    Sig. <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── TAB 2: Kardex ── */}
          <TabsContent value="kardex" className="space-y-4 outline-none">
            <Card className="bg-slate-900/60 border border-slate-800/60 rounded-2xl">
              <CardHeader className="p-5 pb-4 flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white">Bitácora de Movimientos</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchMovimientos}
                  className="h-8 text-xs rounded-xl border-slate-700 bg-slate-800 text-slate-400 hover:text-white">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualizar
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-900/80">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs">Fecha/Hora</TableHead>
                        <TableHead className="text-slate-400 text-xs">Sucursal</TableHead>
                        <TableHead className="text-slate-400 text-xs">Producto</TableHead>
                        <TableHead className="text-slate-400 text-xs">Tipo</TableHead>
                        <TableHead className="text-slate-400 text-xs text-right">Cant.</TableHead>
                        <TableHead className="text-slate-400 text-xs text-right">Anterior</TableHead>
                        <TableHead className="text-slate-400 text-xs text-right">Nuevo</TableHead>
                        <TableHead className="text-slate-400 text-xs">Motivo</TableHead>
                        <TableHead className="text-slate-400 text-xs">Ref.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingMovs ? (
                        <TableRow><TableCell colSpan={9} className="h-32 text-center text-slate-500 text-sm">Cargando...</TableCell></TableRow>
                      ) : movimientos.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="h-32 text-center text-slate-500 text-sm">Sin movimientos.</TableCell></TableRow>
                      ) : (
                        movimientos.map((mov) => {
                          const typeBadge = mov.tipo === 'ENTRADA'
                            ? <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] flex items-center gap-0.5 w-fit"><ArrowDownLeft className="h-2.5 w-2.5" />Entrada</Badge>
                            : mov.tipo === 'SALIDA'
                              ? <Badge className="bg-rose-500/10 text-rose-400 text-[10px] flex items-center gap-0.5 w-fit"><ArrowUpRight className="h-2.5 w-2.5" />Salida</Badge>
                              : <Badge className="bg-slate-500/10 text-slate-400 text-[10px] flex items-center gap-0.5 w-fit"><Sliders className="h-2.5 w-2.5" />Ajuste</Badge>;
                          return (
                            <TableRow key={mov.id} className="border-slate-800/60 hover:bg-slate-800/20">
                              <TableCell className="text-xs text-slate-500">{new Date(mov.fechaMovimiento).toLocaleString('es-MX')}</TableCell>
                              <TableCell className="text-xs">
                                <span className="font-mono text-indigo-400">{mov.sucursal?.codigo || '—'}</span>
                                <span className="text-slate-500 block text-[10px]">{mov.sucursal?.nombre}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs text-slate-500 block">{mov.producto?.codigo}</span>
                                <span className="text-xs font-medium text-slate-200">{mov.producto?.nombre}</span>
                              </TableCell>
                              <TableCell>{typeBadge}</TableCell>
                              <TableCell className="text-right text-sm font-semibold text-white">{mov.cantidad}</TableCell>
                              <TableCell className="text-right text-xs text-slate-500">{mov.cantidadAnterior}</TableCell>
                              <TableCell className="text-right text-sm font-bold text-emerald-400">{mov.cantidadNueva}</TableCell>
                              <TableCell className="text-xs text-slate-300 max-w-[150px] truncate">{mov.motivo}</TableCell>
                              <TableCell className="font-mono text-xs text-slate-500">{mov.referencia || '—'}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            {movTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Pág. {movCurrentPage} de {movTotalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setMovCurrentPage(p => Math.max(p - 1, 1))} disabled={movCurrentPage === 1}
                    className="h-8 text-xs rounded-xl border-slate-700 bg-slate-800 text-slate-300">
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Ant.
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMovCurrentPage(p => Math.min(p + 1, movTotalPages))} disabled={movCurrentPage === movTotalPages}
                    className="h-8 text-xs rounded-xl border-slate-700 bg-slate-800 text-slate-300">
                    Sig. <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── TAB 3: Transferencias ── */}
          <TabsContent value="transferencias" className="space-y-4 outline-none">
            <Card className="bg-slate-900/60 border border-slate-800/60 rounded-2xl">
              <CardHeader className="p-5 pb-4 flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white">Transferencias entre Sucursales</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchTransferencias}
                  className="h-8 text-xs rounded-xl border-slate-700 bg-slate-800 text-slate-400 hover:text-white">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualizar
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-900/80">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs">Folio</TableHead>
                        <TableHead className="text-slate-400 text-xs">Origen → Destino</TableHead>
                        <TableHead className="text-slate-400 text-xs">Productos</TableHead>
                        <TableHead className="text-slate-400 text-xs">Estado</TableHead>
                        <TableHead className="text-slate-400 text-xs">Fecha Solicitud</TableHead>
                        {isAdmin && <TableHead className="text-slate-400 text-xs text-right">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingTrans ? (
                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500 text-sm">Cargando...</TableCell></TableRow>
                      ) : transferencias.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center">
                            <div className="flex flex-col items-center gap-2 text-slate-500">
                              <ArrowLeftRight className="h-8 w-8 opacity-30" />
                              <p className="text-sm">Sin transferencias registradas</p>
                              {isAdmin && sucursales.length > 1 && (
                                <Button size="sm" onClick={() => { resetTransForm(); setShowTransModal(true); }}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs mt-2">
                                  <Plus className="h-3 w-3 mr-1" /> Nueva Transferencia
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        transferencias.map((trans) => {
                          const cfg = ESTATUS_CONFIG[trans.estatus];
                          const StatusIcon = cfg.icon;
                          return (
                            <TableRow key={trans.id} className="border-slate-800/60 hover:bg-slate-800/20">
                              <TableCell className="font-mono text-xs text-indigo-400 font-bold">{trans.folio}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-slate-300 font-medium">{trans.sucursalOrigen.codigo}</span>
                                  <ArrowLeftRight className="h-3 w-3 text-slate-600" />
                                  <span className="text-slate-300 font-medium">{trans.sucursalDestino.codigo}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 block mt-0.5">
                                  {trans.sucursalOrigen.nombre} → {trans.sucursalDestino.nombre}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-slate-400 space-y-0.5">
                                  {trans.detalles.slice(0, 2).map(d => (
                                    <div key={d.id} className="truncate max-w-[180px]">
                                      {d.producto.nombre} <span className="text-slate-600">× {d.cantidadSolicitada}</span>
                                    </div>
                                  ))}
                                  {trans.detalles.length > 2 && (
                                    <span className="text-slate-600">+{trans.detalles.length - 2} más</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-[10px] flex items-center gap-1 w-fit border ${cfg.cls}`}>
                                  <StatusIcon className="h-3 w-3" /> {cfg.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {new Date(trans.fechaSolicitud).toLocaleDateString('es-MX')}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right space-x-1">
                                  {trans.estatus === 'PENDIENTE' && (
                                    <>
                                      <Button size="sm" onClick={() => openProcessModal(trans, 'enviar')}
                                        className="h-7 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 rounded-lg">
                                        <SendHorizonal className="h-3 w-3 mr-1" /> Enviar
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => openProcessModal(trans, 'cancelar')}
                                        className="h-7 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                                        <Ban className="h-3 w-3 mr-1" /> Cancelar
                                      </Button>
                                    </>
                                  )}
                                  {trans.estatus === 'EN_TRANSITO' && (
                                    <>
                                      <Button size="sm" onClick={() => openProcessModal(trans, 'recibir')}
                                        className="h-7 text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 rounded-lg">
                                        <CheckCheck className="h-3 w-3 mr-1" /> Recibir
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => openProcessModal(trans, 'cancelar')}
                                        className="h-7 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                                        <Ban className="h-3 w-3 mr-1" /> Cancelar
                                      </Button>
                                    </>
                                  )}
                                  {(trans.estatus === 'RECIBIDA' || trans.estatus === 'CANCELADA') && (
                                    <Button size="sm" variant="outline" onClick={() => { setSelectedTransferencia(trans); }}
                                      className="h-7 text-xs border-slate-700 text-slate-400 rounded-lg">
                                      <Eye className="h-3 w-3 mr-1" /> Ver
                                    </Button>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ════════ MODAL: Ajuste Manual ════════ */}
        <Dialog open={showAdjustmentModal} onOpenChange={v => !v && setShowAdjustmentModal(false)}>
          <DialogContent className="max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-0 overflow-hidden">

            {/* ── Header con color dinámico por tipo ── */}
            <div className={`px-6 pt-6 pb-4 border-b border-slate-800/60 ${
              adjType === 'ENTRADA' ? 'bg-emerald-500/5' :
              adjType === 'SALIDA'  ? 'bg-rose-500/5'    :
                                     'bg-amber-500/5'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  adjType === 'ENTRADA' ? 'bg-emerald-500/15 text-emerald-400' :
                  adjType === 'SALIDA'  ? 'bg-rose-500/15 text-rose-400'       :
                                         'bg-amber-500/15 text-amber-400'
                }`}>
                  {adjType === 'ENTRADA' ? <ArrowDownLeft className="h-5 w-5" /> :
                   adjType === 'SALIDA'  ? <ArrowUpRight  className="h-5 w-5" /> :
                                          <Sliders        className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="text-white text-base font-bold leading-tight">
                    {adjType === 'ENTRADA' ? 'Entrada de Mercancía' :
                     adjType === 'SALIDA'  ? 'Salida de Inventario'  :
                                            'Ajuste Físico de Stock'}
                  </DialogTitle>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {selectedSucursalId !== 'all' && currentSucursal
                      ? `Sucursal: ${currentSucursal.nombre}`
                      : 'Sucursal del sistema'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAdjustmentSubmit} className="px-6 py-5 space-y-5">

              {/* ── Tipo como botones visuales ── */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo de Operación</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { val: 'ENTRADA' as const, label: 'Entrada', sub: 'Suma (+)',   icon: ArrowDownLeft, active: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300', inactive: 'bg-slate-900 border-slate-700 text-slate-500' },
                    { val: 'SALIDA'  as const, label: 'Salida',  sub: 'Resta (−)',  icon: ArrowUpRight,  active: 'bg-rose-500/20 border-rose-500/60 text-rose-300',           inactive: 'bg-slate-900 border-slate-700 text-slate-500' },
                    { val: 'AJUSTE'  as const, label: 'Ajuste',  sub: 'Iguala (=)', icon: Sliders,       active: 'bg-amber-500/20 border-amber-500/60 text-amber-300',         inactive: 'bg-slate-900 border-slate-700 text-slate-500' },
                  ]).map(({ val, label, sub, icon: Icon, active, inactive }) => (
                    <button key={val} type="button" onClick={() => setAdjType(val)}
                      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all duration-150 cursor-pointer ${adjType === val ? active : inactive}`}>
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-bold">{label}</span>
                      <span className="text-[9px] font-medium opacity-70">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Producto ── */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Producto</label>
                {!selectedProd ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-3.5 w-3.5" />
                      <Input placeholder="Buscar por nombre o código..." value={modalSearch}
                        onChange={e => setModalSearch(e.target.value)} autoFocus
                        className="pl-9 bg-slate-900 border-slate-700 text-slate-200 rounded-xl text-sm h-10 focus:border-indigo-500" />
                    </div>
                    <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60 max-h-44 overflow-y-auto">
                      {filteredModalProducts.length === 0 ? (
                        <div className="p-4 text-xs text-slate-500 text-center flex flex-col items-center gap-1">
                          <Package className="h-5 w-5 opacity-30" /><span>Sin resultados</span>
                        </div>
                      ) : filteredModalProducts.map(p => {
                        const ok  = p.stock > p.stockMinimo;
                        const low = p.stock > 0 && p.stock <= p.stockMinimo;
                        return (
                          <button key={p.id} type="button" onClick={() => setSelectedProd(p)}
                            className="w-full px-3 py-2.5 text-left hover:bg-slate-800/60 flex items-center justify-between gap-2 transition-colors group">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">{p.nombre}</p>
                              <p className="font-mono text-[10px] text-slate-500">{p.codigo}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              ok  ? 'bg-emerald-500/15 text-emerald-400' :
                              low ? 'bg-amber-500/15 text-amber-400'    :
                                    'bg-rose-500/15 text-rose-400'
                            }`}>{p.stock} {p.unidadMedida}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-100 text-sm truncate">{selectedProd.nombre}</p>
                        <p className="font-mono text-[10px] text-slate-500 mt-0.5">{selectedProd.codigo}</p>
                        {selectedProd.categoria && <p className="text-[10px] text-slate-600 mt-0.5">{selectedProd.categoria}</p>}
                      </div>
                      <button type="button" onClick={() => setSelectedProd(null)}
                        className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold shrink-0 underline underline-offset-2 cursor-pointer">
                        Cambiar
                      </button>
                    </div>
                    {/* Live stock preview */}
                    <div className="px-4 pb-3 space-y-1.5">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Stock actual</span>
                        <span className="font-bold text-white">{selectedProd.stock} {selectedProd.unidadMedida}</span>
                      </div>
                      {(() => {
                        const curr = selectedProd.stock;
                        const qty  = adjQty || 0;
                        const next = adjType === 'ENTRADA' ? curr + qty : adjType === 'SALIDA' ? curr - qty : qty;
                        const isNeg = next < 0;
                        const max   = Math.max(curr, next, selectedProd.stockMaximo || curr * 2 || 1);
                        const pct   = Math.min(100, Math.max(0, (next / max) * 100));
                        return (
                          <div className="space-y-1">
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-300 ${
                                isNeg ? 'bg-rose-500' : next <= selectedProd.stockMinimo ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-600">Mín: {selectedProd.stockMinimo}</span>
                              <span className={`font-bold ${isNeg ? 'text-rose-400' : next <= selectedProd.stockMinimo ? 'text-amber-400' : 'text-emerald-400'}`}>
                                → {isNeg ? 'Stock insuficiente' : `${next} ${selectedProd.unidadMedida}`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Cantidad con stepper ── */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {adjType === 'AJUSTE' ? 'Stock resultante (cantidad final)' : 'Cantidad'}
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setAdjQty(q => Math.max(1, q - 1))}
                    className="h-10 w-10 shrink-0 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-xl font-bold cursor-pointer flex items-center justify-center">
                    −
                  </button>
                  <Input
                    type="number" min="1" value={adjQty}
                    onChange={e => setAdjQty(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="h-10 text-center text-xl font-bold bg-slate-900 border-slate-700 text-white rounded-xl flex-1 focus:border-indigo-500"
                  />
                  <button type="button" onClick={() => setAdjQty(q => q + 1)}
                    className="h-10 w-10 shrink-0 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-xl font-bold cursor-pointer flex items-center justify-center">
                    +
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[5, 10, 25, 50, 100].map(n => (
                    <button key={n} type="button" onClick={() => setAdjQty(n)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        adjQty === n
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Motivo ── */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Motivo <span className="text-rose-500">*</span></label>
                <Select value={adjMotive} onValueChange={setAdjMotive}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl text-sm h-10 focus:border-indigo-500">
                    <SelectValue placeholder="Seleccionar motivo..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="Compra / Entrada de almacén">📦 Compra / Entrada de almacén</SelectItem>
                    <SelectItem value="Venta / Despacho">🛒 Venta / Despacho</SelectItem>
                    <SelectItem value="Ajuste por Inventario Físico">📋 Ajuste por Inventario Físico</SelectItem>
                    <SelectItem value="Merma, Rotura o Daño">⚠️ Merma, Rotura o Daño</SelectItem>
                    <SelectItem value="Devolución de Cliente">↩️ Devolución de Cliente</SelectItem>
                    <SelectItem value="Corrección de captura">✏️ Corrección de captura</SelectItem>
                    <SelectItem value="Otro">📝 Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── Referencia ── */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Referencia / Folio <span className="normal-case font-normal text-slate-600">(opcional)</span>
                </label>
                <Input
                  placeholder="Ej. Factura F-001, OC-2025, Ticket..."
                  value={adjRef}
                  onChange={e => setAdjRef(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl text-sm h-10 placeholder:text-slate-600 focus:border-indigo-500"
                />
              </div>

              {/* ── Footer ── */}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowAdjustmentModal(false)}
                  className="flex-1 border-slate-700 text-slate-300 rounded-xl h-10">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !selectedProd || !adjMotive}
                  className={`flex-1 h-10 rounded-xl font-bold transition-all ${
                    adjType === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]' :
                    adjType === 'SALIDA'  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_4px_16px_rgba(239,68,68,0.3)]'       :
                                           'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Aplicando...
                    </span>
                  ) : (
                    adjType === 'ENTRADA' ? '+ Registrar Entrada' :
                    adjType === 'SALIDA'  ? '− Registrar Salida'  :
                                           '= Aplicar Ajuste'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ════════ MODAL: Ubicación Física ════════ */}
        <Dialog open={showLocationModal} onOpenChange={v => !v && setShowLocationModal(false)}>
          <DialogContent className="max-w-sm bg-slate-950 border border-slate-800 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Ubicación Física</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">Pasillo, estante y nivel en el almacén.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLocationSubmit} className="space-y-4 py-1">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="font-semibold text-slate-100 text-sm">{selectedProd?.nombre}</p>
                <p className="font-mono text-xs text-slate-500">{selectedProd?.codigo}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ label: 'Pasillo', val: locPasillo, set: setLocPasillo, ph: 'A1' },
                  { label: 'Estante', val: locEstante, set: setLocEstante, ph: '03' },
                  { label: 'Nivel', val: locNivel, set: setLocNivel, ph: 'B' },
                ].map(f => (
                  <div key={f.label} className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{f.label}</label>
                    <Input placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl text-sm h-9" />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowLocationModal(false)}
                  className="border-slate-700 text-slate-300 rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                  {submitting ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ════════ MODAL: Nueva Transferencia ════════ */}
        <Dialog open={showTransModal} onOpenChange={v => !v && setShowTransModal(false)}>
          <DialogContent className="max-w-lg bg-slate-950 border border-slate-800 rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Nueva Transferencia de Inventario</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Mueve stock de una sucursal a otra. El stock se descuenta al enviar y se acredita al recibir.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleTransferSubmit} className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Sucursal Origen</label>
                  <Select value={transOrigenId} onValueChange={setTransOrigenId}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl text-sm h-9">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                      {sucursales.map(s => (
                        <SelectItem key={s.id} value={s.id} disabled={s.id === transDestinoId}>
                          {s.codigo} — {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Sucursal Destino</label>
                  <Select value={transDestinoId} onValueChange={setTransDestinoId}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl text-sm h-9">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                      {sucursales.map(s => (
                        <SelectItem key={s.id} value={s.id} disabled={s.id === transOrigenId}>
                          {s.codigo} — {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">Agregar Producto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-3.5 w-3.5" />
                  <Input placeholder="Buscar producto..." value={transSearch} onChange={e => setTransSearch(e.target.value)}
                    className="pl-8 bg-slate-900 border-slate-700 text-slate-200 rounded-xl text-sm h-9" />
                </div>
                {transSearch.trim() !== '' && (
                  <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 max-h-40 overflow-y-auto">
                    {filteredTransSearch.length === 0
                      ? <div className="p-2 text-xs text-slate-500 text-center">Sin resultados</div>
                      : filteredTransSearch.map(p => (
                        <button key={p.id} type="button" onClick={() => addProductToTransfer(p)}
                          className="w-full p-2.5 text-left text-xs hover:bg-slate-900 flex justify-between items-center">
                          <span className="text-slate-200">{p.nombre} <span className="text-slate-500 font-mono">({p.codigo})</span></span>
                          <span className="text-indigo-400 text-[10px]">Stock: {p.stock}</span>
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Transfer detail list */}
              {transDetalles.length > 0 && (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-900 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider grid grid-cols-[1fr_auto_auto] gap-2">
                    <span>Producto</span><span className="text-right">Cant.</span><span></span>
                  </div>
                  {transDetalles.map((d, idx) => (
                    <div key={d.productoId} className="px-3 py-2 border-t border-slate-800 grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                      <div>
                        <p className="text-xs text-slate-200 truncate">{d.nombre}</p>
                        <p className="text-[10px] font-mono text-slate-500">{d.codigo}</p>
                      </div>
                      <Input type="number" min="1" value={d.cantidadSolicitada}
                        onChange={e => {
                          const v = Math.max(1, parseInt(e.target.value) || 1);
                          setTransDetalles(prev => prev.map((x, i) => i === idx ? { ...x, cantidadSolicitada: v } : x));
                        }}
                        className="w-20 h-7 text-xs bg-slate-900 border-slate-700 text-slate-200 rounded-lg text-center"
                      />
                      <button type="button" onClick={() => setTransDetalles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-400 text-xs p-1">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Observaciones (Opcional)</label>
                <Input placeholder="Notas adicionales..." value={transObs} onChange={e => setTransObs(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl text-sm h-9" />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowTransModal(false)}
                  className="border-slate-700 text-slate-300 rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={submitting || transDetalles.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                  {submitting ? 'Creando...' : 'Crear Transferencia'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ════════ MODAL: Procesar Transferencia ════════ */}
        <Dialog open={showProcessModal} onOpenChange={v => !v && setShowProcessModal(false)}>
          <DialogContent className="max-w-md bg-slate-950 border border-slate-800 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white capitalize">
                {processAction === 'enviar' ? '📦 Enviar Transferencia'
                  : processAction === 'recibir' ? '✅ Recibir Transferencia'
                  : '🚫 Cancelar Transferencia'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Folio: <span className="font-mono text-indigo-400">{selectedTransferencia?.folio}</span> ·{' '}
                {selectedTransferencia?.sucursalOrigen.nombre} → {selectedTransferencia?.sucursalDestino.nombre}
              </DialogDescription>
            </DialogHeader>

            {processAction !== 'cancelar' && selectedTransferencia && (
              <div className="space-y-2 py-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {processAction === 'enviar' ? 'Cantidad a enviar' : 'Cantidad recibida'}
                </p>
                <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
                  {selectedTransferencia.detalles.map(d => (
                    <div key={d.id} className="px-3 py-2.5 grid grid-cols-[1fr_auto] gap-3 items-center">
                      <div>
                        <p className="text-xs text-slate-200">{d.producto.nombre}</p>
                        <p className="text-[10px] text-slate-500">
                          {processAction === 'enviar'
                            ? `Solicitado: ${d.cantidadSolicitada} ${d.producto.unidadMedida}`
                            : `Enviado: ${d.cantidadEnviada} ${d.producto.unidadMedida}`}
                        </p>
                      </div>
                      <Input type="number" min="0"
                        value={processQtys[d.id] ?? (processAction === 'enviar' ? d.cantidadSolicitada : d.cantidadEnviada)}
                        onChange={e => setProcessQtys(prev => ({ ...prev, [d.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-20 h-8 text-sm bg-slate-900 border-slate-700 text-slate-200 rounded-lg text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {processAction === 'cancelar' && (
              <div className="py-2">
                <p className="text-sm text-slate-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  ⚠️ Si la transferencia está EN TRÁNSITO, el stock se devolverá a la sucursal origen automáticamente.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProcessModal(false)}
                className="border-slate-700 text-slate-300 rounded-xl">Cancelar</Button>
              <Button
                onClick={handleProcessTransfer}
                disabled={submitting}
                className={processAction === 'cancelar'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white rounded-xl'
                  : processAction === 'recibir'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl'
                    : 'bg-blue-600 hover:bg-blue-700 text-white rounded-xl'
                }
              >
                {submitting ? 'Procesando...'
                  : processAction === 'enviar' ? 'Confirmar Envío'
                  : processAction === 'recibir' ? 'Confirmar Recepción'
                  : 'Confirmar Cancelación'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
