-- Habilitar extensión pg_trgm para búsqueda de texto difuso eficiente
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices GIN para búsqueda parcial (LIKE/ILIKE) eficiente en >25k productos
-- Estos índices son usados por las queries de búsqueda con pg_trgm
CREATE INDEX IF NOT EXISTS productos_nombre_trgm_idx ON productos USING GIN (nombre public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS productos_codigo_trgm_idx ON productos USING GIN (codigo public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS productos_marca_trgm_idx ON productos USING GIN (marca public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS productos_descripcion_trgm_idx ON productos USING GIN (descripcion public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS productos_codigo_barras_trgm_idx ON productos USING GIN ("codigoBarras" public.gin_trgm_ops);

-- Índice parcial: solo productos activos (el 95% de las queries filtran isActive=true)
CREATE INDEX IF NOT EXISTS productos_activos_nombre_idx ON productos (nombre) WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS productos_activos_categoria_idx ON productos (categoria) WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS productos_activos_marca_idx ON productos (marca) WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS productos_activos_created_idx ON productos ("createdAt" DESC) WHERE "isActive" = true;
