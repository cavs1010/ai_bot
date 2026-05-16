# Agent Rules — Function Development Standards

These rules apply every time a new function or module is built in this project.
They exist to keep every file consistent, readable, and testable as the codebase grows.

Reference: follow [`karpathy_rules.md`](./karpathy_rules.md) before writing any code.

---

## 1. Function Structure

Every function must follow this pattern:

```python
def function_name(param: type, param2: type = default) -> ReturnType | None:
    """
    One-line description of what this function does.

    Args:
        param:  What it is and valid values/examples.
        param2: What it is. Default X because <reason>.

    Returns:
        Description of the return value, or None on failure.
    """
    try:
        # logic here
        return result
    except Exception as e:
        print(f'[module] context: {e}')
        return None
```

**Rules:**
- Type hints on every parameter and return value — always
- Docstring covers Args and Returns — always
- Return `None` on failure — never raise from an external API call
- Wrap every external API call (HTTP, broker, LLM) in `try/except`
- Print warnings as `[module] ticker_or_context: reason` — consistent across all modules
- Only import what the current function actually uses — no speculative imports
- No features, abstractions, or error handling beyond what the task requires

---

## 2. Inline Comments

Comment only when the **why** is non-obvious. Do not comment what the code already says.

```python
# Good — explains a hidden constraint
df.index = df.index.tz_convert(None)  # ta library requires tz-naive timestamps

# Bad — restates the code
df = df.sort_values('date')  # sort by date
```

---

## 3. Module-Level `__main__` Block

Every module must have a terminal test block that proves the happy path works:

```python
if __name__ == '__main__':
    result = function_name('TEST_INPUT')
    if result is not None:
        print(result)
```

This is the minimum smoke test. Run it after every change.

---

## 4. Testing Checklist

Before marking a function done, verify all three:

| Check | Command | Expected |
|-------|---------|----------|
| Happy path | `python backend/<layer_folder>/<module>.py` | Correct output prints, no errors |
| Failure path | Call with an invalid input | Warning prints, `None` returned, no crash |
| Import check | `from backend.<module> import <function>` | No import errors |

---

## 5. Jupyter Notebook — Required for Every Module

Every module gets a companion notebook for exploration and manual verification.

**Location:** same folder as the `.py` file
**Naming:** `<module_name>_playground.ipynb`

Example:
```
backend/
├── 00_data/
│   ├── data_fetcher.py
│   └── data_fetcher_playground.ipynb   ← companion notebook
├── 01_scanner/
│   ├── momentum_scanner.py
│   └── momentum_scanner_playground.ipynb
```

**Required cells (in order):**

| Cell | Purpose |
|------|---------|
| Setup & import | `sys.path` fix + import the function |
| Happy path | Call with valid input, display output |
| Parameter variations | Show what changes when args change |
| Failure path | Call with bad input, confirm graceful failure |
| Free-play | Empty cell for ad-hoc experimentation |

**Import pattern** (when Jupyter is launched from project root):
```python
import sys
sys.path.insert(0, 'backend/00_data')
from data_fetcher import get_stock_data
```

---

## 6. Print Style Reference

| Situation | Format |
|-----------|--------|
| External fetch failed | `[module] TICKER: fetch failed — {e}` |
| No data returned | `[module] TICKER: no data returned` |
| Progress / info | `[module] doing X for TICKER...` |

Use the module's short name in brackets: `[data]`, `[scanner]`, `[sentiment]`, `[risk]`, `[executor]`.

---

## 7. Definition of Done

A function is done when:

- [ ] Code written and follows structure rules above
- [ ] `python backend/<layer_folder>/<module>.py` runs without errors
- [ ] Failure path tested (bad input → `None`, no crash)
- [ ] Companion Jupyter notebook created and cells execute correctly
- [ ] Roadmap item checked off in `spec/roadmap.md`
