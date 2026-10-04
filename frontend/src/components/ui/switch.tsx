type SwitchTone = 'danger' | 'warning';

type SwitchProps = {
  on: boolean;
  onLabel: string;
  offLabel: string;
  detail: string;
  tone: SwitchTone;
  onToggle: (next: boolean) => void;
  containerId?: string;
  switchId?: string;
};

const toneClass: Record<SwitchTone, { box: string; label: string; track: string }> = {
  danger: {
    box: 'border-danger/40 bg-danger/10',
    label: 'text-danger',
    track: 'toggle-danger',
  },
  warning: {
    box: 'border-warning/40 bg-warning/10',
    label: 'text-warning',
    track: 'toggle-warning',
  },
};

export function Switch({
  on,
  onLabel,
  offLabel,
  detail,
  tone,
  onToggle,
  containerId,
  switchId,
}: SwitchProps) {
  const toneStyle = toneClass[tone];

  return (
    <div
      id={containerId}
      className={`flex items-center gap-3 rounded-md border px-3 py-1.5 ${
        on ? toneStyle.box : 'border-border bg-surface'
      }`}
    >
      <div className="flex flex-col">
        <span className={`text-eyebrow uppercase ${on ? toneStyle.label : 'text-text-muted'}`}>
          {on ? onLabel : offLabel}
        </span>
        <span className="font-mono text-text-faint">{detail}</span>
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={on}
        aria-pressed={on}
        onClick={() => onToggle(!on)}
        className={`toggle ${toneStyle.track} relative inline-flex h-6 w-11 shrink-0 cursor-pointer border-2 border-transparent ${
          on ? 'justify-end' : 'justify-start'
        }`}
      >
        <span className="pointer-events-none mt-0.5 inline-block h-4 w-4 rounded-full bg-text" />
      </button>
    </div>
  );
}
