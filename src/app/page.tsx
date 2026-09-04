"use client";
import React, { useEffect, useState } from "react";
import {
  Laptop2,
  FolderOpen,
  History,
  Settings,
  FileUp,
  FolderUp,
  Type,
  MessageSquare,
  X,
  Wifi,
  Send,
  Inbox,
  Palette,
  Server,
  UserRound,
  RotateCw,
  RotateCcw,
  FileText,
  FolderOpen as FolderOpenIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  Download,
} from "lucide-react";
import { Sidebar, TabId } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { EmptyState } from "@/components/ui/card";
import { StyledButton, Badge } from "@/components/ui/badge-button-tag";
import { AvatarWithStatus } from "@/components/ui/avatar";
import { DeviceAvatar } from "@/components/ui/device-avatar";
import { PulseOrb } from "@/components/ui/pulse-orb";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { BentoKpiCard, BentoPanel, BentoPanelHeader } from "@/components/ui/bento-cards";
import { StyledSelect, StyledInput, SettingsRow, RowToggle, SegmentedControl } from "@/components/ui/form-controls";
import { WelcomeTour } from "@/components/features/welcome-tour";
import { AboutModal } from "@/components/features/about-modal";
import { IncomingTransferModal } from "@/components/features/incoming-transfer-modal";
import { PairRequestModal } from "@/components/features/pair-request-modal";
import { SendModal } from "@/components/features/send-modal";
import { TextComposerModal } from "@/components/features/text-composer-modal";
import { MessageModal } from "@/components/features/message-modal";
import { SimpleToast } from "@/components/ui/toast";
import { TransferStatusBadge } from "@/components/ui/transfer-status-badge";
import { TransferProgressBar } from "@/components/ui/transfer-progress-bar";
import { Device, SelectedItem, SentItem, TransferStatus } from "@/types";
import { cn, formatBytes } from "@/lib/utils";
import { isTauri, useIsTauri } from "@/lib/platform";
import { useTheme } from "@/lib/theme";
import { useConnectionType } from "@/lib/network";
import { useDiscoveredDevices } from "@/lib/discovery";
import { usePairing } from "@/lib/pairing";
import { useTransferEvents } from "@/lib/transfer";
import { useWebServer } from "@/lib/webserver";
import { useUpdater } from "@/lib/updater";
import { usePersistedState, hasStoredValue } from "@/lib/settings";
import { useAutostart } from "@/lib/autostart";
import { useIncomingTransferNotifier } from "@/lib/notifications";

const TAB_TITLES: Record<TabId, string> = {
  devices: "Dispositivos en tu red",
  send: "Enviar",
  receive: "Recibir",
  history: "Historial",
  settings: "Configuración",
};

const QUICK_SAVE_OPTIONS = [
  { value: "off", label: "Apagado" },
  { value: "favorites", label: "Favoritos" },
  { value: "on", label: "Encendido" },
];

const VISIBILITY_OPTIONS = [
  { value: "online", label: "Online", icon: Eye },
  { value: "hidden", label: "Oculto", icon: EyeOff },
];

const ONBOARDING_KEY = "envialo-onboarding-seen";
const SENT_PAGE_SIZE = 10;

function sortDevices(list: Device[]): Device[] {
  return [...list].sort((a, b) => (a.status === b.status ? 0 : a.status === "online" ? -1 : 1));
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("devices");
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [sentItems, setSentItems] = useState<SentItem[]>([]);
  const [receivedItems, setReceivedItems] = useState<SentItem[]>([]);
  const [sentPage, setSentPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [downloadPath, setDownloadPath] = usePersistedState("download-path", "Documentos/Envialo");
  const [alias, setAlias] = usePersistedState("alias", "Jaime Tarazona");
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const connectionType = useConnectionType();
  const ConnectionIcon = connectionType === "wifi" ? Wifi : Laptop2;
  const [minimizeOnClose, setMinimizeOnClose] = usePersistedState("minimize-on-close", true);
  const [quickSave, setQuickSave] = usePersistedState<"off" | "favorites" | "on">("quick-save", "off");
  const [myVisibility, setMyVisibility] = usePersistedState<"online" | "hidden">("visibility", "online");
  const [saveHistory, setSaveHistory] = usePersistedState("save-history", true);
  const { enabled: autoStart, setEnabled: setAutoStart } = useAutostart();

  useEffect(() => {
    if (!isTauri()) return;
    import("@tauri-apps/api/core").then(({ invoke }) => invoke("set_minimize_on_close", { enabled: minimizeOnClose }).catch(() => {}));
  }, [minimizeOnClose]);
  const rawDevices = useDiscoveredDevices(alias, connectionType, myVisibility === "online");
  const { pairedIds, incomingRequest: incomingPairRequest, lastResult: pairResult, sendPairRequest, respondToRequest } = usePairing(alias);
  const {
    incomingRequest: incomingTransferRequest,
    clearIncomingRequest: clearIncomingTransferRequest,
    sendProgress,
    sendResult,
    receiveProgress,
    receiveComplete,
    clearReceiveComplete,
    receiveFailed,
    clearReceiveFailed,
    sendTransfer,
    respondTransfer,
  } = useTransferEvents();
  const webServerUrl = useWebServer();
  const isTauriApp = useIsTauri();
  const {
    status: updateStatus,
    currentVersion,
    latestVersion,
    progress: updateProgress,
    error: updateError,
    checkForUpdate,
    installUpdate,
    restartToApply,
  } = useUpdater();
  const devices = sortDevices(rawDevices).map((d) => ({ ...d, paired: pairedIds.has(d.id) }));
  const onlineCount = devices.filter((d) => d.status === "online").length;
  const [pairingTargetId, setPairingTargetId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setShowWelcome(true);
    } catch {
      // localStorage unavailable — skip auto-onboarding
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      // If the user already picked a folder (persisted), keep it — only
      // resolve+create the default the very first time there's no choice yet.
      if (hasStoredValue("download-path")) {
        await invoke("ensure_download_dir", { path: downloadPath }).catch(() => {});
        return;
      }
      const { documentDir, join } = await import("@tauri-apps/api/path");
      const docs = await documentDir();
      const path = await join(docs, "Envialo");
      await invoke("ensure_download_dir", { path });
      setDownloadPath(path);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pairResult) return;
    setPairingTargetId(null);
    if (pairResult.timedOut) {
      setToastMsg("El otro dispositivo no respondió a tiempo");
    } else if (pairResult.accepted) {
      setToastMsg(`Emparejado con ${pairResult.alias}`);
    } else {
      setToastMsg(`${pairResult.alias || "El dispositivo"} rechazó el emparejamiento`);
    }
  }, [pairResult]);

  useEffect(() => {
    if (updateStatus === "ready") {
      setToastMsg(`Actualización v${latestVersion} lista — reinicia cuando quieras desde Configuración`);
    }
  }, [updateStatus, latestVersion]);

  useEffect(() => {
    setSentItems((prev) =>
      prev.map((it) => (it.transferId && sendProgress[it.transferId] !== undefined ? { ...it, progress: sendProgress[it.transferId] } : it))
    );
  }, [sendProgress]);

  useEffect(() => {
    if (!sendResult) return;
    const status = sendResult.status === "accepted" ? "accepted" : sendResult.status === "rejected" ? "rejected" : "failed";
    setSentItems((prev) => prev.map((it) => (it.transferId === sendResult.transferId ? { ...it, status, progress: 100 } : it)));
    const isPhoneTarget = sendResult.targetId.startsWith("phone-");
    if (sendResult.status === "accepted") {
      setToastMsg(isPhoneTarget ? "Disponible en el celular — esperando que lo descargue" : "Enviado y recibido correctamente");
    } else if (sendResult.status === "rejected") {
      setToastMsg("El destinatario rechazó el envío");
    } else {
      setToastMsg(`Error al enviar: ${sendResult.error || "desconocido"}`);
    }
  }, [sendResult]);

  useEffect(() => {
    setReceivedItems((prev) =>
      prev.map((it) => (it.transferId && receiveProgress[it.transferId] !== undefined ? { ...it, progress: receiveProgress[it.transferId] } : it))
    );
  }, [receiveProgress]);

  useEffect(() => {
    if (!receiveComplete) return;
    setReceivedItems((prev) =>
      prev.map((it) =>
        it.transferId === receiveComplete.transferId ? { ...it, status: "accepted", progress: 100, savedPath: receiveComplete.savedPath } : it
      )
    );
    setToastMsg(`Recibido de ${receiveComplete.fromAlias} — guardado en ${receiveComplete.savedPath}`);
    clearReceiveComplete();
  }, [receiveComplete]);

  useEffect(() => {
    if (!receiveFailed) return;
    setReceivedItems((prev) => prev.map((it) => (it.transferId === receiveFailed.transferId ? { ...it, status: "failed" } : it)));
    setToastMsg("Error al recibir el envío");
    clearReceiveFailed();
  }, [receiveFailed]);

  useEffect(() => {
    if (!incomingTransferRequest) return;
    if (quickSave === "on") handleAcceptIncomingTransfer(incomingTransferRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingTransferRequest]);

  useIncomingTransferNotifier(incomingTransferRequest, quickSave === "on");

  function buildReceivedRows(transferId: string, fromAlias: string, itemsSummary: { name: string; isDirectory: boolean; size: number }[]) {
    const now = new Date();
    const base = {
      deviceName: fromAlias,
      status: "transferring" as const,
      progress: 0,
      timestamp: now.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      createdAt: now.getTime(),
      direction: "received" as const,
      transferId,
    };
    // Varios elementos comparten una sola conexión y un progreso agregado — una fila
    // por elemento mostraría el mismo % en todas aunque terminen en momentos distintos.
    if (itemsSummary.length > 1) {
      return [
        {
          ...base,
          path: `${transferId}-batch`,
          id: `${transferId}-batch`,
          name: `${itemsSummary.length} elementos`,
          isDirectory: false,
          size: itemsSummary.reduce((sum, it) => sum + it.size, 0),
        },
      ];
    }
    return itemsSummary.map((it, idx) => ({
      ...base,
      path: `${transferId}-${idx}`,
      name: it.name,
      isDirectory: it.isDirectory,
      size: it.size,
      id: `${transferId}-${idx}`,
    }));
  }

  async function handleAcceptIncomingTransfer(request: NonNullable<typeof incomingTransferRequest>) {
    clearIncomingTransferRequest();
    const rows = buildReceivedRows(request.transferId, request.fromAlias, request.items);
    setReceivedItems((prev) => [...rows, ...prev]);
    try {
      await respondTransfer(request.transferId, true, downloadPath);
    } catch {
      setReceivedItems((prev) => prev.map((it) => (it.transferId === request.transferId ? { ...it, status: "failed" } : it)));
      setToastMsg("No se pudo recibir el envío");
    }
  }

  async function handleRejectIncomingTransfer(request: NonNullable<typeof incomingTransferRequest>) {
    clearIncomingTransferRequest();
    try {
      await respondTransfer(request.transferId, false, downloadPath);
    } catch {
      // conexión ya cerrada, ignorar
    }
    setToastMsg("Solicitud rechazada");
  }

  function closeWelcome() {
    setShowWelcome(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function handlePickFile() {
    if (isTauri()) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ multiple: true, directory: false });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      setItems((prev) => [
        ...prev,
        ...paths.map((p) => ({ path: p, name: p.split(/[\\/]/).pop() || p, isDirectory: false })),
      ]);
    } else {
      alert("Selector nativo solo disponible dentro de la app de escritorio (Tauri). En el navegador esto es solo vista previa de la interfaz.");
    }
  }

  async function handlePickFolder() {
    if (isTauri()) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ multiple: true, directory: true });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      setItems((prev) => [
        ...prev,
        ...paths.map((p) => ({ path: p, name: p.split(/[\\/]/).pop() || p, isDirectory: true })),
      ]);
    } else {
      alert("Selector nativo solo disponible dentro de la app de escritorio (Tauri). En el navegador esto es solo vista previa de la interfaz.");
    }
  }

  function removeItem(path: string) {
    setItems((prev) => prev.filter((i) => i.path !== path));
  }

  function addTextItem(title: string, description: string) {
    const t = title.trim();
    const d = description.trim();
    if (!t && !d) return;
    const name = t || (d.length > 40 ? `${d.slice(0, 40)}…` : d);
    const textContent = [t, d].filter(Boolean).join("\n\n");
    setItems((prev) => [
      ...prev,
      { path: `text-${Date.now()}`, name, isDirectory: false, isText: true, textContent },
    ]);
  }

  function handleTextComposerConfirm(title: string, description: string) {
    addTextItem(title, description);
    setShowTextModal(false);
    setShowSendModal(true);
  }

  async function handleQuickPickFile() {
    await handlePickFile();
    setShowSendModal(true);
  }

  async function handleQuickPickFolder() {
    await handlePickFolder();
    setShowSendModal(true);
  }

  function simulateTransfer(id: string, direction: "sent" | "received", finalStatus: TransferStatus, finalMessage?: string) {
    const setList = direction === "sent" ? setSentItems : setReceivedItems;
    const interval = setInterval(() => {
      setList((prev) =>
        prev.map((it) => {
          if (it.id !== id || it.status !== "transferring") return it;
          const next = (it.progress ?? 0) + Math.random() * 16 + 8;
          if (next >= 100) {
            clearInterval(interval);
            if (finalMessage) setToastMsg(finalMessage);
            return { ...it, progress: 100, status: finalStatus };
          }
          return { ...it, progress: next };
        })
      );
    }, 220);
  }

  async function handleConfirmSend(device: Device) {
    const now = new Date();
    const timestamp = now.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    const capturedItems = items;
    setItems([]);
    setShowSendModal(false);
    setSentPage(0);
    setHistoryPage(0);

    if (isTauri()) {
      try {
        const transferId = await sendTransfer(device.id, alias, capturedItems);
        const base = {
          deviceName: device.owner,
          status: "transferring" as const,
          progress: 0,
          timestamp,
          createdAt: now.getTime(),
          direction: "sent" as const,
          transferId,
        };
        // Varios elementos comparten una sola conexión y un progreso agregado — una fila
        // por elemento mostraría el mismo % en todas aunque terminen en momentos distintos.
        const newItems: SentItem[] =
          capturedItems.length > 1
            ? [
                {
                  ...base,
                  path: `${transferId}-batch`,
                  id: `${transferId}-batch`,
                  name: `${capturedItems.length} elementos`,
                  isDirectory: false,
                  mergedItems: capturedItems,
                },
              ]
            : capturedItems.map((item) => ({
                ...item,
                ...base,
                id: `${transferId}-${item.path}`,
              }));
        setSentItems((prev) => [...newItems, ...prev]);
        setToastMsg(`Enviando a ${device.owner}...`);
      } catch {
        setToastMsg(`No se pudo contactar a ${device.owner}`);
      }
      return;
    }

    const newItems = capturedItems.map((item) => ({
      ...item,
      id: `${item.path}-${now.getTime()}`,
      deviceName: device.owner,
      status: "transferring" as const,
      progress: 0,
      timestamp,
      createdAt: now.getTime(),
      direction: "sent" as const,
    }));
    setSentItems((prev) => [...newItems, ...prev]);
    setToastMsg(`Enviando a ${device.owner}...`);
    newItems.forEach((item) =>
      simulateTransfer(item.id, "sent", "pending", `Enviado a ${device.owner} — esperando confirmación`)
    );
  }

  function handleCancelSent(id: string) {
    setSentItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: "cancelled" as const } : item)));
  }

  function handleRetrySent(id: string) {
    const item = sentItems.find((i) => i.id === id);
    if (!item) return;
    if (isTauri()) {
      const device = devices.find((d) => d.owner === item.deviceName);
      if (!device) {
        setToastMsg("El dispositivo ya no está disponible");
        return;
      }
      handleConfirmSendRetry(device, item);
      return;
    }
    setSentItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: "transferring" as const, progress: 0 } : it))
    );
    setToastMsg("Reintentando envío...");
    simulateTransfer(id, "sent", "pending", `Enviado a ${item.deviceName} — esperando confirmación`);
  }

  async function handleConfirmSendRetry(device: Device, item: SentItem) {
    setSentItems((prev) => prev.filter((it) => it.id !== item.id));
    try {
      const itemsToSend = item.mergedItems ?? [item];
      const transferId = await sendTransfer(device.id, alias, itemsToSend);
      const now = new Date();
      const newItem: SentItem = {
        ...item,
        id: `${transferId}-${item.path}`,
        status: "transferring",
        progress: 0,
        timestamp: now.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
        createdAt: now.getTime(),
        transferId,
      };
      setSentItems((prev) => [newItem, ...prev]);
      setToastMsg("Reintentando envío...");
    } catch {
      setToastMsg(`No se pudo contactar a ${device.owner}`);
    }
  }

  async function handleOpenFolder(path: string) {
    if (isTauri()) {
      const { openPath } = await import("@tauri-apps/plugin-opener");
      await openPath(path);
    } else {
      setToastMsg("Abrir carpeta solo disponible dentro de la app de escritorio (Tauri).");
    }
  }

  function handleSendMessage(device: Device, message: string) {
    setShowMessageModal(false);
    setToastMsg(`Mensaje enviado a ${device.owner}: "${message.length > 40 ? `${message.slice(0, 40)}…` : message}"`);
  }

  function handleScanDevices() {
    if (isScanning) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 1200);
  }

  async function handleSendPairRequest(device: Device) {
    setPairingTargetId(device.id);
    try {
      const code = await sendPairRequest(device.id);
      setToastMsg(`Código enviado a ${device.owner}: ${code} — esperando confirmación`);
    } catch (err) {
      setToastMsg(`No se pudo contactar a ${device.owner}`);
      setPairingTargetId(null);
    }
  }

  const historyItems = [...sentItems, ...receivedItems].sort((a, b) => b.createdAt - a.createdAt);

  function getActionsFor(item: SentItem) {
    if (item.direction === "sent") {
      if (item.status === "pending") return [{ label: "Cancelar", icon: X, onClick: () => handleCancelSent(item.id), danger: true }];
      if (item.status === "failed") return [{ label: "Reintentar", icon: RotateCcw, onClick: () => handleRetrySent(item.id) }];
      return [];
    }
    if (item.status === "accepted" && item.savedPath) {
      return [{ label: "Abrir carpeta", icon: FolderOpenIcon, onClick: () => handleOpenFolder(item.savedPath!) }];
    }
    return [];
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onlineCount={onlineCount}
        alias={alias}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        <Header
          title={TAB_TITLES[activeTab]}
          onHelpClick={() => setShowWelcome(true)}
          onInfoClick={() => setShowAbout(true)}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
          {activeTab === "devices" && (
            <>
              <BentoPanel size="lg">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <PulseOrb icon={ConnectionIcon} active={myVisibility === "online"} />
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tu dispositivo</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mt-0.5">{alias}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {myVisibility === "online"
                        ? `Visible para dispositivos en tu red local · ${connectionType === "wifi" ? "conectado por wifi" : "conectado por red"}`
                        : "Oculto — ningún dispositivo te ve en la red, aunque estés conectado"}
                    </p>

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4" data-tour="quick-save">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Guardado rápido</span>
                      <SegmentedControl options={QUICK_SAVE_OPTIONS} value={quickSave} onChange={(v) => setQuickSave(v as typeof quickSave)} />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      {quickSave === "off" && "Cada archivo entrante te pide confirmación antes de guardarse."}
                      {quickSave === "favorites" && "Se guarda directo solo si viene de un dispositivo marcado como favorito."}
                      {quickSave === "on" && "Todo archivo entrante se guarda directo, sin preguntar."}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center sm:self-center" data-tour="visibility-toggle">
                    <SegmentedControl
                      options={VISIBILITY_OPTIONS}
                      value={myVisibility}
                      onChange={(v) => setMyVisibility(v as typeof myVisibility)}
                      orientation="vertical"
                    />
                  </div>
                </div>
              </BentoPanel>

              <BentoPanel size="lg">
                <div className="flex items-center justify-between mb-4">
                  <BentoPanelHeader
                    title="Dispositivos en tu red local"
                    subtitle={isTauriApp ? "Detección automática vía mDNS en tu red local" : "Detección automática vía mDNS (solo en la app de escritorio)"}
                    icon={<Laptop2 className="w-5 h-5" />}
                  />
                  <button
                    onClick={handleScanDevices}
                    disabled={isScanning}
                    title="Buscar de nuevo"
                    className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#1c2130] transition-colors disabled:opacity-60 -mt-6"
                  >
                    <RotateCw className={cn("w-4 h-4", isScanning && "animate-spin")} />
                  </button>
                </div>
                {isScanning ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-4">
                    <PulseOrb icon={Laptop2} active />
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Buscando dispositivos en tu red...</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sincronizando por wifi y cable</p>
                    </div>
                    <div className="relative w-48 h-1.5 rounded-full bg-slate-100 dark:bg-[#1c2130] overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-blue-600 animate-scan-bar" />
                    </div>
                  </div>
                ) : devices.length === 0 ? (
                  <EmptyState
                    icon={<Laptop2 className="w-14 h-14 animate-float-soft" />}
                    title="Ningún dispositivo detectado todavía"
                    description={
                      isTauriApp
                        ? "Buscando otros equipos con Envialo abierto en tu misma red (wifi o cable)."
                        : "La búsqueda automática solo funciona dentro de la app de escritorio (Tauri)."
                    }
                  />
                ) : (
                  <ul className="space-y-2.5">
                    {devices.map((device) => (
                      <li
                        key={device.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl border",
                          "border-slate-200 dark:border-[#2c3349] bg-slate-50 dark:bg-[#1c2130]",
                          device.status === "offline" && "opacity-60"
                        )}
                      >
                        <DeviceAvatar device={device} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{device.owner}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            {device.name}
                            {device.area ? ` · ${device.area}` : ""}
                          </p>
                        </div>
                        {device.connectionType === "phone" ? null : pairedIds.has(device.id) ? (
                          <Badge label="Emparejado" variant="info" />
                        ) : (
                          device.status === "online" && (
                            <button
                              onClick={() => handleSendPairRequest(device)}
                              disabled={pairingTargetId === device.id}
                              title="Emparejar con este dispositivo"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 disabled:opacity-50 transition-colors"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {pairingTargetId === device.id ? "Enviando…" : "Emparejar"}
                            </button>
                          )
                        )}
                        <Badge label={device.status === "online" ? "En línea" : "Sin conexión"} variant={device.status === "online" ? "success" : "neutral"} />
                      </li>
                    ))}
                  </ul>
                )}
              </BentoPanel>
            </>
          )}

          {activeTab === "send" && (
            <>
              <BentoPanel size="lg">
                <BentoPanelHeader
                  title="Enviados"
                  subtitle={sentItems.length > 0 ? `${sentItems.length} elemento(s)` : "Aquí verás lo que has enviado"}
                  icon={<Send className="w-5 h-5" />}
                />
                {sentItems.length === 0 ? (
                  <EmptyState
                    icon={<Send className="w-14 h-14 animate-float-soft" />}
                    title="Nada enviado todavía"
                    description="Usa 'Selecciona para enviar' abajo para elegir un archivo, carpeta o texto y el dispositivo destino."
                  />
                ) : (
                  <ul className="space-y-2.5">
                    {sentItems.slice(sentPage * SENT_PAGE_SIZE, sentPage * SENT_PAGE_SIZE + SENT_PAGE_SIZE).map((item) => (
                      <li
                        key={item.id}
                        className="px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2c3349] bg-slate-50 dark:bg-[#1c2130]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.isText ? (
                              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            ) : item.isDirectory ? (
                              <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            ) : (
                              <FileUp className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                a {item.deviceName} · {item.timestamp}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.status !== "transferring" && <TransferStatusBadge status={item.status} />}
                            {item.status === "pending" && (
                              <button
                                onClick={() => handleCancelSent(item.id)}
                                title="Cancelar envío"
                                className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        {item.status === "transferring" && (
                          <TransferProgressBar progress={item.progress ?? 0} label="Enviando…" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {sentItems.length > SENT_PAGE_SIZE && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#222738] flex items-center justify-between">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Página {sentPage + 1} de {Math.ceil(sentItems.length / SENT_PAGE_SIZE)}
                    </p>
                    <div className="flex gap-2">
                      <StyledButton
                        label="Anterior"
                        variant="outline"
                        size="sm"
                        disabled={sentPage === 0}
                        onClick={() => setSentPage((p) => Math.max(0, p - 1))}
                      />
                      <StyledButton
                        label="Siguiente"
                        variant="outline"
                        size="sm"
                        disabled={sentPage >= Math.ceil(sentItems.length / SENT_PAGE_SIZE) - 1}
                        onClick={() => setSentPage((p) => Math.min(Math.ceil(sentItems.length / SENT_PAGE_SIZE) - 1, p + 1))}
                      />
                    </div>
                  </div>
                )}
              </BentoPanel>

              <BentoPanel>
                <BentoPanelHeader title="Selecciona para enviar" subtitle="Elige qué quieres enviar" icon={<FolderOpen className="w-5 h-5" />} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-tour="send-actions">
                  <QuickActionButton icon={FileUp} label="Archivo" onClick={handleQuickPickFile} />
                  <QuickActionButton icon={FolderUp} label="Carpeta" onClick={handleQuickPickFolder} />
                  <QuickActionButton icon={Type} label="Texto" onClick={() => setShowTextModal(true)} />
                  <QuickActionButton icon={MessageSquare} label="Mensaje" onClick={() => setShowMessageModal(true)} />
                </div>
              </BentoPanel>
            </>
          )}

          {activeTab === "receive" && (
            <>
              <BentoPanel>
                <BentoPanelHeader title="Recibidos" subtitle="Pendientes de aceptar, pausados o cancelados" icon={<Inbox className="w-5 h-5" />} />
                {receivedItems.filter((i) => i.status !== "accepted").length === 0 ? (
                  <EmptyState
                    icon={<Inbox className="w-14 h-14 animate-float-soft" />}
                    title="Nada pendiente todavía"
                    description="Los archivos que te envíen aparecerán aquí mientras esperan tu confirmación, o si quedaron pausados o cancelados."
                  />
                ) : (
                  <ul className="space-y-2.5">
                    {receivedItems
                      .filter((i) => i.status !== "accepted")
                      .map((item) => (
                        <li
                          key={item.id}
                          className="px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2c3349] bg-slate-50 dark:bg-[#1c2130]"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileUp className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                  de {item.deviceName} · {item.timestamp}
                                </p>
                              </div>
                            </div>
                            {item.status !== "transferring" && <TransferStatusBadge status={item.status} />}
                          </div>
                          {item.status === "transferring" && (
                            <TransferProgressBar progress={item.progress ?? 0} label="Recibiendo…" />
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </BentoPanel>

              <BentoPanel data-tour="receive-settings">
                <BentoPanelHeader title="Ajustes de recepción" subtitle="Qué pasa cuando alguien te envía algo" icon={<Settings className="w-5 h-5" />} />
                <div className="space-y-3">
                  <SettingsRow
                    label="Carpeta de recibidos"
                    description={downloadPath}
                    control={
                      <StyledButton
                        label="Cambiar"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (isTauri()) {
                            const { open } = await import("@tauri-apps/plugin-dialog");
                            const selected = await open({ directory: true });
                            if (selected && typeof selected === "string") setDownloadPath(selected);
                          } else {
                            alert("Selector nativo solo disponible dentro de la app de escritorio (Tauri).");
                          }
                        }}
                      />
                    }
                  />
                  <SettingsRow
                    label="Guardar en historial"
                    description="Registra quién, qué archivo y cuándo"
                    control={<RowToggle checked={saveHistory} onChange={setSaveHistory} />}
                  />
                </div>
              </BentoPanel>
            </>
          )}

          {activeTab === "history" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BentoKpiCard title="Enviados" value={sentItems.length} icon={Send} variant="blue" />
                <BentoKpiCard title="Recibidos" value={receivedItems.length} icon={Inbox} variant="blue" />
              </div>
              <BentoPanel size="lg">
                <BentoPanelHeader
                  title="Historial de transferencias"
                  subtitle="Quién envió qué, a quién y cuándo"
                  icon={<History className="w-5 h-5" />}
                />
                {historyItems.length === 0 ? (
                  <EmptyState
                    icon={<History className="w-14 h-14" />}
                    title="Sin transferencias todavía"
                    description="Cada envío o recepción quedará registrado aquí con la persona, su dispositivo y la hora."
                  />
                ) : (
                  <>
                    <ul className="space-y-2.5">
                      {historyItems.slice(historyPage * SENT_PAGE_SIZE, historyPage * SENT_PAGE_SIZE + SENT_PAGE_SIZE).map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2c3349] bg-slate-50 dark:bg-[#1c2130]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.direction === "sent" ? (
                              <Send className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            ) : (
                              <Inbox className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {item.direction === "sent" ? "a" : "de"} {item.deviceName} · {item.timestamp}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <TransferStatusBadge status={item.status} />
                            <ActionsMenu actions={getActionsFor(item)} />
                          </div>
                        </li>
                      ))}
                    </ul>
                    {historyItems.length > SENT_PAGE_SIZE && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#222738] flex items-center justify-between">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Página {historyPage + 1} de {Math.ceil(historyItems.length / SENT_PAGE_SIZE)}
                        </p>
                        <div className="flex gap-2">
                          <StyledButton
                            label="Anterior"
                            variant="outline"
                            size="sm"
                            disabled={historyPage === 0}
                            onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                          />
                          <StyledButton
                            label="Siguiente"
                            variant="outline"
                            size="sm"
                            disabled={historyPage >= Math.ceil(historyItems.length / SENT_PAGE_SIZE) - 1}
                            onClick={() => setHistoryPage((p) => Math.min(Math.ceil(historyItems.length / SENT_PAGE_SIZE) - 1, p + 1))}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </BentoPanel>
            </>
          )}

          {activeTab === "settings" && (
            <>
              <BentoPanel>
                <BentoPanelHeader title="General" icon={<Settings className="w-5 h-5" />} />
                <div className="space-y-3">
                  <SettingsRow
                    label="Apariencia"
                    description="Sigue el tema de tu sistema, o fíjalo manualmente"
                    control={
                      <StyledSelect
                        icon={<Palette className="w-3.5 h-3.5" />}
                        value={themeMode}
                        onChange={(v) => setThemeMode(v as "system" | "light" | "dark")}
                        options={[
                          { value: "system", label: "Sistema" },
                          { value: "light", label: "Claro" },
                          { value: "dark", label: "Oscuro" },
                        ]}
                      />
                    }
                  />
                  <SettingsRow
                    label="Iniciar con el sistema"
                    description="Abre Envialo automáticamente al encender el equipo"
                    control={<RowToggle checked={autoStart} onChange={setAutoStart} />}
                  />
                  <SettingsRow
                    label="Minimizar al cerrar"
                    description="La ventana se oculta a la bandeja en vez de cerrar la app"
                    control={<RowToggle checked={minimizeOnClose} onChange={setMinimizeOnClose} />}
                  />
                </div>
              </BentoPanel>

              <BentoPanel>
                <BentoPanelHeader title="Red" subtitle="Cómo te identificas ante otros dispositivos" icon={<Server className="w-5 h-5" />} />
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white dark:border-[#222738] dark:bg-[#1c2130]/60">
                    <div className="relative shrink-0">
                      <AvatarWithStatus initials={alias.slice(0, 2).toUpperCase()} status="online" size="md" />
                      <div className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-white dark:bg-[#1c2130] border border-slate-200 dark:border-[#2c3349] flex items-center justify-center">
                        <ConnectionIcon className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 mb-1 flex items-center gap-1">
                        <UserRound className="w-3 h-3" /> Alias visible en la red · {connectionType === "wifi" ? "wifi" : "red"}
                      </p>
                      <StyledInput value={alias} onChange={setAlias} placeholder="Tu nombre" />
                    </div>
                  </div>
                  <SettingsRow
                    label="Servidor local"
                    description={isTauriApp ? "mDNS + transferencia — activo" : "Solo disponible en la app de escritorio"}
                    control={<Badge label={isTauriApp ? "Activo" : "Detenido"} variant={isTauriApp ? "success" : "neutral"} />}
                  />
                  <SettingsRow
                    label="Acceso desde celular"
                    description={
                      webServerUrl
                        ? `Abre ${webServerUrl.url} en el navegador de tu celular (misma red). Si no carga (Android u otro caso), usa la IP: ${webServerUrl.ipUrl}`
                        : "Solo disponible en la app de escritorio"
                    }
                    control={<Badge label={webServerUrl ? "Activo" : "Detenido"} variant={webServerUrl ? "success" : "neutral"} />}
                  />
                  {webServerUrl && (
                    <div className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-200 bg-white dark:border-[#222738] dark:bg-[#1c2130]/60">
                      <div
                        className="shrink-0 w-24 h-24 bg-white rounded-lg p-1.5 border border-slate-200 overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                        dangerouslySetInnerHTML={{ __html: webServerUrl.qrSvg }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Escaneá para abrir en tu celular</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Cámara del celular, misma red wifi/cable</p>
                      </div>
                    </div>
                  )}
                </div>
              </BentoPanel>

              <BentoPanel>
                <BentoPanelHeader title="Actualizaciones" subtitle="Versión instalada y nuevas versiones disponibles" icon={<Download className="w-5 h-5" />} />
                <div className="space-y-3">
                  <SettingsRow
                    label="Versión"
                    description={
                      updateStatus === "error"
                        ? updateError || "No se pudo buscar actualizaciones"
                        : updateStatus === "available"
                        ? `v${currentVersion} instalada — nueva versión v${latestVersion} disponible`
                        : updateStatus === "ready"
                        ? "Descargada — reinicia para instalarla"
                        : `v${currentVersion} instalada`
                    }
                    control={
                      updateStatus === "checking" ? (
                        <Badge label="Buscando…" variant="info" />
                      ) : updateStatus === "up-to-date" ? (
                        <Badge label="Actualizado" variant="success" />
                      ) : updateStatus === "available" ? (
                        <StyledButton label={`Instalar v${latestVersion}`} size="sm" onClick={installUpdate} />
                      ) : updateStatus === "downloading" ? (
                        <Badge label={`Descargando ${updateProgress}%`} variant="info" />
                      ) : updateStatus === "ready" ? (
                        <StyledButton label="Reiniciar e instalar" size="sm" icon={<RotateCw className="w-3.5 h-3.5" />} onClick={restartToApply} />
                      ) : (
                        <StyledButton label="Buscar actualizaciones" variant="outline" size="sm" onClick={checkForUpdate} />
                      )
                    }
                  />
                </div>
              </BentoPanel>

            </>
          )}
        </main>
      </div>

      <WelcomeTour isOpen={showWelcome} onClose={closeWelcome} onNavigate={setActiveTab} />

      <SendModal
        isOpen={showSendModal}
        items={items}
        devices={devices}
        onClose={() => setShowSendModal(false)}
        onConfirm={handleConfirmSend}
        onRemoveItem={removeItem}
      />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <TextComposerModal isOpen={showTextModal} onClose={() => setShowTextModal(false)} onConfirm={handleTextComposerConfirm} />

      <MessageModal
        isOpen={showMessageModal}
        devices={devices}
        onClose={() => setShowMessageModal(false)}
        onConfirm={handleSendMessage}
      />

      {incomingPairRequest && (
        <PairRequestModal
          isOpen
          senderAlias={incomingPairRequest.fromAlias}
          code={incomingPairRequest.code}
          onAccept={() => {
            respondToRequest(incomingPairRequest, true);
            setToastMsg(`Emparejado con ${incomingPairRequest.fromAlias}`);
          }}
          onReject={() => respondToRequest(incomingPairRequest, false)}
        />
      )}

      {incomingTransferRequest && quickSave !== "on" && (
        <IncomingTransferModal
          isOpen
          senderAlias={incomingTransferRequest.fromAlias}
          fileName={
            incomingTransferRequest.items.length === 1
              ? incomingTransferRequest.items[0].name
              : `${incomingTransferRequest.items.length} elementos`
          }
          fileSize={incomingTransferRequest.totalSize}
          onAccept={() => handleAcceptIncomingTransfer(incomingTransferRequest)}
          onReject={() => handleRejectIncomingTransfer(incomingTransferRequest)}
        />
      )}

      {toastMsg && <SimpleToast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  );
}
