'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  LogOut, Settings, User, Bell, ChevronRight,
  LayoutDashboard, ShieldCheck, ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

// Role badge color map
const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN:  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  ADMIN:       'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  VENTAS:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  COBRANZA:    'bg-amber-500/20 text-amber-300 border-amber-500/30',
  CAJERO:      'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  GESTOR:      'bg-rose-500/20 text-rose-300 border-rose-500/30',
  USUARIO:     'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

// Breadcrumb builder from pathname
function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const LABELS: Record<string, string> = {
    'dashboard': 'Dashboard',
    'clientes': 'Clientes',
    'productos': 'Productos',
    'pedidos': 'Pedidos',
    'compras': 'Compras',
    'ventas': 'Ventas',
    'pagares': 'Pagarés',
    'reestructuras': 'Reestructuras',
    'garantias': 'Garantías',
    'notas-cargo': 'Notas de Cargo',
    'notas-credito': 'Notas de Crédito',
    'facturacion-electronica': 'Facturación Electrónica',
    'pos': 'Punto de Venta',
    'reportes': 'Reportes',
    'business-intelligence': 'Business Intelligence',
    'automatizacion': 'Automatización',
    'auditoria': 'Auditoría',
    'sucursales': 'Sucursales',
    'configuracion': 'Configuración',
    'integraciones': 'Integraciones',
    'agentes': 'Agentes',
    'servicios': 'Servicios',
    'almacen': 'Almacén',
    'cobranza': 'Cobranza',
    'comunicacion': 'Comunicación',
    'nuevo': 'Nuevo',
    'editar': 'Editar',
  };

  return segments.map((seg, idx) => ({
    label: LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    href: '/' + segments.slice(0, idx + 1).join('/'),
    isLast: idx === segments.length - 1,
  }));
}

export function Header({ title, description, actions }: HeaderProps) {
  const { data: session } = useSession() || {};
  const breadcrumbs = useBreadcrumbs();
  const [notifOpen, setNotifOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/login' });
      toast.success('Sesión cerrada correctamente');
    } catch {
      toast.error('No se pudo cerrar la sesión');
    }
  };

  const getUserInitials = () => {
    const fn = session?.user?.firstName;
    const ln = session?.user?.lastName;
    const n  = session?.user?.name;
    if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
    if (n) return n[0].toUpperCase();
    return 'U';
  };

  const getDisplayName = () => {
    const fn = session?.user?.firstName;
    const ln = session?.user?.lastName;
    const n  = session?.user?.name;
    if (fn && ln) return `${fn} ${ln}`;
    if (n) return n;
    return session?.user?.email || 'Usuario';
  };

  const role = (session?.user?.role as string) || 'USUARIO';
  const roleClass = ROLE_COLORS[role] || ROLE_COLORS['USUARIO'];

  return (
    <header className="
      sticky top-0 z-40 shrink-0
      bg-slate-950/90 backdrop-blur-xl
      border-b border-slate-800/60
      shadow-[0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)]
    ">
      <div className="flex items-center justify-between px-6 h-16 gap-4">

        {/* ── Left: Title + Breadcrumb ── */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb — only when more than 1 level */}
          {breadcrumbs.length > 1 && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-0.5">
              <Link href="/dashboard" className="flex items-center text-slate-600 hover:text-slate-400 transition-colors">
                <LayoutDashboard className="h-3 w-3" />
              </Link>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1">
                  <ChevronRight className="h-2.5 w-2.5 text-slate-700" />
                  {crumb.isLast ? (
                    <span className="text-[10px] font-semibold text-slate-400 tracking-wide truncate">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-[10px] font-medium text-slate-600 hover:text-slate-300 transition-colors tracking-wide truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-bold text-white tracking-tight truncate leading-tight">
              {title}
            </h1>
            {description && (
              <p className="hidden lg:block text-sm text-slate-500 truncate mt-px">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* ── Center: Custom actions slot ── */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}

        {/* ── Right: Notifications + User ── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Notification bell */}
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="
                  relative h-9 w-9 rounded-xl
                  text-slate-400 hover:text-white
                  bg-slate-900/50 hover:bg-slate-800/80
                  border border-slate-800/60 hover:border-slate-700
                  transition-all duration-200
                "
                aria-label="Notificaciones"
              >
                <Bell className="h-4 w-4" />
                {/* Badge */}
                <span className="
                  absolute -top-0.5 -right-0.5
                  h-4 w-4 flex items-center justify-center
                  bg-rose-500 text-white text-[9px] font-black
                  rounded-full border-2 border-slate-950
                  shadow-[0_0_8px_rgba(239,68,68,0.5)]
                ">3</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-slate-900 border-slate-800 shadow-2xl p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-sm font-bold text-white">Notificaciones</span>
                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[9px] font-bold px-1.5">3 nuevas</Badge>
              </div>
              <div className="divide-y divide-slate-800/50">
                {[
                  { icon: '💳', title: 'Pagaré vencido', desc: 'Cliente Hernández · hace 2h', color: 'text-rose-400' },
                  { icon: '📦', title: 'Stock bajo', desc: 'Pintura blanca 20L · hace 4h', color: 'text-amber-400' },
                  { icon: '✅', title: 'Venta completada', desc: 'Folio V-2847 · hace 6h', color: 'text-emerald-400' },
                ].map((n, i) => (
                  <button key={i} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors text-left group/notif">
                    <span className="text-base mt-px">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${n.color} truncate`}>{n.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{n.desc}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-slate-700 group-hover/notif:text-slate-400 transition-colors shrink-0 mt-1" />
                  </button>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-800">
                <button className="w-full text-center text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors py-0.5">
                  Ver todas las notificaciones
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="
                flex items-center gap-2.5 pl-2 pr-3 h-9
                rounded-xl cursor-pointer
                bg-slate-900/50 hover:bg-slate-800/80
                border border-slate-800/60 hover:border-slate-700
                transition-all duration-200 outline-none
                group/user
              ">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="
                    text-[10px] font-black
                    bg-gradient-to-br from-indigo-600 to-violet-600
                    text-white
                  ">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start min-w-0">
                  <span className="text-[11px] font-bold text-slate-200 group-hover/user:text-white transition-colors truncate max-w-[100px]">
                    {getDisplayName()}
                  </span>
                  <span className={`text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-px rounded-full border ${roleClass}`}>
                    {role}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-60 bg-slate-900 border-slate-800 shadow-2xl p-1.5"
            >
              <DropdownMenuLabel className="px-2 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-sm font-black">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">{getDisplayName()}</span>
                    <span className="text-[10px] text-slate-400 truncate">{session?.user?.email}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full border ${roleClass}`}>
                    {role}
                  </span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-slate-800 my-1" />

              <DropdownMenuItem
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer text-sm"
                onClick={() => toast('Función de perfil en desarrollo')}
              >
                <User className="h-4 w-4 text-slate-500" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer text-sm"
                asChild
              >
                <Link href="/configuracion">
                  <Settings className="h-4 w-4 text-slate-500" />
                  <span>Configuración</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer text-sm"
                onClick={() => toast('Panel de seguridad en desarrollo')}
              >
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                <span>Seguridad</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-slate-800 my-1" />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="
                  flex items-center gap-2.5 px-3 py-2 rounded-lg
                  text-rose-400 hover:text-rose-300 hover:bg-rose-500/10
                  cursor-pointer text-sm font-semibold
                "
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
