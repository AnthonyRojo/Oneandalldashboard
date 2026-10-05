"use client";

import { useEffect, useRef, useState } from "react";
import { useDrag } from "react-dnd";
import { Check, X } from "lucide-react";
import { CAMPAIGNS, STATUSES, type CampaignId, type PostStatus } from "@/lib/calendar-meta";
import { C, type Ev } from "./utils";

export const DND_EVENT = "calendar-event";
export interface DragItem { id: string; }

/** Drag handle hook shared by every view. */
export function useEventDrag(id: string) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_EVENT, item: { id } as DragItem, collect: (m) => ({ isDragging: m.isDragging() }),
  }), [id]);
  return { isDragging, dragRef: drag as unknown as React.Ref<HTMLButtonElement & HTMLDivElement> };
}

export function StatusPill({ status, size = "sm" }: { status?: PostStatus; size?: "sm" | "xs" }) {
  if (!status) return null;
  const s = STATUSES[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${size === "xs" ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]"}`}
      style={{ background: s.bg, color: s.color }}>
      {status === "posted" && <Check className="w-3 h-3" />}{s.label}
    </span>
  );
}

export function CampaignTag({ c, short = true }: { c?: CampaignId; short?: boolean }) {
  if (!c) return null;
  const k = CAMPAIGNS[c];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap" style={{ color: k.color }}>
      <span className="w-2 h-2 rounded-[3px]" style={{ background: k.color }} />{short ? k.short : k.label}
    </span>
  );
}

export function Modal({ children, onClose, width = 560, label }: { children: React.ReactNode; onClose: () => void; width?: number; label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={label}
      style={{ background: "rgba(24,24,27,0.36)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl" style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  );
}

/** Right-hand sheet on desktop, bottom sheet on phones. */
export function Drawer({ children, onClose, label, width = 440 }: { children: React.ReactNode; onClose: () => void; label: string; width?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end items-end sm:items-stretch" role="dialog" aria-modal="true" aria-label={label}
      style={{ background: "rgba(24,24,27,0.28)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full h-[92vh] sm:h-full rounded-t-2xl sm:rounded-none flex flex-col shadow-2xl oa-drawer" style={{ maxWidth: width }}>
        {children}
      </div>
      <style>{`
        @keyframes oaDrawerIn { from { transform: translateX(24px); opacity: .0 } to { transform: none; opacity: 1 } }
        @media (min-width: 640px) { .oa-drawer { animation: oaDrawerIn .18s ease-out } }
        @media (prefers-reduced-motion: reduce) { .oa-drawer { animation: none !important } }
      `}</style>
    </div>
  );
}

export function IconButton({ label, onClick, children, tone }: { label: string; onClick: () => void; children: React.ReactNode; tone?: "danger" }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
      style={{ color: tone === "danger" ? "#B91C1C" : C.sub }}
      onMouseEnter={(e) => (e.currentTarget.style.background = tone === "danger" ? "#FEF2F2" : "#F3F2EE")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      {children}
    </button>
  );
}

/** Small popover menu anchored to a trigger button. */
export function Popover({ trigger, children, align = "left", width = 240 }: {
  trigger: (open: boolean, toggle: () => void) => React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey, true); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      {trigger(open, () => setOpen((o) => !o))}
      {open && (
        <div className={`absolute top-full mt-1.5 z-40 bg-white rounded-xl border shadow-xl p-1.5 ${align === "right" ? "right-0" : "left-0"}`}
          style={{ borderColor: C.line, width }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, onClick, active, danger }: { children: React.ReactNode; onClick: () => void; active?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left px-2.5 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-stone-100"
      style={{ color: danger ? "#B91C1C" : C.ink, fontWeight: active ? 600 : 400 }}>
      {children}
    </button>
  );
}

export function EventTitle({ e, className = "" }: { e: Ev; className?: string }) {
  const posted = e.meta.status === "posted";
  return <span className={className} style={{ color: posted ? C.faint : undefined, textDecoration: posted ? "line-through" : undefined }}>{e.title}</span>;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border text-[10px] font-medium" style={{ borderColor: C.line, color: C.sub, background: "#FAFAF8" }}>{children}</kbd>;
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return <IconButton label="Close" onClick={onClick}><X className="w-[18px] h-[18px]" /></IconButton>;
}
