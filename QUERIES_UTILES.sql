
-- 🗄️ QUERIES ÚTILES PARA DESARROLLO - Sistema ERP

-- ============================================
-- 📊 CONSULTAS DE ANÁLISIS Y REPORTES
-- ============================================

-- 1. Dashboard - Estadísticas principales
SELECT 
  (SELECT COUNT(*) FROM clientes WHERE status = 'ACTIVO') as clientes_activos,
  (SELECT COUNT(*) FROM ventas WHERE status != 'CANCELADA') as ventas_total,
  (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE DATE(fecha_pago) = CURRENT_DATE) as pagos_hoy,
  (SELECT COALESCE(SUM(saldo_actual), 0) FROM clientes WHERE status = 'ACTIVO') as cartera_total;

-- 2. Top 10 clientes con mayor saldo
SELECT 
  codigo_cliente,
  nombre,
  saldo_actual,
  telefono1,
  status
FROM clientes 
WHERE status = 'ACTIVO' AND saldo_actual > 0
ORDER BY saldo_actual DESC
LIMIT 10;

-- 3. Ventas del mes actual por vendedor
SELECT 
  u.first_name || ' ' || u.last_name as vendedor,
  COUNT(v.id) as total_ventas,
  COALESCE(SUM(v.total), 0) as monto_total,
  COALESCE(AVG(v.total), 0) as promedio_venta
FROM users u
LEFT JOIN ventas v ON u.id = v.vendedor_id 
  AND DATE_TRUNC('month', v.fecha_venta) = DATE_TRUNC('month', CURRENT_DATE)
WHERE u.role = 'VENTAS'
GROUP BY u.id, u.first_name, u.last_name
ORDER BY monto_total DESC;

-- 4. Análisis de cobranza por gestor
SELECT 
  u.first_name || ' ' || u.last_name as gestor,
  COUNT(DISTINCT c.id) as clientes_asignados,
  COUNT(p.id) as pagos_procesados,
  COALESCE(SUM(p.monto), 0) as monto_cobrado,
  COALESCE(SUM(CASE WHEN DATE(p.fecha_pago) = CURRENT_DATE THEN p.monto ELSE 0 END), 0) as cobrado_hoy
FROM users u
LEFT JOIN clientes c ON u.id = c.gestor_id
LEFT JOIN pagos p ON u.id = p.gestor_id 
  AND DATE_TRUNC('month', p.fecha_pago) = DATE_TRUNC('month', CURRENT_DATE)
WHERE u.role = 'GESTOR'
GROUP BY u.id, u.first_name, u.last_name
ORDER BY monto_cobrado DESC;

-- ============================================
-- 🔍 CONSULTAS DE BÚSQUEDA Y FILTROS
-- ============================================

-- 5. Buscar clientes por múltiples criterios
SELECT 
  c.*,
  u.first_name || ' ' || u.last_name as nombre_gestor
FROM clientes c
LEFT JOIN users u ON c.gestor_id = u.id
WHERE 
  (c.nombre ILIKE '%TEXTO_BUSQUEDA%' 
   OR c.codigo_cliente ILIKE '%TEXTO_BUSQUEDA%'
   OR c.telefono1 LIKE '%TEXTO_BUSQUEDA%'
   OR c.email ILIKE '%TEXTO_BUSQUEDA%')
  AND c.status = 'ACTIVO'
ORDER BY c.nombre;

-- 6. Clientes con pagos vencidos
SELECT 
  c.codigo_cliente,
  c.nombre,
  c.telefono1,
  c.saldo_actual,
  c.periodicidad,
  MAX(p.fecha_pago) as ultimo_pago,
  CURRENT_DATE - MAX(p.fecha_pago)::date as dias_sin_pagar
FROM clientes c
LEFT JOIN pagos p ON c.id = p.cliente_id
WHERE c.status = 'ACTIVO' 
  AND c.saldo_actual > 0
GROUP BY c.id, c.codigo_cliente, c.nombre, c.telefono1, c.saldo_actual, c.periodicidad
HAVING 
  MAX(p.fecha_pago) IS NULL 
  OR CURRENT_DATE - MAX(p.fecha_pago)::date > 
    CASE c.periodicidad
      WHEN 'DIARIA' THEN 1
      WHEN 'SEMANAL' THEN 7
      WHEN 'QUINCENAL' THEN 15
      WHEN 'MENSUAL' THEN 30
      ELSE 7
    END
ORDER BY dias_sin_pagar DESC NULLS FIRST;

-- 7. Productos con stock bajo
SELECT 
  codigo,
  nombre,
  stock,
  stock_minimo,
  precio_venta,
  categoria
FROM productos
WHERE stock <= stock_minimo 
  AND is_active = true
ORDER BY (stock - stock_minimo), codigo;

-- ============================================
-- 📈 CONSULTAS DE ANÁLISIS FINANCIERO
-- ============================================

-- 8. Evolución de ventas por mes (últimos 12 meses)
SELECT 
  DATE_TRUNC('month', fecha_venta) as mes,
  COUNT(*) as cantidad_ventas,
  COALESCE(SUM(total), 0) as monto_total,
  COALESCE(AVG(total), 0) as ticket_promedio
FROM ventas
WHERE fecha_venta >= CURRENT_DATE - INTERVAL '12 months'
  AND status != 'CANCELADA'
GROUP BY DATE_TRUNC('month', fecha_venta)
ORDER BY mes DESC;

-- 9. Análisis de cartera por antigüedad
SELECT 
  CASE 
    WHEN dias_sin_pago <= 7 THEN '0-7 días'
    WHEN dias_sin_pago <= 30 THEN '8-30 días'
    WHEN dias_sin_pago <= 60 THEN '31-60 días'
    WHEN dias_sin_pago <= 90 THEN '61-90 días'
    ELSE '90+ días'
  END as rango_antiguedad,
  COUNT(*) as cantidad_clientes,
  SUM(saldo_actual) as monto_total
FROM (
  SELECT 
    c.id,
    c.saldo_actual,
    COALESCE(CURRENT_DATE - MAX(p.fecha_pago)::date, 999) as dias_sin_pago
  FROM clientes c
  LEFT JOIN pagos p ON c.id = p.cliente_id
  WHERE c.status = 'ACTIVO' AND c.saldo_actual > 0
  GROUP BY c.id, c.saldo_actual
) cartera_antiguedad
GROUP BY 
  CASE 
    WHEN dias_sin_pago <= 7 THEN '0-7 días'
    WHEN dias_sin_pago <= 30 THEN '8-30 días'
    WHEN dias_sin_pago <= 60 THEN '31-60 días'
    WHEN dias_sin_pago <= 90 THEN '61-90 días'
    ELSE '90+ días'
  END
ORDER BY MIN(dias_sin_pago);

-- 10. Rentabilidad por producto (si hay datos de costo)
SELECT 
  p.codigo,
  p.nombre,
  p.precio_venta,
  p.precio_compra,
  (p.precio_venta - COALESCE(p.precio_compra, 0)) as utilidad_unitaria,
  CASE 
    WHEN p.precio_compra > 0 THEN 
      ROUND(((p.precio_venta - p.precio_compra) / p.precio_compra * 100)::numeric, 2)
    ELSE NULL 
  END as margen_porcentaje,
  COALESCE(SUM(vi.cantidad), 0) as unidades_vendidas,
  COALESCE(SUM(vi.subtotal), 0) as ingresos_totales
FROM productos p
LEFT JOIN venta_items vi ON p.id = vi.producto_id
LEFT JOIN ventas v ON vi.venta_id = v.id AND v.status != 'CANCELADA'
WHERE p.is_active = true
GROUP BY p.id, p.codigo, p.nombre, p.precio_venta, p.precio_compra
ORDER BY ingresos_totales DESC;

-- ============================================
-- 🧹 CONSULTAS DE MANTENIMIENTO
-- ============================================

-- 11. Limpieza de sesiones expiradas
DELETE FROM sessions 
WHERE expires < CURRENT_TIMESTAMP;

-- 12. Usuarios inactivos (sin login en 90 días)
SELECT 
  email,
  name,
  role,
  last_login,
  CURRENT_DATE - last_login::date as dias_inactivo
FROM users
WHERE last_login IS NOT NULL 
  AND last_login < CURRENT_DATE - INTERVAL '90 days'
  AND is_active = true
ORDER BY last_login DESC;

-- 13. Audit log - Actividad reciente
SELECT 
  al.created_at,
  u.email as usuario,
  al.accion,
  al.tabla,
  al.registro_id,
  al.ip
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY al.created_at DESC
LIMIT 100;

-- ============================================
-- 📱 CONSULTAS PARA COBRANZA MÓVIL
-- ============================================

-- 14. Clientes programados para hoy (por gestor)
SELECT 
  c.codigo_cliente,
  c.nombre,
  c.telefono1,
  c.saldo_actual,
  c.pagos_periodicos as pago_esperado,
  c.calle || ' ' || COALESCE(c.numero_exterior, '') as direccion,
  c.colonia,
  c.latitud,
  c.longitud
FROM clientes c
WHERE c.gestor_id = 'USER_ID_AQUI'
  AND c.status = 'ACTIVO'
  AND c.saldo_actual > 0
  AND (
    c.dia_cobro = TO_CHAR(CURRENT_DATE, 'Day')
    OR c.dia_cobro IS NULL
  )
ORDER BY c.saldo_actual DESC;

-- 15. Pagos pendientes de sincronización
SELECT 
  p.*,
  c.nombre as cliente_nombre,
  c.codigo_cliente
FROM pagos p
JOIN clientes c ON p.cliente_id = c.id
WHERE p.sincronizado = false
ORDER BY p.fecha_hora DESC;

-- 16. Ruta de cobranza optimizada (por proximidad)
SELECT 
  c.codigo_cliente,
  c.nombre,
  c.telefono1,
  c.saldo_actual,
  c.calle || ' ' || COALESCE(c.numero_exterior, '') as direccion,
  c.latitud,
  c.longitud,
  -- Calcular distancia desde un punto central (ejemplo: oficina)
  CASE 
    WHEN c.latitud IS NOT NULL AND c.longitud IS NOT NULL THEN
      ROUND(
        (6371 * acos(
          cos(radians(19.4326)) * cos(radians(c.latitud::float)) *
          cos(radians(c.longitud::float) - radians(-99.1332)) +
          sin(radians(19.4326)) * sin(radians(c.latitud::float))
        ))::numeric, 2
      )
    ELSE 999
  END as distancia_km
FROM clientes c
WHERE c.gestor_id = 'USER_ID_AQUI'
  AND c.status = 'ACTIVO'
  AND c.saldo_actual > 0
ORDER BY distancia_km, c.saldo_actual DESC;

-- ============================================
-- 📊 CONSULTAS PARA REPORTES EJECUTIVOS
-- ============================================

-- 17. Resumen ejecutivo mensual
WITH estadisticas_mes AS (
  SELECT 
    COUNT(DISTINCT v.id) as ventas_realizadas,
    COALESCE(SUM(v.total), 0) as ingresos_ventas,
    COUNT(DISTINCT p.id) as pagos_recibidos,
    COALESCE(SUM(p.monto), 0) as monto_pagos,
    COUNT(DISTINCT c.id) as clientes_nuevos
  FROM ventas v
  FULL OUTER JOIN pagos p ON DATE_TRUNC('month', v.fecha_venta) = DATE_TRUNC('month', p.fecha_pago)
    AND DATE_TRUNC('month', p.fecha_pago) = DATE_TRUNC('month', CURRENT_DATE)
  FULL OUTER JOIN clientes c ON DATE_TRUNC('month', c.fecha_alta) = DATE_TRUNC('month', CURRENT_DATE)
  WHERE DATE_TRUNC('month', v.fecha_venta) = DATE_TRUNC('month', CURRENT_DATE)
    OR DATE_TRUNC('month', p.fecha_pago) = DATE_TRUNC('month', CURRENT_DATE)
    OR DATE_TRUNC('month', c.fecha_alta) = DATE_TRUNC('month', CURRENT_DATE)
)
SELECT 
  'Mes: ' || TO_CHAR(CURRENT_DATE, 'Month YYYY') as periodo,
  ventas_realizadas,
  ingresos_ventas,
  pagos_recibidos,
  monto_pagos,
  clientes_nuevos,
  CASE 
    WHEN ventas_realizadas > 0 THEN ROUND((ingresos_ventas / ventas_realizadas)::numeric, 2)
    ELSE 0 
  END as ticket_promedio,
  CASE 
    WHEN pagos_recibidos > 0 THEN ROUND((monto_pagos / pagos_recibidos)::numeric, 2)
    ELSE 0 
  END as pago_promedio
FROM estadisticas_mes;

-- ============================================
-- 🔧 CONSULTAS DE CONFIGURACIÓN Y SETUP
-- ============================================

-- 18. Verificar integridad de datos
SELECT 
  'Clientes sin gestor' as verificacion,
  COUNT(*) as cantidad
FROM clientes 
WHERE gestor_id IS NULL AND status = 'ACTIVO'

UNION ALL

SELECT 
  'Ventas sin vendedor',
  COUNT(*)
FROM ventas 
WHERE vendedor_id IS NULL

UNION ALL

SELECT 
  'Pagos sin gestor',
  COUNT(*)
FROM pagos 
WHERE gestor_id IS NULL

UNION ALL

SELECT 
  'Usuarios inactivos con clientes',
  COUNT(DISTINCT c.id)
FROM clientes c
JOIN users u ON c.gestor_id = u.id
WHERE u.is_active = false AND c.status = 'ACTIVO';

-- 19. Configuración actual del sistema
SELECT 
  nombre_empresa,
  color_primario,
  color_secundario,
  telefono,
  email,
  created_at as fecha_configuracion
FROM configuracion
ORDER BY created_at DESC
LIMIT 1;

-- 20. Estadísticas de uso por rol
SELECT 
  role,
  COUNT(*) as cantidad_usuarios,
  COUNT(CASE WHEN is_active THEN 1 END) as usuarios_activos,
  COUNT(CASE WHEN last_login IS NOT NULL THEN 1 END) as usuarios_con_login,
  COUNT(CASE WHEN last_login > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as activos_ultimo_mes
FROM users
GROUP BY role
ORDER BY cantidad_usuarios DESC;

-- ============================================
-- 💡 CONSULTAS PARA DESARROLLO Y DEBUG
-- ============================================

-- 21. Verificar permisos de usuario específico
SELECT 
  u.email,
  u.role,
  u.is_active,
  COUNT(DISTINCT c.id) as clientes_asignados,
  COUNT(DISTINCT v.id) as ventas_creadas,
  COUNT(DISTINCT p.id) as pagos_procesados
FROM users u
LEFT JOIN clientes c ON u.id = c.gestor_id
LEFT JOIN ventas v ON u.id = v.vendedor_id
LEFT JOIN pagos p ON u.id = p.gestor_id
WHERE u.email = 'EMAIL_DEL_USUARIO'
GROUP BY u.id, u.email, u.role, u.is_active;

-- 22. Log de errores más comunes (si implementado)
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as cantidad_errores,
  STRING_AGG(DISTINCT accion, ', ') as acciones_con_error
FROM audit_logs
WHERE datos_nuevos::text LIKE '%error%'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- ============================================
-- 📝 NOTAS DE USO:
-- ============================================

/*
INSTRUCCIONES DE USO:

1. Reemplazar 'USER_ID_AQUI' con el ID real del usuario
2. Reemplazar 'EMAIL_DEL_USUARIO' con el email específico
3. Reemplazar 'TEXTO_BUSQUEDA' con el término de búsqueda
4. Ajustar fechas y rangos según necesidades

PERFORMANCE:
- Estas queries están optimizadas para el esquema actual
- Considerar agregar índices para queries frecuentes
- Usar LIMIT en queries que puedan retornar muchos registros

SEGURIDAD:
- Ejecutar solo con usuarios con permisos adecuados
- No exponer queries de limpieza en interfaces públicas
- Validar inputs antes de usar en queries dinámicas
*/
