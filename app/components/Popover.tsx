"use client";
import React from "react";
import ReactDOM from "react-dom";

type ContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;
  buttonRef: React.RefObject<HTMLElement | null>;
  panelRef: React.RefObject<HTMLElement | null>;
  id: string;
};

const PopoverContext = React.createContext<ContextType | null>(null);

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("Popover subcomponent used outside Popover");
  return ctx;
}

export function Popover({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLElement | null>(null);
  const panelRef = React.useRef<HTMLElement | null>(null);
  const ownIdRef = React.useRef(
    id || `popover_${Math.random().toString(36).slice(2)}`,
  );

  // close on outside click
  React.useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      const b = buttonRef.current;
      const p = panelRef.current;
      const target = e.target as Node | null;
      if (!target) return;
      if (p && p.contains(target)) return;
      if (b && b.contains(target)) return;
      setOpen(false);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("mousedown", onDown);
      window.addEventListener("touchstart", onDown);
      return () => {
        window.removeEventListener("mousedown", onDown);
        window.removeEventListener("touchstart", onDown);
      };
    }
    return;
  }, []);

  // ensure only one popover open at a time
  React.useEffect(() => {
    function onOpen(e: Event) {
      const ev = e as CustomEvent<string>;
      if (ev.detail !== ownIdRef.current) setOpen(false);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("app:popover-open", onOpen as EventListener);
      return () =>
        window.removeEventListener("app:popover-open", onOpen as EventListener);
    }
    return;
  }, []);

  React.useEffect(() => {
    if (open && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("app:popover-open", { detail: ownIdRef.current }),
      );
    }
  }, [open]);

  const ctx: ContextType = {
    open,
    setOpen,
    buttonRef,
    panelRef,
    id: ownIdRef.current,
  };

  return (
    <PopoverContext.Provider value={ctx}>{children}</PopoverContext.Provider>
  );
}

export function PopoverButton({ children }: { children: React.ReactNode }) {
  const { setOpen, open, buttonRef } = usePopoverContext();
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={buttonRef as any}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(!open);
      }}
    >
      {children}
    </div>
  );
}

export function PopoverPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, panelRef, buttonRef } = usePopoverContext();
  if (!open) return null;
  const [style, setStyle] = React.useState<React.CSSProperties | undefined>(
    undefined,
  );

  React.useEffect(() => {
    function update() {
      const btn = buttonRef.current as HTMLElement | null;
      const panel = panelRef.current as HTMLElement | null;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const vw = window.innerWidth;

      // default panel width guess (w-64 => 256px)
      const panelWidth = panel ? panel.offsetWidth : 256;

      // mobile: fixed, full-width with small side padding
      if (vw <= 640) {
        const left = 8;
        const width = Math.max(240, vw - 16);
        setStyle({
          position: "fixed",
          left,
          top: rect.bottom + 8,
          width,
          zIndex: 60,
        });
        return;
      }

      // desktop: position under the button, align right edge of panel with button right
      let left = rect.right - panelWidth;
      // clamp to viewport with 8px padding
      left = Math.min(Math.max(left, 8), vw - panelWidth - 8);
      const top = rect.bottom + 8;
      setStyle({ position: "fixed", left, top, zIndex: 60 });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [buttonRef, panelRef]);

  const node = typeof window !== "undefined" ? document.body : null;
  const panel = (
    <div ref={panelRef as any} className={className} style={style}>
      {children}
    </div>
  );

  if (node) return ReactDOM.createPortal(panel, node);
  return panel;
}

export default Popover;
