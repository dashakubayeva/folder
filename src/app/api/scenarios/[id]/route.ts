import { NextResponse } from 'next/server';
import { getScenario, updateScenario, deleteScenario } from '@/lib/storage';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scenario = await getScenario(params.id);
  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(scenario);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const existing = await getScenario(params.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const updated = {
    ...existing,
    ...body,
    id: params.id,
    updatedAt: new Date().toISOString(),
  };

  await updateScenario(params.id, updated);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const deleted = await deleteScenario(params.id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
