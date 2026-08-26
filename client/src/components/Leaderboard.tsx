import { useEffect, useRef } from "react";
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

function PositionTrend({ delta }: { delta: number }) {
  if (delta === 0) return <span className="w-3 shrink-0 text-neutral-700 text-xs text-center">–</span>;
  if (delta > 0) return <span className="w-3 shrink-0 text-emerald-400 text-xs text-center">▲</span>;
  return <span className="w-3 shrink-0 text-red-400 text-xs text-center">▼</span>;
}

export default function Leaderboard({ drivers, intervals, selectedDriver, onSelectDriver }: Props) {
  const sorted = [...drivers].sort((a, b) => {
    const ga = intervals[a.driver_number]?.gap_to_leader;
    const gb = intervals[b.driver_number]?.gap_to_leader;
    const na = typeof ga === "number" ? ga : ga === "0" ? 0 : Infinity;
    const nb = typeof gb === "number" ? gb : gb === "0" ? 0 : Infinity;
    return na - nb;
  });

  const prevRankRef = useRef<Map<number, number>>(new Map());
  const trend = new Map<number, number>();
  sorted.forEach((d, idx) => {
    const prev = prevRankRef.current.get(d.driver_number);
    trend.set(d.driver_number, prev === undefined ? 0 : prev - idx);
  });
  useEffect(() => {
    const next = new Map<number, number>();
    sorted.forEach((d, idx) => next.set(d.driver_number, idx));
    prevRankRef.current = next;
    // Deliberately keyed on driver order (not the `sorted` array reference,
    // which is new every render) so this only re-runs when ranks actually change.
  }, [sorted.map((d) => d.driver_number).join(",")]);

  return (
    <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[60vh] xl:max-h-[760px] pr-1">
      {sorted.map((driver, idx) => {
        const iv = intervals[driver.driver_number];
        const isSelected = driver.driver_number === selectedDriver;
        return (
          <button
            key={driver.driver_number}
            onClick={() => onSelectDriver(driver.driver_number)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 border ${
              isSelected
                ? "bg-neutral-800 border-red-500/60 shadow-[0_0_0_1px_rgba(225,6,0,0.3)]"
                : "bg-neutral-900/70 border-transparent hover:bg-neutral-800/80 hover:border-neutral-700"
            }`}
          >
            <span className="w-5 shrink-0 text-neutral-500 tabular-nums font-medium">{idx + 1}</span>
            <PositionTrend delta={trend.get(driver.driver_number) ?? 0} />
            <span
              className="w-1.5 h-7 rounded-sm shrink-0"
              style={{ backgroundColor: driver.team_colour ? `#${driver.team_colour}` : "#666" }}
            />
            <span className="w-8 shrink-0 font-bold tabular-nums text-neutral-200">{driver.driver_number}</span>
            <div className="flex-1 min-w-0">
              <div className="truncate font-semibold">{driver.name_acronym ?? driver.broadcast_name}</div>
              <div className="hidden md:block text-neutral-500 text-xs truncate">{driver.team_name}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="tabular-nums text-neutral-200 font-medium">{formatGap(iv?.gap_to_leader)}</div>
              <div className="hidden sm:block tabular-nums text-neutral-600 text-xs">{formatGap(iv?.interval)}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
