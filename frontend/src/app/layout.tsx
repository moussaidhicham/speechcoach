import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpeechCoach | Perfectionnez votre expression orale",
  description: "Plateforme intelligente d'analyse et de coaching pour vos présentations orales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
          <Toaster position="top-center" expand={false} richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
