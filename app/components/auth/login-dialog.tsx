'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LogIn, Mail, Lock, Sparkles, AlertCircle } from 'lucide-react';

interface LoginDialogProps {
  children: React.ReactNode;
}

export function LoginDialog({ children }: LoginDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg('Correo o contraseña incorrectos. Por favor, intenta de nuevo.');
        toast({
          variant: 'destructive',
          title: 'Error de acceso',
          description: 'Credenciales inválidas',
        });
      } else {
        toast({
          title: 'Acceso concedido',
          description: 'Iniciando sesión en FerreColors ERP...',
        });
        setOpen(false);
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setErrorMsg('Ocurrió un error inesperado al intentar iniciar sesión.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error inesperado',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrorMsg(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        // Reset state on close
        setEmail('');
        setPassword('');
        setErrorMsg(null);
        setShowPassword(false);
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-[#009bdf]/10 rounded-full blur-2xl -z-10" />
        
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-2xl font-black bg-gradient-to-r from-[#002d72] via-[#009bdf] to-[#2da53d] dark:from-[#009bdf] dark:to-emerald-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
            <LogIn className="h-6 w-6 text-[#002d72] dark:text-[#009bdf]" />
            Acceso ERP
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">
            Panel Administrativo FerreColors
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="dialog-email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Correo Electrónico
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="dialog-email"
                type="email"
                placeholder="usuario@ferrecolors.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 focus-visible:ring-[#009bdf]"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="dialog-password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Contraseña
              </Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="dialog-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 focus-visible:ring-[#009bdf]"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#002d72] hover:bg-[#002d72]/90 dark:bg-[#009bdf] dark:hover:bg-[#009bdf]/90 text-white rounded-xl font-bold py-2.5 h-11 shadow-md transition-all flex items-center justify-center gap-2 mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Ingresar al ERP</span>
              </>
            )}
          </Button>
        </form>

        {/* Quick Fill presets for development and testing */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-900 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-[#2da53d]" />
            Credenciales de Prueba (Demo)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickFill('admin@sistema.com', '123456')}
              className="text-[10px] rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 px-2 py-1 justify-start font-medium"
            >
              🔑 Admin Sistema
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickFill('admin@empresa.com', 'admin123')}
              className="text-[10px] rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 px-2 py-1 justify-start font-medium"
            >
              🔑 Admin Empresa
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
