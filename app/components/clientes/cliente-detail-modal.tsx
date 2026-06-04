
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Calendar,
  DollarSign,
  Users,
  Edit,
  X
} from 'lucide-react';

interface ClienteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  onEdit?: (clienteId: string) => void;
}

interface ClienteDetalle {
  id: string;
  codigoCliente: string;
  nombre: string;
  telefono1?: string;
  telefono2?: string;
  email?: string;
  municipio?: string;
  estado?: string;
  colonia?: string;
  calle?: string;
  numeroExterior?: string;
  codigoPostal?: string;
  saldoActual: number;
  pagosPeriodicos: number;
  periodicidad: string;
  status: string;
  diaCobro?: string;
  fechaAlta?: string;
  gestor?: { firstName?: string; lastName?: string; };
  vendedor?: { firstName?: string; lastName?: string; };
  // Historial de pagos reciente
  ultimosPagos?: Array<{
    fecha: string;
    monto: number;
    concepto: string;
  }>;
}

export function ClienteDetailModal({ isOpen, onClose, clienteId, onEdit }: ClienteDetailModalProps) {
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && clienteId) {
      fetchClienteDetail();
    }
  }, [isOpen, clienteId]);

  const fetchClienteDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/clientes/${clienteId}`);
      if (response.ok) {
        const data = await response.json();
        setCliente(data);
      }
    } catch (error) {
      console.error('Error fetching cliente detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'ACTIVO': { color: 'bg-green-100 text-green-800', text: 'Activo' },
      'INACTIVO': { color: 'bg-gray-100 text-gray-800', text: 'Inactivo' },
      'MOROSO': { color: 'bg-red-100 text-red-800', text: 'Moroso' },
      'BLOQUEADO': { color: 'bg-orange-100 text-orange-800', text: 'Bloqueado' },
      'PROSPECTO': { color: 'bg-blue-100 text-blue-800', text: 'Prospecto' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['ACTIVO'];
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalles del Cliente
          </DialogTitle>
          <div className="flex gap-2">
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(clienteId)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : cliente ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{cliente.nombre}</h2>
                <p className="text-gray-600">Código: {cliente.codigoCliente}</p>
              </div>
              <div className="text-right">
                {getStatusBadge(cliente.status)}
                <p className="text-sm text-gray-500 mt-1">
                  Cliente desde: {formatDate(cliente.fechaAlta)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Información de Contacto */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Teléfono 1:</span>
                    <p>{cliente.telefono1 || 'N/A'}</p>
                  </div>
                  {cliente.telefono2 && (
                    <div>
                      <span className="font-medium">Teléfono 2:</span>
                      <p>{cliente.telefono2}</p>
                    </div>
                  )}
                  {cliente.email && (
                    <div>
                      <span className="font-medium">Email:</span>
                      <p>{cliente.email}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dirección */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Dirección
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {cliente.calle && (
                    <p>{cliente.calle} {cliente.numeroExterior}</p>
                  )}
                  {cliente.colonia && (
                    <p>Col. {cliente.colonia}</p>
                  )}
                  <p>{cliente.municipio}, {cliente.estado}</p>
                  {cliente.codigoPostal && (
                    <p>CP: {cliente.codigoPostal}</p>
                  )}
                </CardContent>
              </Card>

              {/* Información Financiera */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Financiero
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Saldo Actual:</span>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(cliente.saldoActual)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Pago Periódico:</span>
                    <p className="font-medium">
                      {formatCurrency(cliente.pagosPeriodicos)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Periodicidad:</span>
                    <p>{cliente.periodicidad}</p>
                  </div>
                  {cliente.diaCobro && (
                    <div>
                      <span className="font-medium">Día de Cobro:</span>
                      <p>{cliente.diaCobro}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Asignaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Personal Asignado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-sm">Gestor de Cobranza:</span>
                    <p>{cliente.gestor?.firstName || 'No asignado'} {cliente.gestor?.lastName || ''}</p>
                  </div>
                  <div>
                    <span className="font-medium text-sm">Vendedor:</span>
                    <p>{cliente.vendedor?.firstName || 'No asignado'} {cliente.vendedor?.lastName || ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Historial de Pagos Reciente */}
            {cliente.ultimosPagos && cliente.ultimosPagos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Últimos Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cliente.ultimosPagos.map((pago, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{pago.concepto}</p>
                          <p className="text-sm text-gray-500">{formatDate(pago.fecha)}</p>
                        </div>
                        <div className="font-bold text-green-600">
                          {formatCurrency(pago.monto)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p>No se pudo cargar la información del cliente.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
