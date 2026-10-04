import { useState } from 'react';
import { ArrowUpDown, Database, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ErrorNotice } from '../../components/ui/error-notice';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import type { UniverseItem } from '../../types/universe';

type SortField = 'ticker' | 'sector' | 'price' | 'volume' | 'atr_pct' | 'rsi';

type UniverseListProps = {
  items: UniverseItem[];
  fetching: boolean;
  error: string | null;
  generating: boolean;
  onRefresh: () => void;
  onGenerate: () => void;
  onClose: () => void;
};

const COLUMNS: { field: SortField; label: string; numeric: boolean }[] = [
  { field: 'ticker', label: 'Ticker', numeric: false },
  { field: 'sector', label: 'Sector', numeric: false },
  { field: 'price', label: 'Price', numeric: true },
  { field: 'volume', label: 'Volume', numeric: true },
  { field: 'atr_pct', label: 'ATR %', numeric: true },
  { field: 'rsi', label: 'RSI', numeric: true },
];

function compare(a: UniverseItem, b: UniverseItem, field: SortField) {
  const valA = a[field];
  const valB = b[field];
  if (valA === valB) return 0;
  if (valA === undefined) return 1;
  if (valB === undefined) return -1;
  if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB);
  return valA < valB ? -1 : 1;
}

function num(value: number | undefined, digits: number) {
  return value === undefined ? '—' : value.toFixed(digits);
}

export function UniverseList({ items, fetching, error, generating, onRefresh, onGenerate, onClose }: UniverseListProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('ticker');
  const [sortAsc, setSortAsc] = useState(true);

  const query = search.toLowerCase();
  const visible = items
    .filter((item) => item.ticker.toLowerCase().includes(query) || (item.sector ?? '').toLowerCase().includes(query))
    .sort((a, b) => (sortAsc ? 1 : -1) * compare(a, b, sortField));

  const sortBy = (field: SortField, numeric: boolean) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(!numeric);
    }
  };

  return (
    <Modal
      id="universe_modal"
      icon={<Database className="h-5 w-5" />}
      eyebrow="Stage 1 nightly scanner"
      title="Universe Watchlist Candidates"
      placement="center"
      width="lg"
      onClose={onClose}
      headerActions={
        <button
          type="button"
          onClick={onRefresh}
          disabled={fetching}
          title="Reload the latest watchlist from the database"
          className="p-1.5 rounded-sm text-text-muted hover:text-accent transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin text-accent' : ''}`} />
        </button>
      }
      footer={
        <>
          <span className="text-body-sm text-text-faint mr-auto">Data source: latest Neon watchlist batch</span>
          <Button role="secondary" label="Close" icon={null} onClick={onClose} disabled={false} busy={false} block={false} />
        </>
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <TextField value={search} onChange={setSearch} placeholder="Search ticker or sector..." icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <span className="text-body-sm text-text-muted">
            Showing <strong className="text-accent font-mono">{visible.length}</strong> of <strong className="text-text font-mono">{items.length}</strong>
          </span>
          <Button
            role="secondary"
            label="Re-run Scanner"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={onGenerate}
            disabled={generating}
            busy={generating}
            block={false}
          />
        </div>
      </div>

      {fetching ? (
        <div className="py-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
          <p className="text-body-sm text-text-muted">Loading watchlist...</p>
        </div>
      ) : error ? (
        <ErrorNotice layout="inset" title="Failed to load watchlist:" message={error} />
      ) : items.length === 0 ? (
        <div className="py-12 text-center space-y-3 rounded-md border border-dashed border-border">
          <Database className="h-10 w-10 text-text-faint mx-auto" />
          <p className="text-body-sm text-text-muted">No watchlist generated yet.</p>
          <Button role="primary" label="Generate Watchlist" icon={null} onClick={onGenerate} disabled={generating} busy={generating} block={false} />
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-md bg-canvas max-h-[50vh]">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface border-b border-border text-text-muted text-eyebrow uppercase sticky top-0 z-10">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.field}
                    onClick={() => sortBy(col.field, col.numeric)}
                    className={`px-4 py-2.5 cursor-pointer hover:text-accent transition-colors ${col.numeric ? 'text-right' : ''}`}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.numeric ? 'justify-end' : ''}`}>
                      {col.label}
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right">SMA 20 / 50</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-text-muted">
              {visible.map((item) => (
                <tr key={item.ticker} className="hover:bg-surface/60 transition-colors">
                  <td className="px-4 py-2 font-bold text-accent">{item.ticker}</td>
                  <td className="px-4 py-2 font-sans">{item.sector ?? '—'}</td>
                  <td className="px-4 py-2 text-right text-text">${item.price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{item.volume === undefined ? '—' : item.volume.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-accent">{item.atr_pct === undefined ? '—' : `${item.atr_pct.toFixed(2)}%`}</td>
                  <td className="px-4 py-2 text-right">{num(item.rsi, 1)}</td>
                  <td className="px-4 py-2 text-right">
                    {item.sma20 === undefined || item.sma50 === undefined ? '—' : `$${item.sma20.toFixed(1)} / $${item.sma50.toFixed(1)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
