'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardCobranzaMovilRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cobranza-movil');
  }, [router]);

  return (
    <div className="flex h-screen bg-slate-950 items-center justify-center text-slate-400">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3"></div>
      Redireccionando a la App de Cobranza Móvil PWA...
    </div>
  );
}
