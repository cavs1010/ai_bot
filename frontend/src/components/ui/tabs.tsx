type Tab<T extends string> = {
  value: T;
  label: string;
};

type TabsProps<T extends string> = {
  tabs: Tab<T>[];
  selected: T;
  onSelect: (value: T) => void;
};

export function Tabs<T extends string>({ tabs, selected, onSelect }: TabsProps<T>) {
  return (
    <div className="flex">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onSelect(tab.value)}
          className={tab.value === selected ? 'tab tab-selected' : 'tab'}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
