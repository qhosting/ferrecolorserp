import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  syncClienteToContpaqi,
  syncClienteFromContpaqi,
  syncAllClientesFromContpaqi,
} from '@/lib/contpaqi-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['ADMIN', 'SUPERADMIN', 'ANALISTA'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'No autorizado o permisos insuficientes' }, { status: 401 });
    }

    const body = await request.json();
    const { accion, id } = body; // id = codigoCliente para pull, o id de Prisma para push

    if (!accion || !['pull', 'push'].includes(accion)) {
      return NextResponse.json({ error: 'Acción no válida o no proporcionada. Use pull o push' }, { status: 400 });
    }

    if (accion === 'pull') {
      if (id) {
        const success = await syncClienteFromContpaqi(id);
        if (success) {
          return NextResponse.json({ success: true, message: `Cliente ${id} importado exitosamente desde CONTPAQi` });
        } else {
          return NextResponse.json({ success: false, error: `Error al importar cliente ${id}` }, { status: 500 });
        }
      } else {
        const results = await syncAllClientesFromContpaqi();
        return NextResponse.json({
          success: true,
          message: 'Sincronización masiva de clientes completada',
          data: results,
        });
      }
    } else {
      // push
      if (!id) {
        return NextResponse.json({ error: 'Se requiere el ID local del cliente para realizar push' }, { status: 400 });
      }

      const success = await syncClienteToContpaqi(id);
      if (success) {
        return NextResponse.json({ success: true, message: `Cliente enviado exitosamente a CONTPAQi` });
      } else {
        return NextResponse.json({ success: false, error: `Error al exportar cliente a CONTPAQi. Revise los SyncLogs.` }, { status: 500 });
      }
    }
  } catch (error: any) {
    console.error('Error synchronizing clients:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
