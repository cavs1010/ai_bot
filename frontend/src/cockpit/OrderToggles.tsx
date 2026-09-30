import { Switch } from '../components/ui/switch';

type OrderTogglesProps = {
  placeOrders: boolean;
  ignoreMarketHours: boolean;
  setPlaceOrders: (next: boolean) => void;
  setIgnoreMarketHours: (next: boolean) => void;
  showToast: (message: string) => void;
  withIds?: boolean;
};

export function OrderToggles({
  placeOrders,
  ignoreMarketHours,
  setPlaceOrders,
  setIgnoreMarketHours,
  showToast,
  withIds = false,
}: OrderTogglesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Switch
        on={placeOrders}
        onLabel="Live trades on"
        offLabel="Simulation"
        detail={`placeOrders=${placeOrders ? 'true' : 'false'}`}
        tone="danger"
        containerId={withIds ? 'live_orders_switch_container' : undefined}
        switchId={withIds ? 'toggle_place_orders_switch' : undefined}
        onToggle={(next) => {
          setPlaceOrders(next);
          showToast(
            next
              ? 'Live order execution enabled. Real paper orders will be submitted to Alpaca.'
              : 'Returned to simulation. placeOrders=false.'
          );
        }}
      />
      <Switch
        on={ignoreMarketHours}
        onLabel="Force closed orders"
        offLabel="Clock enforced"
        detail={`ignoreMarketHours=${ignoreMarketHours ? 'true' : 'false'}`}
        tone="warning"
        containerId={withIds ? 'ignore_market_hours_switch_container' : undefined}
        switchId={withIds ? 'toggle_ignore_market_hours_switch' : undefined}
        onToggle={(next) => {
          setIgnoreMarketHours(next);
          showToast(
            next
              ? 'Force closed-market orders enabled. Orders will be placed or queued when the market is closed.'
              : 'Market clock enforcement enabled. Orders are blocked outside market hours.'
          );
        }}
      />
    </div>
  );
}
