'use client';

import { Header } from '@/components/navigation/header';
import SyncPanel from '@/components/contpaqi/SyncPanel';

export default function IntegracionesPage() {
  return (
    <div className="space-y-6 p-6">
      <Header
        title="Integración CONTPAQi Comercial Premium"
        description="Gestión de sincronización de catálogos, agentes de venta, almacenes y bitácora de eventos"
      />
      
      <SyncPanel />
    </div>
  );
}
