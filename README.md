
# 🏢 VertexERP v4.0

## Descripción del Proyecto

**VertexERP** es un Sistema ERP (Enterprise Resource Planning) completo desarrollado con **Next.js 14**, **TypeScript**, **Prisma**, **PostgreSQL** y **Tailwind CSS**. Diseñado específicamente para empresas que manejan ventas a crédito, cobranza, inventario y gestión integral de clientes.

## 🎯 Características Principales

### ✅ **FASE 1: Funcionalidades Básicas** (100% Completada)
- **Dashboard Ejecutivo** con métricas en tiempo real
- **Gestión de Clientes** completa con historial crediticio
- **Catálogo de Productos** con control de inventario
- **Sistema de Ventas** con múltiples formas de pago
- **Generación de Pagarés** automática
- **Autenticación y Seguridad** con NextAuth.js

### ✅ **FASE 2: Cobranza y Finanzas** (100% Completada)
- **Módulo de Cobranza** con seguimiento detallado
- **Gestión de Pagarés** con estados y vencimientos
- **Cálculo Automático de Intereses** moratorios
- **Reestructuras de Crédito** con aprobaciones
- **Notas de Cargo y Crédito** aplicables
- **Reportes Financieros** detallados

### ✅ **FASE 3: Operaciones Avanzadas** (100% Completada)
- **Cobranza Móvil** con funcionalidades offline
- **Sistema de Garantías** completo
- **Comunicación Integrada** (SMS, WhatsApp, Email)
- **Gestión de Crédito** avanzada
- **Cuentas por Pagar** a proveedores
- **Reportes Avanzados** con gráficos

### ✅ **FASE 4: Automatización e Integraciones** (100% Completada)
- **Módulo de Compras** con gestión de proveedores
- **Automatización Avanzada** con workflows
- **Sistema de Auditoría** completo
- **Facturación Electrónica** (CFDI México)
- **Business Intelligence** con predicciones IA
- **Integraciones** con servicios externos

## 🚀 Tecnologías Utilizadas

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de Datos**: PostgreSQL
- **Autenticación**: NextAuth.js
- **UI/UX**: Tailwind CSS, Radix UI, shadcn/ui
- **Gráficos**: Recharts, Chart.js
- **Pagos**: OpenPay Integration
- **Facturación**: PACs certificados (México)

## 📊 Métricas del Proyecto

- **65+ Páginas/Rutas** implementadas
- **150+ Componentes** de UI reutilizables
- **50+ APIs** REST endpoints
- **25+ Modelos** de base de datos
- **100%** de cobertura funcional planificada

## 🛠️ Instalación Rápida

### Prerrequisitos
- Node.js 18+ y yarn
- PostgreSQL 14+
- Cuenta DeepAgent (para importación)

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone [URL_DEL_REPO]
cd sistema_erp_completo/app
```

2. **Instalar dependencias**
```bash
yarn install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Configurar base de datos**
```bash
yarn prisma generate
yarn prisma db push
yarn prisma db seed
```

5. **Ejecutar en desarrollo**
```bash
yarn dev
```

## 🔧 Variables de Entorno Requeridas

```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/erp_db"

# Autenticación
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu_secret_super_seguro"

# OpenPay (Opcional)
OPENPAY_MERCHANT_ID="tu_merchant_id"
OPENPAY_PUBLIC_KEY="tu_public_key"
OPENPAY_PRIVATE_KEY="tu_private_key"

# APIs externas (Opcional)
ABACUSAI_API_KEY="tu_api_key"
```

## 📱 Módulos del Sistema

### 🏠 Dashboard Ejecutivo
- Métricas en tiempo real
- Gráficos interactivos
- KPIs principales
- Alertas automáticas

### 👥 Gestión de Clientes
- CRUD completo de clientes
- Historial crediticio
- Límites de crédito
- Comunicación integrada

### 📦 Inventario y Productos
- Catálogo de productos
- Control de stock
- Movimientos de inventario
- Alertas de stock bajo

### 💰 Ventas y Cobranza
- Proceso de ventas completo
- Generación automática de pagarés
- Seguimiento de cobranza
- Cálculo de intereses

### 🔄 Automatización
- Workflows personalizables
- Tareas programadas
- Notificaciones automáticas
- Integración con servicios externos

### 📊 Reportes y BI
- Dashboards ejecutivos
- Análisis predictivo
- Exportación a Excel/PDF
- Business Intelligence

## 🛡️ Seguridad y Auditoría

- Autenticación robusta con NextAuth.js
- Control de acceso por roles
- Auditoría completa de cambios
- Logs de seguridad
- Encriptación de datos sensibles

## 📈 Rendimiento

- Build optimizado: **87.5kB** JS inicial
- **65 rutas** estáticas generadas
- Lazy loading de componentes
- Optimización de imágenes
- Cache inteligente

## 🎨 Interfaz de Usuario

- Diseño responsive y moderno
- Componentes reutilizables
- Tema personalizable
- Accesibilidad (WCAG 2.1)
- PWA ready

## 📞 Soporte y Documentación

- **Documentación Técnica**: `/docs`
- **Guía de Importación**: `DEEPAGENT_IMPORT_GUIDE.md`
- **Changelog**: `CHANGELOG_v4.md`
- **Estado del Proyecto**: `PROYECTO_STATUS.md`

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## ✨ Desarrollado con DeepAgent

Este sistema fue desarrollado utilizando **DeepAgent de Abacus.AI**, demostrando el poder de la IA para crear aplicaciones empresariales complejas y funcionales.

---

**Sistema ERP Completo v4.0** - Solución integral para empresas modernas 🚀
