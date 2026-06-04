
'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { data: session } = useSession() || {};

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/login' });
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      toast.error('No se pudo cerrar la sesión');
    }
  };

  const handleProfile = () => {
    toast('Función de perfil en desarrollo', { icon: '👤' });
  };

  const handleSettings = () => {
    toast('Panel de configuración en desarrollo', { icon: '⚙️' });
  };

  const getUserInitials = () => {
    const firstName = session?.user?.firstName;
    const lastName = session?.user?.lastName;
    const name = session?.user?.name;
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    }
    if (name) {
      return name.charAt(0);
    }
    return 'U';
  };

  const getDisplayName = () => {
    const firstName = session?.user?.firstName;
    const lastName = session?.user?.lastName;
    const name = session?.user?.name;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (name) {
      return name;
    }
    return session?.user?.email || 'Usuario';
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative" 
            onClick={() => toast('Panel de notificaciones en desarrollo', { icon: '🔔' })}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 px-3" 
                onClick={(e) => e.preventDefault()}
                role="button"
                aria-expanded="false"
                aria-haspopup="true"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-500 text-white text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500">{session?.user?.role}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleProfile}>
                <User className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettings}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
