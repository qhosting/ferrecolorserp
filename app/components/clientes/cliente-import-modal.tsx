
'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'react-hot-toast';
import { 
  Upload, 
  FileText, 
  Download,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface ClienteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ImportResult {
  success: boolean;
  processed: number;
  errors: Array<{ row: number; error: string; }>;
  created: number;
  updated: number;
}

export function ClienteImportModal({ isOpen, onClose, onSuccess }: ClienteImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validar tipo de archivo
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast.error('Por favor selecciona un archivo CSV o Excel');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Por favor selecciona un archivo');
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/clientes/import', {
        method: 'POST',
        body: formData,
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No se pudo leer la respuesta');
      }

      // Leer la respuesta en chunks para mostrar progreso
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Simular progreso (esto es estimado, en producción podrías enviar headers de progreso)
        const estimatedProgress = Math.min(receivedLength / 1000, 90);
        setProgress(estimatedProgress);
      }

      // Concatenar chunks y parsear respuesta
      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      const resultText = new TextDecoder().decode(chunksAll);
      
      if (response.ok) {
        const importResult: ImportResult = JSON.parse(resultText);
        setResult(importResult);
        setProgress(100);
        
        if (importResult.success) {
          toast.success(`Importación completada: ${importResult.created} creados, ${importResult.updated} actualizados`);
          onSuccess?.();
        } else {
          toast.error(`Importación completada con errores: ${importResult.errors.length} errores`);
        }
      } else {
        throw new Error(resultText || 'Error en la importación');
      }
    } catch (error) {
      console.error('Error importing clients:', error);
      toast.error('Error al importar clientes: ' + (error as Error).message);
      setResult({
        success: false,
        processed: 0,
        errors: [{ row: 0, error: (error as Error).message }],
        created: 0,
        updated: 0
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `codigo_cliente,nombre,telefono1,telefono2,email,municipio,estado,colonia,calle,numero_exterior,numero_interior,codigo_postal,pagos_periodicos,periodicidad,status,dia_cobro,observaciones
CLI-001,Juan Pérez,555-1234,555-5678,juan@email.com,Guadalajara,Jalisco,Centro,Calle Principal,123,A,44100,500.00,SEMANAL,ACTIVO,LUNES,Cliente ejemplo
CLI-002,María García,555-9999,,maria@email.com,Zapopan,Jalisco,Providencia,Av. López,456,,45050,750.00,QUINCENAL,ACTIVO,VIERNES,`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_clientes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Clientes
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instrucciones */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Puedes importar clientes desde un archivo CSV o Excel. Descarga la plantilla para ver el formato requerido.
            </AlertDescription>
          </Alert>

          {/* Descargar plantilla */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla CSV
            </Button>
          </div>

          {/* Selección de archivo */}
          {!result && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">Seleccionar Archivo</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      ref={fileInputRef}
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      disabled={importing}
                    />
                  </div>

                  {file && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  )}

                  {importing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Importando...</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultados */}
          {result && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <h3 className="font-medium">
                      {result.success ? 'Importación Exitosa' : 'Importación con Errores'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{result.processed}</div>
                      <div className="text-sm text-gray-600">Procesados</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{result.created}</div>
                      <div className="text-sm text-gray-600">Creados</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{result.updated}</div>
                      <div className="text-sm text-gray-600">Actualizados</div>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Errores encontrados:</h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {result.errors.map((error, index) => (
                          <div key={index} className="text-sm bg-red-50 p-2 rounded">
                            <span className="font-medium">Fila {error.row}:</span> {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            {result ? (
              <>
                <Button variant="outline" onClick={resetImport}>
                  Importar Otro Archivo
                </Button>
                <Button onClick={onClose}>
                  Cerrar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose} disabled={importing}>
                  Cancelar
                </Button>
                <Button onClick={handleImport} disabled={!file || importing}>
                  {importing ? 'Importando...' : 'Importar Clientes'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
