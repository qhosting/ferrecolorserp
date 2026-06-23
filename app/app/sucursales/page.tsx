'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Store, 
  Layers, 
  ArrowLeftRight, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Settings, 
  TrendingUp, 
  ChevronRight, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Truck,
  RotateCcw,
  Boxes,
  Loader2,
  Minus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  listaPrecioDefecto: number;
  impuestoIncluido: boolean;
  esMatriz: boolean;
  isActive: boolean;
}

interface Transferencia {
  id: string;
  folio: string;
  sucursalOrigen: Sucursal;
  sucursalDestino: Sucursal;
  estatus: 'PENDIENTE' | 'EN_TRANSITO' | 'RECIBIDA' | 'CANCELADA';
  observaciones: string | null;
  fechaSolicitud: string;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  detalles: Array<{
    id: string;
    productoId: string;
    cantidadSolicitada: number;
    cantidadEnviada: number;
    cantidadRecibida: number;
    producto: {
      codigo: string;
      nombre: string;
      unidadMedida: string;
    };
  }>;
}

export default function SucursalesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab] = useState('sucursales');
  const [loading, setLoading] = useState(true);
  
  // Data lists
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [activeSucursal, setActiveSucursal] = useState<string>('');
  const [stockList, setStockList] = useState<any[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  // Search/Filters
  const [searchStock, setSearchStock] = useState('');
  
  // Modals
  const [showSucursalModal, setShowSucursalModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTransferActionModal, setShowTransferActionModal] = useState(false);
  
  // Form states - Sucursal
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [sCode, setSCode] = useState('');
  const [sName, setSName] = useState('');
  const [sDir, setSDir] = useState('');
  const [sTel, setSTel] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPriceList, setSPriceList] = useState('1');
  const [sTaxInc, setSTaxInc] = useState(false);
  const [sMatriz, setSMatriz] = useState(false);
  const [sActive, setSActive] = useState(true);
  const [submittingSuc, setSubmittingSuc] = useState(false);

  // Form states - Adjustment
  const [adjProd, setAdjProd] = useState<any>(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjMin, setAdjMin] = useState('');
  const [adjMax, setAdjMax] = useState('');
  const [adjMotive, setAdjMotive] = useState('Ajuste de inventario físico');
  const [submittingAdj, setSubmittingAdj] = useState(false);

  // Form states - Create Transfer
  const [tOrigin, setTOrigin] = useState('');
  const [tDest, setTDest] = useState('');
  const [tObs, setTObs] = useState('');
  const [tItems, setTItems] = useState<Array<{ productoId: string; cantidad: number }>>([]);
  const [tSearchProd, setTSearchProd] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Form states - Process Transfer (Ship/Receive/Cancel)
  const [selectedTransfer, setSelectedTransfer] = useState<Transferencia | null>(null);
  const [processAction, setProcessAction] = useState<'enviar' | 'recibir' | 'cancelar'>('enviar');
  const [actionQtyInputs, setActionQtyInputs] = useState<{ [key: string]: number }>({});
  const [actionObs, setActionObs] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      // Validate Admin/Superadmin access
      const role = session.user?.role;
      if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
        toast.error('Acceso restringido - Solo administradores');
        router.push('/');
        return;
      }

      loadData();
    }
  }, [status]);

  useEffect(() => {
    if (activeSucursal) {
      fetchStock();
    }
  }, [activeSucursal]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSucursales(),
        fetchTransferencias(),
        fetchCatalogProducts()
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSucursales = async () => {
    const res = await fetch('/api/sucursales?active=false');
    if (res.ok) {
      const data = await res.json();
      setSucursales(data.sucursales || []);
      if (data.sucursales?.length > 0 && !activeSucursal) {
        setActiveSucursal(data.sucursales[0].id);
      }
    }
  };

  const fetchStock = async () => {
    if (!activeSucursal) return;
    const res = await fetch(`/api/sucursales/${activeSucursal}/stock`);
    if (res.ok) {
      const data = await res.json();
      setStockList(data.stock || []);
    }
  };

  const fetchTransferencias = async () => {
    const res = await fetch('/api/transferencias');
    if (res.ok) {
      const data = await res.json();
      setTransferencias(data.transferencias || []);
    }
  };

  const fetchCatalogProducts = async () => {
    const res = await fetch('/api/productos?limit=100');
    if (res.ok) {
      const data = await res.json();
      setProductos(data.productos || []);
    }
  };

  // CRUD Sucursal
  const handleOpenCreateSucursal = () => {
    setEditingSucursal(null);
    setSCode('');
    setSName('');
    setSDir('');
    setSTel('');
    setSEmail('');
    setSPriceList('1');
    setSTaxInc(false);
    setSMatriz(false);
    setSActive(true);
    setShowSucursalModal(true);
  };

  const handleOpenEditSucursal = (suc: Sucursal) => {
    setEditingSucursal(suc);
    setSCode(suc.codigo);
    setSName(suc.nombre);
    setSDir(suc.direccion || '');
    setSTel(suc.telefono || '');
    setSEmail(suc.email || '');
    setSPriceList(suc.listaPrecioDefecto.toString());
    setSTaxInc(suc.impuestoIncluido);
    setSMatriz(suc.esMatriz);
    setSActive(suc.isActive);
    setShowSucursalModal(true);
  };

  const handleSucursalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sCode || !sName) {
      toast.error('Código y nombre son obligatorios');
      return;
    }

    try {
      setSubmittingSuc(true);
      const url = editingSucursal ? `/api/sucursales/${editingSucursal.id}` : '/api/sucursales';
      const method = editingSucursal ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: sCode,
          nombre: sName,
          direccion: sDir,
          telefono: sTel,
          email: sEmail,
          listaPrecioDefecto: parseInt(sPriceList),
          impuestoIncluido: sTaxInc,
          esMatriz: sMatriz,
          isActive: sActive
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Sucursal guardada exitosamente');
        setShowSucursalModal(false);
        fetchSucursales();
      } else {
        toast.error(data.error || 'Error al guardar sucursal');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al guardar sucursal');
    } finally {
      setSubmittingSuc(false);
    }
  };

  // Stock Adjustment
  const handleOpenAdjustment = (stockItem: any) => {
    setAdjProd(stockItem);
    setAdjQty(stockItem.stock.toString());
    setAdjMin(stockItem.stockMinimo.toString());
    setAdjMax(stockItem.stockMaximo.toString());
    setAdjMotive('Ajuste de inventario físico');
    setShowAdjustmentModal(true);
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProd) return;

    try {
      setSubmittingAdj(true);
      const res = await fetch(`/api/sucursales/${activeSucursal}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: adjProd.producto.id,
          stock: parseInt(adjQty),
          stockMinimo: parseInt(adjMin),
          stockMaximo: parseInt(adjMax),
          motivoAjuste: adjMotive
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Stock ajustado exitosamente');
        setShowAdjustmentModal(false);
        fetchStock();
      } else {
        toast.error(data.error || 'Error al ajustar stock');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al ajustar stock');
    } finally {
      setSubmittingAdj(false);
    }
  };

  // Create Transfer
  const handleOpenCreateTransfer = () => {
    setTOrigin(sucursales.find(s => s.isActive)?.id || '');
    setTDest('');
    setTObs('');
    setTItems([]);
    setTSearchProd('');
    setShowTransferModal(true);
  };

  const handleAddTransferItem = (prodId: string) => {
    const exists = tItems.some(i => i.productoId === prodId);
    if (exists) {
      toast.warning('El producto ya está en la lista de transferencia');
      return;
    }
    setTItems([...tItems, { productoId: prodId, cantidad: 1 }]);
    setTSearchProd('');
  };

  const handleRemoveTransferItem = (prodId: string) => {
    setTItems(tItems.filter(i => i.productoId !== prodId));
  };

  const handleUpdateTransferQty = (prodId: string, qty: number) => {
    setTItems(tItems.map(i => i.productoId === prodId ? { ...i, cantidad: Math.max(1, qty) } : i));
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tOrigin || !tDest || tItems.length === 0) {
      toast.error('Debe completar origen, destino y añadir al menos un producto');
      return;
    }

    if (tOrigin === tDest) {
      toast.error('La sucursal origen y destino deben ser distintas');
      return;
    }

    try {
      setSubmittingTransfer(true);
      const res = await fetch('/api/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sucursalOrigenId: tOrigin,
          sucursalDestinoId: tDest,
          observaciones: tObs,
          detalles: tItems.map(i => ({
            productoId: i.productoId,
            cantidadSolicitada: i.cantidad
          }))
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Solicitud de transferencia creada');
        setShowTransferModal(false);
        fetchTransferencias();
      } else {
        toast.error(data.error || 'Error al crear transferencia');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al crear transferencia');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Process Transfer Action
  const handleOpenTransferAction = (trans: Transferencia, action: 'enviar' | 'recibir' | 'cancelar') => {
    setSelectedTransfer(trans);
    setProcessAction(action);
    setActionObs('');
    
    // Inicializar inputs
    const inputs: { [key: string]: number } = {};
    trans.detalles.forEach(d => {
      if (action === 'enviar') {
        inputs[d.id] = d.cantidadSolicitada;
      } else if (action === 'recibir') {
        inputs[d.id] = d.cantidadEnviada;
      }
    });
    setActionQtyInputs(inputs);
    setShowTransferActionModal(true);
  };

  const handleTransferActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    // Estructurar cantidades segun accion
    const detallesList = selectedTransfer.detalles.map(d => {
      const val = actionQtyInputs[d.id] || 0;
      return {
        id: d.id,
        ...(processAction === 'enviar' ? { cantidadEnviada: val } : {}),
        ...(processAction === 'recibir' ? { cantidadRecibida: val } : {})
      };
    });

    try {
      setSubmittingAction(true);
      const res = await fetch(`/api/transferencias/${selectedTransfer.id}?action=${processAction}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detalles: detallesList,
          observaciones: actionObs
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Acción realizada exitosamente`);
        setShowTransferActionModal(false);
        fetchTransferencias();
        if (activeSucursal) {
          fetchStock();
        }
      } else {
        toast.error(data.error || 'Error al procesar transferencia');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al enviar comandos');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filters stock list based on search
  const filteredStock = stockList.filter(item => 
    item.producto.nombre.toLowerCase().includes(searchStock.toLowerCase()) ||
    item.producto.codigo.toLowerCase().includes(searchStock.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-0 flex items-center gap-1 w-fit"><AlertCircle className="h-3 w-3" /> Solicitado</Badge>;
      case 'EN_TRANSITO':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 border-0 flex items-center gap-1 w-fit"><Truck className="h-3 w-3" /> En Tránsito</Badge>;
      case 'RECIBIDA':
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-0 flex items-center gap-1 w-fit"><CheckCircle className="h-3 w-3" /> Recibido</Badge>;
      case 'CANCELADA':
        return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/10 border-0 flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" /> Cancelado</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <span className="text-sm font-medium tracking-wide">Cargando Panel de Sucursales...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6 md:p-8 space-y-6">
      
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Store className="h-8 w-8 text-indigo-500 animate-pulse" />
            Gestión Multi-Sucursal
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administre inventarios sucursalizados, configure puntos de venta y transfiera existencias.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="border-slate-800 bg-slate-900 text-slate-400 hover:text-white rounded-xl"
          >
            Volver al Inicio
          </Button>
          <Button
            onClick={handleOpenCreateSucursal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/10"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Crear Sucursal</span>
          </Button>
        </div>
      </div>

      {/* 2. Tabs del panel */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col space-y-4">
        
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit shrink-0">
          <TabsTrigger value="sucursales" className="rounded-lg text-slate-400 data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center gap-1.5 px-4 py-2">
            <Store className="h-4 w-4" />
            Sucursales
          </TabsTrigger>
          <TabsTrigger value="inventario" className="rounded-lg text-slate-400 data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center gap-1.5 px-4 py-2">
            <Boxes className="h-4 w-4" />
            Inventarios
          </TabsTrigger>
          <TabsTrigger value="transferencias" className="rounded-lg text-slate-400 data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center gap-1.5 px-4 py-2">
            <ArrowLeftRight className="h-4 w-4" />
            Transferencias
          </TabsTrigger>
        </TabsList>

        {/* CONTENIDO TAB 1: SUCURSALES */}
        <TabsContent value="sucursales" className="flex-1 min-h-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sucursales.map((s) => (
              <div 
                key={s.id} 
                className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between h-48 relative overflow-hidden transition-all hover:border-slate-700 ${
                  !s.isActive ? 'opacity-50 border-slate-900' : 'border-slate-800'
                }`}
              >
                {/* Glow for esMatriz */}
                {s.esMatriz && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                )}
                
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-bold uppercase">
                      {s.codigo}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                      {s.esMatriz && <Badge className="bg-indigo-600 text-white font-bold text-[9px] uppercase">Matriz</Badge>}
                      {!s.isActive && <Badge className="bg-slate-800 text-slate-500 font-bold text-[9px] uppercase border-0">Inactiva</Badge>}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">{s.nombre}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{s.direccion || 'Sin dirección registrada'}</p>
                  <p className="text-xs text-slate-500 font-mono">{s.telefono || 'Sin teléfono'}</p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 mt-3">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                    Lista Precios: {s.listaPrecioDefecto} ({s.impuestoIncluido ? 'Con IVA' : 'Mas IVA'})
                  </span>
                  
                  <Button
                    onClick={() => handleOpenEditSucursal(s)}
                    variant="ghost"
                    size="sm"
                    className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 text-xs font-semibold rounded-lg"
                  >
                    Editar Configuración
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* CONTENIDO TAB 2: INVENTARIOS */}
        <TabsContent value="inventario" className="flex-1 min-h-0 focus-visible:outline-none flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <Label htmlFor="branch-stock-select" className="text-slate-400 font-bold text-xs uppercase tracking-wider">Ver Inventario de:</Label>
              <select
                id="branch-stock-select"
                value={activeSucursal}
                onChange={(e) => setActiveSucursal(e.target.value)}
                className="h-10 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors min-w-[200px]"
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>
                ))}
              </select>
            </div>

            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Buscar por código o nombre..."
                value={searchStock}
                onChange={(e) => setSearchStock(e.target.value)}
                className="h-10 pl-9 bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Tabla de existencias */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-y-auto flex-1 min-h-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-3.5 font-semibold">Código</th>
                    <th className="p-3.5 font-semibold">Nombre del Producto</th>
                    <th className="p-3.5 font-semibold text-center">Stock Mín</th>
                    <th className="p-3.5 font-semibold text-center">Stock Máx</th>
                    <th className="p-3.5 font-semibold text-right">Existencia Actual</th>
                    <th className="p-3.5 font-semibold text-center">Estatus</th>
                    <th className="p-3.5 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No hay existencias registradas en esta sucursal o no se han cargado productos.
                      </td>
                    </tr>
                  ) : (
                    filteredStock.map((item) => {
                      let statusText = 'Correcto';
                      let statusClass = 'bg-emerald-500/10 text-emerald-500';
                      if (item.stock === 0) {
                        statusText = 'Agotado';
                        statusClass = 'bg-rose-500/10 text-rose-500';
                      } else if (item.stock <= item.stockMinimo) {
                        statusText = 'Bajo Stock';
                        statusClass = 'bg-amber-500/10 text-amber-500';
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-850/40 transition-colors">
                          <td className="p-3.5 font-mono text-indigo-400">{item.producto.codigo}</td>
                          <td className="p-3.5 font-medium text-white max-w-xs truncate">{item.producto.nombre}</td>
                          <td className="p-3.5 text-center font-mono text-slate-400">{item.stockMinimo}</td>
                          <td className="p-3.5 text-center font-mono text-slate-400">{item.stockMaximo}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-white text-sm">{item.stock} {item.producto.unidadMedida}</td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <Button
                              onClick={() => handleOpenAdjustment(item)}
                              variant="ghost"
                              size="sm"
                              className="h-7 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 text-[11px] px-2.5 rounded-lg"
                            >
                              Ajustar Existencia
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* CONTENIDO TAB 3: TRANSFERENCIAS */}
        <TabsContent value="transferencias" className="flex-1 min-h-0 focus-visible:outline-none flex flex-col space-y-4">
          
          <div className="flex justify-between items-center shrink-0">
            <h3 className="text-lg font-bold text-white">Órdenes de Transferencia</h3>
            <Button
              onClick={handleOpenCreateTransfer}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Solicitar Envío / Traspaso
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-y-auto flex-1 min-h-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-3.5 font-semibold">Folio</th>
                    <th className="p-3.5 font-semibold">Origen</th>
                    <th className="p-3.5 font-semibold">Destino</th>
                    <th className="p-3.5 font-semibold">Estatus</th>
                    <th className="p-3.5 font-semibold">Fecha Solicitud</th>
                    <th className="p-3.5 font-semibold">Productos</th>
                    <th className="p-3.5 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {transferencias.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No hay registros de transferencias de inventario en el historial.
                      </td>
                    </tr>
                  ) : (
                    transferencias.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-850/40 transition-colors">
                        <td className="p-3.5 font-mono text-indigo-400 font-bold">{t.folio}</td>
                        <td className="p-3.5 font-medium text-white">{t.sucursalOrigen.nombre}</td>
                        <td className="p-3.5 font-medium text-white">{t.sucursalDestino.nombre}</td>
                        <td className="p-3.5">{getStatusBadge(t.estatus)}</td>
                        <td className="p-3.5 text-slate-400">{new Date(t.fechaSolicitud).toLocaleDateString()}</td>
                        <td className="p-3.5 text-slate-400 font-semibold">{t.detalles.length} partidas</td>
                        <td className="p-3.5 text-center flex gap-1 justify-center">
                          {t.estatus === 'PENDIENTE' && (
                            <>
                              <Button
                                onClick={() => handleOpenTransferAction(t, 'enviar')}
                                className="h-7 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] px-2.5 rounded-lg"
                              >
                                Enviar Mercancía
                              </Button>
                              <Button
                                onClick={() => handleOpenTransferAction(t, 'cancelar')}
                                variant="ghost"
                                className="h-7 text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 text-[11px] px-2.5 rounded-lg"
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                          {t.estatus === 'EN_TRANSITO' && (
                            <>
                              <Button
                                onClick={() => handleOpenTransferAction(t, 'recibir')}
                                className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] px-2.5 rounded-lg"
                              >
                                Recibir Mercancía
                              </Button>
                              <Button
                                onClick={() => handleOpenTransferAction(t, 'cancelar')}
                                variant="ghost"
                                className="h-7 text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 text-[11px] px-2.5 rounded-lg"
                              >
                                Revertir/Cancelar
                              </Button>
                            </>
                          )}
                          {t.estatus === 'RECIBIDA' && (
                            <span className="text-[10px] text-emerald-400 font-bold">Completada el {t.fechaRecepcion ? new Date(t.fechaRecepcion).toLocaleDateString() : ''}</span>
                          )}
                          {t.estatus === 'CANCELADA' && (
                            <span className="text-[10px] text-rose-500 font-bold">Anulada</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 3. MODALES DE SUCURSAL */}

      {/* MODAL SUCURSAL (Create/Edit) */}
      <Dialog open={showSucursalModal} onOpenChange={setShowSucursalModal}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Store className="h-6 w-6 text-indigo-400" />
              {editingSucursal ? 'Editar Sucursal' : 'Crear Nueva Sucursal'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure la sucursal física y los valores fiscales y de precios por defecto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSucursalSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="suc-code" className="text-xs font-semibold text-slate-300">Código</Label>
                <Input
                  id="suc-code"
                  type="text"
                  placeholder="CENTRO"
                  value={sCode}
                  onChange={(e) => setSCode(e.target.value)}
                  className="h-10 bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus-visible:ring-indigo-500 rounded-xl text-xs uppercase"
                  disabled={!!editingSucursal}
                  required
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="suc-name" className="text-xs font-semibold text-slate-300">Nombre de la Sucursal</Label>
                <Input
                  id="suc-name"
                  type="text"
                  placeholder="Sucursal Centro Histórico"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="h-10 bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus-visible:ring-indigo-500 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="suc-dir" className="text-xs font-semibold text-slate-300">Dirección</Label>
              <Input
                id="suc-dir"
                type="text"
                placeholder="Calle Principal #123, Col. Centro"
                value={sDir}
                onChange={(e) => setSDir(e.target.value)}
                className="h-10 bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus-visible:ring-indigo-500 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="suc-tel" className="text-xs font-semibold text-slate-300">Teléfono</Label>
                <Input
                  id="suc-tel"
                  type="text"
                  placeholder="81-1234-5678"
                  value={sTel}
                  onChange={(e) => setSTel(e.target.value)}
                  className="h-10 bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus-visible:ring-indigo-500 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="suc-email" className="text-xs font-semibold text-slate-300">Email</Label>
                <Input
                  id="suc-email"
                  type="email"
                  placeholder="centro@empresa.com"
                  value={sEmail}
                  onChange={(e) => setSEmail(e.target.value)}
                  className="h-10 bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus-visible:ring-indigo-500 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="suc-prices" className="text-xs font-semibold text-slate-300">Lista Precios Defecto</Label>
                <select
                  id="suc-prices"
                  value={sPriceList}
                  onChange={(e) => setSPriceList(e.target.value)}
                  className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-xl px-2.5 text-xs focus:outline-none"
                >
                  <option value="1">Lista 1 (Público)</option>
                  <option value="2">Lista 2 (Mayorista)</option>
                  <option value="3">Lista 3 (Distribuidor)</option>
                  <option value="4">Lista 4 (Especial)</option>
                  <option value="5">Lista 5 (Promocional)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  id="suc-tax"
                  type="checkbox"
                  checked={sTaxInc}
                  onChange={(e) => setSTaxInc(e.target.checked)}
                  className="h-4 w-4 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500"
                />
                <Label htmlFor="suc-tax" className="text-xs font-semibold text-slate-300 cursor-pointer">Impuesto incluido en precio</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  id="suc-matriz"
                  type="checkbox"
                  checked={sMatriz}
                  onChange={(e) => setSMatriz(e.target.checked)}
                  className="h-4 w-4 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500"
                />
                <Label htmlFor="suc-matriz" className="text-xs font-semibold text-slate-300 cursor-pointer">Establecer como MATRIZ</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="suc-active"
                  type="checkbox"
                  checked={sActive}
                  onChange={(e) => setSActive(e.target.checked)}
                  className="h-4 w-4 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500"
                />
                <Label htmlFor="suc-active" className="text-xs font-semibold text-slate-300 cursor-pointer">Sucursal activa</Label>
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSucursalModal(false)}
                className="flex-1 h-10 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingSuc}
                className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
              >
                {submittingSuc ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Sucursal'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ADJUSTMENT (Stock) */}
      <Dialog open={showAdjustmentModal} onOpenChange={setShowAdjustmentModal}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="h-6 w-6 text-indigo-400" />
              Ajuste de Stock Físico
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Modifique los niveles de inventario y alertas del producto en la sucursal seleccionada.
            </DialogDescription>
          </DialogHeader>

          {adjProd && (
            <form onSubmit={handleAdjustmentSubmit} className="space-y-4 py-2">
              <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl">
                <span className="font-mono text-[10px] text-slate-500">{adjProd.producto.codigo}</span>
                <h4 className="text-sm font-bold text-white">{adjProd.producto.nombre}</h4>
                <p className="text-xs text-slate-400 mt-1">Existencia actual: <span className="text-indigo-400 font-bold font-mono">{adjProd.stock} {adjProd.producto.unidadMedida}</span></p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="adj-qty" className="text-xs font-semibold text-slate-300">Nueva Existencia</Label>
                  <Input
                    id="adj-qty"
                    type="number"
                    min="0"
                    value={adjQty}
                    onChange={(e) => setAdjQty(e.target.value)}
                    className="h-10 bg-slate-950 border-slate-800 text-white font-mono rounded-xl text-center"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="adj-min" className="text-xs font-semibold text-slate-300">Stock Mínimo</Label>
                  <Input
                    id="adj-min"
                    type="number"
                    min="0"
                    value={adjMin}
                    onChange={(e) => setAdjMin(e.target.value)}
                    className="h-10 bg-slate-950 border-slate-800 text-white font-mono rounded-xl text-center"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="adj-max" className="text-xs font-semibold text-slate-300">Stock Máximo</Label>
                  <Input
                    id="adj-max"
                    type="number"
                    min="0"
                    value={adjMax}
                    onChange={(e) => setAdjMax(e.target.value)}
                    className="h-10 bg-slate-950 border-slate-800 text-white font-mono rounded-xl text-center"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adj-motive" className="text-xs font-semibold text-slate-300">Motivo del Ajuste</Label>
                <Input
                  id="adj-motive"
                  type="text"
                  placeholder="Detalle el porqué del ajuste..."
                  value={adjMotive}
                  onChange={(e) => setAdjMotive(e.target.value)}
                  className="h-10 bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
                  required
                />
              </div>

              <DialogFooter className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="flex-1 h-10 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submittingAdj}
                  className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
                >
                  {submittingAdj ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    'Confirmar Ajuste'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL TRANSFER (Create) */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6 flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <ArrowLeftRight className="h-6 w-6 text-indigo-400" />
              Solicitud de Transferencia de Inventario
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Cree un envío de traspaso de existencias entre sucursales.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransferSubmit} className="space-y-4 py-2 flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="grid grid-cols-2 gap-4 shrink-0">
              <div className="space-y-1.5">
                <Label htmlFor="trans-origin" className="text-xs font-semibold text-slate-300">Sucursal de Origen (Envía)</Label>
                <select
                  id="trans-origin"
                  value={tOrigin}
                  onChange={(e) => setTOrigin(e.target.value)}
                  className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-xl px-2.5 text-xs focus:outline-none"
                  required
                >
                  <option value="">Seleccione Origen</option>
                  {sucursales.filter(s => s.isActive).map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="trans-dest" className="text-xs font-semibold text-slate-300">Sucursal Destino (Recibe)</Label>
                <select
                  id="trans-dest"
                  value={tDest}
                  onChange={(e) => setTDest(e.target.value)}
                  className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-xl px-2.5 text-xs focus:outline-none"
                  required
                >
                  <option value="">Seleccione Destino</option>
                  {sucursales.filter(s => s.isActive && s.id !== tOrigin).map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Búsqueda rápida de producto */}
            <div className="space-y-2 shrink-0 border-t border-slate-800/60 pt-3">
              <Label className="text-xs font-semibold text-slate-300">Añadir Productos al Traspaso</Label>
              <div className="flex gap-2 relative">
                <Input
                  type="text"
                  placeholder="Buscar producto por nombre o código para agregar..."
                  value={tSearchProd}
                  onChange={(e) => setTSearchProd(e.target.value)}
                  className="h-10 bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
                />
                
                {tSearchProd.length >= 2 && (
                  <div className="absolute top-11 left-0 w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-850">
                    {productos.filter(p => 
                      p.nombre.toLowerCase().includes(tSearchProd.toLowerCase()) || 
                      p.codigo.toLowerCase().includes(tSearchProd.toLowerCase())
                    ).slice(0, 5).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddTransferItem(p.id)}
                        className="w-full text-left p-2.5 hover:bg-indigo-600 hover:text-white transition-colors text-xs font-medium flex justify-between"
                      >
                        <span>{p.nombre}</span>
                        <span className="font-mono text-indigo-400 bg-indigo-500/10 group-hover:text-white px-2 rounded-full">{p.codigo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Listado partidas de transferencia */}
            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-800 bg-slate-950 rounded-2xl p-3 space-y-2">
              {tItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 text-xs">
                  Agregue al menos un producto a la lista de transferencia utilizando el buscador de arriba.
                </div>
              ) : (
                tItems.map((item) => {
                  const prod = productos.find(p => p.id === item.productoId);
                  return (
                    <div key={item.productoId} className="flex justify-between items-center bg-slate-900 border border-slate-850 p-2.5 rounded-xl gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[9px] text-slate-500 block truncate">{prod?.codigo}</span>
                        <h5 className="text-xs font-bold text-white truncate leading-tight">{prod?.nombre}</h5>
                      </div>
                      
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-1 text-xs select-none">
                        <button 
                          type="button"
                          onClick={() => handleUpdateTransferQty(item.productoId, item.cantidad - 1)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center font-bold text-white font-mono">{item.cantidad}</span>
                        <button 
                          type="button"
                          onClick={() => handleUpdateTransferQty(item.productoId, item.cantidad + 1)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <Button
                        type="button"
                        onClick={() => handleRemoveTransferItem(item.productoId)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-rose-500 hover:bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-1.5 shrink-0 pt-2 border-t border-slate-800/60">
              <Label htmlFor="trans-obs" className="text-xs font-semibold text-slate-300">Observaciones</Label>
              <Input
                id="trans-obs"
                type="text"
                placeholder="Notas adicionales para el despacho (opcional)"
                value={tObs}
                onChange={(e) => setTObs(e.target.value)}
                className="h-10 bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="pt-2 shrink-0 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTransferModal(false)}
                className="flex-1 h-10 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingTransfer || tItems.length === 0}
                className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
              >
                {submittingTransfer ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Solicitando...
                  </>
                ) : (
                  'Registrar Solicitud'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL TRANSFER ACTION (Process Ship / Receive / Cancel) */}
      <Dialog open={showTransferActionModal} onOpenChange={setShowTransferActionModal}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              {processAction === 'enviar' && <Truck className="h-6 w-6 text-indigo-400" />}
              {processAction === 'recibir' && <CheckCircle className="h-6 w-6 text-emerald-400" />}
              {processAction === 'cancelar' && <XCircle className="h-6 w-6 text-rose-500" />}
              <span>
                {processAction === 'enviar' && 'Enviar Mercancía de Traspaso'}
                {processAction === 'recibir' && 'Recibir Mercancía de Traspaso'}
                {processAction === 'cancelar' && 'Anular/Cancelar Traspaso'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {processAction === 'enviar' && 'Indique las cantidades reales despachadas.'}
              {processAction === 'recibir' && 'Indique las cantidades reales recibidas en bodega.'}
              {processAction === 'cancelar' && 'Se revertirán las cantidades enviadas al stock de origen.'}
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <form onSubmit={handleTransferActionSubmit} className="space-y-4 py-2">
              
              <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-2xl flex flex-col space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase">Folio:</span>
                  <span className="font-mono text-white font-bold">{selectedTransfer.folio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase">De:</span>
                  <span className="text-white font-medium">{selectedTransfer.sucursalOrigen.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase">A:</span>
                  <span className="text-white font-medium">{selectedTransfer.sucursalDestino.nombre}</span>
                </div>
              </div>

              {/* Listado de partidas con inputs de cantidad */}
              {processAction !== 'cancelar' && (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  <Label className="text-xs font-semibold text-slate-300">Desglose de Partidas</Label>
                  {selectedTransfer.detalles.map((d) => (
                    <div key={d.id} className="flex justify-between items-center bg-slate-950 border border-slate-850 p-2.5 rounded-xl gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[9px] text-slate-500 block truncate">{d.producto.codigo}</span>
                        <h5 className="font-bold text-white truncate leading-tight">{d.producto.nombre}</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Solicitado: <span className="font-bold font-mono">{d.cantidadSolicitada}</span>
                          {processAction === 'recibir' && (
                            <>
                              {' '}· Enviado:{' '}
                              <span className="font-bold font-mono text-indigo-400">{d.cantidadEnviada}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="w-20 shrink-0">
                        <Input
                          type="number"
                          min="0"
                          value={actionQtyInputs[d.id] || ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setActionQtyInputs({
                              ...actionQtyInputs,
                              [d.id]: val
                            });
                          }}
                          className="h-8 bg-slate-900 border-slate-800 text-white font-mono text-center font-bold text-xs"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="act-obs" className="text-xs font-semibold text-slate-300">Notas/Comentarios</Label>
                <Input
                  id="act-obs"
                  type="text"
                  placeholder="Observaciones de esta acción..."
                  value={actionObs}
                  onChange={(e) => setActionObs(e.target.value)}
                  className="h-10 bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTransferActionModal(false)}
                  className="flex-1 h-10 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl"
                >
                  Cerrar
                </Button>
                <Button
                  type="submit"
                  disabled={submittingAction}
                  className={`flex-1 h-10 text-white font-semibold rounded-xl ${
                    processAction === 'enviar' ? 'bg-indigo-600 hover:bg-indigo-500' :
                    processAction === 'recibir' ? 'bg-emerald-600 hover:bg-emerald-500' :
                    'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submittingAction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      {processAction === 'enviar' && 'Enviar Mercancía'}
                      {processAction === 'recibir' && 'Recibir Mercancía'}
                      {processAction === 'cancelar' && 'Anular Traspaso'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
