"use client";
import { useEffect, useState } from "react";
import { isTauri } from "@/lib/platform";

export function useWebServer(): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<string>("start_web_server");
      if (!cancelled) setUrl(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return url;
}
