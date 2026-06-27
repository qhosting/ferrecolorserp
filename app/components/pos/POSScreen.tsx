'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ShoppingCart, 
  User, 
  DollarSign, 
  CreditCard, 
  Tag, 
  Printer, 
  Trash2, 
  Plus, 
  Minus, 
  Coins, 
  TrendingDown, 
  TrendingUp, 
  Layers, 
  Clock, 
  ChevronRight, 
  RotateCcw, 
  Power,
  Sliders,
  Settings,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Importaciones de Hardware
import { useBarcodeScanner } from '@/lib/pos/barcode-scanner';
import { 
  isWebSerialSupported, 
  requestPrinterPort, 
  printRawBytes, 
  triggerCashDrawer, 
  triggerPaperCut 
} from '@/lib/pos/thermal-printer';
import { 
  generateTicketESCPOSTemplate, 
  generateZCutESCPOSTemplate 
} from '@/lib/pos/ticket-template';

interface POSScreenProps {
  sesion: any;
  onSessionClosed: () => void;
}

interface CartItem {
  productoId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number; // Monto de descuento en pesos
  descuentoEspecialUnitario?: number; // Descuento unitario especial
  stock: number;
  unidadMedida: string;
}

export default function POSScreen({ sesion, onSessionClosed }: POSScreenProps) {
  const router = useRouter();
  
  // Conexión de Impresora
  const [printerPort, setPrinterPort] = useState<any>(null);
  const [baudRate, setBaudRate] = useState<number>(9600);
  
  // Estados de Venta / Carrito
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  // Buscador de clientes en POS
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);
  const clientSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedPriceList, setSelectedPriceList] = useState<number>(1);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);
  const [observaciones, setObservaciones] = useState<string>('');

  // Estados de Catálogo de Productos
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Modales
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [showTicketPreview, setShowTicketPreview] = useState(false);

  // Estados del Cobro (PaymentModal)
  const [paymentType, setPaymentType] = useState<'EFECTIVO' | 'TARJETA' | 'MIXTO'>('EFECTIVO');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [cardReceived, setCardReceived] = useState<string>('');
  const [refTerminal, setRefTerminal] = useState<string>('');
  const [submittingVenta, setSubmittingVenta] = useState(false);
  const [lastVentaResult, setLastVentaResult] = useState<any>(null);

  // Estados de Movimientos de Caja Manuales
  const [movTipo, setMovTipo] = useState<'DEPOSITO' | 'RETIRO'>('RETIRO');
  const [movMonto, setMovMonto] = useState('');
  const [movConcepto, setMovConcepto] = useState('');
  const [submittingMov, setSubmittingMov] = useState(false);

  // Estados de Cierre de Caja
  const [efectivoDeclarado, setEfectivoDeclarado] = useState('');
  const [obsCierre, setObsCierre] = useState('');
  const [closingSession, setClosingSession] = useState(false);
  const [zCutResult, setZCutResult] = useState<any>(null);

  // Reloj en tiempo real
  const [currentTime, setCurrentTime] = useState<string>('');

  // Estados para Registro Rápido de Producto Escaneado (Integración de Barcode)
  const [showQuickRegisterModal, setShowQuickRegisterModal] = useState(false);
  const [externalProductData, setExternalProductData] = useState<any>(null);
  const [quickPrice, setQuickPrice] = useState('');
  const [quickStock, setQuickStock] = useState('0');
  const [savingQuickProduct, setSavingQuickProduct] = useState(false);

  // Estados Click & Collect
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  const [onlinePedidos, setOnlinePedidos] = useState<any[]>([]);
  const [loadingOnlinePedidos, setLoadingOnlinePedidos] = useState(false);
  const [showOnlinePedidosModal, setShowOnlinePedidosModal] = useState(false);

  // Sonido de alerta para pedidos online (Web Audio API)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3); // 300ms
    } catch (e) {
      console.warn('Web Audio Context block:', e);
    }
  };

  const fetchOnlinePedidos = async () => {
    try {
      setLoadingOnlinePedidos(true);
      const res = await fetch(`/api/pedidos/online?sucursalId=${sesion.sucursalId}`);
      if (res.ok) {
        const data = await res.json();
        setOnlinePedidos(data.data || []);
      }
    } catch (err) {
      console.error('Error al obtener pedidos online:', err);
    } finally {
      setLoadingOnlinePedidos(false);
    }
  };

  const handleUpdatePedidoEstatus = async (pedidoId: string, estatus: string, motivo?: string) => {
    try {
      const res = await fetch(`/api/pedidos/online/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus, motivoCancelacion: motivo })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Pedido actualizado');
        fetchOnlinePedidos();
      } else {
        toast.error(data.error || 'Error al actualizar pedido');
      }
    } catch (err) {
      console.error('Error al actualizar pedido:', err);
      toast.error('Error de red al actualizar pedido');
    }
  };

  const lastPedidosCountRef = useRef<number>(0);

  useEffect(() => {
    fetchOnlinePedidos();
    
    // Polling cada 45 segundos
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pedidos/online?sucursalId=${sesion.sucursalId}`);
        if (res.ok) {
          const data = await res.json();
          const newList = data.data || [];
          const currentPendientes = newList.filter((p: any) => p.estatus === 'PENDIENTE');
          const previousCount = lastPedidosCountRef.current;
          
          if (currentPendientes.length > previousCount) {
            playBeep();
            toast.info(`¡Nuevo pedido Click & Collect recibido! Folio: ${currentPendientes[0].folio}`, {
              duration: 10000,
              action: {
                label: 'Ver Pedidos',
                onClick: () => {
                  fetchOnlinePedidos();
                  setShowOnlinePedidosModal(true);
                }
              }
            });
          }
          
          setOnlinePedidos(newList);
          lastPedidosCountRef.current = currentPendientes.length;
        }
      } catch (err) {
        console.error('Error en polling de pedidos online:', err);
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [sesion.sucursalId]);

  useEffect(() => {
    // Reloj
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    setCurrentTime(new Date().toLocaleTimeString());

    // Cargar listas
    fetchClientes();
    fetchCategories();
    fetchProducts();
    
    // Configuración por defecto de la sucursal activa
    if (sesion?.sucursal?.listaPrecioDefecto) {
      setSelectedPriceList(sesion.sucursal.listaPrecioDefecto);
    }

    // Intentar recuperar puerto serial de la impresora si ya fue concedido antes
    // (Web Serial API no permite auto-reconectar sin gesto de usuario en algunos casos,
    // pero podemos guardar el flag en localStorage para indicar al usuario si lo tenía activo).
    const savedBaud = localStorage.getItem('pos_printer_baud');
    if (savedBaud) {
      setBaudRate(parseInt(savedBaud) || 9600);
    }

    return () => clearInterval(timer);
  }, []);

  // Recargar productos al cambiar búsqueda o categoría
  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory]);

  // Actualizar precios del carrito al cambiar la lista de precios seleccionada
  useEffect(() => {
    if (cart.length === 0) return;
    
    // Consultar detalles frescos para recalcular según lista de precios
    const updatePricesInCart = async () => {
      const updatedCart = await Promise.all(
        cart.map(async (item) => {
          try {
            const res = await fetch(`/api/pos/productos?barcode=${item.codigo}&sucursalId=${sesion.sucursalId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.productos?.length > 0) {
                const prod = data.productos[0];
                const key = `precio${selectedPriceList}` as keyof typeof prod;
                const newPrice = parseFloat(prod[key]?.toString()) || 0;
                return {
                  ...item,
                  precioUnitario: newPrice
                };
              }
            }
          } catch (e) {
            console.error('Error updating item price in cart:', e);
          }
          return item;
        })
      );
      setCart(updatedCart);
    };

    updatePricesInCart();
  }, [selectedPriceList]);

  // Escáner de código de barras USB
  useBarcodeScanner(async (barcode) => {
    toast.info(`Escanéo detectado: ${barcode}`);
    await handleAddByBarcode(barcode);
  });

  const fetchClientes = async () => {
    try {
      // La API devuelve un array directo (no {clientes:[]})
      const res = await fetch('/api/clientes?limit=10');
      if (res.ok) {
        const data = await res.json();
        const lista: any[] = Array.isArray(data) ? data : (data.clientes || []);
        setClientes(lista);

        // Asignar Público General por defecto si existe
        const defaultClient = lista.find((c: any) =>
          c.nombre?.toLowerCase().includes('publico') ||
          c.nombre?.toLowerCase().includes('mostrador') ||
          c.nombre?.toLowerCase().includes('general')
        );
        if (defaultClient) {
          setSelectedCliente(defaultClient);
        } else if (lista.length > 0) {
          setSelectedCliente(lista[0]);
        }
      }
    } catch (err) {
      console.error('Error cargando clientes por defecto:', err);
    }
  };

  // Búsqueda dinámica de clientes con debounce
  const handleClientSearch = (query: string) => {
    setClientSearchQuery(query);
    if (clientSearchTimerRef.current) clearTimeout(clientSearchTimerRef.current);

    if (query.trim().length < 2) {
      setClientSearchResults([]);
      setShowClientDropdown(false);
      return;
    }

    clientSearchTimerRef.current = setTimeout(async () => {
      try {
        setClientSearchLoading(true);
        const res = await fetch(`/api/clientes/search?q=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          const results = Array.isArray(data) ? data : [];
          setClientSearchResults(results);
          setShowClientDropdown(true);
        }
      } catch (err) {
        console.error('Error buscando clientes:', err);
      } finally {
        setClientSearchLoading(false);
      }
    }, 350);
  };

  const selectClienteFromSearch = (client: any) => {
    setSelectedCliente(client);
    setClientSearchQuery('');
    setClientSearchResults([]);
    setShowClientDropdown(false);
    if (client?.listaPrecio) {
      setSelectedPriceList(client.listaPrecio);
      toast.info(`Lista de precios "${client.listaPrecio}" aplicada para ${client.nombre}`);
    } else {
      setSelectedPriceList(sesion.sucursal.listaPrecioDefecto || 1);
    }
    if (client?.descuento !== undefined) {
      setGlobalDiscountPercent(client.descuento || 0);
      if (client.descuento > 0) {
        toast.info(`Descuento global del ${client.descuento}% aplicado para ${client.nombre}`);
      }
    } else {
      setGlobalDiscountPercent(0);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/productos/categorias');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categorias || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const params = new URLSearchParams({
        sucursalId: sesion.sucursalId,
        q: searchQuery
      });
      if (selectedCategory !== 'all') {
        params.append('categoria', selectedCategory);
      }

      const res = await fetch(`/api/pos/productos?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.productos || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al conectar con la base de productos');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Agregar al carrito por escaneo de código de barras
  const handleAddByBarcode = async (barcode: string) => {
    try {
      const res = await fetch(`/api/pos/productos?barcode=${barcode}&sucursalId=${sesion.sucursalId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.productos && data.productos.length > 0) {
          const product = data.productos[0];
          if (product.isExternal) {
            // Es un producto detectado por la API externa, abrir modal de registro rápido
            setExternalProductData(product);
            setQuickPrice('');
            setQuickStock('5'); // Sugerir stock por defecto
            setShowQuickRegisterModal(true);
            toast.info(`Producto externo detectado: ${product.nombre}`);
          } else {
            addToCart(product);
          }
        } else {
          toast.warning(`Código de barras "${barcode}" no encontrado.`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al buscar código de barras');
    }
  };

  // Enviar el registro rápido de un producto externo al servidor
  const handleQuickRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalProductData) return;

    const priceVal = parseFloat(quickPrice);
    const stockVal = parseInt(quickStock);

    if (isNaN(priceVal) || priceVal <= 0) {
      toast.error('El precio debe ser un número mayor a cero');
      return;
    }

    if (isNaN(stockVal) || stockVal < 0) {
      toast.error('El stock debe ser un número igual o mayor a cero');
      return;
    }

    try {
      setSavingQuickProduct(true);
      const res = await fetch('/api/pos/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: externalProductData.codigo,
          nombre: externalProductData.nombre,
          codigoBarras: externalProductData.codigoBarras,
          categoria: externalProductData.categoria,
          unidadMedida: externalProductData.unidadMedida,
          precio1: priceVal,
          stock: stockVal,
          sucursalId: sesion.sucursalId
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Producto "${data.producto.nombre}" registrado exitosamente`);
        setShowQuickRegisterModal(false);
        setExternalProductData(null);
        
        // Agregar al carrito y refrescar catálogo
        addToCart(data.producto);
        fetchProducts();
      } else {
        toast.error(data.error || 'Error al registrar producto');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de conexión al registrar producto');
    } finally {
      setSavingQuickProduct(false);
    }
  };

  // Agregar al carrito desde la grid
  const addToCart = (product: any) => {
    // Determinar precio según lista
    const key = `precio${selectedPriceList}` as keyof typeof product;
    const price = parseFloat(product[key]?.toString()) || 0;

    // Descuento especial del producto (si tiene)
    const specialDiscount = parseFloat(product.descuento?.toString()) || 0;

    // Verificar si ya existe en el carrito
    const existingIndex = cart.findIndex((item) => item.productoId === product.id);

    if (existingIndex > -1) {
      const newQty = cart[existingIndex].cantidad + 1;
      if (newQty > product.stock) {
        toast.error(`No hay suficiente stock en esta sucursal. Disponible: ${product.stock}`);
        return;
      }
      
      const newCart = [...cart];
      newCart[existingIndex].cantidad = newQty;
      newCart[existingIndex].descuento = specialDiscount * newQty;
      setCart(newCart);
      toast.success(`Incrementado: ${product.nombre}`);
    } else {
      if (product.stock < 1) {
        toast.error('Producto agotado en esta sucursal');
        return;
      }

      const newItem: CartItem = {
        productoId: product.id,
        codigo: product.codigo,
        nombre: product.nombre,
        cantidad: 1,
        precioUnitario: price,
        descuento: specialDiscount,
        descuentoEspecialUnitario: specialDiscount,
        stock: product.stock,
        unidadMedida: product.unidadMedida || 'PZA'
      };

      setCart([...cart, newItem]);
      toast.success(`Agregado: ${product.nombre}`);
    }
  };

  const updateCartQty = (productId: string, qty: number) => {
    const item = cart.find(c => c.productoId === productId);
    if (!item) return;

    if (qty > item.stock) {
      toast.error(`Stock máximo disponible en sucursal: ${item.stock}`);
      return;
    }

    if (qty <= 0) {
      setCart(cart.filter((c) => c.productoId !== productId));
      return;
    }

    setCart(
      cart.map((c) => {
        if (c.productoId === productId) {
          const discountUnit = c.descuentoEspecialUnitario || 0;
          return {
            ...c,
            cantidad: qty,
            descuento: discountUnit * qty
          };
        }
        return c;
      })
    );
  };

  const updateCartDiscount = (productId: string, discountAmount: number) => {
    setCart(
      cart.map((c) => {
        if (c.productoId === productId) {
          const maxDiscount = c.cantidad * c.precioUnitario;
          return { 
            ...c, 
            descuento: Math.min(Math.max(0, discountAmount), maxDiscount) 
          };
        }
        return c;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.productoId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setObservaciones('');
    setSelectedPedidoId(null);
    toast.info('Carrito vaciado');
  };

  // Cálculos totales
  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario - item.descuento), 0);
  };

  const getGlobalDiscount = () => {
    const sub = getSubtotal();
    return sub * (globalDiscountPercent / 100);
  };

  const getNetSubtotal = () => {
    return getSubtotal() - getGlobalDiscount();
  };

  const getIva = () => {
    return getNetSubtotal() * 0.16; // 16% IVA
  };

  const getTotal = () => {
    return getNetSubtotal() + getIva();
  };

  // Manejo de Clientes
  const handleClientChange = (clientId: string) => {
    const client = clientes.find((c) => c.id === clientId);
    setSelectedCliente(client || null);
    
    // Si el cliente tiene una lista de precios preferencial configurada, la aplicamos
    if (client?.listaPrecio) {
      setSelectedPriceList(client.listaPrecio);
      toast.info(`Cargando lista de precios "${client.listaPrecio}" preferencial para este cliente`);
    } else {
      setSelectedPriceList(sesion.sucursal.listaPrecioDefecto || 1);
    }

    if (client?.descuento !== undefined) {
      setGlobalDiscountPercent(client.descuento || 0);
      if (client.descuento > 0) {
        toast.info(`Descuento global del ${client.descuento}% aplicado para este cliente`);
      }
    } else {
      setGlobalDiscountPercent(0);
    }
  };

  // Hardware Setup & Connection
  const handleConnectPrinter = async () => {
    try {
      const port = await requestPrinterPort();
      setPrinterPort(port);
      localStorage.setItem('pos_printer_baud', baudRate.toString());
      toast.success('Impresora térmica conectada exitosamente');
      setShowPrinterSettings(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al conectar impresora');
    }
  };

  const handleKickDrawer = async () => {
    if (!printerPort) {
      toast.warning('Debe conectar la impresora en configuración primero');
      return;
    }
    try {
      await triggerCashDrawer(printerPort, baudRate);
      toast.success('Señal de cajón monedero enviada');
    } catch (err) {
      toast.error('Error al abrir el cajón monedero');
    }
  };

  // Iniciar cobro
  const handleOpenPayment = () => {
    if (cart.length === 0) {
      toast.warning('El carrito de compras está vacío');
      return;
    }
    
    const total = getTotal();
    setPaymentType('EFECTIVO');
    setCashReceived(Math.ceil(total).toString());
    setCardReceived('0');
    setRefTerminal('');
    setShowPaymentModal(true);
  };

  // Confirmar cobro y guardar venta
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = getTotal();

    let efectivoVal = parseFloat(cashReceived) || 0;
    let tarjetaVal = parseFloat(cardReceived) || 0;
    let cambioVal = 0;

    if (paymentType === 'EFECTIVO') {
      tarjetaVal = 0;
      if (efectivoVal < total) {
        toast.error('El efectivo recibido es menor al total a cobrar');
        return;
      }
      cambioVal = efectivoVal - total;
    } else if (paymentType === 'TARJETA') {
      efectivoVal = 0;
      tarjetaVal = total;
      if (!refTerminal) {
        toast.error('Se requiere la referencia/autorización de la terminal bancaria');
        return;
      }
      cambioVal = 0;
    } else { // MIXTO
      if ((efectivoVal + tarjetaVal) < total) {
        toast.error('La suma de efectivo y tarjeta es menor al total a cobrar');
        return;
      }
      cambioVal = (efectivoVal + tarjetaVal) - total;
      if (tarjetaVal > 0 && !refTerminal) {
        toast.error('Se requiere referencia bancaria si incluye pago con tarjeta');
        return;
      }
    }

    try {
      setSubmittingVenta(true);
      const res = await fetch('/api/pos/venta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sesionId: sesion.id,
          clienteId: selectedCliente?.id,
          detalles: cart.map((c) => ({
            productoId: c.productoId,
            cantidad: c.cantidad,
            precioUnitario: c.precioUnitario,
            descuento: c.descuento
          })),
          pagoEfectivo: efectivoVal,
          pagoTarjeta: tarjetaVal,
          referenciaTerminal: refTerminal,
          cambio: cambioVal,
          listaPrecioUsada: selectedPriceList,
          observaciones,
          pedidoId: selectedPedidoId || undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Venta ${data.venta.numeroTicket} creada exitosamente`);
        setLastVentaResult(data.venta);
        
        // Vaciamos el carrito
        setCart([]);
        setObservaciones('');
        setSelectedPedidoId(null);
        fetchOnlinePedidos();
        setShowPaymentModal(false);

        // Desencadenar hardware
        if (printerPort) {
          // Imprimir ticket directamente
          try {
            await printTicketDirectly(data.venta.numeroTicket);
          } catch (pe) {
            console.error('Print error:', pe);
            toast.error('Error al imprimir físicamente, se cargará el visor de reimpresión');
            setShowTicketPreview(true);
          }
        } else {
          // Si no hay impresora directa, abrir visor de reimpresión para window.print
          setShowTicketPreview(true);
        }

        // Recargar productos para ver existencias actualizadas
        fetchProducts();
      } else {
        toast.error(data.error || 'Error al guardar la venta');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al procesar el cobro');
    } finally {
      setSubmittingVenta(false);
    }
  };

  // Imprimir ticket con puerto serie
  const printTicketDirectly = async (ticketNo: string) => {
    if (!printerPort) return;
    toast.loading('Generando ticket de impresión...', { id: 'printing' });
    try {
      const res = await fetch(`/api/pos/ticket/${ticketNo}`);
      if (res.ok) {
        const data = await res.json();
        const bytes = generateTicketESCPOSTemplate(data.ticket);
        
        // Enviar comandos a la impresora
        await printRawBytes(printerPort, bytes, baudRate);
        
        toast.success('Ticket impreso físicamente', { id: 'printing' });
      } else {
        toast.error('No se pudieron obtener datos de impresión', { id: 'printing' });
      }
    } catch (err) {
      console.error(err);
      toast.error('Fallo en la comunicación con la impresora térmica', { id: 'printing' });
    }
  };

  // Registrar movimiento de caja manual (Depósito/Retiro)
  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cashMonto = parseFloat(movMonto);

    if (isNaN(cashMonto) || cashMonto <= 0) {
      toast.error('El monto debe ser un número positivo mayor a cero');
      return;
    }

    if (!movConcepto.trim()) {
      toast.error('Debe detallar el concepto');
      return;
    }

    try {
      setSubmittingMov(true);
      const res = await fetch('/api/pos/movimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sesionId: sesion.id,
          tipo: movTipo,
          monto: cashMonto,
          concepto: movConcepto
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setShowMovementModal(false);
        setMovMonto('');
        setMovConcepto('');
        
        // Si es un retiro y la impresora está conectada, abrir el cajón
        if (movTipo === 'RETIRO' && printerPort) {
          handleKickDrawer();
        }
      } else {
        toast.error(data.error || 'Error al guardar movimiento');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al registrar movimiento');
    } finally {
      setSubmittingMov(false);
    }
  };

  // Cerrar Caja (Corte Z)
  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const declaredCash = parseFloat(efectivoDeclarado);

    if (isNaN(declaredCash) || declaredCash < 0) {
      toast.error('El monto declarado debe ser un número válido igual o mayor a cero');
      return;
    }

    try {
      setClosingSession(true);
      const res = await fetch(`/api/pos/sesion/${sesion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cerrar',
          montoEfectivoDeclarado: declaredCash,
          observacionesCierre: obsCierre
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Sesión de caja cerrada correctamente');
        setZCutResult(data.session);
        
        // Obtener resumen final de la sesión para imprimir
        try {
          const detailRes = await fetch(`/api/pos/sesion/${sesion.id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            
            // Imprimir en la impresora serial
            if (printerPort) {
              const zBytes = generateZCutESCPOSTemplate(detailData);
              await printRawBytes(printerPort, zBytes, baudRate);
              toast.success('Cuadro Z impreso en ticket térmico');
            } else {
              toast.info('Se completó el cierre de turno. No hay impresora directa configurada.');
            }
          }
        } catch (printErr) {
          console.error(printErr);
          toast.error('Error al imprimir cuadro de cierre, sesión fue cerrada');
        }

        // Salir al inicio de sesión POS
        setShowCloseSessionModal(false);
        onSessionClosed();
      } else {
        toast.error(data.error || 'Error al realizar el cierre de caja');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al cerrar la sesión de caja');
    } finally {
      setClosingSession(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100">
      {/* 1. Header del POS */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-black text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">
              FERRECOLORS POS
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-3 text-xs bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span>Sucursal:</span>
              <span className="font-bold text-white">{sesion?.sucursal?.nombre}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <User className="h-3.5 w-3.5 text-emerald-400" />
              <span>Cajero:</span>
              <span className="font-bold text-white">
                {`${sesion?.cajero?.firstName || ''} ${sesion?.cajero?.lastName || ''}`.trim() || sesion?.cajero?.name}
              </span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-400 font-mono">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Configuración de impresora */}
          <Button
            onClick={() => setShowPrinterSettings(true)}
            variant="outline"
            size="sm"
            className={`h-9 border-slate-800 rounded-xl text-xs gap-1.5 ${
              printerPort ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">{printerPort ? 'Impresora OK' : 'Conectar Impresora'}</span>
          </Button>

          {/* Abrir cajón manual */}
          <Button
            onClick={handleKickDrawer}
            disabled={!printerPort}
            variant="outline"
            size="sm"
            className="h-9 bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs gap-1.5"
          >
            <Coins className="h-4 w-4" />
            <span className="hidden sm:inline">Abrir Cajón</span>
          </Button>

          {/* Movimientos de caja */}
          <Button
            onClick={() => setShowMovementModal(true)}
            variant="outline"
            size="sm"
            className="h-9 bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Mov. Manual</span>
          </Button>

          {/* Pedidos en Línea (Click & Collect) */}
          <Button
            onClick={() => {
              fetchOnlinePedidos();
              setShowOnlinePedidosModal(true);
            }}
            variant="outline"
            size="sm"
            className="h-9 bg-indigo-950/40 border-indigo-500/30 hover:bg-indigo-950 text-indigo-300 hover:text-indigo-100 rounded-xl text-xs gap-1.5 relative"
          >
            <Clock className="h-4 w-4" />
            <span>Pedidos en Línea</span>
            {onlinePedidos.filter(p => p.estatus === 'PENDIENTE').length > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            )}
          </Button>

          {/* Cerrar caja */}
          <Button
            onClick={() => {
              setEfectivoDeclarado('');
              setObsCierre('');
              setShowCloseSessionModal(true);
            }}
            className="h-9 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-lg shadow-rose-600/10"
          >
            <Power className="h-4 w-4" />
            <span>Cerrar Turno</span>
          </Button>
        </div>
      </header>

      {/* 2. Área principal dividida */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* ZONA IZQUIERDA: Búsqueda y catálogo de productos */}
        <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden border-r border-slate-800">
          
          {/* Buscador general */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                id="pos-search-input"
                type="text"
                placeholder="Busque por nombre, código o escanee código de barras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-slate-900 border-slate-800 text-white placeholder-slate-500 rounded-xl focus-visible:ring-indigo-500"
              />
            </div>
            
            {/* Categorías */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-11 bg-slate-900 border border-slate-800 text-white rounded-xl px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors shrink-0 max-w-[180px]"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {loadingProducts ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                Cargando catálogo...
              </div>
            ) : products.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 space-y-2">
                <p className="text-sm">No se encontraron productos.</p>
                <p className="text-xs text-slate-600">Intente con otro término o verifique que existan en la sucursal activa.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {products.map((p) => {
                  const key = `precio${selectedPriceList}` as keyof typeof p;
                  const price = parseFloat(p[key]?.toString()) || 0;
                  
                  // Semáforo de stock
                  let stockColor = 'bg-emerald-500';
                  if (p.stock === 0) stockColor = 'bg-rose-500';
                  else if (p.stock <= p.stockMinimo) stockColor = 'bg-amber-500';

                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={p.stock < 1}
                      className={`group p-3 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-left flex flex-col justify-between h-36 transition-all relative overflow-hidden active:scale-[0.98] ${
                        p.stock < 1 ? 'opacity-40 cursor-not-allowed bg-slate-950/40' : ''
                      }`}
                    >
                      <div className="space-y-1 w-full">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-semibold truncate max-w-[70%]">
                            {p.codigo}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {p.descuento > 0 && (
                              <span className="text-[9px] font-black text-rose-300 bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 rounded-md shrink-0">
                                -${p.descuento}
                              </span>
                            )}
                            <span className={`h-2 w-2 rounded-full ${stockColor}`}></span>
                            <span className="text-[10px] font-bold text-slate-400">{p.stock} {p.unidadMedida}</span>
                          </div>
                        </div>
                        <h4 className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 mt-1">
                          {p.nombre}
                        </h4>
                      </div>

                      <div className="w-full flex justify-between items-end mt-2 pt-2 border-t border-slate-800/40">
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                          Lista {selectedPriceList}
                        </span>
                        <span className="text-base font-black text-emerald-400 font-mono">
                          ${price.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ZONA DERECHA: Carrito de compras y Cobro */}
        <div className="w-96 p-4 flex flex-col bg-slate-900/90 overflow-hidden shrink-0 border-l border-slate-800 justify-between">
          
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 space-y-3">
            
            {/* Header del carrito */}
            <div className="flex justify-between items-center shrink-0 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold">
                <ShoppingCart className="h-5 w-5 text-indigo-400" />
                <span>Carrito ({cart.reduce((sum, item) => sum + item.cantidad, 0)})</span>
              </div>
              {cart.length > 0 && (
                <button 
                  onClick={clearCart} 
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Vaciar
                </button>
              )}
            </div>

            {/* Indicador de Pedido Click & Collect Vinculado */}
            {selectedPedidoId && (
              <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl flex items-center justify-between text-indigo-300 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className="h-4 w-4 animate-pulse shrink-0 text-indigo-400" />
                  <div className="truncate text-left">
                    <span className="text-[9px] block font-mono text-indigo-400 font-bold leading-none">PEDIDO ONLINE</span>
                    <span className="text-xs font-bold font-mono">
                      {onlinePedidos.find(p => p.id === selectedPedidoId)?.folio || 'Vinculado'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPedidoId(null);
                    setCart([]);
                    setSelectedCliente(null);
                    toast.info('Vínculo de pedido removido y carrito vaciado');
                  }}
                  className="text-[10px] bg-indigo-500/10 hover:bg-rose-500/15 border border-indigo-500/20 hover:border-rose-500/30 text-indigo-300 hover:text-rose-400 px-2 py-1 rounded-xl transition-all font-semibold shrink-0"
                >
                  Desvincular
                </button>
              </div>
            )}

            {/* Listado de carrito */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2.5">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center p-6 space-y-2">
                  <ShoppingCart className="h-10 w-10 text-slate-800" />
                  <p className="text-xs">El carrito está vacío.</p>
                  <p className="text-[10px] text-slate-700">Escanee un producto o haga click en la lista de la izquierda.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div 
                    key={item.productoId} 
                    className="p-3 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col space-y-2 relative"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[9px] text-slate-500 block truncate">{item.codigo}</span>
                        <h4 className="text-xs font-semibold text-white leading-tight truncate">{item.nombre}</h4>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.productoId)}
                        className="text-slate-600 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      {/* Cantidad */}
                      <div className="flex items-center bg-slate-900 border border-slate-850 rounded-xl px-1">
                        <button 
                          onClick={() => updateCartQty(item.productoId, item.cantidad - 1)}
                          className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-mono font-bold text-white">{item.cantidad}</span>
                        <button 
                          onClick={() => updateCartQty(item.productoId, item.cantidad + 1)}
                          className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Descuento Individual */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-850 rounded-xl px-2 h-8 w-20 shrink-0">
                        <Tag className="h-3 w-3 text-indigo-400 shrink-0" />
                        <input
                          type="number"
                          value={item.descuento || ''}
                          onChange={(e) => updateCartDiscount(item.productoId, parseFloat(e.target.value) || 0)}
                          placeholder="Desc $"
                          className="w-full bg-transparent border-0 text-right text-xs font-mono font-bold text-indigo-400 focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      {/* Subtotal Item */}
                      <div className="text-right flex-1">
                        <span className="text-xs font-mono font-black text-emerald-400">
                          ${((item.cantidad * item.precioUnitario) - item.descuento).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Configuraciones de Venta */}
            <div className="border-t border-slate-800 pt-3 space-y-2 shrink-0">
              
              {/* Cliente */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cliente</Label>
                  {selectedCliente?.saldoActual > 0 && (
                    <span className="text-[10px] text-amber-500 font-bold">Saldo: ${Number(selectedCliente.saldoActual).toFixed(2)}</span>
                  )}
                </div>

                {/* Cliente seleccionado actualmente */}
                {selectedCliente && (
                  <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-indigo-950/40 border border-indigo-500/25 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-white truncate">{selectedCliente.nombre}</p>
                      <p className="text-[9px] text-indigo-400 font-mono truncate">
                        {selectedCliente.codigoCliente}
                        {selectedCliente.rfc ? ` · ${selectedCliente.rfc}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCliente(null);
                        setClientSearchQuery('');
                      }}
                      className="text-[9px] text-slate-500 hover:text-rose-400 transition-colors shrink-0 px-1.5 py-0.5 rounded-lg hover:bg-rose-500/10 font-semibold"
                    >
                      Cambiar
                    </button>
                  </div>
                )}

                {/* Buscador de clientes */}
                <div ref={clientSearchRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                    {clientSearchLoading && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-indigo-400 animate-spin" />
                    )}
                    <input
                      id="cliente-search"
                      type="text"
                      placeholder="Buscar por nombre o RFC..."
                      value={clientSearchQuery}
                      onChange={(e) => handleClientSearch(e.target.value)}
                      onFocus={() => { if (clientSearchResults.length > 0) setShowClientDropdown(true); }}
                      onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                      className="w-full h-8 pl-7 pr-7 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-600 rounded-xl text-[11px] focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Dropdown de resultados */}
                  {showClientDropdown && clientSearchResults.length > 0 && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                      {clientSearchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => selectClienteFromSearch(c)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0"
                        >
                          <p className="text-[11px] font-semibold text-white truncate">{c.nombre}</p>
                          <p className="text-[9px] text-slate-400 font-mono">
                            {c.codigoCliente}
                            {c.rfc ? ` · RFC: ${c.rfc}` : ''}
                            {c.telefono1 ? ` · ${c.telefono1}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {showClientDropdown && clientSearchQuery.length >= 2 && clientSearchResults.length === 0 && !clientSearchLoading && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl px-3 py-2">
                      <p className="text-[11px] text-slate-500 text-center">Sin resultados para "{clientSearchQuery}"</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Lista de Precios */}
                <div className="space-y-1">
                  <Label htmlFor="price-list-select" className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Lista Precios</Label>
                  <select
                    id="price-list-select"
                    value={selectedPriceList}
                    onChange={(e) => setSelectedPriceList(parseInt(e.target.value))}
                    className="w-full h-9 bg-slate-950 border border-slate-800 text-white rounded-xl px-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {[1, 2, 3, 4, 5].map((i) => (
                      <option key={i} value={i}>
                        Lista {i} ({sesion?.sucursal?.[`etiquetaPrecio${i}`] || `Precio ${i}`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descuento Global */}
                <div className="space-y-1">
                  <Label htmlFor="global-discount" className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Desc. Global %</Label>
                  <Input
                    id="global-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={globalDiscountPercent || ''}
                    onChange={(e) => setGlobalDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="h-9 bg-slate-950 border-slate-800 text-indigo-400 font-bold focus-visible:ring-indigo-500 rounded-xl text-xs"
                    placeholder="0%"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-1 hidden">
                <Label htmlFor="obs" className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Observaciones</Label>
                <Input
                  id="obs"
                  type="text"
                  placeholder="Observaciones de la venta (opcional)"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="h-9 bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus-visible:ring-indigo-500 rounded-xl text-xs"
                />
              </div>

            </div>

          </div>

          {/* Panel de Totales y Botón de Cobro */}
          <div className="border-t border-slate-800 pt-4 mt-3 space-y-3 shrink-0">
            <div className="space-y-1 text-slate-400 text-xs">
              <div className="flex justify-between">
                <span>Subtotal Carrito:</span>
                <span className="font-mono text-white font-semibold">${getSubtotal().toFixed(2)}</span>
              </div>
              {globalDiscountPercent > 0 && (
                <div className="flex justify-between text-indigo-400">
                  <span>Descuento Global ({globalDiscountPercent}%):</span>
                  <span className="font-mono font-semibold">-${getGlobalDiscount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Subtotal Neto:</span>
                <span className="font-mono text-white font-semibold">${getNetSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA Trasladado (16%):</span>
                <span className="font-mono text-white font-semibold">${getIva().toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-t border-slate-800">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Total a Cobrar:</span>
              <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                ${getTotal().toFixed(2)}
              </span>
            </div>

            <Button
              onClick={handleOpenPayment}
              disabled={cart.length === 0}
              className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-lg font-bold rounded-2xl transition-all shadow-lg shadow-emerald-950/20 active:scale-[0.98]"
            >
              COBRAR (F12)
            </Button>
          </div>

        </div>

      </div>

      {/* 3. MODALES / DIÁLOGOS DE INTERACCIÓN */}

      {/* MODAL 1: COBRO / PAGO (PaymentModal) */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-emerald-400" />
              Procesar Cobro
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Seleccione la forma de pago e ingrese las cantidades recibidas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmPayment} className="space-y-4 py-2">
            
            {/* Total Display */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Neto:</span>
              <span className="text-3xl font-black text-emerald-400 font-mono">
                ${getTotal().toFixed(2)}
              </span>
            </div>

            {/* Formas de Pago Selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'EFECTIVO', label: 'Efectivo', icon: Coins },
                { type: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
                { type: 'MIXTO', label: 'Pago Mixto', icon: Sliders },
              ].map((p) => {
                const Icon = p.icon;
                const isActive = paymentType === p.type;
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => {
                      setPaymentType(p.type as any);
                      if (p.type === 'EFECTIVO') {
                        setCashReceived(Math.ceil(getTotal()).toString());
                        setCardReceived('0');
                      } else if (p.type === 'TARJETA') {
                        setCashReceived('0');
                        setCardReceived(getTotal().toString());
                      } else {
                        setCashReceived((getTotal() / 2).toFixed(2));
                        setCardReceived((getTotal() / 2).toFixed(2));
                      }
                    }}
                    className={`p-3 border rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                      isActive ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Inputs de pago */}
            <div className="space-y-3">
              {(paymentType === 'EFECTIVO' || paymentType === 'MIXTO') && (
                <div className="space-y-1.5">
                  <Label htmlFor="cash-in" className="text-xs font-semibold text-slate-300">Efectivo Recibido ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                    <Input
                      id="cash-in"
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="pl-9 h-11 bg-slate-950 border-slate-800 text-white font-mono font-bold text-base focus-visible:ring-indigo-500 rounded-xl"
                      required
                    />
                  </div>
                  {/* Billetes rápidos */}
                  {paymentType === 'EFECTIVO' && (
                    <div className="flex gap-1.5 pt-1">
                      {[50, 100, 200, 500].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setCashReceived(b.toString())}
                          className="flex-1 h-7 bg-slate-800 hover:bg-slate-750 border border-slate-850 rounded-lg text-[10px] font-bold text-white transition-colors"
                        >
                          ${b}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(paymentType === 'TARJETA' || paymentType === 'MIXTO') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="card-in" className="text-xs font-semibold text-slate-300">Tarjeta ($)</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                      <Input
                        id="card-in"
                        type="number"
                        step="0.01"
                        min="0"
                        value={cardReceived}
                        onChange={(e) => setCardReceived(e.target.value)}
                        className="pl-9 h-11 bg-slate-950 border-slate-800 text-white font-mono font-bold text-base focus-visible:ring-indigo-500 rounded-xl"
                        disabled={paymentType === 'TARJETA'}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ref-terminal" className="text-xs font-semibold text-slate-300">Ref. Autorización</Label>
                    <Input
                      id="ref-terminal"
                      type="text"
                      placeholder="No. Ref / Autoriz."
                      value={refTerminal}
                      onChange={(e) => setRefTerminal(e.target.value)}
                      className="h-11 bg-slate-950 border-slate-800 text-white placeholder-slate-700 font-bold focus-visible:ring-indigo-500 rounded-xl text-sm"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cambio Vuelto */}
            {(paymentType === 'EFECTIVO' || paymentType === 'MIXTO') && (
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">Cambio a entregar:</span>
                <span className="text-xl font-mono font-black text-amber-400">
                  ${Math.max(0, (parseFloat(cashReceived) || 0) + (parseFloat(cardReceived) || 0) - getTotal()).toFixed(2)}
                </span>
              </div>
            )}

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 h-11 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingVenta}
                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg active:scale-[0.98]"
              >
                {submittingVenta ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando Venta...
                  </>
                ) : (
                  'Registrar y Cobrar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: AJUSTE / MOVIMIENTO MANUAL DE CAJA (MovimientoCaja) */}
      <Dialog open={showMovementModal} onOpenChange={setShowMovementModal}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <RotateCcw className="h-6 w-6 text-indigo-400" />
              Movimiento de Caja Manual
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Registre depósitos (ingresos) o retiros (egresos) de efectivo en caja.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMovementSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'RETIRO', label: 'Retirar Efectivo (-)', icon: TrendingDown },
                { type: 'DEPOSITO', label: 'Depositar Efectivo (+)', icon: TrendingUp },
              ].map((m) => {
                const Icon = m.icon;
                const isActive = movTipo === m.type;
                return (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => setMovTipo(m.type as any)}
                    className={`p-3 border rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                      isActive ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mov-monto" className="text-xs font-semibold text-slate-300">Monto ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                  <Input
                    id="mov-monto"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={movMonto}
                    onChange={(e) => setMovMonto(e.target.value)}
                    className="pl-9 h-11 bg-slate-950 border-slate-800 text-white font-mono font-bold text-base focus-visible:ring-indigo-500 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mov-concepto" className="text-xs font-semibold text-slate-300">Concepto / Motivo</Label>
                <Input
                  id="mov-concepto"
                  type="text"
                  placeholder="Ej. Pago a proveedor, Retiro parcial a bóveda..."
                  value={movConcepto}
                  onChange={(e) => setMovConcepto(e.target.value)}
                  className="h-11 bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus-visible:ring-indigo-500 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMovementModal(false)}
                className="flex-1 h-11 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingMov}
                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg active:scale-[0.98]"
              >
                {submittingMov ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar Movimiento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CIERRE DE CAJA (Corte Z / Z-cut) */}
      <Dialog open={showCloseSessionModal} onOpenChange={setShowCloseSessionModal}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Power className="h-6 w-6 text-rose-500" />
              Cierre de Turno (Corte Z)
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Declare el total de dinero físico en efectivo existente en la caja.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCloseSession} className="space-y-4 py-2">
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-center items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-xs text-slate-400 text-center">
                Esta acción cerrará la sesión de caja activa e imprimirá el cuadro de corte.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="declared-cash" className="text-xs font-semibold text-slate-300">Efectivo Físico Declarado ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                  <Input
                    id="declared-cash"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto en efectivo"
                    value={efectivoDeclarado}
                    onChange={(e) => setEfectivoDeclarado(e.target.value)}
                    className="pl-9 h-11 bg-slate-950 border-slate-800 text-white font-mono font-bold text-base focus-visible:ring-indigo-500 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="obs-cierre" className="text-xs font-semibold text-slate-300">Observaciones de Cierre</Label>
                <Input
                  id="obs-cierre"
                  type="text"
                  placeholder="Detalle descuadres o novedades aquí..."
                  value={obsCierre}
                  onChange={(e) => setObsCierre(e.target.value)}
                  className="h-11 bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus-visible:ring-indigo-500 rounded-xl text-sm"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCloseSessionModal(false)}
                className="flex-1 h-11 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={closingSession}
                className="flex-1 h-11 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-all shadow-lg active:scale-[0.98]"
              >
                {closingSession ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cerrando Caja...
                  </>
                ) : (
                  'Efectuar Cierre de Caja'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: CONFIGURACIÓN DE IMPRESORA SERIAL */}
      <Dialog open={showPrinterSettings} onOpenChange={setShowPrinterSettings}>
        <DialogContent className="max-w-sm bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="h-6 w-6 text-indigo-400" />
              Impresora Térmica
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Vincule una impresora directa ESC/POS por puerto serie USB.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="baud-rate" className="text-xs font-semibold text-slate-300">Velocidad del Puerto (Baudios)</Label>
              <select
                id="baud-rate"
                value={baudRate}
                onChange={(e) => setBaudRate(parseInt(e.target.value))}
                className="w-full h-11 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="9600">9600 (Epson, Star, Bixolon estándar)</option>
                <option value="19200">19200</option>
                <option value="38400">38400</option>
                <option value="115200">115200</option>
              </select>
            </div>

            <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-2xl text-xs text-slate-400 leading-normal space-y-1.5">
              <p className="font-semibold text-white">Instrucciones:</p>
              <p>1. Conecte su impresora térmica vía USB.</p>
              <p>2. Presione &quot;Buscar Puerto&quot; y elija su impresora (o el adaptador USB-Serial).</p>
              <p>3. Permita el acceso y se configurará de inmediato.</p>
            </div>
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPrinterSettings(false)}
              className="flex-1 h-11 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl"
            >
              Cerrar
            </Button>
            <Button
              onClick={handleConnectPrinter}
              className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg active:scale-[0.98]"
            >
              Buscar Puerto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: VISOR PREVIA TICKET PDF (FALLBACK PRINTING) */}
      <Dialog open={showTicketPreview} onOpenChange={setShowTicketPreview}>
        <DialogContent className="max-w-sm bg-white text-slate-900 rounded-3xl p-6 overflow-hidden">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <Printer className="h-4 w-4" />
              Vista Previa de Ticket (80mm)
            </DialogTitle>
          </DialogHeader>

          {/* Área del ticket imprimible */}
          <div className="max-h-[60vh] overflow-y-auto border p-4 bg-slate-50 font-mono text-[10px] leading-tight space-y-2 select-text">
            {lastVentaResult && (
              <div className="space-y-2">
                <div className="text-center space-y-1">
                  <p className="font-bold text-sm">FERRECOLORS ERP</p>
                  <p>RFC: XAXX010101000</p>
                  <p>{sesion?.sucursal?.nombre || 'SUCURSAL MATRIZ'}</p>
                  <p>----------------------------------</p>
                </div>
                <div>
                  <p>TICKET: {lastVentaResult.numeroTicket}</p>
                  <p>FECHA: {new Date().toLocaleString()}</p>
                  <p>CAJA: {sesion.numeroTerminal || 'Caja 1'}</p>
                  <p>CLIENTE: {selectedCliente?.nombre || 'Publico general'}</p>
                  <p>----------------------------------</p>
                </div>
                <div>
                  <div className="flex justify-between font-bold">
                    <span>CANT / PRODUCTO</span>
                    <span>TOTAL</span>
                  </div>
                  <p>----------------------------------</p>
                  {/* Detalles ficticios para visualización simple */}
                  <p>COMPLETADO CON ÉXITO</p>
                </div>
                <div className="text-right space-y-1">
                  <p>TOTAL PAGADO: ${lastVentaResult.total?.toFixed(2)}</p>
                  {lastVentaResult.pagoEfectivo > 0 && <p>Efectivo: ${lastVentaResult.pagoEfectivo?.toFixed(2)}</p>}
                  {lastVentaResult.pagoTarjeta > 0 && <p>Tarjeta: ${lastVentaResult.pagoTarjeta?.toFixed(2)}</p>}
                  {lastVentaResult.cambio > 0 && <p>Cambio: ${lastVentaResult.cambio?.toFixed(2)}</p>}
                </div>
                <div className="text-center pt-2">
                  <p className="font-bold">GRACIAS POR SU COMPRA!</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTicketPreview(false)}
              className="flex-1 h-10 border-slate-200 text-slate-600 rounded-xl"
            >
              Cerrar
            </Button>
            <Button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.print();
                }
              }}
              className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
            >
              Imprimir PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: REGISTRO RÁPIDO DE PRODUCTO EXTERNO (CODEBAR) */}
      <Dialog open={showQuickRegisterModal} onOpenChange={setShowQuickRegisterModal}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Tag className="h-6 w-6 text-emerald-400 animate-pulse" />
              Registro Rápido de Producto
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Este producto no está registrado en la base de datos de FerreColors.
            </DialogDescription>
          </DialogHeader>

          {externalProductData && (
            <form onSubmit={handleQuickRegisterSubmit} className="space-y-4 py-2">
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Código de Barras:</span>
                  <span className="font-mono text-white font-bold">{externalProductData.codigoBarras}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nombre:</span>
                  <span className="font-bold text-white max-w-[200px] text-right truncate" title={externalProductData.nombre}>
                    {externalProductData.nombre}
                  </span>
                </div>
                {externalProductData.marca && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Marca:</span>
                    <span className="text-white font-medium">{externalProductData.marca}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Categoría sugerida:</span>
                  <span className="text-white font-medium">{externalProductData.categoria}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unidad:</span>
                  <span className="text-white font-medium">{externalProductData.unidadMedida}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quick-price" className="text-xs font-semibold text-slate-300">Precio Público ($) *</Label>
                  <Input
                    id="quick-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder-slate-700 rounded-xl focus-visible:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="quick-stock" className="text-xs font-semibold text-slate-300">Stock Inicial (Pzas) *</Label>
                  <Input
                    id="quick-stock"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={quickStock}
                    onChange={(e) => setQuickStock(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder-slate-700 rounded-xl focus-visible:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowQuickRegisterModal(false);
                    setExternalProductData(null);
                  }}
                  className="flex-1 h-11 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingQuickProduct}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/10 active:scale-[0.98]"
                >
                  {savingQuickProduct ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Registrar y Agregar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 7: PEDIDOS EN LÍNEA (CLICK & COLLECT) */}
      <Dialog open={showOnlinePedidosModal} onOpenChange={setShowOnlinePedidosModal}>
        <DialogContent className="max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Clock className="h-7 w-7 text-indigo-400 animate-pulse" />
              Pedidos Click & Collect (Recogida en Sucursal)
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Gestione y prepare los pedidos realizados en línea por los clientes para esta sucursal.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {loadingOnlinePedidos ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                <p className="text-xs">Cargando pedidos online...</p>
              </div>
            ) : onlinePedidos.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No hay pedidos en línea activos para esta sucursal.
              </div>
            ) : (
              <div className="space-y-4">
                {onlinePedidos.map((pedido) => {
                  const isPendiente = pedido.estatus === 'PENDIENTE';
                  const isAprobado = pedido.estatus === 'APROBADO';
                  return (
                    <div 
                      key={pedido.id} 
                      className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-800"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                            {pedido.folio}
                          </span>
                          <Badge className={
                            isPendiente 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] px-2 py-0.5' 
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] px-2 py-0.5'
                          }>
                            {isPendiente ? 'Por Preparar' : 'Listo para Recoger'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                          <div className="text-left">
                            <span className="text-slate-500 font-semibold">Cliente:</span>{' '}
                            <span className="text-slate-200 font-bold">{pedido.cliente?.nombre}</span>
                          </div>
                          <div className="text-left font-mono">
                            <span className="text-slate-500">Contacto:</span>{' '}
                            <span className="text-slate-200">{pedido.cliente?.telefono1 || 'Sin teléfono'}</span>
                          </div>
                          <div className="text-left">
                            <span className="text-slate-500">Fecha:</span>{' '}
                            <span>{new Date(pedido.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="text-left">
                            <span className="text-slate-500">Total:</span>{' '}
                            <span className="text-emerald-400 font-bold font-mono">${pedido.total?.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Detalle de productos */}
                        <div className="pt-2 text-left">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Productos:</p>
                          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-950 space-y-1 text-xs font-mono">
                            {pedido.detalles.map((d: any) => (
                              <div key={d.id} className="flex justify-between text-slate-300">
                                <span className="truncate max-w-[280px]">{d.producto.nombre}</span>
                                <span>{d.cantidad} {d.producto.unidadMedida} x ${d.precioUnitario?.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2 shrink-0 justify-end md:w-44">
                        {isPendiente && (
                          <Button
                            onClick={() => handleUpdatePedidoEstatus(pedido.id, 'APROBADO')}
                            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs py-2 h-9"
                          >
                            Marcar Preparado
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => {
                            const mappedItems = pedido.detalles.map((d: any) => ({
                              productoId: d.productoId,
                              codigo: d.producto.codigo,
                              nombre: d.producto.nombre,
                              cantidad: d.cantidad,
                              precioUnitario: d.precioUnitario,
                              descuento: d.descuento || 0,
                              stock: 9999,
                              unidadMedida: d.producto.unidadMedida || 'PZ'
                            }));
                            setCart(mappedItems);
                            setSelectedCliente(pedido.cliente);
                            setSelectedPedidoId(pedido.id);
                            setShowOnlinePedidosModal(false);
                            toast.success(`Pedido ${pedido.folio} cargado. Complete el cobro.`);
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs py-2 h-9"
                        >
                          Cobrar en Caja
                        </Button>

                        <Button
                          onClick={() => {
                            const motivo = prompt('Ingrese el motivo de la cancelación:');
                            if (motivo !== null) {
                              handleUpdatePedidoEstatus(pedido.id, 'CANCELADO', motivo || 'Cancelación del operador');
                            }
                          }}
                          variant="ghost"
                          className="flex-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl text-xs py-2 h-9"
                        >
                          Cancelar Pedido
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOnlinePedidosModal(false)}
              className="w-full h-11 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl"
            >
              Cerrar Ventana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
