import { useState } from "react";
import { generateAcademicYears, currentAcademicYear } from "../utils/academicYear";

const RECENT_YEARS = generateAcademicYears(1, 0); // previous + current only
const HISTORY_START = 2025;

function buildFullList(extra?: string[]): string[] {
  const cur = currentAcademicYear();
  const endYear = parseInt(cur.split("-")[0]);
  const years: string[] = [];
  for (let y = HISTORY_START; y <= endYear; y++) {
    years.push(`${y}-${String(y + 1).slice(2)}`);
  }
  if (extra) {
    for (const y of extra) {
      if (!years.includes(y)) years.push(y);
    }
    years.sort();
  }
  return years;
}

interface Props {
  value: string;
  onChange: (year: string) => void;
  className?: string;
  // Pass DB-derived years here (StudentManagementPage) so they appear in the expanded list
  fullList?: string[];
}

export default function AcademicYearSelect({ value, onChange, className = "", fullList }: Props) {
  const [expanded, setExpanded] = useState(false);

  const years = expanded ? buildFullList(fullList) : RECENT_YEARS;

  // If the current value isn't in the collapsed list, always include it
  const visibleYears = years.includes(value) ? years : [value, ...years].sort();

  return (
    <div className="flex items-center gap-1">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`border border-gray-300 rounded px-2 py-1.5 text-sm bg-white ${className}`}
      >
        {visibleYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <button
        onClick={() => setExpanded(e => !e)}
        title={expanded ? "Show recent years only" : "Show all years from 2025-26"}
        className="text-gray-400 hover:text-indigo-600 px-1.5 py-1 rounded hover:bg-indigo-50 transition-colors text-xs border border-gray-200 hover:border-indigo-300 leading-none"
      >
        {expanded ? "▲" : "▼"}
      </button>
    </div>
  );
}
