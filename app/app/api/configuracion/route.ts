
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ContpaqiClient } from '@/lib/contpaqi-client';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let configuracion = await prisma.configuracion.findFirst();
    
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
      configuracion = nuevaConfig;
    }

    // Fetch real company details from CONTPAQi API to keep it synchronized without mocks
    try {
      const contpaqi = ContpaqiClient.getInstance();
      const contpaqiInfo = await contpaqi.getEmpresaInfo();
      if (contpaqiInfo) {
        configuracion.nombreEmpresa = contpaqiInfo.nombreEmpresa || configuracion.nombreEmpresa;
        configuracion.rfc = contpaqiInfo.rfc || configuracion.rfc;
        configuracion.direccion = contpaqiInfo.direccionCompleta || configuracion.direccion;
        if (contpaqiInfo.telefono) {
          configuracion.telefono = contpaqiInfo.telefono || configuracion.telefono;
        }
        if (contpaqiInfo.email) {
          configuracion.email = contpaqiInfo.email || configuracion.email;
        }

        // Merge régimen fiscal and lugar de expedición (ZIP code)
        let configJsonObj = configuracion.configJson as any;
        if (!configJsonObj) {
          configJsonObj = {};
        } else if (typeof configJsonObj === 'string') {
          configJsonObj = JSON.parse(configJsonObj);
        }

        if (!configJsonObj.configuracionFacturacion) {
          configJsonObj.configuracionFacturacion = {};
        }

        configJsonObj.configuracionFacturacion.regimenFiscal = 
          contpaqiInfo.regimenFiscal || configJsonObj.configuracionFacturacion.regimenFiscal;
        configJsonObj.configuracionFacturacion.lugarExpedicion = 
          contpaqiInfo.codigoPostal || configJsonObj.configuracionFacturacion.lugarExpedicion;

        configuracion.configJson = configJsonObj;
      }
    } catch (error) {
      console.warn('[Configuración] No se pudo obtener la información real de la empresa desde CONTPAQi API:', error);
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
