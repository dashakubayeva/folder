'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RunResult } from '@/types';
import TestResults from '@/components/TestResults';

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const lastId = searchParams.get('last');

  const [results, setResults] = useState<RunResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function fetchResults() {
    const res = await fetch(`/api/scenarios/${id}/results`);
    const data = await res.json();
    setResults(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchResults();
  }, [id]);

  async function handleRun() {
    setRunning(true);
    const res = await fetch(`/api/scenarios/${id}/run`, { method: 'POST' });
    const result = await res.json();
    setResults((prev) => [result, ...prev]);
    setRunning(false);
  }

  if (loading) {
    return <div className="text-gray-500 py-10 text-center">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            ← Все сценарии
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Результаты запусков</h1>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
        >
          {running ? 'Запуск...' : 'Запустить снова'}
        </button>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          Нет запусков. Нажмите «Запустить снова» чтобы начать тест.
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <TestResults
              key={result.id}
              result={result}
              expanded={result.id === lastId || results.length === 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
