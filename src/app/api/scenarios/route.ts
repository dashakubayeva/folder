import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getScenarios, createScenario } from '@/lib/storage';
import { Scenario } from '@/types';

export async function GET() {
  const scenarios = await getScenarios();
  return NextResponse.json(scenarios);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();

  const scenario: Scenario = {
    id: uuidv4(),
    name: body.name,
    description: body.description ?? '',
    steps: body.steps ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await createScenario(scenario);
  return NextResponse.json(scenario, { status: 201 });
}
