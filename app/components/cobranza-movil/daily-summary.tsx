
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { offlineStorage } from '@/lib/offline-storage';
import { 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Users, 
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface DailySummaryProps {
  gestorId?: string;
  isOnline: boolean;
}

export function DailySummary({ gestorId, isOnline }: DailySummaryProps) {
  const [summary, setSummary] = useState({
    totalCobrado: 0,
    totalPagos: 0,
    clientesAtendidos: 0,
    pagosPorTipo: {
      EFECTIVO: { count: 0, amount: 0 },
      TARJETA: { count: 0, amount: 0 },
      TRANSFERENCIA: { count: 0, amount: 0 },
      CHEQUE: { count: 0, amount: 0 },
      OTRO: { count: 0, amount: 0 }
    },
    comparacionAyer: {
      cobrado: 0,
      pagos: 0,
      clientes: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDailySummary();
  }, [gestorId]);

  const loadDailySummary = async () => {
    setLoading(true);
    try {
      // Obtener pagos de hoy
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      let todayPayments = [];
      
      if (isOnline) {
        const response = await fetch(`/api/pagos?gestorId=${gestorId}&date=${todayStart.toISOString()}`);
        if (response.ok) {
          todayPayments = await response.json();
        }
      } else {
        const allPayments = await offlineStorage.getPagos(gestorId);
        todayPayments = allPayments.filter(payment => {
          const paymentDate = new Date(payment.fechaPago);
          return paymentDate >= todayStart;
        });
      }

      // Calcular estadísticas de hoy
      const totalCobrado = todayPayments.reduce((sum: number, payment: any) => sum + payment.monto, 0);
      const totalPagos = todayPayments.length;
      const clientesUnicos = new Set(todayPayments.map((p: any) => p.clienteId || p.codigoCliente));
      const clientesAtendidos = clientesUnicos.size;

      // Agrupar por tipo de pago
      const pagosPorTipo = todayPayments.reduce((acc: any, payment: any) => {
        const tipo = payment.tipoPago || 'EFECTIVO';
        if (!acc[tipo]) {
          acc[tipo] = { count: 0, amount: 0 };
        }
        acc[tipo].count++;
        acc[tipo].amount += payment.monto;
        return acc;
      }, {} as any);

      // Rellenar tipos faltantes
      ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE', 'OTRO'].forEach(tipo => {
        if (!pagosPorTipo[tipo]) {
          pagosPorTipo[tipo] = { count: 0, amount: 0 };
        }
      });

      // Obtener comparación con ayer (si está online)
      let comparacionAyer = { cobrado: 0, pagos: 0, clientes: 0 };
      
      if (isOnline) {
        const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayResponse = await fetch(`/api/pagos?gestorId=${gestorId}&date=${yesterday.toISOString()}`);
        
        if (yesterdayResponse.ok) {
          const yesterdayPayments = await yesterdayResponse.json();
          const yesterdayTotal = yesterdayPayments.reduce((sum: number, payment: any) => sum + payment.monto, 0);
          const yesterdayClientes = new Set(yesterdayPayments.map((p: any) => p.clienteId || p.codigoCliente));
          
          comparacionAyer = {
            cobrado: totalCobrado - yesterdayTotal,
            pagos: totalPagos - yesterdayPayments.length,
            clientes: clientesAtendidos - yesterdayClientes.size
          };
        }
      }

      setSummary({
        totalCobrado,
        totalPagos,
        clientesAtendidos,
        pagosPorTipo,
        comparacionAyer
      });

    } catch (error) {
      console.error('Error loading daily summary:', error);
      toast.error('Error al cargar resumen diario');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getTipoPagoColor = (tipo: string) => {
    const colors = {
      'EFECTIVO': 'bg-green-100 text-green-800 border-green-200',
      'TARJETA': 'bg-blue-100 text-blue-800 border-blue-200',
      'TRANSFERENCIA': 'bg-purple-100 text-purple-800 border-purple-200',
      'CHEQUE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'OTRO': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[tipo as keyof typeof colors] || colors['OTRO'];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumen del Día
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDailySummary}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <p className="text-sm text-gray-600">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Total Cobrado</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(summary.totalCobrado)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
                {isOnline && (
                  <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(summary.comparacionAyer.cobrado)}`}>
                    {getTrendIcon(summary.comparacionAyer.cobrado)}
                    {formatCurrency(Math.abs(summary.comparacionAyer.cobrado))} vs ayer
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Total Pagos</p>
                    <p className="text-2xl font-bold text-blue-900">{summary.totalPagos}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-blue-600" />
                </div>
                {isOnline && (
                  <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(summary.comparacionAyer.pagos)}`}>
                    {getTrendIcon(summary.comparacionAyer.pagos)}
                    {Math.abs(summary.comparacionAyer.pagos)} vs ayer
                  </div>
                )}
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800">Clientes Atendidos</p>
                    <p className="text-2xl font-bold text-purple-900">{summary.clientesAtendidos}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                {isOnline && (
                  <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(summary.comparacionAyer.clientes)}`}>
                    {getTrendIcon(summary.comparacionAyer.clientes)}
                    {Math.abs(summary.comparacionAyer.clientes)} vs ayer
                  </div>
                )}
              </div>
            </div>

            {/* Desglose por tipo de pago */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Desglose por Tipo de Pago</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(summary.pagosPorTipo).map(([tipo, data]) => (
                  <div
                    key={tipo}
                    className={`p-3 rounded-lg border ${getTipoPagoColor(tipo)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{tipo}</span>
                      <Badge variant="secondary" className="text-xs">
                        {data.count}
                      </Badge>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(data.amount)}
                    </p>
                    {summary.totalCobrado > 0 && (
                      <p className="text-xs opacity-75 mt-1">
                        {((data.amount / summary.totalCobrado) * 100).toFixed(1)}% del total
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Promedio por pago */}
            {summary.totalPagos > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Promedio por Pago</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(summary.totalCobrado / summary.totalPagos)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>Meta diaria: {formatCurrency(10000)}</p>
                    <p className={`font-medium ${summary.totalCobrado >= 10000 ? 'text-green-600' : 'text-orange-600'}`}>
                      {summary.totalCobrado >= 10000 ? '✅ Cumplida' : `${((summary.totalCobrado / 10000) * 100).toFixed(1)}% alcanzado`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isOnline && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <p className="text-sm text-amber-800">
                  ⚠️ Trabajando offline. Las comparaciones y algunas métricas pueden no estar actualizadas.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
