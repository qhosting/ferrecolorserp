
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { offlineStorage } from '@/lib/offline-storage';
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign,
  Printer,
  Eye,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface RecentPaymentsProps {
  gestorId?: string;
  isOnline: boolean;
}

export function RecentPayments({ gestorId, isOnline }: RecentPaymentsProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  useEffect(() => {
    loadPayments();
  }, [gestorId, selectedPeriod]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      let allPayments = [];
      
      if (isOnline) {
        const response = await fetch(`/api/pagos?gestorId=${gestorId}&period=${selectedPeriod}`);
        if (response.ok) {
          allPayments = await response.json();
        }
      } else {
        allPayments = await offlineStorage.getPagos(gestorId);
      }
      
      // Filtrar por período
      const filteredPayments = filterPaymentsByPeriod(allPayments, selectedPeriod);
      setPayments(filteredPayments.slice(0, 50)); // Límite de 50 registros
      
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  const filterPaymentsByPeriod = (payments: any[], period: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return payments.filter(payment => {
      const paymentDate = new Date(payment.fechaPago);
      
      switch (period) {
        case 'today':
          return paymentDate >= today;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return paymentDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
          return paymentDate >= monthAgo;
        default:
          return true;
      }
    }).sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTipoPagoColor = (tipo: string) => {
    const colors = {
      'EFECTIVO': 'bg-green-100 text-green-800',
      'TARJETA': 'bg-blue-100 text-blue-800',
      'TRANSFERENCIA': 'bg-purple-100 text-purple-800',
      'CHEQUE': 'bg-yellow-100 text-yellow-800',
      'OTRO': 'bg-gray-100 text-gray-800'
    };
    return colors[tipo as keyof typeof colors] || colors['OTRO'];
  };

  const handlePrintTicket = async (payment: any) => {
    try {
      // Simulamos la reimpresión del ticket
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Ticket reimpreso para ${payment.nombreCliente}`);
    } catch (error) {
      toast.error('Error al reimprimir ticket');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Pagos
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadPayments}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Filtros de período */}
        <div className="flex gap-2">
          {[
            { key: 'today', label: 'Hoy' },
            { key: 'week', label: 'Esta Semana' },
            { key: 'month', label: 'Este Mes' }
          ].map(period => (
            <Button
              key={period.key}
              variant={selectedPeriod === period.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period.key)}
            >
              {period.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header del pago */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getClientInitials(payment.nombreCliente || payment.cliente?.nombre || 'Cliente')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.nombreCliente || payment.cliente?.nombre}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payment.codigoCliente || payment.cliente?.codigoCliente}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(payment.monto)}
                      </p>
                      <Badge className={`text-xs ${getTipoPagoColor(payment.tipoPago)}`}>
                        {payment.tipoPago}
                      </Badge>
                    </div>
                  </div>

                  {/* Detalles del pago */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(payment.fechaPago).toLocaleDateString('es-MX')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {new Date(payment.fechaHora || payment.fechaPago).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {payment.referencia && (
                      <div className="col-span-2">
                        <span className="font-medium">Ref:</span> {payment.referencia}
                      </div>
                    )}
                    {(payment.latitud && payment.longitud) && (
                      <div className="col-span-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs">
                          {payment.latitud}, {payment.longitud}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status del pago */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {payment.sincronizado === false && (
                        <Badge variant="secondary" className="text-xs">
                          Pendiente Sync
                        </Badge>
                      )}
                      {payment.offline && (
                        <Badge variant="outline" className="text-xs">
                          Offline
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintTicket(payment)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Observaciones */}
                  {payment.observaciones && (
                    <div className="bg-gray-50 p-2 rounded text-sm">
                      <span className="font-medium">Observaciones:</span> {payment.observaciones}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay pagos registrados</p>
              <p className="text-sm text-gray-400 mt-1">
                {selectedPeriod === 'today' ? 'para hoy' : 
                 selectedPeriod === 'week' ? 'esta semana' : 'este mes'}
              </p>
            </div>
          )}
        </ScrollArea>
        
        {payments.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Mostrando {payments.length} pago(s) reciente(s)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
