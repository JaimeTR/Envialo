"use client";
import { useEffect, useRef } from "react";
import { isTauri } from "@/lib/platform";
import type { IncomingTransferRequest } from "@/lib/transfer";

async function notify(title: string, body: string) {
  if (!isTauri()) return;
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import("@tauri-apps/plugin-notification");
    let granted = await isPermissionGranted();
    if (!granted) granted = (await requestPermission()) === "granted";
    if (granted) sendNotification({ title, body });
  } catch {
    // notification permission/plugin unavailable — fail silently, the accept
    // modal (or auto-save) already covers the important part.
  }
}

async function focusMainWindow() {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    await win.show();
    await win.unminimize();
    await win.setFocus();
  } catch {
    // ignore — window may already be focused/visible
  }
}

/** Fires a native OS notification when a transfer arrives, and — unless it's
 * being auto-accepted silently — brings the app to the foreground so the
 * user sees the accept/reject dialog. */
export function useIncomingTransferNotifier(request: IncomingTransferRequest | null, autoAccepting: boolean) {
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!request) return;
    const key = request.transferId;
    if (lastKey.current === key) return;
    lastKey.current = key;

    const summary = request.items.length === 1 ? request.items[0].name : `${request.items.length} elementos`;

    if (autoAccepting) {
      notify("Envialo", `Recibiendo de ${request.fromAlias}: ${summary}`);
    } else {
      notify("Envialo — nuevo envío", `${request.fromAlias} quiere enviarte: ${summary}`);
      focusMainWindow();
    }
  }, [request, autoAccepting]);
}
