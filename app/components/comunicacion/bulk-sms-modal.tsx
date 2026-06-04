
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { MessageSquare, Send, Loader2, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface Cliente {
  id: string;
  nombre: string;
  telefono1?: string;
  saldoActual: number;
}

interface BulkSMSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkSMSModal({ isOpen, onClose }: BulkSMSModalProps) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [filtro, setFiltro] = useState('todos');
  const [formData, setFormData] = useState({
    message: '',
    from: '',
    includeDebt: false
  });
  const [results, setResults] = useState<any>(null);

  const mensajesPredefinidos = [
    'Su pago ha sido registrado. Gracias por su confianza.',
    'Recordatorio: Pago pendiente por $[SALDO]. Favor de liquidar.',
    'Su credito ha sido aprobado. Contacte a su gestor.',
    'Nuevos productos disponibles. Consultenos para mas info.',
    'Promocion especial para clientes preferenciales. Mas info al...'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchClientes();
    }
  }, [isOpen]);

  const fetchClientes = async () => {
    try {
      const response = await fetch('/api/clientes');
      if (response.ok) {
        const data = await response.json();
        const clientesConTelefono = data.filter((cliente: Cliente) => cliente.telefono1);
        setClientes(clientesConTelefono);
      }
    } catch (error) {
      console.error('Error fetching clientes:', error);
      toast.error('Error al cargar clientes');
    }
  };

  const clientesFiltrados = clientes.filter(cliente => {
    switch (filtro) {
      case 'morosos':
        return cliente.saldoActual > 0;
      case 'activos':
        return cliente.saldoActual === 0;
      default:
        return true;
    }
  });

  const handleSelectAll = () => {
    if (selectedClientes.length === clientesFiltrados.length) {
      setSelectedClientes([]);
    } else {
      setSelectedClientes(clientesFiltrados.map(c => c.id));
    }
  };

  const handleClienteToggle = (clienteId: string) => {
    setSelectedClientes(prev => 
      prev.includes(clienteId)
        ? prev.filter(id => id !== clienteId)
        : [...prev, clienteId]
    );
  };

  const prepareMessages = () => {
    return selectedClientes.map(clienteId => {
      const cliente = clientes.find(c => c.id === clienteId);
      if (!cliente) return null;

      let message = formData.message;
      
      // Reemplazar variables en el mensaje
      if (formData.includeDebt && cliente.saldoActual > 0) {
        message = message.replace('[SALDO]', `$${cliente.saldoActual.toFixed(2)}`);
      }
      message = message.replace('[NOMBRE]', cliente.nombre);

      return {
        to: cliente.telefono1!,
        message,
        from: formData.from || undefined
      };
    }).filter(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedClientes.length === 0) {
      toast.error('Seleccione al menos un cliente');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const messages = prepareMessages();
      
      const response = await fetch('/api/sms/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      const result = await response.json();

      if (result.success) {
        setResults(result);
        toast.success(`SMS masivo completado: ${result.successCount}/${result.totalMessages} enviados`);
      } else {
        toast.error(result.error || 'Error al enviar SMS masivo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar SMS masivo');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setResults(null);
      setSelectedClientes([]);
      setFormData({ message: '', from: '', includeDebt: false });
    }
  };

  const messageLength = formData.message.length;
  const smsPartes = Math.ceil(messageLength / 160);
  const estimatedCost = selectedClientes.length * smsPartes * 0.15; // Estimado

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            SMS Masivo
          </DialogTitle>
          <DialogDescription>
            Enviar mensajes SMS a múltiples clientes
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Configuración del mensaje */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="from">Remitente (opcional)</Label>
                <Input
                  id="from"
                  placeholder="MiEmpresa"
                  maxLength={15}
                  value={formData.from}
                  onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mensaje-predefinido">Mensaje predefinido</Label>
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
                  placeholder="Escriba su mensaje aquí... Use [NOMBRE] para el nombre del cliente y [SALDO] para el saldo"
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Caracteres: {messageLength}</span>
                  <span>Partes SMS: {smsPartes}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDebt"
                  checked={formData.includeDebt}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, includeDebt: checked as boolean })
                  }
                />
                <Label htmlFor="includeDebt">Incluir saldo en el mensaje</Label>
              </div>
            </div>

            {/* Selección de clientes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Seleccionar clientes</Label>
                <div className="flex items-center gap-2">
                  <Select value={filtro} onValueChange={setFiltro}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="morosos">Con saldo</SelectItem>
                      <SelectItem value="activos">Al corriente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedClientes.length === clientesFiltrados.length ? 'Deseleccionar' : 'Seleccionar'} todo
                  </Button>
                </div>
              </div>

              <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                {clientesFiltrados.map((cliente) => (
                  <div key={cliente.id} className="flex items-center space-x-2 py-2">
                    <Checkbox
                      checked={selectedClientes.includes(cliente.id)}
                      onCheckedChange={() => handleClienteToggle(cliente.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cliente.nombre}</p>
                      <p className="text-sm text-gray-500">{cliente.telefono1}</p>
                    </div>
                    {cliente.saldoActual > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        ${cliente.saldoActual.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                ))}
                
                {clientesFiltrados.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    No hay clientes que coincidan con el filtro
                  </p>
                )}
              </div>

              {/* Resumen */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{selectedClientes.length}</p>
                      <p className="text-sm text-gray-600">Clientes seleccionados</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{smsPartes}</p>
                      <p className="text-sm text-gray-600">Partes por SMS</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">${estimatedCost.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Costo estimado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || selectedClientes.length === 0}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar a {selectedClientes.length} clientes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Resultados */
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <h3 className="text-lg font-medium mt-2">SMS Masivo Completado</h3>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{results.totalMessages}</p>
                    <p className="text-sm text-gray-600">Total mensajes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{results.successCount}</p>
                    <p className="text-sm text-gray-600">Exitosos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{results.failCount}</p>
                    <p className="text-sm text-gray-600">Fallidos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">${results.totalCost?.toFixed(2) || '0.00'}</p>
                    <p className="text-sm text-gray-600">Costo total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button onClick={handleClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
