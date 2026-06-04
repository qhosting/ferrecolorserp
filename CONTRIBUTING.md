
# 🤝 Guía de Contribución - Sistema ERP Completo

¡Gracias por tu interés en contribuir al Sistema ERP Completo! Esta guía te ayudará a entender cómo puedes colaborar efectivamente.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo puedo contribuir?](#cómo-puedo-contribuir)
- [Configuración del entorno de desarrollo](#configuración-del-entorno-de-desarrollo)
- [Proceso de desarrollo](#proceso-de-desarrollo)
- [Estándares de código](#estándares-de-código)
- [Envío de Pull Requests](#envío-de-pull-requests)
- [Reportar bugs](#reportar-bugs)
- [Solicitar funcionalidades](#solicitar-funcionalidades)

## 📜 Código de Conducta

Este proyecto adhiere a un código de conducta. Al participar, esperamos que respetes estos principios:

- **Sé respetuoso**: Trata a todos con respeto y cortesía
- **Sé inclusivo**: Celebra la diversidad de perspectivas y experiencias
- **Sé colaborativo**: Trabaja en equipo hacia objetivos comunes
- **Sé constructivo**: Proporciona retroalimentación útil y específica

## 🎯 ¿Cómo puedo contribuir?

### 🐛 Reportar Bugs
- Busca primero si el bug ya fue reportado
- Usa el template de issue para bugs
- Incluye pasos detallados para reproducir
- Proporciona información del entorno

### ✨ Sugerir Funcionalidades
- Verifica que no esté ya solicitada
- Explica claramente el caso de uso
- Considera el impacto en usuarios existentes
- Proporciona mockups si es posible

### 💻 Contribuir Código
- Corrige bugs reportados
- Implementa nuevas funcionalidades
- Mejora la documentación
- Optimiza el rendimiento

### 📚 Mejorar Documentación
- Corrige errores tipográficos
- Mejora explicaciones existentes
- Añade ejemplos de uso
- Traduce contenido

## 🛠️ Configuración del Entorno de Desarrollo

### Prerrequisitos
- Node.js 18+
- yarn
- PostgreSQL 14+
- Git
- Editor con soporte TypeScript

### Configuración Inicial

1. **Fork y clonar**
```bash
git clone https://github.com/tu-usuario/sistema-erp-completo.git
cd sistema-erp-completo/app
```

2. **Instalar dependencias**
```bash
yarn install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
# Editar .env.local con tus configuraciones
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

### Herramientas Recomendadas

#### VS Code Extensions
- **TypeScript Importer** - Importaciones automáticas
- **Prisma** - Soporte para esquemas Prisma
- **Tailwind CSS IntelliSense** - Autocompletado CSS
- **ES7+ React/Redux/React-Native** - Snippets
- **GitLens** - Información de Git

#### Configuración de VS Code
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

## 🔄 Proceso de Desarrollo

### Workflow Git

1. **Crear rama para tu feature**
```bash
git checkout -b feature/nueva-funcionalidad
# o
git checkout -b fix/corregir-bug
```

2. **Hacer commits descriptivos**
```bash
git commit -m "feat: añadir sistema de notificaciones push"
git commit -m "fix: corregir cálculo de intereses moratorios"
git commit -m "docs: actualizar guía de instalación"
```

3. **Mantener rama actualizada**
```bash
git fetch origin
git rebase origin/main
```

4. **Push y crear Pull Request**
```bash
git push origin feature/nueva-funcionalidad
```

### Convenciones de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>[ámbito opcional]: <descripción>

[cuerpo opcional]

[pie opcional]
```

**Tipos válidos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Solo documentación
- `style`: Cambios de formato (espacios, comas, etc.)
- `refactor`: Refactorización sin cambios funcionales
- `test`: Añadir o corregir tests
- `chore`: Cambios en build o herramientas auxiliares

**Ejemplos:**
```bash
feat(cobranza): añadir filtros avanzados en dashboard
fix(ventas): corregir cálculo de descuentos por volumen
docs(readme): actualizar instrucciones de instalación
style(dashboard): mejorar espaciado en cards de métricas
```

## 📏 Estándares de Código

### TypeScript
- **Tipado estricto**: Siempre tipar parámetros y returns
- **Interfaces**: Definir interfaces para objetos complejos
- **Enums**: Usar para valores constantes relacionados
- **Null safety**: Usar optional chaining (`?.`) y nullish coalescing (`??`)

```typescript
// ✅ Correcto
interface Cliente {
  id: string;
  nombre: string;
  email?: string;
}

const obtenerCliente = async (id: string): Promise<Cliente | null> => {
  // implementation
}

// ❌ Incorrecto
const obtenerCliente = async (id) => {
  // implementation
}
```

### React Components
- **Functional Components**: Usar siempre function components
- **Custom Hooks**: Extraer lógica reutilizable
- **Props Interface**: Definir interfaces para props
- **Default exports**: Usar para componentes principales

```typescript
// ✅ Correcto
interface ClienteCardProps {
  cliente: Cliente;
  onEdit?: (id: string) => void;
}

export default function ClienteCard({ cliente, onEdit }: ClienteCardProps) {
  const handleEdit = () => {
    onEdit?.(cliente.id);
  };

  return (
    <div className="border rounded-lg p-4">
      <h3>{cliente.nombre}</h3>
      {onEdit && (
        <Button onClick={handleEdit}>
          Editar
        </Button>
      )}
    </div>
  );
}
```

### CSS/Tailwind
- **Responsive first**: Mobile-first approach
- **Semantic classes**: Usar clases semánticas cuando sea posible
- **Consistencia**: Seguir el sistema de design existente
- **Performance**: Evitar classes innecesarias

```jsx
// ✅ Correcto
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card className="p-6 hover:shadow-lg transition-shadow">
    Content
  </Card>
</div>

// ❌ Evitar
<div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'}}>
  <div style={{padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
    Content
  </div>
</div>
```

### API Routes
- **RESTful**: Seguir convenciones REST
- **Error handling**: Manejo consistente de errores
- **Validation**: Validar entrada de datos
- **TypeScript**: Tipar requests y responses

```typescript
// ✅ Correcto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos
    const validatedData = ClienteSchema.parse(body);
    
    const cliente = await prisma.cliente.create({
      data: validatedData
    });
    
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

## 🔍 Testing

### Tipos de Tests
- **Unit Tests**: Funciones y componentes individuales
- **Integration Tests**: APIs y flujos de datos
- **E2E Tests**: Flujos de usuario completos

### Testing Libraries
```json
{
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

### Ejemplo de Test
```typescript
// components/__tests__/ClienteCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ClienteCard from '../ClienteCard';

const mockCliente = {
  id: '1',
  nombre: 'Juan Pérez',
  email: 'juan@ejemplo.com'
};

describe('ClienteCard', () => {
  it('muestra información del cliente', () => {
    render(<ClienteCard cliente={mockCliente} />);
    
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('juan@ejemplo.com')).toBeInTheDocument();
  });

  it('llama onEdit cuando se hace click en editar', () => {
    const mockOnEdit = jest.fn();
    render(<ClienteCard cliente={mockCliente} onEdit={mockOnEdit} />);
    
    fireEvent.click(screen.getByText('Editar'));
    expect(mockOnEdit).toHaveBeenCalledWith('1');
  });
});
```

## 📤 Envío de Pull Requests

### Antes de enviar
- [ ] ✅ Tests pasan (`yarn test`)
- [ ] ✅ Build exitoso (`yarn build`)  
- [ ] ✅ Linting sin errores (`yarn lint`)
- [ ] ✅ TypeScript sin errores (`yarn type-check`)
- [ ] ✅ Código formateado (`yarn format`)

### Template de PR

```markdown
## Descripción
Breve descripción de los cambios realizados.

## Tipo de cambio
- [ ] Bug fix (cambio que corrige un issue)
- [ ] New feature (cambio que añade funcionalidad)
- [ ] Breaking change (fix o feature que cambiaría funcionalidad existente)
- [ ] Documentation update (cambio solo en documentación)

## ¿Cómo se ha probado?
Describe las pruebas que ejecutaste para verificar los cambios.

## Checklist:
- [ ] Mi código sigue las convenciones del proyecto
- [ ] He realizado una auto-revisión de mi código
- [ ] He comentado código complejo donde es necesario
- [ ] He realizado cambios correspondientes en documentación
- [ ] Mis cambios no generan nuevas advertencias
- [ ] He añadido tests que prueban mi fix/feature
- [ ] Tests nuevos y existentes pasan localmente

## Screenshots (si aplica):
Añade screenshots para cambios visuales.
```

### Proceso de Revisión
1. **Automatic checks**: Los CI/CD checks deben pasar
2. **Code review**: Al menos un maintainer debe revisar
3. **Testing**: Verificar que funcione en entorno de prueba
4. **Merge**: Una vez aprobado, será merged a main

## 🐛 Reportar Bugs

### Template de Bug Report

```markdown
**Descripción del Bug**
Descripción clara y concisa del bug.

**Pasos para Reproducir**
1. Ve a '...'
2. Haz click en '...'
3. Desplázate hacia abajo a '...'
4. Ve el error

**Comportamiento Esperado**
Descripción clara de lo que esperabas que pasara.

**Comportamiento Actual**
Descripción clara de lo que realmente pasa.

**Screenshots**
Si aplica, añade screenshots del problema.

**Información del Entorno:**
 - OS: [e.g. Windows 10, macOS 12.0]
 - Browser: [e.g. Chrome 96, Firefox 95]
 - Versión del Sistema: [e.g. v4.0.0]

**Contexto Adicional**
Añade cualquier contexto adicional sobre el problema.
```

## ✨ Solicitar Funcionalidades

### Template de Feature Request

```markdown
**¿Tu solicitud está relacionada con un problema?**
Descripción clara del problema. Ej. "Me frustra cuando..."

**Describe la solución que te gustaría**
Descripción clara y concisa de lo que quieres que pase.

**Describe alternativas que hayas considerado**
Descripción clara de soluciones alternativas o features.

**Mockups/Wireframes**
Si aplica, añade wireframes o mockups.

**Contexto Adicional**
Añade cualquier contexto o screenshots sobre la solicitud.

**Impacto en Usuarios**
¿Cómo beneficiaría esto a los usuarios del sistema?
```

## 🏷️ Versionado

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Cambios incompatibles con API anterior
- **MINOR** version: Funcionalidad nueva compatible con anterior
- **PATCH** version: Bug fixes compatibles

## 📚 Recursos Adicionales

### Documentación Técnica
- [Prisma Docs](https://www.prisma.io/docs/)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Docs](https://www.radix-ui.com/docs)

### Guías del Proyecto
- `README.md` - Visión general del proyecto
- `INSTALL.md` - Guía de instalación detallada
- `PROYECTO_STATUS.md` - Estado actual del proyecto
- `CHANGELOG_v4.md` - Historial de cambios

## 🎉 Reconocimientos

Todos los contribuidores serán reconocidos en:
- README principal
- Changelog de releases
- Hall of Fame de contribuidores

¡Gracias por contribuir al Sistema ERP Completo! 🚀

---

**Desarrollado con ❤️ por la comunidad y DeepAgent de Abacus.AI**
