import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job-Lens AI — AI Career Platform for DACH & India",
  description: "AI-powered career platform for Germany, Austria, Switzerland and India. CV analysis, job matching, tailored applications and cover letters.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://job-lens.de"),
  openGraph: {
    title: "Job-Lens AI — AI Career Platform for DACH & India",
    description: "AI-powered career platform for Germany, Austria, Switzerland and India. CV analysis, job matching, tailored applications and cover letters.",
    url: "https://job-lens.de",
    siteName: "Job-Lens AI",
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/favicon.png", type: "image/png", sizes: "192x192" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
