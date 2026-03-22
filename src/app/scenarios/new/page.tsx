import Link from 'next/link';
import ScenarioBuilder from '@/components/ScenarioBuilder';

export default function NewScenarioPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 transition-colors mb-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          All scenarios
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New scenario</h1>
        <p className="text-sm text-slate-500 mt-0.5">Add steps and run a test</p>
      </div>
      <ScenarioBuilder />
    </div>
  );
}
