
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { WhatsAppModal } from '@/components/comunicacion/whatsapp-modal';
import { SMSModal } from '@/components/comunicacion/sms-modal';
import { BulkSMSModal } from '@/components/comunicacion/bulk-sms-modal';
import { ConfigModal } from '@/components/comunicacion/config-modal';
import { 
  MessageCircle, 
  MessageSquare, 
  Settings, 
  Send,
  Users,
  Wifi,
  WifiOff,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

export default function ComunicacionPage() {
  const { data: session } = useSession() || {};
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  
  // Estados para modales
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Estados para envío directo
  const [quickMessage, setQuickMessage] = useState({
    number: '',
    message: '',
    type: 'whatsapp' as 'whatsapp' | 'sms'
  });

  useEffect(() => {
    if (session?.user) {
      fetchWhatsAppStatus();
    }
  }, [session]);

  const fetchWhatsAppStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch('/api/whatsapp/status');
      if (response.ok) {
        const data = await response.json();
        setWhatsappStatus(data);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quickMessage.number || !quickMessage.message) {
      toast.error('Número y mensaje son requeridos');
      return;
    }

    try {
      const endpoint = quickMessage.type === 'whatsapp' ? '/api/whatsapp/send' : '/api/sms/send';
      const payload = quickMessage.type === 'whatsapp' 
        ? { number: quickMessage.number, message: quickMessage.message }
        : { to: quickMessage.number, message: quickMessage.message };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${quickMessage.type === 'whatsapp' ? 'WhatsApp' : 'SMS'} enviado exitosamente`);
        setQuickMessage({ number: '', message: '', type: quickMessage.type });
      } else {
        toast.error(result.error || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar mensaje');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'connecting':
        return <Activity className="h-5 w-5 text-yellow-600 animate-pulse" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando';
      default:
        return 'Desconectado';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Header 
        title="Centro de Comunicaciones"
        description="Gestiona las comunicaciones por WhatsApp y SMS"
      />

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp API</CardTitle>
            <MessageCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {whatsappStatus?.instance ? 
                getStatusIcon(whatsappStatus.instance.status) : 
                <WifiOff className="h-5 w-5 text-gray-400" />
              }
              <div>
                <div className="text-2xl font-bold">
                  {whatsappStatus?.instance ? 
                    getStatusText(whatsappStatus.instance.status) : 
                    'No configurado'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {whatsappStatus?.contacts?.count || 0} contactos
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchWhatsAppStatus}
                disabled={loadingStatus}
              >
                <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS LabsMobile</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">Listo</div>
                <p className="text-xs text-muted-foreground">
                  Servicio activo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configuración</CardTitle>
            <Settings className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowConfigModal(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configurar APIs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Envío Rápido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Envío Rápido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleQuickSend} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={quickMessage.type === 'whatsapp' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickMessage({ ...quickMessage, type: 'whatsapp' })}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  type="button"
                  variant={quickMessage.type === 'sms' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickMessage({ ...quickMessage, type: 'sms' })}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  SMS
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-number">Número de teléfono</Label>
                <Input
                  id="quick-number"
                  placeholder="5214421234567"
                  value={quickMessage.number}
                  onChange={(e) => setQuickMessage({ ...quickMessage, number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-message">Mensaje</Label>
                <Textarea
                  id="quick-message"
                  placeholder="Escriba su mensaje aquí..."
                  rows={3}
                  value={quickMessage.message}
                  onChange={(e) => setQuickMessage({ ...quickMessage, message: e.target.value })}
                  required
                />
                <p className="text-sm text-gray-500">
                  Caracteres: {quickMessage.message.length}
                </p>
              </div>

              <Button type="submit" className="w-full">
                <Send className="mr-2 h-4 w-4" />
                Enviar {quickMessage.type === 'whatsapp' ? 'WhatsApp' : 'SMS'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Acciones Masivas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Comunicación Masiva
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setShowWhatsAppModal(true)} 
              className="w-full" 
              variant="outline"
            >
              <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
              Enviar WhatsApp Individual
            </Button>

            <Button 
              onClick={() => setShowSMSModal(true)} 
              className="w-full" 
              variant="outline"
            >
              <MessageSquare className="mr-2 h-4 w-4 text-blue-600" />
              Enviar SMS Individual
            </Button>

            <Button 
              onClick={() => setShowBulkSMSModal(true)} 
              className="w-full"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              SMS Masivo a Clientes
            </Button>

            <Separator />

            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Plantillas disponibles:</p>
              <ul className="space-y-1 text-xs">
                <li>• Recordatorio de pago</li>
                <li>• Confirmación de pago</li>
                <li>• Promociones especiales</li>
                <li>• Notificaciones generales</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Status Details */}
      {whatsappStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Estado de WhatsApp Business API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado de la instancia</Label>
                <div className="flex items-center gap-2">
                  {getStatusIcon(whatsappStatus.instance.status)}
                  <Badge variant={whatsappStatus.instance.status === 'open' ? 'default' : 'destructive'}>
                    {getStatusText(whatsappStatus.instance.status)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contactos sincronizados</Label>
                <p className="text-2xl font-bold">{whatsappStatus.contacts?.count || 0}</p>
              </div>

              {whatsappStatus.contacts?.contacts?.length > 0 && (
                <div className="md:col-span-2 space-y-2">
                  <Label>Últimos contactos</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {whatsappStatus.contacts.contacts.slice(0, 6).map((contact: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{contact.name}</p>
                          <p className="text-sm text-gray-500 truncate">{contact.number}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modales */}
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
      />

      <SMSModal
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
      />

      <BulkSMSModal
        isOpen={showBulkSMSModal}
        onClose={() => setShowBulkSMSModal(false)}
      />

      <ConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
}
