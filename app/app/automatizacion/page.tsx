
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Play, 
  Pause, 
  Settings, 
  Bot, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Activity,
  Zap,
  Mail,
  Bell,
  Workflow,
  Timer
} from "lucide-react";

interface WorkflowRule {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'PROGRAMADA' | 'EVENTO' | 'CONDICIONAL';
  trigger: string;
  condiciones: any[];
  acciones: any[];
  activo: boolean;
  ultimaEjecucion?: string;
  proximaEjecucion?: string;
  ejecutado: number;
  errores: number;
  createdAt: string;
}

interface TaskAutomatizada {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'COBRANZA' | 'INVENTARIO' | 'REPORTES' | 'NOTIFICACION';
  frecuencia: 'DIARIA' | 'SEMANAL' | 'MENSUAL' | 'PERSONALIZADA';
  horario: string;
  activo: boolean;
  ultimaEjecucion?: string;
  proximaEjecucion?: string;
  parametros: any;
  logs: any[];
  createdAt: string;
}

interface NotificationRule {
  id: string;
  evento: string;
  titulo: string;
  mensaje: string;
  destinatarios: string[];
  canales: ('EMAIL' | 'SMS' | 'PUSH' | 'SISTEMA')[];
  condiciones: any[];
  activo: boolean;
  enviadas: number;
  createdAt: string;
}

export default function AutomatizacionPage() {
  const [activeTab, setActiveTab] = useState('workflows');
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [tasks, setTasks] = useState<TaskAutomatizada[]>([]);
  const [notifications, setNotifications] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'workflow' | 'task' | 'notification'>('workflow');

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workflowsRes, tasksRes, notificationsRes] = await Promise.all([
        fetch('/api/automatizacion/workflows'),
        fetch('/api/automatizacion/tasks'),
        fetch('/api/automatizacion/notifications')
      ]);

      const [workflowsData, tasksData, notificationsData] = await Promise.all([
        workflowsRes.json(),
        tasksRes.json(),
        notificationsRes.json()
      ]);

      setWorkflows(workflowsData.workflows || []);
      setTasks(tasksData.tasks || []);
      setNotifications(notificationsData.notifications || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos de automatización",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (id: string, activo: boolean) => {
    try {
      const response = await fetch(`/api/automatizacion/workflows/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo }),
      });

      if (response.ok) {
        setWorkflows(prev => 
          prev.map(w => w.id === id ? { ...w, activo } : w)
        );
        toast({
          title: "Éxito",
          description: `Workflow ${activo ? 'activado' : 'desactivado'} correctamente`,
        });
      }
    } catch (error) {
      console.error('Error updating workflow:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el workflow",
        variant: "destructive",
      });
    }
  };

  const toggleTask = async (id: string, activo: boolean) => {
    try {
      const response = await fetch(`/api/automatizacion/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo }),
      });

      if (response.ok) {
        setTasks(prev => 
          prev.map(t => t.id === id ? { ...t, activo } : t)
        );
        toast({
          title: "Éxito",
          description: `Tarea ${activo ? 'activada' : 'desactivada'} correctamente`,
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la tarea",
        variant: "destructive",
      });
    }
  };

  const executeMaintenance = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/automatizacion/maintenance', {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Mantenimiento automático ejecutado correctamente",
        });
        loadData();
      }
    } catch (error) {
      console.error('Error running maintenance:', error);
      toast({
        title: "Error",
        description: "Error al ejecutar el mantenimiento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      'PROGRAMADA': 'default',
      'EVENTO': 'secondary',
      'CONDICIONAL': 'default',
      'COBRANZA': 'secondary',
      'INVENTARIO': 'default',
      'REPORTES': 'secondary',
      'NOTIFICACION': 'default'
    };
    return <Badge variant={colors[tipo] || 'default'}>{tipo}</Badge>;
  };

  const getEstadoBadge = (activo: boolean, errores?: number) => {
    if (!activo) {
      return <Badge variant="secondary">Inactivo</Badge>;
    }
    if (errores && errores > 0) {
      return <Badge variant="destructive">Con Errores</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Activo</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automatización Avanzada</h1>
          <p className="text-muted-foreground">
            Gestión de workflows, tareas programadas y notificaciones automatizadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={executeMaintenance} variant="outline" disabled={loading}>
            <Settings className="h-4 w-4 mr-2" />
            Mantenimiento
          </Button>
          <Button onClick={() => { setDialogType('workflow'); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Workflow
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows Activos</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.filter(w => w.activo).length}</div>
            <p className="text-xs text-muted-foreground">
              {workflows.reduce((sum, w) => sum + w.ejecutado, 0)} ejecuciones totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas Programadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.filter(t => t.activo).length}</div>
            <p className="text-xs text-muted-foreground">
              {tasks.filter(t => t.proximaEjecucion).length} próximas a ejecutar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificaciones</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.filter(n => n.activo).length}</div>
            <p className="text-xs text-muted-foreground">
              {notifications.reduce((sum, n) => sum + n.enviadas, 0)} enviadas hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errores</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.reduce((sum, w) => sum + w.errores, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              En las últimas 24 horas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="tareas">Tareas Programadas</TabsTrigger>
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          <TabsTrigger value="monitoreo">Monitoreo</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reglas de Workflow</CardTitle>
              <CardDescription>
                Automatización de procesos basada en eventos y condiciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Trigger</th>
                      <th className="px-4 py-3 text-left">Ejecuciones</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((workflow) => (
                      <tr key={workflow.id} className="border-b">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{workflow.nombre}</p>
                            <p className="text-sm text-muted-foreground">{workflow.descripcion}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getTipoBadge(workflow.tipo)}</td>
                        <td className="px-4 py-3 font-mono text-sm">{workflow.trigger}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-medium text-green-600">{workflow.ejecutado}</p>
                            {workflow.errores > 0 && (
                              <p className="text-red-600">{workflow.errores} errores</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{getEstadoBadge(workflow.activo, workflow.errores)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={workflow.activo}
                              onCheckedChange={(checked) => toggleWorkflow(workflow.id, checked)}
                            />
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tareas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tareas Programadas</CardTitle>
              <CardDescription>
                Ejecución automática de procesos en horarios específicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Tarea</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Frecuencia</th>
                      <th className="px-4 py-3 text-left">Próxima Ejecución</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="border-b">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{task.nombre}</p>
                            <p className="text-sm text-muted-foreground">{task.descripcion}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getTipoBadge(task.tipo)}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p>{task.frecuencia}</p>
                            <p className="text-muted-foreground">{task.horario}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {task.proximaEjecucion ? (
                            <div className="text-sm">
                              <p>{new Date(task.proximaEjecucion).toLocaleDateString()}</p>
                              <p className="text-muted-foreground">
                                {new Date(task.proximaEjecucion).toLocaleTimeString()}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No programada</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{getEstadoBadge(task.activo)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={task.activo}
                              onCheckedChange={(checked) => toggleTask(task.id, checked)}
                            />
                            <Button variant="ghost" size="sm">
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reglas de Notificación</CardTitle>
              <CardDescription>
                Configuración de alertas automáticas por email, SMS y push
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Evento</th>
                      <th className="px-4 py-3 text-left">Título</th>
                      <th className="px-4 py-3 text-left">Canales</th>
                      <th className="px-4 py-3 text-left">Enviadas</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((notification) => (
                      <tr key={notification.id} className="border-b">
                        <td className="px-4 py-3 font-medium">{notification.evento}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{notification.titulo}</p>
                            <p className="text-sm text-muted-foreground">
                              {notification.destinatarios.length} destinatarios
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {notification.canales.map((canal) => (
                              <Badge key={canal} variant="outline" className="text-xs">
                                {canal}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-green-600 font-medium">
                          {notification.enviadas}
                        </td>
                        <td className="px-4 py-3">{getEstadoBadge(notification.activo)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch checked={notification.activo} />
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoreo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Actividad del Sistema</CardTitle>
                <CardDescription>
                  Monitoreo en tiempo real de automatizaciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium">Workflow de Cobranza</p>
                      <p className="text-sm text-muted-foreground">Ejecutado hace 5 minutos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">Reporte Diario</p>
                      <p className="text-sm text-muted-foreground">En ejecución...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div className="flex-1">
                      <p className="font-medium">Backup Automático</p>
                      <p className="text-sm text-muted-foreground">Programado para 02:00 AM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
                <CardDescription>
                  Métricas de rendimiento y uso de recursos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU Usage</span>
                      <span>45%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: '45%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span>62%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{width: '62%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Database Load</span>
                      <span>28%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{width: '28%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'workflow' && 'Nuevo Workflow'}
              {dialogType === 'task' && 'Nueva Tarea Programada'}
              {dialogType === 'notification' && 'Nueva Regla de Notificación'}
            </DialogTitle>
            <DialogDescription>
              Configure los parámetros para la automatización.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-center py-8">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Configuración Avanzada</h3>
              <p className="text-muted-foreground">
                Esta funcionalidad estará disponible próximamente
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button>
              Crear Automatización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
