import React from 'react';
import { 
  XCircle, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  Copy, 
  ChevronUp, 
  ChevronDown 
} from 'lucide-react';

interface ErrorBannersProps {
  portfolioError: string | null;
  pipelineRunError: string | null;
  pipelineErrorExpanded: boolean;
  setPipelineErrorExpanded: (expanded: boolean) => void;
  copiedError: boolean;
  setCopiedError: (copied: boolean) => void;
  fetchLivePortfolio: () => void;
  isFetchingPortfolio: boolean;
  setPipelineRunError: (err: string | null) => void;
}

export function ErrorBanners({
  portfolioError,
  pipelineRunError,
  pipelineErrorExpanded,
  setPipelineErrorExpanded,
  copiedError,
  setCopiedError,
  fetchLivePortfolio,
  isFetchingPortfolio,
  setPipelineRunError,
}: ErrorBannersProps) {
  return (
    <>
      {/* Portfolio Connection Error Banner */}
      {portfolioError && (
        <div className="bg-rose-950/95 border-t border-b border-rose-800 text-rose-200 px-3 py-2.5 sm:px-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg w-full">
          <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
            <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 min-w-0 flex-1">
              <span className="font-bold text-rose-300 uppercase tracking-wide shrink-0 text-[11px] sm:text-xs">Alpaca API Error:</span>
              <span className="font-mono text-rose-100 text-[11px] break-words leading-snug">{portfolioError}</span>
            </div>
          </div>
          <button 
            onClick={fetchLivePortfolio}
            className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-rose-100 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-rose-700 transition-all cursor-pointer shrink-0 w-full sm:w-auto mt-1 sm:mt-0"
          >
            <RefreshCw className={`h-3 w-3 ${isFetchingPortfolio ? 'animate-spin' : ''}`} />
            Retry Connection
          </button>
        </div>
      )}

      {/* Pipeline Run Execution Error Banner */}
      {pipelineRunError && (
        <div id="pipeline_error_banner" className="bg-rose-950/95 border-t border-b border-rose-800 text-rose-200 px-3 py-2.5 sm:px-4 text-xs shadow-lg w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 animate-pulse mt-0.5 sm:mt-0" />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-rose-300 uppercase tracking-wide text-[11px] sm:text-xs">
                  Pipeline Execution Error
                </span>
                {!pipelineErrorExpanded && (
                  <span className="ml-2 font-mono text-rose-100 text-[11px] break-words">
                    {pipelineRunError.split('\n')[0]} {pipelineRunError.includes('\n') ? '...' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn_copy_traceback"
                onClick={() => {
                  navigator.clipboard.writeText(pipelineRunError);
                  setCopiedError(true);
                  setTimeout(() => setCopiedError(false), 2000);
                }}
                className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-rose-200 hover:text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 border border-rose-800/80 transition-all cursor-pointer"
                title="Copy full error traceback to clipboard"
              >
                {copiedError ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedError ? 'Copied' : 'Copy Traceback'}
              </button>

              <button
                id="btn_toggle_error_expand"
                onClick={() => setPipelineErrorExpanded(!pipelineErrorExpanded)}
                className="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-100 rounded text-[11px] font-semibold flex items-center justify-center gap-1 border border-rose-700 transition-all cursor-pointer"
              >
                {pipelineErrorExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {pipelineErrorExpanded ? 'Hide Traceback' : 'View Full Details'}
              </button>

              <button 
                id="btn_dismiss_pipeline_error"
                onClick={() => setPipelineRunError(null)}
                className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-rose-100 rounded text-[11px] font-semibold flex items-center justify-center gap-1 border border-rose-700 transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Expandable full traceback display */}
          {pipelineErrorExpanded && (
            <div className="mt-2.5 pt-2.5 border-t border-rose-900/60">
              <div className="text-[10px] text-rose-400 font-semibold mb-1 uppercase tracking-wider">Complete Error Traceback:</div>
              <pre className="p-3 bg-black/80 rounded-lg border border-rose-900/80 font-mono text-[11px] text-rose-100 overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto select-text scrollbar-thin leading-relaxed">
                {pipelineRunError}
              </pre>
            </div>
          )}
        </div>
      )}
    </>
  );
}
