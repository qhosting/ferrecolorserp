import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    const userId = params.id;

    // Solo ADMIN o SUPERADMIN pueden modificar roles y estados
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    });

    if (!currentUser || !['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) {
      return new NextResponse("Sin permisos", { status: 403 });
    }

    const body = await req.json();
    const { email, password, name, firstName, lastName, role, isActive, sucursalDefaultId } = body;

    // Obtener el usuario a editar
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return new NextResponse("Usuario no encontrado", { status: 444 });
    }

    // Preparar campos a actualizar
    const updateData: any = {
      name: name || `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
      firstName: firstName !== undefined ? firstName : targetUser.firstName,
      lastName: lastName !== undefined ? lastName : targetUser.lastName,
      role: role || targetUser.role,
      isActive: isActive !== undefined ? isActive : targetUser.isActive,
      sucursalDefaultId: sucursalDefaultId !== undefined ? sucursalDefaultId : targetUser.sucursalDefaultId
    };

    // Si se envía email y es distinto, verificar duplicados
    if (email && email !== targetUser.email) {
      const emailDup = await prisma.user.findUnique({
        where: { email }
      });
      if (emailDup) {
        return new NextResponse("El correo ya está registrado por otro usuario", { status: 400 });
      }
      updateData.email = email;
    }

    // Si se envía contraseña, encriptar
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        sucursalDefaultId: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    const userId = params.id;

    // Solo ADMIN o SUPERADMIN pueden desactivar usuarios
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    });

    if (!currentUser || !['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) {
      return new NextResponse("Sin permisos", { status: 403 });
    }

    // No permitir que un usuario se desactive a sí mismo
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return new NextResponse("Usuario no encontrado", { status: 404 });
    }

    if (targetUser.email === session.user.email) {
      return new NextResponse("No puedes desactivar tu propio usuario", { status: 400 });
    }

    // Soft delete: Cambiar a inactivo
    const deactivatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        isActive: true
      }
    });

    return NextResponse.json(deactivatedUser);
  } catch (error) {
    console.error("Error deactivating user:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
