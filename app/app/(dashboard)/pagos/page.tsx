'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Banknote, Search, Calendar, Filter, DollarSign, CreditCard,
  ArrowUpRight, Loader2, User, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const tipoPagoConfig: Record<string, { label: string; color: string; bg: string }> = {
  EFECTIVO:       { label: 'Efectivo',       color: 'text-green-400',  bg: 'bg-green-500/10' },
  TARJETA:        { label: 'Tarjeta',        color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  TRANSFERENCIA:  { label: 'Transferencia',  color: 'text-violet-400', bg: 'bg-violet-500/10' },
  CHEQUE:         { label: 'Cheque',         color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  OTRO:           { label: 'Otro',           color: 'text-slate-400',  bg: 'bg-slate-500/10' },
}

function currency(val: number | null | undefined): string {
  if (val == null) return '$0.00'
  return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PagosPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [pagos, setPagos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('month')
  const [tipoPago, setTipoPago] = useState('todos')
  const [page, setPage] = useState(1)
  const perPage = 30

  const fetchPagos = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('period', period)
      params.set('limit', '500')
      const res = await fetch(`/api/pagos?${params.toString()}`)
      if (!res.ok) throw new Error('Error al cargar pagos')
      const data = await res.json()
      setPagos(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error('Error al cargar los pagos')
      setPagos([])
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    if (session?.user) fetchPagos()
  }, [session, fetchPagos])

  // Filter locally
  const filtered = pagos.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      p.nombreCliente?.toLowerCase().includes(q) ||
      p.codigoCliente?.toLowerCase().includes(q) ||
      p.referencia?.toLowerCase().includes(q) ||
      p.folio?.toLowerCase().includes(q) ||
      p.cliente?.nombre?.toLowerCase().includes(q)
    const matchTipo = tipoPago === 'todos' || p.tipoPago === tipoPago
    return matchSearch && matchTipo
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const paginatedPagos = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

  // Stats
  const totalMonto = filtered.reduce((sum, p) => sum + (p.monto || 0), 0)
  const totalEfectivo = filtered.filter(p => p.tipoPago === 'EFECTIVO').reduce((sum, p) => sum + (p.monto || 0), 0)
  const totalTarjeta = filtered.filter(p => p.tipoPago === 'TARJETA').reduce((sum, p) => sum + (p.monto || 0), 0)
  const totalTransferencia = filtered.filter(p => p.tipoPago === 'TRANSFERENCIA').reduce((sum, p) => sum + (p.monto || 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Pagos Registrados
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Todos los cobros recibidos de clientes — POS, Cobranza Móvil y Ventanilla
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPagos}
          className="border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Total Cobrado" value={currency(totalMonto)} color="emerald" count={filtered.length} />
        <StatCard icon={Banknote} label="Efectivo" value={currency(totalEfectivo)} color="green" />
        <StatCard icon={CreditCard} label="Tarjeta" value={currency(totalTarjeta)} color="blue" />
        <StatCard icon={ArrowUpRight} label="Transferencia" value={currency(totalTransferencia)} color="violet" />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por cliente, folio, referencia..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-600 h-9"
          />
        </div>
        <Select value={period} onValueChange={v => { setPeriod(v); setPage(1) }}>
          <SelectTrigger className="w-[140px] bg-slate-900/60 border-slate-800 text-slate-300 h-9">
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="month">Mes</SelectItem>
            <SelectItem value="all">Todo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipoPago} onValueChange={v => { setTipoPago(v); setPage(1) }}>
          <SelectTrigger className="w-[150px] bg-slate-900/60 border-slate-800 text-slate-300 h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="EFECTIVO">Efectivo</SelectItem>
            <SelectItem value="TARJETA">Tarjeta</SelectItem>
            <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
            <SelectItem value="CHEQUE">Cheque</SelectItem>
            <SelectItem value="OTRO">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <Card className="bg-slate-900/60 border-slate-800/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
            </div>
          ) : paginatedPagos.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Banknote className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No se encontraron pagos</p>
              <p className="text-xs mt-1">Ajusta los filtros o el período de búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800/50 hover:bg-transparent">
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Folio / Ref.</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Fecha</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Cliente</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tipo</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Monto</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Gestor</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPagos.map(pago => {
                    const tp = tipoPagoConfig[pago.tipoPago] || tipoPagoConfig.OTRO
                    return (
                      <TableRow key={pago.id} className="border-slate-800/30 hover:bg-slate-800/30 cursor-pointer group">
                        <TableCell>
                          <p className="text-xs text-indigo-400 font-mono font-semibold">{pago.folio || '—'}</p>
                          <p className="text-[10px] text-slate-600 truncate max-w-[120px]">{pago.referencia}</p>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {pago.fechaPago ? format(new Date(pago.fechaPago), 'dd/MM/yy HH:mm', { locale: es }) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-white font-medium truncate max-w-[150px]">
                                {pago.nombreCliente || pago.cliente?.nombre || '—'}
                              </p>
                              <p className="text-[10px] text-slate-500">{pago.codigoCliente || pago.cliente?.codigoCliente || ''}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${tp.bg} ${tp.color} border-none text-[10px] px-2 py-0.5`}>
                            {tp.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-bold text-emerald-400">{currency(pago.monto)}</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 truncate max-w-[100px]">
                          {pago.gestorNombre || pago.gestor?.name || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {pago.verificado ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[10px] px-1.5 py-0.5">Verificado</Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-400 border-none text-[10px] px-1.5 py-0.5">Pendiente</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
              <span className="text-xs text-slate-500">
                Mostrando {((currentPage - 1) * perPage) + 1}–{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-7 w-7 p-0 border-slate-700 bg-slate-800/50 text-slate-400"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="flex items-center px-2 text-xs text-slate-400">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-7 w-7 p-0 border-slate-700 bg-slate-800/50 text-slate-400"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, color, count }: { icon: React.ElementType; label: string; value: string; color: string; count?: number }) {
  const colorMap: Record<string, { bg: string; text: string; iconColor: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', iconColor: 'text-emerald-400' },
    green:   { bg: 'bg-green-500/10',   text: 'text-green-400',   iconColor: 'text-green-400' },
    blue:    { bg: 'bg-blue-500/10',     text: 'text-blue-400',    iconColor: 'text-blue-400' },
    violet:  { bg: 'bg-violet-500/10',   text: 'text-violet-400',  iconColor: 'text-violet-400' },
  }
  const c = colorMap[color] || colorMap.emerald
  return (
    <div className={`${c.bg} rounded-xl border border-slate-800/40 p-3 flex items-center gap-3`}>
      <Icon className={`h-5 w-5 ${c.iconColor} shrink-0`} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className={`text-lg font-black ${c.text} truncate`}>{value}</p>
        {count != null && <p className="text-[10px] text-slate-500">{count} pagos</p>}
      </div>
    </div>
  )
}
