
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
import { MessageCircle, Paperclip, Send, Loader2 } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteNombre?: string;
  clienteTelefono?: string;
  mensajePredefinido?: string;
}

export function WhatsAppModal({ 
  isOpen, 
  onClose, 
  clienteNombre = '', 
  clienteTelefono = '',
  mensajePredefinido = ''
}: WhatsAppModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    number: clienteTelefono,
    message: mensajePredefinido,
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'document' | 'audio' | 'video',
    fileName: ''
  });

  const mensajesPredefinidos = [
    'Estimado cliente, le recordamos que tiene un pago pendiente por $MONTO. Por favor, acérquese a nuestras oficinas.',
    'Su pago ha sido registrado exitosamente. ¡Gracias por su confianza!',
    'Le informamos que su crédito ha sido aprobado. Para más detalles contacte a su gestor.',
    'Recordatorio: Su próximo pago vence el día $FECHA. ¡No olvide realizar su pago a tiempo!',
    'Le invitamos a conocer nuestros nuevos productos y servicios. Contáctenos para más información.'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('WhatsApp enviado exitosamente');
        onClose();
        setFormData({
          number: '',
          message: '',
          mediaUrl: '',
          mediaType: 'image',
          fileName: ''
        });
      } else {
        toast.error(result.error || 'Error al enviar WhatsApp');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar WhatsApp');
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
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar WhatsApp
          </DialogTitle>
          <DialogDescription>
            {clienteNombre ? `Enviar mensaje a ${clienteNombre}` : 'Enviar mensaje por WhatsApp'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="number">Número de teléfono</Label>
              <Input
                id="number"
                placeholder="5214421234567"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                required
              />
              <p className="text-sm text-gray-500">
                Incluir código de país (ej: 52 para México)
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
                      {mensaje.substring(0, 60)}...
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
              <p className="text-sm text-gray-500">
                Caracteres: {formData.message.length}
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="h-4 w-4" />
                <Label>Archivo adjunto (opcional)</Label>
              </div>
              
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="mediaUrl">URL del archivo</Label>
                  <Input
                    id="mediaUrl"
                    placeholder="https://upload.wikimedia.org/wikipedia/commons/6/63/Generic_placeholder_page.jpg"
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  />
                </div>

                {formData.mediaUrl && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="mediaType">Tipo de archivo</Label>
                      <Select 
                        value={formData.mediaType}
                        onValueChange={(value: any) => setFormData({ ...formData, mediaType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">Imagen</SelectItem>
                          <SelectItem value="document">Documento</SelectItem>
                          <SelectItem value="audio">Audio</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fileName">Nombre del archivo</Label>
                      <Input
                        id="fileName"
                        placeholder="archivo.jpg"
                        value={formData.fileName}
                        onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
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
                  Enviar WhatsApp
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
