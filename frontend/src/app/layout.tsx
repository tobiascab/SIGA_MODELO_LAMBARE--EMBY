import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from "@/context/ConfigContext";
import { CooperativaProvider } from "@/context/CooperativaContext";

import { MaintenanceGuard } from "@/components/MaintenanceGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIGA - Sistema de Gestión de Asambleas | Cooperativa Lambaré",
  description: "Sistema web profesional para gestión de asambleas cooperativas. Control de asistencia, votaciones, documentos y socios. Cooperativa Multiactiva Lambaré Ltda. Paraguay.",
  keywords: ["sistema de asambleas", "cooperativa", "gestión cooperativa", "control asistencia", "votaciones", "Paraguay", "SIGA", "Cooperativa Lambaré"],
  authors: [{ name: "Cooperativa Multiactiva Lambaré Ltda" }],
  creator: "Avanzantec Group SRL",
  publisher: "Cooperativa Multiactiva Lambaré Ltda",

  twitter: {
    card: "summary_large_image",
    title: "SIGA - Sistema de Gestión de Asambleas",
    description: "Plataforma integral para la gestión de asambleas cooperativas"
  },
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "https://asamblea.cloud"
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/logo.png",
    },
  },
  openGraph: {
    title: "SIGA - Sistema de Gestión de Asambleas",
    description: "Plataforma integral para la gestión de asambleas cooperativas. Control de asistencia, votaciones y documentación.",
    type: "website",
    locale: "es_PY",
    siteName: "SIGA Cooperativa Lambaré",
    url: "https://asamblea.cloud",
    images: [
      {
        url: "/uploads/logos/logo_cooperativa.png",
        width: 800,
        height: 600,
        alt: "Logo Cooperativa Multiactiva Lambaré Ltda",
      },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SIGA" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="msapplication-TileImage" content="/logo.png" />
        <meta name="msapplication-TileColor" content="#009900" />
        {/* Schema.org Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "SIGA - Sistema de Gestión de Asambleas",
              "description": "Sistema web profesional para gestión de asambleas cooperativas",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Any",
              "url": "https://asamblea.cloud",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "PYG"
              },
              "provider": {
                "@type": "Organization",
                "name": "Cooperativa Multiactiva Lambaré Ltda",
                "url": "https://asamblea.cloud",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Lambaré",
                  "addressRegion": "Central",
                  "addressCountry": "PY"
                }
              }
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <CooperativaProvider>
          <ConfigProvider>
            <MaintenanceGuard>
              {children}
            </MaintenanceGuard>
          </ConfigProvider>
        </CooperativaProvider>
      </body>
    </html>
  );
}
