"use client";

import type { FilterRule, ColType } from "@/lib/types";
import { OPERATORS } from "@/lib/types";

type Column = { name: string; type: ColType };

type FilterBuilderProps = {
  filters: FilterRule[];
  setFilters: (f: FilterRule[]) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  columns: Column[];
  columnValues: Record<string, string[]>;
  fkLookups: Record<string, Record<string, string>>;
};

export function FilterBuilder({
  filters, setFilters, showFilters, setShowFilters,
  columns, columnValues, fkLookups,
}: FilterBuilderProps) {
  return (
    <>
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`w-full text-left text-xs px-2 py-1 mt-1 rounded ${
          filters.length > 0 ? "text-blue-400" : "text-zinc-600"
        } hover:bg-zinc-800`}
      >
        {showFilters ? "\u25BE" : "\u25B8"} Filters{filters.length > 0 ? ` (${filters.length})` : ""}
      </button>
      {showFilters && (
        <div className="mt-1 space-y-1 px-1">
          {filters.map((f, i) => (
            <div key={i} className="flex gap-1 items-center">
              <select
                value={f.column}
                onChange={(e) => {
                  const newFilters = [...filters];
                  const col = columns.find((c) => c.name === e.target.value);
                  newFilters[i] = { column: e.target.value, operator: col ? OPERATORS[col.type][0].value : "contains", value: "" };
                  setFilters(newFilters);
                }}
                className="bg-zinc-800 text-zinc-400 text-[10px] rounded px-1 py-0.5 border border-zinc-700 outline-none flex-1 min-w-0"
              >
                <option value="">col</option>
                {columns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                value={f.operator}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[i] = { ...f, operator: e.target.value };
                  setFilters(newFilters);
                }}
                className="bg-zinc-800 text-zinc-400 text-[10px] rounded px-1 py-0.5 border border-zinc-700 outline-none"
              >
                {(columns.find((c) => c.name === f.column)?.type
                  ? OPERATORS[columns.find((c) => c.name === f.column)!.type]
                  : OPERATORS.text
                ).map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              {!["not_empty", "is_empty", "is_true", "is_false"].includes(f.operator) && (
                columnValues[f.column] && columnValues[f.column].length <= 200 ? (
                  <select
                    value={f.value}
                    onChange={(e) => {
                      const newFilters = [...filters];
                      newFilters[i] = { ...f, value: e.target.value };
                      setFilters(newFilters);
                    }}
                    className="bg-zinc-800 text-zinc-300 text-[10px] rounded px-1 py-0.5 border border-zinc-700 outline-none flex-1 min-w-0"
                  >
                    <option value="">select...</option>
                    {columnValues[f.column].map((v) => {
                      const label = fkLookups[f.column]?.[v] || v;
                      return <option key={v} value={v}>{label.length > 50 ? label.slice(0, 50) + "..." : label}</option>;
                    })}
                  </select>
                ) : (
                  <input
                    type={columns.find((c) => c.name === f.column)?.type === "date" ? "date" : "text"}
                    value={f.value}
                    onChange={(e) => {
                      const newFilters = [...filters];
                      newFilters[i] = { ...f, value: e.target.value };
                      setFilters(newFilters);
                    }}
                    placeholder="value"
                    className="bg-zinc-800 text-zinc-300 text-[10px] rounded px-1 py-0.5 border border-zinc-700 outline-none flex-1 min-w-0 placeholder-zinc-600"
                  />
                )
              )}
              <button
                onClick={() => setFilters(filters.filter((_, idx) => idx !== i))}
                className="text-zinc-600 hover:text-zinc-300 text-[10px]"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={() => setFilters([...filters, { column: "", operator: "contains", value: "" }])}
              className="text-[10px] text-zinc-600 hover:text-zinc-400"
            >
              + Add filter
            </button>
            {filters.length > 0 && (
              <button
                onClick={() => setFilters([])}
                className="text-[10px] text-zinc-600 hover:text-zinc-400"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
