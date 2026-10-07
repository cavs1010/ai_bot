import { XCircle } from 'lucide-react';
import { MarketClockBadge } from '../trading/MarketClockBadge';
import { Badge } from '../../components/ui/badge';
import { ErrorNotice } from '../../components/ui/error-notice';
import { Stat, type StatMark, type StatTone } from '../../components/ui/stat';
import { SyncButton } from '../../components/ui/sync-button';
import { SyncStamp } from '../../components/ui/sync-stamp';
import type { LivePortfolio, MarketSnapshot } from '../../types/telemetry';

type PortfolioSummaryProps = {
  layout: 'compact' | 'drawer' | 'banner' | 'error';
  portfolio: LivePortfolio | null; // null until Alpaca answers
  market: MarketSnapshot | null;   // null until a pipeline run in this session reports it
  macroBlockHours: number;         // Gate 1 macro_hours from the active strategy config
  maxPositions: number;
  isFetching: boolean;
  lastSync: string | null;
  error: string | null;
  onSync: () => void;
  liveTrades?: boolean;
  onOpen?: () => void;
};

type Fact = {
  key: string;
  label: string;
  inlineLabel: string;
  value: string;
  fetching: boolean;
  tone: StatTone;
  detail?: string;
  badge?: string;
  mark?: StatMark;
};

function money(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

// Shown for any value that has not been loaded or measured yet
const NOT_LOADED = '—';

export function PortfolioSummary({
  layout,
  portfolio,
  market,
  macroBlockHours,
  maxPositions,
  isFetching,
  lastSync,
  error,
  onSync,
  liveTrades,
  onOpen,
}: PortfolioSummaryProps) {
  const pnlUp = portfolio !== null && portfolio.daily_pnl >= 0;
  const spyUp = market !== null && market.spy_change_pct >= 0;
  const hours = market ? market.hours_to_next_macro : null;
  const facts: Fact[] = [
    {
      key: 'value',
      label: 'Portfolio Value',
      inlineLabel: 'Portfolio value:',
      value: portfolio ? `$${money(portfolio.value)}` : NOT_LOADED,
      fetching: isFetching,
      tone: 'text',
    },
    {
      key: 'pnl',
      label: 'Daily P&L',
      inlineLabel: 'Daily P&L:',
      value: portfolio ? `${pnlUp ? '+' : ''}$${money(portfolio.daily_pnl)}` : NOT_LOADED,
      detail: portfolio ? `(${portfolio.daily_pnl_pct}%)` : undefined,
      fetching: isFetching,
      tone: portfolio ? (pnlUp ? 'positive' : 'danger') : 'text',
      mark: portfolio ? (pnlUp ? 'up' : 'down') : undefined,
    },
    {
      key: 'positions',
      label: 'Open Positions',
      inlineLabel: 'Positions:',
      value: portfolio ? String(portfolio.open_positions) : NOT_LOADED,
      detail: `/ ${maxPositions} max`,
      fetching: isFetching,
      tone: 'text',
    },
    {
      key: 'vix',
      label: 'VIX Level',
      inlineLabel: 'VIX:',
      value: market ? String(market.vix_level) : NOT_LOADED,
      fetching: false,
      tone: 'text',
    },
    {
      key: 'spy',
      label: 'SPY Change',
      inlineLabel: 'SPY Change:',
      value: market ? `${spyUp ? '+' : ''}${market.spy_change_pct}%` : NOT_LOADED,
      fetching: false,
      tone: market ? (spyUp ? 'positive' : 'danger') : 'text',
    },
    {
      key: 'macro',
      label: 'Macro Event',
      inlineLabel: 'Macro Event:',
      value: market ? (hours !== null ? `${hours} hrs` : 'None in 7 days') : NOT_LOADED,
      fetching: false,
      tone: 'text',
      mark: hours !== null ? (hours <= macroBlockHours ? 'soon' : 'calm') : undefined,
    },
  ];

  if (layout === 'compact') {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
          error ? 'bg-danger/10 border-danger/40 text-danger' : 'bg-canvas border-border'
        }`}
        title={error ? `Alpaca Error: ${error}` : 'Toggle portfolio & settings detail'}
      >
        {error && <XCircle className="h-3 w-3 text-danger shrink-0" />}
        <Stat
          layout="pair"
          label={portfolio ? `$${(portfolio.value / 1000).toFixed(1)}k` : NOT_LOADED}
          value={portfolio ? `${pnlUp ? '+' : ''}${portfolio.daily_pnl_pct}%` : ''}
          fetching={false}
          tone={portfolio ? (pnlUp ? 'positive' : 'danger') : 'text'}
        />
      </button>
    );
  }

  if (layout === 'error') {
    if (!error) return null;
    return (
      <ErrorNotice
        layout="bar"
        title="Alpaca API Error:"
        message={error}
        actionLabel="Retry Connection"
        onAction={onSync}
        spinning={isFetching}
      />
    );
  }

  if (layout === 'drawer') {
    return (
      <div className="bg-canvas/90 rounded-lg p-2.5 border border-border text-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-text-muted pb-2 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold text-text">Portfolio Overview</span>
              {lastSync && <SyncStamp lastSync={lastSync} />}
            </div>
            <SyncButton
              appearance="chip-narrow"
              id="btn_sync_alpaca_mobile_mini"
              onSync={onSync}
              spinning={isFetching}
              label="Sync"
              title="Sync Alpaca Portfolio"
            />
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto overflow-hidden">
            <MarketClockBadge lastSyncTime={lastSync} />
            <SyncButton
              appearance="chip-wide"
              id="btn_sync_alpaca_mobile"
              onSync={onSync}
              spinning={isFetching}
              label="Sync Alpaca"
            />
          </div>
        </div>

        {error && <ErrorNotice layout="inset" title="Alpaca Error:" message={error} />}

        <div className="grid grid-cols-2 gap-2">
          {facts.map((fact) => (
            <Stat
              key={fact.key}
              layout="stacked"
              label={fact.label}
              value={fact.value}
              detail={fact.detail}
              fetching={fact.fetching}
              tone={fact.tone}
              badge={fact.badge}
            />
          ))}
        </div>
      </div>
    );
  }

  const valueFact = facts[0];
  const rowFacts = facts.slice(1, 5);
  const macroFact = facts[5];

  return (
    <div
      className={`border-t px-4 py-2.5 sm:px-6 lg:px-8 text-xs text-text transition-colors ${
        liveTrades ? 'bg-danger/10 border-danger/30' : 'bg-canvas/60 border-border'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap gap-y-2 items-center justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="flex items-center gap-1.5">
            <Stat
              layout="inline"
              label={valueFact.inlineLabel}
              value={valueFact.value}
              fetching={valueFact.fetching}
              tone={valueFact.tone}
            />
            <SyncButton
              appearance="icon"
              id="btn_sync_alpaca_desktop"
              onSync={onSync}
              spinning={isFetching}
              title="Sync live portfolio from Alpaca"
            />
            {lastSync && !isFetching && <SyncStamp lastSync={lastSync} id="portfolio_last_sync_badge" />}
            <MarketClockBadge lastSyncTime={lastSync} className="ml-2" />
          </span>
          {rowFacts.map((fact) => {
            const stat = (
              <Stat
                key={fact.key}
                layout="inline"
                label={fact.inlineLabel}
                value={fact.value}
                detail={fact.detail}
                fetching={fact.fetching}
                tone={fact.tone}
                badge={fact.badge}
                mark={fact.mark}
              />
            );
            if (fact.key === 'vix') {
              return (
                <span key={fact.key} className="border-l border-border pl-4">
                  {stat}
                </span>
              );
            }
            return stat;
          })}
        </div>
        <div className="flex items-center gap-4 text-text-muted">
          {liveTrades && <Badge kind="live">Live trades active</Badge>}
          <Stat
            layout="inline"
            label={macroFact.inlineLabel}
            value={macroFact.value}
            fetching={macroFact.fetching}
            tone={macroFact.tone}
            mark={macroFact.mark}
          />
        </div>
      </div>
    </div>
  );
}
