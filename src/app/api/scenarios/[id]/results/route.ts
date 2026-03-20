import { NextResponse } from 'next/server';
import { getResultsForScenario } from '@/lib/storage';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const results = await getResultsForScenario(params.id);
  return NextResponse.json(results);
}
