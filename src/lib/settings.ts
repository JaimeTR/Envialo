"use client";
import { useEffect, useState } from "react";

const PREFIX = "envialo-setting-";

function readStored<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? initial : (JSON.parse(raw) as T);
  } catch {
    return initial;
  }
}

/** localStorage-backed state — survives app restarts and updates (WebView2/WKWebView
 * storage is keyed by the app identifier, not the installed version). */
export function usePersistedState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, initial));

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // localStorage unavailable — setting just won't survive a restart.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return [value, setValue];
}

export function hasStoredValue(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) !== null;
  } catch {
    return false;
  }
}
