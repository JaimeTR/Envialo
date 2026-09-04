"use client";
import React, { useLayoutEffect, useState } from "react";
import { Send, Inbox, Laptop2, History, Settings, UserRound, PartyPopper, ArrowRight, ArrowLeft, X, Zap, Eye } from "lucide-react";
import { StyledButton } from "@/components/ui/badge-button-tag";
import { TabId } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

interface TourStep {
  icon: React.ElementType;
  title: string;
  body: string;
  target?: string;
  tab?: TabId;
}

const STEPS: TourStep[] = [
  {
    icon: PartyPopper,
    title: "Bienvenido a Envialo",
    body: "Comparte archivos entre tus equipos conectados a la misma red local, sin nube y sin límites de tamaño. Este recorrido te muestra cada sección en 30 segundos.",
  },
  {
    icon: Laptop2,
    title: "Dispositivos",
    body: "Aquí ves tu equipo, arriba, y los equipos que están cerca en tu red, debajo, con su estado en línea.",
    target: '[data-tour="nav-devices"]',
    tab: "devices",
  },
  {
    icon: Zap,
    title: "Guardado rápido",
    body: "Apagado: cada archivo entrante te pide confirmar antes de guardarse. Favoritos: se guarda directo, pero solo si viene de un dispositivo marcado como favorito. Encendido: todo archivo entrante se guarda directo, sin preguntar.",
    target: '[data-tour="quick-save"]',
    tab: "devices",
  },
  {
    icon: Eye,
    title: "Online / Oculto",
    body: "Online: los demás dispositivos de la red te ven y pueden enviarte. Oculto: desapareces de la red aunque sigas conectado — nadie puede verte ni enviarte hasta que vuelvas a Online.",
    target: '[data-tour="visibility-toggle"]',
    tab: "devices",
  },
  {
    icon: Send,
    title: "Enviar",
    body: "Esta sección es para mandar archivos, carpetas, texto o mensajes a cualquier equipo de tu red local.",
    target: '[data-tour="nav-send"]',
    tab: "send",
  },
  {
    icon: Send,
    title: "Elegir qué mandar",
    body: "Archivo o Carpeta abren el explorador para elegir qué mandar, Texto crea una nota rápida y Mensaje envía solo texto sin archivo. Después eliges el dispositivo destino, todo dentro del mismo modal. La primera vez con cada equipo, ambos confirman un código de emparejamiento.",
    target: '[data-tour="send-actions"]',
    tab: "send",
  },
  {
    icon: Inbox,
    title: "Recibir",
    body: "Los archivos que te envíen quedan aquí mientras esperan tu confirmación, o si quedaron pausados o cancelados.",
    target: '[data-tour="nav-receive"]',
    tab: "receive",
  },
  {
    icon: Settings,
    title: "Ajustes de recepción",
    body: "Cambiar: elige la carpeta donde se guardan tus archivos recibidos. Guardar en historial: activa o desactiva que cada transferencia quede registrada — quién envió, qué y cuándo.",
    target: '[data-tour="receive-settings"]',
    tab: "receive",
  },
  {
    icon: History,
    title: "Historial",
    body: "Registro de cada transferencia: quién envió, qué archivo, a qué dispositivo y cuándo.",
    target: '[data-tour="nav-history"]',
    tab: "history",
  },
  {
    icon: Settings,
    title: "Configuración",
    body: "Apariencia (claro, oscuro o del sistema), inicio automático y minimizar al cerrar se ajustan aquí. Para cambiar el alias con el que te ven los demás dispositivos en la red, entra a Tu perfil, abajo a la izquierda.",
    target: '[data-tour="nav-settings"]',
    tab: "settings",
  },
  {
    icon: UserRound,
    title: "Tu perfil",
    body: "Tu alias y avatar — así te ven los demás dispositivos en la red. Haz clic aquí para editarlo cuando quieras.",
    target: '[data-tour="nav-profile"]',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface WelcomeTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: TabId) => void;
}

export const WelcomeTour: React.FC<WelcomeTourProps> = ({ isOpen, onClose, onNavigate }) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const current = STEPS[step];
  const Icon = current.icon;

  useLayoutEffect(() => {
    if (!isOpen) return;
    if (current.tab) onNavigate(current.tab);

    function measure() {
      if (!current.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(current.target);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    measure();
    // The target tab may have just switched — wait for React to render and the
    // browser to paint its content before measuring the real position.
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, [isOpen, step, current.target, current.tab, onNavigate]);

  if (!isOpen) return null;

  function handleClose() {
    setStep(0);
    onClose();
  }

  const PAD = 8;
  const highlightStyle: React.CSSProperties | undefined = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : undefined;

  const ESTIMATED_CARD_HEIGHT = 320;
  const CARD_WIDTH = 340;
  const cardStyle: React.CSSProperties = rect
    ? {
        top: Math.max(16, Math.min(rect.top - 8, window.innerHeight - ESTIMATED_CARD_HEIGHT - 16)),
        left: (() => {
          const preferredLeft = rect.left + rect.width + 20;
          const fitsRight = preferredLeft + CARD_WIDTH + 16 <= window.innerWidth;
          const rawLeft = fitsRight ? preferredLeft : rect.left - CARD_WIDTH - 20;
          return Math.max(16, Math.min(rawLeft, window.innerWidth - CARD_WIDTH - 16));
        })(),
      }
    : {};

  return (
    <div className="fixed inset-0 z-[60]">
      {/* dimmed backdrop with spotlight cutout */}
      {rect ? (
        <div
          className="absolute rounded-2xl border-2 border-blue-500 transition-all duration-300 pointer-events-none"
          style={{ ...highlightStyle, boxShadow: "0 0 0 9999px rgba(5,10,20,0.72)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      <button
        onClick={handleClose}
        className="absolute top-5 right-5 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* tooltip card */}
      <div
        className={cn(
          "absolute w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border p-5",
          "bg-white dark:bg-[#13161f] border-slate-200 dark:border-[#222738]",
          !rect && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={rect ? cardStyle : undefined}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{current.title}</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">{current.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={cn("w-1.5 h-1.5 rounded-full", i === step ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600")} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <StyledButton label="Atrás" variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => setStep((s) => s - 1)} />
            )}
            {step < STEPS.length - 1 ? (
              <StyledButton label="Siguiente" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => setStep((s) => s + 1)} />
            ) : (
              <StyledButton label="Entendido" size="sm" onClick={handleClose} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
