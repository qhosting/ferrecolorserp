
'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<
  ConfirmDialogVariant,
  { icon: React.ReactNode; iconBg: string; confirmBtn: string; border: string }
> = {
  danger: {
    icon: <Trash2 className="h-6 w-6 text-rose-500" />,
    iconBg: 'bg-rose-500/10',
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/30',
    border: 'border-rose-500/20',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
    iconBg: 'bg-amber-500/10',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/30',
    border: 'border-amber-500/20',
  },
  info: {
    icon: <HelpCircle className="h-6 w-6 text-blue-500" />,
    iconBg: 'bg-blue-500/10',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30',
    border: 'border-blue-500/20',
  },
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cfg = variantConfig[variant];

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  // Focus cancel button when opened for accessibility
  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div
        className={cn(
          'relative z-10 w-full max-w-sm rounded-2xl border bg-background shadow-2xl',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          cfg.border
        )}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className={cn('shrink-0 p-3 rounded-xl', cfg.iconBg)}>
              {cfg.icon}
            </div>
            <div className="pt-0.5">
              <h2
                id="confirm-dialog-title"
                className="text-base font-semibold text-foreground leading-snug"
              >
                {title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t my-4" />

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              ref={cancelRef}
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              {cancelLabel}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'flex-1 sm:flex-none shadow-md transition-all duration-150',
                cfg.confirmBtn
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Procesando...
                </span>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
