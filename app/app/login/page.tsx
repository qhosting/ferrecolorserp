
import { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { Building2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Login - FerrecolorsERP',
  description: 'Accede al sistema FerrecolorsERP',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">FerrecolorsERP</h1>
          <p className="text-gray-600 mt-2">Gestión integral de recursos empresariales</p>
        </div>
        
        <LoginForm />
        
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © 2026 Ferrecolors. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
