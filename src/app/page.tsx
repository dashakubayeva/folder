'use client';

import { useEffect, useState } from 'react';
import { Scenario } from '@/types';
import Link from 'next/link';

export default function HomePage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

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
    if (!confirm(`Удалить сценарий "${name}"?`)) return;
    await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleRun(id: string) {
    setRunning(id);
    try {
      const res = await fetch(`/api/scenarios/${id}/run`, { method: 'POST' });
      const result = await res.json();
      window.location.href = `/scenarios/${id}/results?last=${result.id}`;
    } catch {
      alert('Ошибка при запуске сценария');
    } finally {
      setRunning(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🧪</div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Нет сценариев</h2>
        <p className="text-gray-500 mb-6">Создайте первый сценарий для тестирования user flow</p>
        <Link
          href="/scenarios/new"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Создать сценарий
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Сценарии</h1>
      <div className="space-y-3">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">{s.name}</div>
              {s.description && (
                <div className="text-sm text-gray-500 truncate mt-0.5">{s.description}</div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {s.steps.length} шагов · обновлён {new Date(s.updatedAt).toLocaleDateString('ru')}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleRun(s.id)}
                disabled={running === s.id}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
              >
                {running === s.id ? 'Запуск...' : 'Запустить'}
              </button>
              <Link
                href={`/scenarios/${s.id}/results`}
                className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Результаты
              </Link>
              <Link
                href={`/scenarios/${s.id}`}
                className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
              >
                Редактировать
              </Link>
              <button
                onClick={() => handleDelete(s.id, s.name)}
                className="text-red-500 hover:text-red-700 px-2 py-1.5 text-sm transition"
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
