
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener facturas electrónicas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const pac = searchParams.get('pac');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Datos simulados de facturas electrónicas
    const facturas = [
      {
        id: '1',
        uuid: 'A1B2C3D4-E5F6-7890-ABCD-123456789012',
        folio: '001',
        serie: 'F',
        fecha: '2024-09-19T10:00:00Z',
        cliente: {
          rfc: 'XAXX010101000',
          nombre: 'Cliente de Prueba S.A. de C.V.',
          email: 'cliente@empresa.com'
        },
        conceptos: [
          {
            claveProdServ: '50211503',
            descripcion: 'Servicio de consultoría',
            cantidad: 1,
            unidad: 'ACT',
            valorUnitario: 10000,
            importe: 10000
          }
        ],
        subtotal: 10000,
        iva: 1600,
        total: 11600,
        estado: 'TIMBRADA',
        pac: 'PAC-Principal',
        certificado: '20001000000300022762',
        xmlUrl: '/cfdi/F001.xml',
        pdfUrl: '/cfdi/F001.pdf',
        fechaTimbrado: '2024-09-19T10:05:00Z',
        createdAt: '2024-09-19T10:00:00Z',
        updatedAt: '2024-09-19T10:05:00Z'
      },
      {
        id: '2',
        uuid: null,
        folio: '002',
        serie: 'F',
        fecha: '2024-09-19T14:30:00Z',
        cliente: {
          rfc: 'XEXX010101000',
          nombre: 'Otro Cliente S.A.',
          email: 'otro@cliente.com'
        },
        conceptos: [
          {
            claveProdServ: '50211503',
            descripcion: 'Servicio de desarrollo',
            cantidad: 1,
            unidad: 'ACT',
            valorUnitario: 15000,
            importe: 15000
          }
        ],
        subtotal: 15000,
        iva: 2400,
        total: 17400,
        estado: 'PENDIENTE',
        pac: 'PAC-Principal',
        certificado: '20001000000300022762',
        xmlUrl: null,
        pdfUrl: null,
        fechaTimbrado: null,
        createdAt: '2024-09-19T14:30:00Z',
        updatedAt: '2024-09-19T14:30:00Z'
      }
    ];

    // Aplicar filtros
    let filteredFacturas = facturas;

    if (estado && estado !== 'all') {
      filteredFacturas = filteredFacturas.filter(f => f.estado === estado);
    }

    if (pac && pac !== 'all') {
      filteredFacturas = filteredFacturas.filter(f => f.pac === pac);
    }

    if (fechaInicio && fechaFin) {
      filteredFacturas = filteredFacturas.filter(f => {
        const fecha = new Date(f.fecha);
        return fecha >= new Date(fechaInicio) && fecha <= new Date(fechaFin);
      });
    }

    // Aplicar límite
    if (limit) {
      filteredFacturas = filteredFacturas.slice(0, limit);
    }

    // Estadísticas
    const estadisticas = {
      total: filteredFacturas.length,
      timbradas: filteredFacturas.filter(f => f.estado === 'TIMBRADA').length,
      pendientes: filteredFacturas.filter(f => f.estado === 'PENDIENTE').length,
      canceladas: filteredFacturas.filter(f => f.estado === 'CANCELADA').length,
      montoTotal: filteredFacturas.reduce((sum, f) => sum + f.total, 0),
      montoTimbrado: filteredFacturas
        .filter(f => f.estado === 'TIMBRADA')
        .reduce((sum, f) => sum + f.total, 0)
    };

    return NextResponse.json({
      facturas: filteredFacturas,
      estadisticas,
      message: 'Facturas obtenidas exitosamente'
    });

  } catch (error) {
    console.error('Error fetching facturas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva factura electrónica
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      clienteRfc,
      clienteNombre,
      clienteEmail,
      conceptos,
      observaciones
    } = body;

    // Validaciones básicas
    if (!clienteRfc || !clienteNombre || !conceptos || conceptos.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: clienteRfc, clienteNombre, conceptos' },
        { status: 400 }
      );
    }

    // Calcular totales
    const subtotal = conceptos.reduce((sum: number, item: any) => 
      sum + (item.cantidad * item.valorUnitario), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    // Generar folio consecutivo
    const folio = String(Date.now()).slice(-3);

    // Simulación de creación de factura
    const nuevaFactura = {
      id: Math.random().toString(36).substr(2, 9),
      uuid: null,
      folio,
      serie: 'F',
      fecha: new Date().toISOString(),
      cliente: {
        rfc: clienteRfc,
        nombre: clienteNombre,
        email: clienteEmail || ''
      },
      conceptos,
      subtotal,
      iva,
      total,
      estado: 'PENDIENTE',
      pac: 'PAC-Principal',
      certificado: '20001000000300022762',
      xmlUrl: null,
      pdfUrl: null,
      fechaTimbrado: null,
      observaciones: observaciones || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      factura: nuevaFactura,
      message: 'Factura creada exitosamente, lista para timbrar'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating factura:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
