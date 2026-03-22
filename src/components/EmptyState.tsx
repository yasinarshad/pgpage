"use client";

type EmptyStateProps = {
  stats: { schemas: number; tables: number; rows: number } | null;
};

export function EmptyState({ stats }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full text-zinc-600">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2 text-zinc-400">pgpage</h2>
        <p className="text-sm mb-6">
          Select a table and row to view rendered markdown
        </p>
        {stats && (
          <div className="flex gap-6 justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-300">{stats.schemas}</div>
              <div className="text-xs text-zinc-500 mt-1">Schemas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-300">{stats.tables}</div>
              <div className="text-xs text-zinc-500 mt-1">Tables</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-300">{stats.rows.toLocaleString()}</div>
              <div className="text-xs text-zinc-500 mt-1">Total rows</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
