
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PedidoCard } from "@/components/pedidos/pedido-card"
import { ConvertirVentaDialog } from "@/components/pedidos/convertir-venta-dialog"
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { toast } from "sonner"
import { useRouter } from 'next/navigation'

interface Pedido {
  id: string
  folio: string
  fechaPedido: string
  fechaEntregaEstimada?: string
  estatus: string
  prioridad: string
  total: number
  convertidoAVenta: boolean
  cliente: {
    id: string
    codigoCliente: string
    nombre: string
    telefono1?: string
  }
  vendedor: {
    name: string
  }
  detalles: Array<{
    cantidad: number
    producto: {
      nombre: string
      stock: number
    }
  }>
  venta?: {
    id: string
    folio: string
    status: string
  }
}

export default function PedidosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Estado para conversión a venta
  const [convertirDialogOpen, setConvertirDialogOpen] = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null)

  // Cargar pedidos
  const fetchPedidos = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      })

      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'todos') params.append('estatus', statusFilter)

      const response = await fetch(`/api/pedidos?${params}`)
      const data = await response.json()

      if (data.success) {
        setPedidos(data.data.pedidos)
        setTotalPages(data.data.pagination.totalPages)
      } else {
        toast.error(data.error || 'Error al cargar pedidos')
      }
    } catch (error) {
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }

  // Efectos
  useEffect(() => {
    fetchPedidos(1)
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  useEffect(() => {
    fetchPedidos(currentPage)
  }, [currentPage])

  // Convertir pedido a venta
  const handleConvertirVenta = async (pedidoId: string) => {
    const pedido = pedidos.find(p => p.id === pedidoId)
    if (pedido) {
      setPedidoSeleccionado(pedido)
      setConvertirDialogOpen(true)
    }
  }

  const confirmarConversion = async (datosConversion: any) => {
    if (!pedidoSeleccionado) return

    try {
      const response = await fetch(`/api/pedidos/${pedidoSeleccionado.id}/convertir-venta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosConversion),
      })

      const data = await response.json()

      if (data.success) {
        await fetchPedidos(currentPage)
        toast.success(data.message)
        
        // Opcional: navegar a la venta creada
        if (data.data?.id) {
          setTimeout(() => {
            router.push(`/ventas/${data.data.id}`)
          }, 2000)
        }
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      throw error
    }
  }

  // Otras acciones
  const handleViewPedido = (id: string) => {
    router.push(`/pedidos/${id}`)
  }

  const handleEditPedido = (id: string) => {
    router.push(`/pedidos/${id}/editar`)
  }

  const handleCancelarPedido = async (id: string) => {
    if (!confirm('¿Está seguro de cancelar este pedido?')) return

    try {
      const response = await fetch(`/api/pedidos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estatus: 'CANCELADO' }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchPedidos(currentPage)
        toast.success('Pedido cancelado exitosamente')
      } else {
        toast.error(data.error || 'Error al cancelar pedido')
      }
    } catch (error) {
      toast.error('Error al cancelar pedido')
    }
  }

  // Estadísticas
  const estadisticas = pedidos.reduce(
    (acc, pedido) => {
      acc.total++
      acc.montoTotal += pedido.total
      
      switch (pedido.estatus) {
        case 'PENDIENTE':
          acc.pendientes++
          break
        case 'CONVERTIDO_VENTA':
          acc.convertidos++
          break
      }
      
      return acc
    },
    { total: 0, pendientes: 0, convertidos: 0, montoTotal: 0 }
  )

  if (!session) {
    return <div>Cargando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600">Gestión de pedidos y conversión a ventas</p>
        </div>
        <Button 
          onClick={() => router.push('/pedidos/nuevo')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
                <p className="text-sm text-gray-600">Total Pedidos</p>
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
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.convertidos}</p>
                <p className="text-sm text-gray-600">Convertidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="text-green-600 text-2xl">$</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${estadisticas.montoTotal.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Monto Total</p>
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
                  placeholder="Buscar por folio, cliente..."
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
                <SelectItem value="APROBADO">Aprobados</SelectItem>
                <SelectItem value="CONVERTIDO_VENTA">Convertidos</SelectItem>
                <SelectItem value="CANCELADO">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => fetchPedidos(currentPage)}
              disabled={loading}
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      ) : pedidos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'todos' 
                ? 'No se encontraron pedidos con los filtros aplicados'
                : 'Comienza creando tu primer pedido'
              }
            </p>
            <Button onClick={() => router.push('/pedidos/nuevo')}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Crear Pedido
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pedidos.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              onView={handleViewPedido}
              onEdit={handleEditPedido}
              onConvertir={handleConvertirVenta}
              onCancelar={handleCancelarPedido}
            />
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

      {/* Dialog para convertir a venta */}
      <ConvertirVentaDialog
        open={convertirDialogOpen}
        onClose={() => {
          setConvertirDialogOpen(false)
          setPedidoSeleccionado(null)
        }}
        pedido={pedidoSeleccionado}
        onConfirm={confirmarConversion}
      />
    </div>
  )
}
