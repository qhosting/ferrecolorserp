
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import csv from 'csv-parser';

interface ImportRow {
  codigo_cliente: string;
  nombre: string;
  telefono1: string;
  telefono2?: string;
  email?: string;
  municipio?: string;
  estado?: string;
  colonia?: string;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  codigo_postal?: string;
  pagos_periodicos: string;
  periodicidad: string;
  status: string;
  dia_cobro: string;
  observaciones?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows: ImportRow[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    let processed = 0;
    let created = 0;
    let updated = 0;

    // Crear stream para procesar CSV
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    return new Promise<NextResponse>((resolve) => {
      stream
        .pipe(csv())
        .on('data', (row: ImportRow) => {
          rows.push(row);
        })
        .on('end', async () => {
          // Procesar filas
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2; // +2 porque comenzamos en fila 1 y la primera es header

            try {
              // Validaciones básicas
              if (!row.codigo_cliente || !row.nombre) {
                errors.push({
                  row: rowNumber,
                  error: 'Código de cliente y nombre son obligatorios'
                });
                continue;
              }

              if (!row.telefono1) {
                errors.push({
                  row: rowNumber,
                  error: 'Teléfono principal es obligatorio'
                });
                continue;
              }

              // En un sistema real, aquí verificarías si el cliente existe
              // y lo crearías o actualizarías en la base de datos
              
              // Simulamos la verificación
              const existingCliente = Math.random() > 0.7; // 30% de probabilidad de que exista

              if (existingCliente) {
                updated++;
              } else {
                created++;
              }

              processed++;
            } catch (error) {
              console.error(`Error processing row ${rowNumber}:`, error);
              errors.push({
                row: rowNumber,
                error: `Error al procesar: ${(error as Error).message}`
              });
            }
          }

          const result = {
            success: errors.length === 0,
            processed,
            created,
            updated,
            errors
          };

          resolve(NextResponse.json(result));
        })
        .on('error', (error: any) => {
          console.error('Error parsing CSV:', error);
          resolve(NextResponse.json(
            { 
              success: false,
              processed: 0,
              created: 0,
              updated: 0,
              errors: [{ row: 0, error: 'Error al procesar el archivo CSV' }]
            },
            { status: 400 }
          ));
        });
    });
  } catch (error) {
    console.error('Error importing clientes:', error);
    return NextResponse.json(
      { 
        success: false,
        processed: 0,
        created: 0,
        updated: 0,
        errors: [{ row: 0, error: 'Error interno del servidor' }]
      },
      { status: 500 }
    );
  }
}
