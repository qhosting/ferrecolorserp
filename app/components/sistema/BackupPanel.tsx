'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  HardDrive, 
  Clock, 
  Calendar, 
  Plus, 
  Download, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BackupFile {
  id: string;
  nombre: string;
  tipo: 'MANUAL' | 'AUTOMATICO' | 'PROGRAMADO';
  fecha: string;
  tamaño: string;
  tamañoBytes: number;
  duracion: number;
  estado: 'COMPLETADO' | 'EN_PROCESO' | 'FALLIDO';
  archivoRuta: string;
  incluye: {
    baseDatos: boolean;
    archivos: boolean;
    configuracion: boolean;
  };
  compresion: boolean;
  hash: string | null;
  usuario: string;
  observaciones: string;
}

interface BackupStats {
  total: number;
  completados: number;
  fallidos: number;
  ultimoBackup: string | null;
  espacioUsado: number;
  promedioTamaño: number;
  promedioDuracion: number;
}

interface BackupPanelProps {
  userRole: string;
}

export function BackupPanel({ userRole }: BackupPanelProps) {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  
  // Form state
  const [observaciones, setObservaciones] = useState('');
  const [incluirArchivos, setIncluirArchivos] = useState(false);
  const [incluirConfiguracion, setIncluirConfiguracion] = useState(true);

  const { toast } = useToast();

  const cargarDatos = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const res = await fetch('/api/sistema/backup');
      if (!res.ok) throw new Error('Error al cargar historial de backups');
      const data = await res.json();
      setBackups(data.backups || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast({
        title: 'Error',
        description: 'No se pudo obtener el historial de copias de seguridad',
        variant: 'destructive',
      });
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [toast]);

  // Polling para refrescar la UI si hay backups en proceso
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    const algunEnProceso = backups.some(b => b.estado === 'EN_PROCESO');
    if (!algunEnProceso) return;

    const interval = setInterval(() => {
      cargarDatos(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [backups, cargarDatos]);

  const iniciarBackup = async () => {
    try {
      setGenerando(true);
      const res = await fetch('/api/sistema/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'MANUAL',
          incluirArchivos,
          incluirConfiguracion,
          observaciones,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al iniciar copia de seguridad');
      }

      toast({
        title: 'Respaldando...',
        description: 'La copia de seguridad se ha iniciado en segundo plano',
      });
      
      setObservaciones('');
      setIsDialogOpen(false);
      cargarDatos();
    } catch (error) {
      console.error('Error starting backup:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'No se pudo generar la copia de seguridad',
        variant: 'destructive',
      });
    } finally {
      setGenerando(false);
    }
  };

  const descargarBackup = (backup: BackupFile) => {
    toast({
      title: 'Descargando',
      description: `Iniciando descarga de ${backup.nombre}.sql.gz`,
    });
    window.open(backup.archivoRuta, '_blank');
  };

  const eliminarBackup = async () => {
    if (!selectedBackup) return;
    try {
      const res = await fetch(`/api/sistema/backup?id=${encodeURIComponent(selectedBackup.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar copia de seguridad');
      }

      toast({
        title: 'Eliminado',
        description: 'La copia de seguridad ha sido eliminada permanentemente',
      });

      setIsDeleteOpen(false);
      setSelectedBackup(null);
      cargarDatos();
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'No se pudo eliminar la copia de seguridad',
        variant: 'destructive',
      });
    }
  };

  const formatearTamaño = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const esSuperAdmin = userRole === 'SUPERADMIN';

  return (
    <div className="space-y-6">
      {/* Resumen de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Copias</p>
                <p className="text-2xl font-bold text-slate-100">{stats?.total || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-emerald-500 font-semibold">{stats?.completados || 0}</span> completados
              {stats?.fallidos ? (
                <>
                  <span>•</span>
                  <span className="text-rose-500 font-semibold">{stats.fallidos}</span> fallidos
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Espacio Usado</p>
                <p className="text-2xl font-bold text-slate-100">
                  {stats ? formatearTamaño(stats.espacioUsado) : '0 Bytes'}
                </p>
              </div>
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">
              Promedio: {stats ? formatearTamaño(stats.promedioTamaño) : '0 Bytes'} por copia
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Duración Promedio</p>
                <p className="text-2xl font-bold text-slate-100">
                  {stats?.promedioDuracion ? `${stats.promedioDuracion} s` : '0 s'}
                </p>
              </div>
              <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">
              Compresión gzip activa (ahorro ~85% espacio)
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Último Respaldo</p>
                <p className="text-sm font-semibold text-slate-100 truncate mt-1.5">
                  {stats?.ultimoBackup 
                    ? format(new Date(stats.ultimoBackup), "dd/MM/yyyy HH:mm")
                    : 'Ninguno'}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400 truncate">
              {stats?.ultimoBackup 
                ? format(new Date(stats.ultimoBackup), "eeee, d 'de' MMMM", { locale: es }) 
                : 'Sin copias registradas'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel del Historial y Botón de Creación */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/60 pb-5">
          <div>
            <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              Historial de Copias de Seguridad
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-1">
              Descargue o elimine respaldos del sistema. Las copias de seguridad manuales se ejecutan asíncronamente en segundo plano.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => cargarDatos(true)}
              className="border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              title="Refrescar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-md shadow-indigo-600/15">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Respaldo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Generar Nueva Copia de Seguridad</DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs">
                    El proceso creará una captura en frío de la base de datos PostgreSQL utilizando pg_dump y la empaquetará en gzip.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="observaciones" className="text-slate-300">Observaciones / Descripción</Label>
                    <Textarea 
                      id="observaciones"
                      placeholder="Ej. Respaldo previo a actualización de catálogo de productos"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-300 font-medium">Opciones adicionales</Label>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800/40">
                      <div className="space-y-0.5">
                        <Label htmlFor="inc-config" className="text-sm font-medium text-slate-200">Guardar Configuración</Label>
                        <p className="text-[11px] text-slate-500">Incluir metadatos de configuración de automatizaciones.</p>
                      </div>
                      <Switch 
                        id="inc-config"
                        checked={incluirConfiguracion}
                        onCheckedChange={setIncluirConfiguracion}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800/40">
                      <div className="space-y-0.5">
                        <Label htmlFor="inc-files" className="text-sm font-medium text-slate-200">Guardar Archivos Subidos</Label>
                        <p className="text-[11px] text-slate-500">Incluir PDFs y XMLs físicos de timbrado (Aumenta peso).</p>
                      </div>
                      <Switch 
                        id="inc-files"
                        checked={incluirArchivos}
                        onCheckedChange={setIncluirArchivos}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="border-t border-slate-800/60 pt-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsDialogOpen(false)}
                    className="hover:bg-slate-900 text-slate-300"
                    disabled={generando}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={iniciarBackup}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                    disabled={generando}
                  >
                    {generando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Ejecutando...
                      </>
                    ) : (
                      'Iniciar Respaldo'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400 text-sm">Cargando copias de seguridad...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Database className="w-12 h-12 text-slate-700 mb-4" />
              <p className="text-slate-400 font-medium">No se encontraron copias de seguridad</p>
              <p className="text-slate-600 text-xs mt-1">Haga clic en "Crear Respaldo" para generar la primera copia de seguridad.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-slate-800/80 bg-slate-950/20">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Nombre / Archivo</TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Fecha</TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Tamaño</TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Duración</TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Estado</TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Detalles</TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id} className="border-slate-800 hover:bg-slate-900/30 transition-colors">
                      <TableCell className="font-mono text-xs text-slate-200 font-semibold max-w-[240px] truncate">
                        {backup.nombre}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {format(new Date(backup.fecha), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {backup.estado === 'EN_PROCESO' ? (
                          <span className="text-slate-500 italic">Procesando...</span>
                        ) : (
                          backup.tamaño
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {backup.estado === 'EN_PROCESO' ? (
                          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        ) : backup.estado === 'FALLIDO' ? (
                          'N/A'
                        ) : (
                          `${backup.duracion}s`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            backup.estado === 'COMPLETADO' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : backup.estado === 'EN_PROCESO'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }
                          variant="secondary"
                        >
                          {backup.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] text-xs text-slate-400 font-light truncate" title={backup.observaciones}>
                        {backup.observaciones}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => descargarBackup(backup)}
                            disabled={backup.estado !== 'COMPLETADO'}
                            className="h-8 w-8 text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                            title="Descargar archivo gzip"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setSelectedBackup(backup);
                              setIsDeleteOpen(true);
                            }}
                            disabled={!esSuperAdmin || backup.estado === 'EN_PROCESO'}
                            className={`h-8 w-8 ${
                              esSuperAdmin 
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' 
                                : 'text-slate-600 cursor-not-allowed opacity-40'
                            }`}
                            title={esSuperAdmin ? "Eliminar copia permanentemente" : "Se requieren permisos de SUPERADMIN"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              ¿Eliminar copia de seguridad?
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              ¿Está seguro de que desea eliminar permanentemente la copia de seguridad <span className="font-mono text-slate-200">{selectedBackup?.id}</span>? Esta acción no se puede deshacer y el archivo se borrará físicamente del disco del servidor.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="border-t border-slate-800/60 pt-4 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedBackup(null);
              }}
              className="hover:bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button 
              onClick={eliminarBackup}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium"
            >
              Confirmar Eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
