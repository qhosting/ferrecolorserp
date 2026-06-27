import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import PublicCatalog from '@/components/public/PublicCatalog';
import { Button } from '@/components/ui/button';
import { LoginDialog } from '@/components/auth/login-dialog';
import { WhatsAppFloat } from '@/components/public/whatsapp-float';
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
  MessageSquare,
  Target,
  Eye,
  HeartHandshake,
  Award,
  Scale
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
            <Building className="h-7 w-7 text-[#002d72] dark:text-[#009bdf] animate-pulse" />
            <div className="flex flex-col">
              <span className="text-md font-extrabold tracking-tight bg-gradient-to-r from-[#002d72] via-[#009bdf] to-[#2da53d] dark:from-[#009bdf] dark:via-emerald-400 dark:to-emerald-500 bg-clip-text text-transparent">
                VertexERP
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">SISTEMA PARA FERRETERIAS</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <a href="#inicio" className="hover:text-[#009bdf] transition-colors">Inicio</a>
            <a href="#empresa" className="hover:text-[#009bdf] transition-colors">Nosotros</a>
            <a href="#lineas-venta" className="hover:text-[#009bdf] transition-colors">Líneas de Venta</a>
            <a href="#catalogo" className="hover:text-[#009bdf] transition-colors">Catálogo Público</a>
            <a href="#contacto" className="hover:text-[#009bdf] transition-colors">Contacto</a>
          </nav>

          {/* ERP Access CTA */}
          <div className="flex items-center gap-3">
            {session ? (
              <Link href="/dashboard">
                <Button className="bg-[#002d72] hover:bg-[#002d72]/90 dark:bg-[#009bdf] dark:hover:bg-[#009bdf]/90 text-white rounded-xl shadow-md gap-2 font-bold text-xs h-9 px-4">
                  Ir al Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <LoginDialog>
                <Button variant="outline" className="border-[#002d72]/20 hover:border-[#002d72] hover:bg-[#002d72]/5 dark:border-[#009bdf]/20 dark:hover:border-[#009bdf] dark:hover:bg-[#009bdf]/10 text-[#002d72] dark:text-[#009bdf] rounded-xl gap-2 font-bold text-xs h-9 px-4">
                  <Lock className="h-3.5 w-3.5" />
                  Acceso ERP
                </Button>
              </LoginDialog>
            )}
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main className="relative">
        
        {/* Decorative background glows */}
        <div className="absolute top-20 left-1/4 -z-10 h-72 w-72 rounded-full bg-[#009bdf]/10 blur-[100px] pointer-events-none" />
        <div className="absolute top-80 right-1/4 -z-10 h-80 w-80 rounded-full bg-[#2da53d]/5 blur-[120px] pointer-events-none" />

        {/* Hero Section */}
        <section id="inicio" className="container mx-auto px-6 pt-20 pb-16 md:pt-32 md:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left side: Heading */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#009bdf]/10 text-[#002d72] dark:text-[#009bdf] text-xs font-bold uppercase tracking-wider animate-bounce">
                <Sparkles className="h-3.5 w-3.5 text-[#2da53d]" />
                Distribuidor Autorizado
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
                Todo lo que necesitas,<br />
                <span className="bg-gradient-to-r from-[#002d72] via-[#009bdf] to-[#2da53d] dark:from-[#009bdf] dark:to-emerald-400 bg-clip-text text-transparent">
                  en un solo enlace confiable.
                </span>
              </h1>
              
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 font-medium">
                Conectamos a fabricantes reconocidos con el cliente final. Ofrecemos pinturas, solventes, material de empaque e insumos industriales con la rapidez, eficiencia y calidad que exige el mercado.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-4">
                <a href="#catalogo">
                  <Button className="bg-[#002d72] hover:bg-[#002d72]/90 dark:bg-[#009bdf] dark:hover:bg-[#009bdf]/90 text-white rounded-xl shadow-lg h-12 px-6 font-bold gap-2">
                    Explorar Catálogo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <a href="#contacto">
                  <Button variant="outline" className="border-slate-200 dark:border-slate-800 bg-background/50 backdrop-blur-md rounded-xl h-12 px-6 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-500/5">
                    Contáctanos
                  </Button>
                </a>
              </div>
            </div>

            {/* Right side: visual mock/features card */}
            <div className="lg:col-span-5 relative">
              <div className="glass-card p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 h-28 w-28 bg-[#009bdf]/20 rounded-full blur-2xl -z-10" />
                
                <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                  <Palette className="h-5 w-5 text-[#002d72] dark:text-[#009bdf]" />
                  Abastecimiento Industrial Eficiente
                </h3>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="p-2.5 h-10 w-10 shrink-0 rounded-xl bg-blue-500/10 text-[#009bdf] flex items-center justify-center font-bold">
                      🎨
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Formulación y Surtido</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Igualación digital computarizada y entrega oportuna de pinturas y esmaltes industriales.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="p-2.5 h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 text-[#2da53d] flex items-center justify-center font-bold">
                      📦
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Material de Empaque</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Suministro de cintas, emplayes y flejes para asegurar tus embarques industriales.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="p-2.5 h-10 w-10 shrink-0 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                      🧹
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Trapo y Limpieza</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Trapo industrial blanco, gris y multicolor para el mantenimiento y limpieza de maquinaria.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-[#2da53d]" /> Adaptación al cambio</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-[#2da53d]" /> Rapidez y Eficiencia</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Misión y Visión Bento Grid Section */}
        <section id="empresa" className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Misión Card */}
            <div className="glass-card p-8 rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute top-0 right-0 h-32 w-32 bg-[#009bdf]/10 rounded-full blur-3xl -z-10" />
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-[#009bdf]/10 text-[#009bdf] rounded-2xl">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Nuestra Misión</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                Somos una empresa que se adapta fácilmente a los cambios del mundo Industrial. Actuamos con rapidez, eficiencia y calidad; comprendemos y escuchamos a nuestros clientes, proveedores, colaboradores y entorno.
              </p>
            </div>

            {/* Visión Card */}
            <div className="glass-card p-8 rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute top-0 right-0 h-32 w-32 bg-[#2da53d]/10 rounded-full blur-3xl -z-10" />
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-[#2da53d]/10 text-[#2da53d] rounded-2xl">
                  <Eye className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Nuestra Visión</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                Ser una empresa comprometida y con gran presencia en el ámbito industrial, siendo el enlace confiable entre fabricantes reconocidos y el cliente final.
              </p>
            </div>
          </div>
        </section>

        {/* Valores Section */}
        <section className="py-16 bg-gradient-to-b from-transparent to-slate-100/50 dark:to-slate-900/30">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Nuestros Valores
              </h2>
              <p className="text-muted-foreground mt-2">
                Los pilares fundamentales que guían cada una de nuestras decisiones y relaciones comerciales.
              </p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Servicio */}
              <div className="glass-card p-6 rounded-2xl shadow-sm border border-slate-200/30 dark:border-slate-800/30 text-center flex flex-col items-center hover:translate-y-[-4px] transition-transform duration-300">
                <div className="p-4 bg-blue-500/10 text-[#009bdf] rounded-full mb-4">
                  <HeartHandshake className="h-7 w-7" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">Servicio</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Escuchamos y atendemos las necesidades individuales de cada cliente con total disposición.
                </p>
              </div>

              {/* Responsabilidad */}
              <div className="glass-card p-6 rounded-2xl shadow-sm border border-slate-200/30 dark:border-slate-800/30 text-center flex flex-col items-center hover:translate-y-[-4px] transition-transform duration-300">
                <div className="p-4 bg-emerald-500/10 text-[#2da53d] rounded-full mb-4">
                  <Award className="h-7 w-7" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">Responsabilidad</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Cumplimos puntualmente con nuestros compromisos y entregas a pie de obra.
                </p>
              </div>

              {/* Honestidad */}
              <div className="glass-card p-6 rounded-2xl shadow-sm border border-slate-200/30 dark:border-slate-800/30 text-center flex flex-col items-center hover:translate-y-[-4px] transition-transform duration-300">
                <div className="p-4 bg-orange-500/10 text-orange-500 rounded-full mb-4">
                  <Scale className="h-7 w-7" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">Honestidad</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Actuamos con transparencia y rectitud en todas nuestras operaciones y cotizaciones.
                </p>
              </div>

              {/* Calidad */}
              <div className="glass-card p-6 rounded-2xl shadow-sm border border-slate-200/30 dark:border-slate-800/30 text-center flex flex-col items-center hover:translate-y-[-4px] transition-transform duration-300">
                <div className="p-4 bg-[#002d72]/10 text-[#002d72] dark:text-[#009bdf] rounded-full mb-4">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">Calidad</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Ofrecemos solo los mejores productos e insumos respaldados por fabricantes líderes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Líneas de Venta Section */}
        <section id="lineas-venta" className="py-20 bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200/50 dark:border-slate-800/50">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Nuestras Líneas de Venta
              </h2>
              <p className="text-muted-foreground">
                Ofrecemos un catálogo integral de alta calidad, diseñado para responder con agilidad a las demandas de la industria y la construcción.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              
              {/* 1. Ferretería */}
              <div className="glass-card p-6 rounded-2xl border-none shadow-sm hover:scale-[1.02] transition-transform duration-300 relative group overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#002d72]" />
                <div>
                  <span className="text-[10px] font-extrabold text-[#002d72] dark:text-[#009bdf] tracking-widest uppercase mb-1 block">Línea 01</span>
                  <h3 className="font-extrabold text-lg mb-3 text-slate-900 dark:text-white">Ferretería</h3>
                  <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Pinturas Industriales</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Brochas y Rodillos</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Solventes y Diluyentes</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Artículos de Ferretería</li>
                  </ul>
                </div>
              </div>

              {/* 2. Material de Empaque */}
              <div className="glass-card p-6 rounded-2xl border-none shadow-sm hover:scale-[1.02] transition-transform duration-300 relative group overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#009bdf]" />
                <div>
                  <span className="text-[10px] font-extrabold text-[#009bdf] tracking-widest uppercase mb-1 block">Línea 02</span>
                  <h3 className="font-extrabold text-lg mb-3 text-slate-900 dark:text-white">Material de Empaque</h3>
                  <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Cintas de Empaque</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Cintas Delimitadoras</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Emplaye (Film Estirable)</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Flejes de Sujeción</li>
                  </ul>
                </div>
              </div>

              {/* 3. Trapo */}
              <div className="glass-card p-6 rounded-2xl border-none shadow-sm hover:scale-[1.02] transition-transform duration-300 relative group overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#2da53d]" />
                <div>
                  <span className="text-[10px] font-extrabold text-[#2da53d] tracking-widest uppercase mb-1 block">Línea 03</span>
                  <h3 className="font-extrabold text-lg mb-3 text-slate-900 dark:text-white">Trapo Industrial</h3>
                  <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Trapo Blanco de Limpieza</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Trapo Gris Estándar</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Trapo Multicolor Industrial</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#2da53d] shrink-0" /> Limpieza de Maquinaria</li>
                  </ul>
                </div>
              </div>

              {/* 4. Pinceles */}
              <div className="glass-card p-6 rounded-2xl border-none shadow-sm hover:scale-[1.02] transition-transform duration-300 relative group overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-2 h-full bg-orange-500" />
                <div>
                  <span className="text-[10px] font-extrabold text-orange-500 tracking-widest uppercase mb-1 block">Línea 04</span>
                  <h3 className="font-extrabold text-lg mb-3 text-slate-900 dark:text-white">Pinceles</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Gran variedad de pinceles de alta durabilidad y diferentes tamaños para aplicaciones industriales y artísticas de precisión.
                  </p>
                </div>
              </div>

              {/* 5. Especiales */}
              <div className="glass-card p-6 rounded-2xl border-none shadow-sm hover:scale-[1.02] transition-transform duration-300 relative group overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-2 h-full bg-purple-500" />
                <div>
                  <span className="text-[10px] font-extrabold text-purple-500 tracking-widest uppercase mb-1 block">Línea 05</span>
                  <h3 className="font-extrabold text-lg mb-3 text-slate-900 dark:text-white">Especiales</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Desarrollamos soluciones a la medida de tus necesidades de mantenimiento y abastecimiento. ¡Contáctanos y la formulamos!
                  </p>
                </div>
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
                    Contacto y Logística de Distribución
                  </h2>
                  <p className="text-muted-foreground font-medium">
                    Cada situación requiere una necesidad específica; ¡acércate, queremos ofrecerte la mejor solución para tu proyecto industrial o comercial!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <div className="glass-card p-5 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-[#009bdf]/10 text-[#009bdf] rounded-xl">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Ubicación y Cobertura</h4>
                      <p className="text-xs text-muted-foreground mt-1">Celaya, Guanajuato, México. Surtido directo a obras e instalaciones industriales.</p>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-[#2da53d]/10 text-[#2da53d] rounded-xl">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Horario de Atención</h4>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Lunes a Viernes: 8:00 AM - 6:30 PM</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">Sábado: 8:30 AM - 2:00 PM</p>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">WhatsApp de Ventas</h4>
                      <p className="text-xs text-muted-foreground mt-1 font-mono font-medium">
                        <a href="https://wa.me/524611824584" target="_blank" rel="noopener noreferrer" className="hover:underline">
                          +52 461 182 4584
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-[#002d72]/10 text-[#002d72] dark:text-[#009bdf] rounded-xl">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Correo Electrónico</h4>
                      <p className="text-xs text-[#002d72] dark:text-[#009bdf] mt-1 font-bold">
                        <a href="mailto:armando.galvan@ferrecolors.com" className="hover:underline">
                          armando.galvan@ferrecolors.com
                        </a>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-slate-200/40 dark:bg-slate-800/40 px-5 py-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-[#002d72] dark:text-[#009bdf] shrink-0" />
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
                      <div className="absolute h-40 w-40 rounded-full bg-[#009bdf]/20 blur-xl animate-pulse" />
                      <div className="absolute h-24 w-24 rounded-full bg-[#2da53d]/10 blur-lg" />
                      
                      {/* Fake map drawing elements */}
                      <div className="absolute top-1/2 left-0 w-full h-[3px] bg-slate-300 dark:bg-slate-800 -translate-y-1/2" />
                      <div className="absolute top-0 left-1/2 w-[3px] h-full bg-slate-300 dark:bg-slate-800 -translate-x-1/2" />
                      <div className="absolute top-1/4 left-1/4 w-[150px] h-[3px] bg-slate-300 dark:bg-slate-800 rotate-45" />
                      <div className="absolute top-1/4 right-1/4 w-[150px] h-[3px] bg-slate-300 dark:bg-slate-800 -rotate-45" />

                      {/* Store Marker Pin */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="h-10 w-10 bg-[#002d72] dark:bg-[#009bdf] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                          <Building className="h-5 w-5" />
                        </div>
                        <div className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 text-xs font-black mt-2 tracking-wide">
                          FerreColors Celaya
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
                <Building className="h-6 w-6 text-[#002d72] dark:text-[#009bdf]" />
                <span className="font-extrabold text-foreground text-md">VertexERP</span>
              </Link>
              <p className="text-xs leading-relaxed">
                Todo lo que necesitas. Enlace confiable entre fabricantes reconocidos y el cliente final, comprometidos con la rapidez y la excelencia en Celaya, Guanajuato.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-widest">Secciones</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#inicio" className="hover:text-[#009bdf] transition-colors">Inicio</a></li>
                <li><a href="#empresa" className="hover:text-[#009bdf] transition-colors">Nosotros</a></li>
                <li><a href="#lineas-venta" className="hover:text-[#009bdf] transition-colors">Líneas de Venta</a></li>
                <li><a href="#catalogo" className="hover:text-[#009bdf] transition-colors">Catálogo Público</a></li>
                <li><a href="#contacto" className="hover:text-[#009bdf] transition-colors">Contacto</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-widest">Privacidad y Legal</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-[#009bdf] transition-colors">Aviso de Privacidad</a></li>
                <li><a href="#" className="hover:text-[#009bdf] transition-colors">Términos del Servicio</a></li>
                <li><a href="#" className="hover:text-[#009bdf] transition-colors">Políticas de Devoluciones</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-widest">Portal Seguro</h4>
              <p className="text-xs">Accede al administrador corporativo del ERP de FerreColors.</p>
              {session ? (
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-[#002d72] dark:text-[#009bdf] font-bold hover:underline">
                  Ir al Dashboard ➡️
                </Link>
              ) : (
                <LoginDialog>
                  <button className="inline-flex items-center gap-1.5 text-xs text-[#002d72] dark:text-[#009bdf] font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-left">
                    <Lock className="h-3 w-3" />
                    Acceder al ERP Administrativo ➡️
                  </button>
                </LoginDialog>
              )}
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
      <WhatsAppFloat />
    </div>
  );
}
