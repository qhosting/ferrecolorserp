'use client'

import React from 'react'
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CalendarIcon, 
  UserIcon, 
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  XMarkIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PencilIcon
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

const statusColors: Record<string, string> = {
  'PENDIENTE': 'bg-amber-50 text-amber-700 border-amber-200',
  'APROBADO': 'bg-blue-50 text-blue-700 border-blue-200',
  'RECHAZADO': 'bg-red-50 text-red-700 border-red-200',
  'CONVERTIDO_VENTA': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'CANCELADO': 'bg-slate-100 text-slate-600 border-slate-200'
}

const statusLabels: Record<string, string> = {
  'PENDIENTE': 'Pendiente',
  'APROBADO': 'Aprobado',
  'RECHAZADO': 'Rechazado',
  'CONVERTIDO_VENTA': 'Convertido Venta',
  'CANCELADO': 'Cancelado'
}

const prioridadColors: Record<string, string> = {
  'BAJA': 'bg-slate-100 text-slate-600 border-slate-200',
  'NORMAL': 'bg-sky-50 text-sky-700 border-sky-200',
  'ALTA': 'bg-orange-50 text-orange-700 border-orange-200',
  'URGENTE': 'bg-rose-50 text-rose-700 border-rose-200'
}

const statusIcons = {
  'PENDIENTE': ExclamationTriangleIcon,
  'APROBADO': CheckCircleIcon,
  'RECHAZADO': XMarkIcon,
  'CONVERTIDO_VENTA': CheckCircleIcon,
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

  const handleVisualizarPdf = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`/api/pedidos/${pedido.id}/pdf`, '_blank')
  }

  const handleDownloadPdf = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`/api/pedidos/${pedido.id}/pdf?download=true`, '_blank')
  }

  return (
    <Card 
      className="group cursor-pointer bg-white hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-blue-400 rounded-2xl overflow-hidden flex flex-col justify-between"
      onClick={() => onView?.(pedido.id)}
    >
      {/* Header top bar with decorative accent */}
      <div className="p-5 space-y-3.5">
        
        {/* Folio & Total Price block - Fixed Layout Overflow */}
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-3">
          <div className="flex justify-between items-center gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">Folio Pedido</span>
              <h3 
                className="font-mono text-sm sm:text-base font-bold text-slate-900 truncate" 
                title={pedido.folio}
              >
                {pedido.folio}
              </h3>
            </div>
            
            {/* Total Badge Box */}
            <div className="text-right shrink-0 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 block">Total</span>
              <span className="text-base font-extrabold text-emerald-700 font-mono">
                ${pedido.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Badges Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge 
              variant="outline" 
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${statusColors[pedido.estatus] || 'bg-slate-100'}`}
            >
              <StatusIcon className="w-3.5 h-3.5 mr-1 inline-block" />
              {statusLabels[pedido.estatus] || pedido.estatus}
            </Badge>
            <Badge 
              variant="outline"
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${prioridadColors[pedido.prioridad] || 'bg-slate-100'}`}
            >
              Prioridad: {pedido.prioridad}
            </Badge>
          </div>
        </div>

        {/* Cliente details block - Fixed wrap / overlap */}
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
            <UserIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Cliente</span>
          </div>
          <div className="flex flex-col text-sm">
            <div className="font-semibold text-slate-900 truncate" title={pedido.cliente.nombre}>
              <span className="text-blue-600 font-mono font-bold mr-1.5">[{pedido.cliente.codigoCliente}]</span>
              {pedido.cliente.nombre}
            </div>
            {pedido.cliente.telefono1 && (
              <span className="text-xs text-slate-500 font-mono mt-0.5">
                📞 {pedido.cliente.telefono1}
              </span>
            )}
          </div>
        </div>

        {/* Metadata info grid */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-medium">Fecha</span>
              <span className="font-semibold text-slate-800 truncate block">
                {format(new Date(pedido.fechaPedido), 'dd MMM yyyy', { locale: es })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <ShoppingCartIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-medium">Artículos</span>
              <span className="font-semibold text-slate-800 truncate block">
                {pedido.detalles?.length || 0} prods • {totalProductos} uds
              </span>
            </div>
          </div>
        </div>

        {/* Vendedor info */}
        <div className="text-xs text-slate-500 flex justify-between items-center px-1">
          <span>Vendedor: <strong className="text-slate-700">{pedido.vendedor.name}</strong></span>
        </div>

        {/* Conversion Alert Box */}
        {pedido.convertidoAVenta && pedido.venta && (
          <div className="p-2.5 bg-emerald-50/90 rounded-xl border border-emerald-200 text-xs flex items-center justify-between text-emerald-900">
            <span className="font-medium flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              Venta: <strong className="font-mono">{pedido.venta.folio}</strong>
            </span>
            <Badge variant="secondary" className="bg-emerald-200/80 text-emerald-900 font-bold text-[10px]">
              {pedido.venta.status}
            </Badge>
          </div>
        )}
      </div>

      {/* Action Footer Buttons */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
        {/* PDF Action Row: Visualizar & Descargar PDF */}
        <div className="flex gap-2">
          {/* Botón 1: Visualizar PDF */}
          <button
            type="button"
            onClick={handleVisualizarPdf}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 font-bold text-xs py-2 px-3 rounded-xl border border-blue-200 shadow-sm transition-all duration-150"
            title="Visualizar Cotización PDF en pantalla"
          >
            <EyeIcon className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Visualizar</span>
          </button>

          {/* Botón 2: Descargar PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-sm transition-all duration-150"
            title="Descargar archivo PDF directamente"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Descargar PDF</span>
          </button>
        </div>

        {/* Action Row: Editar / Convertir / Cancelar */}
        <div className="flex gap-2">
          {!pedido.convertidoAVenta && pedido.estatus === 'PENDIENTE' && (
            <>
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex items-center justify-center gap-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs py-1.5 px-3 rounded-xl border border-slate-200 shadow-sm"
                title="Editar pedido"
              >
                <PencilIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Editar</span>
              </button>
              
              <button
                type="button"
                onClick={handleConvertir}
                className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs py-1.5 px-3 rounded-xl shadow-sm transition-all duration-150"
                title="Convertir a venta"
              >
                <ArrowRightIcon className="w-3.5 h-3.5" />
                <span>Convertir a Venta</span>
              </button>
            </>
          )}
          
          {pedido.estatus === 'PENDIENTE' && (
            <button
              type="button"
              onClick={handleCancelar}
              className="inline-flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs py-1.5 px-2.5 rounded-xl border border-rose-200 transition-colors"
              title="Cancelar pedido"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
