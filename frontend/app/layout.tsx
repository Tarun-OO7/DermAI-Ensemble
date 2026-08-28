import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediScan AI",
  description: "Medical Diagnostic Web Application for early detection of Skin, Breast, and Lung cancer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">M</div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">MediScan <span className="text-blue-600">AI</span></h1>
            </div>
            <nav className="text-sm font-medium text-slate-500">
              Diagnostic Portal
            </nav>
          </div>
        </header>
        
        <main className="flex-1 w-full">
          {children}
        </main>
        
        <footer className="bg-white border-t border-slate-200 py-6 mt-12">
          <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} MediScan AI. For demonstration purposes only. Not a substitute for professional medical advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
