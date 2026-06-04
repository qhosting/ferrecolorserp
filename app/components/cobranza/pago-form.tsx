
'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, MapPin, Clock, Printer, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { offlineStorage } from '@/lib/offline-storage';
import { ticketPrinter, type TicketData } from '@/lib/ticket-printer';
import { toast } from 'sonner';

interface Cliente {
  cod_cliente: string;
  nombre_ccliente: string;
  codigo_gestor: string;
  periodicidad_cliente: string;
  pagos_cliente: number;
  tel1_cliente: string;
  saldo_actualcli: string;
  calle_dom: string;
  colonia_dom: string;
  dia_cobro: string;
  semv: string;
  semdv: string;
}

interface PagoFormProps {
  cliente: Cliente;
  codigoGestor: string;
  onPagoCompletado: () => void;
}

export default function PagoForm({ cliente, codigoGestor, onPagoCompletado }: PagoFormProps) {
  const [montoPago, setMontoPago] = useState('');
  const [montoMora, setMontoMora] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const saldoActual = parseFloat(cliente.saldo_actualcli) || 0;
  const pagoSugerido = cliente.pagos_cliente || 0;
  const diasVencidos = parseInt(cliente.semdv) || 0;

  // Obtener ubicación GPS al cargar
  useEffect(() => {
    obtenerUbicacion();
  }, []);

  const obtenerUbicacion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUbicacion({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Error obteniendo ubicación:', error);
          // Continuar sin ubicación
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const calcularNuevoSaldo = () => {
    const pago = parseFloat(montoPago) || 0;
    const mora = parseFloat(montoMora) || 0;
    return saldoActual - pago - mora;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!montoPago || parseFloat(montoPago) <= 0) {
      toast.error('Ingrese un monto de pago válido');
      return;
    }

    setLoading(true);

    try {
      const pago = parseFloat(montoPago);
      const mora = parseFloat(montoMora) || 0;
      const nuevoSaldo = calcularNuevoSaldo();
      
      const pagoData = {
        cod_cliente: cliente.cod_cliente,
        nombre_ccliente: cliente.nombre_ccliente,
        ref_pago: 'Pago móvil',
        montop: pago,
        mora: mora,
        codigo_gestor: codigoGestor,
        periodicidad_cliente: cliente.periodicidad_cliente,
        dia_cobro: cliente.dia_cobro,
        latitud: ubicacion?.lat.toString() || '',
        longitud: ubicacion?.lng.toString() || '',
        tel1_cliente: cliente.tel1_cliente,
        posp: ubicacion ? `${ubicacion.lat},${ubicacion.lng}` : '',
        saldo_actualcli: nuevoSaldo.toString(),
        tipopag: 'GESTOR',
        observaciones: observaciones
      };

      // Guardar pago en almacenamiento offline
      const pagoId = await offlineStorage.savePago(pagoData);
      
      // Preparar datos del ticket
      const ticketData: TicketData = {
        cod_cliente: cliente.cod_cliente,
        nombre_cliente: cliente.nombre_ccliente,
        telefono: cliente.tel1_cliente,
        direccion: `${cliente.calle_dom}, ${cliente.colonia_dom}`,
        monto_pago: pago,
        monto_mora: mora,
        saldo_anterior: saldoActual,
        saldo_actual: nuevoSaldo,
        fecha_pago: new Date().toISOString().split('T')[0],
        fecha_impresion: new Date().toISOString(),
        codigo_gestor: codigoGestor,
        dias_vencidos: diasVencidos,
        latitud: ubicacion?.lat.toString(),
        longitud: ubicacion?.lng.toString()
      };

      toast.success('Pago registrado correctamente');

      // Limpiar formulario
      setMontoPago('');
      setMontoMora('');
      setObservaciones('');

      // Notificar completación
      onPagoCompletado();

      // Ofrecer impresión de ticket
      const imprimirTicket = window.confirm('¿Desea imprimir el ticket de pago?');
      if (imprimirTicket) {
        await handleImprimirTicket(ticketData);
      }

    } catch (error) {
      console.error('Error registrando pago:', error);
      toast.error('Error registrando el pago: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimirTicket = async (ticketData: TicketData) => {
    setImprimiendo(true);
    
    try {
      await ticketPrinter.printTicket(ticketData);
      toast.success('Ticket enviado a impresora');
    } catch (error) {
      console.error('Error imprimiendo ticket:', error);
      toast.error('Error imprimiendo ticket: ' + (error as Error).message);
    } finally {
      setImprimiendo(false);
    }
  };

  const nuevoSaldo = calcularNuevoSaldo();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Registrar Pago
        </CardTitle>
        <div className="space-y-2">
          <p className="font-medium">{cliente.nombre_ccliente}</p>
          <p className="text-sm text-gray-600">Código: {cliente.cod_cliente}</p>
          <div className="flex gap-2">
            <Badge variant={saldoActual > 0 ? 'destructive' : 'default'}>
              Saldo: ${saldoActual.toFixed(2)}
            </Badge>
            {diasVencidos > 0 && (
              <Badge variant="secondary">
                {diasVencidos} días vencido
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto del pago */}
          <div className="space-y-2">
            <Label htmlFor="montoPago">Monto del Pago *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="montoPago"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            {pagoSugerido > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMontoPago(pagoSugerido.toString())}
              >
                Usar pago sugerido: ${pagoSugerido}
              </Button>
            )}
          </div>

          {/* Monto de mora (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="montoMora">Monto de Mora (opcional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="montoMora"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={montoMora}
                onChange={(e) => setMontoMora(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Nuevo saldo calculado */}
          {montoPago && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Resumen del Pago</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Saldo anterior:</span>
                  <span>${saldoActual.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pago recibido:</span>
                  <span className="text-green-600">-${parseFloat(montoPago).toFixed(2)}</span>
                </div>
                {montoMora && parseFloat(montoMora) > 0 && (
                  <div className="flex justify-between">
                    <span>Mora recibida:</span>
                    <span className="text-green-600">-${parseFloat(montoMora).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Nuevo saldo:</span>
                  <span className={nuevoSaldo <= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${nuevoSaldo.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones"
              placeholder="Notas adicionales sobre el pago..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
            />
          </div>

          {/* Información de ubicación */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            {ubicacion ? (
              <span>Ubicación capturada: {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}</span>
            ) : (
              <span>Obteniendo ubicación...</span>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={loading || !montoPago}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Registrar Pago
                </>
              )}
            </Button>
          </div>

          {/* Información adicional */}
          <div className="text-xs text-gray-500 space-y-1 border-t pt-2">
            <p>• El pago se guardará en el dispositivo</p>
            <p>• Se sincronizará automáticamente cuando haya internet</p>
            <p>• Se capturará la ubicación GPS del pago</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
