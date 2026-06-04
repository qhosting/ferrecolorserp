
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
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: <Home className="h-4 w-4" />
  },
  // FASE 1 - Gestión Básica
  {
    title: 'Clientes',
    href: '/clientes',
    icon: <Users className="h-4 w-4" />
  },
  {
    title: 'Productos',
    href: '/productos',
    icon: <Package className="h-4 w-4" />
  },
  {
    title: 'Pedidos',
    href: '/pedidos',
    icon: <ShoppingCart className="h-4 w-4" />
  },
  {
    title: 'Ventas',
    href: '/ventas',
    icon: <FileText className="h-4 w-4" />
  },
  {
    title: 'Pagarés',
    href: '/pagares',
    icon: <CreditCard className="h-4 w-4" />
  },
  // FASE 2 - Crédito y Garantías
  {
    title: 'Notas de Cargo',
    href: '/notas-cargo',
    icon: <PlusCircle className="h-4 w-4" />
  },
  {
    title: 'Notas de Crédito',
    href: '/notas-credito',
    icon: <MinusCircle className="h-4 w-4" />
  },
  {
    title: 'Reestructuras',
    href: '/reestructuras',
    icon: <RefreshCw className="h-4 w-4" />
  },
  {
    title: 'Garantías',
    href: '/garantias',
    icon: <Shield className="h-4 w-4" />
  },
  // FASE 3 - Analytics y Reportes
  {
    title: 'Reportes',
    href: '/reportes',
    icon: <BarChart3 className="h-4 w-4" />
  },
  {
    title: 'Configuración',
    href: '/configuracion',
    icon: <Settings className="h-4 w-4" />
  },
  {
    title: 'Integración CONTPAQi',
    href: '/integraciones',
    icon: <Database className="h-4 w-4" />,
    badge: 'Sync'
  },
  // FASE 4 - Módulos Avanzados
  {
    title: 'Compras',
    href: '/compras',
    icon: <Truck className="h-4 w-4" />,
    badge: 'Nuevo'
  },
  {
    title: 'Automatización',
    href: '/automatizacion',
    icon: <Bot className="h-4 w-4" />,
    badge: 'Nuevo'
  },
  {
    title: 'Auditoría',
    href: '/auditoria',
    icon: <Database className="h-4 w-4" />,
    badge: 'Nuevo'
  },
  {
    title: 'Facturación Electrónica',
    href: '/facturacion-electronica',
    icon: <FileCheck className="h-4 w-4" />,
    badge: 'Nuevo'
  },
  {
    title: 'Business Intelligence',
    href: '/business-intelligence',
    icon: <TrendingUp className="h-4 w-4" />,
    badge: 'Nuevo'
  }
];

function NavigationContent() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <Building className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <span className="text-lg font-bold">FerrecolorsERP</span>
            <span className="text-xs text-muted-foreground">v4.0.0</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          {navigationItems.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <div key={index}>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3 h-10',
                      isActive && 'bg-secondary font-medium'
                    )}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.title}</span>
                    {item.badge && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Separador para módulos avanzados */}
        <div className="my-6 px-3">
          <div className="border-t">
            <div className="mt-4 mb-2 px-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Módulos Avanzados (FASE 4)
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 mt-8 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3" />
              <span>Sistema activo</span>
            </div>
            <div>Última actualización: 03/06/2026</div>
            <div>© 2026 Ferrecolors. Todos los derechos reservados.</div>
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
        <SheetContent side="left" className="p-0 w-80">
          <NavigationContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0 border-r bg-background">
        <NavigationContent />
      </div>
    </>
  );
}

export default Sidebar;
