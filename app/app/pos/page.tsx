'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, Store, Lock, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import POSScreen from '@/components/pos/POSScreen';

interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
}

export default function POSPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  
  // States for opening drawer
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [montoApertura, setMontoApertura] = useState('500.00');
  const [numeroTerminal, setNumeroTerminal] = useState('Caja 1');
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated') {
      checkActiveSession();
      fetchSucursales();
    }
  }, [status]);

  const checkActiveSession = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pos/sesion');
      if (res.ok) {
        const data = await res.json();
        if (data.active) {
          setActiveSession(data.session);
        } else {
          setActiveSession(null);
        }
      } else {
        toast.error('Error al validar sesión de caja');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchSucursales = async () => {
    try {
      const res = await fetch('/api/sucursales');
      if (res.ok) {
        const data = await res.json();
        setSucursales(data.sucursales || []);
        if (data.sucursales?.length > 0) {
          setSelectedSucursal(data.sucursales[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching sucursales:', err);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSucursal) {
      toast.error('Debe seleccionar una sucursal');
      return;
    }

    const openCash = parseFloat(montoApertura);
    if (isNaN(openCash) || openCash < 0) {
      toast.error('El fondo de apertura debe ser un número válido igual o mayor a cero');
      return;
    }

    try {
      setOpening(true);
      const res = await fetch('/api/pos/sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sucursalId: selectedSucursal,
          montoApertura: openCash,
          numeroTerminal
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Caja abierta correctamente');
        setActiveSession(data.session);
      } else {
        toast.error(data.error || 'Error al abrir caja');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al abrir caja');
    } finally {
      setOpening(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <span className="text-sm font-medium tracking-wide">Cargando Módulo POS...</span>
      </div>
    );
  }

  // Si tiene sesión activa, cargamos la pantalla principal del POS
  if (activeSession) {
    return (
      <POSScreen 
        sesion={activeSession} 
        onSessionClosed={() => setActiveSession(null)} 
      />
    );
  }

  // Si no tiene sesión activa, mostramos la pantalla de apertura de caja
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>

        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20">
            <Store className="h-7 w-7 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-4">Apertura de Caja</h2>
          <p className="text-sm text-slate-400">
            Inicie su turno seleccionando sucursal y declarando el fondo de caja inicial.
          </p>
        </div>

        <form onSubmit={handleOpenSession} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sucursal" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Sucursal</Label>
            {sucursales.length === 0 ? (
              <div className="text-xs text-amber-400 p-2.5 bg-amber-400/5 border border-amber-500/20 rounded-xl">
                Cargando sucursales o no hay sucursales disponibles.
              </div>
            ) : (
              <select
                id="sucursal"
                value={selectedSucursal}
                onChange={(e) => setSelectedSucursal(e.target.value)}
                className="w-full h-11 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl px-3 text-sm focus:outline-none transition-colors"
                required
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} ({s.codigo})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="terminal" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">No. Terminal / Caja</Label>
              <Input
                id="terminal"
                type="text"
                placeholder="Ej. Caja 1"
                value={numeroTerminal}
                onChange={(e) => setNumeroTerminal(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 rounded-xl focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monto" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Fondo Inicial ($)</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0"
                value={montoApertura}
                onChange={(e) => setMontoApertura(e.target.value)}
                className="bg-slate-950 border-slate-800 text-emerald-400 font-mono font-bold rounded-xl focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={opening || sucursales.length === 0}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              {opening ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Abriendo Caja...
                </>
              ) : (
                'Abrir Turno de Caja'
              )}
            </Button>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            <span>Conexión segura SSL</span>
          </div>
          <button 
            type="button" 
            onClick={() => router.push('/')}
            className="hover:text-indigo-400 transition-colors flex items-center gap-1 font-medium"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Volver al ERP
          </button>
        </div>
      </div>
    </div>
  );
}
