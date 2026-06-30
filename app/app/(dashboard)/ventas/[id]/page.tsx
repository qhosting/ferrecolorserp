'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft, User, CalendarDays, Package, CreditCard, FileText,
  DollarSign, AlertTriangle, CheckCircle, XCircle, Clock,
  Receipt, ShieldCheck, Banknote, Building2, ArrowDownRight,
  Loader2, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RouteParams {
  params: { id: string }
}

const statusConfig: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ElementType }> = {
  PENDIENTE:  { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30', label: 'Pendiente',  icon: Clock },
  CONFIRMADA: { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',  label: 'Confirmada', icon: CheckCircle },
  ENTREGADA:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Entregada', icon: Package },
  CANCELADA:  { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',   label: 'Cancelada',  icon: XCircle },
  PAGADA:     { color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/30', label: 'Pagada',     icon: CheckCircle },
}

const tipoPagoLabel: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
  OTRO: 'Otro',
}

function currency(val: number | null | undefined): string {
  if (val == null) return '$0.00'
  return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function VentaDetailPage({ params }: RouteParams) {
  const { data: session } = useSession()
  const router = useRouter()
  const [venta, setVenta] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchVenta = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/ventas/${params.id}`)
      if (!res.ok) {
        toast.error('Venta no encontrada')
        router.push('/ventas')
        return
      }
      const json = await res.json()
      if (json.success) {
        setVenta(json.data)
        setStats(json.data.estadisticas)
      } else {
        toast.error(json.error || 'Error al obtener la venta')
        router.push('/ventas')
      }
    } catch {
      toast.error('Error de conexión al servidor')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    if (session?.user) fetchVenta()
  }, [session, fetchVenta])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  if (!venta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-400">No se pudo cargar la venta</p>
        <Button onClick={() => router.push('/ventas')} variant="outline">Volver a Ventas</Button>
      </div>
    )
  }

  const sc = statusConfig[venta.status] || statusConfig.PENDIENTE
  const StatusIcon = sc.icon
  const fechaVenta = format(new Date(venta.fechaVenta), "dd MMM yyyy, hh:mm a", { locale: es })

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/ventas')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                {venta.folio}
              </h1>
              <Badge className={`${sc.bg} ${sc.color} ${sc.border} border px-3 py-1 font-semibold text-xs rounded-full`}>
                <StatusIcon className="h-3 w-3 mr-1.5" />
                {sc.label}
              </Badge>
              {venta.ventaPOS && (
                <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 border px-2 py-1 text-xs rounded-full">
                  <Receipt className="h-3 w-3 mr-1" /> POS #{venta.ventaPOS.numeroTicket}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Registrada el {fechaVenta}</p>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={DollarSign} label="Total Venta" value={currency(venta.total)} color="indigo" />
          <StatCard icon={Banknote} label="Total Pagado" value={currency(stats.totalPagado)} color="emerald" />
          <StatCard icon={AlertTriangle} label="Saldo Pendiente" value={currency(stats.saldoRestante)} color={stats.saldoRestante > 0 ? 'amber' : 'emerald'} />
          <StatCard icon={CreditCard} label="Pagarés Vencidos" value={stats.pagaresVencidos.toString()} color={stats.pagaresVencidos > 0 ? 'red' : 'slate'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Client & Meta ── */}
        <div className="space-y-5">
          {/* Client */}
          <Card className="bg-slate-900/60 border-slate-800/60">
            <CardHeader className="pb-3 border-b border-slate-800/50">
              <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-400" /> Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre</span>
                <p className="text-white font-semibold">{venta.cliente.nombre}</p>
                <span className="text-xs text-slate-500">Código: {venta.cliente.codigoCliente}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-800/50 pt-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Teléfono</span>
                  <p className="text-slate-300 text-xs">{venta.cliente.telefono1 || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</span>
                  <p className="text-slate-300 text-xs truncate">{venta.cliente.email || '—'}</p>
                </div>
              </div>
              {(venta.cliente.calle || venta.cliente.colonia) && (
                <div className="border-t border-slate-800/50 pt-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirección</span>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {[venta.cliente.calle, venta.cliente.numeroExterior, venta.cliente.colonia, venta.cliente.municipio, venta.cliente.estado].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sale metadata */}
          <Card className="bg-slate-900/60 border-slate-800/60">
            <CardHeader className="pb-3 border-b border-slate-800/50">
              <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-indigo-400" /> Información de la Venta
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5 text-xs">
              <InfoRow label="Vendedor" value={venta.vendedor?.name || '—'} />
              <InfoRow label="Sucursal" value={venta.sucursal?.nombre || '—'} />
              <InfoRow label="Periodicidad" value={venta.periodicidadPago} />
              <InfoRow label="Monto por Pago" value={currency(venta.montoPago)} />
              <InfoRow label="Num. Pagos" value={venta.numeroPagos?.toString()} />
              <InfoRow label="Pago Inicial" value={currency(venta.pagoInicial)} />
              {venta.pedidoOrigen && (
                <div className="border-t border-slate-800/50 pt-2.5 mt-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pedido Origen</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-indigo-400 text-xs"
                    onClick={() => router.push(`/pedidos/${venta.pedidoOrigen.id}`)}
                  >
                    {venta.pedidoOrigen.folio} <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
              {venta.observaciones && (
                <div className="border-t border-slate-800/50 pt-2.5 mt-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observaciones</span>
                  <p className="text-slate-400 mt-0.5 whitespace-pre-wrap">{venta.observaciones}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CONTPAQi info */}
          {(venta.contpaqiDocId || venta.contpaqiSerie) && (
            <Card className="bg-slate-900/60 border-slate-800/60">
              <CardHeader className="pb-3 border-b border-slate-800/50">
                <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-violet-400" /> CONTPAQi
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-xs">
                <InfoRow label="Doc ID" value={venta.contpaqiDocId?.toString()} />
                <InfoRow label="Serie" value={venta.contpaqiSerie} />
                <InfoRow label="Folio" value={venta.contpaqiFolio?.toString()} />
                <InfoRow label="Concepto" value={venta.contpaqiConcepto} />
                <InfoRow label="Timbrado" value={venta.timbrado ? 'Sí' : 'No'} />
                {venta.uuid && <InfoRow label="UUID" value={venta.uuid} />}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Products, Payments, Pagarés ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Products Table */}
          <Card className="bg-slate-900/60 border-slate-800/60">
            <CardHeader className="border-b border-slate-800/50">
              <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Package className="h-4 w-4 text-cyan-400" />
                Partidas ({venta.detalles?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800/50 hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Producto</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Cant.</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">P. Unit.</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Desc.</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venta.detalles?.map((d: any) => (
                      <TableRow key={d.id} className="border-slate-800/30 hover:bg-slate-800/30">
                        <TableCell>
                          <p className="text-sm text-white font-medium">{d.producto?.nombre}</p>
                          <span className="text-[10px] text-slate-500">{d.producto?.codigo}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-300 font-medium">
                          {d.cantidad} <span className="text-[10px] text-slate-500">{d.producto?.unidadMedida || 'Pz'}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-300">{currency(d.precioUnitario)}</TableCell>
                        <TableCell className="text-right text-sm text-slate-500">{currency(d.descuento)}</TableCell>
                        <TableCell className="text-right text-sm text-white font-bold">{currency(d.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Totals */}
              <div className="border-t border-slate-800/50 p-4 flex justify-end">
                <div className="w-72 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span><span className="text-slate-200">{currency(venta.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>IVA:</span><span className="text-slate-200">{currency(venta.iva)}</span>
                  </div>
                  {venta.descuento > 0 && (
                    <div className="flex justify-between text-red-400">
                      <span>Descuento:</span><span>-{currency(venta.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-white border-t border-slate-800/50 pt-2 mt-2 text-base">
                    <span>Total:</span><span>{currency(venta.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments (Pagos) */}
          {venta.pagos && venta.pagos.length > 0 && (
            <Card className="bg-slate-900/60 border-slate-800/60">
              <CardHeader className="border-b border-slate-800/50">
                <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-400" />
                  Pagos Registrados ({venta.pagos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800/50 hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Folio</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Fecha</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tipo</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Monto</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Concepto</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Gestor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venta.pagos.map((p: any) => (
                      <TableRow key={p.id} className="border-slate-800/30 hover:bg-slate-800/30">
                        <TableCell className="text-xs text-indigo-400 font-mono">{p.folio || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {format(new Date(p.fechaPago), 'dd/MM/yy', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-slate-800 border-slate-700 text-slate-300 text-[10px] px-1.5 py-0.5">
                            {tipoPagoLabel[p.tipoPago] || p.tipoPago}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-emerald-400">{currency(p.monto)}</TableCell>
                        <TableCell className="text-xs text-slate-400 max-w-[120px] truncate">{p.concepto || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-400">{p.gestor?.name || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* POS Payment Info */}
          {venta.ventaPOS && (
            <Card className="bg-slate-900/60 border-slate-800/60">
              <CardHeader className="border-b border-slate-800/50">
                <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-cyan-400" /> Cobro en Ventanilla POS
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-xs">
                <InfoRow label="Ticket" value={`#${venta.ventaPOS.numeroTicket}`} />
                <InfoRow label="Pago Efectivo" value={currency(venta.ventaPOS.pagoEfectivo)} />
                <InfoRow label="Pago Tarjeta" value={currency(venta.ventaPOS.pagoTarjeta)} />
                {venta.ventaPOS.referenciaTerminal && <InfoRow label="Ref. Terminal" value={venta.ventaPOS.referenciaTerminal} />}
                <InfoRow label="Cambio" value={currency(venta.ventaPOS.cambio)} />
                <InfoRow label="Lista Precio" value={`#${venta.ventaPOS.listaPrecioUsada}`} />
              </CardContent>
            </Card>
          )}

          {/* Pagarés */}
          {venta.pagares && venta.pagares.length > 0 && (
            <Card className="bg-slate-900/60 border-slate-800/60">
              <CardHeader className="border-b border-slate-800/50">
                <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-rose-400" />
                  Pagarés ({venta.pagares.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800/50 hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">#</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Vencimiento</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Monto</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Estatus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venta.pagares.map((pg: any) => {
                      const pagareStatus: Record<string, { color: string; bg: string }> = {
                        PENDIENTE: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        PARCIAL: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        PAGADO: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                        VENCIDO: { color: 'text-red-400', bg: 'bg-red-500/10' },
                        CANCELADO: { color: 'text-slate-400', bg: 'bg-slate-500/10' },
                      }
                      const ps = pagareStatus[pg.estatus] || pagareStatus.PENDIENTE
                      return (
                        <TableRow key={pg.id} className="border-slate-800/30 hover:bg-slate-800/30">
                          <TableCell className="text-xs text-white font-mono">#{pg.numeroPago}</TableCell>
                          <TableCell className="text-xs text-slate-300">
                            {format(new Date(pg.fechaVencimiento), 'dd/MM/yy', { locale: es })}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold text-white">{currency(pg.monto)}</TableCell>
                          <TableCell>
                            <Badge className={`${ps.bg} ${ps.color} border-none text-[10px] px-2 py-0.5`}>
                              {pg.estatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Notas de Cargo / Crédito */}
          {((venta.notasCargo && venta.notasCargo.length > 0) || (venta.notasCredito && venta.notasCredito.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venta.notasCargo && venta.notasCargo.length > 0 && (
                <Card className="bg-slate-900/60 border-slate-800/60">
                  <CardHeader className="pb-3 border-b border-slate-800/50">
                    <CardTitle className="text-xs font-bold text-rose-400 flex items-center gap-2">
                      <ArrowDownRight className="h-3.5 w-3.5" /> Notas de Cargo ({venta.notasCargo.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-2">
                    {venta.notasCargo.map((n: any) => (
                      <div key={n.id} className="flex justify-between items-center text-xs border-b border-slate-800/30 pb-2">
                        <div>
                          <p className="text-slate-300 font-medium">{n.folio}</p>
                          <p className="text-slate-500">{n.concepto}</p>
                        </div>
                        <span className="text-rose-400 font-bold">{currency(n.monto)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {venta.notasCredito && venta.notasCredito.length > 0 && (
                <Card className="bg-slate-900/60 border-slate-800/60">
                  <CardHeader className="pb-3 border-b border-slate-800/50">
                    <CardTitle className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                      <ArrowDownRight className="h-3.5 w-3.5" /> Notas de Crédito ({venta.notasCredito.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-2">
                    {venta.notasCredito.map((n: any) => (
                      <div key={n.id} className="flex justify-between items-center text-xs border-b border-slate-800/30 pb-2">
                        <div>
                          <p className="text-slate-300 font-medium">{n.folio}</p>
                          <p className="text-slate-500">{n.concepto}</p>
                        </div>
                        <span className="text-emerald-400 font-bold">{currency(n.monto)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Garantías */}
          {venta.garantias && venta.garantias.length > 0 && (
            <Card className="bg-slate-900/60 border-slate-800/60">
              <CardHeader className="pb-3 border-b border-slate-800/50">
                <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-violet-400" /> Garantías ({venta.garantias.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {venta.garantias.map((g: any) => (
                  <div key={g.id} className="flex justify-between items-center text-xs border-b border-slate-800/30 pb-2">
                    <div>
                      <p className="text-slate-300 font-medium">{g.folio} — {g.producto?.nombre}</p>
                      <p className="text-slate-500">{g.tipoGarantia} · Vence: {format(new Date(g.fechaFinGarantia), 'dd/MM/yy', { locale: es })}</p>
                    </div>
                    <Badge className={`text-[10px] px-2 py-0.5 ${g.estatus === 'ACTIVA' ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {g.estatus}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Reusable sub-components ─── */

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-800/30 pb-2">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="text-slate-200 font-semibold text-right max-w-[60%] truncate" title={value || ''}>{value || '—'}</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; iconColor: string }> = {
    indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  iconColor: 'text-indigo-400' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', iconColor: 'text-emerald-400' },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   iconColor: 'text-amber-400' },
    red:     { bg: 'bg-red-500/10',      text: 'text-red-400',     iconColor: 'text-red-400' },
    slate:   { bg: 'bg-slate-500/10',    text: 'text-slate-400',   iconColor: 'text-slate-400' },
  }
  const c = colorMap[color] || colorMap.slate
  return (
    <div className={`${c.bg} rounded-xl border border-slate-800/40 p-3 flex items-center gap-3`}>
      <Icon className={`h-5 w-5 ${c.iconColor} shrink-0`} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className={`text-lg font-black ${c.text} truncate`}>{value}</p>
      </div>
    </div>
  )
}
