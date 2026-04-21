import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "@/components/ui/sonner";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "SpeechCoach — Perfectionnez votre expression orale",
    template: "%s · SpeechCoach",
  },
  description:
    "Plateforme intelligente d'analyse et de coaching pour vos présentations orales. Obtenez un feedback personnalisé sur votre rythme, clarté et impact.",
  metadataBase: new URL("https://speechcoach.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${cormorant.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Passer au contenu principal
        </a>

        <AuthProvider>
          <div id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </div>
          <Toaster position="top-right" expand={false} richColors />
        </AuthProvider>
      </body>
    </html>
  );
}