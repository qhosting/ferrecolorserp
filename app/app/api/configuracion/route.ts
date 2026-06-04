
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const configuracion = await prisma.configuracion.findFirst();
    
    if (!configuracion) {
      // Crear configuración por defecto
      const nuevaConfig = await prisma.configuracion.create({
        data: {
          nombreEmpresa: 'Ferre Colors',
          colorPrimario: '#3B82F6',
          colorSecundario: '#10B981',
          configJson: {
            monedaDefecto: 'MXN',
            formatoFecha: 'dd/MM/yyyy',
            decimalesPrecios: 2,
            iva: 16,
            configuracionFacturacion: {
              serie: 'A',
              folio: 1,
              lugarExpedicion: '',
              regimenFiscal: '',
            },
            configuracionCobranza: {
              diasGraciaDefecto: 0,
              tasaInteresDefecto: 3.0,
              recordatoriosPagos: true,
              diasRecordatorio: [7, 3, 1],
            },
            configuracionInventario: {
              alertasStockBajo: true,
              actualizacionAutomatica: true,
              controloLotes: false,
              controloVencimientos: false,
            },
            configuracionNotificaciones: {
              email: true,
              sms: false,
              whatsapp: false,
            },
            integraciones: {
              contabilidad: {
                activa: false,
                proveedor: '',
                apiKey: '',
                configuracion: {},
              },
              facturacion: {
                activa: false,
                pac: '',
                apiKey: '',
                certificados: {},
              },
              pagos: {
                openpay: {
                  activa: false,
                  merchantId: '',
                  publicKey: '',
                  privateKey: '',
                },
                stripe: {
                  activa: false,
                  publicKey: '',
                  secretKey: '',
                },
              },
            },
          },
        },
      });
      return NextResponse.json(nuevaConfig);
    }

    return NextResponse.json(configuracion);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'SUPERADMIN' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    
    let configuracion = await prisma.configuracion.findFirst();
    
    if (!configuracion) {
      configuracion = await prisma.configuracion.create({ data });
    } else {
      configuracion = await prisma.configuracion.update({
        where: { id: configuracion.id },
        data,
      });
    }

    return NextResponse.json(configuracion);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
