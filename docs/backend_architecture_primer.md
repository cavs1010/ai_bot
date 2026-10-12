# Backend Architecture Primer

How professional teams organise a Python pipeline, in plain words, and where each piece lives
in this project. Read this when you need to remember *why* the backend is structured the way
it is.

> **Current status** (what is done, what is missing) is tracked in `spec_development/NOW.md`, not
> here. This file explains the concepts; it does not go out of date when the code changes.

---

## 1. The core idea: dependencies point inward

The pipeline has a centre and an edge.

The **centre** decides: does this stock pass, and how large is the trade. The **edge** talks to
the network: prices, news, filings, the model, the broker.

A decision never opens a connection. A connection never decides whether to buy. Outer code may
call inward. Inner code stays unaware of who called it.

This package scans, judges, sizes, and sends orders. Node records the run in the database. The
Python package has no database code.

---

## 2. One package, one entry

`backend` is a Python package. A file is imported by its place in that package:

```python
from backend.intelligence.rules.ev import apply_edge_rules
from backend.data.news import fetch_news
```

The folder name is the import name. Names are ordinary Python words (`scanner`,
`intelligence`, `risk`), so the path you see is the path you import.

Node starts **one** process: `backend/cli.py`. That file reads the arguments, loads the dials,
and calls each stage in order. It is the only file that knows the whole run. Logs and the final
JSON are written to stdout for Node to read.

`config.py` is the dial board. It is the only file that reads the `STRATEGY_CONFIG` environment
variable. Every other module imports the dial names from there. A missing key raises
immediately. Lookup tables that are not dials (`SECTOR_ETF_MAP`, source reliability) live in
`intelligence/constants.py`.

---

## 3. The four layers

Professional Python services keep the same shape, whether they call it hexagonal, ports and
adapters, or simply "the domain in the middle". Four layers are enough for this pipeline. Each
layer has one kind of code.

```
┌──────────────────────────────────────────────────────────────┐
│ 4. ENTRY      cli.py                                         │  calls ↓
│               arguments, dials, the order of the stages      │
├──────────────────────────────────────────────────────────────┤
│ 3. STAGES     scanner · intelligence/run · risk              │  call ↓
│               one job each, in pipeline order                │
├──────────────────────────────────────────────────────────────┤
│ 2. DECISIONS  gates and rules                                │  use ↓
│               a gate decides; a rule calculates              │
├──────────────────────────────────────────────────────────────┤
│ 1. CLIENTS    data · llm · broker                            │  network
│               the only modules that open a connection        │
└──────────────────────────────────────────────────────────────┘
```

### Layer 1: Clients (the network)

Each external source has one module. That module fetches or sends. It returns plain numbers,
strings, and dicts. It does not score a stock or approve a trade.

| Client | What it talks to | Where it lives |
|---|---|---|
| **Market** | Prices, VIX, SPY, sector ETFs, premarket gaps | `backend/data/` |
| **News and filings** | Headlines, earnings dates, macro calendar, 8-K filings | `backend/data/` |
| **Model** | The LLM call used by a gate | `backend/llm/client.py` |
| **Broker** | Alpaca account reads and order placement | `backend/broker/alpaca.py` |

A new shared source gets a new module in `data/`. The TradingView screen belongs to the
universe stage, so that read stays in `scanner/universe.py`.

### Layer 2: Decisions (gates and rules)

A **rule** is a pure calculation. Numbers in, a result out. Rules live in
`backend/intelligence/rules/`. They may import other rules, `constants.py`, and dial names from
`config.py`. They do not import a client.

A **gate** is one decision in the intelligence sequence. Gates live as modules, side by side,
in `backend/intelligence/gates/`. One module per gate. The module holds the verdict for that
step: pass, block, or skip, plus the fields the rest of the run needs.

A **utility** is a shared intelligence helper that contains no trading rule or decision.
New shared functions for formatting, conversion or other pure preparation live in
`backend/intelligence/utils/`. For example, `utils/news.py` formats fetched headlines
for model prompts, and `utils/gate_summary.py` formats gate results for audit output.
Utilities are pure: they make no network calls and do not import gates, stages,
clients, configuration or rules. Functions that calculate trading values or apply
trading criteria belong in `rules/`; helpers used by only one gate can stay private there.

`intelligence/run.py` walks the gates in order and stops at the first failure. It fetches
shared facts once — the market snapshot for the batch, the headlines once per ticker — and
passes those facts into the gates. A gate calls `rules` for a calculation and `llm` when the
judgment is a model call. A gate does not call `data` or `broker`.

### Layer 3: Stages (the pipeline jobs)

A stage is one job in the run, with one public function the entry calls.

| Stage | Job | Where it lives |
|---|---|---|
| **Universe** | Liquid large-cap names for the week | `backend/scanner/universe.py` |
| **Momentum** | Score that list and keep the top names | `backend/scanner/momentum.py` |
| **Intelligence** | Run one candidate through Gates 1–5 | `backend/intelligence/run.py` |
| **Risk** | Size the trade and apply the account limits | `backend/risk/gate.py` |

The scanner and the risk gate receive account figures as arguments. `cli.py` reads those
figures from the broker and passes them in. The scanner and the risk gate do not import the
broker.

Files the scanner writes (`universe.json`, the latest run) live in `scanner/data/`. They are
outputs. They are not imported.

### Layer 4: Entry (the composition root)

`cli.py` is the composition root: the one place that wires the stages together.

1. Load the dials.
2. Build or load the universe.
3. Run the momentum scan.
4. For each candidate, call `intelligence/run.py`.
5. For a buy, call the risk gate with live account figures.
6. When the run was asked to send orders, call the broker.

Adding a stage means adding one call in this file. The stage's own folder does not reach into
its neighbours to discover what comes next.

---

## 4. Who may import whom

An import is allowed when the arrow exists. Anything else waits for a change to this guide.

```
cli.py ──► scanner, intelligence/run, risk, broker, config
scanner ──► config, and its own TradingView read
intelligence/run ──► gates, data, config
gates ──► rules, utils, llm, config
risk ──► rules, config
rules ──► constants, config
utils ──► standard library only
data, llm, broker ──► their third-party libraries only
```

`data`, `llm`, and `broker` do not import a gate, a stage, or `cli.py`. A rule does not import
`data`, `llm`, or `broker`.

---

## 5. The pipeline, in order

The folder is grouped by responsibility. The run still follows this order, and the sections in
`config.py` follow it too.

| Step | Decision | Kind |
|---|---|---|
| Universe | Is the stock liquid enough to watch? | Stage, weekly |
| Momentum | Does it score into the top of the watchlist? | Stage, each run |
| Gate 1 — Hard threat | Is the market, the calendar, or the account in a hard block? | Rules |
| Gate 2 — News threat | Is there catastrophic news? | Model |
| Gate 3 — Sentiment | Is direction and confidence strong enough? | Model, then rules |
| Gate 4 — Contradiction | Does the stock disagree with its market? | Model |
| Gate 5 — Edge | Is the expected value high enough, and where are the levels? | Rules |
| Risk | Does size, exposure, and drawdown allow the order? | Rules |
| Broker | Send the entry and the protective stop | Client, only when asked |

Gate 2, Gate 3, and Gate 4 share one model client. Each gate owns its prompt and its result
shape. The client owns the call.

---

## 6. The professional workflow

1. **Put a new dial in `config.py`.** Annotate what it controls, which step reads it, and what
   raising or lowering it does.
2. **Put a new calculation in `intelligence/rules/`.** Keep it pure. Pass in the facts it needs.
3. **Put a new external source in `data/`, `llm/`, or `broker/`.** One module per source.
4. **Put a new verdict in `intelligence/gates/`** and call it from `intelligence/run.py` at the
   point in the sequence where it belongs. Fetch shared facts in `run.py` and pass them in.
5. **Change `cli.py` only when the order of stages changes**, or when a new account figure has
   to be read from the broker and handed to a stage.
6. **Put new shared helpers with no trading rules in `intelligence/utils/`.** This includes
   formatting, conversion and pure preparation. Pass in the values they need; trading
   calculations and verdicts remain in `rules/` and `gates/`.

Step 4 is the discipline that keeps the run readable as gates are added. A new check becomes a
named module in `gates/` or `rules/`, then one call from the runner. It does not become a new
top-level folder, and it does not open its own network connection when `run.py` can pass the
fact in.

This project stays a single package at `backend/`. Published libraries often add a `src/`
directory so tests import the installed copy. Node already starts this worker from `backend/`,
so that folder is the package root. Tests, when they exist, live outside the package and import
`backend` the same way the entry does.

A full set of port interfaces, one per client, is the same idea drawn with extra types. This
pipeline uses the folders and the import rule above. A client module is the adapter. A rule
module is the centre.

---

## 7. Map of this project

This is the structure to follow.

```text
backend/
├── __init__.py
├── cli.py                      # the process Node starts
├── config.py                   # dials, read once from STRATEGY_CONFIG
├── scanner/
│   ├── universe.py             # weekly liquid universe
│   ├── momentum.py             # score the watchlist
│   └── data/                   # universe.json and other scanner outputs
├── intelligence/
│   ├── run.py                  # Gates 1–5, shared facts fetched once
│   ├── constants.py            # lookup tables, not dials
│   ├── gates/
│   │   ├── hard_threat.py
│   │   ├── news_threat.py
│   │   ├── sentiment.py
│   │   ├── contradiction.py
│   │   └── signal.py           # edge and expected value
│   ├── rules/
│   │   ├── ev.py
│   │   ├── sentiment.py
│   │   ├── trade_levels.py
│   │   └── portfolio.py
│   └── utils/
│       ├── news.py             # shared headline formatting for model prompts
│       └── gate_summary.py     # shared gate-result formatting for audit output
├── risk/
│   └── gate.py                 # size and account limits
├── data/
│   ├── market.py
│   ├── news.py
│   ├── calendars.py
│   ├── filings.py
│   └── premarket.py
├── llm/
│   └── client.py
└── broker/
    └── alpaca.py
```

| Piece | Where it lives |
|---|---|
| Process entry | `backend/cli.py`. Node starts this file. |
| Dials | `backend/config.py`. The only reader of `STRATEGY_CONFIG`. |
| Lookup tables | `backend/intelligence/constants.py`. |
| Universe and momentum | `backend/scanner/`. Outputs in `scanner/data/`. |
| Gate sequence | `backend/intelligence/run.py`. |
| One verdict per gate | One module in `backend/intelligence/gates/`. |
| Pure calculations | `backend/intelligence/rules/`. |
| Shared helpers without trading rules | `backend/intelligence/utils/`. |
| Account limits and size | `backend/risk/gate.py`. |
| Market, news, calendars, filings | `backend/data/`. |
| Model call | `backend/llm/client.py`. |
| Orders and account reads | `backend/broker/alpaca.py`, called from `cli.py`. |

---

## Further reading

- Python Packaging User Guide, package layout: <https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/>
- Kedro, modular pipelines (one pipeline, one folder, importable names): <https://docs.kedro.org/en/stable/build/modular_pipelines/>
- Hexagonal architecture in Python (domain in the middle, clients at the edge): <https://softwarepatternslexicon.com/python/architectural-patterns/hexagonal-architecture-ports-and-adapters/>
- Clean, Onion, and Hexagonal — same dependency rule, folders are enough for a small pipeline: <https://milanjovanovic.tech/blog/clean-architecture-vs-onion-vs-hexagonal>
