'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  CalendarDaysIcon,
  UserIcon,
  MapPinIcon,
  ClockIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'
import { toast } from "sonner"
import { ConvertirVentaDialog } from "@/components/pedidos/convertir-venta-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RouteParams {
  params: {
    id: string
  }
}

interface Pedido {
  id: string
  folio: string
  fechaPedido: string
  fechaEntregaEstimada?: string
  fechaVencimiento?: string
  estatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CONVERTIDO_VENTA' | 'CANCELADO'
  prioridad: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE'
  subtotal: number
  iva: number
  descuento: number
  total: number
  observaciones?: string
  motivoCancelacion?: string
  convertidoAVenta: boolean
  ventaId?: string
  cliente: {
    id: string
    codigoCliente: string
    nombre: string
    telefono1?: string
    telefono2?: string
    email?: string
    calle?: string
    numeroExterior?: string
    colonia?: string
    municipio?: string
    estado?: string
  }
  vendedor: {
    id: string
    name: string
    email: string
  }
  detalles: Array<{
    id: string
    cantidad: number
    precioUnitario: number
    descuento: number
    subtotal: number
    producto: {
      id: string
      codigo: string
      nombre: string
      precio1: number
      unidadMedida: string
      stock: number
    }
  }>
  venta?: {
    id: string
    folio: string
    status: string
  }
}

const statusConfig = {
  'PENDIENTE': { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pendiente' },
  'APROBADO': { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Aprobado' },
  'RECHAZADO': { bg: 'bg-red-100 text-red-800 border-red-200', label: 'Rechazado' },
  'CONVERTIDO_VENTA': { bg: 'bg-green-100 text-green-800 border-green-200', label: 'Facturado (Venta)' },
  'CANCELADO': { bg: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelado' }
}

const priorityConfig = {
  'BAJA': 'bg-gray-50 text-gray-600',
  'NORMAL': 'bg-blue-50 text-blue-600',
  'ALTA': 'bg-orange-50 text-orange-600',
  'URGENTE': 'bg-red-50 text-red-600'
}

export default function PedidoDetailsPage({ params }: RouteParams) {
  const { data: session } = useSession()
  const router = useRouter()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [loading, setLoading] = useState(true)

  // Modals / Dialogs states
  const [convertirOpen, setConvertirOpen] = useState(false)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const [actionLoading, setActionLoading] = useState(false)

  // Fetch order data
  const fetchPedido = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/pedidos/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPedido(data.data)
        } else {
          toast.error(data.error || 'Error al obtener los detalles del pedido')
          router.push('/pedidos')
        }
      } else {
        toast.error('Pedido no encontrado')
        router.push('/pedidos')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar datos del servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      fetchPedido()
    }
  }, [session, params.id])

  // Approve handler
  const handleApprovePedido = async () => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/pedidos/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estatus: 'APROBADO' })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Pedido aprobado exitosamente')
        setApproveConfirmOpen(false)
        fetchPedido()
      } else {
        toast.error(data.error || 'Error al aprobar el pedido')
      }
    } catch (error) {
      toast.error('Error al conectar con el servidor')
    } finally {
      setActionLoading(false)
    }
  }

  // Cancel handler
  const handleCancelPedido = async () => {
    if (!cancelReason.trim()) {
      toast.error('Debe ingresar un motivo de cancelación')
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch(`/api/pedidos/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          estatus: 'CANCELADO',
          motivoCancelacion: cancelReason 
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Pedido cancelado exitosamente')
        setCancelConfirmOpen(false)
        setCancelReason('')
        fetchPedido()
      } else {
        toast.error(data.error || 'Error al cancelar el pedido')
      }
    } catch (error) {
      toast.error('Error al conectar con el servidor')
    } finally {
      setActionLoading(false)
    }
  }

  // Convert to sale confirm handler
  const handleConfirmConversion = async (datosConversion: any) => {
    try {
      const response = await fetch(`/api/pedidos/${params.id}/convertir-venta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosConversion),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || 'Pedido convertido a venta con éxito')
        setConvertirOpen(false)
        fetchPedido()
        
        // Redirect to sale details if ID is returned
        if (data.data?.id) {
          setTimeout(() => {
            router.push(`/ventas`)
          }, 1500)
        }
      } else {
        throw new Error(data.error || 'Error al convertir pedido')
      }
    } catch (error: any) {
      throw error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 font-semibold">No se pudo cargar la información del pedido</p>
        <Button onClick={() => router.push('/pedidos')} className="mt-4">Volver</Button>
      </div>
    )
  }

  const { bg: statusBg, label: statusLabel } = statusConfig[pedido.estatus] || { bg: 'bg-gray-100', label: pedido.estatus }
  const formattedDate = format(new Date(pedido.fechaPedido), 'dd MMM yyyy, hh:mm a', { locale: es })
  
  const formattedDelivery = pedido.fechaEntregaEstimada 
    ? format(new Date(pedido.fechaEntregaEstimada), 'dd MMM yyyy', { locale: es })
    : 'No especificada'

  const formattedAddress = [
    pedido.cliente.calle,
    pedido.cliente.numeroExterior,
    pedido.cliente.colonia,
    pedido.cliente.municipio,
    pedido.cliente.estado
  ].filter(Boolean).join(', ') || 'Sin dirección de entrega registrada'

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push('/pedidos')} className="p-2">
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">{pedido.folio}</h1>
              <Badge className={`${statusBg} px-3 py-1 border font-medium rounded-full text-xs`}>
                {statusLabel}
              </Badge>
              <Badge variant="outline" className={`${priorityConfig[pedido.prioridad]} border-none font-semibold px-3 py-1`}>
                Prioridad: {pedido.prioridad}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">Registrado el {formattedDate}</p>
          </div>
        </div>

        {/* Dynamic Context Actions */}
        <div className="flex flex-wrap gap-2">
          {pedido.estatus === 'PENDIENTE' && (
            <>
              <Button 
                onClick={() => setApproveConfirmOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5"
              >
                <CheckIcon className="w-4 h-4" />
                Aprobar Pedido
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setCancelConfirmOpen(true)}
                className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
              >
                <XMarkIcon className="w-4 h-4" />
                Cancelar
              </Button>
            </>
          )}

          {pedido.estatus === 'APROBADO' && (
            <Button 
              onClick={() => setConvertirOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium flex items-center gap-1.5"
            >
              <ClipboardDocumentCheckIcon className="w-4 h-4" />
              Convertir a Venta
            </Button>
          )}

          {!pedido.convertidoAVenta && pedido.estatus !== 'CANCELADO' && (
            <Button 
              variant="outline"
              onClick={() => router.push(`/pedidos/${pedido.id}/editar`)}
              className="flex items-center gap-1.5"
            >
              <PencilIcon className="w-4 h-4 text-gray-500" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Main Info Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Client & Meta Info */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Client Details Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-blue-600" />
                Detalles del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre del Cliente</span>
                <strong className="text-gray-900 text-base block mt-0.5">{pedido.cliente.nombre}</strong>
                <span className="text-xs text-gray-500 mt-0.5 block">Código: {pedido.cliente.codigoCliente}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Teléfono</span>
                  <span className="text-gray-900 font-medium block mt-0.5">{pedido.cliente.telefono1 || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</span>
                  <span className="text-gray-900 font-medium block mt-0.5 truncate" title={pedido.cliente.email}>{pedido.cliente.email || 'N/A'}</span>
                </div>
              </div>
              <div className="border-t pt-3 space-y-1">
                <span className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <MapPinIcon className="w-4 h-4" />
                  Dirección de Entrega
                </span>
                <p className="text-gray-700 leading-relaxed mt-0.5">{formattedAddress}</p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Tracking Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                Seguimiento y Plazos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-500 font-medium">Fecha Entrega Estimada:</span>
                <span className="text-gray-900 font-bold">{formattedDelivery}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-500 font-medium">Vendedor Registró:</span>
                <span className="text-gray-900 font-semibold">{pedido.vendedor.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Pedido Facturado:</span>
                <Badge variant={pedido.convertidoAVenta ? "default" : "secondary"} className={pedido.convertidoAVenta ? "bg-green-100 text-green-800 border-green-200" : ""}>
                  {pedido.convertidoAVenta ? 'Sí' : 'No'}
                </Badge>
              </div>
              {pedido.convertidoAVenta && pedido.venta && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-800 font-semibold uppercase">Venta Relacionada</p>
                    <p className="font-bold text-gray-900 text-sm mt-0.5">{pedido.venta.folio}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push(`/ventas`)} // Redirect to sales list, as [id] routes for sales might not be fully active
                    className="border-green-200 hover:bg-green-100/50 text-xs font-semibold text-green-800"
                  >
                    Ver Ventas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Products Table & Notes */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Products List Card */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Partidas del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
                    <th className="text-left py-3 px-4">Producto / Código</th>
                    <th className="text-right py-3 px-4 w-28">Cant.</th>
                    <th className="text-right py-3 px-4 w-32">Precio Unit.</th>
                    <th className="text-right py-3 px-4 w-28">Desc. ($)</th>
                    <th className="text-right py-3 px-4 w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.detalles.map((detalle) => (
                    <tr key={detalle.id} className="border-b hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{detalle.producto.nombre}</div>
                        <div className="text-xs text-gray-500">{detalle.producto.codigo}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {detalle.cantidad} {detalle.producto.unidadMedida || 'Pz'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        ${detalle.precioUnitario.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        ${detalle.descuento.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        ${detalle.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="p-6 bg-gray-50 flex justify-end">
                <div className="w-80 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>${pedido.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA (16%):</span>
                    <span>${pedido.iva.toFixed(2)}</span>
                  </div>
                  {pedido.descuento > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento Aplicado:</span>
                      <span>-${pedido.descuento.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2 mt-2">
                    <span>Total Pedido:</span>
                    <span>${pedido.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observations and Status Warnings */}
          {pedido.observaciones && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-700">Observaciones del Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{pedido.observaciones}</p>
              </CardContent>
            </Card>
          )}

          {pedido.estatus === 'CANCELADO' && pedido.motivoCancelacion && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <strong className="block text-base font-semibold mb-1">Pedido Cancelado</strong>
              <span className="font-semibold">Motivo:</span> {pedido.motivoCancelacion}
            </div>
          )}
        </div>

      </div>

      {/* Convert to Sale Dialog */}
      {pedidoSeleccionadoParaConversion(pedido) && (
        <ConvertirVentaDialog
          open={convertirOpen}
          onClose={() => setConvertirOpen(false)}
          pedido={pedidoSeleccionadoParaConversion(pedido)}
          onConfirm={handleConfirmConversion}
        />
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={approveConfirmOpen}
        title="Aprobar Pedido"
        message={`¿Estás seguro de que deseas aprobar el pedido ${pedido.folio}? Esto permitirá convertirlo a venta.`}
        confirmLabel="Aprobar"
        variant="info"
        loading={actionLoading}
        onConfirm={handleApprovePedido}
        onCancel={() => setApproveConfirmOpen(false)}
      />

      {/* Cancel Order Dialog */}
      <Dialog 
        open={cancelConfirmOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setCancelConfirmOpen(false)
            setCancelReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancelar Pedido</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar el pedido {pedido.folio}? Esta acción liberará el inventario comprometido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivo-cancel">Motivo de cancelación</Label>
              <Input 
                id="motivo-cancel" 
                placeholder="Ej. Cambio de opinión del cliente, sin stock..." 
                value={cancelReason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelConfirmOpen(false)
                setCancelReason('')
              }}
              disabled={actionLoading}
            >
              No, mantener
            </Button>
            <Button
              onClick={handleCancelPedido}
              disabled={actionLoading || !cancelReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? 'Cancelando...' : 'Sí, cancelar pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )

  // Helper to map order details to schema required by ConvertirVentaDialog
  function pedidoSeleccionadoParaConversion(p: Pedido | null): any {
    if (!p) return null;
    return {
      id: p.id,
      folio: p.folio,
      total: p.total,
      cliente: {
        codigoCliente: p.cliente.codigoCliente,
        nombre: p.cliente.nombre
      },
      detalles: p.detalles?.map(d => ({
        cantidad: d.cantidad,
        producto: {
          nombre: d.producto.nombre,
          stock: d.producto.stock
        }
      })) || []
    }
  }
}
