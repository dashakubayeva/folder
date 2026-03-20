'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Scenario, Step } from '@/types';
import StepEditor from './StepEditor';

interface Props {
  initial?: Scenario;
}

export default function ScenarioBuilder({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [steps, setSteps] = useState<Step[]>(initial?.steps ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { id: uuidv4(), type: 'goto', params: {} },
    ]);
  }

  function updateStep(index: number, step: Step) {
    setSteps((prev) => prev.map((s, i) => (i === index ? step : s)));
  }

  function deleteStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    const next = [...steps];
    const target = direction === 'up' ? index - 1 : index + 1;
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Введите название сценария');
      return;
    }
    if (steps.length === 0) {
      setError('Добавьте хотя бы один шаг');
      return;
    }
    setError('');
    setSaving(true);

    try {
      const method = initial ? 'PUT' : 'POST';
      const url = initial ? `/api/scenarios/${initial.id}` : '/api/scenarios';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, steps }),
      });

      if (!res.ok) throw new Error('Ошибка сохранения');
      router.push('/');
      router.refresh();
    } catch {
      setError('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Info card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Название *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Регистрация пользователя"
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Описание</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Проверяет полный флоу регистрации нового пользователя"
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Шаги
            {steps.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                {steps.length}
              </span>
            )}
          </h2>
        </div>

        {/* Pipeline connector */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={step.id} className="relative animate-fade-in">
              {/* Vertical connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[1.65rem] -bottom-3 h-3 w-0.5 bg-violet-200 z-10" />
              )}
              <StepEditor
                step={step}
                index={i}
                total={steps.length}
                onChange={(s) => updateStep(i, s)}
                onDelete={() => deleteStep(i)}
                onMoveUp={() => moveStep(i, 'up')}
                onMoveDown={() => moveStep(i, 'down')}
              />
            </div>
          ))}
        </div>

        <button
          onClick={addStep}
          className="mt-3 w-full border-2 border-dashed border-slate-200 hover:border-violet-400 text-slate-400 hover:text-violet-600 rounded-2xl py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Добавить шаг
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin-smooth" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Сохранение...
            </>
          ) : (
            initial ? 'Сохранить изменения' : 'Создать сценарий'
          )}
        </button>
        <button
          onClick={() => router.push('/')}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
