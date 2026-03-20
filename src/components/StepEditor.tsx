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

function StepIcon({ type }: { type: StepType }) {
  const cls = 'w-4 h-4';
  switch (type) {
    case 'goto':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      );
    case 'click':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
        </svg>
      );
    case 'fill':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
        </svg>
      );
    case 'assert_text':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      );
    case 'assert_url':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      );
    case 'wait':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'screenshot':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function StepEditor({ step, index, total, onChange, onDelete, onMoveUp, onMoveDown }: Props) {
  function handleTypeChange(type: StepType) {
    onChange({ ...step, type, params: {} });
  }

  function handleParamChange(key: string, value: string) {
    onChange({ ...step, params: { ...step.params, [key]: value } });
  }

  const paramDefs = STEP_PARAMS[step.type];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        {/* Step number badge */}
        <span className="w-7 h-7 bg-violet-600 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
          {index + 1}
        </span>

        {/* Type selector with icon */}
        <div className="flex-1 relative flex items-center">
          <div className="absolute left-3 text-slate-400 pointer-events-none">
            <StepIcon type={step.type} />
          </div>
          <select
            value={step.type}
            onChange={(e) => handleTypeChange(e.target.value as StepType)}
            className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent appearance-none bg-white transition"
          >
            {STEP_TYPES.map((t) => (
              <option key={t} value={t}>
                {STEP_LABELS[t]}
              </option>
            ))}
          </select>
          <div className="absolute right-3 text-slate-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 rounded-lg hover:bg-slate-50 transition"
            title="Вверх"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 rounded-lg hover:bg-slate-50 transition"
            title="Вниз"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
            title="Удалить шаг"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {paramDefs.length === 0 ? (
        <p className="text-xs text-slate-400 ml-10 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          Скриншот будет сделан автоматически
        </p>
      ) : (
        <div className="ml-10 space-y-2.5">
          {paramDefs.map((def) => (
            <div key={def.key}>
              <label className="block text-xs font-medium text-slate-500 mb-1">{def.label}</label>
              <input
                type="text"
                value={step.params[def.key] ?? ''}
                onChange={(e) => handleParamChange(def.key, e.target.value)}
                placeholder={def.placeholder}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
