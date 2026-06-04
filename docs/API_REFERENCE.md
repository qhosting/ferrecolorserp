
# 📡 API Reference - Sistema ERP Completo

Documentación completa de todas las APIs REST disponibles en el sistema.

## 🔐 Autenticación

Todas las APIs requieren autenticación mediante NextAuth.js. Las rutas están protegidas por rol de usuario.

### **Sistema de Roles**
- `SUPERADMIN`: Acceso completo
- `ADMIN`: Gestión de usuarios y configuración
- `VENTAS`: Pedidos, ventas, clientes
- `GESTOR`: Cobranza, pagos, reestructuras
- `ANALISTA`: Reportes y consultas
- `CLIENTE`: Portal limitado

## 📋 Endpoints Disponibles

### **🔑 Autenticación**

#### `POST /api/auth/signin`
Iniciar sesión en el sistema.
```json
{
  "email": "admin@erp.com",
  "password": "admin123"
}
```

#### `POST /api/auth/signout`
Cerrar sesión activa.

---

### **👥 Gestión de Usuarios**

#### `GET /api/users`
Obtener lista de usuarios del sistema.
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Admin User",
      "email": "admin@erp.com", 
      "role": "SUPERADMIN",
      "isActive": true
    }
  ]
}
```

#### `POST /api/users`
Crear nuevo usuario.
```json
{
  "name": "Nuevo Usuario",
  "email": "usuario@empresa.com",
  "password": "password123",
  "role": "VENTAS",
  "sucursal": "Principal"
}
```

---

### **👤 Gestión de Clientes**

#### `GET /api/clientes`
Listar clientes con filtros opcionales.

**Query Parameters:**
- `search`: Búsqueda por nombre/código
- `status`: Filtrar por estado (ACTIVO, INACTIVO, MOROSO)
- `gestorId`: Filtrar por gestor asignado

```json
{
  "clientes": [
    {
      "id": "uuid",
      "codigoCliente": "CLI-001",
      "nombre": "Cliente Ejemplo",
      "telefono1": "5555551234",
      "email": "cliente@email.com",
      "saldoActual": 15000.00,
      "limiteCredito": 50000.00,
      "status": "ACTIVO"
    }
  ]
}
```

#### `POST /api/clientes`
Crear nuevo cliente.
```json
{
  "codigoCliente": "CLI-002", 
  "nombre": "Nuevo Cliente SA de CV",
  "telefono1": "5555559999",
  "email": "nuevo@cliente.com",
  "calle": "Av. Ejemplo 123",
  "colonia": "Centro",
  "municipio": "Ciudad",
  "estado": "Estado",
  "codigoPostal": "12345",
  "limiteCredito": 25000.00
}
```

#### `GET /api/clientes/[id]`
Obtener cliente específico con detalles completos.

#### `PUT /api/clientes/[id]`
Actualizar información del cliente.

#### `POST /api/clientes/import`
Importar clientes desde CSV.

---

### **📦 Gestión de Productos**

#### `GET /api/productos`
Listar productos del catálogo.

**Query Parameters:**
- `search`: Búsqueda por código/nombre
- `categoria`: Filtrar por categoría
- `marca`: Filtrar por marca
- `activo`: Solo productos activos

```json
{
  "productos": [
    {
      "id": "uuid",
      "codigo": "PROD-001",
      "nombre": "Producto Ejemplo",
      "descripcion": "Descripción del producto",
      "categoria": "Electrónicos",
      "marca": "Marca X",
      "precio1": 100.00,
      "precio2": 90.00,
      "precio3": 85.00,
      "stock": 50,
      "stockMinimo": 10,
      "isActive": true
    }
  ]
}
```

#### `POST /api/productos`
Crear nuevo producto.
```json
{
  "codigo": "PROD-002",
  "nombre": "Nuevo Producto",
  "descripcion": "Descripción detallada",
  "categoria": "Herramientas", 
  "marca": "Marca Y",
  "precio1": 150.00,
  "precioCompra": 100.00,
  "stock": 25,
  "stockMinimo": 5,
  "stockMaximo": 100
}
```

#### `GET /api/productos/[id]`
Obtener producto específico.

#### `PUT /api/productos/[id]`
Actualizar información del producto.

---

### **📝 Sistema de Pedidos**

#### `GET /api/pedidos`
Listar pedidos con filtros.

**Query Parameters:**
- `clienteId`: Pedidos de cliente específico
- `vendedorId`: Pedidos de vendedor específico
- `estatus`: PENDIENTE, APROBADO, CONVERTIDO_VENTA

```json
{
  "pedidos": [
    {
      "id": "uuid",
      "folio": "PED-001",
      "cliente": {
        "nombre": "Cliente Ejemplo",
        "codigoCliente": "CLI-001"
      },
      "vendedor": {
        "name": "Vendedor 1"
      },
      "subtotal": 1000.00,
      "iva": 160.00,
      "total": 1160.00,
      "estatus": "PENDIENTE",
      "fechaPedido": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `POST /api/pedidos`
Crear nuevo pedido.
```json
{
  "clienteId": "uuid",
  "vendedorId": "uuid",
  "observaciones": "Pedido urgente",
  "detalles": [
    {
      "productoId": "uuid",
      "cantidad": 2,
      "precioUnitario": 100.00
    }
  ]
}
```

#### `POST /api/pedidos/[id]/convertir-venta`
Convertir pedido a venta con generación automática de pagarés.
```json
{
  "pagoInicial": 200.00,
  "periodicidadPago": "SEMANAL",
  "montoPago": 150.00,
  "fechaProximoPago": "2024-01-22"
}
```

---

### **💰 Sistema de Ventas**

#### `GET /api/ventas`
Listar ventas realizadas.

**Query Parameters:**
- `clienteId`: Ventas de cliente específico
- `fechaInicio`: Filtro por fecha inicial
- `fechaFin`: Filtro por fecha final
- `status`: Estado de la venta

```json
{
  "ventas": [
    {
      "id": "uuid",
      "folio": "VENTA-001", 
      "numeroFactura": "A-123",
      "cliente": {
        "nombre": "Cliente Ejemplo"
      },
      "subtotal": 1000.00,
      "iva": 160.00,
      "total": 1160.00,
      "pagoInicial": 200.00,
      "saldoPendiente": 960.00,
      "status": "CONFIRMADA",
      "fechaVenta": "2024-01-15T14:30:00Z"
    }
  ]
}
```

#### `POST /api/ventas`
Crear nueva venta directamente.

#### `GET /api/ventas/[id]`
Obtener venta específica con detalles y pagarés.

---

### **📄 Sistema de Pagarés**

#### `GET /api/pagares`
Listar pagarés del sistema.

**Query Parameters:**
- `clienteId`: Pagarés de cliente específico
- `estatus`: PENDIENTE, VENCIDO, PAGADO
- `fechaVencimiento`: Filtrar por fecha de vencimiento

```json
{
  "pagares": [
    {
      "id": "uuid",
      "venta": {
        "folio": "VENTA-001",
        "cliente": {
          "nombre": "Cliente Ejemplo"
        }
      },
      "numeroPago": 1,
      "monto": 240.00,
      "fechaVencimiento": "2024-01-22T00:00:00Z",
      "montoPagado": 0.00,
      "diasVencido": 0,
      "interesesMora": 0.00,
      "estatus": "PENDIENTE"
    }
  ]
}
```

#### `POST /api/pagares/calcular-intereses`
Calcular intereses de mora para pagarés vencidos.
```json
{
  "fechaCorte": "2024-01-30",
  "tasaInteres": 3.0
}
```

#### `POST /api/pagares/[id]/aplicar-pago`
Aplicar pago a pagaré específico.
```json
{
  "montoPago": 240.00,
  "fechaPago": "2024-01-22",
  "tipoPago": "EFECTIVO",
  "referencia": "PAG-001"
}
```

---

### **📋 Notas de Cargo**

#### `GET /api/notas-cargo`
Listar notas de cargo.

**Query Parameters:**
- `clienteId`: Notas de cliente específico
- `estado`: pendiente, aplicada

```json
{
  "notasCargo": [
    {
      "id": "uuid",
      "folio": "NC-000001",
      "cliente": {
        "nombre": "Cliente Ejemplo"
      },
      "concepto": "INTERESES_MORA",
      "descripcion": "Intereses por pago tardío",
      "monto": 150.00,
      "aplicada": false,
      "fecha": "2024-01-20T10:00:00Z"
    }
  ]
}
```

#### `POST /api/notas-cargo`
Crear nota de cargo.
```json
{
  "clienteId": "uuid",
  "ventaId": "uuid",
  "concepto": "GASTOS_COBRANZA",
  "descripcion": "Gastos de gestión de cobranza",
  "monto": 100.00,
  "referencia": "REF-001"
}
```

#### `POST /api/notas-cargo/[id]/aplicar`
Aplicar nota de cargo (actualiza saldo del cliente).

---

### **💳 Notas de Crédito**

#### `GET /api/notas-credito`
Listar notas de crédito.

```json
{
  "notasCredito": [
    {
      "id": "uuid",
      "folio": "NCR-000001",
      "cliente": {
        "nombre": "Cliente Ejemplo"
      },
      "concepto": "DEVOLUCION_MERCANCIA",
      "descripcion": "Devolución de producto defectuoso",
      "monto": 300.00,
      "afectaInventario": true,
      "aplicada": false,
      "detalles": [
        {
          "producto": {
            "codigo": "PROD-001",
            "nombre": "Producto Ejemplo"
          },
          "cantidad": 2,
          "precioUnitario": 150.00,
          "subtotal": 300.00
        }
      ]
    }
  ]
}
```

#### `POST /api/notas-credito`
Crear nota de crédito.
```json
{
  "clienteId": "uuid",
  "concepto": "DEVOLUCION_MERCANCIA",
  "descripcion": "Producto defectuoso",
  "monto": 300.00,
  "afectaInventario": true,
  "detalles": [
    {
      "productoId": "uuid",
      "cantidad": 2,
      "precioUnitario": 150.00,
      "subtotal": 300.00,
      "motivo": "Producto defectuoso"
    }
  ]
}
```

#### `POST /api/notas-credito/[id]/aplicar`
Aplicar nota de crédito (reduce saldo cliente, actualiza inventario).

---

### **🔄 Reestructuras de Crédito**

#### `GET /api/reestructuras`
Listar reestructuras de crédito.

```json
{
  "reestructuras": [
    {
      "id": "uuid", 
      "cliente": {
        "nombre": "Cliente Ejemplo"
      },
      "venta": {
        "folio": "VENTA-001"
      },
      "saldoAnterior": 5000.00,
      "saldoNuevo": 4500.00,
      "montoPagoAnterior": 250.00,
      "montoPagoNuevo": 200.00,
      "periodicidadNueva": "QUINCENAL",
      "motivo": "DIFICULTADES_ECONOMICAS",
      "descuentoOtorgado": 500.00,
      "fechaReestructura": "2024-01-25T09:00:00Z"
    }
  ]
}
```

#### `POST /api/reestructuras`
Crear reestructura de crédito.
```json
{
  "ventaId": "uuid",
  "clienteId": "uuid",
  "motivo": "PERDIDA_EMPLEO",
  "periodicidadNueva": "MENSUAL",
  "montoPagoNuevo": 180.00,
  "numeroPagosNuevo": 25,
  "fechaProximoPagoNueva": "2024-02-01",
  "descuentoOtorgado": 300.00,
  "observaciones": "Cliente perdió empleo, se otorga facilidad de pago"
}
```

---

### **🛡️ Sistema de Garantías**

#### `GET /api/garantias`
Listar garantías registradas.

**Query Parameters:**
- `clienteId`: Garantías de cliente específico
- `estatus`: ACTIVA, RECLAMADA, EN_PROCESO, RESUELTA
- `vigente`: true para solo garantías vigentes

```json
{
  "garantias": [
    {
      "id": "uuid",
      "folio": "GAR-000001",
      "cliente": {
        "nombre": "Cliente Ejemplo"
      },
      "producto": {
        "codigo": "PROD-001",
        "nombre": "Laptop Dell"
      },
      "tipoGarantia": "FABRICANTE",
      "fechaCompra": "2024-01-15",
      "fechaFinGarantia": "2025-01-15",
      "mesesGarantia": 12,
      "estatus": "ACTIVA",
      "descripcionFalla": null
    }
  ]
}
```

#### `POST /api/garantias`
Registrar nueva garantía.
```json
{
  "clienteId": "uuid",
  "ventaId": "uuid", 
  "productoId": "uuid",
  "tipoGarantia": "TIENDA",
  "mesesGarantia": 6,
  "fechaCompra": "2024-01-15",
  "descripcionFalla": "Pantalla no enciende"
}
```

#### `POST /api/garantias/[id]/procesar`
Procesar reclamo de garantía.
```json
{
  "accion": "REEMPLAZAR",
  "diagnostico": "Placa madre dañada por humedad",
  "solucionAplicada": "Reemplazo de equipo completo",
  "productoReemplazoId": "uuid",
  "costoReemplazo": 15000.00
}
```

---

### **📊 Dashboard y Analytics**

#### `GET /api/dashboard/stats`
Obtener estadísticas básicas del dashboard.
```json
{
  "totalClientes": 150,
  "totalProductos": 1200,
  "ventasHoy": 25000.00,
  "cobranzaHoy": 18000.00,
  "saldoPendiente": 450000.00,
  "pagaresPendientes": 325
}
```

#### `GET /api/dashboard/analytics`
Obtener análisis avanzado para gráficos.

**Query Parameters:**
- `periodo`: Número de meses a analizar (3, 6, 12)

```json
{
  "periodo": 6,
  "ventasPorMes": [
    {
      "mes": "2024-01-01T00:00:00Z", 
      "total_ventas": "125000.00",
      "cantidad_ventas": "45",
      "saldo_pendiente": "75000.00"
    }
  ],
  "cobranzaPorMes": [...],
  "topProductos": [...],
  "topClientes": [...],
  "carteraVencida": [...],
  "garantiasAnalysis": [...],
  "reestructurasAnalysis": [...]
}
```

---

### **📈 Sistema de Reportes**

#### `GET /api/reportes/ventas`
Generar reporte de ventas.

**Query Parameters:**
- `fechaInicio`: Fecha inicial del reporte
- `fechaFin`: Fecha final del reporte
- `clienteId`: Cliente específico (opcional)
- `vendedorId`: Vendedor específico (opcional)
- `formato`: json o csv

```json
{
  "ventas": [...],
  "resumen": {
    "totalVentas": 45,
    "montoTotal": 125000.00,
    "montoCobrado": 75000.00,
    "saldoPendiente": 50000.00,
    "promedioVenta": 2777.78
  },
  "ventasPorVendedor": {...},
  "ventasPorProducto": {...}
}
```

#### `GET /api/reportes/cobranza`
Generar reporte de cobranza.

**Query Parameters:**
- `tipo`: pagos, pagares, cartera
- `fechaInicio`, `fechaFin`: Rango de fechas
- `gestorId`: Gestor específico (opcional)
- `formato`: json o csv

#### `GET /api/reportes/inventario` 
Generar reporte de inventario.

**Query Parameters:**
- `tipo`: stock, movimientos, valoracion
- `categoria`, `marca`: Filtros opcionales
- `formato`: json o csv

---

### **⚙️ Configuración del Sistema**

#### `GET /api/configuracion`
Obtener configuración actual del sistema.
```json
{
  "id": "uuid",
  "nombreEmpresa": "Mi Empresa SA",
  "colorPrimario": "#3B82F6",
  "colorSecundario": "#10B981", 
  "direccion": "Av. Principal 123",
  "telefono": "5555551234",
  "email": "contacto@empresa.com",
  "rfc": "EMP123456789",
  "configJson": {
    "iva": 16,
    "monedaDefecto": "MXN",
    "configuracionCobranza": {
      "tasaInteresDefecto": 3.0,
      "diasGraciaDefecto": 0
    },
    "integraciones": {...}
  }
}
```

#### `PUT /api/configuracion`
Actualizar configuración del sistema (requiere rol ADMIN o SUPERADMIN).

---

### **🔌 Integraciones Externas**

#### `POST /api/integraciones/webhooks`
Recibir webhooks de servicios externos.

**Query Parameters:**
- `tipo`: pago, facturacion, inventario
- `origen`: openpay, stripe, pac, etc.

#### `POST /api/integraciones/sync`
Sincronizar datos con sistemas externos.
```json
{
  "tipo": "exportar_clientes",
  "destino": "contabilidad",
  "datos": {
    "fechaDesde": "2024-01-01"
  }
}
```

---

## 🔄 Códigos de Respuesta HTTP

- **200**: Éxito
- **201**: Creado exitosamente
- **400**: Error en los datos enviados
- **401**: No autorizado
- **403**: Sin permisos suficientes
- **404**: Recurso no encontrado
- **500**: Error interno del servidor

## 📝 Formato de Errores

```json
{
  "error": "Descripción del error",
  "code": "ERROR_CODE",
  "details": {
    "field": "Campo específico con error",
    "message": "Mensaje detallado"
  }
}
```

## 🧪 Ejemplos de Uso

### **Flujo Completo: Pedido → Venta → Cobranza**

```javascript
// 1. Crear pedido
const pedido = await fetch('/api/pedidos', {
  method: 'POST',
  body: JSON.stringify({
    clienteId: 'cliente-uuid',
    vendedorId: 'vendedor-uuid',
    detalles: [...]
  })
});

// 2. Convertir a venta
const venta = await fetch(`/api/pedidos/${pedido.id}/convertir-venta`, {
  method: 'POST', 
  body: JSON.stringify({
    pagoInicial: 500.00,
    periodicidadPago: 'SEMANAL',
    montoPago: 250.00
  })
});

// 3. Aplicar pago
const pago = await fetch(`/api/pagares/${pagareId}/aplicar-pago`, {
  method: 'POST',
  body: JSON.stringify({
    montoPago: 250.00,
    tipoPago: 'EFECTIVO'
  })
});
```

---

> 📚 **Documentación completa**: Ver [Manual de Usuario](./USER_MANUAL.md) para ejemplos de uso desde la interfaz web.

