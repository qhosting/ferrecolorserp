'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  UserCheck
} from 'lucide-react';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  group: 'Empresa' | 'Ver' | 'Catálogos' | 'Movimientos' | 'Notas de venta' | 'Procesos' | 'Reportes' | 'Configuración' | 'Buzón';
}

const navigationItems: NavigationItem[] = [
  // 1. Empresa
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-4 w-4" />,
    group: 'Empresa'
  },
  // 2. Ver
  {
    title: 'Auditoría / Bitácoras',
    href: '/auditoria',
    icon: <Eye className="h-4 w-4" />,
    group: 'Ver'
  },
  // 3. Catálogos
  {
    title: 'Clientes',
    href: '/clientes',
    icon: <Users className="h-4 w-4" />,
    group: 'Catálogos'
  },
  {
    title: 'Productos',
    href: '/productos',
    icon: <Package className="h-4 w-4" />,
    group: 'Catálogos'
  },
  {
    title: 'Servicios',
    href: '/servicios',
    icon: <Briefcase className="h-4 w-4" />,
    group: 'Catálogos'
  },
  {
    title: 'Proveedores',
    href: '/proveedores',
    icon: <Building2 className="h-4 w-4" />,
    group: 'Catálogos'
  },
  {
    title: 'Agentes',
    href: '/agentes',
    icon: <UserCheck className="h-4 w-4" />,
    group: 'Catálogos'
  },
  {
    title: 'CONTPAQi',
    href: '/integraciones',
    icon: <Link2 className="h-4 w-4" />,
    group: 'Catálogos'
  },
  // 4. Movimientos
  {
    title: 'Pedidos',
    href: '/pedidos',
    icon: <ShoppingCart className="h-4 w-4" />,
    group: 'Movimientos'
  },
  {
    title: 'Compras',
    href: '/compras',
    icon: <Truck className="h-4 w-4" />,
    group: 'Movimientos'
  },
  {
    title: 'Almacén',
    href: '/almacen',
    icon: <Warehouse className="h-4 w-4" />,
    group: 'Movimientos'
  },
  {
    title: 'Cobranza',
    href: '/cobranza',
    icon: <ArrowDownRight className="h-4 w-4" />,
    group: 'Movimientos'
  },
  {
    title: 'Cobranza Móvil',
    href: '/cobranza-movil',
    icon: <Zap className="h-4 w-4" />,
    group: 'Movimientos'
  },
  // 5. Notas de venta
  {
    title: 'Ventas',
    href: '/ventas',
    icon: <FileText className="h-4 w-4" />,
    group: 'Notas de venta'
  },
  {
    title: 'Facturación Electrónica',
    href: '/facturacion-electronica',
    icon: <FileCheck className="h-4 w-4" />,
    group: 'Notas de venta'
  },
  // 6. Procesos
  {
    title: 'Pagarés',
    href: '/pagares',
    icon: <CreditCard className="h-4 w-4" />,
    group: 'Procesos'
  },
  {
    title: 'Scoring de Crédito',
    href: '/credito',
    icon: <TrendingUp className="h-4 w-4" />,
    group: 'Procesos'
  },
  {
    title: 'Cuentas por Pagar',
    href: '/cuentas-pagar',
    icon: <MinusCircle className="h-4 w-4" />,
    group: 'Procesos'
  },
  {
    title: 'Reestructuras',
    href: '/reestructuras',
    icon: <RefreshCw className="h-4 w-4" />,
    group: 'Procesos'
  },
  {
    title: 'Garantías',
    href: '/garantias',
    icon: <Shield className="h-4 w-4" />,
    group: 'Procesos'
  },
  {
    title: 'Notas de Cargo',
    href: '/notas-cargo',
    icon: <PlusCircle className="h-4 w-4" />,
    group: 'Procesos'
  },
  {
    title: 'Notas de Crédito',
    href: '/notas-credito',
    icon: <MinusCircle className="h-4 w-4" />,
    group: 'Procesos'
  },
  // 7. Reportes
  {
    title: 'Reportes',
    href: '/reportes',
    icon: <BarChart3 className="h-4 w-4" />,
    group: 'Reportes'
  },
  {
    title: 'Business Intelligence',
    href: '/business-intelligence',
    icon: <TrendingUp className="h-4 w-4" />,
    group: 'Reportes'
  },
  // 8. Configuración
  {
    title: 'Configuración General',
    href: '/configuracion',
    icon: <Settings className="h-4 w-4" />,
    group: 'Configuración'
  },
  {
    title: 'Integración CONTPAQi',
    href: '/integraciones',
    icon: <Database className="h-4 w-4" />,
    group: 'Configuración'
  },
  {
    title: 'Automatización',
    href: '/automatizacion',
    icon: <Bot className="h-4 w-4" />,
    group: 'Configuración'
  },
  // 9. Buzón
  {
    title: 'Comunicación / WhatsApp',
    href: '/comunicacion',
    icon: <MessageSquare className="h-4 w-4" />,
    group: 'Buzón'
  }
];

interface GroupStyle {
  activeBg: string;
  text: string;
  glowIcon: string;
  dot: string;
  groupBg: string;
  groupBorder: string;
}

const groupColors: Record<string, GroupStyle> = {
  'Empresa': {
    activeBg: 'bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent text-blue-600 dark:text-blue-400 font-semibold border-l-2 border-blue-500 rounded-l-none rounded-r-lg shadow-sm',
    text: 'text-blue-600 dark:text-blue-400',
    glowIcon: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]',
    dot: 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]',
    groupBg: 'bg-blue-500/5 dark:bg-blue-500/10',
    groupBorder: 'border-l-2 border-blue-500/70 rounded-l-none'
  },
  'Ver': {
    activeBg: 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent text-amber-600 dark:text-amber-400 font-semibold border-l-2 border-amber-500 rounded-l-none rounded-r-lg shadow-sm',
    text: 'text-amber-600 dark:text-amber-400',
    glowIcon: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]',
    groupBg: 'bg-amber-500/5 dark:bg-amber-500/10',
    groupBorder: 'border-l-2 border-amber-500/70 rounded-l-none'
  },
  'Catálogos': {
    activeBg: 'bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent text-purple-600 dark:text-purple-400 font-semibold border-l-2 border-purple-500 rounded-l-none rounded-r-lg shadow-sm',
    text: 'text-purple-600 dark:text-purple-400',
    glowIcon: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]',
    dot: 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]',
    groupBg: 'bg-purple-500/5 dark:bg-purple-500/10',
    groupBorder: 'border-l-2 border-purple-500/70 rounded-l-none'
  },
  'Movimientos': {
    activeBg: 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent text-emerald-600 dark:text-emerald-400 font-semibold border-l-2 border-emerald-500 rounded-l-none rounded-r-lg shadow-sm',
    text: 'text-emerald-600 dark:text-emerald-400',
    glowIcon: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]',
    groupBg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    groupBorder: 'border-l-2 border-emerald-500/70 rounded-l-none'
  },
  'Notas de venta': {
    activeBg: 'bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent text-cyan-600 dark:text-cyan-400 font-semibold border-l-2 border-cyan-500 rounded-l-none rounded-r-lg shadow-sm',
    text: 'text-cyan-600 dark:text-cyan-400',
    glowIcon: 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]',
    dot: 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.5)]',
    groupBg: 'bg-cyan-500/5 dark:bg-cyan-500/10',
    groupBorder: 'border-l-2 border-cyan-500/70 rounded-l-none'
  },
  'Procesos': {
    activeBg: 'bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent text-rose-600 dark:text-rose-400 font-semibold border-l-2 border-rose-500 rounded-l-none rounded-r-lg shadow-sm',
    text: 'text-rose-600 dark:text-rose-400',
    glowIcon: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]',
    dot: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]',
    groupBg: 'bg-rose-500/5 dark:bg-rose-500/10',
    groupBorder: 'border-l-2 border-rose-500/70 rounded-l-none'
  },
  'Reportes': {
    activeBg: 'bg-gradient-to-r from-violet-500/15 via-violet-500/5 to-transparent text-violet-600 dark:text-violet-400 font-semibold border-l-2 border-violet-500 rounded-l-none rounded-r-lg shadow-sm',
    text: 'text-violet-600 dark:text-violet-400',
    glowIcon: 'drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]',
    dot: 'bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.5)]',
    groupBg: 'bg-violet-500/5 dark:bg-violet-500/10',
    groupBorder: 'border-l-2 border-violet-500/70 rounded-l-none'
  },
  'Configuración': {
    activeBg: 'bg-gradient-to-r from-slate-500/15 via-slate-500/5 to-transparent text-slate-700 dark:text-slate-300 font-semibold border-l-2 border-slate-500 rounded-l-none rounded-r-lg shadow-sm',
    text: 'text-slate-700 dark:text-slate-300',
    glowIcon: 'drop-shadow-[0_0_8px_rgba(100,116,139,0.6)]',
    dot: 'bg-slate-500 shadow-[0_0_6px_rgba(100,116,139,0.5)] animate-pulse',
    groupBg: 'bg-slate-500/5 dark:bg-slate-500/10',
    groupBorder: 'border-l-2 border-slate-500/70 rounded-l-none'
  },
  'Buzón': {
    activeBg: 'bg-gradient-to-r from-green-500/15 via-green-500/5 to-transparent text-green-600 dark:text-green-400 font-semibold border-l-2 border-green-500 rounded-l-none rounded-r-lg shadow-sm',
    text: 'text-green-600 dark:text-green-400',
    glowIcon: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    dot: 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]',
    groupBg: 'bg-green-500/5 dark:bg-green-500/10',
    groupBorder: 'border-l-2 border-green-500/70 rounded-l-none'
  }
};

function NavigationContent() {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  const groups = [
    'Empresa',
    'Movimientos',
    'Catálogos',
    'Notas de venta',
    'Procesos',
    'Reportes',
    'Ver',
    'Configuración',
    'Buzón'
  ] as const;

  // Initialize and automatically expand only the active group on pathname changes (accordion style)
  useEffect(() => {
    const activeItem = navigationItems.find(item => 
      pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
    );
    if (activeItem) {
      setExpandedGroups({
        [activeItem.group]: true
      });
    }
  }, [pathname]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const wasExpanded = !!prev[groupName];
      const newState: Record<string, boolean> = {};
      if (!wasExpanded) {
        newState[groupName] = true;
      }
      return newState;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background/95 dark:bg-slate-950/95 backdrop-blur-md border-r border-border/40 dark:border-slate-900/60 shadow-[4px_0_30px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_35px_rgba(0,0,0,0.3)] select-none">
      {/* Premium Logo Header */}
      <div className="p-6 border-b border-border/30 dark:border-slate-900/40 bg-gradient-to-b from-muted/30 to-transparent relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <Link href="/dashboard" className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-indigo-600/10 dark:from-primary/20 dark:to-indigo-600/20 border border-primary/20 dark:border-primary/30 shadow-md group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 ease-out will-change-transform">
            <Building className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] dark:drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-600 to-violet-600 bg-clip-text text-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-primary transition-all duration-300">
              FerreColors
            </span>
            <span className="text-[10px] font-bold text-muted-foreground/85 uppercase tracking-widest">
              ERP Corporativo
            </span>
          </div>
        </Link>
        <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-border/50 dark:via-slate-800 to-transparent" />
      </div>

      {/* Navigation list */}
      <ScrollArea className="flex-1 px-4 py-6 scrollbar-none">
        <div className="space-y-4">
          {groups.map((groupName) => {
            const itemsInGroup = navigationItems.filter(item => item.group === groupName);
            if (itemsInGroup.length === 0) return null;

            const groupConfig = groupColors[groupName];
            const isExpanded = !!expandedGroups[groupName];
            const isGroupActive = itemsInGroup.some(item => 
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            );

            return (
              <div key={groupName} className="space-y-1.5 transition-all duration-300">
                {/* Accordion Group Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer border border-transparent outline-none select-none",
                    isGroupActive 
                      ? cn("shadow-sm", groupConfig?.groupBg, groupConfig?.groupBorder, groupConfig?.text)
                      : "text-muted-foreground/80 hover:bg-muted/40 hover:text-foreground dark:hover:bg-slate-900/40",
                    isExpanded && !isGroupActive && "bg-slate-100/50 dark:bg-slate-900/30 text-foreground border-l border-slate-200/80 dark:border-slate-800/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full transition-all duration-300', 
                      groupConfig?.dot || 'bg-muted', 
                      isGroupActive ? 'scale-125' : 'scale-75 opacity-70'
                    )} />
                    <span className="tracking-widest">{groupName}</span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-300 ease-out text-muted-foreground/70",
                      isExpanded ? "transform rotate-0" : "transform -rotate-90"
                    )} 
                  />
                </button>
                
                {/* Accordion Items List */}
                {isExpanded && (
                  <div className="space-y-1 pl-2 border-l border-slate-200/50 dark:border-slate-800/40 ml-3.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {itemsInGroup.map((item, index) => {
                      const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                      return (
                        <div key={index} className="relative group/item overflow-hidden rounded-lg">
                          <Link href={item.href}>
                            <Button
                              variant={isActive ? 'secondary' : 'ghost'}
                              className={cn(
                                'w-full justify-start gap-3 h-9 px-3 text-xs transition-all duration-300 rounded-lg relative overflow-hidden active:scale-98 will-change-transform',
                                isActive
                                  ? groupConfig?.activeBg
                                  : 'hover:bg-muted/30 dark:hover:bg-slate-900/20 text-muted-foreground hover:text-foreground hover:translate-x-1 duration-300'
                              )}
                            >
                              {/* Left bar accent on active */}
                              {isActive && (
                                <span className={cn(
                                  "absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-md", 
                                  groupConfig?.dot ? groupConfig.dot.split(' ')[0] : 'bg-primary'
                                )} />
                              )}
                              
                              <span className={cn(
                                'transition-all duration-300 h-4 w-4 flex items-center justify-center',
                                isActive 
                                  ? 'scale-110 ' + groupConfig?.text + ' ' + groupConfig?.glowIcon
                                  : 'text-muted-foreground/80 group-hover/item:text-foreground'
                              )}>
                                {item.icon}
                              </span>
                              
                              <span className={cn(
                                "flex-1 text-left truncate transition-colors duration-300",
                                isActive ? "font-bold" : "font-normal group-hover/item:font-medium"
                              )}>
                                {item.title}
                              </span>
                              
                              {item.badge && (
                                <span className={cn(
                                  'text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm transition-all duration-300',
                                  isActive
                                    ? 'bg-foreground text-background'
                                    : 'bg-primary text-primary-foreground scale-95 group-hover/item:scale-100'
                                )}>
                                  {item.badge}
                                </span>
                              )}
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sync Footer Card */}
        <div className="mt-8 pt-4 border-t border-border/30 dark:border-slate-900/40 pb-6">
          <div className="bg-muted/20 dark:bg-slate-900/30 border border-border/30 dark:border-slate-800/30 rounded-xl p-3.5 space-y-2.5 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"></span>
              </span>
              <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">
                ERP Sincronizado
              </span>
            </div>
            
            <div className="text-[9px] text-muted-foreground/80 font-medium space-y-1">
              <div className="flex justify-between">
                <span>Actualizado:</span>
                <span className="text-foreground/90 font-semibold">04/06/2026</span>
              </div>
              <div className="flex justify-between">
                <span>Origen:</span>
                <span className="text-foreground/90 font-semibold uppercase">CONTPAQi</span>
              </div>
              <div className="text-center pt-1.5 border-t border-border/20 dark:border-slate-800/20 font-bold tracking-wider text-muted-foreground/50">
                © AURUM CAPITAL
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 border-none bg-transparent">
          <NavigationContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border/30 dark:border-slate-900/40 bg-background">
        <NavigationContent />
      </div>
    </>
  );
}

export default Sidebar;
