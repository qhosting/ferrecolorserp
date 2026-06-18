import { NextRequest, NextResponse } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Limitador de tasa en memoria por IP. Suficiente para una sola instancia.
 * Para despliegue multi-instancia, migrar a Redis (p.ej. @upstash/ratelimit).
 *
 * @returns NextResponse 429 si se excede el límite, o null si la petición puede continuar.
 */
export function rateLimit(
  req: NextRequest,
  options: { key: string; limit: number; windowMs: number }
): NextResponse | null {
  const { key, limit, windowMs } = options;
  const id = `${key}:${getClientIp(req)}`;
  const now = Date.now();
  const bucket = store.get(id);

  if (!bucket || now > bucket.resetAt) {
    store.set(id, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  bucket.count++;
  return null;
}

// Limpieza periódica de buckets expirados para evitar fuga de memoria.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [id, bucket] of store.entries()) {
      if (now > bucket.resetAt) store.delete(id);
    }
  }, 5 * 60 * 1000).unref?.();
}
