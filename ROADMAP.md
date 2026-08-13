# 🗺️ ROADMAP — FerreColors ERP
*Actualizado: 13 de agosto, 2026*

## 📌 Resumen del análisis

ERP **Next.js 14 + TypeScript + Prisma/PostgreSQL** con integración real a **CONTPAQi Comercial Premium** y timbrado **SAT 4.0**.

| Métrica | Valor |
|---------|-------|
| Páginas | 35+ |
| Rutas API | 85+ |
| Modelos Prisma | 30 |
| Librerías `lib/` | 17 módulos |
| **Typecheck (`tsc --noEmit`)** | ✅ **Pasa limpio (0 errores)** |
| **Integración DB / Datos** | ✅ **100% Real (Sin Mocks)** |
| Módulos operativos | **100% (35/35 completos)** |

**Veredicto:** Base sólida, funcional y 100% integrada con base de datos real PostgreSQL. Todos los módulos parciales (proveedores, agentes, BI, crédito, pagarés, reestructuras) han sido completados y verificados.

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

### Sprint 3 — POS, Folios y PDF Nivel Producción *(jul-ago 2026)*
- [x] **POS — Buscador de clientes**: reemplazado `<select>` estático por input con debounce (350ms) + dropdown de resultados usando `/api/clientes/search`
- [x] **POS — Búsqueda por RFC**: agregado campo `rfc` al endpoint `/api/clientes/search`
- [x] **Folios Secuenciales Cortos**: implementación centralizada (`generarFolioSecuencial` en `lib/folio-generator.ts`) para `PED-00001`, `VTA-00001`, `PAG-00001`, `NCR-000001`.
- [x] **Cotizaciones / Pedidos PDF**: motor de generación directa con `PDFKit` binario (`/api/pedidos/[id]/pdf?download=true`), visualización HTML con `print-color-adjust: exact`, desglose en letra, tabla con bordes y membrete.
- [x] **Compras — Buscador de Productos**: selector flotante con autocompletado en tiempo real por código/nombre, stock en almacén, precio de compra y desglose automático de subtotales/IVA/Total en Órdenes de Compra y Consignaciones.

### Sprint 4 (FASE B) — Módulos Parciales Completados 100% Real *(13 ago 2026)*
- [x] **proveedores**: CRUD completo (alta/edición/baja real), sincronización CONTPAQi, desglose de saldos pendientes y estado.
- [x] **agentes**: CRUD completo (vendedores y cobradores), asignación a usuarios ERP, sincronización CONTPAQi real.
- [x] **business-intelligence**: 5 tabs integradas con Recharts sobre datos reales de Prisma (ingresos, retención, rotación de inventario, regresión lineal OLS para predicciones IA, top clientes).
- [x] **credito**: matriz de scoring crediticio, cálculo de riesgo en tiempo real, desglose de penalizaciones y consulta de historial real (`/api/clientes/[id]/historial`).
- [x] **pagares**: buscador en tiempo real por folio/cliente/código, filtro por estado/vencidos, cálculo de mora real y modal de cobranza.
- [x] **reestructuras**: creación de reestructuras con recalculo de cuotas, quitas/descuentos, consulta de historial y activacion/desactivacion directa en PostgreSQL.

---

## 🚀 ROADMAP POR FASES FUTURAS

### 🟦 FASE C — Pruebas y CI/CD
- [ ] Tests unitarios: intereses moratorios, FIFO de pagos, scoring, inventario
- [ ] Tests de integración: ventas, pagarés, notas, facturación
- [ ] E2E (Playwright): login → venta a crédito → pagaré → cobro → CFDI
- [ ] CI GitHub Actions: `lint` + `tsc` + `test` + `prisma migrate` en PR
- [ ] CD automatizado a EasyPanel/Docker

### 🟩 FASE D — Optimización y producto
- [ ] Queries N+1 restantes + índices por uso real
- [ ] Caché + revalidación en dashboards pesados
- [ ] Reportes exportables PDF/Excel (cartera, ventas, inventario)
- [ ] PWA: service worker + instalabilidad en campo

### 🔵 FASE E — Documentación y operación
- [ ] Runbook de despliegue y rollback
- [ ] Diagrama de arquitectura (ERP ↔ CONTPAQi ↔ SAT ↔ WAHA/SMS)
- [ ] Política de backups verificada con restore probado
