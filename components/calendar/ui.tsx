"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useDrag } from "react-dnd";
import { Check, X } from "lucide-react";
import { CAMPAIGNS, PLATFORMS, STATUSES, type CampaignId, type Platform, type PostFormat, type PostStatus } from "@/lib/calendar-meta";
import { C, FORMAT_ICONS, type Ev } from "./utils";

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

/** Small coloured IG / FB / TT tags. */
export function PlatformBadges({ platforms, story }: { platforms?: Platform[]; story?: boolean }) {
  if (!platforms?.length && !story) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {(platforms || []).map((p) => (
        <span key={p} title={PLATFORMS[p].label} className="px-1 rounded text-[9.5px] font-bold leading-[14px] text-white" style={{ background: PLATFORMS[p].color }}>{PLATFORMS[p].short}</span>
      ))}
      {story && <span title="Also a story" className="px-1 rounded text-[9.5px] font-bold leading-[14px] border" style={{ borderColor: C.line, color: C.sub }}>+Story</span>}
    </span>
  );
}

export function FormatIcon({ format, className = "w-3 h-3", color }: { format?: PostFormat; className?: string; color?: string }) {
  if (!format) return null;
  const Icon = FORMAT_ICONS[format];
  return <span title={format} className="inline-flex flex-shrink-0" style={{ color }}><Icon className={className} aria-label={format} /></span>;
}

/** Status shown as a dot: hollow for idea, filled colour otherwise. */
export function StatusDot({ status }: { status?: PostStatus }) {
  if (!status || status === "posted") return null;
  const s = STATUSES[status];
  return <span title={s.label} aria-label={s.label} className="w-[7px] h-[7px] rounded-full flex-shrink-0"
    style={status === "idea" ? { border: `1.5px solid ${s.color}` } : { background: s.color }} />;
}

// ── People (who a post is assigned to) ───────────────────────────────────────

export interface Person { id: string; name: string; avatar?: string; }
export const PeopleContext = createContext<{ people: Person[]; meId?: string }>({ people: [] });
export const usePeople = () => useContext(PeopleContext);

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const AVATAR_TINTS = ["#E0E7FF", "#FCE7F3", "#DCFCE7", "#FEF3C7", "#E0F2FE", "#F3E8FF"];
const tint = (id: string) => AVATAR_TINTS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TINTS.length];

/** Initials bubble for a post's owner; with `name`, also the first name. */
export function OwnerBadge({ id, name: showName, size = 18 }: { id?: string; name?: boolean; size?: number }) {
  const { people, meId } = usePeople();
  if (!id) return null;
  const p = people.find((x) => x.id === id);
  const full = p?.name || "Former member";
  const label = id === meId ? "You" : full.split(" ")[0];
  return (
    <span className="inline-flex items-center gap-1 min-w-0" title={`Assigned to ${full}`}>
      <span className="rounded-full inline-flex items-center justify-center font-bold flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.45, background: tint(id), color: C.ink }}>{initials(full)}</span>
      {showName && <span className="text-[11.5px] truncate" style={{ color: C.sub }}>{label}</span>}
    </span>
  );
}

/** Dropdown to pick (or clear) a post's owner. */
export function OwnerSelect({ value, onChange, className = "", style }: { value?: string; onChange: (id: string) => void; className?: string; style?: React.CSSProperties }) {
  const { people, meId } = usePeople();
  const sorted = [...people].sort((a, b) => Number(b.id === meId) - Number(a.id === meId) || a.name.localeCompare(b.name));
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={className} style={style} aria-label="Assigned to">
      <option value="">Nobody yet</option>
      {sorted.map((p) => <option key={p.id} value={p.id}>{p.id === meId ? `${p.name} (me)` : p.name}</option>)}
      {value && !people.some((p) => p.id === value) && <option value={value}>Former member</option>}
    </select>
  );
}
