
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/navigation/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Shield, 
  Activity, 
  User, 
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Settings,
  Lock
} from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLog {
  id: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  accion: string;
  modulo: string;
  entidad: string;
  entidadId: string;
  detalles: any;
  ip: string;
  userAgent: string;
  resultado: 'EXITOSO' | 'ERROR' | 'ADVERTENCIA';
  mensaje?: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  timestamp: string;
}

interface SecurityEvent {
  id: string;
  tipo: 'LOGIN_EXITOSO' | 'LOGIN_FALLIDO' | 'LOGOUT' | 'CAMBIO_PASSWORD' | 'ACCESO_DENEGADO' | 'SESION_EXPIRADA';
  usuario?: {
    id: string;
    nombre: string;
    email: string;
  };
  ip: string;
  userAgent: string;
  detalles: any;
  riesgo: 'BAJO' | 'MEDIO' | 'ALTO';
  timestamp: string;
}

interface DataChange {
  id: string;
  tabla: string;
  registroId: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  camposAfectados: string[];
  valoresAnteriores: any;
  valoresNuevos: any;
  usuario: {
    id: string;
    nombre: string;
  };
  timestamp: string;
}

export default function AuditoriaPage() {
  const [activeTab, setActiveTab] = useState('logs');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [dataChanges, setDataChanges] = useState<DataChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedResult, setSelectedResult] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('today');
  const [detalle, setDetalle] = useState<{ titulo: string; data: any } | null>(null);

  const { toast } = useToast();

  // Análisis real derivado de los logs cargados
  const analisis = (() => {
    const total = auditLogs.length;
    const errores = auditLogs.filter((l) => l.resultado === 'ERROR').length;
    const tasaError = total > 0 ? (errores / total) * 100 : 0;

    const porModulo: Record<string, number> = {};
    const porUsuario: Record<string, number> = {};
    const porHora: Record<number, number> = {};
    for (const l of auditLogs) {
      porModulo[l.modulo] = (porModulo[l.modulo] || 0) + 1;
      const nombre = l.usuario?.nombre || l.usuario?.email || 'Desconocido';
      porUsuario[nombre] = (porUsuario[nombre] || 0) + 1;
      const h = new Date(l.timestamp).getHours();
      porHora[h] = (porHora[h] || 0) + 1;
    }

    const topModulo = Object.entries(porModulo).sort((a, b) => b[1] - a[1])[0];
    const topUsuario = Object.entries(porUsuario).sort((a, b) => b[1] - a[1])[0];
    const topHora = Object.entries(porHora).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      tasaError,
      topModulo: topModulo ? { nombre: topModulo[0], pct: total > 0 ? (topModulo[1] / total) * 100 : 0 } : null,
      topUsuario: topUsuario ? { nombre: topUsuario[0], count: topUsuario[1] } : null,
      topHora: topHora ? `${topHora[0].padStart(2, '0')}:00 - ${String(Number(topHora[0]) + 1).padStart(2, '0')}:00` : null,
    };
  })();

  const alertasSeguridad = securityEvents
    .filter((e) => e.tipo === 'LOGIN_FALLIDO' || e.tipo === 'ACCESO_DENEGADO' || e.riesgo === 'ALTO')
    .slice(0, 5);

  useEffect(() => {
    loadAuditData();
  }, []);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const [logsRes, securityRes, changesRes] = await Promise.all([
        fetch('/api/auditoria/logs'),
        fetch('/api/auditoria/security'),
        fetch('/api/auditoria/changes')
      ]);

      const [logsData, securityData, changesData] = await Promise.all([
        logsRes.json(),
        securityRes.json(),
        changesRes.json()
      ]);

      setAuditLogs(logsData.logs || []);
      setSecurityEvents(securityData.events || []);
      setDataChanges(changesData.changes || []);
    } catch (error) {
      console.error('Error loading audit data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos de auditoría",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportAuditReport = async () => {
    try {
      const response = await fetch('/api/auditoria/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fechaInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          fechaFin: new Date().toISOString(),
          modulos: selectedModule ? [selectedModule] : [],
          usuarios: selectedUser ? [selectedUser] : []
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Éxito",
          description: "Reporte de auditoría exportado correctamente",
        });
      }
    } catch (error) {
      console.error('Error exporting audit report:', error);
      toast({
        title: "Error",
        description: "Error al exportar el reporte",
        variant: "destructive",
      });
    }
  };

  const getResultadoBadge = (resultado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      'EXITOSO': 'default',
      'ERROR': 'destructive',
      'ADVERTENCIA': 'secondary'
    };
    const colors = {
      'EXITOSO': 'bg-green-500',
      'ERROR': 'bg-red-500',
      'ADVERTENCIA': 'bg-yellow-500'
    };
    return (
      <Badge 
        variant={variants[resultado] || 'default'} 
        className={colors[resultado as keyof typeof colors]}
      >
        {resultado}
      </Badge>
    );
  };

  const getRiesgoBadge = (riesgo: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      'BAJO': 'secondary',
      'MEDIO': 'default',
      'ALTO': 'destructive'
    };
    return <Badge variant={variants[riesgo] || 'default'}>{riesgo}</Badge>;
  };

  const getOperacionBadge = (operacion: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      'INSERT': 'default',
      'UPDATE': 'secondary',
      'DELETE': 'destructive'
    };
    return <Badge variant={variants[operacion] || 'default'}>{operacion}</Badge>;
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.accion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.modulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = !selectedModule || selectedModule === 'all' || log.modulo === selectedModule;
    const matchesUser = !selectedUser || selectedUser === 'all' || log.usuario.id === selectedUser;
    const matchesResult = !selectedResult || selectedResult === 'all' || log.resultado === selectedResult;
    
    return matchesSearch && matchesModule && matchesUser && matchesResult;
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Auditoría y Seguridad"
        description="Registro completo de actividades, cambios de datos y eventos de seguridad"
      />
      <div className="p-6 space-y-6">
        <div className="flex justify-end gap-2">
          <Button onClick={exportAuditReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Reporte
          </Button>
          <Button onClick={() => { window.location.href = '/configuracion'; }}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Hoy</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.filter(log => 
              format(new Date(log.timestamp), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
            ).length}</div>
            <p className="text-xs text-muted-foreground">
              {auditLogs.filter(log => log.resultado === 'ERROR').length} errores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(auditLogs.map(log => log.usuario.id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cambios de Datos</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataChanges.length}</div>
            <p className="text-xs text-muted-foreground">
              {dataChanges.filter(c => c.operacion === 'DELETE').length} eliminaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Seguridad</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityEvents.filter(e => e.riesgo === 'ALTO').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Riesgo alto detectado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="VENTAS">Ventas</SelectItem>
                <SelectItem value="COBRANZA">Cobranza</SelectItem>
                <SelectItem value="INVENTARIO">Inventario</SelectItem>
                <SelectItem value="CLIENTES">Clientes</SelectItem>
                <SelectItem value="USUARIOS">Usuarios</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedResult} onValueChange={setSelectedResult}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="EXITOSO">Exitoso</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="ADVERTENCIA">Advertencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="logs">Logs de Auditoría</TabsTrigger>
          <TabsTrigger value="security">Eventos de Seguridad</TabsTrigger>
          <TabsTrigger value="changes">Cambios de Datos</TabsTrigger>
          <TabsTrigger value="analysis">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Actividades</CardTitle>
              <CardDescription>
                Historial completo de todas las acciones realizadas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Fecha/Hora</th>
                      <th className="px-4 py-3 text-left">Usuario</th>
                      <th className="px-4 py-3 text-left">Acción</th>
                      <th className="px-4 py-3 text-left">Módulo</th>
                      <th className="px-4 py-3 text-left">Resultado</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b">
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-medium">
                              {format(new Date(log.timestamp), 'dd/MM/yyyy', { locale: es })}
                            </p>
                            <p className="text-muted-foreground">
                              {format(new Date(log.timestamp), 'HH:mm:ss')}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{log.usuario.nombre}</p>
                            <p className="text-sm text-muted-foreground">{log.usuario.rol}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{log.accion}</p>
                            <p className="text-sm text-muted-foreground">{log.entidad}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{log.modulo}</Badge>
                        </td>
                        <td className="px-4 py-3">{getResultadoBadge(log.resultado)}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setDetalle({ titulo: `Log · ${log.accion}`, data: log })}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos de Seguridad</CardTitle>
              <CardDescription>
                Intentos de acceso, autenticación y eventos de seguridad del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Fecha/Hora</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Usuario</th>
                      <th className="px-4 py-3 text-left">IP</th>
                      <th className="px-4 py-3 text-left">Riesgo</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityEvents.map((event) => (
                      <tr key={event.id} className="border-b">
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-medium">
                              {format(new Date(event.timestamp), 'dd/MM/yyyy', { locale: es })}
                            </p>
                            <p className="text-muted-foreground">
                              {format(new Date(event.timestamp), 'HH:mm:ss')}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{event.tipo}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {event.usuario ? (
                            <div>
                              <p className="font-medium">{event.usuario.nombre}</p>
                              <p className="text-sm text-muted-foreground">{event.usuario.email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{event.ip}</td>
                        <td className="px-4 py-3">{getRiesgoBadge(event.riesgo)}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setDetalle({ titulo: `Evento · ${event.tipo}`, data: event })}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cambios de Datos</CardTitle>
              <CardDescription>
                Registro de todas las modificaciones realizadas a los datos del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Fecha/Hora</th>
                      <th className="px-4 py-3 text-left">Tabla</th>
                      <th className="px-4 py-3 text-left">Operación</th>
                      <th className="px-4 py-3 text-left">Usuario</th>
                      <th className="px-4 py-3 text-left">Campos</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataChanges.map((change) => (
                      <tr key={change.id} className="border-b">
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-medium">
                              {format(new Date(change.timestamp), 'dd/MM/yyyy', { locale: es })}
                            </p>
                            <p className="text-muted-foreground">
                              {format(new Date(change.timestamp), 'HH:mm:ss')}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{change.tabla}</Badge>
                        </td>
                        <td className="px-4 py-3">{getOperacionBadge(change.operacion)}</td>
                        <td className="px-4 py-3 font-medium">{change.usuario.nombre}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {change.camposAfectados.slice(0, 3).map((campo) => (
                              <Badge key={campo} variant="secondary" className="text-xs">
                                {campo}
                              </Badge>
                            ))}
                            {change.camposAfectados.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{change.camposAfectados.length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setDetalle({ titulo: `Cambio · ${change.tabla}`, data: change })}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Actividad</CardTitle>
                <CardDescription>
                  Patrones de uso derivados de {analisis.total} registros de auditoría
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Horario de mayor actividad</span>
                    <Badge>{analisis.topHora ?? '—'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Módulo más utilizado</span>
                    <Badge>
                      {analisis.topModulo ? `${analisis.topModulo.nombre} (${analisis.topModulo.pct.toFixed(0)}%)` : '—'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Usuario más activo</span>
                    <Badge>
                      {analisis.topUsuario ? `${analisis.topUsuario.nombre} (${analisis.topUsuario.count} acciones)` : '—'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tasa de errores</span>
                    <Badge variant={analisis.tasaError > 5 ? 'destructive' : 'default'}>
                      {analisis.tasaError.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertas de Seguridad</CardTitle>
                <CardDescription>
                  Eventos reales que requieren atención
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alertasSeguridad.length === 0 ? (
                    <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium">Sistema estable</p>
                        <p className="text-sm text-muted-foreground">No se detectaron eventos de riesgo recientes</p>
                      </div>
                    </div>
                  ) : (
                    alertasSeguridad.map((e) => (
                      <div key={e.id} className={`flex items-center gap-4 p-3 rounded-lg ${e.riesgo === 'ALTO' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                        {e.riesgo === 'ALTO' ? <Lock className="h-5 w-5 text-red-600" /> : <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                        <div className="flex-1">
                          <p className="font-medium">{e.tipo.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {e.usuario?.email ?? 'Usuario desconocido'} · IP {e.ip} · {format(new Date(e.timestamp), 'dd MMM HH:mm', { locale: es })}
                          </p>
                        </div>
                        <Badge variant={e.riesgo === 'ALTO' ? 'destructive' : 'secondary'} className="text-xs">{e.riesgo}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de detalle */}
      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{detalle?.titulo}</DialogTitle>
            <DialogDescription>Detalle completo del registro de auditoría.</DialogDescription>
          </DialogHeader>
          <pre className="text-xs bg-muted/50 rounded-md p-3 max-h-[60vh] overflow-auto whitespace-pre-wrap break-all">
            {detalle ? JSON.stringify(detalle.data, null, 2) : ''}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
