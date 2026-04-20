import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NexusErrorBoundary from "@/components/NexusErrorBoundary";
import PWARegister from "@/components/PWARegister";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NEXUS PRIME | Autonomous AI Software Factory",
  description: "Deploy production-grade applications in seconds with NEXUS PRIME's multi-agent orchestration engine. From prompt to production.",
  // PROD FIX: Enhanced metadata for SEO and production readiness
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "NEXUS PRIME | Autonomous AI Software Factory",
    description: "The world's first multi-agent software factory. Build and deploy complex apps autonomously.",
    url: "https://nexus-prime.ai",
    siteName: "NEXUS PRIME",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXUS PRIME | Autonomous AI Software Factory",
    description: "Build and deploy complex apps autonomously with multi-agent orchestration.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NEXUS PRIME",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PWARegister />
        <NexusErrorBoundary>
          {children}
        </NexusErrorBoundary>
      </body>
    </html>
  );
}
