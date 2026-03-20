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
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Регистрация пользователя"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Проверяет полный флоу регистрации нового пользователя"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Шаги ({steps.length})
        </h2>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <StepEditor
              key={step.id}
              step={step}
              index={i}
              total={steps.length}
              onChange={(s) => updateStep(i, s)}
              onDelete={() => deleteStep(i)}
              onMoveUp={() => moveStep(i, 'up')}
              onMoveDown={() => moveStep(i, 'down')}
            />
          ))}
        </div>
        <button
          onClick={addStep}
          className="mt-3 w-full border-2 border-dashed border-gray-300 text-gray-500 rounded-xl py-3 text-sm hover:border-indigo-400 hover:text-indigo-600 transition"
        >
          + Добавить шаг
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {saving ? 'Сохранение...' : initial ? 'Сохранить изменения' : 'Создать сценарий'}
        </button>
        <button
          onClick={() => router.push('/')}
          className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
