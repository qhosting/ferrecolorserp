
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Email o contraseña incorrectos';
      case 'AccessDenied':
        return 'Acceso denegado';
      case 'Configuration':
        return 'Error de configuración del servidor';
      default:
        return 'Ocurrió un error durante la autenticación';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">
            Error de Autenticación
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {getErrorMessage(error)}
          </p>
          <Button asChild className="w-full">
            <Link href="/auth/signin">
              Intentar de nuevo
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
