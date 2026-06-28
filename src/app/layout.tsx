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
  title: "Job-Lens AI — Search, Apply & Land Jobs with AI",
  description: "More than CV optimization. Job-Lens AI searches jobs, tailors your CV, writes cover letters, auto-applies and preps you for interviews — for DACH and India.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://job-lens.de"),
  openGraph: {
    title: "Job-Lens AI — AI Career Platform for DACH & India",
    description: "More than CV optimization. Job-Lens AI searches jobs, tailors your CV, writes cover letters, auto-applies and preps you for interviews — for DACH and India.",
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Job-Lens AI',
  url: 'https://job-lens.de',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'AI-powered career platform for Germany, Austria, Switzerland and India. Search jobs, tailor your CV, write cover letters and auto-apply — all in minutes.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: 'Free plan with 5 credits on signup',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '120',
  },
}

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Job-Lens AI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Job-Lens AI is an AI-powered career platform for job seekers in Germany, Austria, Switzerland (DACH) and India. It searches jobs, tailors your CV to a specific job description, writes cover letters, auto-applies to jobs, and prepares you for interviews — all in minutes.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does Job-Lens AI tailor my CV?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Job-Lens AI reads your existing CV and the target job description, then rewrites each section — summary, skills, experience — to match the role. It uses Claude AI (by Anthropic) to reword your experience using keywords from the job posting, improving your ATS score.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can Job-Lens AI apply to jobs automatically?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The Auto-Apply feature uses browser automation to fill and submit job application forms on external job portals. You review the prefilled form before submission.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Job-Lens AI free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Job-Lens AI is free to start. You get 5 credits on signup with no credit card required. Additional credits can be purchased via PayPal (EUR) for DACH users or via Razorpay (INR) for India users.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Job-Lens AI work for jobs in Germany?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Job-Lens AI is specifically built for the DACH market (Germany, Austria, Switzerland). It searches German job boards, tailors CVs for German employers, and includes DACH-specific features like Zeugnis analysis and work visa guidance.',
      },
    },
    {
      '@type': 'Question',
      name: 'What AI model does Job-Lens AI use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Job-Lens AI uses Claude by Anthropic for CV tailoring, cover letter generation, career scanning, and interview preparation. Claude is one of the most capable AI models for writing and analysis tasks.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the best AI tool for CV tailoring in Germany?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Job-Lens AI is purpose-built for CV tailoring in Germany and the DACH region. It rewrites your CV section by section for each job, scores it against the job description, and generates a matching cover letter — all in under 2 minutes.',
      },
    },
  ],
}

function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }}
        />
      </head>
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
