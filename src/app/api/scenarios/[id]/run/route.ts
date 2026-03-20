import { NextResponse } from 'next/server';
import { getScenario, saveResult } from '@/lib/storage';
import { runScenario } from '@/lib/runner';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const scenario = await getScenario(params.id);
  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const result = await runScenario(scenario);
  await saveResult(result);

  return NextResponse.json(result);
}
