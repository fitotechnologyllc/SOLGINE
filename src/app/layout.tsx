import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SolanaProvider } from "@/components/providers/SolanaProvider";
import { ProjectProvider } from "@/components/providers/ProjectProvider";
import { OnboardingGuide } from "@/components/growth/OnboardingGuide";
import { FirebaseConnectionCheck } from "@/components/providers/FirebaseConnectionCheck";
import { Toaster } from "react-hot-toast";
import { Suspense } from "react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SOLGINE | The Solana Engine for Digital Game Economies",
  description: "Collect, trade, sell, and play digital card games. Powered by Fito Technology, LLC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        <AuthProvider>
          <SolanaProvider>
            <Suspense fallback={null}>
              <ProjectProvider>
                {children}
                <FirebaseConnectionCheck />
                <Toaster position="bottom-right" toastOptions={{
                  style: {
                    background: '#131313',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                  },
                }} />
                <OnboardingGuide />
              </ProjectProvider>
            </Suspense>
          </SolanaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
