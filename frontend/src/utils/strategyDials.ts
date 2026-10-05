import type { DialDiff, Dials } from '../types/dials';

// Neon stores dials in the units the Python pipeline uses. This is the only place
// they are converted for display (e.g. 0.04 → 4 %, 100000000000 → 100 billions).
const DISPLAY_SCALE: Record<string, number> = {
  MIN_MARKET_CAP: 1e-9,
  spy_change_pct: 100,
  sector_change_pct: 100,
  premarket_gap_pct: 100,
  WIN_PROB_BASE: 100,
  MIN_EDGE_PCT: 100,
  MAX_DAILY_LOSS_PCT: 100,
  MAX_DRAWDOWN_PCT: 100,
};

// Strips float noise such as 0.07 * 100 = 7.000000000000001
const round = (n: number) => Number(n.toPrecision(12));

export const toDisplay = (key: string, stored: number) =>
  key in DISPLAY_SCALE ? round(stored * DISPLAY_SCALE[key]) : stored;

export const fromDisplay = (key: string, shown: number) =>
  key in DISPLAY_SCALE ? round(shown / DISPLAY_SCALE[key]) : shown;

const SECTION_DESC: Record<string, string> = {
  universe: 'Alters universe depth',
  scanner: 'Updates momentum filtering limits',
  gate1: 'Modifies strict market-level risk circuit breaker',
  news: 'Changes how much news the LLM gates read',
  gate3: 'Alters required LLM confidence before allowing trade',
  gate5: 'Adjusts win-probability and expected-value math',
  position_size: 'Alters how much money goes into each position',
  portfolio_limits: 'Alters portfolio-wide risk limits',
  trade_risk: 'Adjusts stop levels and reward multiples',
};

type Sections = Record<string, Record<string, number>>;

// Old-to-new differences between the saved and the edited dials, in display units
export function diffDials(saved: Dials, edited: Dials): DialDiff[] {
  const diffs: DialDiff[] = [];
  for (const group of ['selection_params', 'money_params'] as const) {
    const savedSections = saved[group] as Sections;
    const editedSections = edited[group] as Sections;
    for (const [section, fields] of Object.entries(savedSections)) {
      for (const [key, oldVal] of Object.entries(fields)) {
        const newVal = editedSections[section][key];
        if (oldVal !== newVal) {
          diffs.push({
            path: `${section}.${key}`,
            oldVal: toDisplay(key, oldVal),
            newVal: toDisplay(key, newVal),
            desc: SECTION_DESC[section],
          });
        }
      }
    }
  }
  return diffs;
}
