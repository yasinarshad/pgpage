"use client";

import { useEffect, useState, useRef } from "react";
import type { TocItem } from "@/lib/types";

type TOCSidebarProps = {
  toc: TocItem[];
};

export function TOCSidebar({ toc }: TOCSidebarProps) {
  const [activeSlug, setActiveSlug] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll-spy using IntersectionObserver
  useEffect(() => {
    if (toc.length === 0) return;

    // Disconnect existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const slugToIndex = new Map<string, number>();
    toc.forEach((item, i) => slugToIndex.set(item.slug, i));

    const visibleSlugs = new Set<string>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const slug = entry.target.id;
          if (entry.isIntersecting) {
            visibleSlugs.add(slug);
          } else {
            visibleSlugs.delete(slug);
          }
        });

        // Pick the top-most visible heading
        if (visibleSlugs.size > 0) {
          let topSlug = "";
          let topIndex = Infinity;
          for (const slug of visibleSlugs) {
            const idx = slugToIndex.get(slug);
            if (idx !== undefined && idx < topIndex) {
              topIndex = idx;
              topSlug = slug;
            }
          }
          if (topSlug) setActiveSlug(topSlug);
        }
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 }
    );

    // Observe all heading elements
    for (const item of toc) {
      const el = document.getElementById(item.slug);
      if (el) observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [toc]);

  return (
    <div className="w-56 flex-shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-y-auto">
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">On this page</h3>
      </div>
      <nav className="p-3">
        {toc.map((item, i) => {
          const isActive = item.slug === activeSlug;
          return (
            <a
              key={`${item.slug}-${i}`}
              href={`#${item.slug}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.slug)?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`block py-1 text-xs transition-colors ${
                isActive
                  ? "text-blue-400 font-medium"
                  : item.level === 1
                  ? "text-zinc-300 font-medium hover:text-zinc-200"
                  : item.level === 2
                  ? "text-zinc-400 hover:text-zinc-200"
                  : item.level === 3
                  ? "text-zinc-500 hover:text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-200"
              } ${
                item.level === 1 ? "" : item.level === 2 ? "pl-3" : item.level === 3 ? "pl-6" : "pl-9"
              }`}
            >
              {item.text}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
