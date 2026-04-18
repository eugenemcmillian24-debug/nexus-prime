import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NexusErrorBoundary from "@/components/NexusErrorBoundary";
import PWARegister from "@/components/PWARegister";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nexus-prime-woad.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NEXUS PRIME | Multi-Agent AI Builder",
    template: "%s | NEXUS PRIME",
  },
  description: "Production-grade AI application builder powered by multi-agent reasoning.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "NEXUS PRIME | Multi-Agent AI Builder",
    description: "Build production-grade AI applications with multi-agent reasoning. Visual builder, one-click deploy, credits-based pricing.",
    url: siteUrl,
    siteName: "NEXUS PRIME",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXUS PRIME | Multi-Agent AI Builder",
    description: "Build production-grade AI applications with multi-agent reasoning.",
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
