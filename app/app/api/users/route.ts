
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    // Solo usuarios con rol ADMIN o SUPERADMIN pueden ver la lista completa de usuarios
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    });

    if (!currentUser || !['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) {
      return new NextResponse("Sin permisos", { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: ['GESTOR', 'VENTAS', 'ADMIN', 'SUPERADMIN']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
