'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Building2, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email o contraseña incorrectos');
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = () => {
    setEmail('admin@sistema.com');
    setPassword('123456');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-950 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Panel Izquierdo: Branding & Info (Visible en LG) */}
      <div className="hidden lg:flex lg:col-span-7 relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 flex-col justify-between p-12 text-white border-r border-slate-800/50">
        
        {/* Decorative pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        
        {/* Circular glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none" />
        
        {/* Header / Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 z-10"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            FerreColors
          </span>
        </motion.div>

        {/* Central Content */}
        <div className="my-auto space-y-8 z-10 max-w-xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Zap className="h-3 w-3" /> Integración CONTPAQi Comercial Premium en tiempo real
            </span>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent">
              Simplifica tu operación, acelera tu facturación.
            </h1>
            <p className="text-lg text-slate-300 font-light leading-relaxed">
              La plataforma administrativa diseñada específicamente para Ferre Colors. Sincroniza clientes, productos y agentes sin esfuerzo.
            </p>
          </motion.div>

          {/* Feature Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all duration-300">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-3">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white">Facturación SAT 4.0</h3>
              <p className="text-xs text-slate-400 mt-1 font-light">Emisión de CFDI, timbrado directo y descargas automatizadas.</p>
            </div>
            
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all duration-300">
              <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                <Zap className="h-4 w-4 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white">Sincronización FIFO</h3>
              <p className="text-xs text-slate-400 mt-1 font-light">Control de saldos, pagos y notas de crédito en segundos.</p>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-xs text-slate-500 z-10"
        >
          © 2026 FerreColors. Todos los derechos reservados.
        </motion.div>
      </div>

      {/* Panel Derecho: Login Form */}
      <div className="lg:col-span-5 flex flex-col justify-center items-center p-8 bg-slate-950">
        
        {/* Glow element for mobile */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none lg:hidden" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-md space-y-8 z-10"
        >
          {/* Mobile Header */}
          <div className="text-center lg:text-left space-y-2">
            <div className="flex justify-center lg:justify-start lg:hidden mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Ingresa al Sistema
            </h2>
            <p className="text-sm text-slate-400">
              Coloca tus credenciales para acceder a la administración
            </p>
          </div>

          {/* Form Card */}
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ejemplo@ferrecolors.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-11 bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl h-11 transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Contraseña
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-11 pr-11 bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl h-11 transition-all duration-200"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-9 w-9 text-slate-500 hover:text-white hover:bg-slate-800/50 rounded-lg"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl h-11 shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-150"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  <span>Ingresar</span>
                )}
              </Button>
            </form>
            
            <Separator className="my-6 border-slate-800" />
            
            {/* Quick Fill Preset Box */}
            <motion.div 
              whileHover={{ scale: 1.01 }}
              onClick={fillCredentials}
              className="group cursor-pointer p-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800/50 hover:border-slate-700 transition-all duration-200"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-slate-400 group-hover:text-slate-200 font-medium transition-colors">
                    💡 Credenciales de prueba
                  </span>
                  <div className="text-slate-500 font-light font-mono text-[10px]">
                    admin@sistema.com / 123456
                  </div>
                </div>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-medium px-2 py-0.5 rounded-full group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                  Autocompletar
                </span>
              </div>
            </motion.div>
          </div>

          <div className="text-center lg:hidden">
            <p className="text-xs text-slate-600">
              © 2026 FerreColors. Todos los derechos reservados.
            </p>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
