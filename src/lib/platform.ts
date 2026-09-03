"use client";
import { useEffect, useState } from "react";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Same check, but hydration-safe: always returns false on the server and on
 * the client's first render, then updates after mount. Use this instead of
 * isTauri() directly inside JSX — the exported HTML has no window, so
 * branching on isTauri() during render mismatches the real Tauri webview.
 */
export function useIsTauri(): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => {
    setValue(isTauri());
  }, []);
  return value;
}
