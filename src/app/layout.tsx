import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UX Analyzer',
  description: 'AI-powered UX audit for any website',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen" suppressHydrationWarning>
        <nav className="bg-slate-900 px-6 py-0 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
            <a href="/" className="flex items-center gap-2.5 group">
              {/* Logo icon */}
              <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-white font-semibold text-sm tracking-tight">UX Analyzer</span>
            </a>
            <a
              href="/scenarios"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Flow Tester
            </a>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
