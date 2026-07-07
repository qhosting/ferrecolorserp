import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://default:aurum-control-center-redis@qhosting_aurum-control-center-redis:6379';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Crear cliente Redis con reconexión automática y tolerancia a fallos
let redis: Redis | null = null;

try {
  redis = globalForRedis.redis ?? new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000, // 5 segundos
    lazyConnect: true, // conectar bajo demanda
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    }
  });

  redis.on('error', (err) => {
    console.warn('[Redis] Advertencia de conexión:', err.message);
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
  }
} catch (err) {
  console.error('[Redis] Error crítico de inicialización:', err);
  redis = null;
}

// Helper para operaciones seguras (si Redis falla, el ERP sigue funcionando consultando la DB)
export const redisCache = {
  async get(key: string): Promise<string | null> {
    if (!redis) return null;
    try {
      return await redis.get(key);
    } catch (e) {
      console.warn(`[Redis Cache] Error al leer key "${key}":`, e);
      return null;
    }
  },

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    if (!redis) return;
    try {
      await redis.set(key, value, 'EX', ttlSeconds);
    } catch (e) {
      console.warn(`[Redis Cache] Error al guardar key "${key}":`, e);
    }
  },

  async del(key: string): Promise<void> {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (e) {
      console.warn(`[Redis Cache] Error al borrar key "${key}":`, e);
    }
  }
};

export { redis };
