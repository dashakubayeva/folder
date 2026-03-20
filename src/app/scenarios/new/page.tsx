import ScenarioBuilder from '@/components/ScenarioBuilder';

export default function NewScenarioPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Новый сценарий</h1>
      <ScenarioBuilder />
    </div>
  );
}
