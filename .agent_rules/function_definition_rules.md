---
name: function-development-standards
description: Structural and behavioral rules for every new function and module in this project. Use when writing, reviewing, or refactoring backend code so files stay consistent, readable, and verifiable.
---

# Function Development Standards

Rules for every new function and module in this project. They keep the backend consistent as it grows.

**Tradeoff:** These rules bias toward predictable, testable helpers over clever abstractions. For one-off scripts or throwaway experiments, use judgment — but production modules in `backend/` should follow this doc.

**Before planning or coding:**

1. Read [`spec/master.md`](../spec/master.md) → **Current iteration**
2. Read the active `spec/iteration-NN-roadmap.md`
3. Follow [`karpathy_rules.md`](./karpathy_rules.md) — simplicity, surgical changes, verifiable success criteria
4. Follow [`spec-development.md`](./spec-development.md) when editing anything under `spec/`

---

## 1. Think Before You Define

**Don't assume the return contract. Surface failure modes upfront.**

Before writing a function, decide:

| Question | Why it matters |
|----------|----------------|
| What does success look like? | Defines the happy-path return value |
| What does failure look like? | `None`, empty collection, or a safe fallback? |
| Is this a fetcher or pure logic? | Fetchers wrap external I/O; pure functions don't |
| Who calls it and what do they do on failure? | Callers should not need to guess |

If the roadmap or caller contract is unclear, stop and ask — don't pick silently.

State a brief plan for non-trivial functions:

```
1. [Implement fetch / transform] → verify: python backend/<path>/<module>.py
2. [Test failure path]           → verify: bad input → expected contract, no crash
3. [Notebook smoke test]         → verify: companion *_playground.ipynb cells run
```

---

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features, abstractions, or error handling beyond what the task requires
- No helper for a one-liner used once
- No "flexibility" (extra params, generic wrappers) that wasn't requested
- Only import what the current module actually uses
- Private helpers (`_fetch_closes`) are fine when they remove duplication **within the same module** — not when they anticipate future reuse

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

---

## 3. Two Function Kinds

Not every function is an API fetcher. Pick the right shape.

### A. Fetchers — external I/O (HTTP, broker, yfinance, LLM, disk reads)

Wrap the external call in `try/except`. Return `None` on failure. Print a warning.

```python
def get_stock_data(ticker: str, period: str = '60d') -> pd.DataFrame | None:
    """
    Downloads OHLCV price data for a stock via Yahoo Finance.

    Args:
        ticker: Stock symbol, e.g. 'AAPL'.
        period: Lookback window. Default '60d' covers SMA50 + weekend buffer.

    Returns:
        DataFrame with columns [Open, High, Low, Close, Volume], or None on failure.
    """
    try:
        df = yf.Ticker(ticker).history(period=period, interval='1d')
        if df.empty:
            print(f'[data] {ticker}: no data returned')
            return None
        df.index = df.index.tz_convert(None)  # ta library requires tz-naive timestamps
        return df
    except Exception as e:
        print(f'[data] {ticker}: fetch failed — {e}')
        return None
```

### B. Pure logic — no external I/O

No `try/except` wrapper unless the operation can actually fail (e.g. file write). Return a concrete value, not `None`, unless the contract says otherwise.

```python
def calculate_momentum_score(row: pd.Series) -> tuple[int, float]:
    """Scores a stock 0–3 based on three momentum criteria."""
    score = 0
    if 50 <= row['rsi'] <= 70:
        score += 1
    # ...
    return score, row['atr']
```

### C. Optional degradation — safe fallback instead of `None`

Use only when the roadmap or caller explicitly allows continuing without the data (e.g. earnings filter skipped, price ceiling fallback).

```python
def get_max_share_price() -> float:
    try:
        # ... Alpaca call ...
        return portfolio_value * max_position_pct * 0.90
    except Exception as e:
        print(f'[universe] Alpaca unavailable, using fallback ceiling $360.00: {e}')
        return 360.0
```

Document the fallback in the docstring **Returns** section. Do not add fallbacks speculatively.

---

## 4. Function Shape (Required)

Every public function must have:

| Requirement | Rule |
|-------------|------|
| Type hints | Every parameter and return value |
| Docstring | One-line summary + **Args** (if any) + **Returns** |
| Return contract | Explicit in docstring — include `None`, empty list, or fallback behavior |
| Naming | `snake_case`; verbs for actions (`get_`, `run_`, `build_`, `check_`) |

**Docstring rules:**

- First line: what the function does, not how
- **Args:** describe valid values and why defaults were chosen
- **Returns:** describe shape (dict keys, column names) and every failure mode
- For no-arg functions, omit **Args** — do not write `Args: None`

**Return contracts by kind:**

| Kind | On success | On failure / empty |
|------|------------|-------------------|
| Fetcher | Data (DataFrame, dict, list) | `None` |
| Fetcher with "no rows" distinction | Data | `[]` for valid empty result; `None` for fetch/key failure |
| Pure logic | Concrete value | Only `None` if documented |
| Degradation fetcher | Data or documented fallback | Fallback value, never silent failure |

---

## 5. Comments

Comment only when the **why** is non-obvious. Do not restate what the code already says.

```python
# Good — hidden constraint
df.index = df.index.tz_convert(None)  # ta library requires tz-naive timestamps

# Bad — restates the code
df = df.sort_values('date')  # sort by date
```

Module-level header comments (intelligence helpers) are optional but useful when they list exports, callers, and test command — keep them short.

---

## 6. Module Structure

Every production module in `backend/` should include:

```
1. Module docstring or header comment (purpose, main exports, test command)
2. Imports (stdlib → third-party → local)
3. Module-level constants (thresholds, paths, defaults)
4. Public functions
5. Private helpers prefixed with _ (same file only)
6. if __name__ == '__main__': smoke test block
```

**Style:** Match the file you are editing (quotes, spacing). Do not reformat unrelated code.

### `__main__` block — minimum smoke test

Proves the happy path. Prefer also exercising one failure path when cheap (invalid ticker, missing key).

```python
if __name__ == '__main__':
    result = get_premarket_gap('NVDA')
    if result:
        print(f'[premarket] gap: {result["gap_pct"]:+.2%}')
    else:
        print('[premarket] get_premarket_gap returned None')

    bad = get_premarket_gap('ZZZZINVALID')
    assert bad is None
    print('[premarket] invalid ticker correctly returned None ✅')
```

Run after every change:

```bash
python backend/<layer_folder>/<module>.py
```

---

## 7. Print Style

All runtime warnings and progress logs use `[module]` prefix:

| Situation | Format |
|-----------|--------|
| External fetch failed | `[module] TICKER: fetch failed — {e}` |
| No data returned | `[module] TICKER: no data returned` |
| Missing config | `[module] context: KEY not set` |
| Progress / info | `[module] doing X for TICKER...` |
| Degradation fallback | `[module] service unavailable, using fallback …: {e}` |

Use the module's short name: `[data]`, `[universe]`, `[scanner]`, `[market]`, `[calendars]`, `[premarket]`, `[sentiment]`, `[risk]`, `[executor]`.

---

## 8. Verification Loop

Before marking a function done, verify all checks:

| Check | Command / action | Expected |
|-------|------------------|----------|
| Happy path | `python backend/<layer>/<module>.py` | Correct output, no traceback |
| Failure path | Invalid input or missing key in `__main__` | Warning printed, contract honored, no crash |
| Import check | `from <module> import <function>` in notebook or REPL | No import errors |
| Notebook | Run companion `*_playground.ipynb` cells | Setup → happy → variations → failure → free-play |

Transform vague tasks into verifiable goals:

- "Add earnings filter" → `run_universe_filter()` returns count; earnings tickers excluded when Finnhub key is set
- "Add VIX snapshot" → `get_vix_snapshot()` returns dict with `level`, `change_pct_today`, `prior_close` or `None`

---

## 9. Companion Notebook — Required for Every Module

Every module gets a companion notebook for exploration and manual verification.

**Location:** same folder as the `.py` file  
**Naming:** `<module_name>_playground.ipynb`

```
backend/
├── 00_data/
│   ├── data_fetcher.py
│   └── data_fetcher_playground.ipynb
├── 02_intelligence/helpers/
│   ├── market.py
│   └── market_playground.ipynb
```

**Required cells (in order):**

| Cell | Purpose |
|------|---------|
| Setup & import | `sys.path` fix + import the function |
| Happy path | Call with valid input, display output |
| Parameter variations | Show what changes when args change |
| Failure path | Call with bad input, confirm graceful failure |
| Free-play | Empty cell for ad-hoc experimentation |

**Import pattern** (Jupyter launched from project root):

```python
import sys
sys.path.insert(0, 'backend/02_intelligence/helpers')
from market import get_vix_snapshot
```

For modules under `02_intelligence/helpers/`, the notebook may also use the same `pathlib`/`sys.path` pattern as the `.py` file when importing sibling modules.

---

## 10. Definition of Done

A function is done when:

- [ ] Code matches the correct function kind (fetcher / pure / degradation)
- [ ] Type hints and docstring (Args + Returns) are complete
- [ ] `python backend/<layer>/<module>.py` runs without errors
- [ ] Failure path tested — return contract honored, no crash
- [ ] Companion `*_playground.ipynb` created and cells execute
- [ ] Roadmap item checked off in the active `spec/iteration-NN-roadmap.md`

---

## 11. Surgical Changes When Editing Existing Code

When modifying an existing module:

- Match existing conventions in that file
- Do not refactor unrelated functions
- Do not add fetcher-style `try/except` to pure logic functions (or vice versa)
- Remove only imports and helpers **your change** made unused
- If existing code diverges from this doc, align new code to this doc and mention legacy drift — do not silently "fix" adjacent functions unless asked
