
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { offlineStorage } from '@/lib/offline-storage';
import { 
  CreditCard, 
  DollarSign, 
  MapPin, 
  Calendar, 
  Printer, 
  Save,
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentFormCardProps {
  client: any;
  location: { lat: number; lng: number } | null;
  onPaymentSuccess: () => void;
  onCancel: () => void;
  isOnline: boolean;
}

export function PaymentFormCard({ 
  client, 
  location, 
  onPaymentSuccess, 
  onCancel,
  isOnline 
}: PaymentFormCardProps) {
  const { data: session } = useSession() || {};
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  
  const [formData, setFormData] = useState({
    monto: '',
    tipoPago: 'EFECTIVO',
    referencia: '',
    observaciones: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const generateReference = () => {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    const prefix = session?.user?.name?.substring(0, 2).toUpperCase() || 'PA';
    return `${prefix}${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }

    setLoading(true);
    
    try {
      const paymentData = {
        clienteId: client.id,
        codigoCliente: client.codigoCliente,
        nombreCliente: client.nombre,
        monto: parseFloat(formData.monto),
        tipoPago: formData.tipoPago,
        referencia: formData.referencia || generateReference(),
        observaciones: formData.observaciones,
        gestorId: session?.user?.id,
        gestorNombre: session?.user?.name,
        latitud: location?.lat?.toString() || null,
        longitud: location?.lng?.toString() || null,
        fechaPago: new Date().toISOString(),
        fechaHora: new Date().toISOString()
      };

      let savedPayment;
      
      if (isOnline) {
        // Guardar en el servidor
        const response = await fetch('/api/pagos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        });

        if (!response.ok) {
          throw new Error('Error al guardar pago en el servidor');
        }

        savedPayment = await response.json();
        toast.success('Pago guardado en el servidor');
      } else {
        // Guardar offline
        const paymentId = await offlineStorage.savePago(paymentData);
        savedPayment = { ...paymentData, id: paymentId };
        toast.success('Pago guardado offline. Se sincronizará cuando haya conexión.');
      }

      // Generar y guardar ticket
      const ticketData = {
        pagoId: savedPayment.id,
        clienteNombre: client.nombre,
        clienteCodigo: client.codigoCliente,
        monto: paymentData.monto,
        tipoPago: paymentData.tipoPago,
        referencia: paymentData.referencia,
        fecha: new Date().toLocaleDateString('es-MX'),
        hora: new Date().toLocaleTimeString('es-MX'),
        gestor: session?.user?.name,
        ubicacion: location ? `${location.lat}, ${location.lng}` : 'Sin ubicación'
      };

      await offlineStorage.saveTicket(ticketData);
      
      // Resetear formulario
      setFormData({
        monto: '',
        tipoPago: 'EFECTIVO',
        referencia: '',
        observaciones: ''
      });

      onPaymentSuccess();
      
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Error al guardar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintTicket = async () => {
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      toast.error('Primero registre el pago');
      return;
    }

    setPrinting(true);
    
    try {
      const ticketData = {
        clienteNombre: client.nombre,
        clienteCodigo: client.codigoCliente,
        monto: parseFloat(formData.monto),
        tipoPago: formData.tipoPago,
        referencia: formData.referencia || generateReference(),
        fecha: new Date().toLocaleDateString('es-MX'),
        hora: new Date().toLocaleTimeString('es-MX'),
        gestor: session?.user?.name,
        ubicacion: location ? `${location.lat}, ${location.lng}` : 'Sin ubicación'
      };

      // Simulamos la impresión
      // En una implementación real, aquí se conectaría con la impresora Bluetooth
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Ticket impreso correctamente');
    } catch (error) {
      console.error('Error printing ticket:', error);
      toast.error('Error al imprimir ticket');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Registrar Pago
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información del cliente */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">{client.nombre}</h3>
            <Badge variant={client.status === 'ACTIVO' ? 'default' : 'destructive'}>
              {client.status}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Código:</span>
              <span className="ml-2 font-medium">{client.codigoCliente}</span>
            </div>
            <div>
              <span className="text-gray-500">Saldo:</span>
              <span className="ml-2 font-medium text-red-600">
                {formatCurrency(client.saldoActual || 0)}
              </span>
            </div>
            {client.telefono1 && (
              <div>
                <span className="text-gray-500">Teléfono:</span>
                <span className="ml-2">{client.telefono1}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Periodicidad:</span>
              <span className="ml-2">{client.periodicidad}</span>
            </div>
          </div>
          
          {location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>Ubicación: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Formulario de pago */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoPago">Tipo de Pago</Label>
              <Select 
                value={formData.tipoPago} 
                onValueChange={(value) => setFormData({ ...formData, tipoPago: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TARJETA">Tarjeta</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referencia">Referencia</Label>
            <Input
              id="referencia"
              placeholder="Referencia del pago (opcional)"
              value={formData.referencia}
              onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              Si no se ingresa, se generará automáticamente
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              placeholder="Observaciones adicionales (opcional)"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
            />
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 p-3 rounded-lg text-sm space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Fecha y Hora:</span>
              <span>{new Date().toLocaleString('es-MX')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Gestor:</span>
              <span>{session?.user?.name}</span>
            </div>
            {!isOnline && (
              <div className="flex items-center gap-2 text-amber-600">
                <Badge variant="secondary">Offline</Badge>
                <span>Se sincronizará automáticamente</span>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Pago
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handlePrintTicket}
              disabled={printing || !formData.monto}
            >
              {printing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
