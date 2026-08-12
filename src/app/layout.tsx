import type { Metadata, Viewport } from 'next';
import { Manrope, Syne } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/components/Providers';

const manrope = Manrope({ subsets: ['latin-ext'], variable: '--font-manrope' });
const syne = Syne({ subsets: ['latin-ext'], variable: '--font-syne' });

export const viewport: Viewport = {
  themeColor: '#0b1210',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Generator Postów AI — Twórz viralowe posty social media z AI',
  description: 'Generator Postów AI — twórz angażujące posty na Facebook, Instagram, TikTok, LinkedIn i X w sekundy. AI optymalizuje treść pod każdą platformę, generuje wideo, obrazy i planuje publikację.',
  keywords: 'generator postów, AI posty, social media AI, content generator, Facebook posty AI, Instagram AI, TikTok AI, LinkedIn AI, automatyzacja social media, AI content marketing',
  authors: [{ name: 'Generator Postów AI' }],
  robots: 'index, follow, max-image-preview:large',
  alternates: {
    canonical: 'https://generatorpostow.ai/',
  },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: 'https://generatorpostow.ai/',
    title: 'Generator Postów AI — Twórz viralowe posty social media z AI',
    description: 'Twórz angażujące posty na wszystkie platformy social media w sekundy. AI optymalizuje treść, generuje wideo i obrazy, planuje publikację.',
    siteName: 'Generator Postów AI',
    images: [{
      url: 'https://generatorpostow.ai/og-image.png',
      width: 1200,
      height: 630,
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Generator Postów AI — Twórz viralowe posty social media z AI',
    description: 'Twórz angażujące posty na wszystkie platformy social media w sekundy. AI optymalizuje treść, generuje wideo i obrazy.',
    images: ['https://generatorpostow.ai/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${manrope.variable} ${syne.variable}`} suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              "name": "Generator Postów AI",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "Twórz angażujące posty na Facebook, Instagram, TikTok, LinkedIn i X w sekundy. AI optymalizuje treść pod każdą platformę, generuje wideo, obrazy i planuje publikację.",
              "url": "https://generatorpostow.ai/",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "PLN"
              }
            },
            {
              "@type": "Organization",
              "name": "Generator Postów AI",
              "url": "https://generatorpostow.ai/",
              "logo": "https://generatorpostow.ai/favicon.svg",
              "sameAs": [
                "https://twitter.com/generatorpostowai",
                "https://facebook.com/generatorpostowai"
              ]
            }
          ]
        }) }} />
      </head>
      <body className="bg-[#eceee9] dark:bg-[#07090c] text-slate-800 dark:text-slate-200 transition-colors duration-300 antialiased font-sans" suppressHydrationWarning>
        <Providers>
          <div id="root">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
