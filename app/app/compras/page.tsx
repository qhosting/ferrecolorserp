'use client';

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/navigation/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Truck,
  Plus,
  Search,
  Eye,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ShoppingCart,
  Handshake,
  RotateCcw,
  CreditCard,
  BarChart3,
  Package,
  XCircle,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Building2,
  Ban,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Formateo MXN ───
const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n);

// ─── Tipos ───
interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
  rfc?: string;
  telefono?: string;
  email?: string;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precioCompra: number;
  precio1: number;
  stock: number;
  unidadMedida: string;
}

interface CompraItem {
  id: string;
  productoId: string;
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Compra {
  id: string;
  folio: string;
  proveedor: Proveedor;
  subtotal: number;
  iva: number;
  total: number;
  status: string;
  fechaOrden: string;
  fechaRecepcion?: string;
  items: CompraItem[];
  observaciones?: string;
}

interface ConsignacionItem {
  id: string;
  productoId: string;
  producto: Producto;
  cantidadConsignada: number;
  cantidadVendida: number;
  cantidadDevuelta: number;
  precioUnitario: number;
  subtotal: number;
}

interface Consignacion {
  id: string;
  folio: string;
  proveedor: Proveedor;
  subtotal: number;
  iva: number;
  total: number;
  status: string;
  fechaConsignacion: string;
  fechaVencimiento?: string;
  fechaLiquidacion?: string;
  observaciones?: string;
  items: ConsignacionItem[];
}

interface DevolucionItem {
  id: string;
  productoId: string;
  producto: { id: string; codigo: string; nombre: string };
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  motivo?: string;
}

interface DevolucionVenta {
  id: string;
  folio: string;
  venta: { id: string; folio: string; total: number; fechaVenta?: string };
  cliente: { id: string; nombre: string; codigoCliente: string };
  aprobadoPor?: { name?: string; firstName?: string; lastName?: string };
  motivo: string;
  descripcion?: string;
  subtotal: number;
  iva: number;
  total: number;
  status: string;
  afectaInventario: boolean;
  inventarioAfectado: boolean;
  saldoAjustado: boolean;
  fechaDevolucion: string;
  fechaAprobacion?: string;
  observaciones?: string;
  items: DevolucionItem[];
}

interface CuentaPorPagar {
  id: string;
  proveedor: Proveedor;
  compra?: { id: string; folio: string };
  numeroFactura?: string;
  monto: number;
  montoRestante: number;
  status: string;
  fechaVencimiento: string;
  observaciones?: string;
}

interface VentaForDev {
  id: string;
  folio: string;
  total: number;
  saldoPendiente: number;
  fechaVenta: string;
  cliente: { id: string; nombre: string; codigoCliente: string };
  detalles: Array<{
    id: string;
    productoId: string;
    producto: { id: string; codigo: string; nombre: string; precio1: number };
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
}

// ─── Tab Buttons ───
const TABS = [
  { key: 'ordenes', label: 'Órdenes de Compra', icon: ShoppingCart },
  { key: 'consignaciones', label: 'Consignaciones', icon: Handshake },
  { key: 'devoluciones', label: 'Devoluciones', icon: RotateCcw },
  { key: 'cuentas-pagar', label: 'Cuentas por Pagar', icon: CreditCard },
  { key: 'reportes', label: 'Reportes', icon: BarChart3 },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const statusColors: Record<string, string> = {
  PENDIENTE: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  APROBADA: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  RECIBIDA: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  PARCIAL: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  CANCELADA: 'bg-slate-400/15 text-slate-500 border-slate-400/30',
  ACTIVA: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  LIQUIDADA: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  DEVUELTA: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  PAGADA: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  VENCIDA: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  RECHAZADA: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
};

const motivoLabels: Record<string, string> = {
  PRODUCTO_DEFECTUOSO: 'Producto Defectuoso',
  PRODUCTO_INCORRECTO: 'Producto Incorrecto',
  NO_SATISFECHO: 'Cliente No Satisfecho',
  EXCESO_PEDIDO: 'Exceso de Pedido',
  GARANTIA: 'Garantía',
  ACUERDO_COMERCIAL: 'Acuerdo Comercial',
  OTRO: 'Otro',
};

// ═════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════
export default function ComprasPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam && TABS.some(t => t.key === tabParam) ? tabParam : 'ordenes');
  const { toast } = useToast();

  // ─── Data state ───
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ordenes, setOrdenes] = useState<Compra[]>([]);
  const [consignaciones, setConsignaciones] = useState<Consignacion[]>([]);
  const [devoluciones, setDevoluciones] = useState<DevolucionVenta[]>([]);
  const [cxps, setCxps] = useState<CuentaPorPagar[]>([]);

  // ─── UI state ───
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─── Dialog state ───
  const [dialogOrden, setDialogOrden] = useState(false);
  const [dialogConsignacion, setDialogConsignacion] = useState(false);
  const [dialogDevolucion, setDialogDevolucion] = useState(false);
  const [dialogCxp, setDialogCxp] = useState(false);
  const [dialogAbono, setDialogAbono] = useState(false);
  const [dialogVerOrden, setDialogVerOrden] = useState<Compra | null>(null);
  const [dialogVerConsignacion, setDialogVerConsignacion] = useState<Consignacion | null>(null);
  const [dialogVerDevolucion, setDialogVerDevolucion] = useState<DevolucionVenta | null>(null);
  const [dialogEditarConsignacion, setDialogEditarConsignacion] = useState<Consignacion | null>(null);

  // ─── Forms ───
  const [ordenForm, setOrdenForm] = useState({
    proveedorId: '',
    observaciones: '',
  });
  const [ordenItems, setOrdenItems] = useState<
    Array<{ productoId: string; cantidad: string; precio: string }>
  >([{ productoId: '', cantidad: '', precio: '' }]);

  const [consigForm, setConsigForm] = useState({
    proveedorId: '',
    fechaVencimiento: '',
    observaciones: '',
  });
  const [consigItems, setConsigItems] = useState<
    Array<{ productoId: string; cantidad: string; precio: string }>
  >([{ productoId: '', cantidad: '', precio: '' }]);

  const [devForm, setDevForm] = useState({
    ventaId: '',
    motivo: '',
    descripcion: '',
    observaciones: '',
  });
  const [devItems, setDevItems] = useState<
    Array<{ productoId: string; cantidad: string; precioUnitario: string; motivo: string }>
  >([]);
  const [ventasBusqueda, setVentasBusqueda] = useState<VentaForDev[]>([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaForDev | null>(null);
  const [searchVenta, setSearchVenta] = useState('');

  const [cxpForm, setCxpForm] = useState({
    proveedorId: '',
    numeroFactura: '',
    monto: '',
    fechaVencimiento: '',
    observaciones: '',
  });

  const [abonoForm, setAbonoForm] = useState({
    cxpId: '',
    monto: '',
    cxpRef: null as CuentaPorPagar | null,
  });

  // ─── Consignacion edit items ───
  const [consigEditItems, setConsigEditItems] = useState<
    Array<{ itemId: string; cantidadVendida: string; cantidadDevuelta: string }>
  >([]);

  // ═════════════════════════════════════════════
  // DATA FETCHING
  // ═════════════════════════════════════════════
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [provRes, prodRes, ordRes, consRes, devRes, cxpRes] = await Promise.all([
        fetch('/api/compras/proveedores'),
        fetch('/api/productos?limit=9999'),
        fetch('/api/compras/ordenes'),
        fetch('/api/compras/consignaciones'),
        fetch('/api/compras/devoluciones'),
        fetch('/api/compras/cuentas-pagar'),
      ]);

      if (provRes.ok) {
        const d = await provRes.json();
        setProveedores(d.proveedores ?? []);
      }
      if (prodRes.ok) {
        const d = await prodRes.json();
        setProductos(Array.isArray(d) ? d : d.productos ?? []);
      }
      if (ordRes.ok) {
        const d = await ordRes.json();
        setOrdenes(d.ordenes ?? []);
      }
      if (consRes.ok) {
        const d = await consRes.json();
        setConsignaciones(d.consignaciones ?? []);
      }
      if (devRes.ok) {
        const d = await devRes.json();
        setDevoluciones(d.devoluciones ?? []);
      }
      if (cxpRes.ok) {
        const d = await cxpRes.json();
        setCxps(d.cxps ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ─── Search ventas for devolucion ───
  const buscarVentas = async (q: string) => {
    if (!q || q.length < 2) { setVentasBusqueda([]); return; }
    try {
      const res = await fetch(`/api/ventas?search=${encodeURIComponent(q)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setVentasBusqueda(Array.isArray(data) ? data : data.ventas ?? []);
      }
    } catch { setVentasBusqueda([]); }
  };

  // ═════════════════════════════════════════════
  // KPI METRICS
  // ═════════════════════════════════════════════
  const kpis = useMemo(() => {
    const totalOrdenes = ordenes.length;
    const ordenesPendientes = ordenes.filter(o => o.status === 'PENDIENTE').length;
    const totalConsig = consignaciones.length;
    const consigActivas = consignaciones.filter(c => c.status === 'ACTIVA' || c.status === 'PARCIAL').length;
    const totalDev = devoluciones.length;
    const devPendientes = devoluciones.filter(d => d.status === 'PENDIENTE').length;
    const totalCxp = cxps.length;
    const cxpPendientes = cxps.filter(c => c.status === 'PENDIENTE' || c.status === 'PARCIAL').length;
    const saldoCxpTotal = cxps.reduce((s, c) => s + c.montoRestante, 0);
    const montoDevoluciones = devoluciones.filter(d => d.status === 'APROBADA').reduce((s, d) => s + d.total, 0);
    return { totalOrdenes, ordenesPendientes, totalConsig, consigActivas, totalDev, devPendientes, totalCxp, cxpPendientes, saldoCxpTotal, montoDevoluciones };
  }, [ordenes, consignaciones, devoluciones, cxps]);

  // ═════════════════════════════════════════════
  // HANDLERS — ORDENES
  // ═════════════════════════════════════════════
  const submitOrden = async () => {
    if (!ordenForm.proveedorId || ordenItems.every(i => !i.productoId)) {
      toast({ title: 'Error', description: 'Seleccione proveedor y al menos un producto', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const items = ordenItems.filter(i => i.productoId).map(i => ({
        productoId: i.productoId,
        cantidad: parseInt(i.cantidad) || 1,
        precioUnitario: parseFloat(i.precio) || 0,
      }));
      const res = await fetch('/api/compras/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ordenForm, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Orden creada', description: data.compra?.folio || 'Exitosamente' });
      setDialogOrden(false);
      setOrdenForm({ proveedorId: '', observaciones: '' });
      setOrdenItems([{ productoId: '', cantidad: '', precio: '' }]);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const recibirOrden = async (ordenId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/compras/recepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compraId: ordenId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Mercancía recibida', description: 'Inventario y CxP actualizados' });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ═════════════════════════════════════════════
  // HANDLERS — CONSIGNACIONES
  // ═════════════════════════════════════════════
  const submitConsignacion = async () => {
    if (!consigForm.proveedorId || consigItems.every(i => !i.productoId)) {
      toast({ title: 'Error', description: 'Seleccione proveedor y al menos un producto', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const detalles = consigItems.filter(i => i.productoId).map(i => ({
        productoId: i.productoId,
        cantidad: parseInt(i.cantidad) || 1,
        precio: parseFloat(i.precio) || 0,
      }));
      const res = await fetch('/api/compras/consignaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...consigForm, detalles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Consignación creada', description: data.consignacion?.folio || 'Exitosamente' });
      setDialogConsignacion(false);
      setConsigForm({ proveedorId: '', fechaVencimiento: '', observaciones: '' });
      setConsigItems([{ productoId: '', cantidad: '', precio: '' }]);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const actualizarConsignacion = async () => {
    if (!dialogEditarConsignacion) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/compras/consignaciones/${dialogEditarConsignacion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'actualizar_cantidades',
          items: consigEditItems.map(i => ({
            itemId: i.itemId,
            cantidadVendida: parseInt(i.cantidadVendida) || 0,
            cantidadDevuelta: parseInt(i.cantidadDevuelta) || 0,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Consignación actualizada', description: data.message });
      setDialogEditarConsignacion(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ═════════════════════════════════════════════
  // HANDLERS — DEVOLUCIONES
  // ═════════════════════════════════════════════
  const submitDevolucion = async () => {
    if (!ventaSeleccionada || !devForm.motivo || devItems.length === 0) {
      toast({ title: 'Error', description: 'Seleccione venta, motivo y productos a devolver', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/compras/devoluciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ventaId: ventaSeleccionada.id,
          motivo: devForm.motivo,
          descripcion: devForm.descripcion,
          observaciones: devForm.observaciones,
          detalles: devItems.map(i => ({
            productoId: i.productoId,
            cantidad: parseFloat(i.cantidad) || 0,
            precioUnitario: parseFloat(i.precioUnitario) || 0,
            motivo: i.motivo,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Devolución creada', description: `${data.devolucion?.folio} — pendiente de aprobación` });
      setDialogDevolucion(false);
      setDevForm({ ventaId: '', motivo: '', descripcion: '', observaciones: '' });
      setDevItems([]);
      setVentaSeleccionada(null);
      setSearchVenta('');
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const aprobarDevolucion = async (devId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/compras/devoluciones/${devId}/aprobar`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Devolución aprobada', description: data.message });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ═════════════════════════════════════════════
  // HANDLERS — CXP
  // ═════════════════════════════════════════════
  const submitCxp = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/compras/cuentas-pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cxpForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'CxP creada', description: data.message });
      setDialogCxp(false);
      setCxpForm({ proveedorId: '', numeroFactura: '', monto: '', fechaVencimiento: '', observaciones: '' });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitAbono = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/compras/cuentas-pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: abonoForm.cxpId, montoAbono: parseFloat(abonoForm.monto) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Abono registrado', description: data.message });
      setDialogAbono(false);
      setAbonoForm({ cxpId: '', monto: '', cxpRef: null });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ═════════════════════════════════════════════
  // ITEM HELPERS
  // ═════════════════════════════════════════════
  const addItemRow = (setter: React.Dispatch<React.SetStateAction<Array<any>>>, template: any) =>
    setter(prev => [...prev, { ...template }]);

  const removeItemRow = (setter: React.Dispatch<React.SetStateAction<Array<any>>>, idx: number) =>
    setter(prev => prev.filter((_, i) => i !== idx));

  const updateItemRow = (
    setter: React.Dispatch<React.SetStateAction<Array<any>>>,
    idx: number,
    field: string,
    value: string,
    autoFillPrice?: boolean
  ) => {
    setter(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'productoId' && autoFillPrice) {
        const prod = productos.find(p => p.id === value);
        if (prod) next[idx].precio = prod.precioCompra.toString();
      }
      return next;
    });
  };

  // ═════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Compras" description="Gestión integral: órdenes, consignaciones, devoluciones y cuentas por pagar" />

      <div className="p-4 md:p-6 space-y-5">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Órdenes', value: kpis.totalOrdenes, sub: `${kpis.ordenesPendientes} pendientes`, icon: ShoppingCart, color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30', iconColor: 'text-emerald-500' },
            { label: 'Consignaciones', value: kpis.totalConsig, sub: `${kpis.consigActivas} activas`, icon: Handshake, color: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30', iconColor: 'text-cyan-500' },
            { label: 'Devoluciones', value: kpis.totalDev, sub: `${kpis.devPendientes} pendientes`, icon: RotateCcw, color: 'from-amber-500/20 to-amber-600/5 border-amber-500/30', iconColor: 'text-amber-500' },
            { label: 'CxP Pendiente', value: formatMXN(kpis.saldoCxpTotal), sub: `${kpis.cxpPendientes} cuentas`, icon: CreditCard, color: 'from-rose-500/20 to-rose-600/5 border-rose-500/30', iconColor: 'text-rose-500' },
            { label: 'Dev. Aprobadas', value: formatMXN(kpis.montoDevoluciones), sub: `Total devuelto`, icon: ArrowDownRight, color: 'from-violet-500/20 to-violet-600/5 border-violet-500/30', iconColor: 'text-violet-500' },
          ].map((kpi, i) => (
            <Card key={i} className={`bg-gradient-to-br ${kpi.color} border backdrop-blur-sm`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-black text-foreground">{kpi.value}</p>
                    <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background/50">
                    <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-background text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Search + Actions Bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por folio, proveedor, cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            {activeTab === 'ordenes' && (
              <Button size="sm" onClick={() => setDialogOrden(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                <Plus className="h-4 w-4" /> Nueva Orden
              </Button>
            )}
            {activeTab === 'consignaciones' && (
              <Button size="sm" onClick={() => setDialogConsignacion(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1">
                <Plus className="h-4 w-4" /> Nueva Consignación
              </Button>
            )}
            {activeTab === 'devoluciones' && (
              <Button size="sm" onClick={() => setDialogDevolucion(true)} className="bg-amber-600 hover:bg-amber-700 text-white gap-1">
                <Plus className="h-4 w-4" /> Nueva Devolución
              </Button>
            )}
            {activeTab === 'cuentas-pagar' && (
              <Button size="sm" onClick={() => setDialogCxp(true)} className="bg-rose-600 hover:bg-rose-700 text-white gap-1">
                <Plus className="h-4 w-4" /> Nueva CxP
              </Button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: ÓRDENES DE COMPRA */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'ordenes' && (
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" /> Cargando órdenes...
                </div>
              ) : ordenes.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sin órdenes de compra</p>
                  <p className="text-sm mt-1">Crea tu primera orden para comenzar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Folio</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proveedor</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenes.filter(o =>
                        !search || o.folio.toLowerCase().includes(search.toLowerCase()) ||
                        o.proveedor.nombre.toLowerCase().includes(search.toLowerCase())
                      ).map(o => (
                        <tr key={o.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                          <td className="px-4 py-3 font-mono text-xs font-semibold">{o.folio}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{o.proveedor.nombre}</p>
                              <p className="text-[11px] text-muted-foreground">{o.items?.length || 0} productos</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {format(new Date(o.fechaOrden), 'dd/MM/yyyy', { locale: es })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{formatMXN(o.total)}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className={statusColors[o.status] || ''}>{o.status}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDialogVerOrden(o)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {o.status === 'PENDIENTE' && (
                                <Button variant="ghost" size="sm" className="h-7 p-0 px-2 text-emerald-600 hover:text-emerald-700 text-xs" onClick={() => recibirOrden(o.id)} disabled={submitting}>
                                  <Check className="h-3.5 w-3.5 mr-1" /> Recibir
                                </Button>
                              )}
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
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: CONSIGNACIONES */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'consignaciones' && (
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" /> Cargando consignaciones...
                </div>
              ) : consignaciones.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Handshake className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sin consignaciones</p>
                  <p className="text-sm mt-1">Crea tu primera consignación de mercancía.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Folio</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proveedor</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vencimiento</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {consignaciones.filter(c =>
                        !search || c.folio.toLowerCase().includes(search.toLowerCase()) ||
                        c.proveedor.nombre.toLowerCase().includes(search.toLowerCase())
                      ).map(c => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                          <td className="px-4 py-3 font-mono text-xs font-semibold">{c.folio}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{c.proveedor.nombre}</p>
                            <p className="text-[11px] text-muted-foreground">{c.items?.length || 0} productos</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(c.fechaConsignacion), 'dd/MM/yyyy', { locale: es })}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{c.fechaVencimiento ? format(new Date(c.fechaVencimiento), 'dd/MM/yyyy', { locale: es }) : '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatMXN(c.total)}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className={statusColors[c.status] || ''}>{c.status}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDialogVerConsignacion(c)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {(c.status === 'ACTIVA' || c.status === 'PARCIAL') && (
                                <Button variant="ghost" size="sm" className="h-7 p-0 px-2 text-cyan-600 text-xs" onClick={() => {
                                  setDialogEditarConsignacion(c);
                                  setConsigEditItems(c.items.map(it => ({
                                    itemId: it.id,
                                    cantidadVendida: it.cantidadVendida.toString(),
                                    cantidadDevuelta: it.cantidadDevuelta.toString(),
                                  })));
                                }}>
                                  Gestionar
                                </Button>
                              )}
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
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: DEVOLUCIONES SOBRE VENTA */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'devoluciones' && (
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" /> Cargando devoluciones...
                </div>
              ) : devoluciones.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <RotateCcw className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sin devoluciones</p>
                  <p className="text-sm mt-1">Registra devoluciones sobre ventas existentes.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Folio</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Venta</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {devoluciones.filter(d =>
                        !search || d.folio.toLowerCase().includes(search.toLowerCase()) ||
                        d.venta.folio.toLowerCase().includes(search.toLowerCase()) ||
                        d.cliente.nombre.toLowerCase().includes(search.toLowerCase())
                      ).map(d => (
                        <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                          <td className="px-4 py-3 font-mono text-xs font-semibold">{d.folio}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px] font-mono">{d.venta.folio}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-xs">{d.cliente.nombre}</p>
                            <p className="text-[10px] text-muted-foreground">{d.cliente.codigoCliente}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{motivoLabels[d.motivo] || d.motivo}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(d.fechaDevolucion), 'dd/MM/yyyy', { locale: es })}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatMXN(d.total)}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className={statusColors[d.status] || ''}>{d.status}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDialogVerDevolucion(d)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {d.status === 'PENDIENTE' && (
                                <Button variant="ghost" size="sm" className="h-7 p-0 px-2 text-emerald-600 text-xs" onClick={() => aprobarDevolucion(d.id)} disabled={submitting}>
                                  <Check className="h-3.5 w-3.5 mr-1" /> Aprobar
                                </Button>
                              )}
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
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: CUENTAS POR PAGAR */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'cuentas-pagar' && (
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" /> Cargando cuentas por pagar...
                </div>
              ) : cxps.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sin cuentas por pagar</p>
                  <p className="text-sm mt-1">Las CxP se generan al recibir mercancía o manualmente.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proveedor</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Factura</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orden</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vencimiento</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monto</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Restante</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cxps.filter(c =>
                        !search || c.proveedor.nombre.toLowerCase().includes(search.toLowerCase()) ||
                        (c.numeroFactura?.toLowerCase().includes(search.toLowerCase()))
                      ).map(c => {
                        const vencida = new Date(c.fechaVencimiento) < new Date() && c.status !== 'PAGADA';
                        return (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                            <td className="px-4 py-3 font-medium">{c.proveedor.nombre}</td>
                            <td className="px-4 py-3 font-mono text-xs">{c.numeroFactura || '—'}</td>
                            <td className="px-4 py-3 text-xs">
                              {c.compra ? <Badge variant="outline" className="text-[10px] font-mono">{c.compra.folio}</Badge> : <span className="text-muted-foreground">Manual</span>}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className={vencida ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>
                                {format(new Date(c.fechaVencimiento), 'dd/MM/yyyy', { locale: es })}
                                {vencida && <AlertTriangle className="h-3 w-3 inline ml-1 text-rose-500" />}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">{formatMXN(c.monto)}</td>
                            <td className="px-4 py-3 text-right font-semibold">
                              <span className={c.montoRestante > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                {formatMXN(c.montoRestante)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className={statusColors[vencida && c.status !== 'PAGADA' ? 'VENCIDA' : c.status] || ''}>
                                {vencida && c.status !== 'PAGADA' ? 'VENCIDA' : c.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                {c.status !== 'PAGADA' && (
                                  <Button variant="ghost" size="sm" className="h-7 p-0 px-2 text-emerald-600 text-xs" onClick={() => {
                                    setAbonoForm({ cxpId: c.id, monto: '', cxpRef: c });
                                    setDialogAbono(true);
                                  }}>
                                    <DollarSign className="h-3.5 w-3.5 mr-1" /> Abonar
                                  </Button>
                                )}
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
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: REPORTES */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'reportes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-indigo-500" /> Resumen de Compras</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Órdenes</span><span className="font-bold">{kpis.totalOrdenes}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Órdenes Pendientes</span><span className="font-bold text-amber-600">{kpis.ordenesPendientes}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto Total Compras</span><span className="font-bold">{formatMXN(ordenes.reduce((s, o) => s + o.total, 0))}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Handshake className="h-4 w-4 text-cyan-500" /> Resumen Consignaciones</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Consignaciones</span><span className="font-bold">{kpis.totalConsig}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Activas / Parciales</span><span className="font-bold text-cyan-600">{kpis.consigActivas}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto en Consignación</span><span className="font-bold">{formatMXN(consignaciones.filter(c => c.status === 'ACTIVA' || c.status === 'PARCIAL').reduce((s, c) => s + c.total, 0))}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><RotateCcw className="h-4 w-4 text-amber-500" /> Resumen Devoluciones</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Devoluciones</span><span className="font-bold">{kpis.totalDev}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pendientes de Aprobación</span><span className="font-bold text-amber-600">{kpis.devPendientes}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto Devuelto (Aprobadas)</span><span className="font-bold text-rose-600">{formatMXN(kpis.montoDevoluciones)}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4 text-rose-500" /> Resumen CxP</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total CxP</span><span className="font-bold">{kpis.totalCxp}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pendientes</span><span className="font-bold text-amber-600">{kpis.cxpPendientes}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Saldo Pendiente Total</span><span className="font-bold text-rose-600">{formatMXN(kpis.saldoCxpTotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vencidas</span><span className="font-bold text-rose-600">{cxps.filter(c => new Date(c.fechaVencimiento) < new Date() && c.status !== 'PAGADA').length}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* DIALOGS */}
      {/* ═══════════════════════════════════════════════════ */}

      {/* ── Dialog: Nueva Orden ── */}
      <Dialog open={dialogOrden} onOpenChange={o => !o && setDialogOrden(false)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Compra</DialogTitle>
            <DialogDescription>Crea una orden de compra para un proveedor.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid gap-2">
              <Label>Proveedor *</Label>
              <Select value={ordenForm.proveedorId} onValueChange={v => setOrdenForm({ ...ordenForm, proveedorId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                <SelectContent>
                  {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Productos</Label>
                <Button variant="outline" size="sm" onClick={() => addItemRow(setOrdenItems, { productoId: '', cantidad: '', precio: '' })}>
                  <Plus className="h-3 w-3 mr-1" /> Agregar
                </Button>
              </div>
              <div className="space-y-2">
                {ordenItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Select value={item.productoId} onValueChange={v => updateItemRow(setOrdenItems, i, 'productoId', v, true)}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Producto" /></SelectTrigger>
                        <SelectContent>
                          {productos.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input type="number" placeholder="Cantidad" value={item.cantidad} onChange={e => updateItemRow(setOrdenItems, i, 'cantidad', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" step="0.01" placeholder="Precio" value={item.precio} onChange={e => updateItemRow(setOrdenItems, i, 'precio', e.target.value)} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500" onClick={() => removeItemRow(setOrdenItems, i)} disabled={ordenItems.length === 1}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Observaciones</Label>
              <Textarea value={ordenForm.observaciones} onChange={e => setOrdenForm({ ...ordenForm, observaciones: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOrden(false)}>Cancelar</Button>
            <Button onClick={submitOrden} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting ? 'Creando...' : 'Crear Orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nueva Consignación ── */}
      <Dialog open={dialogConsignacion} onOpenChange={o => !o && setDialogConsignacion(false)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Consignación</DialogTitle>
            <DialogDescription>Registra mercancía recibida en consignación. Solo se paga lo vendido.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Proveedor *</Label>
                <Select value={consigForm.proveedorId} onValueChange={v => setConsigForm({ ...consigForm, proveedorId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Fecha Vencimiento</Label>
                <Input type="date" value={consigForm.fechaVencimiento} onChange={e => setConsigForm({ ...consigForm, fechaVencimiento: e.target.value })} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Productos en Consignación</Label>
                <Button variant="outline" size="sm" onClick={() => addItemRow(setConsigItems, { productoId: '', cantidad: '', precio: '' })}>
                  <Plus className="h-3 w-3 mr-1" /> Agregar
                </Button>
              </div>
              <div className="space-y-2">
                {consigItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Select value={item.productoId} onValueChange={v => updateItemRow(setConsigItems, i, 'productoId', v, true)}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Producto" /></SelectTrigger>
                        <SelectContent>
                          {productos.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input type="number" placeholder="Cantidad" value={item.cantidad} onChange={e => updateItemRow(setConsigItems, i, 'cantidad', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" step="0.01" placeholder="Precio" value={item.precio} onChange={e => updateItemRow(setConsigItems, i, 'precio', e.target.value)} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500" onClick={() => removeItemRow(setConsigItems, i)} disabled={consigItems.length === 1}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Observaciones</Label>
              <Textarea value={consigForm.observaciones} onChange={e => setConsigForm({ ...consigForm, observaciones: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogConsignacion(false)}>Cancelar</Button>
            <Button onClick={submitConsignacion} disabled={submitting} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              {submitting ? 'Creando...' : 'Crear Consignación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nueva Devolución ── */}
      <Dialog open={dialogDevolucion} onOpenChange={o => { if (!o) { setDialogDevolucion(false); setVentaSeleccionada(null); setDevItems([]); setSearchVenta(''); } }}>
        <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Devolución sobre Venta</DialogTitle>
            <DialogDescription>Busca la venta original y selecciona los productos a devolver.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            {/* Buscar venta */}
            {!ventaSeleccionada && (
              <div className="grid gap-2">
                <Label>Buscar Venta por Folio</Label>
                <div className="flex gap-2">
                  <Input placeholder="Ej: VTA-2026-..." value={searchVenta} onChange={e => setSearchVenta(e.target.value)} />
                  <Button variant="outline" size="sm" onClick={() => buscarVentas(searchVenta)}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {ventasBusqueda.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                    {ventasBusqueda.map(v => (
                      <button
                        key={v.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors text-xs cursor-pointer"
                        onClick={() => {
                          setVentaSeleccionada(v);
                          setDevForm({ ...devForm, ventaId: v.id });
                          setDevItems(v.detalles?.map(d => ({
                            productoId: d.productoId,
                            cantidad: '',
                            precioUnitario: d.precioUnitario.toString(),
                            motivo: '',
                          })) || []);
                        }}
                      >
                        <span className="font-mono font-semibold">{v.folio}</span>
                        <span className="text-muted-foreground ml-2">{v.cliente?.nombre}</span>
                        <span className="float-right font-semibold">{formatMXN(v.total)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Venta seleccionada */}
            {ventaSeleccionada && (
              <>
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Venta seleccionada</p>
                        <p className="font-mono font-bold text-sm">{ventaSeleccionada.folio}</p>
                        <p className="text-xs text-muted-foreground">{ventaSeleccionada.cliente?.nombre} — {formatMXN(ventaSeleccionada.total)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setVentaSeleccionada(null); setDevItems([]); }}>Cambiar</Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Motivo *</Label>
                    <Select value={devForm.motivo} onValueChange={v => setDevForm({ ...devForm, motivo: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(motivoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Descripción</Label>
                    <Input value={devForm.descripcion} onChange={e => setDevForm({ ...devForm, descripcion: e.target.value })} placeholder="Descripción breve" />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Productos a devolver (ingrese cantidad)</Label>
                  <div className="space-y-2">
                    {devItems.map((item, i) => {
                      const prod = ventaSeleccionada.detalles?.find(d => d.productoId === item.productoId);
                      return (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-lg">
                          <div className="col-span-4 text-xs">
                            <p className="font-medium">{prod?.producto?.nombre || 'Producto'}</p>
                            <p className="text-muted-foreground">Vendido: {prod?.cantidad} — ${prod?.precioUnitario}</p>
                          </div>
                          <div className="col-span-2">
                            <Input type="number" placeholder="Cant." step="1" min="0" max={prod?.cantidad} value={item.cantidad}
                              onChange={e => {
                                const next = [...devItems];
                                next[i] = { ...next[i], cantidad: e.target.value };
                                setDevItems(next);
                              }} />
                          </div>
                          <div className="col-span-2">
                            <Input type="number" step="0.01" value={item.precioUnitario} readOnly className="bg-muted/30" />
                          </div>
                          <div className="col-span-3">
                            <Input placeholder="Motivo" value={item.motivo}
                              onChange={e => {
                                const next = [...devItems];
                                next[i] = { ...next[i], motivo: e.target.value };
                                setDevItems(next);
                              }} />
                          </div>
                          <div className="col-span-1 text-right text-xs font-semibold">
                            {formatMXN((parseFloat(item.cantidad) || 0) * (parseFloat(item.precioUnitario) || 0))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-right mt-2 text-sm font-bold">
                    Total devolución: {formatMXN(devItems.reduce((s, i) => s + (parseFloat(i.cantidad) || 0) * (parseFloat(i.precioUnitario) || 0), 0))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Observaciones</Label>
                  <Textarea value={devForm.observaciones} onChange={e => setDevForm({ ...devForm, observaciones: e.target.value })} rows={2} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogDevolucion(false); setVentaSeleccionada(null); }}>Cancelar</Button>
            <Button onClick={submitDevolucion} disabled={submitting || !ventaSeleccionada} className="bg-amber-600 hover:bg-amber-700 text-white">
              {submitting ? 'Creando...' : 'Crear Devolución'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nueva CxP Manual ── */}
      <Dialog open={dialogCxp} onOpenChange={o => !o && setDialogCxp(false)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Cuenta por Pagar</DialogTitle>
            <DialogDescription>Registra una cuenta por pagar manualmente.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid gap-2">
              <Label>Proveedor *</Label>
              <Select value={cxpForm.proveedorId} onValueChange={v => setCxpForm({ ...cxpForm, proveedorId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                <SelectContent>
                  {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>No. Factura *</Label>
                <Input value={cxpForm.numeroFactura} onChange={e => setCxpForm({ ...cxpForm, numeroFactura: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Monto *</Label>
                <Input type="number" step="0.01" value={cxpForm.monto} onChange={e => setCxpForm({ ...cxpForm, monto: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Fecha Vencimiento *</Label>
              <Input type="date" value={cxpForm.fechaVencimiento} onChange={e => setCxpForm({ ...cxpForm, fechaVencimiento: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Observaciones</Label>
              <Textarea value={cxpForm.observaciones} onChange={e => setCxpForm({ ...cxpForm, observaciones: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCxp(false)}>Cancelar</Button>
            <Button onClick={submitCxp} disabled={submitting} className="bg-rose-600 hover:bg-rose-700 text-white">
              {submitting ? 'Creando...' : 'Crear CxP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Abono CxP ── */}
      <Dialog open={dialogAbono} onOpenChange={o => !o && setDialogAbono(false)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Registrar Abono</DialogTitle>
            <DialogDescription>
              {abonoForm.cxpRef && <>Proveedor: <strong>{abonoForm.cxpRef.proveedor.nombre}</strong> — Restante: <strong className="text-rose-600">{formatMXN(abonoForm.cxpRef.montoRestante)}</strong></>}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid gap-2">
              <Label>Monto del Abono *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={abonoForm.monto} onChange={e => setAbonoForm({ ...abonoForm, monto: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbono(false)}>Cancelar</Button>
            <Button onClick={submitAbono} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting ? 'Registrando...' : 'Registrar Abono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Ver Orden ── */}
      <Dialog open={!!dialogVerOrden} onOpenChange={o => !o && setDialogVerOrden(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Orden {dialogVerOrden?.folio}</DialogTitle>
            <DialogDescription>Detalle de la orden de compra</DialogDescription>
          </DialogHeader>
          {dialogVerOrden && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Proveedor:</span> <strong>{dialogVerOrden.proveedor.nombre}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={statusColors[dialogVerOrden.status]}>{dialogVerOrden.status}</Badge></div>
                <div><span className="text-muted-foreground">Fecha:</span> {format(new Date(dialogVerOrden.fechaOrden), 'dd/MM/yyyy', { locale: es })}</div>
                <div><span className="text-muted-foreground">Total:</span> <strong>{formatMXN(dialogVerOrden.total)}</strong></div>
              </div>
              {dialogVerOrden.items?.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/30"><th className="text-left px-3 py-2">Producto</th><th className="text-right px-3 py-2">Cant.</th><th className="text-right px-3 py-2">Precio</th><th className="text-right px-3 py-2">Subtotal</th></tr></thead>
                    <tbody>
                      {dialogVerOrden.items.map(item => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">{item.producto?.nombre || item.productoId}</td>
                          <td className="px-3 py-2 text-right">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right">{formatMXN(item.precioUnitario)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatMXN(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDialogVerOrden(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Ver Consignación ── */}
      <Dialog open={!!dialogVerConsignacion} onOpenChange={o => !o && setDialogVerConsignacion(null)}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Consignación {dialogVerConsignacion?.folio}</DialogTitle>
            <DialogDescription>Detalle de la consignación</DialogDescription>
          </DialogHeader>
          {dialogVerConsignacion && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Proveedor:</span> <strong>{dialogVerConsignacion.proveedor.nombre}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={statusColors[dialogVerConsignacion.status]}>{dialogVerConsignacion.status}</Badge></div>
                <div><span className="text-muted-foreground">Fecha:</span> {format(new Date(dialogVerConsignacion.fechaConsignacion), 'dd/MM/yyyy', { locale: es })}</div>
                <div><span className="text-muted-foreground">Total:</span> <strong>{formatMXN(dialogVerConsignacion.total)}</strong></div>
              </div>
              {dialogVerConsignacion.items?.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/30"><th className="text-left px-3 py-2">Producto</th><th className="text-right px-3 py-2">Consignado</th><th className="text-right px-3 py-2">Vendido</th><th className="text-right px-3 py-2">Devuelto</th><th className="text-right px-3 py-2">Precio</th></tr></thead>
                    <tbody>
                      {dialogVerConsignacion.items.map(item => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">{item.producto?.nombre}</td>
                          <td className="px-3 py-2 text-right">{item.cantidadConsignada}</td>
                          <td className="px-3 py-2 text-right text-emerald-600">{item.cantidadVendida}</td>
                          <td className="px-3 py-2 text-right text-amber-600">{item.cantidadDevuelta}</td>
                          <td className="px-3 py-2 text-right">{formatMXN(item.precioUnitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDialogVerConsignacion(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Gestionar Consignación ── */}
      <Dialog open={!!dialogEditarConsignacion} onOpenChange={o => !o && setDialogEditarConsignacion(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar Consignación {dialogEditarConsignacion?.folio}</DialogTitle>
            <DialogDescription>Actualiza las cantidades vendidas y devueltas de cada producto.</DialogDescription>
          </DialogHeader>
          {dialogEditarConsignacion && (
            <div className="space-y-3 py-3">
              {dialogEditarConsignacion.items.map((item, i) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-3 rounded-lg">
                  <div className="col-span-4 text-xs">
                    <p className="font-medium">{item.producto?.nombre}</p>
                    <p className="text-muted-foreground">Consignado: {item.cantidadConsignada}</p>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-[10px]">Vendido</Label>
                    <Input type="number" min="0" max={item.cantidadConsignada} value={consigEditItems[i]?.cantidadVendida || ''}
                      onChange={e => {
                        const next = [...consigEditItems];
                        next[i] = { ...next[i], cantidadVendida: e.target.value };
                        setConsigEditItems(next);
                      }} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-[10px]">Devuelto</Label>
                    <Input type="number" min="0" max={item.cantidadConsignada} value={consigEditItems[i]?.cantidadDevuelta || ''}
                      onChange={e => {
                        const next = [...consigEditItems];
                        next[i] = { ...next[i], cantidadDevuelta: e.target.value };
                        setConsigEditItems(next);
                      }} />
                  </div>
                  <div className="col-span-2 text-right text-xs font-semibold">{formatMXN(item.precioUnitario)}</div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditarConsignacion(null)}>Cancelar</Button>
            <Button onClick={actualizarConsignacion} disabled={submitting} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Ver Devolución ── */}
      <Dialog open={!!dialogVerDevolucion} onOpenChange={o => !o && setDialogVerDevolucion(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Devolución {dialogVerDevolucion?.folio}</DialogTitle>
            <DialogDescription>Detalle de la devolución sobre venta</DialogDescription>
          </DialogHeader>
          {dialogVerDevolucion && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Venta:</span> <strong className="font-mono">{dialogVerDevolucion.venta.folio}</strong></div>
                <div><span className="text-muted-foreground">Cliente:</span> <strong>{dialogVerDevolucion.cliente.nombre}</strong></div>
                <div><span className="text-muted-foreground">Motivo:</span> {motivoLabels[dialogVerDevolucion.motivo]}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={statusColors[dialogVerDevolucion.status]}>{dialogVerDevolucion.status}</Badge></div>
                <div><span className="text-muted-foreground">Total:</span> <strong className="text-rose-600">{formatMXN(dialogVerDevolucion.total)}</strong></div>
                <div><span className="text-muted-foreground">Fecha:</span> {format(new Date(dialogVerDevolucion.fechaDevolucion), 'dd/MM/yyyy', { locale: es })}</div>
                {dialogVerDevolucion.aprobadoPor && (
                  <div className="col-span-2"><span className="text-muted-foreground">Aprobado por:</span> {dialogVerDevolucion.aprobadoPor.firstName || dialogVerDevolucion.aprobadoPor.name} — {dialogVerDevolucion.fechaAprobacion && format(new Date(dialogVerDevolucion.fechaAprobacion), 'dd/MM/yyyy HH:mm', { locale: es })}</div>
                )}
                {dialogVerDevolucion.inventarioAfectado && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Inventario actualizado</Badge>}
                {dialogVerDevolucion.saldoAjustado && <Badge className="bg-green-100 text-green-700 text-[10px]">Saldo ajustado</Badge>}
              </div>
              {dialogVerDevolucion.items?.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/30"><th className="text-left px-3 py-2">Producto</th><th className="text-right px-3 py-2">Cant.</th><th className="text-right px-3 py-2">Precio</th><th className="text-right px-3 py-2">Subtotal</th></tr></thead>
                    <tbody>
                      {dialogVerDevolucion.items.map(item => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">{item.producto?.nombre}</td>
                          <td className="px-3 py-2 text-right">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right">{formatMXN(item.precioUnitario)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatMXN(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDialogVerDevolucion(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
