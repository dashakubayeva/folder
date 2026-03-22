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
  goto: 'Go to URL',
  click: 'Click',
  fill: 'Fill field',
  assert_text: 'Assert text',
  assert_url: 'Assert URL',
  wait: 'Wait',
  screenshot: 'Screenshot',
};

export const STEP_PARAMS: Record<StepType, { key: string; label: string; placeholder: string }[]> = {
  goto: [{ key: 'url', label: 'URL', placeholder: 'https://example.com' }],
  click: [{ key: 'selector', label: 'Selector', placeholder: 'button.submit, #login-btn' }],
  fill: [
    { key: 'selector', label: 'Selector', placeholder: 'input[name="email"]' },
    { key: 'value', label: 'Value', placeholder: 'user@example.com' },
  ],
  assert_text: [
    { key: 'selector', label: 'Selector', placeholder: 'h1, .title' },
    { key: 'text', label: 'Expected text', placeholder: 'Welcome' },
  ],
  assert_url: [{ key: 'url', label: 'URL (substring)', placeholder: '/dashboard' }],
  wait: [
    { key: 'selector', label: 'Selector (or leave empty for ms)', placeholder: '.loaded' },
    { key: 'ms', label: 'Milliseconds', placeholder: '1000' },
  ],
  screenshot: [],
};
