import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// DECISIONS.md ADR-109 (landscape visual direction) — editorial serif for display headings,
// exposed as --font-serif in app/globals.css. Not applied globally, just where a page opts in.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "LifeOS",
  description: "Your personal life operating system.",
  // Makes "Add to Home Screen" on iOS launch as a standalone app (own window, no Safari
  // chrome) instead of just a bookmark shortcut — iOS doesn't infer this from the Web App
  // Manifest alone the way Android does. See app/manifest.ts for the cross-platform manifest.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LifeOS",
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
