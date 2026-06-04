
'use client';

import { Header } from '@/components/navigation/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Download, RefreshCw, MapPin } from 'lucide-react';

export default function CobranzaMovilPage() {
  const handleSyncOffline = () => {
    alert('Sincronización offline iniciada');
  };

  const handleViewLocations = () => {
    alert('Función de geolocalización en desarrollo');
  };

  const handleUploadData = () => {
    alert('Subiendo datos al servidor...');
  };

  return (
    <div className="space-y-6 p-6">
      <Header 
        title="Cobranza Móvil"
        description="Gestión de cobranza en campo con funcionalidad offline"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Download className="mr-2 h-4 w-4" />
              Descargar Rutas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleSyncOffline}>
              Sincronizar Offline
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <MapPin className="mr-2 h-4 w-4" />
              Geolocalización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={handleViewLocations}>
              Ver Ubicaciones
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={handleUploadData}>
              Subir Datos
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="mr-2 h-5 w-5" />
            Aplicación Móvil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Módulo en desarrollo
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Funcionalidad offline y geolocalización en desarrollo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
