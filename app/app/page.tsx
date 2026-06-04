import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import PublicCatalog from '@/components/public/PublicCatalog';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  Phone, 
  MapPin, 
  Clock, 
  Sparkles, 
  Palette, 
  ShieldCheck, 
  Truck, 
  ArrowRight, 
  Lock, 
  CheckCircle,
  Database,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';

const FALLBACK_PRODUCTS = [
  {
    id: 'demo-1',
    codigo: 'PINT-VIN-BLA-19',
    nombre: 'Pintura Vinílica Premium Plus Blanca (19L)',
    descripcion: 'Pintura vinil-acrílica de alta calidad con excelente cubrimiento y lavabilidad. Acabado mate sedoso ideal para interiores y exteriores.',
    categoria: 'Pinturas',
    marca: 'FerreColors',
    precio1: 1850.0,
    stock: 25,
    unidadMedida: 'PZA'
  },
  {
    id: 'demo-2',
    codigo: 'IMP-FIB-ROJ-19',
    nombre: 'Impermeabilizante Fibratado Premium 5 Años Rojo (19L)',
    descripcion: 'Impermeabilizante acrílico elastomérico reforzado con fibras para evitar filtraciones y goteras. Resistencia a la intemperie y rayos UV.',
    categoria: 'Impermeabilizantes',
    marca: 'FerreColors',
    precio1: 2150.0,
    stock: 14,
    unidadMedida: 'PZA'
  },
  {
    id: 'demo-3',
    codigo: 'ESM-SR-NEG-4',
    nombre: 'Esmalte de Secado Rápido Negro Satinado (4L)',
    descripcion: 'Esmalte anticorrosivo de secado ultrarápido para protección de metales, maderas y concreto.',
    categoria: 'Esmaltes',
    marca: 'FerreColors',
    precio1: 680.0,
    stock: 18,
    unidadMedida: 'PZA'
  },
  {
    id: 'demo-4',
    codigo: 'ACC-BRO-NAT-4',
    nombre: 'Brocha Profesional de Cerda Natural (4 pulgadas)',
    descripcion: 'Brocha de alta retención para una aplicación suave y uniforme de pinturas vinílicas, esmaltes y barnices.',
    categoria: 'Accesorios',
    marca: 'FerreColors',
    precio1: 75.0,
    stock: 120,
    unidadMedida: 'PZA'
  },
  {
    id: 'demo-5',
    codigo: 'SOL-THI-AME-1',
    nombre: 'Thinner Americano de Alta Pureza (1L)',
    descripcion: 'Solvente purificado ideal para dilución de esmaltes, lacas y limpieza de herramientas de aplicación.',
    categoria: 'Solventes',
    marca: 'Generic',
    precio1: 95.0,
    stock: 45,
    unidadMedida: 'PZA'
  },
  {
    id: 'demo-6',
    codigo: 'HER-PIN-PRO-3',
    nombre: 'Pistola Escáner Inalámbrica de Alta Resistencia',
    descripcion: 'Equipo profesional para lectura de códigos de barras en punto de venta y control de inventarios físicos.',
    categoria: 'Herramientas',
    marca: 'FerreColors',
    precio1: 1450.0,
    stock: 0,
    unidadMedida: 'PZA'
  }
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Fetch real products from db (if any)
  let dbProducts: any[] = [];
  try {
    dbProducts = await prisma.producto.findMany({
      where: {
        precio1: { gt: 0 }
      },
      take: 12,
      orderBy: {
        codigo: 'asc'
      }
    });
  } catch (error) {
    console.error('Error fetching products for landing page:', error);
  }

  const productsToShow = dbProducts.length > 0 ? dbProducts : FALLBACK_PRODUCTS;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground transition-colors duration-300">
      
      {/* Sticky Header with Glassmorphism */}
      <header className="sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-colors">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Building className="h-7 w-7 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-md font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                FerreColors
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Pinturas y Herramientas</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <a href="#inicio" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Inicio</a>
            <a href="#servicios" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Servicios</a>
            <a href="#catalogo" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Catálogo Público</a>
            <a href="#contacto" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Ubicación y Horario</a>
          </nav>

          {/* ERP Access CTA */}
          <div className="flex items-center gap-3">
            {session ? (
              <Link href="/dashboard">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md gap-2 font-bold text-xs h-9 px-4">
                  Ir al Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="border-indigo-600/20 hover:border-indigo-600 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl gap-2 font-bold text-xs h-9 px-4">
                  <Lock className="h-3.5 w-3.5" />
                  Acceso ERP
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main className="relative">
        
        {/* Decorative background glows */}
        <div className="absolute top-20 left-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute top-80 right-1/4 -z-10 h-80 w-80 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

        {/* Hero Section */}
        <section id="inicio" className="container mx-auto px-6 pt-20 pb-16 md:pt-32 md:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left side: Heading */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider animate-bounce">
                <Sparkles className="h-3.5 w-3.5" />
                Líderes en Calidad y Color
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
                El color de tus sueños,<br />
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  con la fuerza del acero.
                </span>
              </h1>
              
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 font-medium">
                Distribuidor autorizado de pinturas de alta duración, esmaltes y material ferretero. Formulaciones exactas y surtido de obra al instante para contratistas y hogar.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-4">
                <a href="#catalogo">
                  <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg h-12 px-6 font-bold gap-2">
                    Explorar Catálogo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <a href="#contacto">
                  <Button variant="outline" className="border-slate-200 dark:border-slate-800 bg-background/50 backdrop-blur-md rounded-xl h-12 px-6 font-bold">
                    Contáctanos
                  </Button>
                </a>
              </div>
            </div>

            {/* Right side: visual mock/features card */}
            <div className="lg:col-span-5 relative">
              <div className="glass-card p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 h-28 w-28 bg-indigo-500/20 rounded-full blur-2xl -z-10" />
                
                <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                  <Palette className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Socio Tecnológico en Obra
                </h3>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="p-2.5 h-10 w-10 shrink-0 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                      🎨
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Igualación Digital Computarizada</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Escaneamos y formulamos el tono exacto de tu muestra física en cualquier acabado.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="p-2.5 h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                      🚚
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Logística Directa a Obra</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Surtido programado de materiales a pie de obra en vehículos adecuados de reparto.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="p-2.5 h-10 w-10 shrink-0 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                      📊
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Sistemas y Enlace CONTPAQi</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Todas nuestras compras y facturas se timbran e integran de inmediato con CONTPAQi.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> +10,000 Colores</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> Distribuidor Autorizado</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Services & Business Strengths */}
        <section id="servicios" className="py-20 bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200/50 dark:border-slate-800/50">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Nuestros Servicios de Valor Agregado
              </h2>
              <p className="text-muted-foreground">
                No solo vendemos productos, aportamos soluciones tecnológicas y de logística que optimizan los costos de tu construcción o remodelación.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              
              <div className="glass-card p-6 rounded-2xl border-none shadow-sm hover:scale-[1.02] transition-transform duration-300 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
                <div className="p-3 w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Palette className="h-6 w-6" />
                </div>
                <h3 className="font-extrabold text-lg mb-2 text-foreground">Igualación Precisa</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Contamos con espectrofotómetros de última generación para replicar colores en vinilos, esmaltes y poliuretanos.
                </p>
              </div>

              <div className="glass-card p-6 rounded-2xl border-none shadow-sm hover:scale-[1.02] transition-transform duration-300 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
                <div className="p-3 w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="font-extrabold text-lg mb-2 text-foreground">Entrega Rápida</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Entregas programadas y fletes express de pinturas e insumos ferreteros para que tu proyecto nunca se detenga.
                </p>
              </div>

              <div className="glass-card p-6 rounded-2xl border-none shadow-sm hover:scale-[1.02] transition-transform duration-300 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-rose-500" />
                <div className="p-3 w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-extrabold text-lg mb-2 text-foreground">Garantía de Fábrica</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Todos nuestros productos provienen de marcas de alta calidad y cuentan con el respaldo directo del fabricante.
                </p>
              </div>

              <div className="glass-card p-6 rounded-2xl border-none shadow-sm hover:scale-[1.02] transition-transform duration-300 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-purple-500" />
                <div className="p-3 w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Database className="h-6 w-6" />
                </div>
                <h3 className="font-extrabold text-lg mb-2 text-foreground">Facturación Ágil</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Timbrado CFDI 4.0 al instante vinculado con CONTPAQi. Recibe tu PDF y XML en segundos directamente en tu buzón.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Public Product Catalog Section */}
        <section id="catalogo" className="container mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Catálogo de Productos FerreColors
            </h2>
            <p className="text-muted-foreground">
              Explora nuestra selección pública de pinturas, impermeabilizantes, esmaltes y herramientas. Puedes solicitar cotizaciones directas a nuestro WhatsApp.
            </p>
          </div>

          {/* Render the interactive catalog component */}
          <PublicCatalog initialProducts={productsToShow} />
        </section>

        {/* Location, Hours & Contact */}
        <section id="contacto" className="py-20 bg-slate-100/50 dark:bg-slate-900/30 border-t border-slate-200/50 dark:border-slate-800/50">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
              
              {/* Left side: contact info & hours */}
              <div className="lg:col-span-6 space-y-8 flex flex-col justify-between">
                <div className="space-y-6">
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Ubicación y Horarios de Atención
                  </h2>
                  <p className="text-muted-foreground font-medium">
                    Ven a visitarnos y conoce de cerca nuestra gama de colores y catálogo de herramientas. Estaremos encantados de ayudarte con la igualación que necesitas.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <div className="glass-card p-5 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Dirección</h4>
                      <p className="text-xs text-muted-foreground mt-1">Av. Juárez #1234, Centro Histórico, Guadalajara, Jalisco, CP 44100</p>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Horario de Tienda</h4>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Lunes a Viernes: 8:00 AM - 6:30 PM</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">Sábado: 8:30 AM - 2:00 PM</p>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Teléfono</h4>
                      <p className="text-xs text-muted-foreground mt-1 font-mono font-medium">+52 (33) 3614-5050</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono font-medium">+52 (33) 3614-6060</p>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Contacto Directo</h4>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-bold">
                        <a href="https://wa.me/521234567890" target="_blank" rel="noopener noreferrer">
                          Enviar WhatsApp ➡️
                        </a>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-slate-200/40 dark:bg-slate-800/40 px-5 py-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    El acceso al Panel Administrativo del ERP está reservado únicamente para personal autorizado de FerreColors.
                  </span>
                </div>
              </div>

              {/* Right side: mock map container */}
              <div className="lg:col-span-6">
                <div className="glass-card h-full min-h-[350px] rounded-3xl overflow-hidden relative border-none shadow-sm flex flex-col justify-end p-6">
                  {/* Fake map aesthetic */}
                  <div className="absolute inset-0 bg-slate-200 dark:bg-slate-900 border-none flex items-center justify-center p-4">
                    <div className="w-full h-full bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] relative flex items-center justify-center rounded-2xl overflow-hidden">
                      <div className="absolute h-40 w-40 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
                      <div className="absolute h-24 w-24 rounded-full bg-emerald-500/10 blur-lg" />
                      
                      {/* Fake map drawing elements */}
                      <div className="absolute top-1/2 left-0 w-full h-[3px] bg-slate-300 dark:bg-slate-800 -translate-y-1/2" />
                      <div className="absolute top-0 left-1/2 w-[3px] h-full bg-slate-300 dark:bg-slate-800 -translate-x-1/2" />
                      <div className="absolute top-1/4 left-1/4 w-[150px] h-[3px] bg-slate-300 dark:bg-slate-800 rotate-45" />
                      <div className="absolute top-1/4 right-1/4 w-[150px] h-[3px] bg-slate-300 dark:bg-slate-800 -rotate-45" />

                      {/* Store Marker Pin */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="h-10 w-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                          <Building className="h-5 w-5" />
                        </div>
                        <div className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 text-xs font-black mt-2 tracking-wide">
                          FerreColors Guadalajara
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-800/50 py-12 text-sm text-muted-foreground transition-colors">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2">
                <Building className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <span className="font-extrabold text-foreground text-md">FerreColors</span>
              </Link>
              <p className="text-xs leading-relaxed">
                Color y fuerza para tus proyectos. Distribuidor líder de pinturas y productos ferreteros en Guadalajara, Jalisco.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-widest">Secciones</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#inicio" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Inicio</a></li>
                <li><a href="#servicios" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Servicios</a></li>
                <li><a href="#catalogo" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Catálogo Público</a></li>
                <li><a href="#contacto" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Ubicación y Horarios</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-widest">Privacidad y Legal</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Aviso de Privacidad</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Términos del Servicio</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Políticas de Devoluciones</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-widest">Portal Seguro</h4>
              <p className="text-xs">Accede al administrador corporativo del ERP de FerreColors.</p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                <Lock className="h-3 w-3" />
                Acceder al ERP Administrativo ➡️
              </Link>
            </div>

          </div>

          <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-4">
            <p>© {new Date().getFullYear()} FerreColors. Todos los derechos reservados.</p>
            <p className="text-muted-foreground/60">
              Desarrollado y sincronizado con CONTPAQi API v1.0
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
