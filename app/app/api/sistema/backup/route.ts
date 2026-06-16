import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const BACKUPS_DIR = process.env.BACKUPS_PATH || path.join(process.cwd(), 'backups');

// Asegurar existencia de la carpeta de copias de seguridad
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// GET - Obtener historial de backups o descargar archivo específico
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permisos de administrador
    if ((session.user as any)?.role !== 'SUPERADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Descarga de archivo
    if (file) {
      // Evitar Path Traversal
      const safeFile = path.basename(file);
      const filePath = path.join(BACKUPS_DIR, safeFile);
      
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
      }

      const fileBuffer = await fs.promises.readFile(filePath);
      return new NextResponse(fileBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${safeFile}"`
        }
      });
    }

    // Listado de archivos
    const files = await fs.promises.readdir(BACKUPS_DIR);
    const backups = await Promise.all(
      files
        .filter((f) => f.endsWith('.sql.gz'))
        .map(async (f) => {
          const filePath = path.join(BACKUPS_DIR, f);
          const stat = await fs.promises.stat(filePath);
          
          const metaPath = filePath.replace('.sql.gz', '.json');
          let meta: any = {};
          if (fs.existsSync(metaPath)) {
            try {
              meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf-8'));
            } catch (e) {
              console.error('Error reading backup meta:', e);
            }
          }

          const sizeInMB = (stat.size / (1024 * 1024)).toFixed(2);

          return {
            id: f,
            nombre: f.replace('.sql.gz', ''),
            tipo: meta.tipo || 'MANUAL',
            fecha: stat.birthtime.toISOString(),
            tamaño: `${sizeInMB} MB`,
            tamañoBytes: stat.size,
            duracion: meta.duracion || 0,
            estado: meta.estado || 'COMPLETADO',
            archivoRuta: `/api/sistema/backup?file=${encodeURIComponent(f)}`,
            incluye: meta.incluye || { baseDatos: true, archivos: false, configuracion: false },
            compresion: true,
            hash: meta.hash || null,
            usuario: meta.usuario || 'Sistema',
            observaciones: meta.observaciones || 'Copia de seguridad real de la base de datos'
          };
        })
    );

    // Ordenar de más reciente a más antiguo
    backups.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const limitedBackups = backups.slice(0, limit);

    // Calcular estadísticas reales
    const stats = {
      total: backups.length,
      completados: backups.filter(b => b.estado === 'COMPLETADO').length,
      fallidos: backups.filter(b => b.estado === 'FALLIDO').length,
      ultimoBackup: backups[0]?.fecha || null,
      espacioUsado: backups.reduce((sum, b) => sum + b.tamañoBytes, 0),
      promedioTamaño: backups.length ? backups.reduce((sum, b) => sum + b.tamañoBytes, 0) / backups.length : 0,
      promedioDuracion: backups.length ? backups.reduce((sum, b) => sum + b.duracion, 0) / backups.length : 0
    };

    return NextResponse.json({
      backups: limitedBackups,
      stats,
      message: 'Historial de backups obtenido exitosamente'
    });

  } catch (error) {
    console.error('Error fetching backup history:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo backup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permisos de administrador
    if ((session.user as any)?.role !== 'SUPERADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const {
      tipo = 'MANUAL',
      incluirArchivos = false,
      incluirConfiguracion = true,
      compresion = true,
      observaciones
    } = body;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json({ error: 'DATABASE_URL no está configurada' }, { status: 500 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const nombre = `backup_${tipo.toLowerCase()}_${timestamp}`;
    const sqlFile = path.join(BACKUPS_DIR, `${nombre}.sql`);
    const gzFile = `${sqlFile}.gz`;

    const metaInfo = {
      tipo,
      usuario: session.user.email || 'Usuario',
      observaciones: observaciones || `Backup ${tipo.toLowerCase()} de la base de datos`,
      incluye: { baseDatos: true, archivos: incluirArchivos, configuracion: incluirConfiguracion },
      duracion: 0,
      hash: null
    };

    const tempJsonFile = path.join(BACKUPS_DIR, `${nombre}.json`);
    await fs.promises.writeFile(tempJsonFile, JSON.stringify({ ...metaInfo, estado: 'EN_PROCESO' }, null, 2));

    const startTime = Date.now();

    // Ejecutar pg_dump asíncronamente en segundo plano
    const runBackup = async () => {
      try {
        // Ejecución segura de pg_dump
        const cmd = `pg_dump "${connectionString}" | gzip > "${gzFile}"`;
        await execPromise(cmd);
        
        const duration = Math.ceil((Date.now() - startTime) / 1000);
        
        await fs.promises.writeFile(tempJsonFile, JSON.stringify({
          ...metaInfo,
          duracion: duration,
          estado: 'COMPLETADO'
        }, null, 2));

        console.log(`[Backup] Completado con éxito: ${nombre}.sql.gz en ${duration}s`);
      } catch (err) {
        console.error('[Backup] Error al ejecutar pg_dump:', err);
        await fs.promises.writeFile(tempJsonFile, JSON.stringify({
          ...metaInfo,
          estado: 'FALLIDO',
          error: (err as Error).message
        }, null, 2));
      }
    };

    runBackup();

    return NextResponse.json({
      backup: {
        id: `${nombre}.sql.gz`,
        nombre,
        tipo,
        fecha: new Date().toISOString(),
        tamaño: 'En proceso...',
        tamañoBytes: 0,
        duracion: 0,
        estado: 'EN_PROCESO',
        archivoRuta: `/api/sistema/backup?file=${encodeURIComponent(nombre + '.sql.gz')}`,
        incluye: metaInfo.incluye,
        compresion,
        hash: null,
        usuario: metaInfo.usuario,
        observaciones: metaInfo.observaciones
      },
      message: 'Backup iniciado exitosamente',
      procesoId: nombre
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar backup
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permisos de administrador
    if ((session.user as any)?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Solo SUPERADMIN puede eliminar backups' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');

    if (!backupId) {
      return NextResponse.json(
        { error: 'ID de backup requerido' },
        { status: 400 }
      );
    }

    const safeFile = path.basename(backupId);
    const gzFile = path.join(BACKUPS_DIR, safeFile);
    const metaFile = path.join(BACKUPS_DIR, safeFile.replace('.sql.gz', '.json'));

    if (fs.existsSync(gzFile)) {
      await fs.promises.unlink(gzFile);
    }
    if (fs.existsSync(metaFile)) {
      await fs.promises.unlink(metaFile);
    }

    return NextResponse.json({
      message: 'Backup eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error deleting backup:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
