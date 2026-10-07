import { useEffect, useState } from 'react';
import type { LivePortfolio } from '../types/telemetry';
import { formatTimestamp } from '../utils/time';

/**
 * The live Alpaca account shown in the header. `portfolio` is null until Alpaca answers;
 * on failure it stays null and `error` says why — no placeholder values are ever shown.
 */
export function useLivePortfolio(showToast: (msg: string) => void) {
  const [portfolio, setPortfolio] = useState<LivePortfolio | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // GET /api/portfolio/live (read-only)
  const refresh = async (notify: boolean) => {
    setIsFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/portfolio/live');
      const data = await res.json();
      if (res.ok && data.success) {
        const syncTime = formatTimestamp();
        setLastSync(syncTime);
        setPortfolio({
          value: data.value,
          daily_pnl: data.daily_pnl,
          daily_pnl_pct: data.daily_pnl_pct,
          open_positions: data.open_positions,
        });
        if (notify) {
          showToast(`Alpaca portfolio synchronized at ${syncTime}`);
        }
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(`Network error fetching Alpaca portfolio: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  // Manual "Update Portfolio": record a snapshot in Neon (POST), then refresh the live view (GET)
  const sync = async () => {
    try {
      const res = await fetch('/api/portfolio/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_source: 'MANUAL_UPDATE' }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(`Snapshot not saved: ${data.details}`);
      }
    } catch (err: any) {
      showToast(`Snapshot not saved: ${err.message}`);
    }
    refresh(true);
  };

  useEffect(() => {
    refresh(false);
  }, []);

  return { portfolio, isFetching, lastSync, error, refresh, sync };
}
