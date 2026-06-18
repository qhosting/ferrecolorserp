# 🗺️ ROADMAP — FerreColors ERP
*Análisis y plan de mejora · 17 de junio, 2026*

## 📌 Resumen del análisis

ERP **Next.js 14 + TypeScript + Prisma/PostgreSQL** con integración real a **CONTPAQi Comercial Premium** y timbrado **SAT 4.0**.

| Métrica | Valor |
|---------|-------|
| Páginas | 32 |
| Rutas API | 81 |
| Modelos Prisma | 30 |
| Librerías `lib/` | 15 módulos |
| **Typecheck (`tsc --noEmit`)** | ✅ **Pasa limpio (exit 0)** |
| Pruebas automatizadas | ❌ **0** |
| CI/CD | ❌ Ninguno |
| Migraciones Prisma | ❌ Solo `db push` (sin historial) |

**Veredicto:** base sólida y funcional (~90% de módulos operativos), pero le faltan los **cimientos de calidad y operación** (pruebas, CI, migraciones) y quedan **5 módulos con placeholders** y **1 funcionalidad simulada** (scheduler de automatización).

---

## 🔴 LO QUE FALTA POR COMPLETAR

### Placeholders / "Próximamente" en UI (funcionalidad incompleta)
| Módulo | Archivo | Detalle |
|--------|---------|---------|
| Business Intelligence | `app/business-intelligence/page.tsx:407,427` | Pestañas "Predicción" y "Segmentación avanzada" vacías |
| Compras | `app/compras/page.tsx:576,585` | 2 secciones "Funcionalidad en desarrollo" |
| Automatización | `app/automatizacion/page.tsx:620` | Pestaña "disponible próximamente" |
| Facturación electrónica | `app/facturacion-electronica/page.tsx:694` | Pestaña "disponible próximamente" |

### Funcionalidad simulada / a medias
- **Scheduler de automatización NO ejecuta.** `api/automatizacion/tasks` guarda definiciones en `configuracion.configJson`, pero **ningún cron las dispara**. Son solo registros sin ejecución real.
- **PAC / Certificados con valores de ejemplo.** `api/facturacion/pac` y `.../certificados` devuelven datos hardcodeados cuando no hay config. Además hay **dos caminos de facturación** (`/api/facturacion/*` y `/api/contpaqi/facturar`) → conviene unificar o documentar cuál es el canónico.
- **Cobranza móvil offline (Fase 17, "pospuesta").** El doc de estado y el git log se contradicen: faltan validar IndexedDB persistente + rutas GPS reales.

### Cimientos ausentes (riesgo para un ERP financiero)
- ❌ **Sin pruebas** (unitarias, integración ni e2e). Crítico para cálculos de pagarés, intereses moratorios e inventario.
- ❌ **Sin migraciones Prisma** — `db push` no deja historial ni permite rollback en producción.
- ❌ **Sin CI/CD** (no hay `.github/workflows`).
- ❌ **Sin logging estructurado ni monitoreo de errores** (solo `console.error`).
- ⚠️ **Credenciales de producción en texto plano** dentro de `ESTADO_DEL_PROYECTO.md`.
- ⚠️ **Sin rate limiting visible** en endpoints sensibles (`signup`, `sms`, `whatsapp`).

---

## 🚀 ROADMAP POR FASES

### 🟥 FASE A — Estabilización y seguridad *(1–2 semanas · prioridad máxima)*
- [ ] **Rotar y purgar credenciales** de `ESTADO_DEL_PROYECTO.md`; moverlas a gestor de secretos. Reescribir historial git si es necesario.
- [ ] **Adoptar migraciones Prisma** (`prisma migrate dev/deploy`); baseline del esquema actual.
- [ ] **Rate limiting** en `signup`, `sms/*`, `whatsapp/*`, `auth`.
- [ ] **Logging estructurado** (pino/winston) + integración de errores (Sentry o similar).
- [ ] Auditoría de autorización por rol en las 81 rutas (verificar `getServerSession` + chequeo de `role` en cada mutación).

### 🟧 FASE B — Pruebas y CI/CD *(2–3 semanas · prioridad alta)*
- [ ] **Tests unitarios** de lógica financiera: intereses moratorios, FIFO de pagos, scoring, afectación de inventario (`FOR UPDATE`).
- [ ] **Tests de integración** de las APIs críticas (ventas, pagarés, notas, facturación).
- [ ] **E2E** (Playwright) del flujo: login → venta a crédito → pagaré → cobro → factura CFDI.
- [ ] **CI** en GitHub Actions: `lint` + `tsc --noEmit` + `test` + `prisma migrate` en cada PR.
- [ ] **CD** automatizado a EasyPanel/Docker.

### 🟨 FASE C — Completar módulos con placeholders *(2–4 semanas)*
- [ ] **Automatización real:** worker/cron (BullMQ o cron del sistema) que ejecute las tareas guardadas (backups, recordatorios de cobranza, recálculo de intereses).
- [ ] **Business Intelligence:** implementar pestañas de predicción y segmentación (cohortes de cartera, proyección de morosidad).
- [ ] **Compras:** completar las 2 secciones "en desarrollo" (recepciones/órdenes pendientes).
- [ ] **Facturación electrónica:** cerrar la pestaña pendiente y **unificar** el camino de timbrado con CONTPAQi.
- [ ] **Cobranza móvil offline:** validar IndexedDB persistente + GPS de rutas y reconciliación al reconectar.

### 🟩 FASE D — Optimización y producto *(continuo)*
- [ ] Auditar queries N+1 restantes; añadir índices según patrones de uso real.
- [ ] Caché (React Query ya presente) + revalidación en dashboards pesados.
- [ ] Reportes exportables (PDF/Excel) en cartera, ventas e inventario.
- [ ] PWA: revisar service worker e instalabilidad en campo.
- [ ] Accesibilidad (a11y) y revisión responsive del nuevo tema glassmorphic.

### 🔵 FASE E — Documentación y operación
- [ ] Runbook de despliegue y rollback.
- [ ] Diagrama de arquitectura (ERP ↔ CONTPAQi ↔ SAT ↔ WAHA/SMS).
- [ ] Política de backups verificada (restore probado, no solo `pg_dump`).

---

## 🎯 Top 5 acciones inmediatas (esta semana)
1. **Rotar credenciales** expuestas en el repo.
2. **Migrar a `prisma migrate`** (dejar de usar `db push` en prod).
3. **Configurar CI** mínimo: `tsc` + `lint` en cada PR.
4. **Implementar el scheduler** que ejecute las tareas de automatización (hoy no corren).
5. **Primeros tests** sobre cálculo de intereses y FIFO de pagos (dinero = riesgo).
