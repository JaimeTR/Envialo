"use client";
import { useEffect, useRef, useState } from "react";
import { isTauri } from "@/lib/platform";

const FALLBACK_VERSION = "0.1.0";

export type UpdateStatus = "idle" | "checking" | "up-to-date" | "available" | "downloading" | "installing" | "error";

interface DownloadEvent {
  event: "Started" | "Progress" | "Finished";
  data: { contentLength?: number; chunkLength?: number };
}

interface UpdateHandle {
  version: string;
  downloadAndInstall: (onEvent: (event: DownloadEvent) => void) => Promise<void>;
}

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [currentVersion, setCurrentVersion] = useState(FALLBACK_VERSION);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pendingUpdate = useRef<UpdateHandle | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      const { getVersion } = await import("@tauri-apps/api/app");
      setCurrentVersion(await getVersion());
    })();
  }, []);

  async function checkForUpdate() {
    if (!isTauri()) {
      setStatus("error");
      setError("Solo disponible en la app de escritorio");
      return;
    }
    setStatus("checking");
    setError(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        setStatus("up-to-date");
        return;
      }
      pendingUpdate.current = update as unknown as UpdateHandle;
      setLatestVersion(update.version);
      setStatus("available");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function installUpdate() {
    if (!pendingUpdate.current) return;
    setStatus("downloading");
    setProgress(0);
    try {
      let downloaded = 0;
      let contentLength = 0;
      await pendingUpdate.current.downloadAndInstall((event) => {
        if (event.event === "Started") {
          contentLength = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength ?? 0;
          setProgress(contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0);
        } else if (event.event === "Finished") {
          setStatus("installing");
        }
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return { status, currentVersion, latestVersion, progress, error, checkForUpdate, installUpdate };
}
