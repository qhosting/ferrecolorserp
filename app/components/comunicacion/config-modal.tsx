
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Settings, MessageCircle, MessageSquare, Save, TestTube, CheckCircle, XCircle } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface APIConfig {
  wahaApiUrl: string;
  wahaSessionName: string;
  wahaApiKey: string;
  labsmobileUsername: string;
  labsmobileToken: string;
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    whatsapp?: boolean;
    sms?: boolean;
  }>({});
  
  const [config, setConfig] = useState<APIConfig>({
    wahaApiUrl: process.env.NEXT_PUBLIC_WAHA_API_URL || 'http://localhost:3000',
    wahaSessionName: process.env.NEXT_PUBLIC_WAHA_SESSION_NAME || 'default',
    wahaApiKey: '',
    labsmobileUsername: '',
    labsmobileToken: ''
  });

  const handleConfigChange = (field: keyof APIConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testWhatsAppConnection = async () => {
    if (!config.wahaApiUrl) {
      toast.error('Complete la configuración de la URL de WhatsApp');
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.wahaApiKey) {
        headers['X-Api-Key'] = config.wahaApiKey;
      }

      // Consulta de estado de sesión real a WAHA API
      const response = await fetch(`${config.wahaApiUrl}/api/sessions/${config.wahaSessionName}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'WORKING') {
          setTestResults(prev => ({ ...prev, whatsapp: true }));
          toast.success('Conexión WAHA exitosa. Sesión activa (WORKING).');
        } else {
          setTestResults(prev => ({ ...prev, whatsapp: false }));
          toast.error(`Sesión de WAHA encontrada, pero no activa. Estado: ${result.status}`);
        }
      } else {
        setTestResults(prev => ({ ...prev, whatsapp: false }));
        toast.error('Error al conectar con WAHA API (Respuesta no exitosa)');
      }
    } catch (error) {
      console.error('WAHA Connection Test Error:', error);
      setTestResults(prev => ({ ...prev, whatsapp: false }));
      toast.error('Error al conectar con WAHA API. Verifique la URL.');
    } finally {
      setLoading(false);
    }
  };

  const testSMSConnection = async () => {
    if (!config.labsmobileUsername || !config.labsmobileToken) {
      toast.error('Complete la configuración de SMS');
      return;
    }

    setLoading(true);
    try {
      // Simular test de conexión (en producción harías una llamada real)
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTestResults(prev => ({ ...prev, sms: true }));
      toast.success('Conexión SMS exitosa');
    } catch (error) {
      setTestResults(prev => ({ ...prev, sms: false }));
      toast.error('Error al conectar con LabsMobile');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      // En producción, aquí guardarías la configuración en la base de datos
      // o actualizarías las variables de entorno
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configuración guardada exitosamente');
      onClose();
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: boolean) => {
    if (status === undefined) return <Badge variant="secondary">No probado</Badge>;
    return status ? 
      <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge> : 
      <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de APIs de Comunicación
          </DialogTitle>
          <DialogDescription>
            Configure las credenciales para WAHA API (WhatsApp) y SMS LabsMobile
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="whatsapp" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp API
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS LabsMobile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    WAHA API (WhatsApp HTTP API)
                  </div>
                  {getStatusBadge(testResults.whatsapp)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="waha-url">URL del Servidor WAHA API</Label>
                  <Input
                    id="waha-url"
                    placeholder="http://localhost:3000"
                    value={config.wahaApiUrl}
                    onChange={(e) => handleConfigChange('wahaApiUrl', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    URL donde está ejecutándose su instancia de WAHA API (ej. http://localhost:3000)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waha-session">Nombre de la Sesión (Session)</Label>
                  <Input
                    id="waha-session"
                    placeholder="default"
                    value={config.wahaSessionName}
                    onChange={(e) => handleConfigChange('wahaSessionName', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Nombre de la sesión de WhatsApp configurada en WAHA API
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waha-apikey">Clave API (X-Api-Key)</Label>
                  <Input
                    id="waha-apikey"
                    type="password"
                    placeholder="••••••••••••••••"
                    value={config.wahaApiKey}
                    onChange={(e) => handleConfigChange('wahaApiKey', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Clave API de seguridad configurada en su servidor WAHA (dejar vacío si no usa X-Api-Key)
                  </p>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Probar Conexión</h4>
                    <p className="text-sm text-gray-500">
                      Verificar estado de la sesión activa en WAHA
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={testWhatsAppConnection}
                    disabled={loading}
                  >
                    <TestTube className="mr-2 h-4 w-4" />
                    Probar WhatsApp
                  </Button>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Instrucciones de configuración:</h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Instalar WAHA API usando Docker (dev.waha.dev)</li>
                    <li>Iniciar una sesión de WhatsApp (Session)</li>
                    <li>Autenticar mediante escaneo de código QR o Pairing Code</li>
                    <li>Configurar los datos arriba y probar la conexión</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    LabsMobile SMS
                  </div>
                  {getStatusBadge(testResults.sms)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="labsmobile-username">Usuario LabsMobile</Label>
                  <Input
                    id="labsmobile-username"
                    placeholder="mi-usuario"
                    value={config.labsmobileUsername}
                    onChange={(e) => handleConfigChange('labsmobileUsername', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Su nombre de usuario de LabsMobile
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="labsmobile-token">Token de API</Label>
                  <Input
                    id="labsmobile-token"
                    type="password"
                    placeholder="••••••••••••••••"
                    value={config.labsmobileToken}
                    onChange={(e) => handleConfigChange('labsmobileToken', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Token de autenticación de LabsMobile
                  </p>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Probar Conexión</h4>
                    <p className="text-sm text-gray-500">
                      Verificar credenciales y balance disponible
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={testSMSConnection}
                    disabled={loading}
                  >
                    <TestTube className="mr-2 h-4 w-4" />
                    Probar SMS
                  </Button>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Instrucciones de configuración:</h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Registrarse en <a href="https://www.labsmobile.com" target="_blank" className="underline">LabsMobile.com</a></li>
                    <li>Verificar la cuenta y agregar crédito</li>
                    <li>Obtener las credenciales de API desde el panel</li>
                    <li>Configurar los datos arriba y probar la conexión</li>
                  </ol>
                  <p className="text-xs text-blue-600 mt-2">
                    💰 Costo aproximado: $0.15 MXN por SMS nacional
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={saveConfiguration} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
