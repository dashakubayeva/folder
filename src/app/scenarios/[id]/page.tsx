import { notFound } from 'next/navigation';
import { getScenario } from '@/lib/storage';
import ScenarioBuilder from '@/components/ScenarioBuilder';

export default async function EditScenarioPage({ params }: { params: { id: string } }) {
  const scenario = await getScenario(params.id);
  if (!scenario) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Редактировать: {scenario.name}</h1>
      <ScenarioBuilder initial={scenario} />
    </div>
  );
}
