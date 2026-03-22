"use client";

import { useState } from "react";

export function HelpButton({ id }: { id?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        id={id}
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded flex items-center justify-center text-xs text-zinc-500 hover:bg-zinc-800"
        title="Help & shortcuts"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-lg w-[560px] max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-100">pgpage Guide</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-lg">✕</button>
            </div>

            <Section title="Keyboard Shortcuts">
              <Shortcut keys="⌘ K" desc="Focus search box" />
              <Shortcut keys="Escape" desc="Clear selection / close" />
              <Shortcut keys="↑ ↓" desc="Navigate rows in the list" />
            </Section>

            <Section title="Navigation">
              <Feature desc="Schema tabs — switch between Memory DB, Sessions, World DB, Yasin Info" />
              <Feature desc="Click a table name to load its rows" />
              <Feature desc="Click a row to open it as a rendered markdown page" />
              <Feature desc="Browser tabs — open multiple pages, click to switch, × to close" />
              <Feature desc="Breadcrumb — shows schema › table › id at top of page" />
            </Section>

            <Section title="Panel Controls">
              <Shortcut keys="☰" desc="Toggle schema/table sidebar" />
              <Shortcut keys="≡" desc="Toggle row list" />
              <Shortcut keys="¶" desc="Toggle table of contents" />
            </Section>

            <Section title="Search">
              <Feature desc="Server-side full-text search — searches ALL rows, not just loaded ones" />
              <Feature desc="Uses Postgres tsvector index (instant, even on 4000+ sessions)" />
              <Feature desc="Also matches tags and IDs" />
              <Feature desc="400ms debounce, blue border while searching" />
            </Section>

            <Section title="Filters">
              <Feature desc="Tag dropdown — filter by any tag in the current table" />
              <Feature desc="Advanced filters — click ▸ Filters, then + Add filter" />
              <Feature desc="Pick any column → operator → value (auto-populated dropdown)" />
              <Feature desc="Stack multiple filters (AND logic)" />
              <Feature desc="Foreign key columns show human-readable names (e.g., creator names)" />
            </Section>

            <Section title="Sort">
              <Feature desc="Newest — by created_at descending" />
              <Feature desc="Oldest — by created_at ascending" />
              <Feature desc="Last Modified — by updated_at descending" />
              <Feature desc="A-Z — alphabetical by title" />
            </Section>

            <Section title="Content Viewer">
              <Feature desc="Full markdown rendering — headers, code blocks, tables, lists, links" />
              <Feature desc="Syntax highlighting in code blocks (github-dark theme)" />
              <Feature desc="Properties bar — title, tags, dates, platform, FK-resolved values" />
              <Feature desc="Word count + reading time estimate" />
              <Feature desc="Table of contents — extracted from headings, click to scroll" />
              <Feature desc="Scroll-spy — TOC highlights current section as you scroll" />
            </Section>

            <Section title="Copy & Share">
              <Feature desc="Right-click any row → copies Postgres path (schema.table.id=X)" />
              <Feature desc="Click the path in properties bar → copies full URL" />
              <Feature desc="URLs are deep-linkable — share a link, it opens directly to that page" />
            </Section>

            <Section title="Pagination">
              <Feature desc="Initial load: 100 rows (fast)" />
              <Feature desc="'Load more' button at bottom loads next 100" />
              <Feature desc="Search hits ALL rows regardless of pagination" />
            </Section>

            <div className="mt-6 pt-4 border-t border-zinc-800 text-xs text-zinc-600">
              pgpage — Obsidian-like markdown viewer for Postgres
              <br />
              <a href="https://github.com/yasinarshad/pgpage" className="text-zinc-500 hover:text-zinc-400" target="_blank" rel="noopener noreferrer">
                github.com/yasinarshad/pgpage
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Shortcut({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <kbd className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300 font-mono min-w-[50px] text-center">{keys}</kbd>
      <span className="text-zinc-400">{desc}</span>
    </div>
  );
}

function Feature({ desc }: { desc: string }) {
  return (
    <div className="text-xs text-zinc-400 pl-1">
      <span className="text-zinc-600 mr-1">•</span>{desc}
    </div>
  );
}
