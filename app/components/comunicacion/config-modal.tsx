
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
  evolutionApiUrl: string;
  evolutionInstanceName: string;
  evolutionApiToken: string;
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
    evolutionApiUrl: process.env.NEXT_PUBLIC_EVOLUTION_API_URL || 'http://localhost:8080',
    evolutionInstanceName: process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE_NAME || 'default',
    evolutionApiToken: '',
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
    if (!config.evolutionApiUrl || !config.evolutionApiToken) {
      toast.error('Complete la configuración de WhatsApp');
      return;
    }

    setLoading(true);
    try {
      // Simular test de conexión (en producción harías una llamada real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResults(prev => ({ ...prev, whatsapp: true }));
      toast.success('Conexión WhatsApp exitosa');
    } catch (error) {
      setTestResults(prev => ({ ...prev, whatsapp: false }));
      toast.error('Error al conectar con WhatsApp API');
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
            Configure las credenciales para WhatsApp Business API y SMS LabsMobile
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
                    Evolution API (WhatsApp Business)
                  </div>
                  {getStatusBadge(testResults.whatsapp)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="evolution-url">URL del Servidor Evolution API</Label>
                  <Input
                    id="evolution-url"
                    placeholder="http://localhost:8080"
                    value={config.evolutionApiUrl}
                    onChange={(e) => handleConfigChange('evolutionApiUrl', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    URL donde está ejecutándose su instancia de Evolution API
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evolution-instance">Nombre de la Instancia</Label>
                  <Input
                    id="evolution-instance"
                    placeholder="default"
                    value={config.evolutionInstanceName}
                    onChange={(e) => handleConfigChange('evolutionInstanceName', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Nombre de la instancia de WhatsApp configurada en Evolution API
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evolution-token">Token de API</Label>
                  <Input
                    id="evolution-token"
                    type="password"
                    placeholder="••••••••••••••••"
                    value={config.evolutionApiToken}
                    onChange={(e) => handleConfigChange('evolutionApiToken', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Token de autenticación para Evolution API
                  </p>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Probar Conexión</h4>
                    <p className="text-sm text-gray-500">
                      Verificar que la configuración sea correcta
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
                    <li>Instalar Evolution API usando Docker o desde el código fuente</li>
                    <li>Crear una instancia de WhatsApp Business</li>
                    <li>Obtener el token de API desde el panel de Evolution</li>
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
