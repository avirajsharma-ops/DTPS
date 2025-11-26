import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import { ClientAppLayout } from "@/components/layout/ClientAppLayout";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DTPS Nutrition - Your Personal Wellness Journey",
  description: "Connect with certified dietitians and nutritionists for personalized meal plans, health tracking, and wellness guidance. Available as a Progressive Web App.",
  manifest: "/manifest.json",
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DTPS Nutrition",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "DTPS Nutrition",
    title: "DTPS Nutrition - Your Personal Wellness Journey",
    description: "Connect with certified dietitians for personalized nutrition guidance",
    images: ['/icons/icon-512x512.png'],
  },
  twitter: {
    card: "summary",
    title: "DTPS Nutrition",
    description: "Your personal nutrition and wellness platform",
    images: ['/icons/icon-512x512.png'],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="DTPS Nutrition" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DTPS Nutrition" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#16a34a" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Theme Color - Matches app header */}
        <meta name="theme-color" content="#ffffff" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-192x192.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Splash Screens for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-2048-2732.jpg" sizes="2048x2732" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1668-2224.jpg" sizes="1668x2224" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1536-2048.jpg" sizes="1536x2048" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1125-2436.jpg" sizes="1125x2436" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1242-2208.jpg" sizes="1242x2208" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-750-1334.jpg" sizes="750x1334" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-640-1136.jpg" sizes="640x1136" />
      </head>
      <body
      suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <ClientAppLayout>
            {children}
          </ClientAppLayout>
          <InstallPrompt />
          <ServiceWorkerRegistration />
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
