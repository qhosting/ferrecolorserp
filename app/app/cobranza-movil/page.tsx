'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOfflineStorage, offlineStorage } from '@/lib/offline-storage';
import { ticketPrinter } from '@/lib/ticket-printer';
import { ClientSearchCard } from '@/components/cobranza-movil/client-search-card';
import { PaymentFormCard } from '@/components/cobranza-movil/payment-form-card';
import { OfflineIndicator } from '@/components/cobranza-movil/offline-indicator';
import { RecentPayments } from '@/components/cobranza-movil/recent-payments';
import { DailySummary } from '@/components/cobranza-movil/daily-summary';
import { 
  Smartphone, 
  Download, 
  RefreshCw, 
  MapPin, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  AlertCircle, 
  Navigation, 
  Clock, 
  CreditCard,
  History,
  Calendar,
  Send,
  Loader2,
  ListOrdered
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function CobranzaMovilPage() {
  const { data: session } = useSession() || {};
  const { isInitialized, isOnline } = useOfflineStorage();
  
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  
  const [syncStatus, setSyncStatus] = useState({
    pendingPayments: 0,
    lastSync: null as Date | null,
    syncing: false
  });
  
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  const [clients, setClients] = useState<any[]>([]);
  const [selectedCheckInClient, setSelectedCheckInClient] = useState<string>('');
  const [locationHistory, setLocationHistory] = useState<any[]>([]);

  useEffect(() => {
    requestLocationPermission();
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  useEffect(() => {
    if (isInitialized) {
      loadSyncStatus();
      loadClientsList();
      loadLocationHistory();
    }
  }, [isInitialized, isOnline]);

  const loadSyncStatus = async () => {
    try {
      const pending = await offlineStorage.getPendingSync();
      const lastSyncStr = await offlineStorage.getConfig('lastSync');
      setSyncStatus({
        pendingPayments: pending.length,
        lastSync: lastSyncStr ? new Date(lastSyncStr) : null,
        syncing: false
      });
    } catch (error) {
      console.error('Error cargando estado de sincronización:', error);
    }
  };

  const loadClientsList = async () => {
    try {
      const offlineClients = await offlineStorage.getClientes();
      setClients(offlineClients);
    } catch (error) {
      console.error('Error cargando lista de clientes:', error);
    }
  };

  const loadLocationHistory = async () => {
    try {
      const history = await offlineStorage.getConfig('locationHistory');
      setLocationHistory(history || []);
    } catch (error) {
      console.error('Error cargando historial de ubicaciones:', error);
    }
  };

  const requestLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          toast.warning('No se pudo obtener la ubicación GPS.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  };

  const toggleTracking = () => {
    if (trackingActive) {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setTrackingActive(false);
      toast.info('Seguimiento de ruta desactivado');
    } else {
      if (!navigator.geolocation) {
        toast.error('Geolocalización no soportada por su dispositivo');
        return;
      }
      
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          logRouteCheckpoint(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Error en seguimiento GPS:', error);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
      
      setWatchId(id);
      setTrackingActive(true);
      toast.success('Seguimiento de ruta GPS activado');
    }
  };

  const logRouteCheckpoint = async (lat: number, lng: number) => {
    try {
      const currentHistory = await offlineStorage.getConfig('locationHistory') || [];
      
      // Filtro de distancia de 15 metros para evitar registrar ruido cuando el dispositivo está estacionario
      if (currentHistory.length > 0) {
        const lastCheckpoint = currentHistory[0];
        const distance = getHaversineDistance(lat, lng, lastCheckpoint.lat, lastCheckpoint.lng);
        if (distance < 15) {
          return; // Ignorar el punto si el movimiento es inferior al umbral de 15 metros
        }
      }

      const newCheckpoint = {
        lat,
        lng,
        timestamp: new Date().toISOString(),
        label: 'Punto de Ruta Automático'
      };
      const updatedHistory = [newCheckpoint, ...currentHistory].slice(0, 50);
      await offlineStorage.saveConfig('locationHistory', updatedHistory);
      setLocationHistory(updatedHistory);
    } catch (error) {
      console.error('Error al guardar checkpoint de ruta:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalización no soportada en este dispositivo');
      return;
    }

    toast.info('Obteniendo ubicación precisa para Check-in...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const clientName = selectedCheckInClient || 'Punto de control';
        const newCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
          label: `Check-in: ${clientName}`
        };

        try {
          const currentHistory = await offlineStorage.getConfig('locationHistory') || [];
          const updatedHistory = [newCoords, ...currentHistory].slice(0, 50);
          await offlineStorage.saveConfig('locationHistory', updatedHistory);
          setLocationHistory(updatedHistory);
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          toast.success(`Check-in registrado exitosamente en ${clientName}`);
          setSelectedCheckInClient('');
        } catch (error) {
          console.error('Error guardando check-in:', error);
          toast.error('Error al registrar check-in local');
        }
      },
      (error) => {
        console.error('Error obteniendo GPS para check-in:', error);
        toast.error('Error de señal GPS para check-in');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleDownloadClients = async () => {
    if (!isOnline) {
      toast.error('Requiere conexión a Internet para descargar rutas');
      return;
    }

    setDownloading(true);
    setSyncProgress(10);
    try {
      const gestorId = session?.user?.id;
      const url = gestorId ? `/api/clientes?gestorId=${gestorId}&sync=true` : `/api/clientes?sync=true`;
      
      setSyncProgress(40);
      const response = await fetch(url);
      if (response.ok) {
        setSyncProgress(70);
        const fetchedClients = await response.json();
        await offlineStorage.saveClientes(fetchedClients);
        await offlineStorage.saveConfig('lastSync', new Date().toISOString());
        
        setClients(fetchedClients);
        await loadSyncStatus();
        setSyncProgress(100);
        toast.success(`Rutas descargadas: ${fetchedClients.length} clientes listos para cobranza offline`);
      } else {
        toast.error('Error en el servidor al sincronizar clientes');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión al descargar rutas');
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setSyncProgress(0);
      }, 500);
    }
  };

  const handleUploadPayments = async () => {
    if (!isOnline) {
      toast.error('Requiere conexión a Internet para subir cobros');
      return;
    }

    setUploading(true);
    try {
      const pendingItems = await offlineStorage.getPendingSync();
      if (pendingItems.length === 0) {
        toast.success('No hay cobros pendientes por subir');
        setUploading(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        setSyncProgress(Math.round(((i + 1) / pendingItems.length) * 100));

        try {
          if (item.type === 'pago') {
            const response = await fetch('/api/pagos', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(item.data),
            });

            if (response.ok) {
              successCount++;
              await offlineStorage.removeSyncItem(item.id);
            } else {
              errorCount++;
            }
          }
        } catch (error) {
          errorCount++;
        }
      }

      await loadSyncStatus();
      if (errorCount === 0) {
        toast.success(`Se subieron exitosamente ${successCount} cobros al servidor central`);
      } else {
        toast.warning(`Sincronización parcial: ${successCount} subidos, ${errorCount} fallidos`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error durante la carga de datos');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setSyncProgress(0);
      }, 500);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Nunca';
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Hace un momento';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)} hr`;
    return date.toLocaleDateString('es-MX');
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-12 w-12 text-indigo-600 mx-auto" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Cargando base de datos local...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] dark:from-[#070913] dark:via-[#090d22] dark:to-[#04050b] text-slate-900 dark:text-slate-100 relative overflow-hidden">
      {/* Elementos decorativos de iluminación ambiental */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#2da53e]/5 dark:bg-[#2da53e]/10 blur-[150px] pointer-events-none" />

      <Header 
        title="Cobranza Móvil en Campo"
        description="Consola de cobranza optimizada para dispositivos móviles con funcionamiento offline."
      />
      
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6 relative z-10">
        
        {/* Status Bar Section */}
        <div className="flex flex-wrap items-center justify-between gap-4 glass-card border border-white/20 dark:border-slate-800/40 p-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <OfflineIndicator isOnline={isOnline} />
            
            <Badge variant={location ? "default" : "secondary"} className="flex items-center gap-1 font-semibold shadow-sm">
              <MapPin className="h-3 w-3 text-[#009bdf]" />
              {location ? `GPS Activo (${location.accuracy ? Math.round(location.accuracy) : 0}m)` : 'Buscando GPS...'}
            </Badge>

            {syncStatus.pendingPayments > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1 animate-pulse shadow-sm">
                <AlertCircle className="h-3 w-3" />
                {syncStatus.pendingPayments} Pago(s) Offline
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Clock className="h-3 w-3 text-[#009bdf]" />
            <span>Última Sincronización: <strong className="text-slate-800 dark:text-slate-200">{formatLastSync(syncStatus.lastSync)}</strong></span>
          </div>
        </div>

        {/* Tab-driven layout for mobile navigation */}
        <Tabs defaultValue="cobrar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-200/50 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shadow-md">
            <TabsTrigger 
              value="cobrar" 
              className="rounded-xl py-3 font-semibold transition-all text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#009bdf] data-[state=active]:to-[#002d72] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <CreditCard className="mr-2 h-4 w-4 hidden sm:inline-block animate-pulse" />
              Registrar
            </TabsTrigger>
            <TabsTrigger 
              value="sync" 
              className="rounded-xl py-3 font-semibold transition-all text-xs sm:text-sm relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2da53e] data-[state=active]:to-[#1e6f2c] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <RefreshCw className="mr-2 h-4 w-4 hidden sm:inline-block" />
              Sincronizar
              {syncStatus.pendingPayments > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="gps" 
              className="rounded-xl py-3 font-semibold transition-all text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#009bdf] data-[state=active]:to-[#2da53e] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <MapPin className="mr-2 h-4 w-4 hidden sm:inline-block" />
              Visitas
            </TabsTrigger>
            <TabsTrigger 
              value="historial" 
              className="rounded-xl py-3 font-semibold transition-all text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#002d72] data-[state=active]:to-[#009bdf] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <History className="mr-2 h-4 w-4 hidden sm:inline-block" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: COBROS */}
          <TabsContent value="cobrar" className="space-y-6 outline-none">
            <div className="grid gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ClientSearchCard 
                  selectedClient={selectedClient}
                  onClientSelect={setSelectedClient}
                  isOnline={isOnline}
                />
              </motion.div>

              <AnimatePresence mode="wait">
                {selectedClient ? (
                  <motion.div
                    key={selectedClient.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PaymentFormCard
                      client={selectedClient}
                      location={location}
                      onPaymentSuccess={() => {
                        setSelectedClient(null);
                        loadSyncStatus();
                        loadClientsList();
                      }}
                      onCancel={() => setSelectedClient(null)}
                      isOnline={isOnline}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-10 bg-white/30 dark:bg-slate-900/10 min-h-[300px] backdrop-blur-sm shadow-inner"
                  >
                    <Smartphone className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-4 stroke-1 animate-pulse" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Registrar Nuevo Cobro</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 max-w-sm">
                      Busque y seleccione un cliente en el panel de la izquierda para ingresar un nuevo cobro en campo.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* TAB 2: SINCRONIZACION */}
          <TabsContent value="sync" className="space-y-6 outline-none">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Card de Rutas y Clientes */}
              <Card className="glass-card hover-glow">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Download className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Rutas y Clientes Offline
                  </CardTitle>
                  <CardDescription>
                    Descargue y actualice los clientes asignados para operar de forma 100% offline.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold">Clientes Almacenados</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total en este dispositivo</p>
                    </div>
                    <Badge variant="outline" className="text-lg py-1 px-3 bg-slate-100 dark:bg-slate-900">
                      {clients.length}
                    </Badge>
                  </div>
                  
                  {downloading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Descargando base de datos de clientes...</span>
                        <span>{syncProgress}%</span>
                      </div>
                      <Progress value={syncProgress} className="h-2" />
                    </div>
                  )}

                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-colors"
                    onClick={handleDownloadClients}
                    disabled={downloading || !isOnline}
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Actualizar Ruta Clientes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Card de Pagos Pendientes */}
              <Card className="glass-card hover-glow">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <RefreshCw className="mr-2 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Sincronización de Pagos
                  </CardTitle>
                  <CardDescription>
                    Suba los cobros capturados localmente en campo al servidor central.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold">Cobros Pendientes</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Capturados sin conexión</p>
                    </div>
                    <Badge variant={syncStatus.pendingPayments > 0 ? "destructive" : "default"} className="text-lg py-1 px-3">
                      {syncStatus.pendingPayments}
                    </Badge>
                  </div>

                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Subiendo pagos registrados...</span>
                        <span>{syncProgress}%</span>
                      </div>
                      <Progress value={syncProgress} className="h-2" />
                    </div>
                  )}

                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md transition-colors"
                    onClick={handleUploadPayments}
                    disabled={uploading || !isOnline || syncStatus.pendingPayments === 0}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo datos...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Subir Datos Centrales ({syncStatus.pendingPayments})
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: VISITAS / GPS */}
          <TabsContent value="gps" className="space-y-6 outline-none">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Panel de Geolocalización Activo */}
              <Card className="glass-card md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Navigation className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    GPS Tracking
                  </CardTitle>
                  <CardDescription>
                    Monitoreo y registro de coordenadas en campo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {location ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 border-b">
                        <span className="text-slate-500">Latitud:</span>
                        <span className="font-mono font-semibold">{location.lat.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between p-2 border-b">
                        <span className="text-slate-500">Longitud:</span>
                        <span className="font-mono font-semibold">{location.lng.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between p-2">
                        <span className="text-slate-500">Precisión GPS:</span>
                        <span className="font-semibold text-emerald-600">
                          ±{location.accuracy ? Math.round(location.accuracy) : 0} metros
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400">
                      <p>Esperando señal GPS precisa...</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button 
                      className={`w-full font-medium ${trackingActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white transition-colors`}
                      onClick={toggleTracking}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {trackingActive ? 'Desactivar Rastreo de Ruta' : 'Activar Seguimiento GPS'}
                    </Button>
                    <p className="text-[10px] text-slate-400 text-center">
                      * El rastreo continuo registra puntos de ruta automáticamente cada 15 metros.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Registro de Check-in Manual */}
              <Card className="glass-card md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Registrar Check-in de Visita
                  </CardTitle>
                  <CardDescription>
                    Guarde un marcador de visita con coordenadas exactas en la ubicación actual del cliente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Seleccionar Cliente para Visita:</label>
                    <select
                      className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={selectedCheckInClient}
                      onChange={(e) => setSelectedCheckInClient(e.target.value)}
                    >
                      <option value="">-- Marcador General de Ruta (Sin Cliente) --</option>
                      {clients.map((cli) => (
                        <option key={cli.id} value={cli.nombre}>
                          {cli.codigoCliente} - {cli.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    onClick={handleCheckIn}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Registrar Check-in de Visita
                  </Button>

                  <div className="border-t pt-4">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                      Últimas ubicaciones registradas
                    </p>
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {locationHistory.length > 0 ? (
                        locationHistory.map((hist, idx) => (
                          <div 
                            key={idx} 
                            className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                              <span className="font-medium truncate max-w-[180px]">{hist.label}</span>
                            </div>
                            <div className="text-right text-slate-500">
                              <p className="font-mono">{hist.lat.toFixed(5)}, {hist.lng.toFixed(5)}</p>
                              <p className="text-[10px]">{new Date(hist.timestamp).toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-slate-400 py-4">No hay check-ins registrados hoy.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: HISTORIAL DE PAGOS */}
          <TabsContent value="historial" className="space-y-6 outline-none">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Daily Summary statistics */}
              <div className="md:col-span-1">
                <DailySummary 
                  gestorId={session?.user?.id}
                  isOnline={isOnline}
                />
              </div>

              {/* Recent payments table */}
              <div className="md:col-span-2">
                <RecentPayments 
                  gestorId={session?.user?.id}
                  isOnline={isOnline}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
