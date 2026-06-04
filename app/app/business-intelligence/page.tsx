
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Package, 
  Target,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap
} from "lucide-react";

interface KPIData {
  titulo: string;
  valor: number | string;
  cambio: number;
  icono: React.ReactNode;
  formato?: 'currency' | 'percentage' | 'number';
  descripcion: string;
}

interface ChartData {
  name: string;
  valor: number;
  categoria?: string;
  mes?: string;
  año?: number;
}

interface PredictionData {
  periodo: string;
  actual?: number;
  prediccion: number;
  probabilidad: number;
}

export default function BusinessIntelligencePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [selectedMetric, setSelectedMetric] = useState('ventas');
  const [loading, setLoading] = useState(false);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadBIData();
  }, [selectedPeriod, selectedMetric]);

  const loadBIData = async () => {
    setLoading(true);
    try {
      // Simulación de datos de BI
      const kpis: KPIData[] = [
        {
          titulo: 'Ingresos Totales',
          valor: 2847650,
          cambio: 12.5,
          icono: <DollarSign className="h-4 w-4" />,
          formato: 'currency',
          descripcion: 'Comparado con el período anterior'
        },
        {
          titulo: 'Clientes Activos',
          valor: 1248,
          cambio: 8.3,
          icono: <Users className="h-4 w-4" />,
          formato: 'number',
          descripcion: 'Clientes con actividad reciente'
        },
        {
          titulo: 'Margen de Utilidad',
          valor: 34.7,
          cambio: -2.1,
          icono: <Target className="h-4 w-4" />,
          formato: 'percentage',
          descripcion: 'Margen promedio de productos'
        },
        {
          titulo: 'Rotación de Inventario',
          valor: 6.8,
          cambio: 15.2,
          icono: <Package className="h-4 w-4" />,
          formato: 'number',
          descripcion: 'Veces por año'
        }
      ];

      const ventasData: ChartData[] = [
        { name: 'Ene', valor: 425000, mes: 'Enero' },
        { name: 'Feb', valor: 380000, mes: 'Febrero' },
        { name: 'Mar', valor: 520000, mes: 'Marzo' },
        { name: 'Abr', valor: 465000, mes: 'Abril' },
        { name: 'May', valor: 590000, mes: 'Mayo' },
        { name: 'Jun', valor: 612000, mes: 'Junio' },
        { name: 'Jul', valor: 580000, mes: 'Julio' },
        { name: 'Ago', valor: 645000, mes: 'Agosto' },
        { name: 'Sep', valor: 710000, mes: 'Septiembre' }
      ];

      const predictionsData: PredictionData[] = [
        { periodo: 'Oct 2024', prediccion: 735000, probabilidad: 85 },
        { periodo: 'Nov 2024', prediccion: 798000, probabilidad: 78 },
        { periodo: 'Dec 2024', prediccion: 856000, probabilidad: 72 },
        { periodo: 'Ene 2025', prediccion: 623000, probabilidad: 68 },
        { periodo: 'Feb 2025', prediccion: 687000, probabilidad: 65 }
      ];

      setKpiData(kpis);
      setChartData(ventasData);
      setPredictions(predictionsData);
    } catch (error) {
      console.error('Error loading BI data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos de Business Intelligence",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number | string, formato?: string) => {
    if (typeof value === 'string') return value;
    
    switch (formato) {
      case 'currency':
        return new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN'
        }).format(value);
      case 'percentage':
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  const exportReport = async (tipo: string) => {
    try {
      const response = await fetch(`/api/business-intelligence/export?tipo=${tipo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodo: selectedPeriod,
          metrica: selectedMetric
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-bi-${tipo}-${Date.now()}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Éxito",
          description: "Reporte exportado correctamente",
        });
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: "Error al exportar el reporte",
        variant: "destructive",
      });
    }
  };

  // Datos para gráfico de pastel - categorías de productos
  const pieData = [
    { name: 'Electrónicos', value: 45, color: '#0088FE' },
    { name: 'Ropa', value: 25, color: '#00C49F' },
    { name: 'Hogar', value: 20, color: '#FFBB28' },
    { name: 'Deportes', value: 10, color: '#FF8042' }
  ];

  // Datos para análisis de cobranza
  const cobranzaData: ChartData[] = [
    { name: 'Al día', valor: 65, categoria: 'cobranza' },
    { name: '1-30 días', valor: 20, categoria: 'cobranza' },
    { name: '31-60 días', valor: 10, categoria: 'cobranza' },
    { name: '+60 días', valor: 5, categoria: 'cobranza' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Intelligence</h1>
          <p className="text-muted-foreground">
            Análisis avanzado de datos y predicciones basadas en IA
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dia">Día</SelectItem>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="mes">Mes</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="año">Año</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => loadBIData()} variant="outline" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => exportReport('dashboard')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.titulo}</CardTitle>
              {kpi.icono}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(kpi.valor, kpi.formato)}
              </div>
              <p className="text-xs flex items-center gap-1">
                {kpi.cambio > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={kpi.cambio > 0 ? 'text-green-600' : 'text-red-600'}>
                  {Math.abs(kpi.cambio)}%
                </span>
                <span className="text-muted-foreground">{kpi.descripcion}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ventas">Análisis Ventas</TabsTrigger>
          <TabsTrigger value="clientes">Análisis Clientes</TabsTrigger>
          <TabsTrigger value="predicciones">Predicciones IA</TabsTrigger>
          <TabsTrigger value="reportes">Reportes Avanzados</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tendencia de Ventas
                </CardTitle>
                <CardDescription>
                  Evolución de ingresos por mes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatValue(value as number, 'currency')} />
                    <Line 
                      type="monotone" 
                      dataKey="valor" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Distribución por Categoría
                </CardTitle>
                <CardDescription>
                  Participación de categorías en ventas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Cobranza</CardTitle>
                <CardDescription>
                  Distribución de cuentas por cobrar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={cobranzaData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="valor" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métricas Clave</CardTitle>
                <CardDescription>
                  Indicadores de rendimiento del negocio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Tasa de Conversión</span>
                    </div>
                    <Badge className="bg-blue-600">23.4%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Retención Clientes</span>
                    </div>
                    <Badge className="bg-green-600">87.2%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-orange-600" />
                      <span className="font-medium">Ticket Promedio</span>
                    </div>
                    <Badge className="bg-orange-600">$2,845</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Tiempo Respuesta</span>
                    </div>
                    <Badge className="bg-purple-600">1.2 hrs</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ventas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Detallado de Ventas</CardTitle>
              <CardDescription>
                Segmentación y análisis profundo de datos de ventas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Análisis Avanzado de Ventas</h3>
                <p className="text-muted-foreground">
                  Funcionalidad completa disponible próximamente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Segmentación de Clientes</CardTitle>
              <CardDescription>
                Análisis de comportamiento y segmentación RFM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Análisis de Clientes</h3>
                <p className="text-muted-foreground">
                  Segmentación avanzada disponible próximamente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predicciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Predicciones con Inteligencia Artificial
              </CardTitle>
              <CardDescription>
                Proyecciones de ventas y demanda basadas en ML
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left">Período</th>
                        <th className="px-4 py-3 text-left">Predicción</th>
                        <th className="px-4 py-3 text-left">Confianza</th>
                        <th className="px-4 py-3 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map((pred, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-3 font-medium">{pred.periodo}</td>
                          <td className="px-4 py-3">
                            {formatValue(pred.prediccion, 'currency')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{width: `${pred.probabilidad}%`}}
                                />
                              </div>
                              <span className="text-sm">{pred.probabilidad}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={pred.probabilidad > 80 ? 'default' : pred.probabilidad > 70 ? 'secondary' : 'destructive'}>
                              {pred.probabilidad > 80 ? 'Alta' : pred.probabilidad > 70 ? 'Media' : 'Baja'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-medium mb-4">Visualización de Predicciones</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={predictions.map(p => ({ name: p.periodo, prediccion: p.prediccion }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatValue(value as number, 'currency')} />
                      <Line 
                        type="monotone" 
                        dataKey="prediccion" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reportes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Reporte Ejecutivo</CardTitle>
                <CardDescription>
                  Dashboard gerencial completo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => exportReport('ejecutivo')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generar Reporte
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis de Rentabilidad</CardTitle>
                <CardDescription>
                  Productos y clientes más rentables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => exportReport('rentabilidad')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generar Reporte
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proyecciones Financieras</CardTitle>
                <CardDescription>
                  Flujo de caja y proyecciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => exportReport('proyecciones')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generar Reporte
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
