# 🗺️ ROADMAP — FerreColors ERP
*Actualizado: 26 de junio, 2026*

## 📌 Resumen del análisis

ERP **Next.js 14 + TypeScript + Prisma/PostgreSQL** con integración real a **CONTPAQi Comercial Premium** y timbrado **SAT 4.0**.

| Métrica | Valor |
|---------|-------|
| Páginas | 35+ |
| Rutas API | 85+ |
| Modelos Prisma | 30 |
| Librerías `lib/` | 15 módulos |
| **Typecheck (`tsc --noEmit`)** | ✅ **Pasa limpio** |
| Pruebas automatizadas | ❌ **0** |
| CI/CD | ❌ Ninguno |
| Migraciones Prisma | ❌ Solo `db push` (sin historial) |

**Veredicto:** base sólida y funcional (~92% de módulos operativos), con UI premium dark mode. Quedan pendientes pruebas automatizadas, CI/CD, módulos parciales y algunos módulos de catálogos.

---

## ✅ COMPLETADO

### Sprint 1 — Seguridad *(17 jun 2026)*
- [x] Credenciales quitadas de `ESTADO_DEL_PROYECTO.md`
- [x] Webhook CONTPAQi: exige `CONTPAQI_WEBHOOK_SECRET`, rechaza sin firma, usa `timingSafeEqual`
- [x] `/api/clientes/import` protegido con `getServerSession` + rol ADMIN/SUPERADMIN
- [x] Rate limiting in-memory en `signup`, `sms/send`, `sms/bulk`, `whatsapp/send`
- [x] Eliminado filtrado de `error.message` al cliente en ~45 respuestas de API

### Sprint 2 — Módulos de alto valor *(17 jun 2026)*
- [x] **Compras**: backend real, alta de proveedor, órdenes con líneas, recepciones, CxP, KPIs reales
- [x] **Facturación electrónica**: CFDI real, modal PAC, Ver/Descargar XML/PDF, cancelar, reporte SAT CSV
- [x] **Automatización**: scheduler real (`lib/scheduler.ts`), `POST /api/cron/run`, toggles y eliminación funcionales, tab Monitoreo real

### Sprint 2.5 — Rutas y navegación *(25-26 jun 2026)*
- [x] **Headers homologados** en todos los módulos: `/compras`, `/ventas`, `/pedidos`, `/pagares`, `/reestructuras`, `/reportes`, `/garantias`, `/notas-cargo`, `/notas-credito`, `/facturacion-electronica`, `/automatizacion`, `/auditoria`, `/business-intelligence`, `/sucursales`
- [x] **Rutas de pedidos** creadas: `/pedidos/[id]` (detalle), `/pedidos/[id]/editar`, `/pedidos/nuevo`
- [x] **API rutas de pedidos** completadas: `GET/PATCH/DELETE /api/pedidos/[id]`
- [x] **Propuesta comercial** generada en `/docs/` (HTML, MD, PDF) con especificaciones del servidor AMD EPYC™ 9645

### Sprint 3 — POS y UI/UX *(26 jun 2026)*
- [x] **POS — Bug carga de clientes corregido**: `data.clientes || []` → `Array.isArray(data) ? data : []`
- [x] **POS — Buscador de clientes**: reemplazado `<select>` estático por input con debounce (350ms) + dropdown de resultados usando `/api/clientes/search`
- [x] **POS — Búsqueda por RFC**: agregado campo `rfc` al endpoint `/api/clientes/search` (OR clause + campo en respuesta)
- [x] **Sidebar rediseñado (UI/UX Pro Max)**: colapsable mini/full, tooltips en modo mini, color tokens por grupo, active state con left-bar accent, shimmer hover, accordion limpio
- [x] **Header rediseñado**: breadcrumb automático por ruta, role badge coloreado, notificaciones con preview dropdown, user dropdown con avatar gradient, slot `actions`
- [x] **Dark mode consistente**: todos los layouts actualizados a `bg-slate-950`

---

## 🔴 PENDIENTE — POR COMPLETAR

### Módulos parciales (11 → 8 restantes)
| Módulo | Falta por implementar |
|--------|-----------------------|
| **proveedores** | Modal alta/edición, handlers Ver/Editar |
| **agentes** | Modal alta/edición, handlers Ver/Editar |
| **business-intelligence** | Tabs Análisis Ventas y Análisis Clientes |
| **auditoria** | Tab Análisis con datos reales, handlers Ver/Configurar |
| **credito** | "Ver Historial" → fetch real de pagos/movimientos |
| **productos** | Import/Export, `ProductFilters` sin renderizar |
| **pagares** | Input de búsqueda faltante, filtro vencidos (código muerto) |
| **reestructuras** | Ver detalle sin implementar |

### Cimientos ausentes (riesgo para ERP financiero)
- ❌ **Sin pruebas** (unitarias, integración ni e2e). Crítico para pagarés, intereses moratorios e inventario.
- ❌ **Sin migraciones Prisma** — `db push` no deja historial ni permite rollback en producción.
- ❌ **Sin CI/CD** (no hay `.github/workflows`).
- ❌ **Sin logging estructurado** (solo `console.error`).
- ⚠️ **Rate limiting in-memory** — migrar a Redis/Upstash para multi-instancia.

---

## 🚀 ROADMAP POR FASES

### 🟥 FASE A — Estabilización y seguridad *(completado parcialmente)*
- [x] Seguridad básica (Sprint 1)
- [ ] Migraciones Prisma (`prisma migrate dev/deploy`)
- [ ] Logging estructurado (pino/winston) + Sentry
- [ ] Auditoría de autorización por rol en las 85+ rutas

### 🟧 FASE B — Pruebas y CI/CD *(próximo)*
- [ ] Tests unitarios: intereses moratorios, FIFO de pagos, scoring, inventario
- [ ] Tests de integración: ventas, pagarés, notas, facturación
- [ ] E2E (Playwright): login → venta a crédito → pagaré → cobro → CFDI
- [ ] CI GitHub Actions: `lint` + `tsc` + `test` + `prisma migrate` en PR
- [ ] CD automatizado a EasyPanel/Docker

### 🟨 FASE C — Completar módulos parciales
- [ ] **proveedores** y **agentes**: CRUD completo
- [ ] **business-intelligence**: Análisis de Ventas y Clientes real
- [ ] **auditoria**: Análisis real
- [ ] **credito**: Historial real de pagos
- [ ] **productos**: import/export, filtros
- [ ] **pagares**: buscador + filtro vencidos
- [ ] **reestructuras**: ver detalle
- [ ] **comunicacion**: estado SMS y plantillas reales

### 🟩 FASE D — Optimización y producto *(continuo)*
- [ ] Queries N+1 restantes + índices por uso real
- [ ] Caché + revalidación en dashboards pesados
- [ ] Reportes exportables PDF/Excel (cartera, ventas, inventario)
- [ ] PWA: service worker + instalabilidad en campo
- [ ] Sidebar colapsable: persistir estado en localStorage

### 🔵 FASE E — Documentación y operación
- [ ] Runbook de despliegue y rollback
- [ ] Diagrama de arquitectura (ERP ↔ CONTPAQi ↔ SAT ↔ WAHA/SMS)
- [ ] Política de backups verificada con restore probado

---

## 🎯 Próximas acciones recomendadas
1. **Completar módulos parciales** de alto impacto: proveedores, agentes, BI
2. **Primeros tests** sobre cálculo de intereses y FIFO de pagos
3. **Configurar CI mínimo**: `tsc` + `lint` en cada PR
4. **Migrar a `prisma migrate`** antes de próximo deploy a producción
5. **Rate limiting en Redis/Upstash** para soporte multi-instancia
