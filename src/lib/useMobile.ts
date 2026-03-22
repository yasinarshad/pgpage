"use client";

import { useState, useEffect, useCallback } from "react";

export type MobileView = "sidebar" | "list" | "content";

/** Breakpoints: phone <480, tablet 480-1023, desktop 1024+ */
export function useBreakpoint() {
  const [bp, setBp] = useState<"phone" | "tablet" | "desktop">("desktop");

  useEffect(() => {
    function check() {
      const w = window.innerWidth;
      if (w >= 1024) setBp("desktop");
      else if (w >= 480) setBp("tablet");
      else setBp("phone");
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return bp;
}

export function useMobileView() {
  const bp = useBreakpoint();
  const [mobileView, setMobileView] = useState<MobileView>("sidebar");

  // On desktop, view state is irrelevant
  const isPhone = bp === "phone";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const pushTo = useCallback((view: MobileView) => {
    setMobileView(view);
  }, []);

  const goBack = useCallback(() => {
    setMobileView((prev) => {
      if (prev === "content") return "list";
      if (prev === "list") return "sidebar";
      return "sidebar";
    });
  }, []);

  return { mobileView, pushTo, goBack, isPhone, isTablet, isDesktop, bp };
}
