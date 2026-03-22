'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnalysisResult } from '@/types/analysis';

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;

  const ringColor =
    pct >= 90 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text
          x="36"
          y="36"
          dominantBaseline="middle"
          textAnchor="middle"
          className="rotate-90"
          style={{ transform: 'rotate(90deg)', transformOrigin: '36px 36px', fontSize: '14px', fontWeight: 700, fill: '#0f172a' }}
        >
          {pct}
        </text>
      </svg>
      <span className="text-xs text-slate-500 font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

function MetricPill({ label, value, unit, good }: { label: string; value: number | null; unit: string; good: boolean }) {
  if (value === null) return null;
  return (
    <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-3.5 py-2.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${good ? 'text-emerald-600' : 'text-amber-600'}`}>
        {value < 1 ? value.toFixed(3) : Math.round(value).toLocaleString()}{unit}
      </span>
    </div>
  );
}

function QualBar({ label, score, notes }: { label: string; score: number; notes: string }) {
  const color = score >= 8 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{score}<span className="text-slate-400 font-normal">/10</span></span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score * 10}%` }} />
      </div>
      <p className="text-xs text-slate-500">{notes}</p>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('ux-analysis');
    if (!raw) {
      router.replace('/');
      return;
    }
    try {
      setResult(JSON.parse(raw));
    } catch {
      router.replace('/');
    }
  }, [router]);

  if (!result) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin-smooth" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading…
        </div>
      </div>
    );
  }

  const { url, screenshotPath, lighthouse, axeViolations, good, bad, qualitative, navigationAnalysis, analyzedAt } = result;
  const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            {hostname}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">UX Analysis Report</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date(analyzedAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Analyze another site
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: screenshot */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-100">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-400 ml-2 truncate">{url}</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screenshotPath} alt={`Screenshot of ${hostname}`} className="w-full" />
          </div>
        </div>

        {/* Right: all scores */}
        <div className="lg:col-span-3 space-y-5">

          {/* Lighthouse scores */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Lighthouse Scores</h2>
            <div className="grid grid-cols-4 gap-4">
              <ScoreRing score={lighthouse.performance} label="Performance" color="green" />
              <ScoreRing score={lighthouse.accessibility} label="Accessibility" color="amber" />
              <ScoreRing score={lighthouse.bestPractices} label="Best Practices" color="blue" />
              <ScoreRing score={lighthouse.seo} label="SEO" color="purple" />
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Core Web Vitals</h2>
            <div className="grid grid-cols-2 gap-2">
              <MetricPill label="LCP" value={lighthouse.lcp} unit="ms" good={(lighthouse.lcp ?? 9999) <= 2500} />
              <MetricPill label="FCP" value={lighthouse.fcp} unit="ms" good={(lighthouse.fcp ?? 9999) <= 1800} />
              <MetricPill label="TBT" value={lighthouse.tbt} unit="ms" good={(lighthouse.tbt ?? 9999) <= 200} />
              <MetricPill label="CLS" value={lighthouse.cls} unit="" good={(lighthouse.cls ?? 1) <= 0.1} />
              <MetricPill label="Speed Index" value={lighthouse.speedIndex} unit="ms" good={(lighthouse.speedIndex ?? 9999) <= 3400} />
            </div>
          </div>

          {/* Good / Bad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What's working
              </h2>
              <ul className="space-y-2">
                {good.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
                {good.length === 0 && <li className="text-sm text-emerald-600 italic">No data</li>}
              </ul>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Needs improvement
              </h2>
              <ul className="space-y-2">
                {bad.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
                    {item}
                  </li>
                ))}
                {bad.length === 0 && <li className="text-sm text-red-600 italic">No data</li>}
              </ul>
            </div>
          </div>

          {/* Axe-core accessibility violations */}
          {axeViolations && axeViolations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                Accessibility Violations
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-normal">
                  {axeViolations.length} found
                </span>
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {axeViolations
                  .sort((a, b) => {
                    const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
                    return order[a.impact] - order[b.impact];
                  })
                  .map((v) => (
                    <div key={v.id} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
                        v.impact === 'critical' ? 'bg-red-100 text-red-700' :
                        v.impact === 'serious' ? 'bg-orange-100 text-orange-700' :
                        v.impact === 'moderate' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {v.impact}
                      </span>
                      <span className="text-slate-700 flex-1">{v.description}</span>
                      <span className="text-slate-400 text-xs flex-shrink-0">{v.nodes}×</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Qualitative UX */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">UX Quality (AI Assessment)</h2>
            <div className="space-y-4">
              <QualBar label="Visual Design" score={qualitative.visualDesign.score} notes={qualitative.visualDesign.notes} />
              <QualBar label="Navigation" score={qualitative.navigation.score} notes={qualitative.navigation.notes} />
              <QualBar label="Content Clarity" score={qualitative.contentClarity.score} notes={qualitative.contentClarity.notes} />
              <QualBar label="Calls to Action" score={qualitative.callsToAction.score} notes={qualitative.callsToAction.notes} />
              <QualBar label="Trust & Credibility" score={qualitative.trustCredibility.score} notes={qualitative.trustCredibility.notes} />
            </div>
          </div>

        </div>
      </div>

      {/* Navigation Analysis */}
      {navigationAnalysis && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Navigation Analysis</h2>
            <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
              navigationAnalysis.score >= 8 ? 'bg-emerald-100 text-emerald-700' :
              navigationAnalysis.score >= 5 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              Score: {navigationAnalysis.score}/10
            </div>
          </div>

          <p className="text-sm text-slate-500 italic">{navigationAnalysis.notes}</p>

          {/* Nav screenshots — desktop + mobile side by side */}
          <div className={`grid gap-3 ${navigationAnalysis.mobileScreenshotPath ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-400 font-medium">
                Desktop (1280px)
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={navigationAnalysis.screenshotPath} alt="Desktop navigation" className="w-full" />
            </div>
            {navigationAnalysis.mobileScreenshotPath && (
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-400 font-medium">
                  Mobile (375px)
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={navigationAnalysis.mobileScreenshotPath} alt="Mobile navigation" className="w-full" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Issues */}
            <div>
              <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Issues found</h3>
              <ul className="space-y-2">
                {navigationAnalysis.issues.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
                    {item}
                  </li>
                ))}
                {navigationAnalysis.issues.length === 0 && (
                  <li className="text-sm text-slate-400 italic">No issues found</li>
                )}
              </ul>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">Recommendations</h3>
              <ul className="space-y-2">
                {navigationAnalysis.recommendations.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-violet-500 mt-0.5 flex-shrink-0">→</span>
                    {item}
                  </li>
                ))}
                {navigationAnalysis.recommendations.length === 0 && (
                  <li className="text-sm text-slate-400 italic">No recommendations</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
