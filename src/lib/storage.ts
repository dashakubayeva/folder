import fs from 'fs/promises';
import path from 'path';
import { Scenario, RunResult } from '@/types';

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const SCENARIOS_FILE = path.join(DATA_DIR, 'scenarios.json');
const RESULTS_DIR = path.join(DATA_DIR, 'results');
export const SCREENSHOTS_DIR = path.join(DATA_DIR, 'screenshots');

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
}

async function readScenarios(): Promise<Scenario[]> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(SCENARIOS_FILE, 'utf-8');
    return JSON.parse(raw) as Scenario[];
  } catch {
    return [];
  }
}

async function writeScenarios(scenarios: Scenario[]): Promise<void> {
  await ensureDirs();
  await fs.writeFile(SCENARIOS_FILE, JSON.stringify(scenarios, null, 2), 'utf-8');
}

export async function getScenarios(): Promise<Scenario[]> {
  return readScenarios();
}

export async function getScenario(id: string): Promise<Scenario | null> {
  const scenarios = await readScenarios();
  return scenarios.find((s) => s.id === id) ?? null;
}

export async function createScenario(scenario: Scenario): Promise<void> {
  const scenarios = await readScenarios();
  scenarios.push(scenario);
  await writeScenarios(scenarios);
}

export async function updateScenario(id: string, updated: Scenario): Promise<boolean> {
  const scenarios = await readScenarios();
  const idx = scenarios.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  scenarios[idx] = updated;
  await writeScenarios(scenarios);
  return true;
}

export async function deleteScenario(id: string): Promise<boolean> {
  const scenarios = await readScenarios();
  const filtered = scenarios.filter((s) => s.id !== id);
  if (filtered.length === scenarios.length) return false;
  await writeScenarios(filtered);
  return true;
}

export async function saveResult(result: RunResult): Promise<void> {
  await ensureDirs();
  const file = path.join(RESULTS_DIR, `${result.id}.json`);
  await fs.writeFile(file, JSON.stringify(result, null, 2), 'utf-8');
}

export async function getResult(id: string): Promise<RunResult | null> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(path.join(RESULTS_DIR, `${id}.json`), 'utf-8');
    return JSON.parse(raw) as RunResult;
  } catch {
    return null;
  }
}

export async function getResultsForScenario(scenarioId: string): Promise<RunResult[]> {
  await ensureDirs();
  const files = await fs.readdir(RESULTS_DIR);
  const results: RunResult[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(RESULTS_DIR, file), 'utf-8');
      const result = JSON.parse(raw) as RunResult;
      if (result.scenarioId === scenarioId) results.push(result);
    } catch {
      // skip corrupt files
    }
  }
  return results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}
