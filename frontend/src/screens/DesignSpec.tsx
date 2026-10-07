import { Database } from 'lucide-react';
import { Badge } from '../components/ui/badge';

const ENDPOINTS: { method: string; path: string; desc: string }[] = [
  { method: 'POST', path: '/api/pipeline/runs', desc: 'Start a pipeline run (recorded in pipeline_runs)' },
  { method: 'GET', path: '/api/pipeline/runs/:id/stream', desc: 'Live progress stream for a run' },
  { method: 'GET', path: '/api/configs', desc: 'Saved strategy dial presets' },
  { method: 'POST', path: '/api/configs', desc: 'Save a new strategy preset version' },
  { method: 'POST', path: '/api/portfolio/snapshots', desc: 'Record a portfolio snapshot' },
];

export function DesignSpec() {
  return (
    <div id="spec_view" className="bg-canvas rounded-xl border border-border p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-border pb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-h1 text-text">Design Specification Doc</h2>
          <p className="text-body-sm text-text-muted mt-1">Simplest browser cockpit over the Python pipeline and the Neon database.</p>
        </div>
        <div className="flex items-center gap-2 text-body-sm text-text-muted bg-surface px-3 py-1 rounded-md border border-border shrink-0">
          <Database className="h-4 w-4 text-accent" />
          <span>REST API Configured</span>
        </div>
      </div>

      <article className="space-y-4">
        <h3 className="text-h2 text-text flex items-center gap-2">
          <Badge kind="sim">v0</Badge>
          Scope Constraints Adhered To:
        </h3>
        <p className="text-body-sm text-text-muted">
          We stay strictly at v0 (simplest browser cockpit), grounded directly in the python config and pipeline output models. Any secondary features (closing positions from UI, interactive streaming charts) are deferred.
        </p>

        <div className="bg-surface rounded-md p-card border border-border space-y-2">
          <h4 className="text-h3 text-text">Backend REST Contract Endpoints</h4>
          <div className="space-y-2 font-mono text-body-sm">
            {ENDPOINTS.map((ep) => (
              <div key={`${ep.method} ${ep.path}`} className="flex items-center justify-between gap-4 border-b border-border pb-1 last:border-b-0">
                <span className={ep.method === 'GET' ? 'text-positive' : 'text-accent'}>
                  {ep.method} {ep.path}
                </span>
                <span className="text-text-faint text-right font-sans">{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-h3 text-text mb-2">Deferred backlogs (Phase 8+)</h4>
          <ul className="list-disc pl-5 space-y-1 text-body-sm text-text-muted">
            <li>Closing existing positions manually from client interface</li>
            <li>In-app live interactive stock price plots</li>
            <li>Live scheduler pause/resume cron service controller</li>
            <li>Multi-user credentials and custom JWT Auth integration</li>
          </ul>
        </div>
      </article>
    </div>
  );
}
