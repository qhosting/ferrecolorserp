import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Punto de Venta (POS) - FerreColors ERP',
  description: 'Módulo de venta rápida y facturación rápida para sucursales de FerreColors',
};

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden flex flex-col font-sans select-none antialiased">
      {children}
    </div>
  );
}
