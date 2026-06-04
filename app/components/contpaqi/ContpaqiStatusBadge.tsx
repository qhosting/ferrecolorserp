import React from 'react';
import { CheckCircle, AlertCircle, Clock, MinusCircle } from 'lucide-react';

interface ContpaqiStatusBadgeProps {
  sincronizado: boolean;
  codigo?: string | null;
  syncAt?: string | Date | null;
  error?: string | null;
}

export default function ContpaqiStatusBadge({
  sincronizado,
  codigo,
  syncAt,
  error,
}: ContpaqiStatusBadgeProps) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" title={error}>
        <AlertCircle className="w-3.5 h-3.5" />
        Error de Sincronización
      </span>
    );
  }

  if (sincronizado && codigo) {
    const formattedDate = syncAt
      ? new Date(syncAt).toLocaleDateString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
        title={`Código: ${codigo}${formattedDate ? ` - Sincronizado el: ${formattedDate}` : ''}`}
      >
        <CheckCircle className="w-3.5 h-3.5" />
        Sincronizado ({codigo})
      </span>
    );
  }

  if (sincronizado) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <CheckCircle className="w-3.5 h-3.5" />
        Sincronizado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
      <MinusCircle className="w-3.5 h-3.5" />
      No Sincronizado
    </span>
  );
}
