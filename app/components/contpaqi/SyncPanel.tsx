import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Server, Users, Box, HardDrive, ShieldAlert, CheckCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SyncLogItem {
  id: string;
  tipo: string;
  accion: string;
  entidadId: string;
  contpaqiRef?: string | null;
  status: string;
  error?: string | null;
  createdAt: string;
}

export default function SyncPanel() {
  const [healthStatus, setHealthStatus] = useState<{
    loading: boolean;
    conectado: boolean;
    mensaje: string;
    empresa?: string;
  }>({ loading: true, conectado: false, mensaje: 'Verificando...' });

  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [syncStates, setSyncStates] = useState({
    clientes: false,
    productos: false,
    agentes: false,
  });

  const checkHealth = async () => {
    setHealthStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/contpaqi/health');
      const data = await res.json();
      if (res.ok && data.success) {
        setHealthStatus({
          loading: false,
          conectado: data.data.conectado,
          mensaje: data.data.mensaje,
          empresa: data.data.empresa,
        });
      } else {
        setHealthStatus({
          loading: false,
          conectado: false,
          mensaje: data.error || 'Error de conexión',
        });
      }
    } catch (err: any) {
      setHealthStatus({
        loading: false,
        conectado: false,
        mensaje: err.message || 'Servidor inalcanzable',
      });
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/contpaqi/sync/logs');
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Error fetching sync logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchLogs();
  }, []);

  const triggerSync = async (type: 'clientes' | 'productos' | 'agentes') => {
    setSyncStates(prev => ({ ...prev, [type]: true }));
    toast.info(`Iniciando sincronización de ${type}...`);
    
    try {
      let endpoint = '';
      let body = {};
      
      if (type === 'clientes') {
        endpoint = '/api/contpaqi/sync/clientes';
        body = { accion: 'pull' };
      } else if (type === 'productos') {
        endpoint = '/api/contpaqi/sync/productos';
        body = { accion: 'pull' };
      } else {
        endpoint = '/api/contpaqi/sync/agentes';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || `Sincronización de ${type} finalizada`);
      } else {
        throw new Error(data.error || 'Error en la sincronización');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al sincronizar ${type}: ${err.message}`);
    } finally {
      setSyncStates(prev => ({ ...prev, [type]: false }));
      fetchLogs(); // refrescar historial
    }
  };

  return (
    <div className="space-y-6">
      {/* Sección Estado de Conexión */}
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-slate-500" />
              Servidor CONTPAQi Comercial Premium
            </CardTitle>
            <CardDescription>
              Comprueba el estado de comunicación con la API SDK del ERP.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={checkHealth} disabled={healthStatus.loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${healthStatus.loading ? 'animate-spin' : ''}`} />
            Recomprobar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className={`w-3.5 h-3.5 rounded-full ${healthStatus.conectado ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {healthStatus.conectado ? 'Conectado y Operando' : 'Desconectado / Error'}
              </p>
              <p className="text-xs text-muted-foreground">
                {healthStatus.mensaje} {healthStatus.empresa && `| Empresa activa: ${healthStatus.empresa}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones de Sincronización Manual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="text-md font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Sincronizar Clientes
            </CardTitle>
            <CardDescription className="text-xs">
              Importa clientes registrados en CONTPAQi Comercial Premium.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={syncStates.clientes || !healthStatus.conectado}
              onClick={() => triggerSync('clientes')}
            >
              {syncStates.clientes ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                'Importar Clientes'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-emerald-500">
          <CardHeader>
            <CardTitle className="text-md font-semibold flex items-center gap-2">
              <Box className="w-4 h-4 text-emerald-500" />
              Sincronizar Productos
            </CardTitle>
            <CardDescription className="text-xs">
              Actualiza precios y códigos SAT desde CONTPAQi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={syncStates.productos || !healthStatus.conectado}
              onClick={() => triggerSync('productos')}
            >
              {syncStates.productos ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                'Importar Productos'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-purple-500">
          <CardHeader>
            <CardTitle className="text-md font-semibold flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-500" />
              Agentes y Almacenes
            </CardTitle>
            <CardDescription className="text-xs">
              Sincroniza agentes de venta/cobranza y almacenes activos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={syncStates.agentes || !healthStatus.conectado}
              onClick={() => triggerSync('agentes')}
            >
              {syncStates.agentes ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                'Importar Catálogos'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Sincronización */}
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-bold">Bitácora de Sincronizaciones Recientes</CardTitle>
            <CardDescription>Visualiza el estado de las últimas tareas de sincronización.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={logsLoading}>
            <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {logsLoading && logs.length === 0 ? (
            <div className="flex justify-center py-8">
              <LoaderIcon className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No hay registros de sincronización disponibles.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Operación</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estatus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('es-MX')}
                    </TableCell>
                    <TableCell className="capitalize text-xs font-semibold">{log.tipo}</TableCell>
                    <TableCell className="uppercase text-xs font-mono">{log.accion}</TableCell>
                    <TableCell className="text-xs font-mono">{log.contpaqiRef || '-'}</TableCell>
                    <TableCell>
                      {log.status === 'success' && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Éxito
                        </span>
                      )}
                      {log.status === 'error' && (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium cursor-help"
                          title={log.error || 'Error desconocido'}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Error
                        </span>
                      )}
                      {log.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                          <HelpCircle className="w-3.5 h-3.5 animate-pulse" /> Pendiente
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
