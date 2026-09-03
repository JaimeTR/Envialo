"use client";
import { useEffect, useState } from "react";
import { isTauri } from "@/lib/platform";

export interface WebServerUrls {
  url: string;
  ipUrl: string;
  qrSvg: string;
}

export function useWebServer(): WebServerUrls | null {
  const [urls, setUrls] = useState<WebServerUrls | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<WebServerUrls>("start_web_server");
      if (!cancelled) setUrls(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return urls;
}
