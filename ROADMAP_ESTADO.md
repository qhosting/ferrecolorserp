# 🛡️ ESTADO DE SEGURIDAD E IMPLEMENTACIÓN — FerreColors ERP
*Auditoría · 17 de junio, 2026*

Revisión completa de **27 páginas/módulos** + **auditoría de seguridad** sobre 81 rutas API, middleware y autenticación.

---

## 🔒 PARTE 1 — AUDITORÍA DE SEGURIDAD

### 🔴 CRÍTICAS
| # | Hallazgo | Ubicación | Recomendación |
|---|----------|-----------|---------------|
| S1 | **Credenciales de producción en texto plano** (root, admin, gestor, vendedor con sus passwords) versionadas en el repo | `ESTADO_DEL_PROYECTO.md:164-171` | Rotar TODAS las contraseñas ya; eliminar del archivo y del historial git (`git filter-repo`). |
| S2 | **Secreto de webhook hardcodeado como fallback** | `app/api/contpaqi/webhook/route.ts:17` (`'ferrecolors_webhook_secret_2026'`) | Exigir `CONTPAQI_WEBHOOK_SECRET`; abortar si no existe. Nunca un fallback en código. |

### 🟠 ALTAS
| # | Hallazgo | Ubicación | Recomendación |
|---|----------|-----------|---------------|
| S3 | **Webhook acepta peticiones SIN firma** ("modo desarrollo") → cualquiera puede inyectar eventos de timbrado/pago | `webhook/route.ts:26-28` | Rechazar (401) si falta la firma. Sin excepción en producción. |
| S4 | **Rutas `/api/**` NO pasan por el middleware** (el `matcher` excluye `api`). La protección depende 100% de cada `route.ts` | `middleware.ts:51` | Está bien si cada ruta valida sesión, PERO ver S5. Considera un guard centralizado. |
| S5 | **`/api/clientes/import` SIN validación de sesión** — importación masiva de clientes abierta | `app/api/clientes/import/route.ts` | Añadir `getServerSession` + chequeo de rol (ADMIN/SUPERADMIN). |
| S6 | **Sin rate limiting** en endpoints públicos/costosos: `signup`, `sms/send`, `sms/bulk`, `whatsapp/send` | varios | Limitar por IP/usuario (p.ej. `@upstash/ratelimit` o middleware propio). Riesgo de abuso/spam/costo. |

### 🟡 MEDIAS
| # | Hallazgo | Ubicación | Recomendación |
|---|----------|-----------|---------------|
| S7 | **Bootstrap de primer usuario** permite crear SUPERADMIN sin autenticación si la tabla `User` está vacía | `app/api/signup/route.ts:45-47` | Aceptable como bootstrap, pero documentar y cerrar el registro público tras el setup inicial. |
| S8 | **Fuga de detalles de error** al cliente (`error.message` en respuestas) | `webhook/route.ts:111` y otras | Loguear el detalle en servidor; al cliente solo mensaje genérico. |
| S9 | **`dangerouslySetInnerHTML`** presente | `app/layout.tsx` | Verificar que el contenido sea 100% estático (script de tema), nunca datos de usuario. |

### 🟢 BAJAS / OK
- ✅ **Sin inyección SQL:** todo el `$queryRaw`/`$executeRaw` usa template tags parametrizados (`${id}` seguro) — `dashboard/analytics`, `reportes/cobranza`, `sistema/inventario`, `pagos/sync`, `health`.
- ✅ **Passwords con bcrypt** (cost 12) — `signup`, `auth`.
- ✅ **Escalamiento de privilegios mitigado** en signup (degrada a CLIENTE sin sesión admin).
- ✅ **Webhook con HMAC-SHA256** implementado (falla solo por S3).
- ⚠️ Verificar fortaleza de `NEXTAUTH_SECRET` en `.env` de producción (no hay fallback en código — correcto).

---

## 📋 PARTE 2 — ESTADO DE IMPLEMENTACIÓN POR MÓDULO

### ✅ Completas (16)
`dashboard` · `clientes` · `ventas` · `pedidos` · `cobranza` · `cobranza-movil` · `notas-cargo` · `notas-credito` · `garantias` · `cuentas-pagar` · `almacen` · `servicios` · `reportes` · `integraciones` · `configuracion` · `comunicacion`*

\* `comunicacion`: estado SMS LabsMobile y lista de plantillas están hardcodeados (detalle menor).

### 🟡 Parciales — FALTA implementar (11)

| Módulo | Falta por implementar | Ubicación |
|--------|----------------------|-----------|
| **compras** | Modales "Orden" y "Recepción" son placeholder; botón "Crear" sin handler; Ver/Editar de órdenes y proveedores sin `onClick`; tab Recepciones vacío; KPI "+20.1%" hardcodeado; reportes sin descarga | `compras/page.tsx:576,585,594,367-372,435-440,461-475,259,490,505` |
| **proveedores** | "Nuevo Proveedor" sin `onClick`; Ver/Editar/Detalle sin handler; sin modal de alta/edición | `proveedores/page.tsx:125-128,312-320` |
| **agentes** | "Nuevo Agente" sin `onClick`; Ver/Editar sin handler; sin modales CRUD (solo lectura + sync) | `agentes/page.tsx:131-134,308-313` |
| **facturacion-electronica** | Modal crear factura = "próximamente"; submit sin handler; Ver/Descargar XML/Enviar sin `onClick`; `cancelarFactura` definido pero nunca invocado; panel "Estado del Sistema" hardcodeado | `facturacion-electronica/page.tsx:694,702,446,460,465,535,589,592,631,648-668` |
| **business-intelligence** | Tabs "Análisis Ventas" y "Análisis Clientes" = "próximamente"; `selectedMetric` sin control UI | `business-intelligence/page.tsx:407,427` |
| **automatizacion** | Modal crear = "próximamente"; toggles/Settings sin handler; switch de notificación muerto; **tab Monitoreo 100% mock**; ⚠️ **además el scheduler no ejecuta tareas (no hay cron)** | `automatizacion/page.tsx:620,628,373,444,447,508,510,534-554,568-594` |
| **auditoria** | Botón "Configurar" sin `onClick`; "Ver" (Eye) sin handler en 3 tablas; filtro dateRange sin UI; **tab Análisis 100% mock** | `auditoria/page.tsx:235-238,406,469,536,560-575,589-608` |
| **productos** | Import/Export no implementado (íconos Download/Upload sin botón); `ProductFilters` no se renderiza | `productos/page.tsx:29-30,38,87` |
| **pagares** | UI de búsqueda ausente (estado existe, sin `<Input>`); opción de filtro "vencidos" es código muerto | `pagares/page.tsx:59,73-74` |
| **reestructuras** | "Ver detalle" insinuado pero no construido (estado y botón sin uso) | `reestructuras/page.tsx:5,87` |
| **credito** | "Ver Historial" NO carga historial real de pagos; solo recalcula el score en el front con heurísticas | `credito/page.tsx:294-302,348-378` |

### 🔴 Placeholders puros
Ninguno — todas las páginas renderizan y tienen funcionalidad base.

---

## 🚀 ROADMAP DE CIERRE (priorizado)

### 🟥 Sprint 1 — Seguridad ✅ COMPLETADO (17 jun 2026)
- [x] **S1**: Credenciales quitadas de `ESTADO_DEL_PROYECTO.md`; password root hardcodeado eliminado de `seed.ts` (ahora exige `SEED_ROOT_PASSWORD`). ⚠️ *Pendiente acción manual:* rotar las contraseñas reales y purgar el historial git (`git filter-repo`).
- [x] **S2 + S3**: Webhook exige `CONTPAQI_WEBHOOK_SECRET` (sin fallback), rechaza peticiones sin firma y usa comparación `timingSafeEqual`. — `app/api/contpaqi/webhook/route.ts`
- [x] **S5**: `/api/clientes/import` protegido con `getServerSession` + rol ADMIN/SUPERADMIN.
- [x] **S6**: Rate limiting in-memory (`lib/rate-limit.ts`) aplicado a `signup` (5/min), `sms/send` (20/min), `sms/bulk` (5/min), `whatsapp/send` (20/min).
- [x] **S8**: Eliminado el filtrado de `error.message` al cliente en ~45 respuestas de API (el detalle se conserva en `console.error` del servidor).

> ✅ `tsc --noEmit` pasa limpio tras los cambios.
> ⚠️ **Nota S6:** el limitador es en memoria (1 instancia). Para multi-instancia migrar a Redis/Upstash.

### 🟧 Sprint 2 — Completar módulos de alto valor (1-2 sem)
- [x] **compras** ✅ (17 jun 2026): frontend conectado al backend existente — alta de proveedor (POST real), form de orden con líneas de producto + cálculo de totales (POST real), recepción de mercancía (genera CxP + actualiza stock), tab Recepciones con datos reales, modal Ver orden, descarga CSV de reportes, KPI "+20.1%" hardcodeado reemplazado por compras del mes reales. `tsc` limpio.
- [x] **facturacion-electronica** ✅ (17 jun 2026): modal de nueva factura CFDI con conceptos (POST real), modal de configuración PAC (POST real), Ver detalle, Descargar XML/PDF (vía `/api/contpaqi/documentos/[id]`), Cancelar con motivo SAT, reporte SAT en CSV, panel "Estado del Sistema" ahora derivado de datos reales (PAC activo, certificados vigentes, créditos). `tsc` limpio. ⚠️ *Nota:* el botón "Sincronizar PAC" llama a `/api/facturacion/pac/[id]/sincronizar`, endpoint que aún NO existe (mostrará aviso de error); crear si se requiere.
- [x] **automatizacion** ✅ (17 jun 2026): **scheduler real** implementado con enfoque endpoint + cron externo.
  - `lib/scheduler.ts`: motor que ejecuta tareas por tipo (COBRANZA→recalcula intereses moratorios, INVENTARIO→detecta stock bajo, REPORTES→cuenta ventas del día), actualiza última/próxima ejecución y registra cada corrida en `SyncLog`.
  - `POST /api/cron/run`: endpoint protegido con `CRON_SECRET` (header `x-cron-secret`) para disparar desde un cron externo (EasyPanel/crontab). Ejemplo documentado en `.env.production.example`.
  - `POST /api/automatizacion/maintenance`: mantenimiento manual (botón de la UI) — recalcula intereses + detecta stock bajo.
  - Nuevos `PATCH/DELETE` en `workflows/[id]` y `tasks/[id]` y `PATCH` en `notifications/[id]` (antes daban 404 → toggles ahora funcionan).
  - `GET /api/automatizacion/logs`: bitácora real para el tab Monitoreo.
  - Frontend: modales reales de Workflow/Tarea/Notificación (POST), toggles y eliminación funcionales, tab Monitoreo con ejecuciones reales (se eliminaron las barras CPU/Memoria/DB mock). `tsc` limpio.
  - ⚠️ *Acción de despliegue:* definir `CRON_SECRET` y configurar el cron externo para que el scheduler corra automáticamente.

> ✅ **Sprint 2 COMPLETADO** (Compras + Facturación + Automatización). `tsc --noEmit` limpio en los tres módulos.

### 🟨 Sprint 3 — CRUD faltante y datos reales (1-2 sem)
- [ ] **proveedores** y **agentes**: modales de alta/edición + handlers Ver/Editar.
- [ ] **business-intelligence**: tabs de Análisis Ventas y Clientes.
- [ ] **auditoria**: tab Análisis con datos reales + handlers de Ver/Configurar.
- [ ] **credito**: "Ver Historial" → fetch real de pagos/movimientos.

### 🟩 Sprint 4 — Detalles y pulido
- [ ] **productos**: import/export. **pagares**: búsqueda + filtro vencidos. **reestructuras**: ver detalle. **comunicacion**: estado SMS y plantillas reales.
- [ ] Limpiar imports muertos en todas las páginas (cosmético).

---

## 🎯 Acciones inmediatas (hoy)
1. **Rotar las credenciales** del repo (S1) — exposición activa.
2. **Cerrar el webhook** sin firma (S2/S3) — entrada de eventos falsos.
3. **Proteger `/api/clientes/import`** (S5).
4. Decidir orden de los **11 módulos parciales** según prioridad de negocio.
