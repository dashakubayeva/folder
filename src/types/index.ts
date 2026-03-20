export type StepType =
  | 'goto'
  | 'click'
  | 'fill'
  | 'assert_text'
  | 'assert_url'
  | 'wait'
  | 'screenshot';

export interface Step {
  id: string;
  type: StepType;
  params: Record<string, string>;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  steps: Step[];
  createdAt: string;
  updatedAt: string;
}

export interface StepResult {
  stepId: string;
  type: StepType;
  status: 'pass' | 'fail' | 'skip';
  error?: string;
  screenshotPath?: string;
  durationMs: number;
}

export interface RunResult {
  id: string;
  scenarioId: string;
  scenarioName: string;
  status: 'pass' | 'fail';
  startedAt: string;
  durationMs: number;
  steps: StepResult[];
}

export const STEP_LABELS: Record<StepType, string> = {
  goto: 'Перейти по URL',
  click: 'Клик',
  fill: 'Заполнить поле',
  assert_text: 'Проверить текст',
  assert_url: 'Проверить URL',
  wait: 'Ожидание',
  screenshot: 'Скриншот',
};

export const STEP_PARAMS: Record<StepType, { key: string; label: string; placeholder: string }[]> = {
  goto: [{ key: 'url', label: 'URL', placeholder: 'https://example.com' }],
  click: [{ key: 'selector', label: 'Селектор', placeholder: 'button.submit, #login-btn' }],
  fill: [
    { key: 'selector', label: 'Селектор', placeholder: 'input[name="email"]' },
    { key: 'value', label: 'Значение', placeholder: 'user@example.com' },
  ],
  assert_text: [
    { key: 'selector', label: 'Селектор', placeholder: 'h1, .title' },
    { key: 'text', label: 'Ожидаемый текст', placeholder: 'Добро пожаловать' },
  ],
  assert_url: [{ key: 'url', label: 'URL (подстрока)', placeholder: '/dashboard' }],
  wait: [
    { key: 'selector', label: 'Селектор (или оставьте пустым для ms)', placeholder: '.loaded' },
    { key: 'ms', label: 'Миллисекунды', placeholder: '1000' },
  ],
  screenshot: [],
};
