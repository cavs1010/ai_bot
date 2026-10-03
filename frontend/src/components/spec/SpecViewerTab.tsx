import React from 'react';
import { Database } from 'lucide-react';

export const SpecViewerTab: React.FC = () => {
  return (
    <div id="spec_view" className="bg-slate-950 rounded-xl border border-slate-800 shadow-md p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Design Specification Doc</h2>
          <p className="text-xs text-slate-400 mt-1">Written specification generated in <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400">/spec/design-v0-dashboard.md</code></p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">
          <Database className="h-4 w-4 text-teal-400" />
          <span>REST API Configured</span>
        </div>
      </div>

      <article className="prose prose-invert prose-sm text-slate-300 max-w-none space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span className="bg-teal-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded">v0</span>
          Scope Constraints Adhered To:
        </h3>
        <p className="text-xs text-slate-400">
          We stay strictly at v0 (simplest browser cockpit), grounded directly in the python config and notebook output models. Any secondary features (closing positions from UI, interactive streaming charts, live logs socket stream) are deferred.
        </p>

        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 text-xs space-y-2">
          <h4 className="font-bold text-slate-200">🗄️ Backend REST Contract Endpoints (FastAPI façade adapters)</h4>
          <div className="space-y-2 font-mono text-[11px] text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-emerald-400">GET /run/latest</span>
              <span className="text-slate-500">Latest pipeline funnel states & results rows</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-teal-400">POST /run</span>
              <span className="text-slate-500">Dry-run pipeline execution</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-emerald-400">GET /config</span>
              <span className="text-slate-500">Retrieve config strategy dials payload</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-400">PATCH /config</span>
              <span className="text-slate-500">Save modified dials with validation diff safety</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-850 pt-4">
          <h4 className="font-bold text-slate-200 mb-2">📋 Deferred backlogs (Deferred to Phase 8+)</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
            <li>Closing existing positions manually from client interface</li>
            <li>In-app live interactive D3.js or Recharts stock price plots</li>
            <li>Live scheduler pause/resume cron service controller</li>
            <li>Multi-user credentials and custom JWT Auth integration</li>
          </ul>
        </div>

      </article>
    </div>
  );
};
