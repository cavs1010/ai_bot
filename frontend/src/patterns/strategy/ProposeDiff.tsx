import { ArrowRight, Database, Sliders } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import type { DialDiff } from '../../types/dials';

type ProposeDiffProps = {
  diffs: DialDiff[];
  strategyName: string;
  onStrategyNameChange: (next: string) => void;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ProposeDiff({ diffs, strategyName, onStrategyNameChange, saving, onCancel, onConfirm }: ProposeDiffProps) {
  return (
    <Modal
      id="confirm_modal"
      icon={<Sliders className="h-4 w-4" />}
      title="Confirm Strategy Dials Change"
      placement="center"
      width="md"
      onClose={onCancel}
      footer={
        <>
          <Button role="secondary" label="Cancel" icon={null} onClick={onCancel} disabled={saving} busy={false} block={false} />
          <Button
            id="btn_confirm_save_config"
            role="primary"
            label="Confirm & Save Config"
            icon={<Database className="h-3.5 w-3.5" />}
            onClick={onConfirm}
            disabled={strategyName.trim().length === 0}
            busy={saving}
            block={false}
          />
        </>
      }
    >
      <TextField
        id="input_strategy_name"
        label="Strategy name"
        value={strategyName}
        onChange={onStrategyNameChange}
        placeholder="Strategy profile name"
      />

      {diffs.length === 0 ? (
        <p className="text-body-sm text-text-muted">
          No dial changes. Saving stores the current dials as a new version of this strategy.
        </p>
      ) : (
        <>
          <p className="text-body-sm text-text-muted">Review the old-to-new differences:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {diffs.map((diff) => (
              <div key={diff.path} className="bg-canvas p-3 rounded-md border border-border space-y-1.5">
                <div className="flex justify-between gap-2 font-mono text-body-sm">
                  <span className="text-accent font-semibold">{diff.path}</span>
                  <span className="text-text-faint text-right">{diff.desc}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge kind="blocked">{String(diff.oldVal)}</Badge>
                  <ArrowRight className="h-3 w-3 text-text-faint" />
                  <Badge kind="buy">{String(diff.newVal)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-body-sm text-text-muted bg-canvas p-3 rounded-md border border-border">
        Saving writes a new version of this strategy to the Neon <code className="font-mono text-warning">pipeline_configs</code> table and marks it as the active preset for the next pipeline run.
      </p>
    </Modal>
  );
}
