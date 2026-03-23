'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnalysisResult, AttentionZone, PrioritizedItem } from '@/types/analysis';

// ── Helper: score → status word ──────────────────────────────────────────────
function scoreStatus(pct: number): { word: string; color: string } {
  if (pct >= 90) return { word: 'Great',      color: 'text-emerald-600' };
  if (pct >= 50) return { word: 'OK',         color: 'text-amber-600' };
  return              { word: 'Poor',         color: 'text-red-500' };
}

// ── Overall grade ─────────────────────────────────────────────────────────────
function calcOverall(lh: AnalysisResult['lighthouse'], qual: AnalysisResult['qualitative'], aiAvailable?: boolean) {
  const qualAvg = (
    qual.visualDesign.score +
    qual.navigation.score +
    qual.contentClarity.score +
    qual.callsToAction.score +
    qual.trustCredibility.score
  ) / 5 * 10; // scale 1-10 → 0-100

  const score = aiAvailable
    ? Math.round(lh.performance * 0.25 + lh.accessibility * 0.20 + lh.seo * 0.15 + qualAvg * 0.40)
    : Math.round(lh.performance * 0.40 + lh.accessibility * 0.35 + lh.seo * 0.25);

  let grade: string, verdict: string, bg: string, text: string;
  if (score >= 90) { grade = 'A'; verdict = 'Excellent — this site delivers a great user experience'; bg = 'bg-emerald-50'; text = 'text-emerald-700'; }
  else if (score >= 75) { grade = 'B'; verdict = 'Good — works well with a few areas to improve'; bg = 'bg-emerald-50'; text = 'text-emerald-700'; }
  else if (score >= 60) { grade = 'C'; verdict = 'Fair — noticeable issues are affecting user experience'; bg = 'bg-amber-50'; text = 'text-amber-700'; }
  else if (score >= 45) { grade = 'D'; verdict = 'Poor — significant problems that hurt usability'; bg = 'bg-orange-50'; text = 'text-orange-700'; }
  else { grade = 'F'; verdict = 'Critical — major issues need immediate attention'; bg = 'bg-red-50'; text = 'text-red-700'; }

  return { score, grade, verdict, bg, text };
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  const ringColor = pct >= 90 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  const { word, color } = scoreStatus(pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={ringColor} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="36" y="36" dominantBaseline="middle" textAnchor="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: '36px 36px', fontSize: '14px', fontWeight: 700, fill: '#0f172a' }}>
          {pct}
        </text>
      </svg>
      <span className="text-xs text-slate-600 font-semibold text-center leading-tight">{label}</span>
      <span className={`text-xs font-medium ${color}`}>{word}</span>
    </div>
  );
}

// ── MetricPill (human-friendly) ───────────────────────────────────────────────
interface MetricConfig {
  humanLabel: string;
  description: string;
  value: number | null;
  format: (v: number) => string;
  status: (v: number) => { word: string; good: boolean };
}

function MetricPill({ cfg }: { cfg: MetricConfig }) {
  if (cfg.value === null) return null;
  const { word, good } = cfg.status(cfg.value);
  return (
    <div className="bg-white border border-slate-100 rounded-xl px-3.5 py-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{cfg.humanLabel}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-slate-900">{cfg.format(cfg.value)}</span>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${good ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {word}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-400">{cfg.description}</p>
    </div>
  );
}

// ── QualBar ───────────────────────────────────────────────────────────────────
function QualBar({ label, score, notes }: { label: string; score: number; notes: string }) {
  const color = score >= 8 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-400' : 'bg-red-500';
  const { word, color: textColor } = scoreStatus(score * 10);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium ${textColor}`}>{word}</span>
          <span className="text-sm font-bold text-slate-900">{score}<span className="text-slate-400 font-normal">/10</span></span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score * 10}%` }} />
      </div>
      <p className="text-xs text-slate-500">{notes}</p>
    </div>
  );
}

// ── HeatmapOverlay ────────────────────────────────────────────────────────────
function HeatmapOverlay({ zones, imgEl }: { zones: AttentionZone[]; imgEl: HTMLImageElement | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgEl) return;

    const draw = () => {
      canvas.width = imgEl.naturalWidth || imgEl.offsetWidth;
      canvas.height = imgEl.naturalHeight || imgEl.offsetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const zone of zones) {
        const cx = (zone.x / 100) * canvas.width;
        const cy = (zone.y / 100) * canvas.height;
        const r  = (zone.radius / 100) * canvas.width;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const alpha = zone.intensity * 0.65;
        const color = zone.intensity > 0.7 ? '255,30,30' : zone.intensity > 0.45 ? '255,160,0' : '60,100,255';
        grad.addColorStop(0, `rgba(${color},${alpha})`);
        grad.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (imgEl.complete && imgEl.naturalWidth > 0) draw();
    else imgEl.addEventListener('load', draw, { once: true });
  }, [zones, imgEl]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: 'multiply' }} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: PrioritizedItem['priority'] }) {
  if (priority === 'critical') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded flex-shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Critical
    </span>
  );
  if (priority === 'high') return <span className="w-2 h-2 rounded-full bg-orange-400 inline-block flex-shrink-0 mt-1.5" />;
  return <span className="w-2 h-2 rounded-full bg-slate-300 inline-block flex-shrink-0 mt-1.5" />;
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [screenshotView, setScreenshotView] = useState<'desktop' | 'mobile'>('desktop');
  const screenshotImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('ux-analysis');
    if (!raw) { router.replace('/'); return; }
    try { setResult(JSON.parse(raw)); } catch { router.replace('/'); }
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

  const { url, screenshotPath, pageType, lighthouse, axeViolations, good, bad, qualitative, navigationAnalysis, typographyAnalysis, firstImpressionAnalysis, copywritingAnalysis, heatmap, analyzedAt, aiAvailable } = result;
  const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  const overall = calcOverall(lighthouse, qualitative, aiAvailable);

  const PAGE_TYPE_META: Record<string, { label: string; emoji: string }> = {
    landing:   { label: 'Landing page',   emoji: '🎯' },
    ecommerce: { label: 'E-commerce',     emoji: '🛍️' },
    blog:      { label: 'Blog / Article', emoji: '📝' },
    dashboard: { label: 'Dashboard',      emoji: '📊' },
    form:      { label: 'Form / Contact', emoji: '📋' },
    portfolio: { label: 'Portfolio',      emoji: '🖼️' },
    other:     { label: 'Website',        emoji: '🌐' },
  };

  const navScoreWord = navigationAnalysis
    ? (navigationAnalysis.score >= 8 ? 'Great' : navigationAnalysis.score >= 5 ? 'OK' : 'Poor')
    : '';

  // Metric configs with human labels
  const metrics: MetricConfig[] = [
    {
      humanLabel: 'Page Load Time',
      description: 'How long until the main content is fully visible',
      value: lighthouse.lcp,
      format: v => `${(v / 1000).toFixed(1)}s`,
      status: v => v <= 2500 ? { word: 'Good', good: true } : v <= 4000 ? { word: 'Needs work', good: false } : { word: 'Slow', good: false },
    },
    {
      humanLabel: 'First Content Appears',
      description: 'Time until something first shows on screen',
      value: lighthouse.fcp,
      format: v => `${(v / 1000).toFixed(1)}s`,
      status: v => v <= 1800 ? { word: 'Good', good: true } : v <= 3000 ? { word: 'Needs work', good: false } : { word: 'Slow', good: false },
    },
    {
      humanLabel: 'Page Responsiveness',
      description: 'How quickly the page reacts to clicks and input',
      value: lighthouse.tbt,
      format: v => `${Math.round(v)}ms`,
      status: v => v <= 200 ? { word: 'Good', good: true } : v <= 600 ? { word: 'Needs work', good: false } : { word: 'Slow', good: false },
    },
    {
      humanLabel: 'Layout Stability',
      description: 'Whether elements jump around as the page loads',
      value: lighthouse.cls,
      format: v => v < 1 ? v.toFixed(3) : String(v),
      status: v => v <= 0.1 ? { word: 'Stable', good: true } : v <= 0.25 ? { word: 'Minor shifts', good: false } : { word: 'Unstable', good: false },
    },
    {
      humanLabel: 'Visual Speed',
      description: 'How fast the page looks complete to visitors',
      value: lighthouse.speedIndex,
      format: v => `${(v / 1000).toFixed(1)}s`,
      status: v => v <= 3400 ? { word: 'Good', good: true } : v <= 5800 ? { word: 'Needs work', good: false } : { word: 'Slow', good: false },
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">

      {/* ── Print-only header ── */}
      <div className="hidden print:block mb-4 pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Viewra Report</h1>
        <p className="text-sm text-slate-500">{url} · {new Date(analyzedAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            {hostname}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Viewra Report</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-sm text-slate-400">
              {new Date(analyzedAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            {pageType && PAGE_TYPE_META[pageType] && (
              <span className="inline-flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full font-medium">
                {PAGE_TYPE_META[pageType].emoji} {PAGE_TYPE_META[pageType].label}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Report
          </button>
          <button onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Analyze another site
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 print:block">

        {/* Left: screenshot */}
        <div className="lg:col-span-2 space-y-4 print:hidden">
          {/* Desktop / Mobile tab switcher */}
          {result.mobileScreenshotPath && (
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              <button onClick={() => setScreenshotView('desktop')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${screenshotView === 'desktop' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                🖥 Desktop
              </button>
              <button onClick={() => setScreenshotView('mobile')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${screenshotView === 'mobile' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                📱 Mobile
              </button>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-100">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-400 ml-2 truncate flex-1">{url}</span>
              {heatmap && screenshotView === 'desktop' && (
                <button onClick={() => setShowHeatmap(s => !s)}
                  className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${showHeatmap ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                  🔥 {showHeatmap ? 'Hide' : 'Attention map'}
                </button>
              )}
            </div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={screenshotImgRef}
                src={screenshotView === 'mobile' && result.mobileScreenshotPath ? result.mobileScreenshotPath : screenshotPath}
                alt={`${screenshotView === 'mobile' ? 'Mobile' : 'Desktop'} screenshot of ${hostname}`}
                className="w-full"
              />
              {showHeatmap && heatmap && screenshotView === 'desktop' && <HeatmapOverlay zones={heatmap.zones} imgEl={screenshotImgRef.current} />}
            </div>
          </div>
          {showHeatmap && heatmap && screenshotView === 'desktop' && (
            <div className="px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
              <span className="font-semibold">AI Predicted Attention</span> — not real user data.
              Based on visual hierarchy, F-pattern reading, and element prominence.
              <div className="flex items-center gap-3 mt-1.5">
                <span><span className="text-blue-500 font-bold">●</span> Low</span>
                <span><span className="text-orange-400 font-bold">●</span> Medium</span>
                <span><span className="text-red-500 font-bold">●</span> High attention</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: scores */}
        <div className="lg:col-span-3 space-y-5">

          {/* 1. Overall Score */}
          <div className={`${overall.bg} border border-slate-200 rounded-2xl p-5 flex items-center gap-5`}>
            <div className={`text-5xl font-black ${overall.text} leading-none w-12 text-center flex-shrink-0`}>
              {overall.grade}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-lg font-bold text-slate-900">Overall Score: {overall.score}/100</span>
              </div>
              <p className={`text-sm font-medium ${overall.text}`}>{overall.verdict}</p>
            </div>
          </div>

          {/* 2. What's working / Needs improvement */}
          {aiAvailable && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:break-inside-avoid">
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
                    <span className="flex-1">{item.text}</span>
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
                    <PriorityBadge priority={item.priority} />
                    <span className="flex-1">{item.text}</span>
                  </li>
                ))}
                {bad.length === 0 && <li className="text-sm text-red-600 italic">No data</li>}
              </ul>
            </div>
          </div>}

          {/* 3. Design & Usability */}
          {aiAvailable && <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:break-inside-avoid">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Design &amp; Usability</h2>
            <div className="space-y-4">
              <QualBar label="Visual Design" score={qualitative.visualDesign.score} notes={qualitative.visualDesign.notes} />
              <QualBar label="Navigation & Menus" score={qualitative.navigation.score} notes={qualitative.navigation.notes} />
              <QualBar label="Content Clarity" score={qualitative.contentClarity.score} notes={qualitative.contentClarity.notes} />
              <QualBar label="Buttons & Calls to Action" score={qualitative.callsToAction.score} notes={qualitative.callsToAction.notes} />
              <QualBar label="Trust & Credibility" score={qualitative.trustCredibility.score} notes={qualitative.trustCredibility.notes} />
            </div>
          </div>}

          {/* 4. Site Health Scores */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:break-inside-avoid">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Site Health Scores</h2>
            <div className="grid grid-cols-4 gap-4">
              <ScoreRing score={lighthouse.performance} label="Speed" />
              <ScoreRing score={lighthouse.accessibility} label="Accessibility" />
              <ScoreRing score={lighthouse.bestPractices} label="Code Quality" />
              <ScoreRing score={lighthouse.seo} label="SEO" />
            </div>
          </div>

          {/* 5. Loading Experience */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:break-inside-avoid">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">Loading Experience</h2>
            <p className="text-xs text-slate-400 mb-3">How visitors experience your site loading in their browser</p>
            <div className="space-y-2">
              {metrics.map(cfg => <MetricPill key={cfg.humanLabel} cfg={cfg} />)}
            </div>
          </div>

          {/* 6. Accessibility Issues */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:break-inside-avoid">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-2">
              Accessibility Issues
              {axeViolations && axeViolations.length > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-normal">
                  {axeViolations.length} found
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mb-3">Issues that may prevent some users from accessing your content</p>
            {(!axeViolations || axeViolations.length === 0) ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2.5">
                <span className="text-emerald-500">✓</span> No accessibility issues found — great job!
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {[...axeViolations]
                  .sort((a, b) => ({ critical: 0, serious: 1, moderate: 2, minor: 3 }[a.impact] - { critical: 0, serious: 1, moderate: 2, minor: 3 }[b.impact]))
                  .map((v) => (
                    <div key={v.id} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
                        v.impact === 'critical' ? 'bg-red-100 text-red-700' :
                        v.impact === 'serious'  ? 'bg-orange-100 text-orange-700' :
                        v.impact === 'moderate' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {v.impact === 'critical' ? 'Critical' : v.impact === 'serious' ? 'Serious' : v.impact === 'moderate' ? 'Moderate' : 'Minor'}
                      </span>
                      <span className="text-slate-700 flex-1">{v.description}</span>
                      <span className="text-slate-400 text-xs flex-shrink-0">{v.nodes} element{v.nodes !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Navigation Analysis ── */}
      {navigationAnalysis && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Navigation Analysis</h2>
              <p className="text-xs text-slate-400 mt-0.5">How easy it is for visitors to find their way around</p>
            </div>
            <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
              navigationAnalysis.score >= 8 ? 'bg-emerald-100 text-emerald-700' :
              navigationAnalysis.score >= 5 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {navScoreWord} — {navigationAnalysis.score}/10
            </div>
          </div>

          <p className="text-sm text-slate-500 italic">{navigationAnalysis.notes}</p>

          <div className={`grid gap-3 ${navigationAnalysis.mobileScreenshotPath ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-medium">
                Desktop view
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={navigationAnalysis.screenshotPath} alt="Desktop navigation" className="w-full" />
            </div>
            {navigationAnalysis.mobileScreenshotPath && (
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-medium">
                  Mobile view
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={navigationAnalysis.mobileScreenshotPath} alt="Mobile navigation" className="w-full" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Issues found</h3>
              <ul className="space-y-2">
                {navigationAnalysis.issues.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>{item}
                  </li>
                ))}
                {navigationAnalysis.issues.length === 0 && <li className="text-sm text-slate-400 italic">No issues found</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">How to improve</h3>
              <ul className="space-y-2">
                {navigationAnalysis.recommendations.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-violet-500 mt-0.5 flex-shrink-0">→</span>{item}
                  </li>
                ))}
                {navigationAnalysis.recommendations.length === 0 && <li className="text-sm text-slate-400 italic">No recommendations</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── First Impression ── */}
      {firstImpressionAnalysis && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">First Impression</h2>
              <p className="text-xs text-slate-400 mt-0.5">What users see above the fold in the first 5 seconds</p>
            </div>
            <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
              firstImpressionAnalysis.score >= 8 ? 'bg-emerald-100 text-emerald-700' :
              firstImpressionAnalysis.score >= 5 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {firstImpressionAnalysis.score >= 8 ? 'Great' : firstImpressionAnalysis.score >= 5 ? 'OK' : 'Poor'} — {firstImpressionAnalysis.score}/10
            </div>
          </div>
          <p className="text-sm text-slate-500 italic">{firstImpressionAnalysis.verdict}</p>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">What works</h3>
              <ul className="space-y-2">
                {firstImpressionAnalysis.strengths.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>{item}
                  </li>
                ))}
                {firstImpressionAnalysis.strengths.length === 0 && <li className="text-sm text-slate-400 italic">None identified</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Issues above the fold</h3>
              <ul className="space-y-2">
                {firstImpressionAnalysis.issues.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>{item}
                  </li>
                ))}
                {firstImpressionAnalysis.issues.length === 0 && <li className="text-sm text-slate-400 italic">No issues found</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Typography Analysis ── */}
      {typographyAnalysis && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Typography & Readability</h2>
              <p className="text-xs text-slate-400 mt-0.5">Fonts, heading hierarchy, line length, and text clarity</p>
            </div>
            <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
              typographyAnalysis.score >= 8 ? 'bg-emerald-100 text-emerald-700' :
              typographyAnalysis.score >= 5 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {typographyAnalysis.score >= 8 ? 'Great' : typographyAnalysis.score >= 5 ? 'OK' : 'Poor'} — {typographyAnalysis.score}/10
            </div>
          </div>
          <p className="text-sm text-slate-500 italic">{typographyAnalysis.notes}</p>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Issues found</h3>
              <ul className="space-y-2">
                {typographyAnalysis.issues.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>{item}
                  </li>
                ))}
                {typographyAnalysis.issues.length === 0 && <li className="text-sm text-slate-400 italic">No issues found</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">How to improve</h3>
              <ul className="space-y-2">
                {typographyAnalysis.recommendations.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-violet-500 mt-0.5 flex-shrink-0">→</span>{item}
                  </li>
                ))}
                {typographyAnalysis.recommendations.length === 0 && <li className="text-sm text-slate-400 italic">No recommendations</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Copywriting Analysis ── */}
      {copywritingAnalysis && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Copy Analysis</h2>
              <p className="text-xs text-slate-400 mt-0.5">Headline quality, value proposition, readability, and CTA copy</p>
            </div>
            <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
              copywritingAnalysis.score >= 8 ? 'bg-emerald-100 text-emerald-700' :
              copywritingAnalysis.score >= 5 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {copywritingAnalysis.score >= 8 ? 'Great' : copywritingAnalysis.score >= 5 ? 'OK' : 'Poor'} — {copywritingAnalysis.score}/10
            </div>
          </div>
          <p className="text-sm text-slate-500 italic">{copywritingAnalysis.notes}</p>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Copy issues</h3>
              <ul className="space-y-2">
                {copywritingAnalysis.issues.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>{item}
                  </li>
                ))}
                {copywritingAnalysis.issues.length === 0 && <li className="text-sm text-slate-400 italic">No issues found</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">Suggestions</h3>
              <ul className="space-y-2">
                {copywritingAnalysis.suggestions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-violet-500 mt-0.5 flex-shrink-0">→</span>{item}
                  </li>
                ))}
                {copywritingAnalysis.suggestions.length === 0 && <li className="text-sm text-slate-400 italic">No suggestions</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
