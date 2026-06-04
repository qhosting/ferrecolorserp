
// Definir tipos localmente para evitar problemas de importación de Prisma
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'ANALISTA' | 'GESTOR' | 'CLIENTE' | 'VENTAS';
export type Periodicidad = 'DIARIA' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'BIMENSUAL';
export type StatusCliente = 'ACTIVO' | 'INACTIVO' | 'MOROSO' | 'BLOQUEADO' | 'PROSPECTO';
export type StatusVenta = 'PENDIENTE' | 'CONFIRMADA' | 'ENTREGADA' | 'CANCELADA' | 'PAGADA';
export type TipoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTRO';

export interface User {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: UserRole;
  phone?: string | null;
  sucursal?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cliente {
  id: string;
  codigoCliente: string;
  contrato?: string | null;
  nombre: string;
  telefono1?: string | null;
  telefono2?: string | null;
  telefono3?: string | null;
  email?: string | null;
  calle?: string | null;
  numeroExterior?: string | null;
  numeroInterior?: string | null;
  colonia?: string | null;
  municipio?: string | null;
  estado?: string | null;
  codigoPostal?: string | null;
  latitud?: string | null;
  longitud?: string | null;
  saldoActual: number;
  pagosPeriodicos: number;
  periodicidad: Periodicidad;
  diaCobro?: string | null;
  diaPago?: string | null;
  statusCuenta?: string | null;
  limiteCredito: number;
  empleo?: string | null;
  aval?: string | null;
  status: StatusCliente;
  gestorId?: string | null;
  vendedorId?: string | null;
  fechaAlta: Date;
  ultimaActualizacion: Date;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  marca?: string | null;
  modelo?: string | null;
  codigoBarras?: string | null;
  presentacion?: string | null;
  contenido?: string | null;
  peso?: number | null;
  dimensiones?: string | null;
  color?: string | null;
  talla?: string | null;
  precio1: number;
  precio2: number;
  precio3: number;
  precio4: number;
  precio5: number;
  etiquetaPrecio1: string;
  etiquetaPrecio2: string;
  etiquetaPrecio3: string;
  etiquetaPrecio4: string;
  etiquetaPrecio5: string;
  precioCompra: number;
  porcentajeGanancia: number;
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  unidadMedida: string;
  pasillo?: string | null;
  estante?: string | null;
  nivel?: string | null;
  proveedorPrincipal?: string | null;
  tiempoEntrega?: number | null;
  fechaVencimiento?: Date | null;
  lote?: string | null;
  requiereReceta: boolean;
  controlado: boolean;
  imagen?: string | null;
  imagenes: string[];
  isActive: boolean;
  destacado: boolean;
  oferta: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Venta {
  id: string;
  numeroVenta: string;
  clienteId: string;
  vendedorId: string;
  subtotal: number;
  iva: number;
  descuento: number;
  total: number;
  anticipo: number;
  saldo: number;
  periodicidadPago: Periodicidad;
  numeroPagos: number;
  montoPago: number;
  status: StatusVenta;
  fechaVenta: Date;
  fechaVencimiento?: Date | null;
  observaciones?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pago {
  id: string;
  clienteId: string;
  ventaId?: string | null;
  gestorId?: string | null;
  referencia: string;
  monto: number;
  tipoPago: TipoPago;
  fechaPago: Date;
  fechaHora: Date;
  latitud?: string | null;
  longitud?: string | null;
  sucursal?: string | null;
  verificado: boolean;
  sincronizado: boolean;
  deviceImei?: string | null;
}

export interface DashboardStats {
  totalClientes: number;
  clientesActivos: number;
  ventasHoy: number;
  cobrosHoy: number;
  saldoPendiente: number;
  ventasMes: number;
  cobrosMes: number;
  productosStock: number;
  totalProductos: number;
  productosActivos: number;
  categorias: number;
  marcas: number;
}

export interface ProductFilters {
  search: string;
  categoria: string;
  marca: string;
  stockStatus: string;
  priceRange: { min: number; max: number };
  destacado: boolean;
  oferta: boolean;
  activos: boolean;
}

export interface Permissions {
  [key: string]: {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };
}

export const RolePermissions: Record<UserRole, Permissions> = {
  SUPERADMIN: {
    dashboard: { read: true, create: false, update: false, delete: false },
    usuarios: { read: true, create: true, update: true, delete: true },
    clientes: { read: true, create: true, update: true, delete: true },
    productos: { read: true, create: true, update: true, delete: true },
    ventas: { read: true, create: true, update: true, delete: true },
    cobranza: { read: true, create: true, update: true, delete: true },
    almacen: { read: true, create: true, update: true, delete: true },
    reportes: { read: true, create: true, update: true, delete: false },
    configuracion: { read: true, create: true, update: true, delete: false },
  },
  ADMIN: {
    dashboard: { read: true, create: false, update: false, delete: false },
    usuarios: { read: true, create: true, update: true, delete: false },
    clientes: { read: true, create: true, update: true, delete: false },
    productos: { read: true, create: true, update: true, delete: false },
    ventas: { read: true, create: true, update: true, delete: false },
    cobranza: { read: true, create: true, update: true, delete: false },
    almacen: { read: true, create: true, update: true, delete: false },
    reportes: { read: true, create: true, update: true, delete: false },
    configuracion: { read: true, create: false, update: false, delete: false },
  },
  ANALISTA: {
    dashboard: { read: true, create: false, update: false, delete: false },
    usuarios: { read: true, create: false, update: false, delete: false },
    clientes: { read: true, create: false, update: false, delete: false },
    productos: { read: true, create: false, update: false, delete: false },
    ventas: { read: true, create: false, update: false, delete: false },
    cobranza: { read: true, create: false, update: false, delete: false },
    almacen: { read: true, create: false, update: false, delete: false },
    reportes: { read: true, create: true, update: true, delete: false },
    configuracion: { read: true, create: false, update: false, delete: false },
  },
  GESTOR: {
    dashboard: { read: true, create: false, update: false, delete: false },
    usuarios: { read: false, create: false, update: false, delete: false },
    clientes: { read: true, create: true, update: true, delete: false },
    productos: { read: true, create: false, update: false, delete: false },
    ventas: { read: true, create: false, update: false, delete: false },
    cobranza: { read: true, create: true, update: true, delete: false },
    almacen: { read: false, create: false, update: false, delete: false },
    reportes: { read: true, create: false, update: false, delete: false },
    configuracion: { read: false, create: false, update: false, delete: false },
  },
  VENTAS: {
    dashboard: { read: true, create: false, update: false, delete: false },
    usuarios: { read: false, create: false, update: false, delete: false },
    clientes: { read: true, create: true, update: true, delete: false },
    productos: { read: true, create: false, update: false, delete: false },
    ventas: { read: true, create: true, update: true, delete: false },
    cobranza: { read: true, create: false, update: false, delete: false },
    almacen: { read: true, create: false, update: false, delete: false },
    reportes: { read: true, create: false, update: false, delete: false },
    configuracion: { read: false, create: false, update: false, delete: false },
  },
  CLIENTE: {
    dashboard: { read: false, create: false, update: false, delete: false },
    usuarios: { read: false, create: false, update: false, delete: false },
    clientes: { read: false, create: false, update: false, delete: false },
    productos: { read: true, create: false, update: false, delete: false },
    ventas: { read: true, create: false, update: false, delete: false },
    cobranza: { read: true, create: false, update: false, delete: false },
    almacen: { read: false, create: false, update: false, delete: false },
    reportes: { read: false, create: false, update: false, delete: false },
    configuracion: { read: false, create: false, update: false, delete: false },
  },
};
