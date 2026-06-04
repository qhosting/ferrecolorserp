
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
  Link2
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

const groupColors: Record<string, { activeBg: string; text: string; dot: string; groupBg: string; groupBorder: string }> = {
  'Empresa': {
    activeBg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold border-l-2 border-blue-500 rounded-l-none rounded-r-md',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    groupBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    groupBorder: 'border-l-2 border-blue-500 rounded-l-none'
  },
  'Ver': {
    activeBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold border-l-2 border-amber-500 rounded-l-none rounded-r-md',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    groupBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    groupBorder: 'border-l-2 border-amber-500 rounded-l-none'
  },
  'Catálogos': {
    activeBg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold border-l-2 border-purple-500 rounded-l-none rounded-r-md',
    text: 'text-purple-600 dark:text-purple-400',
    dot: 'bg-purple-500',
    groupBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    groupBorder: 'border-l-2 border-purple-500 rounded-l-none'
  },
  'Movimientos': {
    activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border-l-2 border-emerald-500 rounded-l-none rounded-r-md',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    groupBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    groupBorder: 'border-l-2 border-emerald-500 rounded-l-none'
  },
  'Notas de venta': {
    activeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-semibold border-l-2 border-cyan-500 rounded-l-none rounded-r-md',
    text: 'text-cyan-600 dark:text-cyan-400',
    dot: 'bg-cyan-500',
    groupBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    groupBorder: 'border-l-2 border-cyan-500 rounded-l-none'
  },
  'Procesos': {
    activeBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold border-l-2 border-rose-500 rounded-l-none rounded-r-md',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
    groupBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    groupBorder: 'border-l-2 border-rose-500 rounded-l-none'
  },
  'Reportes': {
    activeBg: 'bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-semibold border-l-2 border-violet-500 rounded-l-none rounded-r-md',
    text: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
    groupBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    groupBorder: 'border-l-2 border-violet-500 rounded-l-none'
  },
  'Configuración': {
    activeBg: 'bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 font-semibold border-l-2 border-slate-500 rounded-l-none rounded-r-md',
    text: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-500 animate-pulse',
    groupBg: 'bg-slate-500/10 dark:bg-slate-500/20',
    groupBorder: 'border-l-2 border-slate-500 rounded-l-none'
  },
  'Buzón': {
    activeBg: 'bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 font-semibold border-l-2 border-green-500 rounded-l-none rounded-r-md',
    text: 'text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
    groupBg: 'bg-green-500/10 dark:bg-green-500/20',
    groupBorder: 'border-l-2 border-green-500 rounded-l-none'
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
    <div className="flex flex-col h-full bg-background border-r">
      {/* Logo */}
      <div className="p-6 border-b bg-muted/20">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Building className="h-7 w-7 text-primary animate-pulse" />
          <div className="flex flex-col">
            <span className="text-md font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">FerreColors</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase">ERP Corporativo</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-4">
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
              <div key={groupName} className="space-y-1">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 cursor-pointer border border-transparent",
                    isGroupActive 
                      ? cn("shadow-sm font-extrabold", groupConfig?.groupBg, groupConfig?.groupBorder, groupConfig?.text)
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    isExpanded && !isGroupActive && "bg-slate-50/60 dark:bg-slate-900/40 text-foreground border-l border-slate-200 dark:border-slate-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('h-1.5 w-1.5 rounded-full transition-all', groupConfig?.dot || 'bg-muted', isGroupActive && 'scale-125')} />
                    <span>{groupName}</span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground/75",
                      isExpanded ? "transform rotate-0" : "transform -rotate-90"
                    )} 
                  />
                </button>
                
                {isExpanded && (
                  <div className="space-y-1 pl-2 border-l border-slate-200 dark:border-slate-800/60 ml-3.5 mt-1">
                    {itemsInGroup.map((item, index) => {
                      const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                      return (
                        <div key={index}>
                          <Link href={item.href}>
                            <Button
                              variant={isActive ? 'secondary' : 'ghost'}
                              className={cn(
                                'w-full justify-start gap-3 h-8.5 px-3 text-xs transition-all duration-200 rounded-md',
                                isActive
                                  ? groupConfig?.activeBg
                                  : 'hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <span className={cn(
                                'transition-transform duration-200 h-3.5 w-3.5 flex items-center justify-center',
                                isActive ? 'scale-110 ' + groupConfig?.text : 'text-muted-foreground'
                              )}>
                                {item.icon}
                              </span>
                              <span className="flex-1 text-left truncate">{item.title}</span>
                              {item.badge && (
                                <span className={cn(
                                  'text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide',
                                  isActive
                                    ? 'bg-foreground text-background'
                                    : 'bg-primary text-primary-foreground'
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

        {/* Footer */}
        <div className="mt-8 pt-4 border-t pb-4">
          <div className="text-[10px] text-muted-foreground space-y-1.5 px-3">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="font-medium text-foreground">ERP Sincronizado</span>
            </div>
            <div>Actualizado: 04/06/2026</div>
            <div>©AurumCapital</div>
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
        <SheetContent side="left" className="p-0 w-64">
          <NavigationContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-background">
        <NavigationContent />
      </div>
    </>
  );
}

export default Sidebar;
