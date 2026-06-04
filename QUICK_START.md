
# ⚡ Quick Start - FerreColors Completo v4.0

## 🚀 Instalación Ultra Rápida (5 minutos)

### Opción A: Con Docker (Más fácil)
```bash
# 1. Clonar repositorio
git clone https://github.com/TU-USUARIO/sistema-erp-completo.git
cd sistema-erp-completo

# 2. Ejecutar con Docker Compose
docker-compose up -d

# ¡Listo! Ve a http://localhost:3000
```

### Opción B: Instalación Manual
```bash
# 1. Clonar y entrar al directorio
git clone https://github.com/TU-USUARIO/sistema-erp-completo.git
cd sistema-erp-completo/app

# 2. Instalar dependencias
yarn install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 4. Configurar base de datos
yarn prisma generate
yarn prisma db push
yarn prisma db seed

# 5. Ejecutar
yarn dev

# ¡Listo! Ve a http://localhost:3000
```

## 🔑 Variables de Entorno Mínimas

```env
# Configuración básica para empezar
DATABASE_URL="postgresql://usuario:password@localhost:5432/erp_db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generar_secret_seguro"
```

## 👤 Usuario de Prueba

```
Email: admin@ejemplo.com
Contraseña: admin123
```

## 🎯 Primeros Pasos

1. **📊 Dashboard** - Ve a `/dashboard` para métricas
2. **👥 Clientes** - Añade tus primeros clientes en `/clientes`
3. **📦 Productos** - Configura tu inventario en `/productos` 
4. **💰 Ventas** - Realiza tu primera venta en `/ventas`
5. **📱 Cobranza** - Gestiona pagos en `/cobranza`

## 📞 ¿Necesitas Ayuda?

- **📚 Documentación completa**: [README.md](README.md)
- **🔧 Instalación detallada**: [INSTALL.md](INSTALL.md)
- **🆘 Soporte**: [SUPPORT.md](SUPPORT.md)
- **🐛 Reportar problema**: [GitHub Issues](https://github.com/TU-USUARIO/sistema-erp-completo/issues)

---

**¡Tu FerreColors está listo en minutos!** 🎉

