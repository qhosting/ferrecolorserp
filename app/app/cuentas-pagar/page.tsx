
'use client';

import { Header } from '@/components/navigation/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

export default function CuentasPagarPage() {
  return (
    <div className="space-y-6 p-6">
      <Header 
        title="Cuentas por Pagar"
        description="Gestiona las facturas y pagos a proveedores"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Control de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Wallet className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Módulo en desarrollo
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Esta funcionalidad estará disponible próximamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
