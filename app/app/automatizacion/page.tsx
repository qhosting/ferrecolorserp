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
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Settings,
  Bot,
  Calendar,
  AlertCircle,
  CheckCircle,
  Bell,
  Trash2,
  XCircle,
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
  tipo: string;
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
  canales: string[];
  condiciones: any[];
  activo: boolean;
  enviadas: number;
  createdAt: string;
}

interface AutomationLog {
  id: string;
  fecha: string;
  accion: string;
  status: string;
  detalles: any;
  error?: string | null;
}

export default function AutomatizacionPage() {
  const [activeTab, setActiveTab] = useState('workflows');
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [tasks, setTasks] = useState<TaskAutomatizada[]>([]);
  const [notifications, setNotifications] = useState<NotificationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [logResumen, setLogResumen] = useState({ total24h: 0, exitosas24h: 0, errores24h: 0 });
  const [loading, setLoading] = useState(false);

  const [dialogType, setDialogType] = useState<'workflow' | 'task' | 'notification' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Workflow form
  const [wfForm, setWfForm] = useState({ nombre: '', descripcion: '', tipo: 'EVENTO', trigger: '' });
  // Task form
  const [taskForm, setTaskForm] = useState({ nombre: '', descripcion: '', tipo: 'COBRANZA', frecuencia: 'DIARIA', horario: '02:00' });
  // Notification form
  const [notifForm, setNotifForm] = useState({ evento: '', titulo: '', mensaje: '', destinatarios: '', canales: 'EMAIL' });

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workflowsRes, tasksRes, notificationsRes, logsRes] = await Promise.all([
        fetch('/api/automatizacion/workflows'),
        fetch('/api/automatizacion/tasks'),
        fetch('/api/automatizacion/notifications'),
        fetch('/api/automatizacion/logs'),
      ]);
      const [workflowsData, tasksData, notificationsData, logsData] = await Promise.all([
        workflowsRes.json(), tasksRes.json(), notificationsRes.json(), logsRes.json(),
      ]);
      setWorkflows(workflowsData.workflows || []);
      setTasks(tasksData.tasks || []);
      setNotifications(notificationsData.notifications || []);
      setLogs(logsData.logs || []);
      setLogResumen(logsData.resumen || { total24h: 0, exitosas24h: 0, errores24h: 0 });
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: "Error", description: "Error al cargar los datos de automatización", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogType(null);
    setWfForm({ nombre: '', descripcion: '', tipo: 'EVENTO', trigger: '' });
    setTaskForm({ nombre: '', descripcion: '', tipo: 'COBRANZA', frecuencia: 'DIARIA', horario: '02:00' });
    setNotifForm({ evento: '', titulo: '', mensaje: '', destinatarios: '', canales: 'EMAIL' });
  };

  const toggleWorkflow = async (id: string, activo: boolean) => {
    try {
      const res = await fetch(`/api/automatizacion/workflows/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo }),
      });
      if (res.ok) {
        setWorkflows(prev => prev.map(w => w.id === id ? { ...w, activo } : w));
        toast({ title: "Éxito", description: `Workflow ${activo ? 'activado' : 'desactivado'}` });
      } else throw new Error();
    } catch {
      toast({ title: "Error", description: "Error al actualizar el workflow", variant: "destructive" });
    }
  };

  const toggleTask = async (id: string, activo: boolean) => {
    try {
      const res = await fetch(`/api/automatizacion/tasks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo }),
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, activo } : t));
        toast({ title: "Éxito", description: `Tarea ${activo ? 'activada' : 'desactivada'}` });
      } else throw new Error();
    } catch {
      toast({ title: "Error", description: "Error al actualizar la tarea", variant: "destructive" });
    }
  };

  const toggleNotification = async (id: string, activo: boolean) => {
    try {
      const res = await fetch(`/api/automatizacion/notifications/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, activo } : n));
        toast({ title: "Éxito", description: `Notificación ${activo ? 'activada' : 'desactivada'}` });
      } else throw new Error();
    } catch {
      toast({ title: "Error", description: "Error al actualizar la notificación", variant: "destructive" });
    }
  };

  const deleteItem = async (tipo: 'workflows' | 'tasks', id: string) => {
    try {
      const res = await fetch(`/api/automatizacion/${tipo}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Eliminado", description: "Elemento eliminado correctamente" });
        loadData();
      } else throw new Error();
    } catch {
      toast({ title: "Error", description: "Error al eliminar", variant: "destructive" });
    }
  };

  const executeMaintenance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/automatizacion/maintenance', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: "Mantenimiento ejecutado", description: data.message || "Completado" });
        loadData();
      } else {
        toast({ title: "Error", description: data.error || "Error al ejecutar el mantenimiento", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error running maintenance:', error);
      toast({ title: "Error", description: "Error al ejecutar el mantenimiento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const submitWorkflow = async () => {
    if (!wfForm.nombre || !wfForm.trigger) {
      toast({ title: "Datos incompletos", description: "Nombre y trigger son obligatorios", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/automatizacion/workflows', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(wfForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear workflow');
      toast({ title: "Workflow creado", description: data.workflow?.nombre });
      closeDialog();
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const submitTask = async () => {
    if (!taskForm.nombre || !taskForm.horario) {
      toast({ title: "Datos incompletos", description: "Nombre y horario son obligatorios", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/automatizacion/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear tarea');
      toast({ title: "Tarea creada", description: data.task?.nombre });
      closeDialog();
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const submitNotification = async () => {
    if (!notifForm.evento || !notifForm.titulo || !notifForm.mensaje || !notifForm.destinatarios) {
      toast({ title: "Datos incompletos", description: "Completa todos los campos", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/automatizacion/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notifForm,
          destinatarios: notifForm.destinatarios.split(',').map(s => s.trim()).filter(Boolean),
          canales: [notifForm.canales],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear notificación');
      toast({ title: "Notificación creada", description: data.notification?.titulo });
      closeDialog();
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      'PROGRAMADA': 'default', 'EVENTO': 'secondary', 'CONDICIONAL': 'default',
      'COBRANZA': 'secondary', 'INVENTARIO': 'default', 'REPORTES': 'secondary', 'NOTIFICACION': 'default',
    };
    return <Badge variant={colors[tipo] || 'default'}>{tipo}</Badge>;
  };

  const getEstadoBadge = (activo: boolean, errores?: number) => {
    if (!activo) return <Badge variant="secondary">Inactivo</Badge>;
    if (errores && errores > 0) return <Badge variant="destructive">Con Errores</Badge>;
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
          <Button onClick={() => setDialogType('workflow')}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Workflow
          </Button>
        </div>
      </div>

      {/* Statistics */}
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
            <CardTitle className="text-sm font-medium">Ejecuciones (24h)</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logResumen.total24h}</div>
            <p className="text-xs text-muted-foreground">{logResumen.exitosas24h} exitosas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errores (24h)</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logResumen.errores24h}</div>
            <p className="text-xs text-muted-foreground">En las últimas 24 horas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="tareas">Tareas Programadas</TabsTrigger>
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          <TabsTrigger value="monitoreo">Monitoreo</TabsTrigger>
        </TabsList>

        {/* Workflows */}
        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reglas de Workflow</CardTitle>
              <CardDescription>Automatización de procesos basada en eventos y condiciones</CardDescription>
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
                    {workflows.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {loading ? 'Cargando...' : 'No hay workflows configurados'}
                      </td></tr>
                    )}
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
                            {workflow.errores > 0 && <p className="text-red-600">{workflow.errores} errores</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">{getEstadoBadge(workflow.activo, workflow.errores)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch checked={workflow.activo}
                              onCheckedChange={(checked) => toggleWorkflow(workflow.id, checked)} />
                            <Button variant="ghost" size="sm" title="Eliminar"
                              onClick={() => deleteItem('workflows', workflow.id)}>
                              <Trash2 className="h-4 w-4" />
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

        {/* Tareas */}
        <TabsContent value="tareas" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setDialogType('task')}>
              <Plus className="h-4 w-4 mr-2" /> Nueva Tarea
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Tareas Programadas</CardTitle>
              <CardDescription>Ejecución automática de procesos en horarios específicos</CardDescription>
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
                    {tasks.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {loading ? 'Cargando...' : 'No hay tareas programadas'}
                      </td></tr>
                    )}
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
                              <p className="text-muted-foreground">{new Date(task.proximaEjecucion).toLocaleTimeString()}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No programada</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{getEstadoBadge(task.activo)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch checked={task.activo}
                              onCheckedChange={(checked) => toggleTask(task.id, checked)} />
                            <Button variant="ghost" size="sm" title="Eliminar"
                              onClick={() => deleteItem('tasks', task.id)}>
                              <Trash2 className="h-4 w-4" />
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

        {/* Notificaciones */}
        <TabsContent value="notificaciones" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setDialogType('notification')}>
              <Plus className="h-4 w-4 mr-2" /> Nueva Notificación
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Reglas de Notificación</CardTitle>
              <CardDescription>Configuración de alertas automáticas por email, SMS y push</CardDescription>
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
                    {notifications.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {loading ? 'Cargando...' : 'No hay reglas de notificación'}
                      </td></tr>
                    )}
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
                              <Badge key={canal} variant="outline" className="text-xs">{canal}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-green-600 font-medium">{notification.enviadas}</td>
                        <td className="px-4 py-3">{getEstadoBadge(notification.activo)}</td>
                        <td className="px-4 py-3">
                          <Switch checked={notification.activo}
                            onCheckedChange={(checked) => toggleNotification(notification.id, checked)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoreo */}
        <TabsContent value="monitoreo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad de Automatización</CardTitle>
              <CardDescription>Últimas ejecuciones registradas del scheduler</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="mx-auto h-12 w-12 mb-3" />
                  <p>Sin ejecuciones registradas todavía.</p>
                  <p className="text-sm">Ejecuta "Mantenimiento" o configura el cron externo para ver actividad.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id}
                      className={`flex items-center gap-4 p-3 rounded-lg ${log.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                      {log.status === 'success'
                        ? <CheckCircle className="h-5 w-5 text-green-600" />
                        : <XCircle className="h-5 w-5 text-red-600" />}
                      <div className="flex-1">
                        <p className="font-medium">
                          {log.detalles?.nombre || log.detalles?.mensaje || log.accion}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.detalles?.mensaje && log.detalles?.nombre ? `${log.detalles.mensaje} · ` : ''}
                          {new Date(log.fecha).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">{log.accion}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Workflow */}
      <Dialog open={dialogType === 'workflow'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nuevo Workflow</DialogTitle>
            <DialogDescription>Define una regla de automatización basada en eventos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="wfNombre">Nombre *</Label>
              <Input id="wfNombre" value={wfForm.nombre} placeholder="Recordatorio de pago vencido"
                onChange={(e) => setWfForm({ ...wfForm, nombre: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wfDesc">Descripción</Label>
              <Textarea id="wfDesc" value={wfForm.descripcion}
                onChange={(e) => setWfForm({ ...wfForm, descripcion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={wfForm.tipo} onValueChange={(v) => setWfForm({ ...wfForm, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EVENTO">Evento</SelectItem>
                    <SelectItem value="PROGRAMADA">Programada</SelectItem>
                    <SelectItem value="CONDICIONAL">Condicional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wfTrigger">Trigger *</Label>
                <Input id="wfTrigger" value={wfForm.trigger} placeholder="pagare.vencido"
                  onChange={(e) => setWfForm({ ...wfForm, trigger: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={submitWorkflow} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Task */}
      <Dialog open={dialogType === 'task'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nueva Tarea Programada</DialogTitle>
            <DialogDescription>Las tareas se ejecutan cuando el cron externo llama a /api/cron/run.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tNombre">Nombre *</Label>
              <Input id="tNombre" value={taskForm.nombre} placeholder="Recalcular intereses moratorios"
                onChange={(e) => setTaskForm({ ...taskForm, nombre: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tDesc">Descripción</Label>
              <Textarea id="tDesc" value={taskForm.descripcion}
                onChange={(e) => setTaskForm({ ...taskForm, descripcion: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={taskForm.tipo} onValueChange={(v) => setTaskForm({ ...taskForm, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COBRANZA">Cobranza (intereses)</SelectItem>
                    <SelectItem value="INVENTARIO">Inventario (stock bajo)</SelectItem>
                    <SelectItem value="REPORTES">Reportes</SelectItem>
                    <SelectItem value="NOTIFICACION">Notificación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Frecuencia</Label>
                <Select value={taskForm.frecuencia} onValueChange={(v) => setTaskForm({ ...taskForm, frecuencia: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIARIA">Diaria</SelectItem>
                    <SelectItem value="SEMANAL">Semanal</SelectItem>
                    <SelectItem value="MENSUAL">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tHorario">Horario *</Label>
                <Input id="tHorario" type="time" value={taskForm.horario}
                  onChange={(e) => setTaskForm({ ...taskForm, horario: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={submitTask} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear Tarea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Notification */}
      <Dialog open={dialogType === 'notification'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nueva Regla de Notificación</DialogTitle>
            <DialogDescription>Define alertas automáticas por evento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nEvento">Evento *</Label>
                <Input id="nEvento" value={notifForm.evento} placeholder="pagare.vencido"
                  onChange={(e) => setNotifForm({ ...notifForm, evento: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Canal</Label>
                <Select value={notifForm.canales} onValueChange={(v) => setNotifForm({ ...notifForm, canales: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="PUSH">Push</SelectItem>
                    <SelectItem value="SISTEMA">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nTitulo">Título *</Label>
              <Input id="nTitulo" value={notifForm.titulo} placeholder="Pago Vencido"
                onChange={(e) => setNotifForm({ ...notifForm, titulo: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nMensaje">Mensaje *</Label>
              <Textarea id="nMensaje" value={notifForm.mensaje} placeholder="Su pago está vencido..."
                onChange={(e) => setNotifForm({ ...notifForm, mensaje: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nDest">Destinatarios * (separados por coma)</Label>
              <Input id="nDest" value={notifForm.destinatarios} placeholder="{cliente.email}, {cliente.telefono}"
                onChange={(e) => setNotifForm({ ...notifForm, destinatarios: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={submitNotification} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear Notificación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
