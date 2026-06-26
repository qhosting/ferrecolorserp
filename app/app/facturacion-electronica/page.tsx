'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/navigation/header';
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
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
  Settings,
  Zap,
  CreditCard,
  Clock,
  Trash2,
} from "lucide-react";

interface FacturaElectronica {
  id: string;
  uuid: string;
  folio: string;
  serie: string;
  fecha: string;
  cliente: { rfc: string; nombre: string; email: string };
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
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

interface PACProvider {
  id: string;
  nombre: string;
  activo: boolean;
  configuracion: { url: string; usuario: string; certificado: string };
  creditos: number;
  ultimaSincronizacion?: string;
}

interface Certificado {
  id: string;
  numero: string;
  rfc: string;
  activo: boolean;
  fechaExpiracion: string;
}

interface ConceptoForm {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  claveProdServ: string;
  unidad: string;
}

const emptyConcepto: ConceptoForm = {
  descripcion: '', cantidad: 1, valorUnitario: 0, claveProdServ: '01010101', unidad: 'H87',
};

export default function FacturacionElectronicaPage() {
  const [activeTab, setActiveTab] = useState('facturas');
  const [facturas, setFacturas] = useState<FacturaElectronica[]>([]);
  const [proveedoresPAC, setProveedoresPAC] = useState<PACProvider[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [selectedPAC, setSelectedPAC] = useState<string>('');

  const [dialogType, setDialogType] = useState<'factura' | 'pac' | 'ver' | 'cancelar' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Factura form
  const [facturaCliente, setFacturaCliente] = useState({ rfc: '', nombre: '', email: '' });
  const [facturaObs, setFacturaObs] = useState('');
  const [conceptos, setConceptos] = useState<ConceptoForm[]>([{ ...emptyConcepto }]);

  // PAC form
  const [pacForm, setPacForm] = useState({ nombre: '', url: '', usuario: '', password: '' });

  // Ver / cancelar
  const [facturaSel, setFacturaSel] = useState<FacturaElectronica | null>(null);
  const [motivoCancel, setMotivoCancel] = useState('02');

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [facturasRes, pacRes, certRes] = await Promise.all([
        fetch('/api/facturacion/facturas'),
        fetch('/api/facturacion/pac'),
        fetch('/api/facturacion/certificados'),
      ]);
      const [facturasData, pacData, certData] = await Promise.all([
        facturasRes.json(), pacRes.json(), certRes.json(),
      ]);
      setFacturas(facturasData.facturas || []);
      setProveedoresPAC(pacData.proveedores || []);
      setCertificados(certData.certificados || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: "Error", description: "Error al cargar los datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogType(null);
    setFacturaCliente({ rfc: '', nombre: '', email: '' });
    setFacturaObs('');
    setConceptos([{ ...emptyConcepto }]);
    setPacForm({ nombre: '', url: '', usuario: '', password: '' });
    setFacturaSel(null);
    setMotivoCancel('02');
  };

  // ---- Timbrar ----
  const timbrarFactura = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/facturacion/facturas/${id}/timbrar`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast({ title: "Éxito", description: "Factura enviada a timbrado" });
        loadData();
      } else {
        toast({ title: "Error", description: data.error || "Error al timbrar la factura", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error timbring factura:', error);
      toast({ title: "Error", description: "Error al timbrar la factura", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ---- Nueva factura ----
  const updateConcepto = (idx: number, field: keyof ConceptoForm, value: string | number) => {
    setConceptos(conceptos.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };
  const addConcepto = () => setConceptos([...conceptos, { ...emptyConcepto }]);
  const removeConcepto = (idx: number) => setConceptos(conceptos.filter((_, i) => i !== idx));

  const facturaSubtotal = conceptos.reduce((s, c) => s + c.cantidad * c.valorUnitario, 0);
  const facturaIva = facturaSubtotal * 0.16;
  const facturaTotal = facturaSubtotal + facturaIva;

  const submitFactura = async () => {
    if (!facturaCliente.rfc || !facturaCliente.nombre) {
      toast({ title: "Datos incompletos", description: "RFC y nombre del cliente son obligatorios", variant: "destructive" });
      return;
    }
    if (conceptos.some(c => !c.descripcion || c.valorUnitario <= 0)) {
      toast({ title: "Conceptos inválidos", description: "Cada concepto requiere descripción y valor", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/facturacion/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteRfc: facturaCliente.rfc,
          clienteNombre: facturaCliente.nombre,
          clienteEmail: facturaCliente.email,
          observaciones: facturaObs,
          conceptos: conceptos.map(c => ({
            claveProdServ: c.claveProdServ,
            descripcion: c.descripcion,
            cantidad: c.cantidad,
            unidad: c.unidad,
            valorUnitario: c.valorUnitario,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la factura');
      toast({ title: "Factura creada", description: "Lista para timbrar" });
      closeDialog();
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Cancelar ----
  const submitCancelar = async () => {
    if (!facturaSel) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/facturacion/facturas/${facturaSel.id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoCancel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al cancelar la factura');
      toast({ title: "Factura cancelada", description: "Cancelación procesada" });
      closeDialog();
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Descargas ----
  const descargarDocumento = (factura: FacturaElectronica, tipo: 'xml' | 'pdf') => {
    window.open(`/api/contpaqi/documentos/${factura.id}/${tipo}`, '_blank');
  };

  // ---- PAC ----
  const submitPAC = async () => {
    if (!pacForm.nombre || !pacForm.url || !pacForm.usuario || !pacForm.password) {
      toast({ title: "Datos incompletos", description: "Todos los campos son obligatorios", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/facturacion/pac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pacForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al configurar el PAC');
      toast({ title: "PAC configurado", description: data.proveedor?.nombre });
      closeDialog();
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const sincronizarPAC = async (id: string) => {
    try {
      const response = await fetch(`/api/facturacion/pac/${id}/sincronizar`, { method: 'POST' });
      if (response.ok) {
        toast({ title: "Éxito", description: "Sincronización completada" });
        loadData();
      } else {
        toast({ title: "Aviso", description: "No se pudo sincronizar el PAC", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error syncing PAC:', error);
      toast({ title: "Error", description: "Error al sincronizar con el PAC", variant: "destructive" });
    }
  };

  // ---- Reporte SAT ----
  const descargarReporteSat = () => {
    const rows = [
      ['Serie-Folio', 'UUID', 'RFC Cliente', 'Cliente', 'Fecha', 'Subtotal', 'IVA', 'Total', 'Estado'],
      ...facturas.map(f => [
        `${f.serie}${f.folio}`, f.uuid || '', f.cliente.rfc, f.cliente.nombre,
        new Date(f.fecha).toLocaleDateString(), f.subtotal.toFixed(2), f.iva.toFixed(2),
        f.total.toFixed(2), f.estado,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-sat-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      'PENDIENTE': 'secondary', 'TIMBRADA': 'default', 'ENVIADA': 'secondary',
      'CANCELADA': 'destructive', 'ERROR': 'destructive',
    };
    const colors = {
      'PENDIENTE': 'bg-yellow-500', 'TIMBRADA': 'bg-green-500', 'ENVIADA': 'bg-blue-500',
      'CANCELADA': 'bg-gray-500', 'ERROR': 'bg-red-500',
    };
    return (
      <Badge variant={variants[estado] || 'default'} className={colors[estado as keyof typeof colors]}>
        {estado}
      </Badge>
    );
  };

  const filteredFacturas = facturas.filter(factura => {
    const matchesSearch = factura.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (factura.uuid || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = !selectedEstado || selectedEstado === 'all' || factura.estado === selectedEstado;
    const matchesPAC = !selectedPAC || selectedPAC === 'all' || factura.pac === selectedPAC;
    return matchesSearch && matchesEstado && matchesPAC;
  });

  // Panel de estado real
  const creditosTotales = proveedoresPAC.reduce((sum, p) => sum + (p.creditos || 0), 0);
  const pacActivo = proveedoresPAC.some(p => p.activo);
  const certVigentes = certificados.filter(c => c.activo && new Date(c.fechaExpiracion).getTime() > Date.now());
  const creditosBajos = creditosTotales < 100;

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Facturación Electrónica"
        description="Gestión de CFDI, timbrado automático y integración con PACs certificados"
      />
      <div className="p-6 space-y-6">
        <div className="flex justify-end gap-2">
          <Button onClick={() => setDialogType('pac')} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurar PAC
          </Button>
          <Button onClick={() => setDialogType('factura')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Factura
          </Button>
        </div>

      {/* Statistics */}
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
            <div className="text-2xl font-bold">{facturas.filter(f => f.estado === 'PENDIENTE').length}</div>
            <p className="text-xs text-muted-foreground">Requieren proceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timbradas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facturas.filter(f => f.estado === 'TIMBRADA').length}</div>
            <p className="text-xs text-muted-foreground">Exitosamente procesadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos PAC</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditosTotales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Timbres disponibles</p>
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
                <Input placeholder="Buscar por folio, cliente, UUID..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
              </div>
            </div>
            <Select value={selectedEstado} onValueChange={setSelectedEstado}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
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
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="PAC" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {proveedoresPAC.map((pac) => (
                  <SelectItem key={pac.id} value={pac.id}>{pac.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="facturas">Facturas CFDI</TabsTrigger>
          <TabsTrigger value="pac">Proveedores PAC</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
          <TabsTrigger value="reportes">Reportes SAT</TabsTrigger>
        </TabsList>

        {/* Facturas */}
        <TabsContent value="facturas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Facturas Electrónicas (CFDI)</CardTitle>
              <CardDescription>Gestión y timbrado de comprobantes fiscales digitales</CardDescription>
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
                    {filteredFacturas.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        {loading ? 'Cargando...' : 'No hay facturas'}
                      </td></tr>
                    )}
                    {filteredFacturas.map((factura) => (
                      <tr key={factura.id} className="border-b">
                        <td className="px-4 py-3 font-medium">{factura.serie}{factura.folio}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{factura.cliente.nombre}</p>
                            <p className="text-sm text-muted-foreground">{factura.cliente.rfc}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">{new Date(factura.fecha).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium">${factura.total.toLocaleString()}</td>
                        <td className="px-4 py-3">{getEstadoBadge(factura.estado)}</td>
                        <td className="px-4 py-3">
                          {factura.uuid ? (
                            <div className="font-mono text-xs">{factura.uuid.substring(0, 8)}...</div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" title="Ver detalle"
                              onClick={() => { setFacturaSel(factura); setDialogType('ver'); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {factura.estado === 'PENDIENTE' && (
                              <Button variant="ghost" size="sm" title="Timbrar"
                                onClick={() => timbrarFactura(factura.id)} disabled={loading}>
                                <Zap className="h-4 w-4" />
                              </Button>
                            )}
                            {factura.uuid && (
                              <>
                                <Button variant="ghost" size="sm" title="Descargar XML"
                                  onClick={() => descargarDocumento(factura, 'xml')}>
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" title="Descargar PDF"
                                  onClick={() => descargarDocumento(factura, 'pdf')}>
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {factura.estado === 'TIMBRADA' && (
                              <Button variant="ghost" size="sm" title="Cancelar"
                                onClick={() => { setFacturaSel(factura); setDialogType('cancelar'); }}>
                                <Trash2 className="h-4 w-4" />
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

        {/* PAC */}
        <TabsContent value="pac" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proveedores de Certificación Autorizados (PAC)</CardTitle>
              <CardDescription>Configuración y gestión de proveedores para timbrado de CFDI</CardDescription>
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
                    {proveedoresPAC.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No hay proveedores PAC configurados
                      </td></tr>
                    )}
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
                        <td className="px-4 py-3 font-medium text-green-600">{pac.creditos.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          {pac.ultimaSincronizacion ? (
                            <div className="text-sm">{new Date(pac.ultimaSincronizacion).toLocaleString()}</div>
                          ) : (
                            <span className="text-muted-foreground">Nunca</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" title="Sincronizar" onClick={() => sincronizarPAC(pac.id)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificados */}
        <TabsContent value="certificados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Certificados de Sello Digital (CSD)</CardTitle>
              <CardDescription>Gestión de certificados para firma digital de CFDI</CardDescription>
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
                    </tr>
                  </thead>
                  <tbody>
                    {certificados.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No hay certificados registrados
                      </td></tr>
                    )}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reportes */}
        <TabsContent value="reportes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reporte Mensual SAT</CardTitle>
                <CardDescription>Resumen de facturas emitidas y canceladas</CardDescription>
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
                  <Button className="w-full" onClick={descargarReporteSat} disabled={facturas.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Reporte (CSV)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado del Sistema</CardTitle>
                <CardDescription>Monitoreo de servicios de facturación</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`flex items-center gap-4 p-3 rounded-lg ${pacActivo ? 'bg-green-50' : 'bg-red-50'}`}>
                    {pacActivo ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
                    <div className="flex-1">
                      <p className="font-medium">Servicio PAC</p>
                      <p className="text-sm text-muted-foreground">{pacActivo ? 'Operativo' : 'Sin PAC activo'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-4 p-3 rounded-lg ${certVigentes.length > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    {certVigentes.length > 0 ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
                    <div className="flex-1">
                      <p className="font-medium">Certificados</p>
                      <p className="text-sm text-muted-foreground">
                        {certVigentes.length > 0 ? `${certVigentes.length} vigente(s)` : 'Sin certificados vigentes'}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-4 p-3 rounded-lg ${creditosBajos ? 'bg-yellow-50' : 'bg-green-50'}`}>
                    {creditosBajos ? <AlertCircle className="h-5 w-5 text-yellow-600" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
                    <div className="flex-1">
                      <p className="font-medium">Créditos PAC</p>
                      <p className="text-sm text-muted-foreground">
                        {creditosTotales.toLocaleString()} disponibles{creditosBajos ? ' — renovar pronto' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Nueva Factura */}
      <Dialog open={dialogType === 'factura'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[750px]">
          <DialogHeader>
            <DialogTitle>Nueva Factura Electrónica</DialogTitle>
            <DialogDescription>Captura los datos del receptor y los conceptos del CFDI.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rfc">RFC *</Label>
                <Input id="rfc" placeholder="XAXX010101000" value={facturaCliente.rfc}
                  onChange={(e) => setFacturaCliente({ ...facturaCliente, rfc: e.target.value.toUpperCase() })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cnombre">Nombre / Razón social *</Label>
                <Input id="cnombre" placeholder="Cliente S.A. de C.V." value={facturaCliente.nombre}
                  onChange={(e) => setFacturaCliente({ ...facturaCliente, nombre: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cemail">Email</Label>
                <Input id="cemail" type="email" placeholder="correo@cliente.com" value={facturaCliente.email}
                  onChange={(e) => setFacturaCliente({ ...facturaCliente, email: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Conceptos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addConcepto}>
                <Plus className="h-4 w-4 mr-1" /> Agregar concepto
              </Button>
            </div>

            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2 text-left">Descripción</th>
                    <th className="px-2 py-2 text-left w-24">Clave SAT</th>
                    <th className="px-2 py-2 text-left w-16">Cant.</th>
                    <th className="px-2 py-2 text-left w-28">Valor Unit.</th>
                    <th className="px-2 py-2 text-left w-24">Importe</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {conceptos.map((c, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-2 py-2">
                        <Input value={c.descripcion} placeholder="Descripción"
                          onChange={(e) => updateConcepto(idx, 'descripcion', e.target.value)} />
                      </td>
                      <td className="px-2 py-2">
                        <Input value={c.claveProdServ}
                          onChange={(e) => updateConcepto(idx, 'claveProdServ', e.target.value)} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min={1} value={c.cantidad}
                          onChange={(e) => updateConcepto(idx, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min={0} step="0.01" value={c.valorUnitario}
                          onChange={(e) => updateConcepto(idx, 'valorUnitario', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="px-2 py-2">${(c.cantidad * c.valorUnitario).toFixed(2)}</td>
                      <td className="px-2 py-2">
                        {conceptos.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeConcepto(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-end gap-1 text-sm">
              <div>Subtotal: <span className="font-medium">${facturaSubtotal.toFixed(2)}</span></div>
              <div>IVA (16%): <span className="font-medium">${facturaIva.toFixed(2)}</span></div>
              <div className="text-base">Total: <span className="font-bold">${facturaTotal.toFixed(2)}</span></div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fobs">Observaciones</Label>
              <Textarea id="fobs" value={facturaObs} onChange={(e) => setFacturaObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={submitFactura} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear Factura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Configurar PAC */}
      <Dialog open={dialogType === 'pac'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Configurar Proveedor PAC</DialogTitle>
            <DialogDescription>Datos de conexión con el Proveedor Autorizado de Certificación.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pacNombre">Nombre *</Label>
              <Input id="pacNombre" placeholder="PAC Principal" value={pacForm.nombre}
                onChange={(e) => setPacForm({ ...pacForm, nombre: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pacUrl">URL del servicio *</Label>
              <Input id="pacUrl" placeholder="https://api.pac.com" value={pacForm.url}
                onChange={(e) => setPacForm({ ...pacForm, url: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pacUsuario">Usuario *</Label>
                <Input id="pacUsuario" value={pacForm.usuario}
                  onChange={(e) => setPacForm({ ...pacForm, usuario: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pacPassword">Contraseña *</Label>
                <Input id="pacPassword" type="password" value={pacForm.password}
                  onChange={(e) => setPacForm({ ...pacForm, password: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={submitPAC} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Configurar PAC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Factura */}
      <Dialog open={dialogType === 'ver'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{facturaSel && `${facturaSel.serie}${facturaSel.folio}`}</DialogTitle>
            <DialogDescription>
              {facturaSel && `${facturaSel.cliente.nombre} — ${facturaSel.cliente.rfc}`}
            </DialogDescription>
          </DialogHeader>
          {facturaSel && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-2">
                {getEstadoBadge(facturaSel.estado)}
                {facturaSel.uuid && <span className="font-mono text-xs text-muted-foreground">{facturaSel.uuid}</span>}
              </div>
              <div className="rounded-md border max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left">Descripción</th>
                      <th className="px-3 py-2 text-left">Cant.</th>
                      <th className="px-3 py-2 text-left">Valor</th>
                      <th className="px-3 py-2 text-left">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturaSel.conceptos.map((c, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-3 py-2">{c.descripcion}</td>
                        <td className="px-3 py-2">{c.cantidad}</td>
                        <td className="px-3 py-2">${Number(c.valorUnitario).toFixed(2)}</td>
                        <td className="px-3 py-2">${Number(c.importe).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col items-end gap-1 text-sm">
                <div>Subtotal: <span className="font-medium">${facturaSel.subtotal.toFixed(2)}</span></div>
                <div>IVA: <span className="font-medium">${facturaSel.iva.toFixed(2)}</span></div>
                <div className="text-base">Total: <span className="font-bold">${facturaSel.total.toFixed(2)}</span></div>
              </div>
              {facturaSel.uuid && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => descargarDocumento(facturaSel, 'xml')}>
                    <Download className="h-4 w-4 mr-2" /> XML
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => descargarDocumento(facturaSel, 'pdf')}>
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cancelar */}
      <Dialog open={dialogType === 'cancelar'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cancelar Factura</DialogTitle>
            <DialogDescription>
              {facturaSel && `${facturaSel.serie}${facturaSel.folio} — ${facturaSel.cliente.nombre}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Motivo de cancelación (SAT)</Label>
              <Select value={motivoCancel} onValueChange={setMotivoCancel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">01 - Comprobante con errores con relación</SelectItem>
                  <SelectItem value="02">02 - Comprobante con errores sin relación</SelectItem>
                  <SelectItem value="03">03 - No se llevó a cabo la operación</SelectItem>
                  <SelectItem value="04">04 - Operación nominativa en factura global</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cerrar</Button>
            <Button variant="destructive" onClick={submitCancelar} disabled={submitting}>
              {submitting ? 'Procesando...' : 'Cancelar Factura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
