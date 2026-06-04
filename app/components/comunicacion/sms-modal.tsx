
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { MessageSquare, Send, Loader2, Calendar } from 'lucide-react';

interface SMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteNombre?: string;
  clienteTelefono?: string;
  mensajePredefinido?: string;
}

export function SMSModal({ 
  isOpen, 
  onClose, 
  clienteNombre = '', 
  clienteTelefono = '',
  mensajePredefinido = ''
}: SMSModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    to: clienteTelefono,
    message: mensajePredefinido,
    from: '',
    scheduleDate: ''
  });

  const mensajesPredefinidos = [
    'Su pago ha sido registrado. Gracias por su confianza.',
    'Recordatorio: Pago pendiente por $MONTO. Favor de liquidar.',
    'Su credito ha sido aprobado. Contacte a su gestor.',
    'Proximo pago vence el $FECHA. No olvide pagar a tiempo.',
    'Nuevos productos disponibles. Consultenos para mas info.'
  ];

  // Calcular el número de caracteres y partes del SMS
  const messageLength = formData.message.length;
  const smsPartes = Math.ceil(messageLength / 160);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          scheduleDate: formData.scheduleDate || undefined
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`SMS enviado exitosamente. Costo: $${result.cost?.toFixed(2) || 'N/A'}`);
        onClose();
        setFormData({
          to: '',
          message: '',
          from: '',
          scheduleDate: ''
        });
      } else {
        toast.error(result.error || 'Error al enviar SMS');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Enviar SMS
          </DialogTitle>
          <DialogDescription>
            {clienteNombre ? `Enviar mensaje a ${clienteNombre}` : 'Enviar mensaje por SMS'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="to">Número de teléfono</Label>
              <Input
                id="to"
                placeholder="5214421234567"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                required
              />
              <p className="text-sm text-gray-500">
                Incluir código de país (ej: 52 para México)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from">Remitente (opcional)</Label>
              <Input
                id="from"
                placeholder="MiEmpresa"
                maxLength={15}
                value={formData.from}
                onChange={(e) => setFormData({ ...formData, from: e.target.value })}
              />
              <p className="text-sm text-gray-500">
                Máximo 15 caracteres. Si se deja vacío se usará un número
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensaje-predefinido">Mensaje predefinido (opcional)</Label>
              <Select 
                onValueChange={(value) => setFormData({ ...formData, message: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mensaje predefinido" />
                </SelectTrigger>
                <SelectContent>
                  {mensajesPredefinidos.map((mensaje, index) => (
                    <SelectItem key={index} value={mensaje}>
                      {mensaje}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="Escriba su mensaje aquí..."
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>Caracteres: {messageLength}</span>
                <span>Partes SMS: {smsPartes}</span>
              </div>
              {messageLength > 160 && (
                <p className="text-sm text-orange-600">
                  ⚠️ El mensaje excede 160 caracteres y se enviará en {smsPartes} partes
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduleDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Programar envío (opcional)
              </Label>
              <Input
                id="scheduleDate"
                type="datetime-local"
                value={formData.scheduleDate}
                onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-sm text-gray-500">
                Si se programa, el SMS se enviará en la fecha y hora especificada
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar SMS
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
