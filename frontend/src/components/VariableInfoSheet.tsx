import React, { useEffect } from 'react';
import { Info, X, HelpCircle, Lightbulb, Calculator, ShieldAlert } from 'lucide-react';
import { VariableInfo } from '../utils/variableDescriptions';

interface VariableInfoSheetProps {
  info: VariableInfo | null;
  onClose: () => void;
}

export function VariableInfoSheet({ info, onClose }: VariableInfoSheetProps) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!info) return null;

  return (
    <div 
      id="variable_info_backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 transition-all duration-200"
      onClick={onClose}
    >
      <div 
        id="variable_info_sheet"
        className="w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Bar Indicator */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider block">
                {info.category}
              </span>
              <h3 className="text-base font-bold text-slate-100 font-mono leading-tight">
                {info.label}
              </h3>
            </div>
          </div>

          <button 
            id="btn_close_info_sheet"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-300 leading-relaxed scrollbar-thin">
          
          {/* Summary */}
          <div>
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
              <HelpCircle className="h-3.5 w-3.5 text-teal-400" />
              <span>What is this?</span>
            </div>
            <p className="text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              {info.summary}
            </p>
          </div>

          {/* Mathematical Formula (if present) */}
          {info.formula && (
            <div>
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
                <Calculator className="h-3.5 w-3.5 text-indigo-400" />
                <span>Formula / Calculation</span>
              </div>
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg font-mono text-[11px] text-indigo-200">
                {info.formula}
              </div>
            </div>
          )}

          {/* Why It Matters */}
          <div>
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              <span>Why it matters in Quantitative Trading</span>
            </div>
            <p className="text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              {info.whyItMatters}
            </p>
          </div>

          {/* Rule of Thumb & Benchmark */}
          <div>
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
              <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
              <span>Recommended Value & Rule of Thumb</span>
            </div>
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-emerald-300 font-medium">
              {info.ruleOfThumb}
            </div>
          </div>

          {/* Practical Examples (if present) */}
          {info.examples && (
            <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
              <span className="font-semibold text-slate-300">Example: </span>
              {info.examples}
            </div>
          )}

        </div>

        {/* Footer Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            id="btn_got_it_info_sheet"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer text-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
