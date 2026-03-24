'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalysisResult } from '@/types/analysis';

const LOADING_STEPS = [
  'Capturing screenshot…',
  'Running Lighthouse audit…',
  'Checking performance…',
  'Analyzing accessibility…',
  'AI reviewing your UX…',
  'Analyzing navigation…',
  'Analyzing typography…',
  'Measuring first impression…',
  'Reviewing copy…',
];

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [pageTypeHint, setPageTypeHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) { setProgress(0); setStepLabel(''); return; }
    let p = 0;
    const interval = setInterval(() => {
      p = p >= 88 ? p + 0.2 : p >= 70 ? p + 0.8 : p + 1.8;
      if (p > 95) p = 95;
      setProgress(p);
      const stepIdx = Math.min(
        Math.floor((p / 95) * (LOADING_STEPS.length - 1)),
        LOADING_STEPS.length - 1
      );
      setStepLabel(LOADING_STEPS[stepIdx]);
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    let normalized = url.trim();
    if (!normalized) return;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }

    setLoading(true);
    setProgress(0);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized, pageTypeHint: pageTypeHint || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const result: AnalysisResult = await res.json();
      localStorage.setItem('ux-analysis', JSON.stringify(result));
      setProgress(100);
      setTimeout(() => router.push('/results'), 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-200">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>

      <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Viewra</h1>
      <p className="text-slate-500 text-lg mb-10 max-w-md">
        Enter any website URL to get an instant AI-powered UX audit — performance, accessibility, and design quality.
      </p>

      <form onSubmit={handleAnalyze} className="w-full max-w-xl">
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 shadow-sm"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin-smooth" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Analyze
              </>
            )}
          </button>
        </div>

        {/* Page type selector */}
        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Page type:</label>
          <select
            value={pageTypeHint}
            onChange={(e) => setPageTypeHint(e.target.value)}
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 shadow-sm"
          >
            <option value="">Auto-detect</option>
            <option value="landing">Landing page</option>
            <option value="ecommerce">E-commerce / Product</option>
            <option value="blog">Blog / Article</option>
            <option value="dashboard">Dashboard / App</option>
            <option value="form">Form / Contact</option>
            <option value="portfolio">Portfolio</option>
          </select>
        </div>

        {/* Loading progress */}
        {loading && (
          <div className="mt-5 animate-fade-in">
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-sm text-violet-600 font-medium">{stepLabel}</p>
              <p className="text-xs text-slate-400">{Math.round(progress)}%</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-violet-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">This usually takes 30–60 seconds</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}
      </form>

      {/* What we check */}
      <div className="mt-16 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl text-left">
        {[
          { icon: '⚡', label: 'Performance', sub: 'LCP, CLS, FCP' },
          { icon: '♿', label: 'Accessibility', sub: 'WCAG compliance' },
          { icon: '🔍', label: 'SEO', sub: 'Discoverability' },
          { icon: '🎨', label: 'Visual Design', sub: 'Hierarchy & style' },
          { icon: '🧭', label: 'Navigation', sub: 'Wayfinding' },
          { icon: '🎯', label: 'Calls to Action', sub: 'Conversion clarity' },
          { icon: '🔤', label: 'Typography', sub: 'Fonts & readability' },
          { icon: '⚡', label: 'First Impression', sub: 'Above the fold' },
          { icon: '✍️', label: 'Copywriting', sub: 'Clarity & headlines' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-100 p-3.5 shadow-sm">
            <div className="text-xl mb-1">{item.icon}</div>
            <div className="font-medium text-slate-800 text-sm">{item.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
