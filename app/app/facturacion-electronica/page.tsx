
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Send, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  FileText,
  Settings,
  Zap,
  CreditCard,
  Clock,
  XCircle
} from "lucide-react";

interface FacturaElectronica {
  id: string;
  uuid: string;
  folio: string;
  serie: string;
  fecha: string;
  cliente: {
    rfc: string;
    nombre: string;
    email: string;
  };
  conceptos: any[];
  subtotal: number;
  iva: number;
  total: number;
  estado: 'PENDIENTE' | 'TIMBRADA' | 'ENVIADA' | 'CANCELADA' | 'ERROR';
  pac: string;
  certificado: string;
  xmlUrl?: string;
  pdfUrl?: string;
  fechaTimbrado?: string;
  motivoCancelacion?: string;
  createdAt: string;
  updatedAt: string;
}

interface PACProvider {
  id: string;
  nombre: string;
  activo: boolean;
  configuracion: {
    url: string;
    usuario: string;
    certificado: string;
  };
  creditos: number;
  ultimaSincronizacion?: string;
}

interface Certificado {
  id: string;
  numero: string;
  rfc: string;
  vigencia: string;
  activo: boolean;
  archivoKey: string;
  archivoCer: string;
  password: string;
  fechaExpiracion: string;
}

export default function FacturacionElectronicaPage() {
  const [activeTab, setActiveTab] = useState('facturas');
  const [facturas, setFacturas] = useState<FacturaElectronica[]>([]);
  const [proveedoresPAC, setProveedoresPAC] = useState<PACProvider[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [selectedPAC, setSelectedPAC] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'factura' | 'pac' | 'certificado'>('factura');

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [facturasRes, pacRes, certRes] = await Promise.all([
        fetch('/api/facturacion/facturas'),
        fetch('/api/facturacion/pac'),
        fetch('/api/facturacion/certificados')
      ]);

      const [facturasData, pacData, certData] = await Promise.all([
        facturasRes.json(),
        pacRes.json(),
        certRes.json()
      ]);

      setFacturas(facturasData.facturas || []);
      setProveedoresPAC(pacData.proveedores || []);
      setCertificados(certData.certificados || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const timbrarFactura = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/facturacion/facturas/${id}/timbrar`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Factura timbrada correctamente",
        });
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Error al timbrar la factura",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error timbring factura:', error);
      toast({
        title: "Error",
        description: "Error al timbrar la factura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelarFactura = async (id: string, motivo: string) => {
    try {
      const response = await fetch(`/api/facturacion/facturas/${id}/cancelar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ motivo }),
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Factura cancelada correctamente",
        });
        loadData();
      }
    } catch (error) {
      console.error('Error canceling factura:', error);
      toast({
        title: "Error",
        description: "Error al cancelar la factura",
        variant: "destructive",
      });
    }
  };

  const sincronizarPAC = async (id: string) => {
    try {
      const response = await fetch(`/api/facturacion/pac/${id}/sincronizar`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Sincronización completada",
        });
        loadData();
      }
    } catch (error) {
      console.error('Error syncing PAC:', error);
      toast({
        title: "Error",
        description: "Error al sincronizar con el PAC",
        variant: "destructive",
      });
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      'PENDIENTE': 'secondary',
      'TIMBRADA': 'default',
      'ENVIADA': 'secondary',
      'CANCELADA': 'destructive',
      'ERROR': 'destructive'
    };
    const colors = {
      'PENDIENTE': 'bg-yellow-500',
      'TIMBRADA': 'bg-green-500',
      'ENVIADA': 'bg-blue-500',
      'CANCELADA': 'bg-gray-500',
      'ERROR': 'bg-red-500'
    };
    return (
      <Badge 
        variant={variants[estado] || 'default'} 
        className={colors[estado as keyof typeof colors]}
      >
        {estado}
      </Badge>
    );
  };

  const filteredFacturas = facturas.filter(factura => {
    const matchesSearch = factura.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         factura.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         factura.uuid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = !selectedEstado || selectedEstado === 'all' || factura.estado === selectedEstado;
    const matchesPAC = !selectedPAC || selectedPAC === 'all' || factura.pac === selectedPAC;
    
    return matchesSearch && matchesEstado && matchesPAC;
  });

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación Electrónica</h1>
          <p className="text-muted-foreground">
            Gestión de CFDI, timbrado automático y integración con PACs certificados
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setDialogType('pac'); setDialogOpen(true); }} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurar PAC
          </Button>
          <Button onClick={() => { setDialogType('factura'); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Factura
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas del Mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facturas.length}</div>
            <p className="text-xs text-muted-foreground">
              ${facturas.reduce((sum, f) => sum + f.total, 0).toLocaleString()} facturado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Timbrar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facturas.filter(f => f.estado === 'PENDIENTE').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren proceso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timbradas Hoy</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facturas.filter(f => f.estado === 'TIMBRADA').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Exitosamente procesadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos PAC</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {proveedoresPAC.reduce((sum, p) => sum + p.creditos, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Timbres disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por folio, cliente, UUID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedEstado} onValueChange={setSelectedEstado}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="TIMBRADA">Timbrada</SelectItem>
                <SelectItem value="ENVIADA">Enviada</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPAC} onValueChange={setSelectedPAC}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="PAC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {proveedoresPAC.map((pac) => (
                  <SelectItem key={pac.id} value={pac.id}>
                    {pac.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="facturas">Facturas CFDI</TabsTrigger>
          <TabsTrigger value="pac">Proveedores PAC</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
          <TabsTrigger value="reportes">Reportes SAT</TabsTrigger>
        </TabsList>

        <TabsContent value="facturas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Facturas Electrónicas (CFDI)</CardTitle>
              <CardDescription>
                Gestión y timbrado de comprobantes fiscales digitales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Folio</th>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Total</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">UUID</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFacturas.map((factura) => (
                      <tr key={factura.id} className="border-b">
                        <td className="px-4 py-3 font-medium">
                          {factura.serie}{factura.folio}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{factura.cliente.nombre}</p>
                            <p className="text-sm text-muted-foreground">{factura.cliente.rfc}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {new Date(factura.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          ${factura.total.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">{getEstadoBadge(factura.estado)}</td>
                        <td className="px-4 py-3">
                          {factura.uuid ? (
                            <div className="font-mono text-xs">
                              {factura.uuid.substring(0, 8)}...
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {factura.estado === 'PENDIENTE' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => timbrarFactura(factura.id)}
                                disabled={loading}
                              >
                                <Zap className="h-4 w-4" />
                              </Button>
                            )}
                            {factura.xmlUrl && (
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {factura.estado === 'TIMBRADA' && (
                              <Button variant="ghost" size="sm">
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pac" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proveedores de Certificación Autorizados (PAC)</CardTitle>
              <CardDescription>
                Configuración y gestión de proveedores para timbrado de CFDI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Proveedor</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Créditos</th>
                      <th className="px-4 py-3 text-left">Última Sincronización</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedoresPAC.map((pac) => (
                      <tr key={pac.id} className="border-b">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{pac.nombre}</p>
                            <p className="text-sm text-muted-foreground">{pac.configuracion.url}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={pac.activo ? 'default' : 'secondary'}>
                            {pac.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-green-600">
                          {pac.creditos.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {pac.ultimaSincronizacion ? (
                            <div className="text-sm">
                              {new Date(pac.ultimaSincronizacion).toLocaleString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Nunca</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => sincronizarPAC(pac.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Certificados de Sello Digital (CSD)</CardTitle>
              <CardDescription>
                Gestión de certificados para firma digital de CFDI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Número</th>
                      <th className="px-4 py-3 text-left">RFC</th>
                      <th className="px-4 py-3 text-left">Vigencia</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificados.map((cert) => (
                      <tr key={cert.id} className="border-b">
                        <td className="px-4 py-3 font-mono">{cert.numero}</td>
                        <td className="px-4 py-3 font-medium">{cert.rfc}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p>Hasta: {new Date(cert.fechaExpiracion).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">
                              {Math.ceil((new Date(cert.fechaExpiracion).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={cert.activo ? 'default' : 'secondary'}>
                            {cert.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reportes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reporte Mensual SAT</CardTitle>
                <CardDescription>
                  Resumen de facturas emitidas y canceladas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Facturas emitidas:</span>
                    <span className="font-medium">{facturas.filter(f => f.estado === 'TIMBRADA').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Facturas canceladas:</span>
                    <span className="font-medium">{facturas.filter(f => f.estado === 'CANCELADA').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monto total:</span>
                    <span className="font-medium">
                      ${facturas.filter(f => f.estado === 'TIMBRADA').reduce((sum, f) => sum + f.total, 0).toLocaleString()}
                    </span>
                  </div>
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Reporte
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado del Sistema</CardTitle>
                <CardDescription>
                  Monitoreo de servicios de facturación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium">Servicio PAC</p>
                      <p className="text-sm text-muted-foreground">Operativo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium">Certificados</p>
                      <p className="text-sm text-muted-foreground">Vigentes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div className="flex-1">
                      <p className="font-medium">Créditos PAC</p>
                      <p className="text-sm text-muted-foreground">Renovar pronto</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'factura' && 'Nueva Factura Electrónica'}
              {dialogType === 'pac' && 'Configurar Proveedor PAC'}
              {dialogType === 'certificado' && 'Nuevo Certificado'}
            </DialogTitle>
            <DialogDescription>
              Configure los parámetros necesarios para continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Configuración Avanzada</h3>
              <p className="text-muted-foreground">
                Esta funcionalidad estará disponible próximamente
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button>
              {dialogType === 'factura' && 'Crear Factura'}
              {dialogType === 'pac' && 'Configurar PAC'}
              {dialogType === 'certificado' && 'Cargar Certificado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
