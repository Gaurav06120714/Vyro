import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { PlanProvider } from "@/context/PlanContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Providers from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "VyroPortify — AI Portfolio Generator",
  description: "Transform your resume into a beautiful portfolio in under 60 seconds.",
  openGraph: {
    title: "VyroPortify — AI Portfolio Generator",
    description: "Transform your resume into a beautiful portfolio in under 60 seconds.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      signInUrl="/login"
      signUpUrl="/register"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('portify-theme')||'dark';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.classList.toggle('dark',r==='dark')}catch(e){document.documentElement.classList.add('dark')}` }} />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
        >
          <ThemeProvider>
            <Providers>
              <PlanProvider>{children}</PlanProvider>
            </Providers>
          </ThemeProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "portify-toast",
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
