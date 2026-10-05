"use client";

import { useMemo, useState } from "react";
import { format, parseISO, startOfWeek } from "date-fns";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { STATUSES, STATUS_IDS, type PostStatus } from "@/lib/calendar-meta";
import { C, EVENT_LABELS, relDay, timeLabel, WEEK_OPTS, dkey, countdown, type Ev } from "./utils";
import { CampaignTag, EventTitle, FormatIcon, PlatformBadges, OwnerBadge, OwnerSelect } from "./ui";

interface Props {
  events: Ev[];
  today: string;
  filtersActive: boolean;
  onOpen: (e: Ev) => void;
  onCreate: () => void;
  onStatus: (id: string, s: PostStatus) => void;
  onBulkStatus: (ids: string[], s: PostStatus) => void;
  onBulkShift: (ids: string[], days: number) => void;
  onBulkOwner: (ids: string[], owner: string) => void;
  onBulkDelete: (ids: string[]) => void;
}

export default function ListView({ events, today, filtersActive, onOpen, onCreate, onStatus, onBulkStatus, onBulkShift, onBulkOwner, onBulkDelete }: Props) {
  const [showPast, setShowPast] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const list = showPast ? events : events.filter((e) => e.date >= today || (e.type === "Post" && e.meta.status && e.meta.status !== "posted"));
  const pastCount = events.length - list.length;

  const groups = useMemo(() => {
    const g: { key: string; label: string; items: Ev[] }[] = [];
    list.forEach((e) => {
      const wk = dkey(startOfWeek(parseISO(e.date), WEEK_OPTS));
      let last = g[g.length - 1];
      if (!last || last.key !== wk) { last = { key: wk, label: `Week of ${format(parseISO(wk), "d MMMM")}`, items: [] }; g.push(last); }
      last.items.push(e);
    });
    return g;
  }, [list]);

  const ids = [...sel].filter((id) => list.some((e) => e.id === id));
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleGroup = (items: Ev[]) => setSel((p) => {
    const n = new Set(p); const all = items.every((e) => n.has(e.id));
    items.forEach((e) => (all ? n.delete(e.id) : n.add(e.id))); return n;
  });
  const clear = () => setSel(new Set());

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.line }}>
      <div className="px-4 py-2.5 border-b flex items-center gap-3 text-sm min-h-[48px]" style={{ borderColor: C.line, background: ids.length ? "#FFFBEB" : undefined }}>
        {ids.length ? (
          <>
            <span className="font-medium" style={{ color: C.ink }}>{ids.length} selected</span>
            <select defaultValue="" onChange={(ev) => { if (ev.target.value) { onBulkStatus(ids, ev.target.value as PostStatus); ev.target.value = ""; } }}
              className="px-2 py-1 rounded-lg border text-sm bg-white" style={{ borderColor: C.line }} aria-label="Set status">
              <option value="">Set status…</option>
              {STATUS_IDS.map((s) => <option key={s} value={s}>{STATUSES[s].label}</option>)}
            </select>
            <BulkOwner onPick={(o) => onBulkOwner(ids, o)} />
            <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: C.line }}>
              <span className="px-2 text-xs" style={{ color: C.sub }}>Move</span>
              {[-7, -1, 1, 7].map((d) => (
                <button key={d} type="button" onClick={() => onBulkShift(ids, d)} className="px-2 py-1 text-xs font-medium border-l hover:bg-stone-50" style={{ borderColor: C.line, color: C.ink }}>
                  {d > 0 ? `+${d}` : d}d
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { onBulkDelete(ids); clear(); }} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm hover:bg-red-50" style={{ color: "#B91C1C" }}>
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button type="button" onClick={clear} className="ml-auto inline-flex items-center gap-1 text-sm" style={{ color: C.sub }}><X className="w-4 h-4" /> Clear</button>
          </>
        ) : (
          <>
            <span style={{ color: C.sub }}>{list.length} {showPast ? "items" : "coming up or still open"}</span>
            {pastCount > 0 && (
              <label className="ml-auto flex items-center gap-2 cursor-pointer" style={{ color: C.sub }}>
                <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="accent-amber-500" />
                Include past ({pastCount})
              </label>
            )}
          </>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm" style={{ color: C.sub }}>{filtersActive ? "Nothing matches these filters." : "Nothing coming up yet."}</p>
          {!filtersActive && <button type="button" onClick={onCreate} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: C.accent }}>Add something</button>}
        </div>
      ) : groups.map((g) => (
        <div key={g.key}>
          <div className="px-4 py-2 flex items-center gap-3 sticky top-0 z-[1] border-b" style={{ background: "#FAF9F6", borderColor: C.lineSoft }}>
            <input type="checkbox" aria-label={`Select ${g.label}`} className="accent-amber-500"
              checked={g.items.every((e) => sel.has(e.id))} onChange={() => toggleGroup(g.items)} />
            <span className="text-xs font-semibold" style={{ color: C.sub }}>{g.label}</span>
            <span className="text-xs" style={{ color: C.faint }}>{g.items.length}</span>
          </div>
          {g.items.map((e) => {
            const overdue = e.type === "Post" && e.meta.status && e.meta.status !== "posted" && e.date < today;
            return (
              <div key={e.id} className="px-4 py-2.5 flex items-start gap-3 border-b hover:bg-stone-50/60" style={{ borderColor: C.lineSoft, background: sel.has(e.id) ? "#FFFBEB" : undefined }}>
                <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggle(e.id)} className="mt-1 accent-amber-500" aria-label={`Select ${e.title}`} />
                <div className="w-[92px] flex-shrink-0">
                  <p className="text-[13px] font-medium tabular-nums" style={{ color: e.date === today ? C.accentInk : C.ink }}>{format(parseISO(e.date), "EEE d MMM")}</p>
                  <p className="text-[11px]" style={{ color: overdue ? "#B91C1C" : C.faint }}>{overdue ? "Overdue" : relDay(e.date)}</p>
                </div>
                <button type="button" onClick={() => onOpen(e)} className="flex-1 min-w-0 text-left">
                  <p className="text-[13.5px] font-medium leading-snug flex items-center gap-1.5" style={{ color: C.ink }}>
                    <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: e.color }} />
                    <EventTitle e={e} className="truncate" />
                  </p>
                  <div className="flex items-center gap-x-3 gap-y-1 mt-1 flex-wrap text-[11.5px]" style={{ color: C.sub }}>
                    <CampaignTag c={e.meta.campaign} />
                    <span className="inline-flex items-center gap-1">{e.type === "Post" && <FormatIcon format={e.meta.format} />}{e.type === "Post" ? e.meta.format || "Post" : EVENT_LABELS[e.type]}</span>
                    <PlatformBadges platforms={e.meta.platforms} story={e.meta.story} />
                    <span>{timeLabel(e)}</span>
                    <OwnerBadge id={e.meta.owner} name />
                    {(() => { const cd = countdown(e); return cd && cd.n >= 0 ? <span className="font-semibold tabular-nums" style={{ color: e.color }} title={cd.label}>{cd.short}</span> : null; })()}
                    {e.meta.needs && e.meta.status !== "posted" && (
                      <span className="inline-flex items-center gap-1" style={{ color: "#8A4B06" }}><AlertTriangle className="w-3 h-3" />{e.meta.needs}</span>
                    )}
                  </div>
                </button>
                {e.type === "Post" && (
                  <select value={e.meta.status || "idea"} onChange={(ev) => onStatus(e.id, ev.target.value as PostStatus)} aria-label="Status"
                    className="text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer flex-shrink-0"
                    style={{ background: STATUSES[e.meta.status || "idea"].bg, color: STATUSES[e.meta.status || "idea"].color }}>
                    {STATUS_IDS.map((s) => <option key={s} value={s}>{STATUSES[s].label}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** "Assign to…" for selected rows; resets after each pick so it can be reused. */
function BulkOwner({ onPick }: { onPick: (owner: string) => void }) {
  const [k, setK] = useState(0);
  return (
    <span className="relative inline-flex">
      <span className="absolute inset-0 px-2 py-1 text-sm pointer-events-none rounded-lg border bg-white" style={{ borderColor: C.line, color: C.ink }}>Assign to…</span>
      <OwnerSelect key={k} value="" onChange={(o) => { onPick(o); setK((n) => n + 1); }} className="opacity-0 px-2 py-1 text-sm w-[110px] cursor-pointer" />
    </span>
  );
}
