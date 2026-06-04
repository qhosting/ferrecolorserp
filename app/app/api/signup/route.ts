
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/types";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, phone, role = "CLIENTE" } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El usuario ya existe" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Validate role
    const validRoles = ['SUPERADMIN', 'ADMIN', 'ANALISTA', 'GESTOR', 'CLIENTE', 'VENTAS'];
    const userRole = validRoles.includes(role) ? role : 'CLIENTE';

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: userRole as UserRole,
        name: `${firstName || ''} ${lastName || ''}`.trim() || null,
      }
    });

    // Don't return password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        message: "Usuario creado exitosamente",
        user: userWithoutPassword 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
