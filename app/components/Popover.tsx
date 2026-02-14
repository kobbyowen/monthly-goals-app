"use client";

import React from "react";
import ReactDOM from "react-dom";

/* =========================
   TYPES
========================= */

type ContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;
  buttonRef: React.RefObject<HTMLDivElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  id: string;
};

const PopoverContext = React.createContext<ContextType | null>(null);

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) {
    throw new Error("Popover subcomponent used outside Popover");
  }
  return ctx;
}

/* =========================
   ROOT
========================= */

export function Popover({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const buttonRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const ownIdRef = React.useRef(
    id ?? `popover_${Math.random().toString(36).slice(2)}`,
  );

  /* close on outside click */
  React.useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target) return;

      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;

      setOpen(false);
    }

    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, []);

  /* ensure only one popover is open */
  React.useEffect(() => {
    function onOpen(e: Event) {
      const ev = e as CustomEvent<string>;
      if (ev.detail !== ownIdRef.current) {
        setOpen(false);
      }
    }

    window.addEventListener("app:popover-open", onOpen as EventListener);

    return () => {
      window.removeEventListener("app:popover-open", onOpen as EventListener);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;

    window.dispatchEvent(
      new CustomEvent("app:popover-open", {
        detail: ownIdRef.current,
      }),
    );
  }, [open]);

  return (
    <PopoverContext.Provider
      value={{
        open,
        setOpen,
        buttonRef,
        panelRef,
        id: ownIdRef.current,
      }}
    >
      {children}
    </PopoverContext.Provider>
  );
}

/* =========================
   BUTTON
========================= */

export function PopoverButton({ children }: { children: React.ReactNode }) {
  const { open, setOpen, buttonRef } = usePopoverContext();

  return (
    <div
      ref={buttonRef}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(!open);
      }}
    >
      {children}
    </div>
  );
}

/* =========================
   PANEL
========================= */

export function PopoverPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, panelRef, buttonRef } = usePopoverContext();

  const [mounted, setMounted] = React.useState(false);
  const [style, setStyle] = React.useState<React.CSSProperties>();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // POSITION ONLY WHEN OPEN CHANGES
  React.useLayoutEffect(() => {
    if (!open) return;

    const btn = buttonRef.current;
    const panel = panelRef.current;
    if (!btn || !panel) return;

    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const panelWidth = panel.offsetWidth;

    // mobile
    if (vw <= 640) {
      setStyle({
        position: "fixed",
        left: 8,
        top: rect.bottom + 8,
        width: Math.max(240, vw - 16),
        zIndex: 60,
      });
      return;
    }

    // desktop
    let left = rect.right - panelWidth;
    left = Math.min(Math.max(left, 8), vw - panelWidth - 8);

    setStyle({
      position: "fixed",
      left,
      top: rect.bottom + 8,
      zIndex: 60,
    });
  }, [open]); // ONLY when opening

  if (!open || !mounted) return null;

  return ReactDOM.createPortal(
    <div ref={panelRef} className={className} style={style}>
      {children}
    </div>,
    document.body,
  );
}

export default Popover;
