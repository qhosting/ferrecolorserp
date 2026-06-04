
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { toast } from "sonner"
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Venta {
  id: string
  folio: string
  numeroFactura?: string
  fechaVenta: string
  status: string
  total: number
  pagoInicial: number
  saldoPendiente: number
  periodicidadPago: string
  cliente: {
    id: string
    codigoCliente: string
    nombre: string
    telefono1?: string
  }
  vendedor: {
    name: string
  }
  pedidoOrigen?: {
    folio: string
  }
  pagares: Array<{
    id: string
    numeroPago: number
    monto: number
    montoPagado: number
    estatus: string
    fechaVencimiento: string
    diasVencido: number
  }>
  _count: {
    detalles: number
    pagos: number
  }
  estadisticas: {
    totalPagado: number
    saldoRestante: number
    pagaresVencidos: number
    proximoVencimiento: string | null
    diasVencidoProximo: number
  }
}

const statusColors = {
  'PENDIENTE': 'bg-yellow-100 text-yellow-800',
  'CONFIRMADA': 'bg-blue-100 text-blue-800',
  'ENTREGADA': 'bg-green-100 text-green-800',
  'CANCELADA': 'bg-red-100 text-red-800',
  'PAGADA': 'bg-emerald-100 text-emerald-800'
}

export default function VentasPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Cargar ventas
  const fetchVentas = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      })

      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'todos') params.append('status', statusFilter)

      const response = await fetch(`/api/ventas?${params}`)
      const data = await response.json()

      if (data.success) {
        setVentas(data.data.ventas)
        setTotalPages(data.data.pagination.totalPages)
      } else {
        toast.error(data.error || 'Error al cargar ventas')
      }
    } catch (error) {
      toast.error('Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }

  // Efectos
  useEffect(() => {
    fetchVentas(1)
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  useEffect(() => {
    fetchVentas(currentPage)
  }, [currentPage])

  // Funciones de navegación
  const handleViewVenta = (id: string) => {
    router.push(`/ventas/${id}`)
  }

  const handleCobranza = (id: string) => {
    router.push(`/cobranza-movil/registrar-pago?ventaId=${id}`)
  }

  // Estadísticas
  const estadisticas = ventas.reduce(
    (acc, venta) => {
      acc.total++
      acc.montoTotal += venta.total
      acc.montoTotalPagado += venta.estadisticas.totalPagado
      acc.saldoRestante += venta.estadisticas.saldoRestante
      
      if (venta.status === 'PAGADA') {
        acc.ventasPagadas++
      } else if (venta.estadisticas.pagaresVencidos > 0) {
        acc.ventasVencidas++
      }
      
      return acc
    },
    { 
      total: 0, 
      ventasPagadas: 0, 
      ventasVencidas: 0, 
      montoTotal: 0,
      montoTotalPagado: 0,
      saldoRestante: 0
    }
  )

  if (!session) {
    return <div>Cargando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ventas</h1>
          <p className="text-gray-600">Gestión de ventas y sistema de pagarés</p>
        </div>
        <Button 
          onClick={() => router.push('/ventas/nueva')}
          className="bg-green-600 hover:bg-green-700"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Nueva Venta
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
                <p className="text-sm text-gray-600">Total Ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.ventasPagadas}</p>
                <p className="text-sm text-gray-600">Pagadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.ventasVencidas}</p>
                <p className="text-sm text-gray-600">Con Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-xl font-bold text-gray-900">
                  ${estadisticas.montoTotalPagado.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Total Pagado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-xl font-bold text-gray-900">
                  ${estadisticas.saldoRestante.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Por Cobrar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por folio, factura, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                <SelectItem value="CONFIRMADA">Confirmadas</SelectItem>
                <SelectItem value="ENTREGADA">Entregadas</SelectItem>
                <SelectItem value="PAGADA">Pagadas</SelectItem>
                <SelectItem value="CANCELADA">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => fetchVentas(currentPage)}
              disabled={loading}
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ventas */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : ventas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ventas</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'todos' 
                ? 'No se encontraron ventas con los filtros aplicados'
                : 'Comienza creando tu primera venta o convierte un pedido'
              }
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => router.push('/ventas/nueva')}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Nueva Venta
              </Button>
              <Button variant="outline" onClick={() => router.push('/pedidos')}>
                Ver Pedidos
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ventas.map((venta) => (
            <Card key={venta.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {venta.folio}
                      </h3>
                      {venta.numeroFactura && (
                        <Badge variant="outline">
                          Factura: {venta.numeroFactura}
                        </Badge>
                      )}
                      <Badge 
                        variant="secondary" 
                        className={statusColors[venta.status as keyof typeof statusColors]}
                      >
                        {venta.status}
                      </Badge>
                      {venta.estadisticas.pagaresVencidos > 0 && (
                        <Badge variant="destructive">
                          {venta.estadisticas.pagaresVencidos} Vencidos
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Cliente:</span> {venta.cliente.codigoCliente} - {venta.cliente.nombre}
                      </p>
                      <p>
                        <span className="font-medium">Vendedor:</span> {venta.vendedor.name}
                      </p>
                      <p>
                        <span className="font-medium">Fecha:</span> {format(new Date(venta.fechaVenta), 'dd MMM yyyy', { locale: es })}
                      </p>
                      {venta.pedidoOrigen && (
                        <p>
                          <span className="font-medium">Origen:</span> Pedido {venta.pedidoOrigen.folio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${venta.total.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Total</p>
                    </div>
                    {venta.saldoPendiente > 0 && (
                      <div>
                        <p className="text-lg font-semibold text-orange-600">
                          ${venta.estadisticas.saldoRestante.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">Por cobrar</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información de pagos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-500">Pago Inicial</p>
                    <p className="font-semibold">${venta.pagoInicial.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-500">Pagado Total</p>
                    <p className="font-semibold text-green-600">
                      ${venta.estadisticas.totalPagado.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-500">Pagarés</p>
                    <p className="font-semibold">
                      {venta.pagares.length} ({venta.periodicidadPago.toLowerCase()})
                    </p>
                  </div>
                </div>

                {/* Próximo vencimiento */}
                {venta.estadisticas.proximoVencimiento && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>Próximo vencimiento:</strong> {format(new Date(venta.estadisticas.proximoVencimiento), 'dd MMM yyyy', { locale: es })}
                      {venta.estadisticas.diasVencidoProximo > 0 && (
                        <span className="text-red-600 font-semibold ml-2">
                          (Vencido hace {venta.estadisticas.diasVencidoProximo} días)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {venta._count.detalles} productos • {venta._count.pagos} pagos registrados
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewVenta(venta.id)
                      }}
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      Ver Detalle
                    </Button>
                    {venta.status !== 'PAGADA' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCobranza(venta.id)
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                        Cobrar
                      </Button>
                    )}
                  </div>
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
  )
}
