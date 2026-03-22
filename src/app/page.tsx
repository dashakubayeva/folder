'use client';

import { useEffect, useState } from 'react';
import { Scenario } from '@/types';
import Link from 'next/link';

type Toast = { id: number; message: string; type: 'success' | 'error' };

export default function HomePage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(message: string, type: 'success' | 'error') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  async function fetchScenarios() {
    const res = await fetch('/api/scenarios');
    const data = await res.json();
    setScenarios(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchScenarios();
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete scenario "${name}"?`)) return;
    await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleRun(id: string) {
    setRunning(id);
    try {
      const res = await fetch(`/api/scenarios/${id}/run`, { method: 'POST' });
      const result = await res.json();
      if (result.status === 'pass') {
        addToast('Test passed', 'success');
      } else {
        addToast('Test failed — check results', 'error');
      }
      window.location.href = `/scenarios/${id}/results?last=${result.id}`;
    } catch {
      addToast('Error running scenario', 'error');
    } finally {
      setRunning(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin-smooth" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-slide-up flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto ${
              t.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {t.type === 'success' ? (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>

      {scenarios.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.059l.182.088M14.25 3.104c.251.023.501.05.75.082M19.5 14.25v.75a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25v-.75" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">No scenarios</h2>
          <p className="text-slate-500 text-sm mb-7 max-w-xs">
            Create your first scenario: define steps — clicks, form fills, assertions — and run an automated test.
          </p>
          <Link
            href="/scenarios/new"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create scenario
          </Link>
        </div>
      ) : (
        <div>
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Scenarios</h1>
              <p className="text-sm text-slate-500 mt-0.5">{scenarios.length} {scenarios.length === 1 ? 'scenario' : 'scenarios'}</p>
            </div>
          </div>

          <div className="space-y-3">
            {scenarios.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors animate-fade-in"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{s.name}</div>
                    {s.description && (
                      <div className="text-sm text-slate-500 truncate mt-0.5">{s.description}</div>
                    )}
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <span>{s.steps.length} {s.steps.length === 1 ? 'step' : 'steps'}</span>
                      <span>·</span>
                      <span>updated {new Date(s.updatedAt).toLocaleDateString('en')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRun(s.id)}
                    disabled={running === s.id}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {running === s.id ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin-smooth" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Running...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                        </svg>
                        Run
                      </>
                    )}
                  </button>
                  <Link
                    href={`/scenarios/${s.id}/results`}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Results
                  </Link>
                  <Link
                    href={`/scenarios/${s.id}`}
                    className="bg-violet-50 hover:bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
