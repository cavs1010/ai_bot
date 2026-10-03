import type { ReactNode } from 'react';

type DialSectionTone = 'accent' | 'danger';

type DialSectionProps = {
  icon: ReactNode;
  title: string;
  tone: DialSectionTone;
  children: ReactNode;
};

export function DialSection({ icon, title, tone, children }: DialSectionProps) {
  const iconColor = tone === 'danger' ? 'text-danger' : 'text-accent';

  return (
    <section className="bg-canvas border border-border rounded-md p-card space-y-stack">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <span className={iconColor}>{icon}</span>
        <h3 className="text-h3 uppercase text-text-muted">{title}</h3>
      </div>
      <div className="space-y-stack">{children}</div>
    </section>
  );
}
