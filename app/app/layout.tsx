

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import PWAInstall from "@/components/pwa-install";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VertexERP - Sistema para Ferreterías",
  description: "VertexERP: Sistema integral para la gestión de recursos de ferreterías con módulos de ventas, cobranza, inventario y más. Funcionalidad offline para cobranza móvil.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VertexERP",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/PWA-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/PWA-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/PWA-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VertexERP" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Service Worker deshabilitado temporalmente para evitar errores con redirects
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
        */}
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <PWAInstall />
          <Toaster 
            position="top-center"
            richColors 
            closeButton
            duration={4000}
          />
        </Providers>
      </body>
    </html>
  );
}

