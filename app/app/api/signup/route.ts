
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/types";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { key: 'signup', limit: 5, windowMs: 60_000 });
    if (limited) return limited;

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

    // Validate and restrict role assignment
    const validRoles = ['SUPERADMIN', 'ADMIN', 'ANALISTA', 'GESTOR', 'CLIENTE', 'VENTAS'];
    let userRole = 'CLIENTE';

    // Count existing users to allow the first user to be ADMIN/SUPERADMIN
    const totalUsers = await prisma.user.count();

    if (totalUsers === 0) {
      // First user in system can choose their role
      userRole = validRoles.includes(role) ? role : 'SUPERADMIN';
    } else {
      // If there are users, require active admin/superadmin session to assign special roles
      const session = await getServerSession(authOptions);
      if (session && (session.user.role === 'SUPERADMIN' || session.user.role === 'ADMIN')) {
        userRole = validRoles.includes(role) ? role : 'CLIENTE';
      } else {
        userRole = 'CLIENTE'; // Force default CLIENTE for self-registration/non-admins
      }
    }

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
