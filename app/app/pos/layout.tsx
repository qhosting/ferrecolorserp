import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Punto de Venta (POS) - FerreColors ERP',
  description: 'Módulo de venta rápida y facturación rápida para sucursales de FerreColors',
};

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden flex flex-col font-sans select-none antialiased">
      {children}
    </div>
  );
}
