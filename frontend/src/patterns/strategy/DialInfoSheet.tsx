import { Calculator, HelpCircle, Info, Lightbulb, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import type { VariableInfo } from '../../utils/variableDescriptions';

type DialInfoSheetProps = {
  info: VariableInfo;
  onClose: () => void;
};

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-body-sm font-semibold text-text mb-1">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      <div className="text-body-sm text-text-muted bg-canvas p-3 rounded-md border border-border">{children}</div>
    </div>
  );
}

export function DialInfoSheet({ info, onClose }: DialInfoSheetProps) {
  return (
    <Modal
      id="variable_info_sheet"
      icon={<Info className="h-5 w-5" />}
      eyebrow={info.category}
      title={info.label}
      placement="sheet"
      width="md"
      onClose={onClose}
      footer={<Button role="primary" label="Got it" icon={null} onClick={onClose} disabled={false} busy={false} block={false} />}
    >
      <Block icon={<HelpCircle className="h-3.5 w-3.5" />} title="What is this?">
        {info.summary}
      </Block>
      {info.formula ? (
        <Block icon={<Calculator className="h-3.5 w-3.5" />} title="Formula / Calculation">
          <span className="font-mono text-text">{info.formula}</span>
        </Block>
      ) : null}
      <Block icon={<ShieldAlert className="h-3.5 w-3.5" />} title="Why it matters">
        {info.whyItMatters}
      </Block>
      <Block icon={<Lightbulb className="h-3.5 w-3.5" />} title="Recommended value & rule of thumb">
        <span className="text-positive font-medium">{info.ruleOfThumb}</span>
      </Block>
      {info.examples ? (
        <p className="text-body-sm text-text-faint">
          <span className="font-semibold text-text-muted">Example: </span>
          {info.examples}
        </p>
      ) : null}
    </Modal>
  );
}
