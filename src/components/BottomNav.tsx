"use client";

import type { MobileView } from "@/lib/useMobile";

type BottomNavProps = {
  mobileView: MobileView;
  onTablesPress: () => void;
  onSearchPress: () => void;
  onTocPress: () => void;
  onHelpPress: () => void;
  hasToc: boolean;
};

export function BottomNav({
  mobileView,
  onTablesPress,
  onSearchPress,
  onTocPress,
  onHelpPress,
  hasToc,
}: BottomNavProps) {
  return (
    <div className="flex-shrink-0 flex items-center justify-around bg-zinc-900 border-t border-zinc-800 px-2 safe-area-bottom">
      <NavButton
        label="Tables"
        icon={<TableIcon />}
        active={mobileView === "sidebar"}
        onPress={onTablesPress}
      />
      <NavButton
        label="Search"
        icon={<SearchIcon />}
        active={mobileView === "list"}
        onPress={onSearchPress}
      />
      <NavButton
        label="TOC"
        icon={<TocIcon />}
        active={false}
        onPress={onTocPress}
        disabled={!hasToc}
      />
      <NavButton
        label="Help"
        icon={<HelpIcon />}
        active={false}
        onPress={onHelpPress}
      />
    </div>
  );
}

function NavButton({
  label,
  icon,
  active,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={`flex flex-col items-center justify-center min-w-[60px] py-2 px-3 transition-colors ${
        disabled
          ? "text-zinc-700"
          : active
          ? "text-blue-400"
          : "text-zinc-500 active:text-zinc-300"
      }`}
      style={{ minHeight: 44 }}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[10px] mt-1 leading-none">{label}</span>
    </button>
  );
}

function TableIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <line x1="3" y1="8" x2="17" y2="8" />
      <line x1="8" y1="3" x2="8" y2="17" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="5" />
      <line x1="13" y1="13" x2="17" y2="17" />
    </svg>
  );
}

function TocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="5" x2="16" y2="5" />
      <line x1="6" y1="9" x2="16" y2="9" />
      <line x1="6" y1="13" x2="16" y2="13" />
      <line x1="4" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <path d="M8 8a2 2 0 0 1 3.5 1.5c0 1-1.5 1.5-1.5 2.5" />
      <circle cx="10" cy="14.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
