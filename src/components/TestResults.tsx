'use client';

import { RunResult, STEP_LABELS } from '@/types';

interface Props {
  result: RunResult;
  expanded?: boolean;
}

export default function TestResults({ result, expanded = false }: Props) {
  const passCount = result.steps.filter((s) => s.status === 'pass').length;
  const failCount = result.steps.filter((s) => s.status === 'fail').length;
  const skipCount = result.steps.filter((s) => s.status === 'skip').length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className={`px-5 py-4 flex items-center justify-between ${
          result.status === 'pass' ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{result.status === 'pass' ? '✅' : '❌'}</span>
          <div>
            <div className="font-semibold text-gray-900">
              {result.status === 'pass' ? 'Тест прошёл' : 'Тест упал'}
            </div>
            <div className="text-sm text-gray-500">
              {new Date(result.startedAt).toLocaleString('ru')} · {result.durationMs}ms
            </div>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-green-700 font-medium">{passCount} ✓</span>
          {failCount > 0 && <span className="text-red-700 font-medium">{failCount} ✗</span>}
          {skipCount > 0 && <span className="text-gray-400">{skipCount} skip</span>}
        </div>
      </div>

      {/* Steps */}
      {expanded && (
        <div className="divide-y divide-gray-100">
          {result.steps.map((step, i) => (
            <div key={step.stepId} className="px-5 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 ${
                    step.status === 'pass'
                      ? 'bg-green-100 text-green-700'
                      : step.status === 'fail'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step.status === 'pass' ? '✓' : step.status === 'fail' ? '✗' : '—'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700">
                    {i + 1}. {STEP_LABELS[step.type]}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">{step.durationMs}ms</span>
                  {step.error && (
                    <div className="text-xs text-red-600 mt-1 font-mono bg-red-50 rounded px-2 py-1 truncate">
                      {step.error}
                    </div>
                  )}
                </div>
              </div>
              {step.screenshotPath && (
                <div className="mt-2 ml-8">
                  <a href={step.screenshotPath} target="_blank" rel="noopener noreferrer">
                    <img
                      src={step.screenshotPath}
                      alt="screenshot"
                      className="max-h-40 rounded border border-gray-200 hover:opacity-90 transition cursor-pointer"
                    />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
