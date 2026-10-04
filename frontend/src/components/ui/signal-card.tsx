import type { ReactNode } from 'react';

type SignalCardProps = {
  corner: ReactNode;
  children: ReactNode;
};

export function SignalCard({ corner, children }: SignalCardProps) {
  return (
    <div className="relative bg-surface border border-border rounded-md p-4">
      <div className="absolute top-3 right-3">{corner}</div>
      <div className="pr-28">{children}</div>
    </div>
  );
}
