import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flow Tester',
  description: 'Visual testing of user flows',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen">
        <nav className="bg-slate-900 px-6 py-0 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
            <a href="/" className="flex items-center gap-2.5 group">
              {/* Logo icon */}
              <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12l4-4m-4 4l4 4" />
                </svg>
              </div>
              <span className="text-white font-semibold text-sm tracking-tight">Flow Tester</span>
            </a>
            <a
              href="/scenarios/new"
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New scenario
            </a>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
