
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Building, 
  Palette, 
  DollarSign, 
  Bell, 
  Link, 
  Shield,
  Save,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Configuracion {
  id: string;
  nombreEmpresa: string;
  logoUrl?: string;
  colorPrimario: string;
  colorSecundario: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  rfc?: string;
  configJson: any;
}

export default function ConfiguracionPage() {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarClaves, setMostrarClaves] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configuracion');
      if (response.ok) {
        const data = await response.json();
        setConfiguracion(data);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar la configuración',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguracion = async () => {
    if (!configuracion) return;

    try {
      setGuardando(true);
      const response = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configuracion),
      });

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Configuración guardada exitosamente',
        });
      } else {
        throw new Error('Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setGuardando(false);
    }
  };

  const actualizarConfig = (seccion: string, campo: string, valor: any) => {
    if (!configuracion) return;

    const nuevaConfig = { ...configuracion };
    
    if (seccion === 'general') {
      (nuevaConfig as any)[campo] = valor;
    } else {
      if (!nuevaConfig.configJson) nuevaConfig.configJson = {};
      if (!nuevaConfig.configJson[seccion]) nuevaConfig.configJson[seccion] = {};
      
      // Manejar configuraciones anidadas
      if (campo.includes('.')) {
        const partes = campo.split('.');
        let obj = nuevaConfig.configJson[seccion];
        for (let i = 0; i < partes.length - 1; i++) {
          if (!obj[partes[i]]) obj[partes[i]] = {};
          obj = obj[partes[i]];
        }
        obj[partes[partes.length - 1]] = valor;
      } else {
        nuevaConfig.configJson[seccion][campo] = valor;
      }
    }
    
    setConfiguracion(nuevaConfig);
  };

  if (loading || !configuracion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-500 mt-2">Ajustes generales y configuraciones avanzadas</p>
        </div>

        <Button onClick={guardarConfiguracion} disabled={guardando}>
          <Save className="w-4 h-4 mr-2" />
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="apariencia">Apariencia</TabsTrigger>
          <TabsTrigger value="financiero">Financiero</TabsTrigger>
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
          <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
        </TabsList>

        {/* Configuración de Empresa */}
        <TabsContent value="empresa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Información de la Empresa
              </CardTitle>
              <CardDescription>
                Datos básicos de su empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre de la Empresa</Label>
                  <Input
                    value={configuracion.nombreEmpresa}
                    onChange={(e) => actualizarConfig('general', 'nombreEmpresa', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>RFC</Label>
                  <Input
                    value={configuracion.rfc || ''}
                    onChange={(e) => actualizarConfig('general', 'rfc', e.target.value)}
                    placeholder="RFC de la empresa"
                  />
                </div>

                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={configuracion.telefono || ''}
                    onChange={(e) => actualizarConfig('general', 'telefono', e.target.value)}
                    placeholder="Teléfono principal"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={configuracion.email || ''}
                    onChange={(e) => actualizarConfig('general', 'email', e.target.value)}
                    placeholder="correo@empresa.com"
                  />
                </div>
              </div>

              <div>
                <Label>Dirección</Label>
                <Textarea
                  value={configuracion.direccion || ''}
                  onChange={(e) => actualizarConfig('general', 'direccion', e.target.value)}
                  placeholder="Dirección completa de la empresa"
                  rows={3}
                />
              </div>

              <div>
                <Label>URL del Logo</Label>
                <Input
                  value={configuracion.logoUrl || ''}
                  onChange={(e) => actualizarConfig('general', 'logoUrl', e.target.value)}
                  placeholder="https://cdn.logojoy.com/wp-content/uploads/20220329172812/app-logo-color-combinations-600x371.jpeg"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración de Apariencia */}
        <TabsContent value="apariencia" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Personalización Visual
              </CardTitle>
              <CardDescription>
                Colores y apariencia del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Color Primario</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={configuracion.colorPrimario}
                      onChange={(e) => actualizarConfig('general', 'colorPrimario', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={configuracion.colorPrimario}
                      onChange={(e) => actualizarConfig('general', 'colorPrimario', e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <Label>Color Secundario</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={configuracion.colorSecundario}
                      onChange={(e) => actualizarConfig('general', 'colorSecundario', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={configuracion.colorSecundario}
                      onChange={(e) => actualizarConfig('general', 'colorSecundario', e.target.value)}
                      placeholder="#10B981"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Configuración Regional</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Moneda por Defecto</Label>
                    <Select 
                      value={configuracion.configJson?.monedaDefecto || 'MXN'}
                      onValueChange={(value) => actualizarConfig('general', 'monedaDefecto', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">Peso Mexicano (MXN)</SelectItem>
                        <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Formato de Fecha</Label>
                    <Select 
                      value={configuracion.configJson?.formatoFecha || 'dd/MM/yyyy'}
                      onValueChange={(value) => actualizarConfig('general', 'formatoFecha', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración Financiera */}
        <TabsContent value="financiero" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Configuración Financiera
              </CardTitle>
              <CardDescription>
                Parámetros para cálculos financieros y facturación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Impuestos y Precios</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>IVA (%)</Label>
                    <Input
                      type="number"
                      value={configuracion.configJson?.iva || 16}
                      onChange={(e) => actualizarConfig('general', 'iva', parseFloat(e.target.value))}
                      step="0.1"
                    />
                  </div>

                  <div>
                    <Label>Decimales en Precios</Label>
                    <Select 
                      value={configuracion.configJson?.decimalesPrecios?.toString() || '2'}
                      onValueChange={(value) => actualizarConfig('general', 'decimalesPrecios', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 decimales</SelectItem>
                        <SelectItem value="2">2 decimales</SelectItem>
                        <SelectItem value="4">4 decimales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tasa Interés Mora (% diario)</Label>
                    <Input
                      type="number"
                      value={configuracion.configJson?.configuracionCobranza?.tasaInteresDefecto || 3.0}
                      onChange={(e) => actualizarConfig('configuracionCobranza', 'tasaInteresDefecto', parseFloat(e.target.value))}
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Configuración de Facturación</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Serie de Facturación</Label>
                    <Input
                      value={configuracion.configJson?.configuracionFacturacion?.serie || 'A'}
                      onChange={(e) => actualizarConfig('configuracionFacturacion', 'serie', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Folio Inicial</Label>
                    <Input
                      type="number"
                      value={configuracion.configJson?.configuracionFacturacion?.folio || 1}
                      onChange={(e) => actualizarConfig('configuracionFacturacion', 'folio', parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>Lugar de Expedición</Label>
                    <Input
                      value={configuracion.configJson?.configuracionFacturacion?.lugarExpedicion || ''}
                      onChange={(e) => actualizarConfig('configuracionFacturacion', 'lugarExpedicion', e.target.value)}
                      placeholder="Código postal de expedición"
                    />
                  </div>

                  <div>
                    <Label>Régimen Fiscal</Label>
                    <Input
                      value={configuracion.configJson?.configuracionFacturacion?.regimenFiscal || ''}
                      onChange={(e) => actualizarConfig('configuracionFacturacion', 'regimenFiscal', e.target.value)}
                      placeholder="Clave del régimen fiscal"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Configuración de Cobranza</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Días de Gracia por Defecto</Label>
                    <Input
                      type="number"
                      value={configuracion.configJson?.configuracionCobranza?.diasGraciaDefecto || 0}
                      onChange={(e) => actualizarConfig('configuracionCobranza', 'diasGraciaDefecto', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="flex items-center space-x-2 py-2">
                    <Switch
                      checked={configuracion.configJson?.configuracionCobranza?.recordatoriosPagos || false}
                      onCheckedChange={(checked) => actualizarConfig('configuracionCobranza', 'recordatoriosPagos', checked)}
                    />
                    <Label>Enviar recordatorios de pago</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración de Notificaciones */}
        <TabsContent value="notificaciones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Sistema de Notificaciones
              </CardTitle>
              <CardDescription>
                Configure cómo y cuándo recibir notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Canales de Notificación</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={configuracion.configJson?.configuracionNotificaciones?.email || false}
                      onCheckedChange={(checked) => actualizarConfig('configuracionNotificaciones', 'email', checked)}
                    />
                    <Label>Notificaciones por Email</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={configuracion.configJson?.configuracionNotificaciones?.sms || false}
                      onCheckedChange={(checked) => actualizarConfig('configuracionNotificaciones', 'sms', checked)}
                    />
                    <Label>Notificaciones por SMS</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={configuracion.configJson?.configuracionNotificaciones?.whatsapp || false}
                      onCheckedChange={(checked) => actualizarConfig('configuracionNotificaciones', 'whatsapp', checked)}
                    />
                    <Label>Notificaciones por WhatsApp</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Alertas de Inventario</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={configuracion.configJson?.configuracionInventario?.alertasStockBajo || false}
                      onCheckedChange={(checked) => actualizarConfig('configuracionInventario', 'alertasStockBajo', checked)}
                    />
                    <Label>Alertas de stock bajo</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={configuracion.configJson?.configuracionInventario?.controloVencimientos || false}
                      onCheckedChange={(checked) => actualizarConfig('configuracionInventario', 'controloVencimientos', checked)}
                    />
                    <Label>Alertas de productos próximos a vencer</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración de Integraciones */}
        <TabsContent value="integraciones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                Integraciones Externas
              </CardTitle>
              <CardDescription>
                Configure integraciones con servicios externos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  Pasarela de Pagos - OpenPay
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMostrarClaves(!mostrarClaves)}
                  >
                    {mostrarClaves ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </h4>
                
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    checked={configuracion.configJson?.integraciones?.pagos?.openpay?.activa || false}
                    onCheckedChange={(checked) => actualizarConfig('integraciones.pagos.openpay', 'activa', checked)}
                  />
                  <Label>Activar integración con OpenPay</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Merchant ID</Label>
                    <Input
                      type={mostrarClaves ? "text" : "password"}
                      value={configuracion.configJson?.integraciones?.pagos?.openpay?.merchantId || ''}
                      onChange={(e) => actualizarConfig('integraciones.pagos.openpay', 'merchantId', e.target.value)}
                      placeholder="Merchant ID de OpenPay"
                    />
                  </div>

                  <div>
                    <Label>Public Key</Label>
                    <Input
                      type={mostrarClaves ? "text" : "password"}
                      value={configuracion.configJson?.integraciones?.pagos?.openpay?.publicKey || ''}
                      onChange={(e) => actualizarConfig('integraciones.pagos.openpay', 'publicKey', e.target.value)}
                      placeholder="Llave pública de OpenPay"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Private Key</Label>
                    <Textarea
                      value={configuracion.configJson?.integraciones?.pagos?.openpay?.privateKey || ''}
                      onChange={(e) => actualizarConfig('integraciones.pagos.openpay', 'privateKey', e.target.value)}
                      placeholder="Llave privada de OpenPay"
                      rows={3}
                      className={mostrarClaves ? "" : "font-mono text-xs"}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Facturación Electrónica</h4>
                
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    checked={configuracion.configJson?.integraciones?.facturacion?.activa || false}
                    onCheckedChange={(checked) => actualizarConfig('integraciones.facturacion', 'activa', checked)}
                  />
                  <Label>Activar facturación electrónica</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Proveedor de Certificación (PAC)</Label>
                    <Select 
                      value={configuracion.configJson?.integraciones?.facturacion?.pac || ''}
                      onValueChange={(value) => actualizarConfig('integraciones.facturacion', 'pac', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar PAC" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="finkok">Finkok</SelectItem>
                        <SelectItem value="facturama">Facturama</SelectItem>
                        <SelectItem value="sw">SW Sapien</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>API Key del PAC</Label>
                    <Input
                      type={mostrarClaves ? "text" : "password"}
                      value={configuracion.configJson?.integraciones?.facturacion?.apiKey || ''}
                      onChange={(e) => actualizarConfig('integraciones.facturacion', 'apiKey', e.target.value)}
                      placeholder="API Key del PAC"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración Avanzada */}
        <TabsContent value="avanzado" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configuración Avanzada
              </CardTitle>
              <CardDescription>
                Configuraciones técnicas y de seguridad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Control de Inventario</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={configuracion.configJson?.configuracionInventario?.actualizacionAutomatica || false}
                      onCheckedChange={(checked) => actualizarConfig('configuracionInventario', 'actualizacionAutomatica', checked)}
                    />
                    <Label>Actualización automática de inventario</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={configuracion.configJson?.configuracionInventario?.controloLotes || false}
                      onCheckedChange={(checked) => actualizarConfig('configuracionInventario', 'controloLotes', checked)}
                    />
                    <Label>Control por lotes</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Webhooks</h4>
                <p className="text-sm text-gray-500">
                  URLs para recibir notificaciones automáticas de eventos del sistema
                </p>
                
                <div className="space-y-3">
                  <div>
                    <Label>Webhook de Pagos</Label>
                    <Input
                      value={configuracion.configJson?.webhooks?.pagos || ''}
                      onChange={(e) => actualizarConfig('webhooks', 'pagos', e.target.value)}
                      placeholder="https://tu-sitio.com/webhook/pagos"
                    />
                  </div>

                  <div>
                    <Label>Webhook de Ventas</Label>
                    <Input
                      value={configuracion.configJson?.webhooks?.ventas || ''}
                      onChange={(e) => actualizarConfig('webhooks', 'ventas', e.target.value)}
                      placeholder="https://tu-sitio.com/webhook/ventas"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Backup y Mantenimiento</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sincronizar Datos
                  </Button>
                  
                  <Button variant="outline">
                    <Shield className="w-4 h-4 mr-2" />
                    Generar Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
