'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft, Search, Trash2, Plus, ShoppingBag, User,
  CreditCard, Package, RefreshCw, AlertTriangle
} from 'lucide-react';

interface Cliente {
  id: string;
  codigoCliente: string;
  nombre: string;
  telefono1?: string;
  saldoActual: number;
  limiteCredito?: number;
  limite_credito?: number;
  rfc?: string;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precio1: number;
  precio2: number;
  precio3: number;
  precio4: number;
  precio5: number;
  stock: number;
  unidadMedida: string;
  categoria?: string;
}

interface Partida {
  productoId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  precioKey: string;
  descuento: number;
  stockMaximo: number;
  unidadMedida: string;
  precios: { [k: string]: number };
}

export default function NuevaVentaPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Cliente
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<Cliente[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const clientRef = useRef<HTMLDivElement>(null);

  // Productos
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Producto[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [showProductDrop, setShowProductDrop] = useState(false);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const productRef = useRef<HTMLDivElement>(null);

  // Condiciones de venta
  const [pagoInicial, setPagoInicial] = useState(0);
  const [periodicidad, setPeriodicidad] = useState<'SEMANAL' | 'QUINCENAL' | 'MENSUAL'>('SEMANAL');
  const [montoPago, setMontoPago] = useState(0);
  const [diasGracia, setDiasGracia] = useState(0);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [aplicarInventario, setAplicarInventario] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  // ── Click outside dropdowns ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientDrop(false);
      if (productRef.current && !productRef.current.contains(e.target as Node)) setShowProductDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Client search debounce ──
  useEffect(() => {
    const q = clientSearch.trim();
    if (q.length < 2) { setClientResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingClients(true);
      try {
        const res = await fetch(`/api/clientes/search?q=${encodeURIComponent(q)}&limit=15`);
        if (res.ok) {
          const data: any[] = await res.json();
          setClientResults(data.map(c => ({
            ...c,
            limiteCredito: c.limiteCredito ?? c.limite_credito ?? 0,
            saldoActual: c.saldoActual ?? c.saldo_actualcli ?? 0,
          })));
        }
      } finally { setSearchingClients(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [clientSearch]);

  // ── Product search debounce ──
  useEffect(() => {
    const q = productSearch.trim();
    if (!q) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await fetch(`/api/productos?search=${encodeURIComponent(q)}&activos=true&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setProductResults(data.productos || []);
        }
      } finally { setSearchingProducts(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  // ── Totals ──
  const subtotal = partidas.reduce((acc, p) => acc + (p.cantidad * p.precioUnitario - p.descuento), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const saldoPendiente = Math.max(0, total - pagoInicial);
  const numeroPagos = montoPago > 0 ? Math.ceil(saldoPendiente / montoPago) : saldoPendiente > 0 ? 1 : 0;

  // ── Add product ──
  const addProduct = (p: Producto) => {
    if (partidas.some(x => x.productoId === p.id)) { toast.warning('Ya está en la venta'); return; }
    setPartidas(prev => [...prev, {
      productoId: p.id, codigo: p.codigo, nombre: p.nombre,
      cantidad: 1, precioUnitario: p.precio1, precioKey: 'precio1',
      descuento: 0, stockMaximo: p.stock, unidadMedida: p.unidadMedida || 'Pz',
      precios: { precio1: p.precio1, precio2: p.precio2, precio3: p.precio3, precio4: p.precio4, precio5: p.precio5 },
    }]);
    setProductSearch(''); setProductResults([]); setShowProductDrop(false);
    toast.success(`${p.nombre} agregado`);
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) { toast.error('Selecciona un cliente'); return; }
    if (partidas.length === 0) { toast.error('Agrega al menos un producto'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: selectedCliente.id,
          detalles: partidas.map(p => ({
            productoId: p.productoId,
            cantidad: p.cantidad,
            precioUnitario: p.precioUnitario,
            descuento: p.descuento,
          })),
          pagoInicial,
          periodicidadPago: periodicidad,
          montoPago: montoPago || undefined,
          diasGracia,
          numeroFactura: numeroFactura || undefined,
          observaciones: observaciones || undefined,
          aplicarInventario,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Venta ${data.data.folio} creada`);
        router.push('/ventas');
      } else {
        toast.error(data.error || 'Error al crear venta');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) return <div className="p-6 text-slate-400">Cargando sesión...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header title="Nueva Venta" description="Registra una venta directa con sistema de pagarés" />

      <form onSubmit={handleSubmit} className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Back */}
        <button type="button" onClick={() => router.push('/ventas')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> Volver a Ventas
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column ── */}
          <div className="space-y-4">

            {/* Cliente */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-400" /> Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedCliente ? (
                  <div ref={clientRef} className="relative space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <Input placeholder="Nombre, código o RFC..." value={clientSearch}
                        onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); }}
                        onFocus={() => setShowClientDrop(true)}
                        className="pl-9 bg-slate-800 border-slate-700 text-slate-200 text-sm h-9" />
                    </div>
                    {showClientDrop && clientSearch.trim().length >= 2 && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {searchingClients ? (
                          <div className="p-3 text-xs text-slate-500 text-center">Buscando...</div>
                        ) : clientResults.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">Sin resultados</div>
                        ) : clientResults.map(c => (
                          <button key={c.id} type="button"
                            onClick={() => { setSelectedCliente(c); setShowClientDrop(false); setClientSearch(''); }}
                            className="w-full px-3 py-2.5 text-left hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0">
                            <p className="text-xs font-semibold text-slate-200">{c.nombre}</p>
                            <p className="text-[10px] text-slate-500">{c.codigoCliente}{c.rfc ? ` · RFC: ${c.rfc}` : ''}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {showClientDrop && clientSearch.trim().length === 1 && (
                      <p className="text-[10px] text-slate-600 px-1">Escribe al menos 2 caracteres</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-800 rounded-xl border border-indigo-500/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-white">{selectedCliente.nombre}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedCliente.codigoCliente}</p>
                        </div>
                        <button type="button" onClick={() => setSelectedCliente(null)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer">
                          Cambiar
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-700">
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Saldo</p>
                          <p className={`text-xs font-bold ${(selectedCliente.saldoActual ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ${(selectedCliente.saldoActual ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Límite</p>
                          <p className="text-xs font-bold text-slate-300">${(selectedCliente.limiteCredito ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Condiciones de pago */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" /> Condiciones de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pago Inicial / Enganche</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input type="number" min={0} value={pagoInicial}
                      onChange={e => setPagoInicial(parseFloat(e.target.value) || 0)}
                      className="pl-7 bg-slate-800 border-slate-700 text-slate-200 h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Periodicidad de Pago</Label>
                  <Select value={periodicidad} onValueChange={(v: any) => setPeriodicidad(v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                      <SelectItem value="SEMANAL">Semanal</SelectItem>
                      <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                      <SelectItem value="MENSUAL">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monto por Pago</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input type="number" min={0} value={montoPago}
                      onChange={e => setMontoPago(parseFloat(e.target.value) || 0)}
                      placeholder="0 = un solo pago"
                      className="pl-7 bg-slate-800 border-slate-700 text-slate-200 h-9 text-sm placeholder:text-slate-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Días de Gracia</Label>
                  <Input type="number" min={0} value={diasGracia}
                    onChange={e => setDiasGracia(parseInt(e.target.value) || 0)}
                    className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-sm" />
                </div>

                {/* Preview pagarés */}
                {saldoPendiente > 0 && (
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-1.5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Resumen de Pagarés</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Saldo a financiar</span>
                      <span className="text-white font-bold">${saldoPendiente.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Número de pagarés</span>
                      <span className="text-indigo-400 font-bold">{numeroPagos}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Periodicidad</span>
                      <span className="text-slate-300">{periodicidad.toLowerCase()}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">N° Factura (Opcional)</Label>
                  <Input value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)}
                    placeholder="Ej. A-0001"
                    className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-sm placeholder:text-slate-600" />
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-800/40 rounded-xl">
                  <input type="checkbox" id="inventario" checked={aplicarInventario}
                    onChange={e => setAplicarInventario(e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-500" />
                  <label htmlFor="inventario" className="text-xs text-slate-300 cursor-pointer">
                    Descontar del inventario al crear
                  </label>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Observaciones</Label>
                  <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                    rows={2} placeholder="Indicaciones especiales..."
                    className="bg-slate-800 border-slate-700 text-slate-200 text-sm placeholder:text-slate-600 resize-none" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right column: products ── */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-400" /> Partidas de Venta
                    {partidas.length > 0 && (
                      <Badge className="bg-blue-500/20 text-blue-300 text-[10px]">{partidas.length}</Badge>
                    )}
                  </CardTitle>
                  {/* Product search */}
                  <div ref={productRef} className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <Input placeholder="Buscar producto..." value={productSearch}
                      onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); }}
                      onFocus={() => setShowProductDrop(true)}
                      className="pl-9 bg-slate-800 border-slate-700 text-slate-200 text-sm h-9" />
                    {showProductDrop && productSearch && (
                      <div className="absolute right-0 z-50 w-96 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {searchingProducts ? (
                          <div className="p-3 text-xs text-slate-500 text-center">Buscando...</div>
                        ) : productResults.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">Sin resultados</div>
                        ) : productResults.map(p => (
                          <button key={p.id} type="button" onClick={() => addProduct(p)}
                            className="w-full px-3 py-2.5 text-left hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0 flex justify-between items-center gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate">{p.nombre}</p>
                              <p className="text-[10px] text-slate-500">{p.codigo} · Stock: {p.stock} {p.unidadMedida}</p>
                            </div>
                            <span className="text-xs font-bold text-emerald-400 shrink-0">${p.precio1.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {partidas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                    <ShoppingBag className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm font-medium text-slate-500">Sin productos</p>
                    <p className="text-xs mt-1">Usa el buscador para agregar artículos</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <th className="text-left py-2.5 px-4">Producto</th>
                          <th className="text-center py-2.5 px-3 w-24">Cant.</th>
                          <th className="text-left py-2.5 px-3 w-44">Precio</th>
                          <th className="text-right py-2.5 px-3 w-24">Desc. $</th>
                          <th className="text-right py-2.5 px-4 w-28">Subtotal</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {partidas.map((p, i) => {
                          const rowSub = p.cantidad * p.precioUnitario - p.descuento;
                          return (
                            <tr key={p.productoId} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-4">
                                <p className="text-xs font-semibold text-slate-200">{p.nombre}</p>
                                <p className="text-[10px] text-slate-500 font-mono">{p.codigo} · Stock: {p.stockMaximo}</p>
                              </td>
                              <td className="py-2.5 px-3">
                                <Input type="number" min={0.01} step="any" value={p.cantidad}
                                  onChange={e => setPartidas(prev => prev.map((x, j) => j === i ? { ...x, cantidad: parseFloat(e.target.value) || 1 } : x))}
                                  className="h-8 text-center text-xs bg-slate-800 border-slate-700 text-white w-20 mx-auto" />
                              </td>
                              <td className="py-2.5 px-3">
                                <Select value={p.precioKey}
                                  onValueChange={v => setPartidas(prev => prev.map((x, j) => j === i ? {
                                    ...x, precioKey: v,
                                    precioUnitario: v === 'custom' ? x.precioUnitario : x.precios[v] ?? x.precioUnitario
                                  } : x))}>
                                  <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 text-xs">
                                    {['precio1','precio2','precio3','precio4','precio5'].map(k => (
                                      <SelectItem key={k} value={k}>
                                        P{k.slice(-1)}: ${(p.precios[k] ?? 0).toFixed(2)}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="custom">Personalizado</SelectItem>
                                  </SelectContent>
                                </Select>
                                {p.precioKey === 'custom' && (
                                  <Input type="number" min={0} step="any" value={p.precioUnitario}
                                    onChange={e => setPartidas(prev => prev.map((x, j) => j === i ? { ...x, precioUnitario: parseFloat(e.target.value) || 0 } : x))}
                                    className="h-8 text-xs bg-slate-800 border-slate-700 text-white mt-1" />
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <Input type="number" min={0} step="any" value={p.descuento || ''}
                                  placeholder="0"
                                  onChange={e => setPartidas(prev => prev.map((x, j) => j === i ? { ...x, descuento: parseFloat(e.target.value) || 0 } : x))}
                                  className="h-8 text-right text-xs bg-slate-800 border-slate-700 text-white w-20 ml-auto" />
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <span className="text-xs font-bold text-white">${rowSub.toFixed(2)}</span>
                              </td>
                              <td className="py-2.5 px-2">
                                <button type="button" onClick={() => setPartidas(prev => prev.filter((_, j) => j !== i))}
                                  className="text-slate-600 hover:text-rose-400 transition-colors cursor-pointer">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>

              {/* Totals */}
              {partidas.length > 0 && (
                <div className="border-t border-slate-800 p-4 bg-slate-900/50 flex flex-col md:flex-row justify-between items-end gap-4">
                  <div className="text-xs text-slate-500">{partidas.length} partida{partidas.length !== 1 ? 's' : ''}</div>
                  <div className="w-full md:w-72 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>IVA (16%)</span><span>${iva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white text-sm border-t border-slate-700 pt-2 mt-2">
                      <span>Total</span><span>${total.toFixed(2)}</span>
                    </div>
                    {pagoInicial > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Pago inicial</span><span>-${pagoInicial.toFixed(2)}</span>
                      </div>
                    )}
                    {saldoPendiente > 0 && (
                      <div className="flex justify-between font-bold text-amber-400">
                        <span>Saldo a financiar</span><span>${saldoPendiente.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-slate-800 p-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => router.push('/ventas')}
                  className="border-slate-700 text-slate-300 hover:text-white" disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit"
                  disabled={submitting || !selectedCliente || partidas.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6">
                  {submitting ? (
                    <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Creando...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Crear Venta</span>
                  )}
                </Button>
              </div>
            </Card>

            {/* Advertencia de stock */}
            {partidas.some(p => p.cantidad > p.stockMaximo) && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300">
                  <p className="font-bold">Advertencia de stock</p>
                  <p className="text-amber-400/80 mt-0.5">
                    {partidas.filter(p => p.cantidad > p.stockMaximo).map(p => p.nombre).join(', ')} supera el stock disponible.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
