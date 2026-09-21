import type { Metadata } from "next";
import {
  Noto_Sans,
  Noto_Sans_Devanagari,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
  Noto_Sans_Bengali,
  Noto_Sans_Kannada,
} from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import { LanguageProvider } from "../context/LanguageContext";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-tamil",
  display: "swap",
});

const notoTelugu = Noto_Sans_Telugu({
  subsets: ["telugu"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-telugu",
  display: "swap",
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-bengali",
  display: "swap",
});

const notoKannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-kannada",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DermAI — AI-Assisted Multi-Class Skin Lesion Screening",
  description: "Explainable AI skin screening across 7 clinical categories with Grad-CAM visual attention maps and verified dermatologist resources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC script to prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                const savedLang = localStorage.getItem('dermai_locale');
                if (savedLang) {
                  document.documentElement.lang = savedLang;
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${notoSans.variable} ${notoDevanagari.variable} ${notoTamil.variable} ${notoTelugu.variable} ${notoBengali.variable} ${notoKannada.variable} font-sans antialiased min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-[#0B0F19] dark:via-[#0B0F19] dark:to-[#0F172A] text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200`}
      >
        <LanguageProvider>
          <Header />
          <main className="flex-1 w-full">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
