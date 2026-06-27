'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/navigation/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  UserMinus, 
  UserCheck, 
  Building2, 
  Mail, 
  Key, 
  RefreshCw, 
  Loader2, 
  Shield,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  sucursalDefaultId: string | null;
  sucursalDefault?: {
    id: string;
    nombre: string;
  } | null;
}

export default function UsuariosPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [users, setUsers] = useState<User[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Form states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uFirstName, setUFirstName] = useState('');
  const [uLastName, setULastName] = useState('');
  const [uRole, setURole] = useState('VENTAS');
  const [uIsActive, setUIsActive] = useState(true);
  const [uSucursalId, setUSucursalId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirm delete/deactivate target
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      const role = session.user?.role;
      if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
        toast.error('Acceso restringido - Solo administradores');
        router.push('/');
        return;
      }

      loadData();
    }
  }, [status]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchSucursales()]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      } else {
        toast.error('Error al obtener lista de usuarios');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error de conexión al cargar usuarios');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSucursales = async () => {
    try {
      const res = await fetch('/api/sucursales?active=true');
      if (res.ok) {
        const data = await res.json();
        setSucursales(data.sucursales || []);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUEmail('');
    setUPassword('');
    setUFirstName('');
    setULastName('');
    setURole('VENTAS');
    setUIsActive(true);
    setUSucursalId('');
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUEmail(user.email);
    setUPassword(''); // Limpiar contraseña por seguridad al editar
    setUFirstName(user.firstName || '');
    setULastName(user.lastName || '');
    setURole(user.role);
    setUIsActive(user.isActive);
    setUSucursalId(user.sucursalDefaultId || '');
    setShowUserModal(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uEmail || !uRole || (!editingUser && !uPassword)) {
      toast.error('Por favor complete todos los campos obligatorios');
      return;
    }

    try {
      setSubmitting(true);
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload = {
        email: uEmail,
        name: `${uFirstName} ${uLastName}`.trim(),
        firstName: uFirstName,
        lastName: uLastName,
        role: uRole,
        isActive: uIsActive,
        sucursalDefaultId: uSucursalId || null,
        ...(uPassword.trim() ? { password: uPassword } : {})
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingUser ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
        setShowUserModal(false);
        fetchUsers();
      } else {
        const errText = await res.text();
        toast.error(errText || 'Ocurrió un error al guardar el usuario');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al guardar usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeactivate = (user: User) => {
    setConfirmTarget(user);
    setShowConfirmModal(true);
  };

  const handleExecuteDeactivate = async () => {
    if (!confirmTarget) return;

    try {
      setDeactivating(true);
      const res = await fetch(`/api/users/${confirmTarget.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Usuario desactivado correctamente');
        setShowConfirmModal(false);
        fetchUsers();
      } else {
        const errText = await res.text();
        toast.error(errText || 'Error al desactivar usuario');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al desactivar usuario');
    } finally {
      setDeactivating(false);
    }
  };

  // Filtrado de usuarios por término de búsqueda
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return <Badge className="bg-red-500/10 text-red-400 hover:bg-red-500/10 border-red-500/20 font-bold text-[10px]"><Shield className="h-3 w-3 mr-1 text-red-500" /> SUPERADMIN</Badge>;
      case 'ADMIN':
        return <Badge className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/10 border-orange-500/20 font-bold text-[10px]"><ShieldCheck className="h-3 w-3 mr-1 text-orange-500" /> ADMIN</Badge>;
      case 'GESTOR':
        return <Badge className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/10 border-indigo-500/20 font-bold text-[10px]"><Building2 className="h-3 w-3 mr-1 text-indigo-500" /> GESTOR</Badge>;
      case 'ANALISTA':
        return <Badge className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/10 border-blue-500/20 font-bold text-[10px]">ANALISTA</Badge>;
      case 'VENTAS':
        return <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20 font-bold text-[10px]">VENTAS</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-400 hover:bg-slate-500/10 border-slate-500/20 font-bold text-[10px]">{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <span className="text-sm font-medium tracking-wide">Cargando Usuarios y Roles...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Usuarios y Roles del Sistema"
        description="Administre las cuentas de los empleados, asigne roles y configure accesos a sucursales."
      />
      
      <div className="p-6 space-y-6">
        {/* Barra superior de filtros y acciones */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Buscar por nombre, apellidos o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-9 bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <Button
              onClick={fetchUsers}
              variant="outline"
              disabled={refreshing}
              className="h-10 border-slate-800 bg-slate-950 text-slate-400 hover:text-white rounded-xl flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </Button>
            <Button
              onClick={handleOpenCreateUser}
              className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/10"
            >
              <UserPlus className="h-4.5 w-4.5" />
              <span>Crear Usuario</span>
            </Button>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <th className="p-4 font-semibold">Nombre Completo</th>
                  <th className="p-4 font-semibold">Correo Electrónico</th>
                  <th className="p-4 font-semibold">Rol del Sistema</th>
                  <th className="p-4 font-semibold">Sucursal Asignada</th>
                  <th className="p-4 font-semibold text-center">Estado</th>
                  <th className="p-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No se encontraron usuarios registrados que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 uppercase">
                            {user.firstName ? user.firstName[0] : (user.email ? user.email[0] : 'U')}
                          </div>
                          <div>
                            <span className="font-semibold text-white text-sm block">
                              {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.name || 'Sin Nombre'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {user.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="p-4">{getRoleBadge(user.role)}</td>
                      <td className="p-4 text-slate-300">
                        {user.sucursalDefault ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="font-semibold text-white">{user.sucursalDefault.nombre}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No asignada</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {user.isActive ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20 font-semibold flex items-center gap-1 w-fit mx-auto">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Activo
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/10 border-rose-500/20 font-semibold flex items-center gap-1 w-fit mx-auto">
                            <XCircle className="h-3 w-3 text-rose-400" /> Inactivo
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            onClick={() => handleOpenEditUser(user)}
                            variant="ghost"
                            size="sm"
                            className="h-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 px-2.5 rounded-lg flex items-center gap-1"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </Button>
                          {user.isActive && user.email !== session?.user?.email && (
                            <Button
                              onClick={() => handleConfirmDeactivate(user)}
                              variant="ghost"
                              size="sm"
                              className="h-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 px-2.5 rounded-lg flex items-center gap-1"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              <span>Desactivar</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. MODALES DE ACCION */}

      {/* MODAL CREAR / EDITAR USUARIO */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-400" />
              {editingUser ? 'Editar Cuenta de Usuario' : 'Crear Cuenta de Usuario'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Complete los datos del empleado y asigne los permisos necesarios en el ERP.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUserSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-fname" className="text-xs font-semibold text-slate-300">Nombre(s)</Label>
                <Input
                  id="u-fname"
                  type="text"
                  value={uFirstName}
                  onChange={(e) => setUFirstName(e.target.value)}
                  placeholder="Ej. Juan"
                  className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-lname" className="text-xs font-semibold text-slate-300">Apellidos</Label>
                <Input
                  id="u-lname"
                  type="text"
                  value={uLastName}
                  onChange={(e) => setULastName(e.target.value)}
                  placeholder="Ej. Pérez Gómez"
                  className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-email" className="text-xs font-semibold text-slate-300">Correo Electrónico *</Label>
              <Input
                id="u-email"
                type="email"
                required
                value={uEmail}
                onChange={(e) => setUEmail(e.target.value)}
                placeholder="juan.perez@ferrecolors.com"
                className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-password" className="text-xs font-semibold text-slate-300">
                Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}
              </Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="u-password"
                  type="password"
                  required={!editingUser}
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  placeholder={editingUser ? "••••••••" : "Ingrese contraseña"}
                  className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 pl-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-role" className="text-xs font-semibold text-slate-300">Rol del Sistema *</Label>
                <select
                  id="u-role"
                  value={uRole}
                  onChange={(e) => setURole(e.target.value)}
                  className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="VENTAS">Ventas / POS</option>
                  <option value="GESTOR">Gestor de Cobranza</option>
                  <option value="ANALISTA">Analista</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPERADMIN">Super Administrador</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-branch" className="text-xs font-semibold text-slate-300">Sucursal Defecto</Label>
                <select
                  id="u-branch"
                  value={uSucursalId}
                  onChange={(e) => setUSucursalId(e.target.value)}
                  className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Ninguna / Matriz</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {editingUser && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="u-active"
                  type="checkbox"
                  checked={uIsActive}
                  onChange={(e) => setUIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="u-active" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Usuario Activo (Permitir iniciar sesión)
                </Label>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-slate-800/60 mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUserModal(false)}
                className="border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/20 px-5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Cuenta</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR DESACTIVACION */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-sm bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2 text-rose-500">
              <UserMinus className="h-6 w-6 text-rose-500" />
              Desactivar Usuario
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              ¿Está seguro de que desea desactivar este usuario? El usuario ya no podrá ingresar al ERP.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl my-3">
            <h4 className="text-sm font-bold text-white leading-none">
              {confirmTarget?.firstName || confirmTarget?.lastName ? `${confirmTarget.firstName || ''} ${confirmTarget.lastName || ''}`.trim() : confirmTarget?.name}
            </h4>
            <p className="text-xs font-mono text-slate-400 mt-1.5">{confirmTarget?.email}</p>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">Rol: {confirmTarget?.role}</p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 border-slate-800 bg-transparent text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExecuteDeactivate}
              disabled={deactivating}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/20"
            >
              {deactivating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Desactivando...</span>
                </>
              ) : (
                <span>Desactivar</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
