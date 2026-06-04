import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Buscar clientes
    const where: any = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigoCliente: { contains: search, mode: 'insensitive' } }
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        ventas: {
          include: {
            pagares: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const now = new Date();

    const scoringData = clientes.map(cliente => {
      // 1. Recopilar todos los pagarés
      const todosLosPagares = cliente.ventas.flatMap(v => v.pagares);
      
      const totalPagaresCount = todosLosPagares.length;
      
      const pagaresVencidos = todosLosPagares.filter(p => {
        const isOverdue = new Date(p.fechaVencimiento) < now;
        return (p.estatus === 'VENCIDO' || (isOverdue && p.estatus !== 'PAGADO' && p.estatus !== 'CANCELADO'));
      });

      const pagaresVencidosCount = pagaresVencidos.length;
      
      const totalMontoVencido = pagaresVencidos.reduce((sum, p) => sum + (p.monto - p.montoPagado), 0);
      
      // 2. Uso de límite de crédito
      let usoLimitePorcentaje = 0;
      if (cliente.limiteCredito > 0) {
        usoLimitePorcentaje = (cliente.saldoActual / cliente.limiteCredito) * 100;
      }

      // 3. Algoritmo de Puntuación Crediticia (0-100)
      let score = 100;

      // Penalización por uso de límite
      if (usoLimitePorcentaje > 100) {
        score -= 35; // Sobre-girado
      } else if (usoLimitePorcentaje > 80) {
        score -= 20; // Uso alto
      } else if (usoLimitePorcentaje > 50) {
        score -= 10; // Uso moderado-alto
      }

      // Penalización por pagarés vencidos
      const penalizacionPagares = pagaresVencidosCount * 15;
      score -= Math.min(penalizacionPagares, 50); // Máximo 50 puntos de castigo por impagos

      // Penalización por estado de cliente
      if (cliente.status === 'MOROSO') {
        score -= 30;
      } else if (cliente.status === 'BLOQUEADO') {
        score -= 50;
      }

      // Antigüedad (más de 180 días con buen historial suma +10)
      const diffTime = Math.abs(now.getTime() - new Date(cliente.fechaAlta).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 180 && pagaresVencidosCount === 0) {
        score += 10;
      }

      // Capped
      score = Math.max(0, Math.min(100, score));

      // Determinar perfil de riesgo
      let riesgo = 'BAJO';
      let colorClass = 'bg-emerald-500';
      if (score < 50) {
        riesgo = 'ALTO';
        colorClass = 'bg-rose-500';
      } else if (score < 75) {
        riesgo = 'MEDIO';
        colorClass = 'bg-amber-500';
      }

      return {
        id: cliente.id,
        codigoCliente: cliente.codigoCliente,
        nombre: cliente.nombre,
        saldoActual: cliente.saldoActual,
        limiteCredito: cliente.limiteCredito,
        usoLimitePorcentaje,
        pagaresVencidosCount,
        totalMontoVencido,
        totalPagaresCount,
        score,
        riesgo,
        colorClass,
        status: cliente.status,
        fechaAlta: cliente.fechaAlta
      };
    });

    return NextResponse.json({ scoring: scoringData });

  } catch (error) {
    console.error('Error fetching scoring data:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
}
