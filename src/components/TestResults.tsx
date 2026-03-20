'use client';

import { useState } from 'react';
import { RunResult, STEP_LABELS } from '@/types';

interface Props {
  result: RunResult;
  expanded?: boolean;
}

export default function TestResults({ result, expanded = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const passCount = result.steps.filter((s) => s.status === 'pass').length;
  const failCount = result.steps.filter((s) => s.status === 'fail').length;
  const skipCount = result.steps.filter((s) => s.status === 'skip').length;
  const isPassed = result.status === 'pass';

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="screenshot"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition"
            onClick={() => setLightbox(null)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header — clickable to toggle */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className={`w-full text-left px-5 py-4 flex items-center justify-between transition-colors ${
            isPassed
              ? 'bg-emerald-50 hover:bg-emerald-100/70'
              : 'bg-red-50 hover:bg-red-100/70'
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Status icon */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isPassed ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {isPassed ? (
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <div className={`font-semibold text-sm ${isPassed ? 'text-emerald-800' : 'text-red-800'}`}>
                {isPassed ? 'Тест прошёл' : 'Тест упал'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {new Date(result.startedAt).toLocaleString('ru')} · {result.durationMs}ms
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Counts */}
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="text-emerald-700">{passCount} прошло</span>
              {failCount > 0 && <span className="text-red-700">{failCount} упало</span>}
              {skipCount > 0 && <span className="text-slate-400">{skipCount} пропущено</span>}
            </div>
            {/* Chevron */}
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </button>

        {/* Steps detail */}
        {isExpanded && (
          <div className="divide-y divide-slate-100">
            {result.steps.map((step, i) => {
              const isFail = step.status === 'fail';
              const isSkip = step.status === 'skip';
              return (
                <div key={step.stepId} className={`px-5 py-3.5 ${isFail ? 'bg-red-50/50' : ''}`}>
                  <div className="flex items-start gap-3">
                    {/* Status dot */}
                    <div className={`mt-0.5 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 ${
                      step.status === 'pass'
                        ? 'bg-emerald-100 text-emerald-700'
                        : isFail
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {step.status === 'pass' ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : isFail ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <span>—</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium ${isSkip ? 'text-slate-400' : 'text-slate-700'}`}>
                          {i + 1}. {STEP_LABELS[step.type]}
                        </span>
                        <span className="text-xs text-slate-400 flex-shrink-0">{step.durationMs}ms</span>
                      </div>

                      {step.error && (
                        <div className="mt-1.5 text-xs text-red-700 font-mono bg-red-100 rounded-lg px-3 py-1.5 break-all">
                          {step.error}
                        </div>
                      )}

                      {step.screenshotPath && (
                        <div className="mt-2">
                          <button onClick={() => setLightbox(step.screenshotPath!)}>
                            <img
                              src={step.screenshotPath}
                              alt="screenshot"
                              className="max-h-36 rounded-xl border border-slate-200 hover:border-violet-400 hover:shadow-md transition cursor-zoom-in object-cover"
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
