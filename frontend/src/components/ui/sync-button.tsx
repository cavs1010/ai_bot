import { RefreshCw } from 'lucide-react';

type SyncShared = {
  id: string;
  onSync: () => void;
  spinning: boolean;
};

type SyncButtonProps =
  | (SyncShared & { appearance: 'chip-narrow'; label: string; title: string })
  | (SyncShared & { appearance: 'chip-wide'; label: string })
  | (SyncShared & { appearance: 'icon'; title: string });

export function SyncButton(props: SyncButtonProps) {
  const iconClass = `h-3 w-3 ${props.spinning ? 'animate-spin' : ''}`;

  if (props.appearance === 'icon') {
    return (
      <button
        id={props.id}
        type="button"
        onClick={props.onSync}
        title={props.title}
        className="p-1 hover:bg-surface rounded text-text-muted hover:text-accent transition-colors cursor-pointer ml-0.5"
      >
        <RefreshCw className={`h-3 w-3 ${props.spinning ? 'animate-spin text-accent' : ''}`} />
      </button>
    );
  }

  const narrow = props.appearance === 'chip-narrow';
  return (
    <button
      id={props.id}
      type="button"
      onClick={props.onSync}
      title={narrow ? props.title : undefined}
      className={`${narrow ? 'flex sm:hidden text-[10px]' : 'hidden sm:flex text-[11px]'} items-center gap-1 text-accent bg-surface px-2 py-0.5 rounded border border-border cursor-pointer shrink-0`}
    >
      <RefreshCw className={narrow ? `h-2.5 w-2.5 ${props.spinning ? 'animate-spin' : ''}` : iconClass} />
      {props.label}
    </button>
  );
}
