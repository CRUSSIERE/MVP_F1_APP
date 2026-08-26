import type { Driver, Interval } from "../types/openf1";

interface Props {
  drivers: Driver[];
  intervals: Record<number, Interval>;
  selectedDriver: number | null;
  onSelectDriver: (driverNumber: number) => void;
}

function formatGap(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value; // e.g. "LAP"
  return `+${value.toFixed(3)}`;
}

export default function Leaderboard({ drivers, intervals, selectedDriver, onSelectDriver }: Props) {
  const sorted = [...drivers].sort((a, b) => {
    const ga = intervals[a.driver_number]?.gap_to_leader;
    const gb = intervals[b.driver_number]?.gap_to_leader;
    const na = typeof ga === "number" ? ga : ga === "0" ? 0 : Infinity;
    const nb = typeof gb === "number" ? gb : gb === "0" ? 0 : Infinity;
    return na - nb;
  });

  return (
    <div className="flex flex-col gap-1 overflow-y-auto max-h-[620px] pr-1">
      {sorted.map((driver, idx) => {
        const iv = intervals[driver.driver_number];
        const isSelected = driver.driver_number === selectedDriver;
        return (
          <button
            key={driver.driver_number}
            onClick={() => onSelectDriver(driver.driver_number)}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              isSelected ? "bg-neutral-700" : "bg-neutral-900 hover:bg-neutral-800"
            }`}
          >
            <span className="w-5 text-neutral-400 tabular-nums">{idx + 1}</span>
            <span
              className="w-1.5 h-6 rounded-sm shrink-0"
              style={{ backgroundColor: driver.team_colour ? `#${driver.team_colour}` : "#666" }}
            />
            <span className="w-8 font-semibold tabular-nums">{driver.driver_number}</span>
            <span className="flex-1 truncate">{driver.name_acronym ?? driver.broadcast_name}</span>
            <span className="text-neutral-400 text-xs truncate w-24">{driver.team_name}</span>
            <span className="w-16 text-right tabular-nums text-neutral-300">{formatGap(iv?.gap_to_leader)}</span>
            <span className="w-16 text-right tabular-nums text-neutral-500 text-xs">{formatGap(iv?.interval)}</span>
          </button>
        );
      })}
    </div>
  );
}
