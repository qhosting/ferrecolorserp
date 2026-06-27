'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  Users,
  Package,
  ShoppingCart,
  FileText,
  CreditCard,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Shield,
  BarChart3,
  Settings,
  Menu,
  Zap,
  Building,
  Bot,
  Database,
  FileCheck,
  TrendingUp,
  Truck,
  Warehouse,
  MessageSquare,
  Eye,
  ArrowDownRight,
  ChevronDown,
  Briefcase,
  Link2,
  Building2,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2
} from 'lucide-react';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  group: 'Empresa' | 'Ver' | 'Catálogos' | 'Movimientos' | 'Notas de venta' | 'Procesos' | 'Reportes' | 'Configuración' | 'Buzón';
}

const navigationItems: NavigationItem[] = [
  { title: 'Empresa',                href: '/dashboard',              icon: Home,          group: 'Empresa' },
  { title: 'Auditoría / Bitácoras',  href: '/auditoria',              icon: Eye,           group: 'Ver' },
  { title: 'Clientes',               href: '/clientes',               icon: Users,         group: 'Catálogos' },
  { title: 'Productos',              href: '/productos',              icon: Package,       group: 'Catálogos' },
  { title: 'Servicios',              href: '/servicios',              icon: Briefcase,     group: 'Catálogos' },
  { title: 'Proveedores',            href: '/proveedores',            icon: Building2,     group: 'Catálogos' },
  { title: 'Agentes',               href: '/agentes',                icon: UserCheck,     group: 'Catálogos' },
  { title: 'Sucursales',            href: '/sucursales',             icon: Building,      group: 'Catálogos' },

  { title: 'Pedidos',               href: '/pedidos',                icon: ShoppingCart,  group: 'Movimientos' },
  { title: 'Compras',               href: '/compras',                icon: Truck,         group: 'Movimientos' },
  { title: 'Almacén',               href: '/almacen',                icon: Warehouse,     group: 'Movimientos' },
  { title: 'Cobranza',              href: '/cobranza',               icon: ArrowDownRight, group: 'Movimientos' },
  { title: 'Cobranza Móvil',        href: '/cobranza-movil',         icon: Zap,           group: 'Movimientos' },
  { title: 'Ventas',                href: '/ventas',                 icon: FileText,      group: 'Notas de venta' },
  { title: 'Facturación Electrónica', href: '/facturacion-electronica', icon: FileCheck,   group: 'Notas de venta' },
  { title: 'Punto de Venta (POS)',  href: '/pos',                    icon: ShoppingCart,  group: 'Notas de venta' },
  { title: 'Pagarés',               href: '/pagares',                icon: CreditCard,    group: 'Procesos' },
  { title: 'Scoring de Crédito',    href: '/credito',                icon: TrendingUp,    group: 'Procesos' },
  { title: 'Cuentas por Pagar',     href: '/cuentas-pagar',          icon: MinusCircle,   group: 'Procesos' },
  { title: 'Reestructuras',         href: '/reestructuras',          icon: RefreshCw,     group: 'Procesos' },
  { title: 'Garantías',             href: '/garantias',              icon: Shield,        group: 'Procesos' },
  { title: 'Notas de Cargo',        href: '/notas-cargo',            icon: PlusCircle,    group: 'Procesos' },
  { title: 'Notas de Crédito',      href: '/notas-credito',          icon: MinusCircle,   group: 'Procesos' },
  { title: 'Reportes',              href: '/reportes',               icon: BarChart3,     group: 'Reportes' },
  { title: 'Business Intelligence', href: '/business-intelligence',  icon: TrendingUp,    group: 'Reportes' },
  { title: 'Configuración General', href: '/configuracion',          icon: Settings,      group: 'Configuración' },
  { title: 'Usuarios y Roles',      href: '/usuarios',               icon: Users,         group: 'Configuración' },
  { title: 'Integración CONTPAQi',  href: '/integraciones',          icon: Database,      group: 'Configuración' },
  { title: 'Automatización',        href: '/automatizacion',         icon: Bot,           group: 'Configuración' },

  { title: 'Comunicación / WhatsApp', href: '/comunicacion',         icon: MessageSquare, group: 'Buzón' },
];

interface GroupConfig {
  color: string;       // text color active
  bg: string;          // bg active
  border: string;      // left bar color
  dot: string;         // dot bg
  glow: string;        // icon glow shadow
  label: string;       // full label color (inactive header)
  headerActive: string; // header bg when active
}

const GROUP_CONFIG: Record<string, GroupConfig> = {
  'Empresa':       { color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500',    dot: 'bg-sky-400',    glow: '[filter:drop-shadow(0_0_6px_rgba(56,189,248,0.7))]',   label: 'text-sky-400/80',    headerActive: 'bg-sky-500/8' },
  'Ver':           { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500',  dot: 'bg-amber-400',  glow: '[filter:drop-shadow(0_0_6px_rgba(251,191,36,0.7))]',   label: 'text-amber-400/80',  headerActive: 'bg-amber-500/8' },
  'Catálogos':     { color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500', dot: 'bg-violet-400', glow: '[filter:drop-shadow(0_0_6px_rgba(167,139,250,0.7))]',  label: 'text-violet-400/80', headerActive: 'bg-violet-500/8' },
  'Movimientos':   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500',dot: 'bg-emerald-400',glow: '[filter:drop-shadow(0_0_6px_rgba(52,211,153,0.7))]',   label: 'text-emerald-400/80',headerActive: 'bg-emerald-500/8' },
  'Notas de venta':{ color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500',   dot: 'bg-cyan-400',   glow: '[filter:drop-shadow(0_0_6px_rgba(34,211,238,0.7))]',   label: 'text-cyan-400/80',   headerActive: 'bg-cyan-500/8' },
  'Procesos':      { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500',   dot: 'bg-rose-400',   glow: '[filter:drop-shadow(0_0_6px_rgba(251,113,133,0.7))]',  label: 'text-rose-400/80',   headerActive: 'bg-rose-500/8' },
  'Reportes':      { color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500', dot: 'bg-purple-400', glow: '[filter:drop-shadow(0_0_6px_rgba(192,132,252,0.7))]',  label: 'text-purple-400/80', headerActive: 'bg-purple-500/8' },
  'Configuración': { color: 'text-slate-300',   bg: 'bg-slate-500/10',   border: 'border-slate-500',  dot: 'bg-slate-400',  glow: '[filter:drop-shadow(0_0_6px_rgba(148,163,184,0.7))]',  label: 'text-slate-400/80',  headerActive: 'bg-slate-500/8' },
  'Buzón':         { color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500',  dot: 'bg-green-400',  glow: '[filter:drop-shadow(0_0_6px_rgba(74,222,128,0.7))]',   label: 'text-green-400/80',  headerActive: 'bg-green-500/8' },
};

const GROUP_ORDER = [
  'Empresa', 'Movimientos', 'Notas de venta', 'Catálogos',
  'Procesos', 'Reportes', 'Ver', 'Configuración', 'Buzón'
] as const;

// ─────────────────────────────────────────────
// Tooltip component for mini mode
// ─────────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tt flex items-center">
      {children}
      <div className="
        pointer-events-none absolute left-full ml-3 z-[9999]
        px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap
        bg-slate-800 text-white border border-slate-700/80 shadow-xl
        opacity-0 translate-x-1 scale-95
        group-hover/tt:opacity-100 group-hover/tt:translate-x-0 group-hover/tt:scale-100
        transition-all duration-150 ease-out
      ">
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// NavigationContent — shared between desktop & mobile
// ─────────────────────────────────────────────
function NavigationContent({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Auto-expand the active group
  useEffect(() => {
    const activeItem = navigationItems.find(item =>
      pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
    );
    if (activeItem) {
      setExpandedGroups({ [activeItem.group]: true });
    }
  }, [pathname]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const wasOpen = !!prev[groupName];
      // accordion: close all, open selected (or close if already open)
      return wasOpen ? {} : { [groupName]: true };
    });
  };

  return (
    <div className={cn(
      "flex flex-col h-full overflow-hidden",
      "bg-slate-950 border-r border-slate-800/60",
      "shadow-[2px_0_24px_rgba(0,0,0,0.4)]",
      "transition-all duration-300 ease-out select-none"
    )}>

      {/* ── Logo Header ── */}
      <div className={cn(
        "shrink-0 border-b border-slate-800/50 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden",
        collapsed ? "px-3 py-4" : "px-5 py-4"
      )}>
        {/* Subtle gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-transparent to-transparent pointer-events-none" />
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center relative z-10 group/logo",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="
            shrink-0 p-2 rounded-xl
            bg-gradient-to-br from-indigo-600/20 to-violet-600/15
            border border-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.2)]
            group-hover/logo:scale-105 group-hover/logo:shadow-[0_0_20px_rgba(99,102,241,0.35)]
            transition-all duration-300 ease-out will-change-transform
          ">
            <Building className="h-5 w-5 text-indigo-400 group-hover/logo:text-indigo-300 transition-colors" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="
                text-sm font-black tracking-tight truncate
                bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300
                bg-clip-text text-transparent
              ">
                VertexERP
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] truncate">
                ERP Corporativo
              </span>
            </div>
          )}
        </Link>
        {/* Bottom divider glow */}
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
      </div>

      {/* ── Navigation list ── */}
      <ScrollArea className="flex-1 py-3 scrollbar-none">
        <div className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")}>
          {GROUP_ORDER.map((groupName) => {
            const items = navigationItems.filter(i => i.group === groupName);
            if (items.length === 0) return null;

            const cfg = GROUP_CONFIG[groupName];
            const isExpanded = !!expandedGroups[groupName];
            const isGroupActive = items.some(i =>
              pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href))
            );

            // ── Mini mode: just show icons with tooltips ──
            if (collapsed) {
              return (
                <div key={groupName} className="mb-1">
                  {/* Group dot separator */}
                  <div className="flex justify-center py-1.5">
                    <div className={cn("h-1 w-1 rounded-full opacity-40", cfg.dot)} />
                  </div>
                  {items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Tooltip key={item.href} label={item.title}>
                        <Link href={item.href} className="block w-full mb-0.5">
                          <div className={cn(
                            "flex items-center justify-center h-9 w-full rounded-lg",
                            "transition-all duration-200 ease-out cursor-pointer",
                            isActive
                              ? cn("shadow-sm", cfg.bg, "border-l-2 pl-0", cfg.border)
                              : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/60"
                          )}>
                            <Icon className={cn(
                              "h-4 w-4 transition-all duration-200",
                              isActive ? cn(cfg.color, cfg.glow) : ""
                            )} />
                          </div>
                        </Link>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            }

            // ── Full mode: accordion groups ──
            if (groupName === 'Empresa') {
              const item = items[0];
              const Icon = item.icon;
              return (
                <div key={groupName} className="mb-1">
                  <Link href={item.href} className="block w-full">
                    <div className={cn(
                      "flex items-center w-full px-3 py-2 rounded-lg",
                      "text-[10px] font-extrabold uppercase tracking-[0.12em]",
                      "transition-all duration-200 ease-out cursor-pointer outline-none",
                      isGroupActive
                        ? cn(cfg.headerActive, cfg.color, "border-l-2 pl-[10px]", cfg.border)
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                    )}>
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn(
                          "h-[14px] w-[14px] flex-shrink-0 transition-all duration-200",
                          isGroupActive
                            ? cn(cfg.color, cfg.glow)
                            : "text-slate-500 group-hover:text-slate-300"
                        )} />
                        <span>{item.title}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            }

            return (
              <div key={groupName} className="mb-1">
                {/* Accordion Group Button */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-lg",
                    "text-[10px] font-extrabold uppercase tracking-[0.12em]",
                    "transition-all duration-200 ease-out cursor-pointer outline-none",
                    isGroupActive
                      ? cn(cfg.headerActive, cfg.color, "border-l-2 pl-[10px]", cfg.border)
                      : isExpanded
                        ? "text-slate-300 bg-slate-900/50"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full flex-shrink-0 transition-all duration-300",
                      cfg.dot,
                      isGroupActive ? "opacity-100 scale-110 shadow-[0_0_6px_currentColor]" : "opacity-40 scale-90"
                    )} />
                    <span>{groupName}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-slate-600 transition-transform duration-200 ease-out flex-shrink-0",
                      isExpanded ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>

                {/* Accordion Items */}
                {isExpanded && (
                  <div className="mt-0.5 ml-3 pl-2.5 border-l border-slate-800/60 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    {items.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href}>
                          <div className={cn(
                            "group/item flex items-center gap-2.5 px-3 h-9 rounded-lg text-xs",
                            "transition-all duration-200 ease-out cursor-pointer relative overflow-hidden",
                            isActive
                              ? cn(
                                  "font-semibold shadow-sm",
                                  cfg.bg, cfg.color,
                                  "border-l-2 pl-[10px]", cfg.border
                                )
                              : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 hover:translate-x-0.5 font-normal"
                          )}>
                            {/* Shimmer on hover (inactive) */}
                            {!isActive && (
                              <div className="
                                absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent
                                -translate-x-full group-hover/item:translate-x-full
                                transition-transform duration-700 ease-out pointer-events-none
                              " />
                            )}

                            <Icon className={cn(
                              "h-[15px] w-[15px] flex-shrink-0 transition-all duration-200",
                              isActive
                                ? cn(cfg.color, cfg.glow)
                                : "text-slate-500 group-hover/item:text-slate-300"
                            )} />

                            <span className="flex-1 truncate transition-all duration-200">
                              {item.title}
                            </span>

                            {item.badge && (
                              <span className={cn(
                                "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0",
                                isActive
                                  ? "bg-white/15 text-white"
                                  : "bg-slate-700 text-slate-300 group-hover/item:bg-slate-600"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* ── Footer Status Card ── */}
      {!collapsed && (
        <div className="shrink-0 px-3 pb-4 pt-2 border-t border-slate-800/50">
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                ERP Sincronizado
              </span>
            </div>
            <div className="text-[9px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Actualizado:</span>
                <span className="text-slate-300 font-semibold">Hoy</span>
              </div>
              <div className="flex justify-between">
                <span>Origen:</span>
                <span className="text-slate-300 font-semibold">CONTPAQi</span>
              </div>
            </div>
            <div className="pt-1.5 border-t border-slate-800/40 text-center text-[8px] font-bold tracking-[0.2em] text-slate-600 uppercase">
              © AURUM CAPITAL
            </div>
          </div>
        </div>
      )}

      {/* Mini mode: compact sync dot */}
      {collapsed && (
        <div className="shrink-0 flex justify-center pb-4 pt-2 border-t border-slate-800/50">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Desktop Sidebar — collapsible
// ─────────────────────────────────────────────
function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  // Cargar estado de localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fc_sidebar_collapsed');
      if (stored !== null) {
        setCollapsed(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Guardar en localStorage y actualizar la variable CSS de margen del layout
  useEffect(() => {
    try {
      localStorage.setItem('fc_sidebar_collapsed', JSON.stringify(collapsed));
      document.documentElement.style.setProperty('--sidebar-width', collapsed ? '60px' : '256px');
    } catch (e) {
      console.error(e);
    }
  }, [collapsed]);

  return (
    <div className={cn(
      "hidden md:flex flex-col fixed inset-y-0 left-0 z-30",
      "transition-all duration-300 ease-out",
      collapsed ? "w-[60px]" : "w-64"
    )}>
      <NavigationContent collapsed={collapsed} />

      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={cn(
          "absolute -right-3 top-[72px] z-40",
          "h-6 w-6 rounded-full flex items-center justify-center",
          "bg-slate-800 border border-slate-700 text-slate-400",
          "hover:bg-slate-700 hover:text-white hover:border-slate-600",
          "shadow-[0_2px_8px_rgba(0,0,0,0.4)]",
          "transition-all duration-200 ease-out cursor-pointer"
        )}
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {collapsed
          ? <PanelLeftOpen className="h-3.5 w-3.5" />
          : <PanelLeftClose className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Mobile Sidebar — Sheet drawer
// ─────────────────────────────────────────────
function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className="
            md:hidden flex items-center justify-center
            h-9 w-9 rounded-lg
            bg-slate-900 border border-slate-800 text-slate-400
            hover:bg-slate-800 hover:text-white
            transition-all duration-200 cursor-pointer
          "
          aria-label="Abrir menú"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64 border-none bg-transparent shadow-2xl">
        <NavigationContent collapsed={false} />
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────
// Public exports
// ─────────────────────────────────────────────
export function Sidebar() {
  return (
    <>
      <MobileSidebar />
      <DesktopSidebar />
    </>
  );
}

export default Sidebar;
