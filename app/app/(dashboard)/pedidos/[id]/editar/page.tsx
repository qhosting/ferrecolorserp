'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeftIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { toast } from "sonner"
import { format } from 'date-fns'

interface RouteParams {
  params: {
    id: string
  }
}

interface Cliente {
  id: string
  codigoCliente: string
  nombre: string
  telefono1?: string
  saldoActual: number
  limiteCredito: number
}

interface Producto {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  precio1: number
  precio2: number
  precio3: number
  precio4: number
  precio5: number
  stock: number
  unidadMedida: string
}

interface Partida {
  productoId: string
  codigo: string
  nombre: string
  cantidad: number
  precioUnitario: number
  precioSeleccionado: string // 'precio1' | 'precio2' | 'precio3' | 'precio4' | 'precio5' | 'custom'
  descuento: number
  stockMaximo: number
  unidadMedida: string
  preciosOriginales: {
    precio1: number
    precio2: number
    precio3: number
    precio4: number
    precio5: number
  }
}

export default function EditarPedidoPage({ params }: RouteParams) {
  const { data: session } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  const [prioridad, setPrioridad] = useState<'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL')
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [estatus, setEstatus] = useState('')

  // Product search states
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Producto[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  // Items in the order
  const [partidas, setPartidas] = useState<Partida[]>([])

  // Refs for dropdowns
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const productDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false)
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Load clients and order on load
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Fetch clients
        const clientsRes = await fetch('/api/clientes')
        let clientsData: Cliente[] = []
        if (clientsRes.ok) {
          clientsData = await clientsRes.json()
          setClientes(clientsData)
        }

        // Fetch order details
        const orderRes = await fetch(`/api/pedidos/${params.id}`)
        if (orderRes.ok) {
          const orderData = await orderRes.json()
          if (orderData.success) {
            const pedido = orderData.data
            
            // Block edit if converted or cancelled
            if (pedido.convertidoAVenta || pedido.estatus === 'CANCELADO') {
              toast.error('No se puede editar un pedido facturado o cancelado')
              router.push(`/pedidos/${params.id}`)
              return
            }

            // Set states
            setPrioridad(pedido.prioridad)
            setObservaciones(pedido.observaciones || '')
            setEstatus(pedido.estatus)
            
            if (pedido.fechaEntregaEstimada) {
              setFechaEntregaEstimada(format(new Date(pedido.fechaEntregaEstimada), 'yyyy-MM-dd'))
            }

            // Set selected client
            const matchedClient = clientsData.find(c => c.id === pedido.clienteId)
            if (matchedClient) {
              setSelectedCliente(matchedClient)
            } else {
              setSelectedCliente(pedido.cliente)
            }

            // Set items
            const loadedPartidas = pedido.detalles.map((d: any) => {
              const precio1 = d.producto.precio1
              const originalPrices = {
                precio1: precio1,
                precio2: d.producto.precio2 || precio1 * 0.95,
                precio3: d.producto.precio3 || precio1 * 0.90,
                precio4: d.producto.precio4 || precio1 * 0.85,
                precio5: d.producto.precio5 || precio1 * 0.80,
              }
              
              // Guess selected price list
              let precioSeleccionado = 'custom'
              if (d.precioUnitario === originalPrices.precio1) precioSeleccionado = 'precio1'
              else if (d.precioUnitario === originalPrices.precio2) precioSeleccionado = 'precio2'
              else if (d.precioUnitario === originalPrices.precio3) precioSeleccionado = 'precio3'
              else if (d.precioUnitario === originalPrices.precio4) precioSeleccionado = 'precio4'
              else if (d.precioUnitario === originalPrices.precio5) precioSeleccionado = 'precio5'

              return {
                productoId: d.producto.id,
                codigo: d.producto.codigo,
                nombre: d.producto.nombre,
                cantidad: d.cantidad,
                precioUnitario: d.precioUnitario,
                precioSeleccionado,
                descuento: d.descuento,
                stockMaximo: d.producto.stock || 9999,
                unidadMedida: d.producto.unidadMedida || 'Pz',
                preciosOriginales: originalPrices
              }
            })
            setPartidas(loadedPartidas)

          } else {
            toast.error('Error al cargar datos del pedido')
            router.push('/pedidos')
          }
        } else {
          toast.error('Pedido no encontrado')
          router.push('/pedidos')
        }

      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Error al cargar datos del servidor')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      loadData()
    }
  }, [session, params.id])

  // Search products when query changes
  useEffect(() => {
    const searchProducts = async () => {
      if (!productSearch.trim()) {
        setSearchResults([])
        return
      }
      try {
        setSearchingProducts(true)
        const response = await fetch(`/api/productos?search=${encodeURIComponent(productSearch)}&activos=true&limit=10`)
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.productos || [])
        }
      } catch (error) {
        console.error('Error al buscar productos:', error)
      } finally {
        setSearchingProducts(false)
      }
    }

    const delayDebounce = setTimeout(() => {
      searchProducts()
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [productSearch])

  // Filter clients locally
  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.codigoCliente.toLowerCase().includes(clientSearch.toLowerCase())
  )

  // Handle adding a product
  const handleAddProduct = (producto: Producto) => {
    const exists = partidas.some(p => p.productoId === producto.id)
    if (exists) {
      toast.warning('Este producto ya está en el pedido')
      return
    }

    const nuevaPartida: Partida = {
      productoId: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      cantidad: 1,
      precioUnitario: producto.precio1,
      precioSeleccionado: 'precio1',
      descuento: 0,
      stockMaximo: producto.stock,
      unidadMedida: producto.unidadMedida || 'Pz',
      preciosOriginales: {
        precio1: producto.precio1,
        precio2: producto.precio2,
        precio3: producto.precio3,
        precio4: producto.precio4,
        precio5: producto.precio5
      }
    }

    setPartidas([...partidas, nuevaPartida])
    setProductSearch('')
    setSearchResults([])
    setShowProductDropdown(false)
    toast.success('Producto agregado')
  }

  // Update item quantity
  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 0.01) return
    const updated = [...partidas]
    updated[index].cantidad = quantity
    setPartidas(updated)
  }

  // Update item price type selection
  const handleUpdatePriceType = (index: number, type: string) => {
    const updated = [...partidas]
    const item = updated[index]
    item.precioSeleccionado = type

    if (type !== 'custom') {
      item.precioUnitario = item.preciosOriginales[type as keyof typeof item.preciosOriginales]
    }
    setPartidas(updated)
  }

  // Update custom price value
  const handleUpdateCustomPrice = (index: number, val: number) => {
    if (val < 0) return
    const updated = [...partidas]
    updated[index].precioUnitario = val
    setPartidas(updated)
  }

  // Update discount value
  const handleUpdateDiscount = (index: number, val: number) => {
    if (val < 0) return
    const updated = [...partidas]
    updated[index].descuento = val
    setPartidas(updated)
  }

  // Remove a product
  const handleRemoveProduct = (index: number) => {
    const updated = partidas.filter((_, i) => i !== index)
    setPartidas(updated)
    toast.success('Producto eliminado')
  }

  // Calculations totals
  const subtotal = partidas.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario - item.descuento), 0)
  const iva = subtotal * 0.16
  const total = subtotal + iva

  // Form submit
  const handleSavePedido = async () => {
    if (!selectedCliente) {
      toast.error('Debe seleccionar un cliente')
      return
    }

    if (partidas.length === 0) {
      toast.error('Debe agregar al menos un producto al pedido')
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        clienteId: selectedCliente.id,
        prioridad,
        observaciones: observaciones,
        fechaEntregaEstimada: fechaEntregaEstimada || undefined,
        detalles: partidas.map(item => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          descuento: item.descuento
        }))
      }

      const response = await fetch(`/api/pedidos/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Pedido actualizado con éxito')
        router.push(`/pedidos/${params.id}`)
      } else {
        toast.error(data.error || 'Error al actualizar el pedido')
      }
    } catch (error) {
      console.error('Error al actualizar pedido:', error)
      toast.error('Error al conectar con el servidor')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 border-b pb-6">
        <Button variant="ghost" onClick={() => router.push(`/pedidos/${params.id}`)} className="p-2">
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Pedido</h1>
          <p className="text-gray-600">Modifica los detalles y partidas del pedido antes de ser facturado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Client Selection & Metadata */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Client Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBagIcon className="w-5 h-5 text-blue-600" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              
              {!selectedCliente ? (
                <div ref={clientDropdownRef} className="space-y-2 relative">
                  <Label>Buscar Cliente</Label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nombre o código del cliente..."
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value)
                        setShowClientDropdown(true)
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      className="pl-10"
                    />
                  </div>
                  
                  {showClientDropdown && clientSearch && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredClientes.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No se encontraron clientes</div>
                      ) : (
                        filteredClientes.map((cliente) => (
                          <div
                            key={cliente.id}
                            onClick={() => {
                              setSelectedCliente(cliente)
                              setShowClientDropdown(false)
                              setClientSearch('')
                            }}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          >
                            <p className="font-semibold text-sm text-gray-900">{cliente.nombre}</p>
                            <p className="text-xs text-gray-500">Código: {cliente.codigoCliente}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{selectedCliente.nombre}</h4>
                      <p className="text-xs text-gray-600">Código: {selectedCliente.codigoCliente}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedCliente(null)}
                      className="text-red-500 hover:text-red-700 p-1 h-auto"
                    >
                      Cambiar
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-blue-200 pt-2 text-gray-700">
                    <div>
                      <span className="block text-gray-500 font-medium">Límite Crédito:</span>
                      <strong className="text-gray-900">${(selectedCliente.limiteCredito || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="block text-gray-500 font-medium">Saldo Pendiente:</span>
                      <strong className={(selectedCliente.saldoActual || 0) > 0 ? "text-red-600" : "text-green-600"}>
                        ${(selectedCliente.saldoActual || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Properties Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles de Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prioridad">Prioridad</Label>
                <Select value={prioridad} onValueChange={(val: any) => setPrioridad(val)}>
                  <SelectTrigger id="prioridad">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAJA">Baja</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha-entrega">Fecha de Entrega Estimada</Label>
                <Input
                  id="fecha-entrega"
                  type="date"
                  value={fechaEntregaEstimada}
                  onChange={(e) => setFechaEntregaEstimada(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  placeholder="Observaciones de entrega..."
                  rows={3}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Items list */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="flex flex-col h-full min-h-[500px]">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Partidas del Pedido</CardTitle>
              
              {/* Product search select */}
              <div ref={productDropdownRef} className="relative w-80">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Agregar producto..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                      setShowProductDropdown(true)
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="pl-10 h-9"
                  />
                </div>

                {showProductDropdown && productSearch && (
                  <div className="absolute right-0 z-50 w-96 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchingProducts ? (
                      <div className="p-3 text-sm text-gray-500 text-center">Buscando...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">No se encontraron productos</div>
                    ) : (
                      searchResults.map((producto) => (
                        <div
                          key={producto.id}
                          onClick={() => handleAddProduct(producto)}
                          className="p-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{producto.nombre}</p>
                            <p className="text-xs text-gray-500">Cod: {producto.codigo} • Stock: {producto.stock}</p>
                          </div>
                          <span className="font-bold text-sm text-green-700">${producto.precio1.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 overflow-x-auto">
              {partidas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-gray-500">
                  <ShoppingBagIcon className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="font-medium text-gray-900">El pedido está vacío</p>
                  <p className="text-sm">Agrega productos con el buscador.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
                      <th className="text-left py-3 px-4">Producto</th>
                      <th className="text-center py-3 px-4 w-28">Cant.</th>
                      <th className="text-left py-3 px-4 w-48">Precio Lista</th>
                      <th className="text-right py-3 px-4 w-32">Precio Unit.</th>
                      <th className="text-right py-3 px-4 w-28">Desc. ($)</th>
                      <th className="text-right py-3 px-4 w-28">Subtotal</th>
                      <th className="text-center py-3 px-4 w-12">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partidas.map((item, index) => {
                      const rowSubtotal = (item.cantidad * item.precioUnitario) - item.descuento
                      return (
                        <tr key={item.productoId} className="border-b hover:bg-gray-50/50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{item.nombre}</div>
                            <div className="text-xs text-gray-500">{item.codigo} • Max stock: {item.stockMaximo} {item.unidadMedida}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.cantidad}
                              onChange={(e) => handleUpdateQuantity(index, parseFloat(e.target.value) || 0)}
                              className="text-center h-8 px-2"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Select 
                              value={item.precioSeleccionado} 
                              onValueChange={(val) => handleUpdatePriceType(index, val)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="precio1">Precio 1 (${item.preciosOriginales.precio1.toFixed(2)})</SelectItem>
                                <SelectItem value="precio2">Precio 2 (${item.preciosOriginales.precio2.toFixed(2)})</SelectItem>
                                <SelectItem value="precio3">Precio 3 (${item.preciosOriginales.precio3.toFixed(2)})</SelectItem>
                                <SelectItem value="precio4">Precio 4 (${item.preciosOriginales.precio4.toFixed(2)})</SelectItem>
                                <SelectItem value="precio5">Precio 5 (${item.preciosOriginales.precio5.toFixed(2)})</SelectItem>
                                <SelectItem value="custom">Personalizado</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item.precioSeleccionado === 'custom' ? (
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={item.precioUnitario}
                                onChange={(e) => handleUpdateCustomPrice(index, parseFloat(e.target.value) || 0)}
                                className="text-right h-8 px-2 w-24 ml-auto"
                              />
                            ) : (
                              <span className="font-medium text-gray-900">${item.precioUnitario.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={item.descuento || ''}
                              placeholder="0.00"
                              onChange={(e) => handleUpdateDiscount(index, parseFloat(e.target.value) || 0)}
                              className="text-right h-8 px-2 w-20 ml-auto"
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">
                            ${rowSubtotal.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemoveProduct(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>

            {/* Totals Section */}
            {partidas.length > 0 && (
              <div className="border-t p-6 bg-gray-50 flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="text-sm text-gray-500">
                  Total de partidas: <strong>{partidas.length}</strong>
                </div>
                <div className="w-full md:w-80 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA (16%):</span>
                    <span>${iva.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2 mt-2">
                    <span>Total Pedido:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="border-t p-6 flex justify-end space-x-3 bg-white">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/pedidos/${params.id}`)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSavePedido}
                disabled={submitting || partidas.length === 0 || !selectedCliente}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5"
              >
                <CheckIcon className="w-4 h-4" />
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}
