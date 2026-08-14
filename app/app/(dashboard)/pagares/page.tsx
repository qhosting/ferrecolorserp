'use client'

import React, { useState, useEffect } from 'react'
import { Header } from '@/components/navigation/header'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Printer, MessageCircle, FileText, Download } from 'lucide-react'
import { toast } from "sonner"
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Pagare {
  id: string
  numeroPago: number
  monto: number
  montoPagado: number
  fechaVencimiento: string
  estatus: string
  diasVencido: number
  interesesCalculados: number
  montoTotal: number
  saldoPendiente: number
  venta: {
    folio: string
    cliente: {
      codigoCliente: string
      nombre: string
      telefono1?: string
      rfc?: string
      direccion?: string
    }
  }
}

const statusColors = {
  'PENDIENTE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  'PARCIAL': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  'PAGADO': 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  'VENCIDO': 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  'CANCELADO': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-400'
}

export default function PagaresPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [pagares, setPagares] = useState<Pagare[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Estado para el modal legal de pagaré
  const [selectedPagareModal, setSelectedPagareModal] = useState<Pagare | null>(null)

  // Cargar pagarés
  const fetchPagares = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15'
      })

      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'todos') params.append('estatus', statusFilter)
      if (statusFilter === 'VENCIDO' || statusFilter === 'vencidos') params.append('soloVencidos', 'true')

      const response = await fetch(`/api/pagares?${params}`)
      const data = await response.json()

      if (data.success) {
        setPagares(data.data.pagares)
        setTotalPages(data.data.pagination.totalPages)
      } else {
        toast.error(data.error || 'Error al cargar pagarés')
      }
    } catch (error) {
      toast.error('Error al cargar pagarés')
    } finally {
      setLoading(false)
    }
  }

  // Efectos
  useEffect(() => {
    fetchPagares(1)
    setCurrentPage(1)
  }, [statusFilter, searchTerm])

  useEffect(() => {
    fetchPagares(currentPage)
  }, [currentPage])

  // Aplicar pago
  const handleAplicarPago = (pagareId: string) => {
    router.push(`/cobranza-movil?pagareId=${pagareId}`)
  }

  // Enviar recordatorio por WhatsApp
  const handleEnviarWhatsApp = (pagare: Pagare) => {
    const tel = (pagare.venta.cliente.telefono1 || '').replace(/\D/g, '')
    if (!tel) {
      toast.error('El cliente no tiene teléfono registrado')
      return
    }
    const cleanTel = tel.length === 10 ? `52${tel}` : tel
    const mensaje = encodeURIComponent(
      `Hola *${pagare.venta.cliente.nombre}*, le saludamos de FerreColors. Le recordamos amablemente su pagaré pendiente con folio *${pagare.venta.folio} (Pago #${pagare.numeroPago})* por un saldo de *$${pagare.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}*. Vencimiento: ${format(new Date(pagare.fechaVencimiento), 'dd/MM/yyyy')}. Gracias por su preferencia.`
    )
    window.open(`https://wa.me/${cleanTel}?text=${mensaje}`, '_blank')
  }

  // Estadísticas
  const estadisticas = pagares.reduce(
    (acc, pagare) => {
      acc.total++
      acc.montoTotal += pagare.monto
      acc.montoPagado += pagare.montoPagado
      acc.saldoPendiente += pagare.saldoPendiente
      acc.interesesMora += pagare.interesesCalculados

      if (pagare.estatus === 'VENCIDO') {
        acc.vencidos++
      } else if (pagare.estatus === 'PENDIENTE') {
        acc.pendientes++
      }

      return acc
    },
    { 
      total: 0, 
      vencidos: 0, 
      pendientes: 0, 
      montoTotal: 0, 
      montoPagado: 0, 
      saldoPendiente: 0, 
      interesesMora: 0 
    }
  )

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header 
        title="Gestión de Pagarés" 
        description="Control de pagarés de crédito, intereses moratorios y aplicación de pagos"
      />
      <div className="p-6 space-y-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pagarés</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.total}</div>
              <p className="text-xs text-muted-foreground">
                {estadisticas.pendientes} pendientes, {estadisticas.vencidos} vencidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${estadisticas.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Pagado: ${estadisticas.montoPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
              <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ${estadisticas.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Por cobrar en cartera
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Intereses Moratorios</CardTitle>
              <ClockIcon className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${estadisticas.interesesMora.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Calculados al día de hoy
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y Búsqueda */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, folio de venta o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                  <SelectItem value="VENCIDO">Vencidos</SelectItem>
                  <SelectItem value="PARCIAL">Parciales</SelectItem>
                  <SelectItem value="PAGADO">Pagados</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => fetchPagares(currentPage)}
                disabled={loading}
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Pagarés */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pagares.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No hay pagarés</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter !== 'todos' 
                  ? 'No se encontraron pagarés con el filtro aplicado'
                  : 'No hay pagarés registrados en el sistema'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pagares.map((pagare) => (
              <Card key={pagare.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {pagare.venta.folio} - Pago #{pagare.numeroPago}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className={statusColors[pagare.estatus as keyof typeof statusColors]}
                        >
                          {pagare.estatus}
                        </Badge>
                        {pagare.diasVencido > 0 && (
                          <Badge variant="destructive">
                            {pagare.diasVencido} días vencido
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <span className="font-medium text-foreground">Cliente:</span> {pagare.venta.cliente.codigoCliente} - {pagare.venta.cliente.nombre}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Vencimiento:</span> {format(new Date(pagare.fechaVencimiento), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right space-y-1">
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          ${pagare.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">Monto original</p>
                      </div>
                      {pagare.saldoPendiente > 0 && (
                        <div>
                          <p className="text-lg font-semibold text-orange-600">
                            ${pagare.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información de pagos e intereses */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-sm">
                    <div className="bg-muted/40 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Monto Pagado</p>
                      <p className="font-semibold text-emerald-600">${pagare.montoPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                    {pagare.interesesCalculados > 0 && (
                      <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                        <p className="text-xs text-muted-foreground">Intereses Moratorios</p>
                        <p className="font-semibold text-red-600">${pagare.interesesCalculados.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                      <p className="text-xs text-muted-foreground">Total Exigible</p>
                      <p className="font-semibold text-blue-600">${pagare.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPagareModal(pagare)}
                      className="gap-1 text-xs"
                    >
                      <FileText className="h-4 w-4" />
                      Ver Pagaré Legal
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEnviarWhatsApp(pagare)}
                      className="gap-1 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Aviso WhatsApp
                    </Button>

                    {pagare.estatus !== 'PAGADO' && pagare.estatus !== 'CANCELADO' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAplicarPago(pagare.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                      >
                        <CurrencyDollarIcon className="w-4 h-4" />
                        Registrar Cobro
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              Anterior
            </Button>
            
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i))
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={loading}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>

      {/* Modal Legal de Pagaré Mercantil (LGTOC Art. 170) */}
      <Dialog open={!!selectedPagareModal} onOpenChange={(open) => !open && setSelectedPagareModal(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-indigo-600" />
              Pagaré Mercantil Legal
            </DialogTitle>
            <DialogDescription>
              Título de crédito ejecutable conforme a la Ley General de Títulos y Operaciones de Crédito
            </DialogDescription>
          </DialogHeader>

          {selectedPagareModal && (
            <div className="border border-slate-300 dark:border-slate-700 p-6 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 space-y-4 text-xs sm:text-sm font-serif print:bg-white print:text-black">
              {/* Encabezado del pagaré */}
              <div className="flex justify-between items-start border-b border-slate-300 dark:border-slate-700 pb-3">
                <div>
                  <h2 className="text-xl font-bold tracking-wider font-sans uppercase">PAGARÉ</h2>
                  <p className="text-xs font-sans text-muted-foreground">Folio de Venta: <strong>{selectedPagareModal.venta.folio}</strong></p>
                  <p className="text-xs font-sans text-muted-foreground">Pago #{selectedPagareModal.numeroPago}</p>
                </div>
                <div className="text-right font-sans">
                  <p className="text-xs text-muted-foreground">BUENO POR:</p>
                  <p className="text-xl font-bold font-mono text-foreground">
                    ${selectedPagareModal.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} M.N.
                  </p>
                  <p className="text-[11px] text-muted-foreground">Vencimiento: {format(new Date(selectedPagareModal.fechaVencimiento), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              {/* Texto Legal */}
              <p className="leading-relaxed text-justify">
                Por el presente <strong>PAGARÉ</strong>, me obligo y prometo incondicionalmente a pagar a la orden de <strong>FERRECOLORS S.A. DE C.V.</strong>, en su domicilio social o donde se me requiera el pago, el día <strong>{format(new Date(selectedPagareModal.fechaVencimiento), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}</strong>, la cantidad de:
              </p>

              <div className="bg-slate-200/50 dark:bg-slate-800/50 p-2 text-center font-bold tracking-wide font-sans rounded">
                ${selectedPagareModal.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (PESOS EN MONEDA NACIONAL)
              </div>

              <p className="leading-relaxed text-justify text-xs text-muted-foreground">
                Valor recibido en mercancía a mi entera satisfacción. De no ser cubierto este pagaré a su fecha de vencimiento, causará un interés moratorio del <strong>3.0% mensual</strong> desde el día siguiente a su vencimiento hasta su total y definitiva liquidación, pagadero conjuntamente con el principal.
              </p>

              {/* Datos del Suscriptor / Deudor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-300 dark:border-slate-700 pt-4 font-sans text-xs">
                <div>
                  <p className="font-bold uppercase text-muted-foreground text-[10px]">DATOS DEL DEUDOR / SUSCRIPTOR:</p>
                  <p className="font-semibold text-foreground mt-1">{selectedPagareModal.venta.cliente.nombre}</p>
                  <p className="text-muted-foreground">Código: {selectedPagareModal.venta.cliente.codigoCliente}</p>
                  <p className="text-muted-foreground">Teléfono: {selectedPagareModal.venta.cliente.telefono1 || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-muted-foreground text-[10px]">LUGAR Y FECHA DE SUSCRIPCIÓN:</p>
                  <p className="text-foreground mt-1">Tuxtla Gutiérrez, Chiapas, México</p>
                  <p className="text-muted-foreground">Fecha: {format(new Date(), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              {/* Firmas */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center font-sans text-xs">
                <div>
                  <div className="border-b border-slate-400 w-full mb-1"></div>
                  <p className="font-semibold text-foreground">FIRMA DEL DEUDOR</p>
                  <p className="text-[10px] text-muted-foreground">{selectedPagareModal.venta.cliente.nombre}</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-full mb-1"></div>
                  <p className="font-semibold text-foreground">FIRMA DEL AVAL</p>
                  <p className="text-[10px] text-muted-foreground">Nombre y Firma</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedPagareModal(null)}>Cerrar</Button>
            <Button
              onClick={() => window.print()}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer className="h-4 w-4" />
              Imprimir Pagaré
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
