'use client';

import { Step, StepType, STEP_LABELS, STEP_PARAMS } from '@/types';

interface Props {
  step: Step;
  index: number;
  total: number;
  onChange: (step: Step) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const STEP_TYPES: StepType[] = ['goto', 'click', 'fill', 'assert_text', 'assert_url', 'wait', 'screenshot'];

export default function StepEditor({ step, index, total, onChange, onDelete, onMoveUp, onMoveDown }: Props) {
  function handleTypeChange(type: StepType) {
    onChange({ ...step, type, params: {} });
  }

  function handleParamChange(key: string, value: string) {
    onChange({ ...step, params: { ...step.params, [key]: value } });
  }

  const paramDefs = STEP_PARAMS[step.type];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <select
          value={step.type}
          onChange={(e) => handleTypeChange(e.target.value as StepType)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STEP_TYPES.map((t) => (
            <option key={t} value={t}>
              {STEP_LABELS[t]}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Вверх"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Вниз"
          >
            ↓
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-red-400 hover:text-red-600"
            title="Удалить шаг"
          >
            ✕
          </button>
        </div>
      </div>

      {paramDefs.length === 0 && (
        <p className="text-sm text-gray-400 ml-9">Нет параметров — скриншот будет сделан автоматически</p>
      )}

      <div className="ml-9 space-y-2">
        {paramDefs.map((def) => (
          <div key={def.key}>
            <label className="block text-xs text-gray-500 mb-1">{def.label}</label>
            <input
              type="text"
              value={step.params[def.key] ?? ''}
              onChange={(e) => handleParamChange(def.key, e.target.value)}
              placeholder={def.placeholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
