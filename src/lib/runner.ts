import { chromium } from 'playwright';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Scenario, RunResult, StepResult } from '@/types';

export async function runScenario(scenario: Scenario): Promise<RunResult> {
  const runId = uuidv4();
  const startedAt = new Date().toISOString();
  const runStart = Date.now();

  const stepResults: StepResult[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  let failed = false;

  for (const step of scenario.steps) {
    if (failed) {
      stepResults.push({
        stepId: step.id,
        type: step.type,
        status: 'skip',
        durationMs: 0,
      });
      continue;
    }

    const stepStart = Date.now();
    let status: 'pass' | 'fail' = 'pass';
    let error: string | undefined;
    let screenshotPath: string | undefined;

    try {
      switch (step.type) {
        case 'goto':
          await page.goto(step.params.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          break;

        case 'click':
          await page.click(step.params.selector, { timeout: 10000 });
          break;

        case 'fill':
          await page.fill(step.params.selector, step.params.value, { timeout: 10000 });
          break;

        case 'assert_text': {
          const element = page.locator(step.params.selector).first();
          await element.waitFor({ timeout: 10000 });
          const text = await element.textContent();
          if (!text?.includes(step.params.text)) {
            throw new Error(`Expected "${step.params.text}", got "${text}"`);
          }
          break;
        }

        case 'assert_url': {
          const currentUrl = page.url();
          if (!currentUrl.includes(step.params.url)) {
            throw new Error(`Expected URL to contain "${step.params.url}", got "${currentUrl}"`);
          }
          break;
        }

        case 'wait':
          if (step.params.selector && step.params.selector.trim()) {
            await page.waitForSelector(step.params.selector, { timeout: 30000 });
          } else if (step.params.ms) {
            await page.waitForTimeout(parseInt(step.params.ms, 10));
          }
          break;

        case 'screenshot': {
          const filename = `${runId}-${step.id}.png`;
          const screenshotDir = path.join(process.cwd(), 'public', 'screenshots');
          const filePath = path.join(screenshotDir, filename);
          await page.screenshot({ path: filePath, fullPage: false });
          screenshotPath = `/screenshots/${filename}`;
          break;
        }
      }

      // Auto-screenshot on fail for non-screenshot steps
    } catch (err) {
      status = 'fail';
      failed = true;
      error = err instanceof Error ? err.message : String(err);

      // Capture failure screenshot
      try {
        const filename = `${runId}-${step.id}-fail.png`;
        const screenshotDir = path.join(process.cwd(), 'public', 'screenshots');
        const filePath = path.join(screenshotDir, filename);
        await page.screenshot({ path: filePath, fullPage: false });
        screenshotPath = `/screenshots/${filename}`;
      } catch {
        // ignore screenshot errors
      }
    }

    stepResults.push({
      stepId: step.id,
      type: step.type,
      status,
      error,
      screenshotPath,
      durationMs: Date.now() - stepStart,
    });
  }

  await browser.close();

  return {
    id: runId,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    status: failed ? 'fail' : 'pass',
    startedAt,
    durationMs: Date.now() - runStart,
    steps: stepResults,
  };
}
