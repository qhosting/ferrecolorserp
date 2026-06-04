
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Phone, 
  MapPin, 
  CreditCard,
  Save,
  X
} from 'lucide-react';

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId?: string; // Si se pasa, es edición, si no, es creación
  onSuccess?: () => void;
}

interface ClienteForm {
  codigoCliente: string;
  nombre: string;
  telefono1: string;
  telefono2: string;
  email: string;
  municipio: string;
  estado: string;
  colonia: string;
  calle: string;
  numeroExterior: string;
  numeroInterior: string;
  codigoPostal: string;
  pagosPeriodicos: string;
  periodicidad: string;
  status: string;
  diaCobro: string;
  observaciones: string;
  gestorId: string;
  vendedorId: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

const initialForm: ClienteForm = {
  codigoCliente: '',
  nombre: '',
  telefono1: '',
  telefono2: '',
  email: '',
  municipio: '',
  estado: '',
  colonia: '',
  calle: '',
  numeroExterior: '',
  numeroInterior: '',
  codigoPostal: '',
  pagosPeriodicos: '0',
  periodicidad: 'SEMANAL',
  status: 'ACTIVO',
  diaCobro: 'LUNES',
  observaciones: '',
  gestorId: 'sin-gestor',
  vendedorId: 'sin-vendedor'
};

export function ClienteFormModal({ isOpen, onClose, clienteId, onSuccess }: ClienteFormModalProps) {
  const [form, setForm] = useState<ClienteForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gestores, setGestores] = useState<UserOption[]>([]);
  const [vendedores, setVendedores] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isEdit = Boolean(clienteId);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      if (clienteId) {
        fetchCliente();
      } else {
        setForm({ ...initialForm, codigoCliente: generateClientCode() });
      }
    }
  }, [isOpen, clienteId]);

  const generateClientCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `CLI-${timestamp}`;
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        setGestores(users?.filter?.((user: UserOption) => user.role === 'GESTOR' || user.role === 'ADMIN' || user.role === 'SUPERADMIN') || []);
        setVendedores(users?.filter?.((user: UserOption) => user.role === 'VENTAS' || user.role === 'ADMIN' || user.role === 'SUPERADMIN') || []);
      } else {
        console.error('Error response:', response.status, response.statusText);
        toast.error('Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchCliente = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/clientes/${clienteId}`);
      if (response.ok) {
        const cliente = await response.json();
        setForm({
          codigoCliente: cliente.codigoCliente || '',
          nombre: cliente.nombre || '',
          telefono1: cliente.telefono1 || '',
          telefono2: cliente.telefono2 || '',
          email: cliente.email || '',
          municipio: cliente.municipio || '',
          estado: cliente.estado || '',
          colonia: cliente.colonia || '',
          calle: cliente.calle || '',
          numeroExterior: cliente.numeroExterior || '',
          numeroInterior: cliente.numeroInterior || '',
          codigoPostal: cliente.codigoPostal || '',
          pagosPeriodicos: cliente.pagosPeriodicos?.toString() || '0',
          periodicidad: cliente.periodicidad || 'SEMANAL',
          status: cliente.status || 'ACTIVO',
          diaCobro: cliente.diaCobro || 'LUNES',
          observaciones: cliente.observaciones || '',
          gestorId: cliente.gestorId || 'sin-gestor',
          vendedorId: cliente.vendedorId || 'sin-vendedor'
        });
      }
    } catch (error) {
      console.error('Error fetching cliente:', error);
      toast.error('Error al cargar los datos del cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isEdit ? `/api/clientes/${clienteId}` : '/api/clientes';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          pagosPeriodicos: parseFloat(form.pagosPeriodicos) || 0,
          gestorId: (form.gestorId && form.gestorId !== 'sin-gestor') ? form.gestorId : null,
          vendedorId: (form.vendedorId && form.vendedorId !== 'sin-vendedor') ? form.vendedorId : null,
        }),
      });

      if (response.ok) {
        toast.success(isEdit ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente');
        onSuccess?.();
        onClose();
      } else {
        const error = await response.text();
        toast.error(error || 'Error al guardar el cliente');
      }
    } catch (error) {
      console.error('Error saving cliente:', error);
      toast.error('Error al guardar el cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ClienteForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="direccion">Dirección</TabsTrigger>
                <TabsTrigger value="financiero">Financiero</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigoCliente">Código Cliente *</Label>
                    <Input
                      id="codigoCliente"
                      value={form.codigoCliente}
                      onChange={(e) => handleChange('codigoCliente', e.target.value)}
                      placeholder="CLI-123456"
                      required
                      disabled={isEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Completo *</Label>
                    <Input
                      id="nombre"
                      value={form.nombre}
                      onChange={(e) => handleChange('nombre', e.target.value)}
                      placeholder="Nombre completo del cliente"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono1">Teléfono Principal *</Label>
                    <Input
                      id="telefono1"
                      value={form.telefono1}
                      onChange={(e) => handleChange('telefono1', e.target.value)}
                      placeholder="555-123-4567"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono2">Teléfono Secundario</Label>
                    <Input
                      id="telefono2"
                      value={form.telefono2}
                      onChange={(e) => handleChange('telefono2', e.target.value)}
                      placeholder="555-123-4567"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="cliente@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select value={form.status} onValueChange={(value) => handleChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVO">Activo</SelectItem>
                        <SelectItem value="INACTIVO">Inactivo</SelectItem>
                        <SelectItem value="PROSPECTO">Prospecto</SelectItem>
                        <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gestorId">Gestor Asignado</Label>
                    <Select value={form.gestorId || "sin-gestor"} onValueChange={(value) => handleChange('gestorId', value === 'sin-gestor' ? '' : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar gestor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin-gestor">Sin gestor asignado</SelectItem>
                        {gestores?.map?.((gestor) => (
                          <SelectItem key={gestor.id} value={gestor.id || "sin-gestor"}>
                            {gestor.name || gestor.email || 'Sin nombre'} ({gestor.role})
                          </SelectItem>
                        )) || []}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendedorId">Vendedor Asignado</Label>
                    <Select value={form.vendedorId || "sin-vendedor"} onValueChange={(value) => handleChange('vendedorId', value === 'sin-vendedor' ? '' : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar vendedor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin-vendedor">Sin vendedor asignado</SelectItem>
                        {vendedores?.map?.((vendedor) => (
                          <SelectItem key={vendedor.id} value={vendedor.id || "sin-vendedor"}>
                            {vendedor.name || vendedor.email || 'Sin nombre'} ({vendedor.role})
                          </SelectItem>
                        )) || []}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="direccion" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="calle">Calle</Label>
                    <Input
                      id="calle"
                      value={form.calle}
                      onChange={(e) => handleChange('calle', e.target.value)}
                      placeholder="Nombre de la calle"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numeroExterior">Número Exterior</Label>
                    <Input
                      id="numeroExterior"
                      value={form.numeroExterior}
                      onChange={(e) => handleChange('numeroExterior', e.target.value)}
                      placeholder="123"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numeroInterior">Número Interior</Label>
                    <Input
                      id="numeroInterior"
                      value={form.numeroInterior}
                      onChange={(e) => handleChange('numeroInterior', e.target.value)}
                      placeholder="Apt. 4B"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="colonia">Colonia</Label>
                    <Input
                      id="colonia"
                      value={form.colonia}
                      onChange={(e) => handleChange('colonia', e.target.value)}
                      placeholder="Nombre de la colonia"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="municipio">Municipio</Label>
                    <Input
                      id="municipio"
                      value={form.municipio}
                      onChange={(e) => handleChange('municipio', e.target.value)}
                      placeholder="Nombre del municipio"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={form.estado}
                      onChange={(e) => handleChange('estado', e.target.value)}
                      placeholder="Nombre del estado"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codigoPostal">Código Postal</Label>
                    <Input
                      id="codigoPostal"
                      value={form.codigoPostal}
                      onChange={(e) => handleChange('codigoPostal', e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financiero" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pagosPeriodicos">Pago Periódico *</Label>
                    <Input
                      id="pagosPeriodicos"
                      type="number"
                      step="0.01"
                      value={form.pagosPeriodicos}
                      onChange={(e) => handleChange('pagosPeriodicos', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodicidad">Periodicidad</Label>
                    <Select value={form.periodicidad} onValueChange={(value) => handleChange('periodicidad', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIARIO">Diario</SelectItem>
                        <SelectItem value="SEMANAL">Semanal</SelectItem>
                        <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                        <SelectItem value="MENSUAL">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diaCobro">Día de Cobro</Label>
                    <Select value={form.diaCobro} onValueChange={(value) => handleChange('diaCobro', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LUNES">Lunes</SelectItem>
                        <SelectItem value="MARTES">Martes</SelectItem>
                        <SelectItem value="MIERCOLES">Miércoles</SelectItem>
                        <SelectItem value="JUEVES">Jueves</SelectItem>
                        <SelectItem value="VIERNES">Viernes</SelectItem>
                        <SelectItem value="SABADO">Sábado</SelectItem>
                        <SelectItem value="DOMINGO">Domingo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea
                      id="observaciones"
                      value={form.observaciones}
                      onChange={(e) => handleChange('observaciones', e.target.value)}
                      placeholder="Notas adicionales sobre el cliente..."
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEdit ? 'Actualizar' : 'Crear'} Cliente
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
