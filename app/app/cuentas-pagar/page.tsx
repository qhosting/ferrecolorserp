'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CuentasPagarPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/compras?tab=cuentas-pagar');
  }, [router]);

  return (
    <div className="flex h-screen bg-slate-950 items-center justify-center text-slate-400">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3"></div>
      Redireccionando a Cuentas por Pagar...
    </div>
  );
}
