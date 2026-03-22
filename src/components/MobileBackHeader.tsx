"use client";

type MobileBackHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
};

export function MobileBackHeader({ title, subtitle, onBack }: MobileBackHeaderProps) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 bg-zinc-900 border-b border-zinc-800">
      <button
        onClick={onBack}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 active:bg-zinc-800 transition-colors"
        style={{ minWidth: 44, minHeight: 44 }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="12,4 6,10 12,16" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-zinc-200 truncate">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-zinc-500 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
