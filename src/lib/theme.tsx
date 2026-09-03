"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";
const STORAGE_KEY = "envialo-theme";

const ThemeContext = createContext<{ mode: ThemeMode; setMode: (m: ThemeMode) => void }>({
  mode: "system",
  setMode: () => {},
});

function applyTheme(mode: ThemeMode) {
  const isDark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system";
    setModeState(stored);
    applyTheme(stored);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if ((localStorage.getItem(STORAGE_KEY) as ThemeMode) === "system" || !localStorage.getItem(STORAGE_KEY)) {
        applyTheme("system");
      }
    };
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  function setMode(m: ThemeMode) {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
    applyTheme(m);
  }

  return <ThemeContext.Provider value={{ mode, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
