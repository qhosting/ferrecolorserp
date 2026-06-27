'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/navigation/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  User, 
  KeyRound, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Loader2, 
  Save, 
  Lock,
  Bell,
  Palette
} from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN:  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  ADMIN:       'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  VENTAS:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  COBRANZA:    'bg-amber-500/20 text-amber-300 border-amber-500/30',
  CAJERO:      'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  GESTOR:      'bg-rose-500/20 text-rose-300 border-rose-500/30',
  USUARIO:     'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

function PerfilContent() {
  const { data: session, update: updateSession } = useSession() || {};
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'perfil';

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoPass, setCambiandoPass] = useState(false);
  
  const [profileData, setProfileData] = useState({
    id: '',
    name: '',
    email: '',
    role: '',
    firstName: '',
    lastName: '',
    createdAt: ''
  });

  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // State for user notifications preferences
  const [notifPrefs, setNotifPrefs] = useState({
    newOrders: true,
    dailySummary: false,
    lowStock: true
  });

  // State for user personalization preferences
  const [personalData, setPersonalData] = useState({
    theme: 'dark',
    posMode: 'MOSTRADOR',
    landingView: '/dashboard'
  });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      } else {
        toast.error('Error al cargar la información del usuario');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load preferences from localStorage on mount
  useEffect(() => {
    fetchProfile();

    if (typeof window !== 'undefined') {
      const savedNotif = localStorage.getItem('user_notif_prefs');
      if (savedNotif) {
        try {
          setNotifPrefs(JSON.parse(savedNotif));
        } catch (e) {
          console.error(e);
        }
      }

      const savedPersonal = localStorage.getItem('user_personal_prefs');
      if (savedPersonal) {
        try {
          setPersonalData(JSON.parse(savedPersonal));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [fetchProfile]);

  const handleNotifChange = (key: string, val: boolean) => {
    setNotifPrefs(prev => ({ ...prev, [key]: val }));
  };

  const handlePersonalChange = (key: string, val: string) => {
    setPersonalData(prev => ({ ...prev, [key]: val }));
  };

  const saveNotifPrefs = () => {
    localStorage.setItem('user_notif_prefs', JSON.stringify(notifPrefs));
    toast.success('Preferencias de notificación guardadas');
  };

  const savePersonalPrefs = () => {
    localStorage.setItem('user_personal_prefs', JSON.stringify(personalData));
    toast.success('Personalización del sistema guardada');
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.firstName || !profileData.lastName) {
      toast.error('Nombre y Apellido son requeridos');
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          name: `${profileData.firstName} ${profileData.lastName}`.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Perfil actualizado correctamente');
        if (updateSession) {
          await updateSession({
            ...session,
            user: {
              ...session?.user,
              name: data.user.name
            }
          });
        }
        fetchProfile();
      } else {
        toast.error(data.error || 'Error al actualizar perfil');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error en el servidor');
    } finally {
      setGuardando(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passData.currentPassword || !passData.newPassword || !passData.confirmPassword) {
      toast.error('Complete todos los campos de contraseña');
      return;
    }

    if (passData.newPassword !== passData.confirmPassword) {
      toast.error('La nueva contraseña y la confirmación no coinciden');
      return;
    }

    if (passData.newPassword.length < 6) {
      toast.error('La contraseña nueva debe tener al menos 6 caracteres');
      return;
    }

    setCambiandoPass(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          currentPassword: passData.currentPassword,
          newPassword: passData.newPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Contraseña actualizada con éxito');
        setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Contraseña actual incorrecta');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar contraseña');
    } finally {
      setCambiandoPass(false);
    }
  };

  const initials = `${profileData.firstName?.[0] || ''}${profileData.lastName?.[0] || ''}`.toUpperCase() || 'U';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Cargando información del perfil...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Columna Izquierda: Tarjeta de Perfil Visual */}
      <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-md shadow-2xl flex flex-col items-center p-6 text-center h-fit">
        <Avatar className="h-24 w-24 border-2 border-indigo-500/30 shadow-xl mb-4">
          <AvatarFallback className="text-3xl font-black bg-gradient-to-br from-indigo-600 to-violet-600 text-white animate-pulse-subtle">
            {initials || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <h2 className="text-xl font-bold text-white leading-snug">{profileData.name || 'Usuario'}</h2>
        <p className="text-sm text-slate-400 mb-4">{profileData.email}</p>
        
        <Badge className={`px-3 py-1 text-xs font-black uppercase tracking-wider border rounded-full ${ROLE_COLORS[profileData.role] || ROLE_COLORS.USUARIO}`}>
          {profileData.role}
        </Badge>
        
        <Separator className="bg-slate-800/80 w-full my-5" />
        
        <div className="w-full space-y-3.5 text-left">
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">{profileData.email}</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Miembro desde:{' '}
              {profileData.createdAt 
                ? format(new Date(profileData.createdAt), "dd/MM/yyyy") 
                : 'Reciente'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cuenta Activa</span>
          </div>
        </div>
      </Card>

      {/* Columna Derecha: Tabs con los Formularios */}
      <div className="md:col-span-2 space-y-6">
        <Tabs 
          value={activeTab} 
          onValueChange={(val) => router.push(`/perfil?tab=${val}`)}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl">
            <TabsTrigger value="perfil" className="flex items-center justify-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-indigo-600/20 data-[state=active]:text-indigo-400 text-slate-400 transition-all duration-200">
              <User className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-semibold">Mi Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="flex items-center justify-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-indigo-600/20 data-[state=active]:text-indigo-400 text-slate-400 transition-all duration-200">
              <KeyRound className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-semibold">Seguridad</span>
            </TabsTrigger>
            <TabsTrigger value="notificaciones" className="flex items-center justify-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-indigo-600/20 data-[state=active]:text-indigo-400 text-slate-400 transition-all duration-200">
              <Bell className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-semibold">Avisos</span>
            </TabsTrigger>
            <TabsTrigger value="personalizacion" className="flex items-center justify-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-indigo-600/20 data-[state=active]:text-indigo-400 text-slate-400 transition-all duration-200">
              <Palette className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-semibold">Ajustes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-md shadow-2xl">
              <CardHeader className="border-b border-slate-800/50 pb-5">
                <CardTitle className="flex items-center gap-2 text-slate-100 text-lg">
                  <User className="w-5 h-5 text-indigo-400" />
                  Datos del Perfil
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Modifique la información de contacto de su cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-300">Nombre</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName || ''}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        className="bg-slate-950/60 border-slate-800 focus-visible:ring-indigo-500 text-slate-100 placeholder:text-slate-500"
                        placeholder="Nombre de pila"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-300">Apellido</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName || ''}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        className="bg-slate-950/60 border-slate-800 focus-visible:ring-indigo-500 text-slate-100 placeholder:text-slate-500"
                        placeholder="Apellido de familia"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Correo Electrónico (No modificable)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email || ''}
                      disabled
                      className="bg-slate-950/20 border-slate-850 text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      type="submit" 
                      disabled={guardando} 
                      className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-md shadow-indigo-600/15"
                    >
                      {guardando ? (
                        <>
                          <Loader2 className="w-4.5 h-4.5 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4.5 h-4.5 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seguridad">
            <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-md shadow-2xl">
              <CardHeader className="border-b border-slate-800/50 pb-5">
                <CardTitle className="flex items-center gap-2 text-slate-100 text-lg">
                  <Lock className="w-5 h-5 text-indigo-400" />
                  Seguridad y Contraseña
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Actualice sus credenciales para mantener la cuenta segura
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-slate-300">Contraseña Actual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passData.currentPassword}
                      onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                      className="bg-slate-950/60 border-slate-800 focus-visible:ring-indigo-500 text-slate-100 placeholder:text-slate-500"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <Separator className="bg-slate-800/60 my-4" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-slate-300">Nueva Contraseña</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passData.newPassword}
                        onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                        className="bg-slate-950/60 border-slate-800 focus-visible:ring-indigo-500 text-slate-100 placeholder:text-slate-500"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-slate-300">Confirmar Nueva Contraseña</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passData.confirmPassword}
                        onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                        className="bg-slate-950/60 border-slate-800 focus-visible:ring-indigo-500 text-slate-100 placeholder:text-slate-500"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      type="submit" 
                      disabled={cambiandoPass} 
                      className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-medium shadow-md shadow-rose-600/15"
                    >
                      {cambiandoPass ? (
                        <>
                          <Loader2 className="w-4.5 h-4.5 mr-2 animate-spin" />
                          Actualizando...
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4.5 h-4.5 mr-2" />
                          Actualizar Contraseña
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificaciones">
            <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-md shadow-2xl">
              <CardHeader className="border-b border-slate-800/50 pb-5">
                <CardTitle className="flex items-center gap-2 text-slate-100 text-lg">
                  <Bell className="w-5 h-5 text-indigo-400" />
                  Preferencias de Avisos
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Configure las notificaciones y alertas personales que desea recibir
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm text-slate-200">Alertas de Pedidos (WhatsApp)</h4>
                      <p className="text-xs text-slate-400">Recibir avisos a su celular cuando se asigne un nuevo pedido.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifPrefs.newOrders} 
                        onChange={(e) => handleNotifChange('newOrders', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-650 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm text-slate-200">Auditoría Diaria (Correo)</h4>
                      <p className="text-xs text-slate-400">Enviar un resumen de bitácoras del día al finalizar su turno.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifPrefs.dailySummary} 
                        onChange={(e) => handleNotifChange('dailySummary', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-650 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm text-slate-200">Avisos de Stock Crítico</h4>
                      <p className="text-xs text-slate-400">Alertar cuando falte mercancía de seguridad en la sucursal activa.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifPrefs.lowStock} 
                        onChange={(e) => handleNotifChange('lowStock', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-650 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={saveNotifPrefs}
                    className="bg-indigo-650 hover:bg-indigo-600 text-white font-medium shadow-md shadow-indigo-650/15"
                  >
                    Guardar Avisos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personalizacion">
            <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-md shadow-2xl">
              <CardHeader className="border-b border-slate-800/50 pb-5">
                <CardTitle className="flex items-center gap-2 text-slate-100 text-lg">
                  <Palette className="w-5 h-5 text-indigo-400" />
                  Personalización del Sistema
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Establezca el comportamiento predeterminado y apariencia para su cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Tema Visual</Label>
                    <select 
                      value={personalData.theme}
                      onChange={(e) => handlePersonalChange('theme', e.target.value)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 text-slate-100 p-2 text-sm focus:border-indigo-500"
                    >
                      <option value="dark">Tema Oscuro (Por defecto)</option>
                      <option value="light">Tema Claro</option>
                      <option value="system">Tema del Sistema</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Modo POS de Trabajo</Label>
                    <select 
                      value={personalData.posMode}
                      onChange={(e) => handlePersonalChange('posMode', e.target.value)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 text-slate-100 p-2 text-sm focus:border-indigo-500"
                    >
                      <option value="MOSTRADOR">Vendedor Mostrador</option>
                      <option value="VENTANILLA">Cajero Ventanilla</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Vista de Inicio Predeterminada</Label>
                    <select 
                      value={personalData.landingView}
                      onChange={(e) => handlePersonalChange('landingView', e.target.value)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 text-slate-100 p-2 text-sm focus:border-indigo-500"
                    >
                      <option value="/dashboard">Tablero General (Dashboard)</option>
                      <option value="/pos">Punto de Venta (POS)</option>
                      <option value="/pedidos">Historial de Pedidos</option>
                      <option value="/productos">Administrador de Productos</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={savePersonalPrefs}
                    className="bg-indigo-650 hover:bg-indigo-600 text-white font-medium shadow-md shadow-indigo-650/15"
                  >
                    Guardar Personalización
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Perfil de Usuario"
        description="Gestione sus datos personales y ajustes de seguridad"
      />
      <div className="container mx-auto px-6 py-8">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm">Cargando...</p>
          </div>
        }>
          <PerfilContent />
        </Suspense>
      </div>
    </div>
  );
}
