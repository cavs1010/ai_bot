# helpers/logic/trade_levels.py — trade levels, win-probability estimate, gate summary
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 5 decide_gate5_signal()
#
# Functions:
#   build_trade_levels(candidate)              → {entry, atr, stop, target, stop_pct, target_pct, reward_risk}
#   estimate_win_probability(candidate, gate_results) → float in [WIN_PROB_FLOOR, WIN_PROB_CEILING]
#   calculate_expected_value(win_prob, reward_risk) → float
#   build_gate_summary(gate_results)           → str
#
# Test: python backend/02_intelligence/helpers/logic/trade_levels.py

ATR_STOP_MULTIPLIER = 1.5
TARGET_RR_MULTIPLE = 2.0  # target distance = 2 × stop distance → fixed ~2:1 reward:risk

# Transparent win-probability mapping — tune from paper-trading data during weekly review.
WIN_PROB_BASE = 0.35
MOMENTUM_SCORE_MIN = 2          # candidates reaching Gate 5 already scored >= 2
MOMENTUM_SCORE_MAX = 3
MOMENTUM_COMPONENT = 0.10       # score 2 → +0.05, score 3 → +0.15
CONFIDENCE_BASELINE = 6         # Gate 3 minimum for a passing read
CONFIDENCE_COMPONENT = 0.25     # conf 6 → +0, conf 10 → +0.25
CAUTION_PENALTY = 0.08
NEUTRAL_DIRECTION_PENALTY = 0.05
WIN_PROB_FLOOR = 0.30
WIN_PROB_CEILING = 0.70


def build_trade_levels(candidate: dict) -> dict:
    """
    Computes entry, stop, target, and reward:risk from price and ATR.

    Formulas (mission non-negotiables):
        stop   = entry − (1.5 × ATR)
        target = entry + (2 × stop_distance)
        reward_risk = (target − entry) / (entry − stop)

    Args:
        candidate: Momentum scanner dict. Required keys: 'price' (float), 'atr' (float).

    Returns:
        dict with keys:
            entry, atr, stop, target          (float) — price levels
            stop_pct, target_pct, reward_risk (float) — fractions / ratio
    """
    entry = float(candidate['price'])
    atr = float(candidate['atr'])
    stop_distance = ATR_STOP_MULTIPLIER * atr
    stop = entry - stop_distance
    target = entry + TARGET_RR_MULTIPLE * stop_distance
    stop_pct = stop_distance / entry
    target_pct = (target - entry) / entry
    reward_risk = (target - entry) / stop_distance
    return {
        'entry': round(entry, 4),
        'atr': round(atr, 4),
        'stop': round(stop, 4),
        'target': round(target, 4),
        'stop_pct': round(stop_pct, 4),
        'target_pct': round(target_pct, 4),
        'reward_risk': round(reward_risk, 4),
    }


def estimate_win_probability(candidate: dict, gate_results: dict) -> float:
    """
    Maps structured upstream gate outputs to a win probability — no LLM.

    Inputs are already structured by Gates 1–4. Momentum score and Gate 3
    confidence are the main drivers; caution and NEUTRAL direction apply penalties.

    Args:
        candidate:    Momentum scanner dict. Uses 'score' (int, typically 2–3).
        gate_results: Dict with at least gate_results['gate3'] containing
                      'direction', 'confidence', and 'caution' (bool).

    Returns:
        Win probability clamped to [WIN_PROB_FLOOR, WIN_PROB_CEILING].
    """
    score = int(candidate.get('score', MOMENTUM_SCORE_MIN))
    score = max(MOMENTUM_SCORE_MIN, min(score, MOMENTUM_SCORE_MAX))
    score_range = MOMENTUM_SCORE_MAX - MOMENTUM_SCORE_MIN
    momentum_part = MOMENTUM_COMPONENT * (
        0.5 + (score - MOMENTUM_SCORE_MIN) / score_range
    )

    gate3 = gate_results.get('gate3', {})
    confidence = int(gate3.get('confidence', CONFIDENCE_BASELINE))
    confidence = max(0, min(confidence, 10))
    conf_range = 10 - CONFIDENCE_BASELINE
    conf_part = CONFIDENCE_COMPONENT * max(0, confidence - CONFIDENCE_BASELINE) / conf_range

    win_prob = WIN_PROB_BASE + momentum_part + conf_part

    if gate3.get('caution'):
        win_prob -= CAUTION_PENALTY
    if gate3.get('direction') == 'NEUTRAL':
        win_prob -= NEUTRAL_DIRECTION_PENALTY

    return round(max(WIN_PROB_FLOOR, min(win_prob, WIN_PROB_CEILING)), 4)


def calculate_expected_value(win_prob: float, reward_risk: float) -> float:
    """
    Expected value for a fixed reward:risk setup.

    EV = (win_prob × reward_risk) − (1 − win_prob)

    Args:
        win_prob:     Estimated probability of hitting target (0–1).
        reward_risk:  Reward-to-risk ratio (typically ~2.0 from build_trade_levels).

    Returns:
        Expected value as a fraction of risk (e.g. 0.08 = 8% edge on risk unit).
    """
    return round((win_prob * reward_risk) - (1.0 - win_prob), 4)


def build_gate_summary(gate_results: dict) -> str:
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
                f"{gate2.get('reason', '')}"
            )

    gate3 = gate_results.get('gate3')
    if gate3 is not None:
        caution = ' (caution)' if gate3.get('caution') else ''
        lines.append(
            f"Gate 3 (sentiment): {gate3.get('direction', '?')} "
            f"conf={gate3.get('confidence', '?')}{caution} — {gate3.get('key_reason', '')}"
        )

    gate4 = gate_results.get('gate4')
    if gate4 is not None:
        lines.append(
            f"Gate 4 (contradiction): {gate4.get('action', '?')} — "
            f"{gate4.get('contradiction_type', 'none')} / {gate4.get('risk_level', 'NONE')}: "
            f"{gate4.get('reason', '')}"
        )

    return '\n'.join(lines) if lines else '(no prior gate results)'


if __name__ == '__main__':
    candidate = {'price': 875.50, 'atr': 12.30, 'score': 3}
    levels = build_trade_levels(candidate)
    assert levels['reward_risk'] == 2.0
    assert levels['stop'] == round(875.50 - 1.5 * 12.30, 4)
    print(f'[trade_levels] NVDA levels: stop={levels["stop"]}, target={levels["target"]}, '
          f'R:R={levels["reward_risk"]}')

    strong_gates = {
        'gate3': {'direction': 'BULLISH', 'confidence': 9, 'caution': False, 'key_reason': 'strong'},
    }
    weak_gates = {
        'gate3': {'direction': 'BULLISH', 'confidence': 6, 'caution': True, 'key_reason': 'marginal'},
    }
    strong_p = estimate_win_probability({'score': 3}, strong_gates)
    weak_p = estimate_win_probability({'score': 2}, weak_gates)
    assert strong_p > weak_p
    strong_ev = calculate_expected_value(strong_p, levels['reward_risk'])
    weak_ev = calculate_expected_value(weak_p, levels['reward_risk'])
    assert strong_ev > weak_ev
    print(f'[trade_levels] win_prob strong={strong_p:.2%} EV={strong_ev:.3f} | '
          f'weak={weak_p:.2%} EV={weak_ev:.3f}')

    summary = build_gate_summary({
        'gate1': {'passed': True},
        'gate3': {'direction': 'BULLISH', 'confidence': 9, 'caution': False, 'key_reason': 'ok'},
    })
    assert 'Gate 1' in summary and 'Gate 3' in summary
    print(f'[trade_levels] summary sample:\n{summary}')
    print('[trade_levels] all checks passed ✅')
