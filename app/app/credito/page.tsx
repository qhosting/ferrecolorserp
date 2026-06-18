'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  UserCheck, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldQuestion, 
  Calendar, 
  DollarSign,
  TrendingDown,
  Info,
  RefreshCw,
  Percent
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ClientScore {
  id: string;
  codigoCliente: string;
  nombre: string;
  saldoActual: number;
  limiteCredito: number;
  usoLimitePorcentaje: number;
  pagaresVencidosCount: number;
  totalMontoVencido: number;
  totalPagaresCount: number;
  score: number;
  riesgo: 'BAJO' | 'MEDIO' | 'ALTO';
  colorClass: string;
  status: string;
  fechaAlta: string;
}

export default function CreditoPage() {
  const { data: session } = useSession() || {};
  const [scoring, setScoring] = useState<ClientScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientScore | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [historial, setHistorial] = useState<any | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  useEffect(() => {
    fetchScoring();
  }, [searchTerm]);

  const fetchScoring = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      const response = await fetch(`/api/clientes/scoring?${params}`);
      if (response.ok) {
        const data = await response.json();
        setScoring(data.scoring || []);
      } else {
        toast.error('Error al cargar análisis de crédito');
      }
    } catch (error) {
      console.error('Error fetching scoring:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const openDetailModal = async (client: ClientScore) => {
    setSelectedClient(client);
    setShowDetailModal(true);
    setHistorial(null);
    setLoadingHistorial(true);
    try {
      const res = await fetch(`/api/clientes/${client.id}/historial`);
      if (res.ok) {
        setHistorial(await res.json());
      }
    } catch (error) {
      console.error('Error fetching historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const estatusBadge = (estatus: string) => {
    const map: Record<string, string> = {
      PAGADO: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      VENCIDO: 'bg-rose-500/10 text-rose-600 border-rose-200',
      PARCIAL: 'bg-amber-500/10 text-amber-600 border-amber-200',
      PENDIENTE: 'bg-blue-500/10 text-blue-600 border-blue-200',
    };
    return map[estatus] || 'bg-slate-500/10 text-slate-600 border-slate-200';
  };

  // Stats Calculations
  const creditClients = scoring.filter(c => c.limiteCredito > 0 || c.saldoActual > 0);
  const totalClientsCount = creditClients.length;

  const avgScore = totalClientsCount > 0
    ? Math.round(creditClients.reduce((sum, c) => sum + c.score, 0) / totalClientsCount)
    : 100;

  const highRiskCount = creditClients.filter(c => c.score < 50).length;
  const mediumRiskCount = creditClients.filter(c => c.score >= 50 && c.score < 75).length;
  const lowRiskCount = creditClients.filter(c => c.score >= 75).length;

  const getScoreClassification = (score: number) => {
    if (score >= 85) return { text: 'Excelente', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200' };
    if (score >= 70) return { text: 'Bueno', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200' };
    if (score >= 50) return { text: 'Riesgo Medio', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200' };
    return { text: 'Riesgo Alto', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200' };
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Scoring de Crédito"
        description="Evaluación de riesgo crediticio en tiempo real basada en saldos, límites autorizados y comportamiento de pagarés."
      />
      <div className="p-6 space-y-6">

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Score Promedio</p>
              <h3 className={`text-3xl font-bold tracking-tight ${avgScore >= 75 ? 'text-emerald-600' : avgScore >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                {avgScore} <span className="text-xs font-normal text-slate-500">/ 100 pts</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Cartera en Riesgo Alto</p>
              <h3 className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{highRiskCount}</h3>
            </div>
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Cartera en Riesgo Medio</p>
              <h3 className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{mediumRiskCount}</h3>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl">
              <ShieldQuestion className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Cartera Saludable (Bajo Riesgo)</p>
              <h3 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{lowRiskCount}</h3>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
        <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-bold">Matriz de Comportamiento Crediticio</CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Buscar cliente por código o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchScoring()} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Cliente</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Score (0-100)</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Nivel de Riesgo</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Límite vs Saldo Deudor</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Uso de Línea</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Abonos Vencidos</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Monto Vencido</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      Procesando algoritmo de scoring...
                    </TableCell>
                  </TableRow>
                ) : scoring.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      No se encontraron clientes registrados para análisis.
                    </TableCell>
                  </TableRow>
                ) : (
                  scoring.map((client) => {
                    const classif = getScoreClassification(client.score);
                    const usagePercent = Math.min(100, client.usoLimitePorcentaje);

                    return (
                      <TableRow key={client.id} className="border-slate-200 dark:border-slate-800">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{client.nombre}</p>
                            <span className="font-mono text-xs text-slate-500">{client.codigoCliente}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-lg">
                          <span className={`px-2.5 py-1 rounded-xl ${
                            client.score >= 85 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' : 
                            client.score >= 70 ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/20' : 
                            client.score >= 50 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' : 
                            'text-rose-600 bg-rose-50 dark:bg-rose-950/20'
                          }`}>
                            {client.score}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-semibold ${classif.badge}`}>
                            {classif.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500 font-medium">
                              <span>Debe: {formatPrice(client.saldoActual)}</span>
                              <span>Límite: {formatPrice(client.limiteCredito)}</span>
                            </div>
                            <Progress 
                              value={usagePercent} 
                              className={`h-2 rounded-full ${
                                client.usoLimitePorcentaje > 100 ? 'bg-rose-100 [&>div]:bg-rose-600' :
                                client.usoLimitePorcentaje > 80 ? 'bg-amber-100 [&>div]:bg-amber-500' :
                                'bg-slate-100 dark:bg-slate-800 [&>div]:bg-blue-600'
                              }`} 
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {Math.round(client.usoLimitePorcentaje)}%
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {client.pagaresVencidosCount > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full text-xs">
                              {client.pagaresVencidosCount} pagarés
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full text-xs">
                              0 al corriente
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${client.totalMontoVencido > 0 ? 'text-rose-600' : 'text-slate-600 dark:text-slate-400'}`}>
                          {formatPrice(client.totalMontoVencido)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailModal(client)}
                            className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 flex-inline items-center gap-1.5"
                          >
                            <Info className="h-3.5 w-3.5" />
                            Ver Historial
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail breakdown dialog */}
      <Dialog open={showDetailModal} onOpenChange={(open) => !open && setShowDetailModal(false)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Análisis y Desglose Crediticio</DialogTitle>
            <DialogDescription>
              Desglose detallado del comportamiento financiero e historial.
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">{selectedClient.nombre}</h4>
                <p className="font-mono text-xs text-slate-500">{selectedClient.codigoCliente}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={getScoreClassification(selectedClient.score).badge}>
                    Score {selectedClient.score} - {getScoreClassification(selectedClient.score).text}
                  </Badge>
                  <span className="text-xs text-slate-500 font-medium">Estado: {selectedClient.status}</span>
                </div>
              </div>

              {/* Deductions breakdown */}
              <div className="space-y-3">
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Criterio y Puntuación</h5>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-2.5 flex justify-between text-sm bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-slate-600">Base</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">100 pts</span>
                  </div>
                  
                  {/* Limit Usage impact */}
                  <div className="p-2.5 flex justify-between text-sm items-center">
                    <span className="text-slate-600">Línea de crédito ocupada ({Math.round(selectedClient.usoLimitePorcentaje)}%)</span>
                    <span className={`font-semibold ${selectedClient.usoLimitePorcentaje > 100 ? 'text-rose-600' : selectedClient.usoLimitePorcentaje > 80 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {selectedClient.usoLimitePorcentaje > 100 ? '-35 pts' : selectedClient.usoLimitePorcentaje > 80 ? '-20 pts' : selectedClient.usoLimitePorcentaje > 50 ? '-10 pts' : '0 pts'}
                    </span>
                  </div>

                  {/* Overdue promissory notes */}
                  <div className="p-2.5 flex justify-between text-sm items-center">
                    <span className="text-slate-600">Pagarés vencidos e impagos ({selectedClient.pagaresVencidosCount})</span>
                    <span className={`font-semibold ${selectedClient.pagaresVencidosCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {selectedClient.pagaresVencidosCount > 0 ? `-${Math.min(selectedClient.pagaresVencidosCount * 15, 50)} pts` : '0 pts'}
                    </span>
                  </div>

                  {/* Customer status penalty */}
                  {selectedClient.status !== 'ACTIVO' && (
                    <div className="p-2.5 flex justify-between text-sm items-center">
                      <span className="text-slate-600">Penalización Estado ({selectedClient.status})</span>
                      <span className="font-semibold text-rose-600">
                        {selectedClient.status === 'MOROSO' ? '-30 pts' : selectedClient.status === 'BLOQUEADO' ? '-50 pts' : '0 pts'}
                      </span>
                    </div>
                  )}

                  {/* Antiquity/Loyalty bonus */}
                  <div className="p-2.5 flex justify-between text-sm items-center">
                    <span className="text-slate-600">Antigüedad e Historial Limpio</span>
                    <span className={`font-semibold ${selectedClient.pagaresVencidosCount === 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {selectedClient.pagaresVencidosCount === 0 ? '+10 pts' : '0 pts'}
                    </span>
                  </div>

                  {/* Final score */}
                  <div className="p-2.5 flex justify-between text-sm bg-slate-50 dark:bg-slate-900/50">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Resultado Final</span>
                    <span className={`font-bold text-lg ${
                      selectedClient.score >= 85 ? 'text-emerald-600' : 
                      selectedClient.score >= 70 ? 'text-blue-600' : 
                      selectedClient.score >= 50 ? 'text-amber-600' : 
                      'text-rose-600'
                    }`}>
                      {selectedClient.score} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Behavior Analysis */}
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Comportamiento General</h5>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedClient.score >= 85 ? (
                    'Este cliente presenta un comportamiento financiero intachable. Mantiene su cuenta al corriente y tiene un nivel de endeudamiento saludable. Califica para ampliación de línea de crédito si lo solicita.'
                  ) : selectedClient.score >= 70 ? (
                    'El cliente mantiene una conducta crediticia estable. No tiene pagarés vencidos actualmente, aunque utiliza un porcentaje considerable de su límite disponible.'
                  ) : selectedClient.score >= 50 ? (
                    'Se observa un nivel de riesgo moderado. Muestra indicios de saturación en su línea de crédito o retrasos menores de pago. Requiere supervisión preventiva.'
                  ) : (
                    'Cliente de alto riesgo con pagarés vencidos acumulados y/o estado de morosidad activa. La cuenta se encuentra en suspensión automática de ventas a crédito.'
                  )}
                </p>
              </div>

              {/* Historial real de pagarés y pagos */}
              <div className="space-y-3">
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Historial de Pagos y Pagarés</h5>
                {loadingHistorial ? (
                  <p className="text-sm text-slate-500 py-4 text-center">Cargando historial...</p>
                ) : !historial ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No se pudo cargar el historial.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <p className="text-lg font-bold">{historial.resumen.totalPagares}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Pagarés</p>
                      </div>
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                        <p className="text-lg font-bold text-emerald-600">{historial.resumen.pagados}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Pagados</p>
                      </div>
                      <div className="p-2 bg-rose-50 dark:bg-rose-950/20 rounded-lg">
                        <p className="text-lg font-bold text-rose-600">{historial.resumen.vencidos}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Vencidos</p>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <p className="text-lg font-bold text-blue-600">{historial.resumen.pendientes}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Pendientes</p>
                      </div>
                    </div>

                    {historial.pagares.length > 0 && (
                      <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-slate-600">Pagaré</th>
                                <th className="text-left px-3 py-2 font-semibold text-slate-600">Vencimiento</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-600">Monto</th>
                                <th className="text-center px-3 py-2 font-semibold text-slate-600">Estatus</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historial.pagares.map((p: any) => (
                                <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                                  <td className="px-3 py-2">
                                    <span className="font-mono">{p.folio ?? '—'} #{p.numeroPago}</span>
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">{new Date(p.fechaVencimiento).toLocaleDateString('es-MX')}</td>
                                  <td className="px-3 py-2 text-right font-medium">{formatPrice(p.monto)}</td>
                                  <td className="px-3 py-2 text-center">
                                    <Badge variant="outline" className={`text-[9px] ${estatusBadge(p.estatus)}`}>{p.estatus}</Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {historial.pagos.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 mb-1">Últimos pagos · Total {formatPrice(historial.resumen.totalPagado)}</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {historial.pagos.map((pago: any) => (
                            <div key={pago.id} className="flex justify-between text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                              <span className="text-slate-500">{new Date(pago.fecha).toLocaleDateString('es-MX')} · {pago.tipoPago}</span>
                              <span className="font-medium text-emerald-600">{formatPrice(pago.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {historial.pagares.length === 0 && historial.pagos.length === 0 && (
                      <p className="text-sm text-slate-500 py-2 text-center">Sin movimientos registrados para este cliente.</p>
                    )}
                  </>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" onClick={() => setShowDetailModal(false)} className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl">
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
