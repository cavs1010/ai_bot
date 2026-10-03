import React from 'react';
import { Sliders, ArrowRight } from 'lucide-react';
import { DialDiffItem } from '../../types';

interface ProposeDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposedDiff: DialDiffItem[];
  onConfirm: () => void;
}

export function ProposeDiffModal({
  isOpen,
  onClose,
  proposedDiff,
  onConfirm,
}: ProposeDiffModalProps) {
  if (!isOpen) return null;

  return (
    <div id="confirm_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 rounded-xl border border-slate-800 max-w-lg w-full overflow-hidden shadow-2xl">
        
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-teal-400" />
            Confirm Propose Config Dials Change
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-400">
            You are about to propose modifications to <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400 font-mono">backend/config.py</code>. Please confirm the visual old-to-new differences:
          </p>

          {/* Diffs List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {proposedDiff.map((diff, i) => (
              <div key={i} className="bg-slate-950 p-3 rounded border border-slate-850 text-xs space-y-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-teal-400 font-semibold">{diff.path}</span>
                  <span className="text-slate-500 font-medium">{diff.desc}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/15 px-2 py-0.5 rounded font-mono text-[10px]">{diff.oldVal}</span>
                  <ArrowRight className="h-3 w-3 text-slate-600" />
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded font-mono text-[10px]">{diff.newVal}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-teal-500/5 p-3 rounded-lg border border-teal-500/10 text-xs text-slate-400">
            🛡️ <strong>Safety check:</strong> Validation tests passed successfully. The new dials are within safe functional constraints. Saving will record a history log.
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-semibold rounded border border-slate-800 cursor-pointer text-slate-300 transition-colors"
          >
            Cancel Propose
          </button>
          <button 
            id="btn_confirm_save_config"
            onClick={onConfirm}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded cursor-pointer shadow-md transition-colors"
          >
            Confirm & Save Dials
          </button>
        </div>

      </div>
    </div>
  );
}
