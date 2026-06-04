
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CalendarIcon, 
  UserIcon, 
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PedidoCardProps {
  pedido: {
    id: string
    folio: string
    fechaPedido: string
    fechaEntregaEstimada?: string
    estatus: string
    prioridad: string
    total: number
    convertidoAVenta: boolean
    cliente: {
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
      }
    }>
    venta?: {
      folio: string
      status: string
    }
  }
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onConvertir?: (id: string) => void
  onCancelar?: (id: string) => void
}

const statusColors = {
  'PENDIENTE': 'bg-yellow-100 text-yellow-800',
  'APROBADO': 'bg-blue-100 text-blue-800',
  'RECHAZADO': 'bg-red-100 text-red-800',
  'CONVERTIDO_VENTA': 'bg-green-100 text-green-800',
  'CANCELADO': 'bg-gray-100 text-gray-800'
}

const prioridadColors = {
  'BAJA': 'bg-gray-100 text-gray-600',
  'NORMAL': 'bg-blue-100 text-blue-600',
  'ALTA': 'bg-orange-100 text-orange-600',
  'URGENTE': 'bg-red-100 text-red-600'
}

const statusIcons = {
  'PENDIENTE': ExclamationTriangleIcon,
  'APROBADO': CheckCircleIcon,
  'RECHAZADO': XMarkIcon,
  'CONVERTIDO_VENTA': ArrowRightIcon,
  'CANCELADO': XMarkIcon
}

export function PedidoCard({ pedido, onView, onEdit, onConvertir, onCancelar }: PedidoCardProps) {
  const StatusIcon = statusIcons[pedido.estatus as keyof typeof statusIcons] || ExclamationTriangleIcon
  const totalProductos = pedido.detalles?.reduce((sum, detalle) => sum + detalle.cantidad, 0) || 0

  const handleConvertir = (e: React.MouseEvent) => {
    e.stopPropagation()
    onConvertir?.(pedido.id)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(pedido.id)
  }

  const handleCancelar = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCancelar?.(pedido.id)
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
      onClick={() => onView?.(pedido.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {pedido.folio}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge 
                variant="secondary" 
                className={statusColors[pedido.estatus as keyof typeof statusColors]}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {pedido.estatus.replace('_', ' ')}
              </Badge>
              <Badge 
                variant="outline"
                className={prioridadColors[pedido.prioridad as keyof typeof prioridadColors]}
              >
                {pedido.prioridad}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">
              ${pedido.total.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Información del Cliente */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <UserIcon className="w-4 h-4" />
          <span className="font-medium">{pedido.cliente.codigoCliente}</span>
          <span>-</span>
          <span>{pedido.cliente.nombre}</span>
          {pedido.cliente.telefono1 && (
            <>
              <span>•</span>
              <span>{pedido.cliente.telefono1}</span>
            </>
          )}
        </div>

        {/* Información del Vendedor */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="font-medium">Vendedor:</span>
          <span>{pedido.vendedor.name}</span>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <CalendarIcon className="w-4 h-4" />
            <div>
              <p className="font-medium">Fecha pedido</p>
              <p>{format(new Date(pedido.fechaPedido), 'dd MMM yyyy', { locale: es })}</p>
            </div>
          </div>
          {pedido.fechaEntregaEstimada && (
            <div className="flex items-center space-x-2 text-gray-600">
              <CalendarIcon className="w-4 h-4" />
              <div>
                <p className="font-medium">Entrega estimada</p>
                <p>{format(new Date(pedido.fechaEntregaEstimada), 'dd MMM yyyy', { locale: es })}</p>
              </div>
            </div>
          )}
        </div>

        {/* Productos */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <ShoppingCartIcon className="w-4 h-4" />
          <span>{pedido.detalles?.length || 0} productos</span>
          <span>•</span>
          <span>{totalProductos} unidades</span>
        </div>

        {/* Información de conversión a venta */}
        {pedido.convertidoAVenta && pedido.venta && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Convertido a venta: {pedido.venta.folio}
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {pedido.venta.status}
              </Badge>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex space-x-2 pt-2">
          {!pedido.convertidoAVenta && pedido.estatus === 'PENDIENTE' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex-1"
              >
                Editar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleConvertir}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <ArrowRightIcon className="w-4 h-4 mr-1" />
                Convertir a Venta
              </Button>
            </>
          )}
          
          {pedido.estatus === 'PENDIENTE' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelar}
              className="flex-1"
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
