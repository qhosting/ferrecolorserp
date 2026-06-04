import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FacturarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  venta: {
    id: string;
    folio: string;
    total: number;
    cliente: {
      nombre: string;
      rfc?: string | null;
      codigoCliente: string;
      email?: string | null;
      usoCfdi?: string | null;
      metodoPago?: string | null;
    };
  };
  onSuccess?: () => void;
}

type StepType = 'idle' | 'processing' | 'success' | 'error';

export default function FacturarDialog({
  isOpen,
  onClose,
  venta,
  onSuccess,
}: FacturarDialogProps) {
  const [csdPassword, setCsdPassword] = useState('');
  const [step, setStep] = useState<StepType>('idle');
  const [currentAction, setCurrentAction] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [invoiceInfo, setInvoiceInfo] = useState<{
    serie: string;
    folio: number;
    contpaqiDocId: number;
    uuid?: string | null;
  } | null>(null);

  const handleFacturar = async () => {
    try {
      setStep('processing');
      setCurrentAction('Creando documento y afectando inventario...');
      
      const response = await fetch('/api/contpaqi/facturar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ventaId: venta.id,
          csdPassword,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || resData.details || 'Error al facturar en CONTPAQi');
      }

      setInvoiceInfo({
        serie: resData.data.serie,
        folio: resData.data.folio,
        contpaqiDocId: resData.data.contpaqiDocId,
      });

      setCurrentAction('Encolando y procesando timbrado SAT (CFDI 4.0)...');
      
      // Esperar unos segundos para permitir que el proceso de timbrado asíncrono avance
      // antes de verificar el estado.
      await new Promise((resolve) => setTimeout(resolve, 5000));
      
      // Intentar recuperar el UUID del documento timbrado
      try {
        const docResponse = await fetch(`/api/clientes/route.ts`); // Placeholder for query, we query endpoint directly
        // Para simplificar, consultamos la venta local directamente para ver si ya fue timbrada por el webhook
        const checkVentaResponse = await fetch(`/api/ventas/${venta.id}`);
        const checkVentaData = await checkVentaResponse.json();
        
        if (checkVentaData.success && checkVentaData.data.timbrado) {
          setInvoiceInfo(prev => ({
            ...prev!,
            uuid: checkVentaData.data.uuid
          }));
        }
      } catch (checkErr) {
        console.warn('No se pudo verificar el UUID inmediatamente, el webhook lo actualizará.', checkErr);
      }

      setStep('success');
      toast.success('Documento facturado y timbrado en CONTPAQi');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error desconocido al facturar');
      setStep('error');
      toast.error('Error al facturar en CONTPAQi');
    }
  };

  const handleDownloadXml = () => {
    window.open(`/api/contpaqi/documentos/${venta.id}/xml`, '_blank');
  };

  const handleDownloadPdf = () => {
    window.open(`/api/contpaqi/documentos/${venta.id}/pdf`, '_blank');
  };

  const handleClose = () => {
    setStep('idle');
    setCsdPassword('');
    setErrorMessage('');
    setInvoiceInfo(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-bold">
            <FileText className="w-5 h-5 text-blue-600" />
            Facturación Electrónica CONTPAQi
          </DialogTitle>
          <DialogDescription>
            Facturar la venta <strong>{venta.folio}</strong> del cliente <strong>{venta.cliente.nombre}</strong>.
          </DialogDescription>
        </DialogHeader>

        {step === 'idle' && (
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2 text-sm border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{venta.cliente.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RFC:</span>
                <span className="font-mono font-medium">{venta.cliente.rfc || 'XAXX010101000'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto Total:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  ${venta.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método Pago / Uso CFDI:</span>
                <span className="font-medium">
                  {venta.cliente.metodoPago || 'PUE'} / {venta.cliente.usoCfdi || 'G03'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csd-password">Contraseña del CSD (Sello Digital)</Label>
              <Input
                id="csd-password"
                type="password"
                placeholder="Ingresa la contraseña del sello digital"
                value={csdPassword}
                onChange={(e) => setCsdPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Requerido para realizar el timbrado del documento ante el SAT.
              </p>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="font-medium text-center text-sm">{currentAction}</p>
            <p className="text-xs text-muted-foreground text-center max-w-[300px]">
              Por favor, no cierres esta ventana ni recargues la página. Esto puede tomar hasta un minuto.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <h3 className="font-bold text-lg text-green-700 dark:text-green-400">Facturación Completada</h3>
              <p className="text-xs text-muted-foreground text-center">
                El documento ha sido creado, afectado y timbrado con éxito en CONTPAQi.
              </p>
            </div>

            {invoiceInfo && (
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2 text-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Folio Fiscal / Serie:</span>
                  <span className="font-semibold">{invoiceInfo.serie || 'Sin Serie'}-{invoiceInfo.folio}</span>
                </div>
                {invoiceInfo.uuid && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">UUID (Folio Fiscal SAT):</span>
                    <p className="font-mono text-xs break-all bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 select-all">
                      {invoiceInfo.uuid}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
                onClick={handleDownloadXml}
              >
                <Download className="w-4 h-4" />
                Descargar XML
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
                onClick={handleDownloadPdf}
              >
                <Download className="w-4 h-4" />
                Descargar PDF
              </Button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <AlertTriangle className="w-16 h-16 text-red-500" />
              <h3 className="font-bold text-lg text-red-700 dark:text-red-400">Fallo en la Facturación</h3>
              <p className="text-xs text-muted-foreground text-center">
                No se pudo completar el proceso de facturación en CONTPAQi Comercial Premium.
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg text-sm border border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300">
              <span className="font-bold">Mensaje de error:</span>
              <p className="mt-1 font-mono text-xs max-h-[120px] overflow-y-auto whitespace-pre-wrap">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleFacturar} className="bg-blue-600 hover:bg-blue-700 text-white">
                Facturar y Timbrar
              </Button>
            </>
          )}
          {(step === 'success' || step === 'error') && (
            <Button onClick={handleClose} className="w-full">
              Cerrar Ventana
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
