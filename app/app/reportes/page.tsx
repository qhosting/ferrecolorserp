
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Users, 
  Package, 
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

interface ReporteConfig {
  tipo: 'ventas' | 'cobranza' | 'inventario';
  fechaInicio: string;
  fechaFin: string;
  filtros: Record<string, any>;
}

interface Usuario {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

interface Cliente {
  id: string;
  nombre: string;
  codigoCliente: string;
}

export default function ReportesPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [reporteData, setReporteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const { toast } = useToast();

  const [configVentas, setConfigVentas] = useState<ReporteConfig>({
    tipo: 'ventas',
    fechaInicio: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    fechaFin: format(new Date(), 'yyyy-MM-dd'),
    filtros: {
      clienteId: '',
      vendedorId: '',
    },
  });

  const [configCobranza, setConfigCobranza] = useState<ReporteConfig>({
    tipo: 'cobranza',
    fechaInicio: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    fechaFin: format(new Date(), 'yyyy-MM-dd'),
    filtros: {
      gestorId: '',
      tipo: 'pagos',
    },
  });

  const [configInventario, setConfigInventario] = useState<ReporteConfig>({
    tipo: 'inventario',
    fechaInicio: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    fechaFin: format(new Date(), 'yyyy-MM-dd'),
    filtros: {
      categoria: '',
      marca: '',
      tipo: 'stock',
    },
  });

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      
      const [usuariosRes, clientesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/clientes'),
      ]);

      if (usuariosRes.ok && clientesRes.ok) {
        const [usuariosData, clientesData] = await Promise.all([
          usuariosRes.json(),
          clientesRes.json(),
        ]);
        
        setUsuarios(usuariosData);
        setClientes(clientesData);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const generarReporte = async (config: ReporteConfig, formato: 'json' | 'csv' = 'json') => {
    try {
      setGenerando(true);
      
      let url = `/api/reportes/${config.tipo}?`;
      url += `fechaInicio=${config.fechaInicio}&`;
      url += `fechaFin=${config.fechaFin}&`;
      url += `formato=${formato}&`;
      
      Object.entries(config.filtros).forEach(([key, value]) => {
        if (value) url += `${key}=${value}&`;
      });

      if (formato === 'csv') {
        // Descargar CSV
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `reporte-${config.tipo}-${Date.now()}.csv`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          
          toast({
            title: 'Éxito',
            description: 'Reporte descargado exitosamente',
          });
        }
      } else {
        // Mostrar en pantalla
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setReporteData({ ...data, tipo: config.tipo });
        }
      }
    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast({
        title: 'Error',
        description: 'Error al generar el reporte',
        variant: 'destructive',
      });
    } finally {
      setGenerando(false);
    }
  };

  const renderResumenVentas = (resumen: any) => (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Ventas</p>
              <p className="text-2xl font-bold">{resumen.totalVentas}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monto Total</p>
              <p className="text-2xl font-bold text-green-600">${resumen.montoTotal.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cobrado</p>
              <p className="text-2xl font-bold text-blue-600">${resumen.montoCobrado.toLocaleString()}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo Pendiente</p>
              <p className="text-2xl font-bold text-red-600">${resumen.saldoPendiente.toLocaleString()}</p>
            </div>
            <Clock className="w-8 h-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderResumenCobranza = (resumen: any) => (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Pagos</p>
              <p className="text-2xl font-bold">{resumen.totalPagos}</p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monto Total</p>
              <p className="text-2xl font-bold text-green-600">${resumen.montoTotal.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">A Capital</p>
              <p className="text-2xl font-bold text-blue-600">${resumen.aplicadoCapital.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">A Intereses</p>
              <p className="text-2xl font-bold text-orange-600">${resumen.aplicadoInteres.toLocaleString()}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderResumenInventario = (resumen: any) => (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Productos</p>
              <p className="text-2xl font-bold">{resumen.totalProductos}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stock Crítico</p>
              <p className="text-2xl font-bold text-red-600">{resumen.stockCritico}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-bold text-orange-600">{resumen.stockBajo}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Valor Total</p>
              <p className="text-2xl font-bold text-green-600">${resumen.valorTotalInventario.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Reportes</h1>
          <p className="text-gray-500 mt-2">Generación y análisis de reportes detallados</p>
        </div>
      </div>

      <Tabs defaultValue="ventas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ventas">Reportes de Ventas</TabsTrigger>
          <TabsTrigger value="cobranza">Reportes de Cobranza</TabsTrigger>
          <TabsTrigger value="inventario">Reportes de Inventario</TabsTrigger>
        </TabsList>

        {/* Reportes de Ventas */}
        <TabsContent value="ventas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Configuración del Reporte de Ventas
              </CardTitle>
              <CardDescription>
                Configure los parámetros para generar el reporte de ventas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={configVentas.fechaInicio}
                    onChange={(e) => setConfigVentas({
                      ...configVentas,
                      fechaInicio: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label>Fecha Fin</Label>
                  <Input
                    type="date"
                    value={configVentas.fechaFin}
                    onChange={(e) => setConfigVentas({
                      ...configVentas,
                      fechaFin: e.target.value
                    })}
                  />
                </div>

                <div>
                  <Label>Cliente (Opcional)</Label>
                  <Select 
                    value={configVentas.filtros.clienteId} 
                    onValueChange={(value) => setConfigVentas({
                      ...configVentas,
                      filtros: { ...configVentas.filtros, clienteId: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los clientes</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.codigoCliente} - {cliente.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Vendedor (Opcional)</Label>
                  <Select 
                    value={configVentas.filtros.vendedorId} 
                    onValueChange={(value) => setConfigVentas({
                      ...configVentas,
                      filtros: { ...configVentas.filtros, vendedorId: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los vendedores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los vendedores</SelectItem>
                      {usuarios.filter(u => u.role === 'VENTAS').map((vendedor) => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.firstName || vendedor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button 
                  onClick={() => generarReporte(configVentas)} 
                  disabled={generando}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {generando ? 'Generando...' : 'Generar Reporte'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => generarReporte(configVentas, 'csv')} 
                  disabled={generando}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mostrar resultados de ventas */}
          {reporteData && reporteData.tipo === 'ventas' && (
            <Card>
              <CardHeader>
                <CardTitle>Resultados del Reporte de Ventas</CardTitle>
                <CardDescription>
                  Período: {format(new Date(configVentas.fechaInicio), 'dd/MM/yyyy', { locale: es })} - {format(new Date(configVentas.fechaFin), 'dd/MM/yyyy', { locale: es })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderResumenVentas(reporteData.resumen)}
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Detalle de Ventas</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border p-2 text-left">Folio</th>
                          <th className="border p-2 text-left">Fecha</th>
                          <th className="border p-2 text-left">Cliente</th>
                          <th className="border p-2 text-left">Vendedor</th>
                          <th className="border p-2 text-right">Total</th>
                          <th className="border p-2 text-right">Saldo</th>
                          <th className="border p-2 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporteData.ventas.slice(0, 50).map((venta: any) => (
                          <tr key={venta.id} className="hover:bg-gray-50">
                            <td className="border p-2">{venta.folio}</td>
                            <td className="border p-2">
                              {format(new Date(venta.fechaVenta), 'dd/MM/yyyy', { locale: es })}
                            </td>
                            <td className="border p-2">{venta.cliente.nombre}</td>
                            <td className="border p-2">{venta.vendedor.firstName || venta.vendedor.name}</td>
                            <td className="border p-2 text-right">${venta.total.toLocaleString()}</td>
                            <td className="border p-2 text-right">${venta.saldoPendiente.toLocaleString()}</td>
                            <td className="border p-2 text-center">
                              <Badge variant={venta.status === 'PAGADA' ? 'default' : 'secondary'}>
                                {venta.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {reporteData.ventas.length > 50 && (
                    <p className="text-sm text-gray-500 text-center">
                      Mostrando los primeros 50 registros de {reporteData.ventas.length} total.
                      Descargue el CSV para ver todos los datos.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reportes de Cobranza */}
        <TabsContent value="cobranza" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Configuración del Reporte de Cobranza
              </CardTitle>
              <CardDescription>
                Configure los parámetros para generar el reporte de cobranza
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={configCobranza.fechaInicio}
                    onChange={(e) => setConfigCobranza({
                      ...configCobranza,
                      fechaInicio: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label>Fecha Fin</Label>
                  <Input
                    type="date"
                    value={configCobranza.fechaFin}
                    onChange={(e) => setConfigCobranza({
                      ...configCobranza,
                      fechaFin: e.target.value
                    })}
                  />
                </div>

                <div>
                  <Label>Tipo de Reporte</Label>
                  <Select 
                    value={configCobranza.filtros.tipo} 
                    onValueChange={(value) => setConfigCobranza({
                      ...configCobranza,
                      filtros: { ...configCobranza.filtros, tipo: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pagos">Pagos Realizados</SelectItem>
                      <SelectItem value="pagares">Estado de Pagarés</SelectItem>
                      <SelectItem value="cartera">Cartera Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Gestor (Opcional)</Label>
                  <Select 
                    value={configCobranza.filtros.gestorId} 
                    onValueChange={(value) => setConfigCobranza({
                      ...configCobranza,
                      filtros: { ...configCobranza.filtros, gestorId: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los gestores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los gestores</SelectItem>
                      {usuarios.filter(u => u.role === 'GESTOR').map((gestor) => (
                        <SelectItem key={gestor.id} value={gestor.id}>
                          {gestor.firstName || gestor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button 
                  onClick={() => generarReporte(configCobranza)} 
                  disabled={generando}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {generando ? 'Generando...' : 'Generar Reporte'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => generarReporte(configCobranza, 'csv')} 
                  disabled={generando}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mostrar resultados de cobranza */}
          {reporteData && reporteData.tipo === 'cobranza' && (
            <Card>
              <CardHeader>
                <CardTitle>Resultados del Reporte de Cobranza</CardTitle>
                <CardDescription>
                  Tipo: {configCobranza.filtros.tipo} | 
                  Período: {format(new Date(configCobranza.fechaInicio), 'dd/MM/yyyy', { locale: es })} - {format(new Date(configCobranza.fechaFin), 'dd/MM/yyyy', { locale: es })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reporteData.resumenPagos && renderResumenCobranza(reporteData.resumenPagos)}
                
                {reporteData.pagos && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Detalle de Pagos</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border p-2 text-left">Referencia</th>
                            <th className="border p-2 text-left">Fecha</th>
                            <th className="border p-2 text-left">Cliente</th>
                            <th className="border p-2 text-right">Monto</th>
                            <th className="border p-2 text-center">Tipo</th>
                            <th className="border p-2 text-right">Capital</th>
                            <th className="border p-2 text-right">Intereses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reporteData.pagos.slice(0, 50).map((pago: any) => (
                            <tr key={pago.id} className="hover:bg-gray-50">
                              <td className="border p-2">{pago.referencia}</td>
                              <td className="border p-2">
                                {format(new Date(pago.fechaPago), 'dd/MM/yyyy', { locale: es })}
                              </td>
                              <td className="border p-2">{pago.cliente.nombre}</td>
                              <td className="border p-2 text-right">${pago.monto.toLocaleString()}</td>
                              <td className="border p-2 text-center">
                                <Badge variant="outline">{pago.tipoPago}</Badge>
                              </td>
                              <td className="border p-2 text-right">${pago.aplicadoCapital.toLocaleString()}</td>
                              <td className="border p-2 text-right">${pago.aplicadoInteres.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {reporteData.carteraVencida && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Cartera Vencida</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border p-2 text-left">Cliente</th>
                            <th className="border p-2 text-left">Venta</th>
                            <th className="border p-2 text-center">Días Vencido</th>
                            <th className="border p-2 text-right">Monto</th>
                            <th className="border p-2 text-right">Saldo</th>
                            <th className="border p-2 text-right">Intereses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reporteData.carteraVencida.slice(0, 50).map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border p-2">{item.cliente_nombre}</td>
                              <td className="border p-2">{item.venta_folio}</td>
                              <td className="border p-2 text-center">
                                <Badge variant={item.dias_vencido > 90 ? 'destructive' : 
                                              item.dias_vencido > 30 ? 'secondary' : 'outline'}>
                                  {item.dias_vencido} días
                                </Badge>
                              </td>
                              <td className="border p-2 text-right">${parseFloat(item.monto_pagare).toLocaleString()}</td>
                              <td className="border p-2 text-right">${parseFloat(item.saldo_pendiente).toLocaleString()}</td>
                              <td className="border p-2 text-right">${parseFloat(item.interesesMora || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reportes de Inventario */}
        <TabsContent value="inventario" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Configuración del Reporte de Inventario
              </CardTitle>
              <CardDescription>
                Configure los parámetros para generar el reporte de inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Tipo de Reporte</Label>
                  <Select 
                    value={configInventario.filtros.tipo} 
                    onValueChange={(value) => setConfigInventario({
                      ...configInventario,
                      filtros: { ...configInventario.filtros, tipo: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Estado de Stock</SelectItem>
                      <SelectItem value="movimientos">Movimientos de Inventario</SelectItem>
                      <SelectItem value="valoracion">Valoración de Inventario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Categoría (Opcional)</Label>
                  <Input
                    value={configInventario.filtros.categoria}
                    onChange={(e) => setConfigInventario({
                      ...configInventario,
                      filtros: { ...configInventario.filtros, categoria: e.target.value }
                    })}
                    placeholder="Filtrar por categoría"
                  />
                </div>

                <div>
                  <Label>Marca (Opcional)</Label>
                  <Input
                    value={configInventario.filtros.marca}
                    onChange={(e) => setConfigInventario({
                      ...configInventario,
                      filtros: { ...configInventario.filtros, marca: e.target.value }
                    })}
                    placeholder="Filtrar por marca"
                  />
                </div>

                <div>
                  <Label>Fecha Inicio (Movimientos)</Label>
                  <Input
                    type="date"
                    value={configInventario.fechaInicio}
                    onChange={(e) => setConfigInventario({
                      ...configInventario,
                      fechaInicio: e.target.value
                    })}
                    disabled={configInventario.filtros.tipo !== 'movimientos'}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button 
                  onClick={() => generarReporte(configInventario)} 
                  disabled={generando}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {generando ? 'Generando...' : 'Generar Reporte'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => generarReporte(configInventario, 'csv')} 
                  disabled={generando}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mostrar resultados de inventario */}
          {reporteData && reporteData.tipo === 'inventario' && (
            <Card>
              <CardHeader>
                <CardTitle>Resultados del Reporte de Inventario</CardTitle>
                <CardDescription>
                  Tipo: {configInventario.filtros.tipo}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reporteData.resumenStock && renderResumenInventario(reporteData.resumenStock)}
                
                {reporteData.productos && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Estado de Stock</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border p-2 text-left">Código</th>
                            <th className="border p-2 text-left">Producto</th>
                            <th className="border p-2 text-left">Categoría</th>
                            <th className="border p-2 text-right">Stock</th>
                            <th className="border p-2 text-right">Mín</th>
                            <th className="border p-2 text-right">Máx</th>
                            <th className="border p-2 text-center">Estado</th>
                            <th className="border p-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reporteData.productos.slice(0, 50).map((producto: any) => {
                            const estado = producto.stock <= producto.stockMinimo ? 'CRITICO' :
                                          producto.stock <= producto.stockMinimo * 1.5 ? 'BAJO' :
                                          producto.stock >= producto.stockMaximo * 0.8 ? 'ALTO' : 'NORMAL';
                            
                            return (
                              <tr key={producto.id} className="hover:bg-gray-50">
                                <td className="border p-2 font-mono">{producto.codigo}</td>
                                <td className="border p-2">{producto.nombre}</td>
                                <td className="border p-2">{producto.categoria || '-'}</td>
                                <td className="border p-2 text-right">{producto.stock}</td>
                                <td className="border p-2 text-right">{producto.stockMinimo}</td>
                                <td className="border p-2 text-right">{producto.stockMaximo}</td>
                                <td className="border p-2 text-center">
                                  <Badge variant={
                                    estado === 'CRITICO' ? 'destructive' :
                                    estado === 'BAJO' ? 'secondary' :
                                    estado === 'ALTO' ? 'outline' : 'default'
                                  }>
                                    {estado}
                                  </Badge>
                                </td>
                                <td className="border p-2 text-right">
                                  ${(producto.stock * producto.precioCompra).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
