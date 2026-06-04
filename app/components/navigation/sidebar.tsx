
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
  Truck
} from 'lucide-react';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  group: 'Negocio' | 'Finanzas' | 'Sistema';
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-4 w-4" />,
    group: 'Negocio'
  },
  {
    title: 'Clientes',
    href: '/clientes',
    icon: <Users className="h-4 w-4" />,
    group: 'Negocio'
  },
  {
    title: 'Productos',
    href: '/productos',
    icon: <Package className="h-4 w-4" />,
    group: 'Negocio'
  },
  {
    title: 'Pedidos',
    href: '/pedidos',
    icon: <ShoppingCart className="h-4 w-4" />,
    group: 'Negocio'
  },
  {
    title: 'Ventas',
    href: '/ventas',
    icon: <FileText className="h-4 w-4" />,
    group: 'Negocio'
  },
  // Finanzas / Crédito
  {
    title: 'Pagarés',
    href: '/pagares',
    icon: <CreditCard className="h-4 w-4" />,
    group: 'Finanzas'
  },
  {
    title: 'Notas de Cargo',
    href: '/notas-cargo',
    icon: <PlusCircle className="h-4 w-4" />,
    group: 'Finanzas'
  },
  {
    title: 'Notas de Crédito',
    href: '/notas-credito',
    icon: <MinusCircle className="h-4 w-4" />,
    group: 'Finanzas'
  },
  {
    title: 'Reestructuras',
    href: '/reestructuras',
    icon: <RefreshCw className="h-4 w-4" />,
    group: 'Finanzas'
  },
  {
    title: 'Garantías',
    href: '/garantias',
    icon: <Shield className="h-4 w-4" />,
    group: 'Finanzas'
  },
  {
    title: 'Compras',
    href: '/compras',
    icon: <Truck className="h-4 w-4" />,
    group: 'Finanzas',
    badge: 'Nuevo'
  },
  // Sistema / Admin
  {
    title: 'Integración CONTPAQi',
    href: '/integraciones',
    icon: <Database className="h-4 w-4" />,
    group: 'Sistema',
    badge: 'Sync'
  },
  {
    title: 'Facturación Electrónica',
    href: '/facturacion-electronica',
    icon: <FileCheck className="h-4 w-4" />,
    group: 'Sistema',
    badge: 'Nuevo'
  },
  {
    title: 'Business Intelligence',
    href: '/business-intelligence',
    icon: <TrendingUp className="h-4 w-4" />,
    group: 'Sistema',
    badge: 'Nuevo'
  },
  {
    title: 'Automatización',
    href: '/automatizacion',
    icon: <Bot className="h-4 w-4" />,
    group: 'Sistema'
  },
  {
    title: 'Auditoría',
    href: '/auditoria',
    icon: <Database className="h-4 w-4" />,
    group: 'Sistema'
  },
  {
    title: 'Configuración',
    href: '/configuracion',
    icon: <Settings className="h-4 w-4" />,
    group: 'Sistema'
  }
];

function NavigationContent() {
  const pathname = usePathname();
  const groups = ['Negocio', 'Finanzas', 'Sistema'] as const;

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
        <div className="space-y-6">
          {groups.map((groupName) => {
            const itemsInGroup = navigationItems.filter(item => item.group === groupName);
            
            return (
              <div key={groupName} className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3">
                  {groupName === 'Negocio' ? 'Comercial' : groupName === 'Finanzas' ? 'Crédito y Cartera' : 'Sistema y Config'}
                </span>
                <div className="space-y-1">
                  {itemsInGroup.map((item, index) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    
                    return (
                      <div key={index}>
                        <Link href={item.href}>
                          <Button
                            variant={isActive ? 'secondary' : 'ghost'}
                            className={cn(
                              'w-full justify-start gap-3 h-9 px-3 text-sm transition-all duration-200',
                              isActive 
                                ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary rounded-l-none rounded-r-md' 
                                : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <span className={cn('transition-transform duration-200', isActive && 'scale-110')}>{item.icon}</span>
                            <span className="flex-1 text-left">{item.title}</span>
                            {item.badge && (
                              <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                {item.badge}
                              </span>
                            )}
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
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
            <div>© FerreColors. Todos los derechos reservados.</div>
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
