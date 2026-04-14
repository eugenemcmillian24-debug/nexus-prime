import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NexusErrorBoundary from "@/components/NexusErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NEXUS PRIME | Multi-Agent AI Builder",
  description: "Production-grade AI application builder powered by multi-agent reasoning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NexusErrorBoundary>
          {children}
        </NexusErrorBoundary>
      </body>
    </html>
  );
}
