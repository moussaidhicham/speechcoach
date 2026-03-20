import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "@/components/ui/sonner";

/*
  Font strategy — calm, refined, human:
  ─ Cormorant Garamond  →  display / headings
      Elegant old-style serif. Gives headings warmth and presence without
      feeling corporate. Pairs beautifully with the teal-and-sand palette.
  ─ DM Sans             →  body / UI
      Geometric but soft — readable at every size, never tiring on the eye.
      Much more relaxed than Source Sans.
  ─ IBM Plex Mono       →  code / data
      Retained — it's excellent and matches the understated tone.
*/

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ee" },
    { media: "(prefers-color-scheme: dark)",  color: "#131b23" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "SpeechCoach — Perfectionnez votre expression orale",
    template: "%s · SpeechCoach",
  },
  description:
    "Plateforme intelligente d'analyse et de coaching pour vos présentations orales. Obtenez un feedback personnalisé sur votre rythme, clarté et impact.",
  metadataBase: new URL("https://speechcoach.app"),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "SpeechCoach",
  },
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
        <AuthProvider>
          {children}
          <Toaster position="top-right" expand={false} richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
