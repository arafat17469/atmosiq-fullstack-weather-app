"use client";

import type { Units } from "@/lib/api-client";

interface UnitToggleProps {
  units: Units;
  onChange: (units: Units) => void;
}

export default function UnitToggle({ units, onChange }: UnitToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5" role="group" aria-label="Temperature units">
      {(["c", "f"] as Units[]).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          aria-pressed={units === u}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            units === u ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {u === "c" ? "°C" : "°F"}
        </button>
      ))}
    </div>
  );
}
