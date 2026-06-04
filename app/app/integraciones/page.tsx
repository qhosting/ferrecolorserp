'use client';

import { Header } from '@/components/navigation/header';
import SyncPanel from '@/components/contpaqi/SyncPanel';

export default function IntegracionesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Integración CONTPAQi Comercial Premium"
        description="Gestión de sincronización de catálogos, agentes de venta, almacenes y bitácora de eventos"
      />
      <div className="p-6">
        <SyncPanel />
      </div>
    </div>
  );
}
