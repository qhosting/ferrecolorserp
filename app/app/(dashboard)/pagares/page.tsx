
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
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
    }
  }
}

const statusColors = {
  'PENDIENTE': 'bg-yellow-100 text-yellow-800',
  'PARCIAL': 'bg-blue-100 text-blue-800',
  'PAGADO': 'bg-green-100 text-green-800',
  'VENCIDO': 'bg-red-100 text-red-800',
  'CANCELADO': 'bg-gray-100 text-gray-800'
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

  // Cargar pagarés
  const fetchPagares = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15'
      })

      if (statusFilter !== 'todos') params.append('estatus', statusFilter)
      if (statusFilter === 'vencidos') params.append('soloVencidos', 'true')

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
  }, [statusFilter])

  useEffect(() => {
    fetchPagares(currentPage)
  }, [currentPage])

  // Aplicar pago
  const handleAplicarPago = (pagareId: string) => {
    router.push(`/cobranza-movil/registrar-pago?pagareId=${pagareId}`)
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

  if (!session) {
    return <div>Cargando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pagarés</h1>
          <p className="text-gray-600">Sistema de cobranza y gestión de pagarés</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => router.push('/cobranza-movil')}
            className="bg-green-600 hover:bg-green-700"
          >
            <CurrencyDollarIcon className="w-4 h-4 mr-2" />
            Cobranza Móvil
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
                <p className="text-sm text-gray-600">Total Pagarés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.pendientes}</p>
                <p className="text-sm text-gray-600">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.vencidos}</p>
                <p className="text-sm text-gray-600">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="text-green-600 text-2xl">$</div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  ${estadisticas.montoPagado.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Pagado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="text-orange-600 text-2xl">$</div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  ${estadisticas.saldoPendiente.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Por Cobrar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="text-red-600 text-2xl">%</div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  ${estadisticas.interesesMora.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Intereses Mora</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
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
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pagares.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagarés</h3>
            <p className="text-gray-600 mb-4">
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
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">
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
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Cliente:</span> {pagare.venta.cliente.codigoCliente} - {pagare.venta.cliente.nombre}
                      </p>
                      <p>
                        <span className="font-medium">Vencimiento:</span> {format(new Date(pagare.fechaVencimiento), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${pagare.monto.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Monto original</p>
                    </div>
                    {pagare.saldoPendiente > 0 && (
                      <div>
                        <p className="text-lg font-semibold text-orange-600">
                          ${pagare.saldoPendiente.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">Saldo pendiente</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información de pagos e intereses */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-500">Pagado</p>
                    <p className="font-semibold text-green-600">${pagare.montoPagado.toLocaleString()}</p>
                  </div>
                  {pagare.interesesCalculados > 0 && (
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-gray-500">Intereses Mora</p>
                      <p className="font-semibold text-red-600">${pagare.interesesCalculados.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-gray-500">Total a Pagar</p>
                    <p className="font-semibold text-blue-600">${pagare.montoTotal.toLocaleString()}</p>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-2">
                  {pagare.estatus !== 'PAGADO' && pagare.estatus !== 'CANCELADO' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAplicarPago(pagare.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                      Aplicar Pago
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
  )
}
