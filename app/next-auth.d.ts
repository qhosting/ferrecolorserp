
import "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      sucursal?: string | null;
      codigo?: string | null;
    };
  }

  interface User {
    role: UserRole;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    sucursal?: string | null;
    codigo?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    sucursal?: string | null;
    codigo?: string | null;
  }
}
