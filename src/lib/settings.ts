"use client";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

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
export function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
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

/** Same as usePersistedState, but only writes to storage while `enabled` is true
 * — used for the transfer history, which respects the "Guardar en historial" toggle.
 * Turning it off just stops recording new entries; it never deletes what's stored. */
export function useGatedPersistedState<T>(key: string, initial: T, enabled: boolean): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStored(key, initial));

  useEffect(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // localStorage unavailable — history just won't survive a restart.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled]);

  return [value, setValue];
}

export function hasStoredValue(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) !== null;
  } catch {
    return false;
  }
}
