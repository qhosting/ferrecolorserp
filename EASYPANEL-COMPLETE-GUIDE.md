
# 🚀 Guía Completa de Deployment en Easypanel

**VertexERP Completo v4.0**  
Última actualización: Octubre 2025

---

## 📑 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Configuración Inicial en Easypanel](#configuración-inicial-en-easypanel)
4. [Deployment Paso a Paso](#deployment-paso-a-paso)
5. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
6. [Configuración de Base de Datos](#configuración-de-base-de-datos)
7. [Configuración de Dominio Personalizado](#configuración-de-dominio-personalizado)
8. [Monitoreo y Logs](#monitoreo-y-logs)
9. [Backups y Recuperación](#backups-y-recuperación)
10. [Troubleshooting](#troubleshooting)
11. [Optimizaciones de Performance](#optimizaciones-de-performance)
12. [Actualizaciones](#actualizaciones)

---

## 🎯 Introducción

Esta guía te ayudará a desplegar el VertexERP Completo en **Easypanel**, una plataforma de hosting moderna que simplifica el deployment de aplicaciones Docker.

### ¿Qué incluye este deployment?

✅ Aplicación Next.js 14 con TypeScript  
✅ Base de datos PostgreSQL 15  
✅ SSL automático con Let's Encrypt  
✅ Health checks automáticos  
✅ Backups automáticos de base de datos  
✅ Logs centralizados  
✅ Auto-scaling (según plan)  

### Arquitectura del Deployment

```
┌─────────────────────────────────────────┐
│          Easypanel Platform             │
│  ┌───────────────────────────────────┐  │
│  │     VertexERP App (Next.js)     │  │
│  │        Docker Container           │  │
│  │           Port: 3000              │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │   PostgreSQL Database             │  │
│  │        Docker Container           │  │
│  │           Port: 5432              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 📋 Requisitos Previos

### 1. Cuenta de Easypanel

- Crea una cuenta en [Easypanel.io](https://easypanel.io)
- Planes disponibles:
  - **Hobby:** $5/mes (ideal para desarrollo/testing)
  - **Pro:** $15/mes (recomendado para producción)
  - **Business:** $50/mes (alta disponibilidad)

### 2. Servidor VPS

Easypanel requiere un VPS. Opciones recomendadas:

#### Opción A: DigitalOcean (Recomendado)
- **Droplet básico:** $6/mes (1 vCPU, 1GB RAM)
- **Droplet recomendado:** $12/mes (2 vCPUs, 2GB RAM)
- **Droplet producción:** $24/mes (4 vCPUs, 4GB RAM)

#### Opción B: Hetzner (Mejor precio)
- **CX21:** €5.40/mes (2 vCPUs, 4GB RAM)
- **CX31:** €9.90/mes (2 vCPUs, 8GB RAM)

#### Opción C: Vultr
- **Regular:** $6/mes (1 vCPU, 1GB RAM)
- **High Frequency:** $12/mes (2 vCPUs, 2GB RAM)

### 3. Dominio (Opcional pero recomendado)

- Registra un dominio en Namecheap, GoDaddy, o Cloudflare
- Ejemplo: `tuempresa.com`

### 4. Código en GitHub

- Repositorio: `https://github.com/qhosting/sistema-erp-completo`
- Branch: `main`
- Tag: `v4.0.0`

---

## 🚀 Configuración Inicial en Easypanel

### Paso 1: Instalar Easypanel en tu VPS

**1.1. Conectarse al VPS vía SSH:**

```bash
ssh root@TU_IP_DEL_VPS
```

**1.2. Instalar Easypanel:**

```bash
curl -sSL https://get.easypanel.io | sh
```

**1.3. Esperar la instalación (3-5 minutos)**

La instalación automáticamente:
- Instala Docker y Docker Compose
- Configura Traefik como reverse proxy
- Configura SSL con Let's Encrypt
- Crea el panel de administración

**1.4. Acceder al panel:**

```
https://TU_IP_DEL_VPS:3000
```

**1.5. Crear usuario admin:**
- Email: tu-email@ejemplo.com
- Password: (usa un password seguro)

---

## 📦 Deployment Paso a Paso

### Paso 2: Crear Proyecto en Easypanel

**2.1. Crear nuevo proyecto:**
- Click en "Create Project"
- Nombre: `sistema-erp-completo`
- Descripción: `VertexERP Completo v4.0`

**2.2. Configuración del proyecto:**
```yaml
Name: sistema-erp-completo
Description: VertexERP Completo para gestión empresarial
Environment: production
```

### Paso 3: Crear Servicio de Base de Datos

**3.1. Añadir servicio PostgreSQL:**
- En el proyecto, click "Add Service"
- Seleccionar "PostgreSQL"
- Configuración:

```yaml
Service Name: erp-database
PostgreSQL Version: 15
Database Name: erp_production
Username: erp_user
Password: [Generar password seguro]
Port: 5432
Volume Size: 10GB (ajustar según necesidades)
```

**3.2. Variables de entorno automáticas:**

Easypanel creará automáticamente:
```
POSTGRES_USER=erp_user
POSTGRES_PASSWORD=generated_password
POSTGRES_DB=erp_production
DATABASE_URL=postgresql://erp_user:generated_password@erp-database:5432/erp_production
```

**3.3. Configurar backups automáticos:**
- Habilitar "Automatic Backups"
- Frecuencia: Daily (diario)
- Retención: 7 días
- Hora: 03:00 AM

### Paso 4: Crear Servicio de Aplicación

**4.1. Añadir servicio desde GitHub:**
- Click "Add Service"
- Seleccionar "Docker"
- Source: "GitHub Repository"

**4.2. Configurar repositorio:**

```yaml
Repository: qhosting/sistema-erp-completo
Branch: main
Build Context: .
Dockerfile Path: ./Dockerfile
Auto Deploy: true
```

**4.3. Configurar build:**

```yaml
Build Arguments:
  NODE_ENV: production

Resource Limits:
  Memory: 1GB (mínimo), 2GB (recomendado)
  CPU: 1 core (mínimo), 2 cores (recomendado)
```

**4.4. Configurar networking:**

```yaml
Internal Port: 3000
External Access: Enabled
Domain: [Configurar después]
```

**4.5. Health Check:**

```yaml
Enabled: true
Path: /api/health
Interval: 30s
Timeout: 10s
Retries: 3
```

### Paso 5: Configurar Variables de Entorno

**5.1. Variables de entorno obligatorias:**

```bash
# Base de datos (auto-generada por Easypanel)
DATABASE_URL=postgresql://erp_user:password@erp-database:5432/erp_production

# NextAuth (IMPORTANTE: Generar valores únicos)
NEXTAUTH_URL=https://tudominio.com
NEXTAUTH_SECRET=generar_32_caracteres_aleatorios

# Node
NODE_ENV=production
PORT=3000
```

**5.2. Generar NEXTAUTH_SECRET:**

```bash
# Opción 1: OpenSSL
openssl rand -base64 32

# Opción 2: Online
# https://generate-secret.vercel.app/32
```

**5.3. Variables opcionales (según integraciones):**

```bash
# OpenPay
OPENPAY_MERCHANT_ID=merchant_id_prod
OPENPAY_PUBLIC_KEY=public_key_prod
OPENPAY_PRIVATE_KEY=private_key_prod
OPENPAY_BASE_URL=https://api.openpay.mx/v1
OPENPAY_ENVIRONMENT=production

# Abacus.AI
ABACUSAI_API_KEY=tu_api_key

# SMS
SMS_API_KEY=tu_api_key
SMS_API_URL=https://api.sms-provider.com

# WhatsApp
WHATSAPP_API_TOKEN=tu_token
WHATSAPP_PHONE_NUMBER_ID=tu_phone_id

# Email SMTP
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=tu_email@gmail.com
EMAIL_SMTP_PASSWORD=app_password

# Facturación Electrónica
PAC_PROVIDER=finkok
PAC_API_KEY=api_key_prod
PAC_API_URL=https://facturacion.finkok.com/servicios/soap

# Empresa
COMPANY_NAME=Tu Empresa S.A. de C.V.
COMPANY_RFC=XAXX010101000
COMPANY_ADDRESS=Dirección completa
COMPANY_PHONE=55-1234-5678
COMPANY_EMAIL=contacto@tuempresa.com

# Regional
DEFAULT_CURRENCY=MXN
DEFAULT_TIMEZONE=America/Mexico_City
DEFAULT_LANGUAGE=es
IVA_RATE=16
```

**5.4. Añadir variables en Easypanel:**

1. Ve a tu servicio de aplicación
2. Click en "Environment"
3. Click en "Add Variable"
4. Añade cada variable (Nombre = Valor)
5. Click "Save"

**⚠️ IMPORTANTE:** Usa el tipo "Secret" para datos sensibles (passwords, API keys)

### Paso 6: Deploy Inicial

**6.1. Iniciar deployment:**
- Click en "Deploy" en el servicio de aplicación
- Easypanel automáticamente:
  - Clona el repositorio
  - Construye la imagen Docker
  - Ejecuta el contenedor
  - Configura el reverse proxy
  - Ejecuta health checks

**6.2. Monitorear el deployment:**
- Ve a "Logs" para ver el progreso
- Espera a que el status sea "Running" (verde)
- Tiempo estimado: 5-10 minutos

**6.3. Verificar que está funcionando:**
- Click en "Open" para abrir la aplicación
- O visita: `https://TU_IP_DEL_VPS:puerto-asignado`

---

## 🌐 Configuración de Dominio Personalizado

### Paso 7: Configurar DNS

**7.1. En tu proveedor de dominios (Cloudflare/Namecheap/etc.):**

Añade estos registros DNS:

```
Tipo   | Nombre | Valor              | TTL
-------|--------|--------------------|---------
A      | @      | TU_IP_DEL_VPS      | 3600
A      | www    | TU_IP_DEL_VPS      | 3600
CNAME  | *      | tudominio.com      | 3600 (Opcional)
```

**Ejemplo:**
```
A      | @      | 165.232.140.50     | 3600
A      | www    | 165.232.140.50     | 3600
```

**7.2. Esperar propagación DNS (5 minutos - 48 horas)**

Verificar con:
```bash
nslookup tudominio.com
# o
dig tudominio.com
```

### Paso 8: Configurar Dominio en Easypanel

**8.1. Añadir dominio:**
- Ve a tu servicio de aplicación
- Section "Domains"
- Click "Add Domain"
- Ingresa: `tudominio.com`
- Habilitar: "Auto SSL" (Let's Encrypt)
- Click "Save"

**8.2. Añadir www (opcional):**
- Click "Add Domain"
- Ingresa: `www.tudominio.com`
- Habilitar: "Redirect to" → `tudominio.com`
- Click "Save"

**8.3. SSL Automático:**
- Easypanel automáticamente solicitará certificado SSL
- Tiempo: 1-2 minutos
- Status: "SSL Active" (candado verde)

**8.4. Actualizar NEXTAUTH_URL:**
- Ve a "Environment"
- Edita `NEXTAUTH_URL`
- Nuevo valor: `https://tudominio.com`
- Click "Save" y "Redeploy"

---

## 📊 Monitoreo y Logs

### Paso 9: Configurar Monitoreo

**9.1. Logs en tiempo real:**
- Ve a tu servicio
- Click en "Logs"
- Selecciona "Live Logs"

**9.2. Métricas:**
- CPU Usage
- Memory Usage
- Network I/O
- Disk Usage

**9.3. Alerts (Alertas):**
- Configurar alertas por email
- Thresholds:
  - CPU > 80%
  - Memory > 90%
  - Disk > 85%
  - Health check failed

**9.4. Health Check Status:**
- Verde: Todo funciona correctamente
- Amarillo: Problemas intermitentes
- Rojo: Servicio caído

### Verificar Health Check Manualmente

```bash
curl https://tudominio.com/api/health

# Respuesta esperada:
{
  "status": "healthy",
  "timestamp": "2025-10-24T12:00:00.000Z",
  "database": "connected",
  "version": "4.0.0"
}
```

---

## 💾 Backups y Recuperación

### Paso 10: Configurar Backups

**10.1. Backups automáticos de PostgreSQL:**

Easypanel incluye backups automáticos:
- Frecuencia: Diaria
- Retención: 7 días (gratis), 30 días (Pro+)
- Horario: 03:00 AM (configurable)

**10.2. Backups manuales:**

```bash
# Desde Easypanel UI
Services → erp-database → Backups → Create Backup
```

**10.3. Descargar backup:**
```bash
# Click en el backup
# Click "Download"
# Archivo: erp_production_2025-10-24.sql.gz
```

**10.4. Restaurar desde backup:**
```bash
# Easypanel UI
Backups → Seleccionar backup → Restore

# O manualmente:
gunzip < backup.sql.gz | psql $DATABASE_URL
```

**10.5. Backup del código:**

Automático vía GitHub:
- Todo el código está en GitHub
- Tags de versión: `v4.0.0`
- Branches: `main`, `develop`

---

## 🔧 Troubleshooting

### Problemas Comunes

#### 1. Error: "Application failed to start"

**Causa:** Variables de entorno faltantes o incorrectas

**Solución:**
```bash
# Verificar logs
Logs → Buscar errores de "DATABASE_URL" o "NEXTAUTH_SECRET"

# Verificar variables
Environment → Revisar que todas estén configuradas
```

#### 2. Error: "Database connection failed"

**Causa:** PostgreSQL no está listo o DATABASE_URL incorrecta

**Solución:**
```bash
# Verificar PostgreSQL
Services → erp-database → Status debe ser "Running"

# Verificar DATABASE_URL
# Formato: postgresql://user:pass@host:5432/database
# Host debe ser: erp-database (no localhost)
```

#### 3. Error 502 "Bad Gateway"

**Causa:** Aplicación no responde en el puerto correcto

**Solución:**
```bash
# Verificar puerto interno
Settings → Internal Port debe ser 3000

# Verificar health check
/api/health debe responder con status 200
```

#### 4. SSL no funciona

**Causa:** DNS no propagado o dominio mal configurado

**Solución:**
```bash
# Verificar DNS
nslookup tudominio.com
# Debe apuntar a la IP de tu VPS

# Esperar propagación (hasta 48h)
# Reintentar SSL
Domains → tudominio.com → Retry SSL
```

#### 5. "Out of Memory" Error

**Causa:** Recursos insuficientes

**Solución:**
```bash
# Aumentar límites
Settings → Resources → Memory: 2GB

# O upgrade del VPS
# DigitalOcean: $12/mes (2GB RAM)
# Hetzner: €5.40/mes (4GB RAM)
```

#### 6. Migraciones de base de datos fallan

**Causa:** Permisos o schema desactualizado

**Solución:**
```bash
# Ejecutar manualmente
Services → erp-app → Console

# Ejecutar:
npx prisma migrate deploy
# o
npx prisma db push
```

### Debug Avanzado

**Acceder al contenedor:**
```bash
# Desde Easypanel UI
Services → erp-app → Console

# Comandos útiles:
node -v  # Verificar versión de Node
ls -la   # Ver archivos
cat .env # Ver variables (NO compartir)
```

**Ver logs detallados:**
```bash
# Application logs
Logs → Filter: "error"

# System logs
Server → Logs
```

---

## ⚡ Optimizaciones de Performance

### 1. Caché de Assets

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['tudominio.com'],
    formats: ['image/webp', 'image/avif'],
  },
};
```

### 2. CDN (Cloudflare)

**Configuración:**
1. Añadir sitio a Cloudflare
2. Cambiar nameservers
3. Habilitar:
   - Auto Minify (JS, CSS, HTML)
   - Brotli compression
   - HTTP/3
   - Caching

### 3. Database Optimization

```sql
-- Crear índices para queries frecuentes
CREATE INDEX idx_clientes_nombre ON cat_clientes(nombre);
CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX idx_pagos_cliente ON pagos(cliente_id);

-- Vacuum regular
VACUUM ANALYZE;
```

### 4. Resource Limits

```yaml
# Ajustar según carga
Memory: 2GB (desarrollo), 4GB (producción)
CPU: 2 cores (desarrollo), 4 cores (producción)
```

### 5. Horizontal Scaling

**Para alto tráfico:**
- Multiple app instances
- Load balancer
- Separar DB server
- Redis para sessions

---

## 🔄 Actualizaciones

### Actualizar el VertexERP

**Método 1: Auto-Deploy (Recomendado)**

1. Push cambios a GitHub:
```bash
git add .
git commit -m "Actualización v4.1.0"
git push origin main
```

2. Easypanel detecta cambios automáticamente
3. Rebuild & redeploy automático
4. Tiempo: 5-10 minutos

**Método 2: Manual Deploy**

```bash
# Easypanel UI
Services → erp-app → Deploy → Deploy Now
```

**Método 3: Rolling Update (Zero Downtime)**

```bash
# Pro plan only
Services → erp-app → Deploy → Rolling Update
```

### Actualizar Base de Datos (Migrations)

```bash
# 1. Hacer backup
Services → erp-database → Create Backup

# 2. Actualizar código con migrations
git push (con nuevos archivos en prisma/migrations)

# 3. Auto-deploy ejecutará:
npx prisma migrate deploy

# 4. Verificar en logs
Logs → Buscar "Migration applied"
```

### Rollback

**Si algo sale mal:**

```bash
# Opción 1: Desde GitHub
git revert HEAD
git push

# Opción 2: Desde Easypanel
Services → erp-app → Deployments → Previous → Redeploy

# Opción 3: Restaurar DB
Services → erp-database → Backups → Select → Restore
```

---

## 📈 Escalabilidad

### Para Crecer el Sistema

**1. Upgrade VPS:**
```
Inicial:  $12/mes (2GB RAM, 2 vCPUs)
Medio:    $24/mes (4GB RAM, 4 vCPUs)
Grande:   $48/mes (8GB RAM, 8 vCPUs)
```

**2. Separar Servicios:**
- VPS 1: Aplicación (Node.js)
- VPS 2: Base de datos (PostgreSQL)
- VPS 3: Redis (Sessions/Cache)

**3. Load Balancing:**
- Multiple app instances
- Nginx/Traefik load balancer
- Sticky sessions

**4. Database Scaling:**
- Read replicas
- Connection pooling (PgBouncer)
- Indices optimizados

---

## 🔐 Seguridad Best Practices

### Checklist de Seguridad

- [ ] SSL habilitado (HTTPS)
- [ ] Firewall configurado (solo puertos 80, 443, 22)
- [ ] Passwords fuertes (mínimo 16 caracteres)
- [ ] Secrets en variables de entorno (NO en código)
- [ ] Backups automáticos habilitados
- [ ] 2FA en Easypanel
- [ ] 2FA en GitHub
- [ ] Updates automáticos de seguridad
- [ ] Monitoring y alertas configurados
- [ ] Rate limiting en APIs
- [ ] SQL injection prevention (Prisma)
- [ ] XSS prevention (React)
- [ ] CSRF protection (NextAuth)

### Actualización de Seguridad

```bash
# Actualizar dependencias
cd app
yarn upgrade

# Verificar vulnerabilidades
yarn audit

# Fix automático
yarn audit fix
```

---

## 💰 Costos Estimados

### Breakdown Mensual

#### Opción 1: Desarrollo/Testing
```
VPS (Hetzner CX21):        €5.40  (~$6 USD)
Easypanel Hobby:           $5
Dominio (.com):            $1 (anual/12)
─────────────────────────────────
Total:                     ~$12/mes
```

#### Opción 2: Producción Pequeña
```
VPS (DigitalOcean 2GB):    $12
Easypanel Pro:             $15
Dominio (.com):            $1
Cloudflare Free:           $0
─────────────────────────────────
Total:                     $28/mes
```

#### Opción 3: Producción Mediana
```
VPS (DigitalOcean 4GB):    $24
Easypanel Pro:             $15
Dominio (.com):            $1
Cloudflare Pro:            $20
Backups externos (S3):     $5
─────────────────────────────────
Total:                     $65/mes
```

#### Opción 4: Enterprise
```
VPS (Hetzner CPX51):       €19.90 (~$21)
VPS DB (Hetzner CPX31):    €9.90 (~$11)
Easypanel Business:        $50
Dominio (.com):            $1
Cloudflare Business:       $200
Backups (S3):              $10
Monitoring (Better Stack): $20
─────────────────────────────────
Total:                     ~$313/mes
```

---

## 📞 Soporte

### Recursos

- **Documentación Easypanel:** https://easypanel.io/docs
- **Comunidad Discord:** https://discord.gg/easypanel
- **GitHub Issues:** https://github.com/qhosting/sistema-erp-completo/issues
- **Email Soporte:** contacto@tuempresa.com

### Soporte del VertexERP

Para problemas específicos del código:
1. Revisa la documentación en el repositorio
2. Consulta TROUBLESHOOTING.md
3. Abre un issue en GitHub
4. Contacta al equipo de desarrollo

---

## ✅ Checklist Final de Deployment

Antes de considerar el deployment completo:

### Pre-Deployment
- [ ] Código en GitHub actualizado
- [ ] Variables de entorno documentadas
- [ ] Dockerfile y docker-compose.yml verificados
- [ ] VPS configurado y accesible
- [ ] Easypanel instalado

### Durante Deployment
- [ ] PostgreSQL desplegado y saludable
- [ ] Aplicación desplegada y saludable
- [ ] Variables de entorno configuradas
- [ ] Health check funcionando
- [ ] Migraciones de DB aplicadas

### Post-Deployment
- [ ] Dominio configurado y SSL activo
- [ ] Backups automáticos habilitados
- [ ] Monitoring configurado
- [ ] Alertas configuradas
- [ ] Documentación actualizada
- [ ] Equipo notificado
- [ ] Testing en producción completado

---

## 🎉 ¡Deployment Exitoso!

Si has seguido todos los pasos, tu VertexERP Completo v4.0 debería estar:

✅ Corriendo en producción  
✅ Accesible vía HTTPS  
✅ Con backups automáticos  
✅ Con monitoring activo  
✅ Listo para usuarios reales  

**URL de tu aplicación:** `https://tudominio.com`

**¡Felicidades! 🚀**

---

**Última actualización:** Octubre 2025  
**Versión de la guía:** 1.0  
**Autor:** VertexERP Team

