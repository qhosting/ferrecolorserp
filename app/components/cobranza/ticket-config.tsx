
'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Printer, Save, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ticketPrinter, type TicketConfig, type TicketData } from '@/lib/ticket-printer';
import { toast } from 'sonner';

export default function TicketConfigPage() {
  const [config, setConfig] = useState<TicketConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const currentConfig = await ticketPrinter.getTicketConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast.error('Error cargando configuración de tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      await ticketPrinter.saveTicketConfig(config);
      toast.success('Configuración de ticket guardada correctamente');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast.error('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!config) return;

    // Datos de ejemplo para preview
    const sampleData: TicketData = {
      cod_cliente: 'DQ2024001',
      nombre_cliente: 'Juan Pérez García',
      telefono: '442-123-4567',
      direccion: 'Calle Principal #123, Centro',
      monto_pago: 1500.00,
      monto_mora: 50.00,
      saldo_anterior: 3200.00,
      saldo_actual: 1650.00,
      fecha_pago: new Date().toISOString().split('T')[0],
      fecha_impresion: new Date().toISOString(),
      codigo_gestor: 'DQBOT',
      nombre_gestor: 'Bot de Cobranza',
      dias_vencidos: 15,
      proximo_pago: '2024-01-15',
      latitud: '20.5888',
      longitud: '-100.3899'
    };

    try {
      const content = ticketPrinter.generateTicketContent(sampleData, config);
      
      // Mostrar preview en nueva ventana
      const previewWindow = window.open('', '_blank', 'width=400,height=600');
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head>
              <title>Preview del Ticket</title>
              <style>
                body { 
                  font-family: 'Courier New', monospace; 
                  font-size: 12px; 
                  margin: 20px; 
                  background: #f5f5f5;
                }
                .ticket {
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  max-width: ${config.anchoTicket === 58 ? '200px' : '300px'};
                  margin: 0 auto;
                }
                pre { 
                  white-space: pre-wrap; 
                  margin: 0;
                  line-height: 1.2;
                }
                h3 {
                  margin-top: 0;
                  text-align: center;
                  color: #333;
                }
              </style>
            </head>
            <body>
              <h3>Preview del Ticket</h3>
              <div class="ticket">
                <pre>${content}</pre>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.close()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                  Cerrar Preview
                </button>
              </div>
            </body>
          </html>
        `);
        previewWindow.document.close();
      }
    } catch (error) {
      console.error('Error generando preview:', error);
      toast.error('Error generando preview del ticket');
    }
  };

  const updateConfig = (updates: Partial<TicketConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">Error cargando configuración de tickets</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Información del Negocio */}
          <div>
            <h3 className="text-lg font-medium mb-4">Información del Negocio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombreNegocio">Nombre del Negocio</Label>
                <Input
                  id="nombreNegocio"
                  value={config.nombreNegocio}
                  onChange={(e) => updateConfig({ nombreNegocio: e.target.value })}
                  placeholder="MI NEGOCIO"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefonoNegocio">Teléfono</Label>
                <Input
                  id="telefonoNegocio"
                  value={config.telefonoNegocio}
                  onChange={(e) => updateConfig({ telefonoNegocio: e.target.value })}
                  placeholder="Tel: (000) 000-0000"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="direccionNegocio">Dirección</Label>
                <Input
                  id="direccionNegocio"
                  value={config.direccionNegocio}
                  onChange={(e) => updateConfig({ direccionNegocio: e.target.value })}
                  placeholder="Dirección del negocio"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="emailNegocio">Email (opcional)</Label>
                <Input
                  id="emailNegocio"
                  type="email"
                  value={config.emailNegocio || ''}
                  onChange={(e) => updateConfig({ emailNegocio: e.target.value })}
                  placeholder="correo@negocio.com"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuración de Impresión */}
          <div>
            <h3 className="text-lg font-medium mb-4">Configuración de Impresión</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="anchoTicket">Ancho del Ticket</Label>
                <Select 
                  value={config.anchoTicket.toString()} 
                  onValueChange={(value) => updateConfig({ anchoTicket: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58mm</SelectItem>
                    <SelectItem value="80">80mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fontsize">Tamaño de Fuente</Label>
                <Select 
                  value={config.fontsize} 
                  onValueChange={(value: 'small' | 'medium' | 'large') => updateConfig({ fontsize: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequeña</SelectItem>
                    <SelectItem value="medium">Mediana</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="imprimirLogo"
                  checked={config.imprimirLogo}
                  onCheckedChange={(checked) => updateConfig({ imprimirLogo: checked })}
                />
                <Label htmlFor="imprimirLogo">Imprimir Logo</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Campos a Mostrar */}
          <div>
            <h3 className="text-lg font-medium mb-4">Campos a Mostrar</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'mostrarCodigoCliente', label: 'Código Cliente' },
                { key: 'mostrarTelefono', label: 'Teléfono' },
                { key: 'mostrarDireccion', label: 'Dirección' },
                { key: 'mostrarSaldo', label: 'Saldos' },
                { key: 'mostrarDiasVencidos', label: 'Días Vencidos' },
                { key: 'mostrarMora', label: 'Monto Mora' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Switch
                    id={key}
                    checked={config[key as keyof TicketConfig] as boolean}
                    onCheckedChange={(checked) => updateConfig({ [key]: checked })}
                  />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Textos Personalizables */}
          <div>
            <h3 className="text-lg font-medium mb-4">Textos Personalizables</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tituloTicket">Título del Ticket</Label>
                <Input
                  id="tituloTicket"
                  value={config.tituloTicket}
                  onChange={(e) => updateConfig({ tituloTicket: e.target.value })}
                  placeholder="COMPROBANTE DE PAGO"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pieTicket">Pie del Ticket</Label>
                <Input
                  id="pieTicket"
                  value={config.pieTicket}
                  onChange={(e) => updateConfig({ pieTicket: e.target.value })}
                  placeholder="Gracias por su pago"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mensajeAgradecimiento">Mensaje de Agradecimiento</Label>
                <Input
                  id="mensajeAgradecimiento"
                  value={config.mensajeAgradecimiento}
                  onChange={(e) => updateConfig({ mensajeAgradecimiento: e.target.value })}
                  placeholder="¡Gracias por su preferencia!"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Botones de Acción */}
          <div className="flex gap-2 justify-end">
            <Button 
              onClick={handlePreview} 
              variant="outline"
              disabled={!config}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            
            <Button 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
