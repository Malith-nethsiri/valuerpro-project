import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ValuerPro - AI-Powered Property Valuation Reports",
  description: "Professional property valuation report system with AI assistance for Sri Lankan market. Generate comprehensive property valuation reports with automated document processing.",
  keywords: "property valuation, real estate, Sri Lanka, AI, professional reports, IVSL, chartered valuer",
  authors: [{ name: "ValuerPro Team" }],
  creator: "ValuerPro",
  publisher: "ValuerPro",
  robots: "index, follow",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://valuerpro.com",
    title: "ValuerPro - AI-Powered Property Valuation Reports",
    description: "Professional property valuation report system with AI assistance for Sri Lankan market.",
    siteName: "ValuerPro",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ValuerPro Property Valuation System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ValuerPro - AI-Powered Property Valuation Reports",
    description: "Professional property valuation report system with AI assistance.",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary enableReporting={process.env.NODE_ENV === 'production'}>
          <ClientProviders>
            {children}
          </ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
