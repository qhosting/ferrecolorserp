import { prisma } from './db';
import { ContpaqiClient } from './contpaqi-client';
import { ContpaqiCliente, ContpaqiProducto, CrearClienteRequest } from './contpaqi-types';
import { Periodicidad } from '@prisma/client';

const contpaqi = ContpaqiClient.getInstance();

// Helpers para mapeo de días a periodicidad
function diasToPeriodicidad(dias: number): Periodicidad {
  if (dias <= 1) return Periodicidad.DIARIA;
  if (dias <= 7) return Periodicidad.SEMANAL;
  if (dias <= 15) return Periodicidad.QUINCENAL;
  if (dias <= 30) return Periodicidad.MENSUAL;
  return Periodicidad.BIMENSUAL;
}

function periodicidadToDias(p: Periodicidad): number {
  switch (p) {
    case Periodicidad.DIARIA: return 1;
    case Periodicidad.SEMANAL: return 7;
    case Periodicidad.QUINCENAL: return 15;
    case Periodicidad.MENSUAL: return 30;
    case Periodicidad.BIMENSUAL: return 60;
    default: return 7;
  }
}

/**
 * Registra un log de sincronización
 */
async function registrarLog(
  tipo: string,
  accion: string,
  entidadId: string,
  status: 'success' | 'error' | 'pending',
  contpaqiRef?: string,
  detalles?: any,
  error?: string
) {
  try {
    await prisma.syncLog.create({
      data: {
        tipo,
        accion,
        entidadId,
        contpaqiRef: contpaqiRef || null,
        status,
        detalles: detalles || undefined,
        error: error || null,
      },
    });
  } catch (err) {
    console.error('Error al registrar SyncLog:', err);
  }
}

/**
 * Sincroniza un cliente del ERP a CONTPAQi
 */
export async function syncClienteToContpaqi(clienteId: string): Promise<boolean> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
  });

  if (!cliente) {
    throw new Error(`Cliente local con ID ${clienteId} no existe`);
  }

  const req: CrearClienteRequest = {
    codigo: cliente.codigoCliente,
    razonSocial: cliente.nombre,
    rfc: cliente.rfc || 'XAXX010101000',
    tipo: 1, // Cliente
    limiteCredito: cliente.limiteCredito,
    diasCredito: periodicidadToDias(cliente.periodicidad),
    usoCfdi: cliente.usoCfdi || 'G03',
    email: cliente.email || undefined,
    metodoPago: cliente.metodoPago || 'PUE',
    regimenFiscal: cliente.regimenFiscal || undefined,
    codigoPostalFiscal: cliente.codigoPostalFiscal || undefined,
    telefono1: cliente.telefono1 || undefined,
    calle: cliente.calle || undefined,
    numeroExterior: cliente.numeroExterior || undefined,
    numeroInterior: cliente.numeroInterior || undefined,
    colonia: cliente.colonia || undefined,
    codigoPostal: cliente.codigoPostal || undefined,
    municipio: cliente.municipio || undefined,
    estado: cliente.estado || undefined,
    pais: 'México',
  };

  try {
    await registrarLog('cliente', 'push', clienteId, 'pending');
    
    // Crear en CONTPAQi
    const res = await contpaqi.crearCliente(req);

    // Actualizar cliente local con el status de sincronización
    await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        contpaqiCodigo: res.codigo,
        contpaqiSyncAt: new Date(),
      },
    });

    await registrarLog('cliente', 'push', clienteId, 'success', res.codigo, res);
    return true;
  } catch (err: any) {
    await registrarLog('cliente', 'push', clienteId, 'error', undefined, undefined, err.message);
    console.error(`Error al sincronizar cliente ${clienteId} a CONTPAQi:`, err);
    return false;
  }
}

/**
 * Sincroniza un cliente individual desde CONTPAQi al ERP
 */
export async function syncClienteFromContpaqi(codigo: string): Promise<boolean> {
  try {
    const ext = await contpaqi.getCliente(codigo);
    if (!ext) return false;

    // Buscar si ya existe localmente
    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { contpaqiCodigo: ext.codigo },
          { codigoCliente: ext.codigo },
        ],
      },
    });

    const data = {
      codigoCliente: ext.codigo,
      contpaqiCodigo: ext.codigo,
      nombre: ext.razonSocial,
      rfc: ext.rfc,
      email: ext.email || null,
      limiteCredito: ext.limiteCredito || 0,
      periodicidad: diasToPeriodicidad(ext.diasCredito || 7),
      usoCfdi: ext.usoCfdi || 'G03',
      metodoPago: ext.metodoPago || 'PUE',
      cuentaPago: ext.cuentaPago || null,
      regimenFiscal: ext.regimenFiscal || null,
      codigoPostalFiscal: ext.codigoPostalFiscal || null,
      contpaqiSyncAt: new Date(),
    };

    if (clienteExistente) {
      await prisma.cliente.update({
        where: { id: clienteExistente.id },
        data,
      });
      await registrarLog('cliente', 'pull', clienteExistente.id, 'success', ext.codigo, ext);
    } else {
      const nuevoCliente = await prisma.cliente.create({
        data: {
          ...data,
          status: 'ACTIVO',
        },
      });
      await registrarLog('cliente', 'pull', nuevoCliente.id, 'success', ext.codigo, ext);
    }

    return true;
  } catch (err: any) {
    console.error(`Error al sincronizar cliente ${codigo} desde CONTPAQi:`, err);
    return false;
  }
}

/**
 * Sincroniza un producto individual desde CONTPAQi al ERP
 */
export async function syncProductoFromContpaqi(codigo: string): Promise<boolean> {
  try {
    const ext = await contpaqi.getProducto(codigo);
    if (!ext) return false;

    // Buscar si existe localmente
    const prodExistente = await prisma.producto.findFirst({
      where: {
        OR: [
          { contpaqiCodigo: ext.codigo },
          { codigo: ext.codigo },
        ],
      },
    });

    const data = {
      codigo: ext.codigo,
      contpaqiCodigo: ext.codigo,
      nombre: ext.nombre,
      descripcion: ext.descripcion || ext.nombre,
      precio1: ext.precio1 || 0,
      precio2: ext.precio2 || 0,
      precio3: ext.precio3 || 0,
      precio4: ext.precio4 || 0,
      precio5: ext.precio5 || 0,
      precioCompra: ext.costoUltimo || 0,
      claveSat: ext.claveSat || null,
      claveUnidadSat: ext.claveUnidadSat || 'H87', // PZA por defecto
      contpaqiSyncAt: new Date(),
    };

    if (prodExistente) {
      await prisma.producto.update({
        where: { id: prodExistente.id },
        data,
      });
      await registrarLog('producto', 'pull', prodExistente.id, 'success', ext.codigo, ext);
    } else {
      const nuevoProd = await prisma.producto.create({
        data: {
          ...data,
          isActive: true,
        },
      });

      // Inicializar StockSucursal para todas las sucursales activas
      let sucursales = await prisma.sucursal.findMany({
        where: { isActive: true }
      });

      if (sucursales.length === 0) {
        const defaultSucursal = await prisma.sucursal.create({
          data: {
            codigo: 'MATRIZ',
            nombre: 'Sucursal Matriz',
            esMatriz: true,
            listaPrecioDefecto: 1,
            impuestoIncluido: false
          }
        });
        sucursales = [defaultSucursal];
      }

      for (const suc of sucursales) {
        await prisma.stockSucursal.create({
          data: {
            sucursalId: suc.id,
            productoId: nuevoProd.id,
            stock: 0,
            stockMinimo: 0,
            stockMaximo: 1000
          }
        });
      }

      await registrarLog('producto', 'pull', nuevoProd.id, 'success', ext.codigo, ext);
    }

    return true;
  } catch (err: any) {
    console.error(`Error al sincronizar producto ${codigo} desde CONTPAQi:`, err);
    return false;
  }
}

/**
 * Importación masiva de clientes desde CONTPAQi
 */
export async function syncAllClientesFromContpaqi(): Promise<{ importados: number; fallidos: number }> {
  let importados = 0;
  let fallidos = 0;

  try {
    const clientesExt = await contpaqi.getClientes(1, 1); // Solo activos (1 = Alta en CONTPAQi)

    for (const ext of clientesExt) {
      const success = await syncClienteFromContpaqi(ext.codigo);
      if (success) {
        importados++;
      } else {
        fallidos++;
      }
    }
  } catch (err) {
    console.error('Error en syncAllClientesFromContpaqi:', err);
    throw err;
  }

  return { importados, fallidos };
}

/**
 * Importación masiva de productos desde CONTPAQi
 */
export async function syncAllProductosFromContpaqi(): Promise<{ importados: number; fallidos: number }> {
  let importados = 0;
  let fallidos = 0;

  try {
    const prodsExt = await contpaqi.getProductos();

    for (const ext of prodsExt) {
      const success = await syncProductoFromContpaqi(ext.codigo);
      if (success) {
        importados++;
      } else {
        fallidos++;
      }
    }
  } catch (err) {
    console.error('Error en syncAllProductosFromContpaqi:', err);
    throw err;
  }

  return { importados, fallidos };
}

/**
 * Importa los agentes de venta desde CONTPAQi
 */
export async function syncAllAgentesFromContpaqi(): Promise<{ importados: number }> {
  let importados = 0;

  try {
    const agentesExt = await contpaqi.getAgentes();

    for (const ext of agentesExt) {
      await prisma.agente.upsert({
        where: { codigo: ext.codigo },
        update: {
          nombre: ext.nombre,
          tipo: ext.tipo,
          contpaqiId: ext.id,
          isActive: true,
          syncAt: new Date(),
        },
        create: {
          contpaqiId: ext.id,
          codigo: ext.codigo,
          nombre: ext.nombre,
          tipo: ext.tipo,
          isActive: true,
        },
      });
      importados++;
    }
  } catch (err) {
    console.error('Error en syncAllAgentesFromContpaqi:', err);
    throw err;
  }

  return { importados };
}

/**
 * Importa almacenes desde CONTPAQi
 */
export async function syncAllAlmacenesFromContpaqi(): Promise<{ importados: number }> {
  let importados = 0;

  try {
    const almacenesExt = await contpaqi.getAlmacenes();

    for (const ext of almacenesExt) {
      const almacenLocal = await prisma.almacen.upsert({
        where: { codigo: ext.codigo },
        update: {
          nombre: ext.nombre,
          contpaqiId: ext.id,
          isActive: true,
          syncAt: new Date(),
        },
        create: {
          contpaqiId: ext.id,
          codigo: ext.codigo,
          nombre: ext.nombre,
          isActive: true,
        },
      });

      // Auto-crear Sucursal si el nombre contiene "SUCURSAL" y no existe
      const nombreLimpio = ext.nombre.trim();
      if (nombreLimpio.toUpperCase().includes('SUCURSAL')) {
        const sucursalExistente = await prisma.sucursal.findFirst({
          where: { almacenId: almacenLocal.id }
        });

        if (!sucursalExistente) {
          // Extraer un código de sucursal único
          let codigoSuc = nombreLimpio.toUpperCase().replace('SUCURSAL ', '').replace(/[^A-Z0-9]/g, '').substring(0, 10).trim();
          if (!codigoSuc) {
            codigoSuc = `SUC${ext.codigo.trim()}`;
          }

          // Asegurar que el código de sucursal sea único en la BD local
          const codigoDuplicado = await prisma.sucursal.findUnique({
            where: { codigo: codigoSuc }
          });
          if (codigoDuplicado) {
            codigoSuc = `${codigoSuc.substring(0, 7)}${Math.floor(Math.random() * 900 + 100)}`;
          }

          const nuevaSucursal = await prisma.sucursal.create({
            data: {
              codigo: codigoSuc,
              nombre: nombreLimpio,
              almacenId: almacenLocal.id,
              listaPrecioDefecto: 1,
              impuestoIncluido: true,
              esMatriz: nombreLimpio.toUpperCase().includes('MATRIZ'),
              isActive: true,
            }
          });

          // Inicializar StockSucursal para todos los productos existentes
          const todosProductos = await prisma.producto.findMany({
            select: { id: true }
          });

          for (const prod of todosProductos) {
            await prisma.stockSucursal.create({
              data: {
                sucursalId: nuevaSucursal.id,
                productoId: prod.id,
                stock: 0,
                stockMinimo: 0,
                stockMaximo: 1000
              }
            });
          }
        }
      }
      importados++;
    }
  } catch (err) {
    console.error('Error en syncAllAlmacenesFromContpaqi:', err);
    throw err;
  }

  return { importados };
}

/**
 * Sincroniza un proveedor individual desde CONTPAQi al ERP
 */
export async function syncProveedorFromContpaqi(codigo: string): Promise<boolean> {
  try {
    const ext = await contpaqi.getCliente(codigo);
    if (!ext) return false;

    // Buscar si ya existe localmente
    const provExistente = await prisma.proveedor.findFirst({
      where: {
        OR: [
          { contpaqiId: ext.id },
          { codigo: ext.codigo },
        ],
      },
    });

    const data = {
      contpaqiId: ext.id,
      codigo: ext.codigo,
      nombre: ext.razonSocial,
      rfc: ext.rfc,
      email: ext.email || null,
      limiteCredito: ext.limiteCredito || 0,
      diasCredito: ext.diasCredito || 0,
      isActive: ext.estatus === 0, // 0 = Activo en CONTPAQi
      syncAt: new Date(),
    };

    if (provExistente) {
      await prisma.proveedor.update({
        where: { id: provExistente.id },
        data,
      });
      await registrarLog('proveedor', 'pull', provExistente.id, 'success', ext.codigo, ext);
    } else {
      const nuevoProv = await prisma.proveedor.create({
        data,
      });
      await registrarLog('proveedor', 'pull', nuevoProv.id, 'success', ext.codigo, ext);
    }

    return true;
  } catch (err: any) {
    console.error(`Error al sincronizar proveedor ${codigo} desde CONTPAQi:`, err);
    return false;
  }
}

/**
 * Importación masiva de proveedores desde CONTPAQi
 */
export async function syncAllProveedoresFromContpaqi(): Promise<{ importados: number; fallidos: number }> {
  let importados = 0;
  let fallidos = 0;

  try {
    const provsExt = await contpaqi.getClientes(2, 1); // 2 = Proveedor, 1 = Alta/Activos

    for (const ext of provsExt) {
      const success = await syncProveedorFromContpaqi(ext.codigo);
      if (success) {
        importados++;
      } else {
        fallidos++;
      }
    }
  } catch (err) {
    console.error('Error en syncAllProveedoresFromContpaqi:', err);
    throw err;
  }

  return { importados, fallidos };
}
