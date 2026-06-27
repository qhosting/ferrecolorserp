import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, firstName, lastName, name, currentPassword, newPassword } = body;

    if (action === 'update_profile') {
      const updatedUser = await prisma.user.update({
        where: { email: session.user.email! },
        data: {
          firstName,
          lastName,
          name: name || `${firstName} ${lastName}`.trim()
        },
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
        }
      });
      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === 'change_password') {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'La contraseña actual y la nueva son requeridas' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email! },
      });

      if (!user || !user.password) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { email: session.user.email! },
        data: {
          password: hashedPassword
        }
      });

      return NextResponse.json({ success: true, message: 'Contraseña cambiada exitosamente' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error al actualizar perfil/contraseña:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
