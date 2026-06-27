import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        sucursalDefaultId: true,
        sucursalDefault: {
          select: {
            id: true,
            nombre: true
          }
        }
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    // Solo usuarios con rol ADMIN o SUPERADMIN pueden crear usuarios
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    });

    if (!currentUser || !['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) {
      return new NextResponse("Sin permisos", { status: 403 });
    }

    const body = await req.json();
    const { email, password, name, firstName, lastName, role, isActive, sucursalDefaultId } = body;

    if (!email || !password || !role) {
      return new NextResponse("Faltan campos obligatorios (email, password, role)", { status: 400 });
    }

    // Verificar si el correo ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return new NextResponse("El correo ya está registrado", { status: 400 });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
        firstName: firstName || null,
        lastName: lastName || null,
        role,
        isActive: isActive !== undefined ? isActive : true,
        sucursalDefaultId: sucursalDefaultId || null
      },
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

    return NextResponse.json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
