import { Clock } from 'lucide-react';

type SyncStampProps = {
  lastSync: string;
  id?: string;
};

export function SyncStamp({ lastSync, id }: SyncStampProps) {
  return (
    <span
      id={id}
      className="text-[10px] text-text-muted font-mono flex items-center gap-1 bg-canvas px-1.5 py-0.5 rounded border border-border"
      title="Alpaca portfolio last synchronized timestamp"
    >
      <Clock className="h-2.5 w-2.5 text-accent shrink-0" />
      <span className="text-text-faint">Updated:</span>
      <span className="text-text font-semibold">{lastSync}</span>
    </span>
  );
}
