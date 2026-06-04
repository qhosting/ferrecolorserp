import { z } from 'zod';

// Utility helper to format Zod errors
export function formatZodError(error: z.ZodError) {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return errors;
}

// Cliente Schema for updating
export const clienteUpdateSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  telefono1: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  telefono2: z.string().nullable().optional(),
  email: z.union([z.string().email('Email inválido'), z.literal(''), z.null()]).optional(),
  municipio: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  colonia: z.string().nullable().optional(),
  calle: z.string().nullable().optional(),
  numeroExterior: z.string().nullable().optional(),
  numeroInterior: z.string().nullable().optional(),
  codigoPostal: z.string().nullable().optional(),
  pagosPeriodicos: z.union([
    z.number().nonnegative('Los pagos periódicos no pueden ser negativos'),
    z.string().transform((val) => parseFloat(val) || 0)
  ]).optional(),
  periodicidad: z.enum(['DIARIA', 'SEMANAL', 'QUINCENAL', 'MENSUAL', 'BIMENSUAL']).optional(),
  status: z.enum(['ACTIVO', 'INACTIVO', 'MOROSO', 'BLOQUEADO', 'PROSPECTO']).optional(),
  diaCobro: z.string().nullable().optional(),
  gestorId: z.string().nullable().optional(),
  vendedorId: z.string().nullable().optional(),
  rfc: z.string().nullable().optional(),
  usoCfdi: z.string().nullable().optional(),
  metodoPago: z.string().nullable().optional(),
  regimenFiscal: z.string().nullable().optional(),
  codigoPostalFiscal: z.string().nullable().optional(),
});

// Producto Schemas
export const productoCreateSchema = z.object({
  codigo: z.string().min(1, 'El código de producto es requerido'),
  nombre: z.string().min(1, 'El nombre de producto es requerido'),
  descripcion: z.string().nullable().optional(),
  categoria: z.string().nullable().optional(),
  marca: z.string().nullable().optional(),
  modelo: z.string().nullable().optional(),
  codigoBarras: z.string().nullable().optional(),
  presentacion: z.string().nullable().optional(),
  contenido: z.string().nullable().optional(),
  peso: z.union([
    z.number().nullable(),
    z.string().transform((val) => (val ? parseFloat(val) : null))
  ]).optional(),
  dimensiones: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  talla: z.string().nullable().optional(),
  precio1: z.union([
    z.number().nonnegative('El precio 1 no puede ser negativo'),
    z.string().transform((val) => parseFloat(val) || 0)
  ]).optional(),
  precio2: z.union([
    z.number().nonnegative('El precio 2 no puede ser negativo'),
    z.string().transform((val) => parseFloat(val) || 0)
  ]).optional(),
  precio3: z.union([
    z.number().nonnegative('El precio 3 no puede ser negativo'),
    z.string().transform((val) => parseFloat(val) || 0)
  ]).optional(),
  precio4: z.union([
    z.number().nonnegative('El precio 4 no puede ser negativo'),
    z.string().transform((val) => parseFloat(val) || 0)
  ]).optional(),
  precio5: z.union([
    z.number().nonnegative('El precio 5 no puede ser negativo'),
    z.string().transform((val) => parseFloat(val) || 0)
  ]).optional(),
  etiquetaPrecio1: z.string().optional(),
  etiquetaPrecio2: z.string().optional(),
  etiquetaPrecio3: z.string().optional(),
  etiquetaPrecio4: z.string().optional(),
  etiquetaPrecio5: z.string().optional(),
  precioCompra: z.union([
    z.number().nonnegative('El precio de compra no puede ser negativo'),
    z.string().transform((val) => parseFloat(val) || 0)
  ]).optional(),
  porcentajeGanancia: z.union([
    z.number(),
    z.string().transform((val) => parseFloat(val) || 0)
  ]).optional(),
  stock: z.union([
    z.number().int().nonnegative('El stock no puede ser negativo'),
    z.string().transform((val) => parseInt(val) || 0)
  ]).optional(),
  stockMinimo: z.union([
    z.number().int().nonnegative('El stock mínimo no puede ser negativo'),
    z.string().transform((val) => parseInt(val) || 0)
  ]).optional(),
  stockMaximo: z.union([
    z.number().int().nonnegative('El stock máximo no puede ser negativo'),
    z.string().transform((val) => parseInt(val) || 1000)
  ]).optional(),
  unidadMedida: z.string().optional(),
  pasillo: z.string().nullable().optional(),
  estante: z.string().nullable().optional(),
  nivel: z.string().nullable().optional(),
  proveedorPrincipal: z.string().nullable().optional(),
  tiempoEntrega: z.union([
    z.number().int().nonnegative('El tiempo de entrega no puede ser negativo'),
    z.string().transform((val) => parseInt(val) || 0)
  ]).optional(),
  fechaVencimiento: z.union([
    z.string().transform((val) => (val ? new Date(val) : null)),
    z.date(),
    z.null()
  ]).optional(),
  lote: z.string().nullable().optional(),
  requiereReceta: z.boolean().optional(),
  controlado: z.boolean().optional(),
  imagen: z.string().nullable().optional(),
  imagenes: z.array(z.string()).optional(),
  destacado: z.boolean().optional(),
  oferta: z.boolean().optional(),
  isActive: z.boolean().optional(),
  claveSat: z.string().nullable().optional(),
  claveUnidadSat: z.string().nullable().optional(),
});

export const productoUpdateSchema = productoCreateSchema.partial();

// Movimiento de Inventario Schema
export const inventarioAjusteSchema = z.object({
  productoId: z.string().min(1, 'El ID de producto es requerido'),
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE'], {
    errorMap: () => ({ message: 'Tipo de movimiento inválido (ENTRADA, SALIDA o AJUSTE)' })
  }),
  cantidad: z.union([
    z.number().int().positive('La cantidad debe ser un número entero mayor a cero'),
    z.string().transform((val) => parseInt(val)).refine((val) => !isNaN(val) && val > 0, {
      message: 'La cantidad debe ser un número entero mayor a cero'
    })
  ]),
  motivo: z.string().min(1, 'El motivo del ajuste es requerido'),
  referencia: z.string().nullable().optional(),
});

// Cuenta por Pagar Abono Schema
export const cuentasPagarAbonoSchema = z.object({
  id: z.string().min(1, 'El ID de la cuenta por pagar es requerido'),
  montoAbono: z.union([
    z.number().positive('El monto del abono debe ser mayor a cero'),
    z.string().transform((val) => parseFloat(val)).refine((val) => !isNaN(val) && val > 0, {
      message: 'El monto del abono debe ser mayor a cero'
    })
  ])
});
