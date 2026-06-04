
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Simulación de conexión a base de datos MySQL
// En producción, aquí iría la conexión real a MySQL con las credenciales proporcionadas
const dbConfig = {
  host: 'localhost',
  user: 'mueblesdaso_cob',
  password: 'B4Dl6VlHDo',
  database: 'mueblesdaso_cob'
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const pagoData = await request.json();
    
    // Validar datos requeridos
    const requiredFields = [
      'cod_cliente', 
      'nombre_ccliente', 
      'montop', 
      'codigo_gestor'
    ];
    
    for (const field of requiredFields) {
      if (!pagoData[field]) {
        return NextResponse.json(
          { error: `Campo requerido: ${field}` },
          { status: 400 }
        );
      }
    }

    // Preparar datos del pago según estructura de la tabla pagos
    const pago = {
      fechap: new Date().toISOString().split('T')[0],
      fechahora: new Date().toISOString(),
      cod_cliente: pagoData.cod_cliente,
      nombre_ccliente: pagoData.nombre_ccliente,
      ref_pago: pagoData.ref_pago || 'Pago móvil',
      montop: parseFloat(pagoData.montop),
      codigo_gestor: pagoData.codigo_gestor,
      sucursal: 'PC QUERETARO',
      periodicidad_cliente: pagoData.periodicidad_cliente,
      dia_cobro: pagoData.dia_cobro,
      latitud: pagoData.latitud || '',
      longitud: pagoData.longitud || '',
      tel1_cliente: pagoData.tel1_cliente || '',
      posp: pagoData.posp || '',
      saldo_actualcli: pagoData.saldo_actualcli || '0',
      tipopag: 'GESTOR',
      mora: parseFloat(pagoData.mora) || 0,
      verificado: '',
      m_recuperado: '',
      descargado: 0,
      gcob: 0,
      imei: 0
    };

    // Aquí iría la inserción real a MySQL
    // const mysql = require('mysql2/promise');
    // const connection = await mysql.createConnection(dbConfig);
    // const query = `INSERT INTO pagos SET ?`;
    // const [result] = await connection.execute(query, [pago]);
    // await connection.end();

    // Por ahora simulamos la inserción exitosa
    console.log('Pago sincronizado:', pago);
    
    // También actualizar el saldo del cliente
    await actualizarSaldoCliente(pago.cod_cliente, pago.saldo_actualcli);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Pago sincronizado correctamente',
        pagoId: Date.now() // Simular ID generado
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error sincronizando pago:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

async function actualizarSaldoCliente(codCliente: string, nuevoSaldo: string) {
  try {
    // Aquí iría la actualización real del saldo en la tabla cat_clientes
    // const mysql = require('mysql2/promise');
    // const connection = await mysql.createConnection(dbConfig);
    // const query = `UPDATE cat_clientes SET saldo_actualcli = ? WHERE cod_cliente = ?`;
    // await connection.execute(query, [nuevoSaldo, codCliente]);
    // await connection.end();
    
    console.log(`Saldo actualizado para cliente ${codCliente}: ${nuevoSaldo}`);
  } catch (error) {
    console.error('Error actualizando saldo del cliente:', error);
    // No lanzar error aquí para no fallar toda la sincronización
  }
}
