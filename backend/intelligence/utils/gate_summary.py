"""Shared formatting of gate results for audit output."""

from collections.abc import Mapping


def build_gate_summary(gate_results: Mapping[str, Mapping[str, object]]) -> str:
    """
    Formats Gate 1–4 outputs into a readable audit block for logging.

    Args:
        gate_results: Dict with optional keys 'gate1' … 'gate4' (each a result dict).

    Returns:
        Multi-line summary string; empty sections are skipped.
    """
    lines: list[str] = []

    gate1 = gate_results.get('gate1')
    if gate1 is not None:
        status = 'PASS' if gate1.get('passed') else f"BLOCK ({gate1.get('block_reason', '?')})"
        lines.append(f'Gate 1 (hard threats): {status}')

    gate2 = gate_results.get('gate2')
    if gate2 is not None:
        if gate2.get('passed'):
            lines.append('Gate 2 (news threat): PASS — no catastrophic threat')
        else:
            lines.append(
                f"Gate 2 (news threat): BLOCK — {gate2.get('threat_type', '?')}: "
                + f"{gate2.get('reason', '')}"
            )

    gate3 = gate_results.get('gate3')
    if gate3 is not None:
        caution = ' (caution)' if gate3.get('caution') else ''
        lines.append(
            f"Gate 3 (sentiment): {gate3.get('direction', '?')} "
            + f"conf={gate3.get('confidence', '?')}{caution} — {gate3.get('key_reason', '')}"
        )

    gate4 = gate_results.get('gate4')
    if gate4 is not None:
        lines.append(
            f"Gate 4 (contradiction): {gate4.get('action', '?')} — "
            + f"{gate4.get('contradiction_type', 'none')} / {gate4.get('risk_level', 'NONE')}: "
            + f"{gate4.get('reason', '')}"
        )

    return '\n'.join(lines) if lines else '(no prior gate results)'



if __name__ == '__main__':
    summary = build_gate_summary({
        'gate1': {'passed': True},
        'gate3': {'direction': 'BULLISH', 'confidence': 9, 'caution': False, 'key_reason': 'ok'},
    })
    assert 'Gate 1' in summary and 'Gate 3' in summary
    print(f'[gate_summary] summary sample:\n{summary}')
    print('[gate_summary] checks passed ✅')
