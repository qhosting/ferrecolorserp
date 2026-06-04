
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Package, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle,
  RefreshCcw,
  Calendar,
  Target,
  Award,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

interface DashboardData {
  periodo: number;
  fechaInicio: string;
  fechaFin: string;
  ventasPorMes: any[];
  cobranzaPorMes: any[];
  topProductos: any[];
  topClientes: any[];
  carteraVencida: any[];
  garantiasAnalysis: any[];
  reestructurasAnalysis: any[];
  inventarioTendencias: any[];
}

interface StatsBasicas {
  totalClientes: number;
  totalProductos: number;
  ventasHoy: number;
  cobranzaHoy: number;
  saldoPendiente: number;
  pagaresPendientes: number;
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [statsBasicas, setStatsBasicas] = useState<StatsBasicas | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('6');
  const { toast } = useToast();

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const [analyticsRes, statsRes] = await Promise.all([
        fetch(`/api/dashboard/analytics?periodo=${periodo}`),
        fetch('/api/dashboard/stats'),
      ]);

      if (analyticsRes.ok && statsRes.ok) {
        const [analyticsData, statsData] = await Promise.all([
          analyticsRes.json(),
          statsRes.json(),
        ]);
        
        setDashboardData(analyticsData);
        setStatsBasicas(statsData);
      } else {
        throw new Error('Error al cargar datos del dashboard');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar datos del dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !dashboardData || !statsBasicas) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Preparar datos para gráficos
  const ventasChartData = dashboardData.ventasPorMes.map((item: any) => ({
    mes: format(new Date(item.mes), 'MMM yyyy', { locale: es }),
    ventas: parseFloat(item.total_ventas) || 0,
    cantidad: parseInt(item.cantidad_ventas) || 0,
    saldoPendiente: parseFloat(item.saldo_pendiente) || 0,
  }));

  const cobranzaChartData = dashboardData.cobranzaPorMes.map((item: any) => ({
    mes: format(new Date(item.mes), 'MMM yyyy', { locale: es }),
    cobrado: parseFloat(item.total_cobrado) || 0,
    cantidad: parseInt(item.cantidad_pagos) || 0,
    capital: parseFloat(item.aplicado_capital) || 0,
    intereses: parseFloat(item.aplicado_intereses) || 0,
  }));

  const carteraData = dashboardData.carteraVencida.map((item: any) => ({
    categoria: item.categoria,
    monto: parseFloat(item.monto_pendiente) || 0,
    cantidad: parseInt(item.cantidad) || 0,
  }));

  const inventarioAlertas = dashboardData.inventarioTendencias.filter((item: any) => 
    item.nivel_stock === 'critico' || item.nivel_stock === 'bajo'
  );

  // Calcular métricas de crecimiento
  const ventasActuales = ventasChartData[ventasChartData.length - 1]?.ventas || 0;
  const ventasAnteriores = ventasChartData[ventasChartData.length - 2]?.ventas || 0;
  const crecimientoVentas = ventasAnteriores > 0 ? 
    ((ventasActuales - ventasAnteriores) / ventasAnteriores) * 100 : 0;

  const cobranzaActual = cobranzaChartData[cobranzaChartData.length - 1]?.cobrado || 0;
  const cobranzaAnterior = cobranzaChartData[cobranzaChartData.length - 2]?.cobrado || 0;
  const crecimientoCobranza = cobranzaAnterior > 0 ? 
    ((cobranzaActual - cobranzaAnterior) / cobranzaAnterior) * 100 : 0;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
          <p className="text-gray-500 mt-2">Panel de control y métricas de negocio</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último año</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={cargarDatos} variant="outline">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-6 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Clientes</p>
                <p className="text-3xl font-bold text-gray-900">{(statsBasicas.totalClientes || 0).toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Productos</p>
                <p className="text-3xl font-bold text-gray-900">{(statsBasicas.totalProductos || 0).toLocaleString()}</p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ventas Hoy</p>
                <p className="text-3xl font-bold text-gray-900">${(statsBasicas.ventasHoy || 0).toLocaleString()}</p>
                <div className="flex items-center text-xs mt-1">
                  {crecimientoVentas >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                  )}
                  <span className={crecimientoVentas >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.abs(crecimientoVentas).toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Cobranza Hoy</p>
                <p className="text-3xl font-bold text-gray-900">${(statsBasicas.cobranzaHoy || 0).toLocaleString()}</p>
                <div className="flex items-center text-xs mt-1">
                  {crecimientoCobranza >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                  )}
                  <span className={crecimientoCobranza >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.abs(crecimientoCobranza).toFixed(1)}%
                  </span>
                </div>
              </div>
              <CreditCard className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Saldo Pendiente</p>
                <p className="text-3xl font-bold text-red-600">${(statsBasicas.saldoPendiente || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{statsBasicas.pagaresPendientes || 0} pagarés</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Alertas</p>
                <p className="text-3xl font-bold text-orange-600">{inventarioAlertas.length}</p>
                <p className="text-xs text-gray-500 mt-1">Stock crítico</p>
              </div>
              <Package className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Evolución de Ventas</CardTitle>
            <CardDescription>Últimos {periodo} meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={ventasChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `$${value.toLocaleString()}`, 
                    name === 'ventas' ? 'Ventas' : 'Saldo Pendiente'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="ventas" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                />
                <Area 
                  type="monotone" 
                  dataKey="saldoPendiente" 
                  stroke="#EF4444" 
                  fill="#EF4444" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cobranza vs Capital/Intereses</CardTitle>
            <CardDescription>Últimos {periodo} meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cobranzaChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="capital" stackId="a" fill="#10B981" />
                <Bar dataKey="intereses" stackId="a" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="productos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="productos">Top Productos</TabsTrigger>
          <TabsTrigger value="clientes">Top Clientes</TabsTrigger>
          <TabsTrigger value="cartera">Cartera Vencida</TabsTrigger>
          <TabsTrigger value="garantias">Garantías</TabsTrigger>
          <TabsTrigger value="reestructuras">Reestructuras</TabsTrigger>
        </TabsList>

        <TabsContent value="productos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
              <CardDescription>Últimos {periodo} meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.topProductos.slice(0, 10).map((producto: any, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <p className="font-semibold">{producto.codigo} - {producto.nombre}</p>
                        <p className="text-sm text-gray-500">
                          {parseFloat(producto.cantidad_vendida).toLocaleString()} unidades
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        ${parseFloat(producto.total_vendido).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {parseInt(producto.veces_vendido)} ventas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mejores Clientes</CardTitle>
              <CardDescription>Por volumen de ventas - Últimos {periodo} meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.topClientes.slice(0, 10).map((cliente: any, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <p className="font-semibold">{cliente.codigoCliente} - {cliente.nombre}</p>
                        <p className="text-sm text-gray-500">
                          {parseInt(cliente.cantidad_ventas)} ventas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        ${parseFloat(cliente.total_ventas).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Promedio: ${parseFloat(cliente.promedio_venta).toLocaleString()}
                      </p>
                      {parseFloat(cliente.saldo_pendiente) > 0 && (
                        <p className="text-sm text-red-600">
                          Saldo: ${parseFloat(cliente.saldo_pendiente).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cartera" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Cartera Vencida</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={carteraData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ categoria, percent }) => `${categoria} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="monto"
                    >
                      {carteraData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalle por Categorías</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {carteraData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="font-medium">
                          {item.categoria === 'vigente' ? 'Vigente' :
                           item.categoria === 'vencida_30' ? 'Vencida 1-30 días' :
                           item.categoria === 'vencida_60' ? 'Vencida 31-60 días' :
                           item.categoria === 'vencida_90' ? 'Vencida 61-90 días' :
                           'Vencida +90 días'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${item.monto.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">{item.cantidad} pagarés</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="garantias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Garantías</CardTitle>
              <CardDescription>Estado actual del sistema de garantías</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Por Estado</h4>
                  {dashboardData.garantiasAnalysis
                    .filter((g: any) => g.estatus)
                    .map((garantia: any, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <span>{garantia.estatus}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{parseInt(garantia.cantidad)}</p>
                        {parseFloat(garantia.total_reparaciones) > 0 && (
                          <p className="text-xs text-gray-500">
                            Reparaciones: ${parseFloat(garantia.total_reparaciones).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Por Tipo</h4>
                  {dashboardData.garantiasAnalysis
                    .filter((g: any) => g.tipoGarantia)
                    .map((garantia: any, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <Award className="w-4 h-4 text-green-500" />
                        <span>{garantia.tipoGarantia}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{parseInt(garantia.cantidad)}</p>
                        <p className="text-xs text-gray-500">
                          Promedio: {parseFloat(garantia.promedio_meses).toFixed(1)} meses
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reestructuras" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Reestructuras</CardTitle>
              <CardDescription>Motivos y beneficios otorgados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.reestructurasAnalysis.map((reestructura: any, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <RefreshCcw className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold">
                          {reestructura.motivo.replace(/_/g, ' ').toLowerCase()
                            .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                      </div>
                      <Badge variant="outline">{parseInt(reestructura.cantidad)} casos</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Descuentos Otorgados</p>
                        <p className="font-bold text-green-600">
                          ${parseFloat(reestructura.total_descuentos).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Intereses Condonados</p>
                        <p className="font-bold text-blue-600">
                          ${parseFloat(reestructura.total_intereses_condonados).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Reducción Promedio</p>
                        <p className="font-bold text-gray-700">
                          ${(parseFloat(reestructura.promedio_saldo_anterior) - 
                             parseFloat(reestructura.promedio_saldo_nuevo)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
