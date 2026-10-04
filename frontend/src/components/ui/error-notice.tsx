import { RefreshCw, XCircle } from 'lucide-react';

type ErrorNoticeProps =
  | {
      layout: 'bar';
      title: string;
      message: string;
      actionLabel: string;
      onAction: () => void;
      spinning: boolean;
    }
  | {
      layout: 'inset';
      title: string;
      message: string;
    };

export function ErrorNotice(props: ErrorNoticeProps) {
  if (props.layout === 'inset') {
    return (
      <div className="p-2 bg-danger/10 border border-danger/40 rounded text-[11px] text-danger flex items-start gap-1.5 min-w-0">
        <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 break-words">
          <span className="font-bold">{props.title} </span>
          <span className="font-mono text-[10px] leading-tight">{props.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-danger/10 border-t border-b border-danger/40 text-danger px-3 py-2.5 sm:px-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
      <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
        <XCircle className="h-4 w-4 text-danger shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 min-w-0 flex-1">
          <span className="font-bold uppercase tracking-wide shrink-0 text-[11px] sm:text-xs">{props.title}</span>
          <span className="font-mono text-[11px] break-words leading-snug">{props.message}</span>
        </div>
      </div>
      <button type="button" onClick={props.onAction} className="btn btn-danger inline-flex items-center justify-center gap-1.5 w-full sm:w-auto">
        <RefreshCw className={`h-3 w-3 ${props.spinning ? 'animate-spin' : ''}`} />
        {props.actionLabel}
      </button>
    </div>
  );
}
