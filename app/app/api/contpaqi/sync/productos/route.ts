import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  syncProductoFromContpaqi,
  syncAllProductosFromContpaqi,
} from '@/lib/contpaqi-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['ADMIN', 'SUPERADMIN', 'ANALISTA'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'No autorizado o permisos insuficientes' }, { status: 401 });
    }

    const body = await request.json();
    const { accion, id } = body; // id = codigoProducto para pull

    if (!accion || accion !== 'pull') {
      return NextResponse.json({ error: 'Acción no válida o no proporcionada. Use pull' }, { status: 400 });
    }

    if (id) {
      const success = await syncProductoFromContpaqi(id);
      if (success) {
        return NextResponse.json({ success: true, message: `Producto ${id} importado exitosamente desde CONTPAQi` });
      } else {
        return NextResponse.json({ success: false, error: `Error al importar producto ${id}` }, { status: 500 });
      }
    } else {
      const results = await syncAllProductosFromContpaqi();
      return NextResponse.json({
        success: true,
        message: 'Sincronización masiva de productos completada',
        data: results,
      });
    }
  } catch (error: any) {
    console.error('Error synchronizing products:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
