type BadgeKind = 'live' | 'blocked' | 'pnl-down' | 'sim' | 'buy' | 'pnl-up' | 'skip';

type BadgeProps = {
  kind: BadgeKind;
  children: string;
};

export function Badge({ kind, children }: BadgeProps) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}
