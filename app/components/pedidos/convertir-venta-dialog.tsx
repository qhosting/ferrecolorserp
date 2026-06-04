
'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CurrencyDollarIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { toast } from "sonner"

interface ConvertirVentaDialogProps {
  open: boolean
  onClose: () => void
  pedido: {
    id: string
    folio: string
    total: number
    cliente: {
      codigoCliente: string
      nombre: string
    }
    detalles: Array<{
      cantidad: number
      producto: {
        nombre: string
        stock: number
      }
    }>
  } | null
  onConfirm: (data: any) => Promise<void>
}

export function ConvertirVentaDialog({ open, onClose, pedido, onConfirm }: ConvertirVentaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    pagoInicial: 0,
    periodicidadPago: 'SEMANAL',
    montoPago: 0,
    diasGracia: 0,
    numeroFactura: '',
    observaciones: '',
    aplicarInventario: true
  })

  React.useEffect(() => {
    if (pedido && open) {
      // Resetear formulario cuando se abre
      setFormData({
        pagoInicial: 0,
        periodicidadPago: 'SEMANAL',
        montoPago: pedido.total > 1000 ? Math.round(pedido.total / 10) : 200,
        diasGracia: 0,
        numeroFactura: '',
        observaciones: '',
        aplicarInventario: true
      })
    }
  }, [pedido, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!pedido) return

    setLoading(true)

    try {
      await onConfirm(formData)
      onClose()
      toast.success(`Pedido ${pedido.folio} convertido exitosamente a venta`)
    } catch (error: any) {
      toast.error(error.message || 'Error al convertir pedido a venta')
    } finally {
      setLoading(false)
    }
  }

  const calcularPagos = () => {
    if (!pedido) return { numeroPagos: 0, saldoPendiente: 0 }
    
    const saldoPendiente = pedido.total - formData.pagoInicial
    const numeroPagos = formData.montoPago > 0 ? Math.ceil(saldoPendiente / formData.montoPago) : 1
    
    return { numeroPagos, saldoPendiente }
  }

  const { numeroPagos, saldoPendiente } = calcularPagos()

  // Verificar stock insuficiente
  const stockInsuficiente = pedido?.detalles.filter(
    detalle => detalle.producto.stock < detalle.cantidad
  ) || []

  if (!pedido) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CurrencyDollarIcon className="w-5 h-5" />
            <span>Convertir Pedido a Venta</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del pedido */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Información del Pedido</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Folio:</span>
                <span className="ml-2 font-medium">{pedido.folio}</span>
              </div>
              <div>
                <span className="text-gray-500">Total:</span>
                <span className="ml-2 font-bold text-green-600">
                  ${pedido.total.toLocaleString()}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Cliente:</span>
                <span className="ml-2 font-medium">
                  {pedido.cliente.codigoCliente} - {pedido.cliente.nombre}
                </span>
              </div>
            </div>
          </div>

          {/* Alerta de stock insuficiente */}
          {formData.aplicarInventario && stockInsuficiente.length > 0 && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">⚠️ Stock Insuficiente</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {stockInsuficiente.map((detalle, index) => (
                  <li key={index}>
                    {detalle.producto.nombre}: Stock disponible {detalle.producto.stock}, solicitado {detalle.cantidad}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sistema de Pagos */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Sistema de Pagarés</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pagoInicial">Pago Inicial (Enganche)</Label>
                  <Input
                    id="pagoInicial"
                    type="number"
                    value={formData.pagoInicial}
                    onChange={(e) => setFormData({ ...formData, pagoInicial: Number(e.target.value) })}
                    min="0"
                    max={pedido.total}
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="periodicidadPago">Periodicidad de Pago</Label>
                  <Select 
                    value={formData.periodicidadPago}
                    onValueChange={(value) => setFormData({ ...formData, periodicidadPago: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEMANAL">Semanal</SelectItem>
                      <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                      <SelectItem value="MENSUAL">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="montoPago">Monto por Pago</Label>
                  <Input
                    id="montoPago"
                    type="number"
                    value={formData.montoPago}
                    onChange={(e) => setFormData({ ...formData, montoPago: Number(e.target.value) })}
                    min="1"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="diasGracia">Días de Gracia</Label>
                  <Input
                    id="diasGracia"
                    type="number"
                    value={formData.diasGracia}
                    onChange={(e) => setFormData({ ...formData, diasGracia: Number(e.target.value) })}
                    min="0"
                    max="30"
                  />
                </div>
              </div>

              {/* Resumen de pagarés */}
              {saldoPendiente > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Resumen de Pagarés</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Saldo Pendiente:</span>
                      <p className="font-bold">${saldoPendiente.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Número de Pagos:</span>
                      <p className="font-bold">{numeroPagos}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Periodicidad:</span>
                      <p className="font-bold">{formData.periodicidadPago}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Información adicional */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="numeroFactura">Número de Factura (Opcional)</Label>
                <Input
                  id="numeroFactura"
                  value={formData.numeroFactura}
                  onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
                  placeholder="Ej: FAC-2024-001"
                />
              </div>

              <div>
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="aplicarInventario"
                  checked={formData.aplicarInventario}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, aplicarInventario: checked as boolean })
                  }
                />
                <Label htmlFor="aplicarInventario">
                  Aplicar al inventario (descontar stock)
                </Label>
              </div>
            </div>

            {/* Botones */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || (formData.aplicarInventario && stockInsuficiente.length > 0)}
              >
                {loading ? 'Convirtiendo...' : 'Convertir a Venta'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
