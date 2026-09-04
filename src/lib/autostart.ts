"use client";
import { useEffect, useState } from "react";
import { isTauri } from "@/lib/platform";

/** Real OS autostart (Windows registry / macOS LaunchAgent), not just a UI toggle. */
export function useAutostart() {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      const { isEnabled } = await import("@tauri-apps/plugin-autostart");
      setEnabledState(await isEnabled());
    })();
  }, []);

  async function setEnabled(value: boolean) {
    setEnabledState(value);
    if (!isTauri()) return;
    const { enable, disable } = await import("@tauri-apps/plugin-autostart");
    try {
      if (value) await enable();
      else await disable();
    } catch {
      // OS refused (e.g. missing permission) — UI already reflects intent, ignore.
    }
  }

  return { enabled, setEnabled };
}
