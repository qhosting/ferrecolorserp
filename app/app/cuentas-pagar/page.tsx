'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/navigation/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Wallet, 
  Search, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RolePermissions } from '@/lib/types';

interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
  rfc?: string;
}

interface Compra {
  id: string;
  numeroCompra: string;
}

interface CuentaPorPagar {
  id: string;
  proveedorId: string;
  compraId?: string;
  numeroFactura: string;
  monto: number;
  montoRestante: number;
  fechaVencimiento: string;
  status: 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA';
  observaciones?: string;
  createdAt: string;
  proveedor: Proveedor;
  compra?: Compra;
}

export default function CuentasPagarPage() {
  const { data: session } = useSession() || {};
  const [cxps, setCxps] = useState<CuentaPorPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCxp, setSelectedCxp] = useState<CuentaPorPagar | null>(null);
  const [montoAbono, setMontoAbono] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const userRole = session?.user?.role;
  const permissions = userRole ? RolePermissions[userRole] : {};
  const canPay = permissions?.compras?.update; // Compra manager role can make payments

  useEffect(() => {
    fetchCxps();
  }, []);

  const fetchCxps = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/compras/cuentas-pagar');
      if (response.ok) {
        const data = await response.json();
        setCxps(data.cxps || []);
      } else {
        toast.error('Error al obtener cuentas por pagar');
      }
    } catch (error) {
      console.error('Error fetching CXP:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCxp) return;

    const parsedMonto = parseFloat(montoAbono);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      toast.error('Ingresa un monto de abono válido');
      return;
    }

    if (parsedMonto > selectedCxp.montoRestante) {
      toast.error(`El monto no puede exceder el saldo restante (${formatPrice(selectedCxp.montoRestante)})`);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/compras/cuentas-pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCxp.id,
          montoAbono: parsedMonto
        }),
      });

      if (response.ok) {
        toast.success('Abono registrado exitosamente');
        setShowPaymentModal(false);
        setMontoAbono('');
        setSelectedCxp(null);
        fetchCxps();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al registrar el abono');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Error de red al registrar el abono');
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (cxp: CuentaPorPagar) => {
    setSelectedCxp(cxp);
    setMontoAbono(cxp.montoRestante.toString());
    setShowPaymentModal(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter Logic
  const filteredCxps = cxps.filter(cxp => {
    const matchesSearch = 
      cxp.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cxp.proveedor.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cxp.numeroFactura.toLowerCase().includes(searchTerm.toLowerCase());

    const isOverdue = new Date(cxp.fechaVencimiento) < new Date() && cxp.montoRestante > 0;
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'VENCIDA') return matchesSearch && isOverdue;
    if (statusFilter === 'PENDIENTE') return matchesSearch && cxp.status === 'PENDIENTE' && !isOverdue;
    if (statusFilter === 'PARCIAL') return matchesSearch && cxp.status === 'PARCIAL' && !isOverdue;
    if (statusFilter === 'PAGADA') return matchesSearch && cxp.status === 'PAGADA';
    
    return matchesSearch;
  });

  // Stats Calculations
  const activeCxps = cxps.filter(c => c.montoRestante > 0);
  const totalDebt = activeCxps.reduce((sum, c) => sum + c.montoRestante, 0);

  const overdueCxps = activeCxps.filter(c => new Date(c.fechaVencimiento) < new Date());
  const totalOverdue = overdueCxps.reduce((sum, c) => sum + c.montoRestante, 0);

  const uniqueSuppliersWithDebt = new Set(activeCxps.map(c => c.proveedorId)).size;

  const nextDueDateStr = activeCxps.length > 0
    ? formatDate(activeCxps.sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime())[0].fechaVencimiento)
    : 'N/A';

  return (
    <div className="space-y-6 p-6">
      <Header 
        title="Cuentas por Pagar"
        description="Monitorea las deudas vigentes con proveedores, folios de facturas de compra y administra abonos."
      />

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Deuda Total</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{formatPrice(totalDebt)}</h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Saldo Vencido</p>
              <h3 className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{formatPrice(totalOverdue)}</h3>
            </div>
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Proveedores con Saldo</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{uniqueSuppliersWithDebt}</h3>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl">
              <Wallet className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Próximo Vencimiento</p>
              <p className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50 mt-1">{nextDueDateStr}</p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and List */}
      <Card className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
        <CardHeader className="p-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl font-bold">Cuentas Pendientes de Pago</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Buscar por proveedor o folio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos los saldos</SelectItem>
                <SelectItem value="PENDIENTE">Vigentes (Sin abonos)</SelectItem>
                <SelectItem value="PARCIAL">Vigentes (Con abonos)</SelectItem>
                <SelectItem value="VENCIDA">Vencidas</SelectItem>
                <SelectItem value="PAGADA">Pagadas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchCxps()} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Proveedor</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Folio Factura</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Monto Original</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Saldo Restante</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Vencimiento</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Estado</TableHead>
                  {canPay && <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      Cargando cartera de proveedores...
                    </TableCell>
                  </TableRow>
                ) : filteredCxps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No hay cuentas por pagar registradas con estas especificaciones.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCxps.map((cxp) => {
                    const isOverdue = new Date(cxp.fechaVencimiento) < new Date() && cxp.montoRestante > 0;
                    
                    let statusBadge = <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-0 flex items-center w-fit gap-1"><CheckCircle2 className="h-3 w-3" /> Pagada</Badge>;
                    if (isOverdue) {
                      statusBadge = <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-0 flex items-center w-fit gap-1"><AlertCircle className="h-3 w-3" /> Vencida</Badge>;
                    } else if (cxp.status === 'PENDIENTE') {
                      statusBadge = <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border-0 flex items-center w-fit gap-1"><Clock className="h-3 w-3" /> Vigente</Badge>;
                    } else if (cxp.status === 'PARCIAL') {
                      statusBadge = <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-0 flex items-center w-fit gap-1"><TrendingUp className="h-3 w-3" /> Con Abonos</Badge>;
                    }

                    return (
                      <TableRow key={cxp.id} className="border-slate-200 dark:border-slate-800">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{cxp.proveedor.nombre}</p>
                            <span className="font-mono text-xs text-slate-500">{cxp.proveedor.codigo}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-slate-800 dark:text-slate-200">{cxp.numeroFactura}</TableCell>
                        <TableCell className="text-right text-slate-600 dark:text-slate-400">{formatPrice(cxp.monto)}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">{formatPrice(cxp.montoRestante)}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(cxp.fechaVencimiento)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge}</TableCell>
                        {canPay && (
                          <TableCell className="text-right">
                            {cxp.montoRestante > 0 ? (
                              <Button
                                size="sm"
                                onClick={() => openPaymentModal(cxp)}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex-inline items-center gap-1.5"
                              >
                                <DollarSign className="h-3 w-3" />
                                Registrar Pago
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Liquidada</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog for recording payment */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => !open && setShowPaymentModal(false)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Pago a Proveedor</DialogTitle>
            <DialogDescription>
              Registra un egreso o abono contra el saldo pendiente de esta factura.
            </DialogDescription>
          </DialogHeader>

          {selectedCxp && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4 py-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Proveedor:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedCxp.proveedor.nombre}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Factura Folio:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{selectedCxp.numeroFactura}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-200 dark:border-slate-800 pt-2">
                  <span className="text-slate-500">Saldo Pendiente:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatPrice(selectedCxp.montoRestante)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Monto del Abono / Pago</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedCxp.montoRestante}
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    className="pl-9 rounded-xl"
                    placeholder="0.00"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Presiona "Aplicar" para amortizar este monto de la deuda.</p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl" disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Aplicar Pago'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
