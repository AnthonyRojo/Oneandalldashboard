"use client";

import { useState } from "react";
import { useDrop } from "react-dnd";
import { format, parseISO, subDays } from "date-fns";
import { AlertTriangle, Plus } from "lucide-react";
import { STATUSES, STATUS_IDS, type PostStatus } from "@/lib/calendar-meta";
import { C, dkey, relDay, countdown, readiness, type Ev } from "./utils";
import { DND_EVENT, useEventDrag, type DragItem, CampaignTag, FormatIcon, PlatformBadges, OwnerBadge } from "./ui";

interface Props {
  events: Ev[];
  today: string;
  onOpen: (e: Ev) => void;
  onStatus: (id: string, s: PostStatus) => void;
  onCreate: (status: PostStatus) => void;
}

export default function BoardView({ events, today, onOpen, onStatus, onCreate }: Props) {
  const [showOld, setShowOld] = useState(false);
  const cutoff = dkey(subDays(new Date(), 14));
  const posts = events.filter((e) => e.type === "Post");
  const visible = posts.filter((e) => showOld || e.meta.status !== "posted" || e.date >= cutoff);
  const hiddenOld = posts.length - visible.length;
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1 text-sm" style={{ color: C.sub }}>
        <span>Drag a card to change its status. Showing posts only.</span>
        {(hiddenOld > 0 || showOld) && (
          <button type="button" onClick={() => setShowOld((v) => !v)} className="font-medium hover:underline" style={{ color: C.accentInk }}>
            {showOld ? "Hide older posted" : `Show ${hiddenOld} older posted`}
          </button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {STATUS_IDS.map((s) => {
          const list = visible.filter((e) => (e.meta.status || "idea") === s);
          return <Column key={s} status={s} events={list} today={today} onOpen={onOpen} onStatus={onStatus} onCreate={onCreate} />;
        })}
      </div>
    </div>
  );
}

function Column({ status, events, today, onOpen, onStatus, onCreate }: {
  status: PostStatus; events: Ev[]; today: string; onOpen: (e: Ev) => void; onStatus: (id: string, s: PostStatus) => void; onCreate: (s: PostStatus) => void;
}) {
  const st = STATUSES[status];
  const [{ isOver }, drop] = useDrop(() => ({
    accept: DND_EVENT, drop: (item: DragItem) => onStatus(item.id, status), collect: (m) => ({ isOver: m.isOver() }),
  }), [status, onStatus]);
  const sorted = [...events].sort((a, b) => (status === "posted" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>} className="snap-start flex-1 min-w-[250px] rounded-2xl flex flex-col"
      style={{ background: isOver ? st.bg : "#F1F0EC", outline: isOver ? `2px dashed ${st.color}` : "none", outlineOffset: -2 }}>
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: st.color }} />
        <span className="text-sm font-semibold" style={{ color: C.ink }}>{st.label}</span>
        <span className="text-xs tabular-nums" style={{ color: C.faint }}>{events.length}</span>
        <button type="button" onClick={() => onCreate(status)} aria-label={`Add a post to ${st.label}`}
          className="ml-auto w-6 h-6 rounded-md inline-flex items-center justify-center hover:bg-white" style={{ color: C.sub }}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <p className="px-3 -mt-1 pb-2 text-[11px]" style={{ color: C.faint }}>{st.hint}</p>
      <div className="px-2 pb-2 flex flex-col gap-2 min-h-[120px] max-h-[64vh] overflow-y-auto">
        {sorted.map((e) => <Card key={e.id} e={e} today={today} onOpen={onOpen} />)}
        {!sorted.length && <p className="text-xs text-center py-6" style={{ color: C.faint }}>Drop posts here</p>}
      </div>
    </div>
  );
}

function Card({ e, today, onOpen }: { e: Ev; today: string; onOpen: (e: Ev) => void }) {
  const { isDragging, dragRef } = useEventDrag(e.id);
  const overdue = e.meta.status !== "posted" && e.date < today;
  const cd = countdown(e);
  const r = readiness(e);
  return (
    <button ref={dragRef} type="button" onClick={() => onOpen(e)}
      className="text-left bg-white rounded-xl p-3 border hover:border-stone-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
      style={{ borderColor: C.line, borderLeft: `3px solid ${e.color}`, opacity: isDragging ? 0.4 : 1, cursor: "grab" }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-medium tabular-nums" style={{ color: overdue ? "#B91C1C" : C.sub }}>
          {format(parseISO(e.date), "EEE d MMM")} · {relDay(e.date)}
        </span>
        {e.meta.format && <span className="text-[10.5px] inline-flex items-center gap-1" style={{ color: C.sub }}><FormatIcon format={e.meta.format} />{e.meta.format}</span>}
      </div>
      <p className="text-[13px] font-medium leading-snug" style={{ color: C.ink }}>{e.title}</p>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <CampaignTag c={e.meta.campaign} />
        <PlatformBadges platforms={e.meta.platforms} story={e.meta.story} />
        {cd && cd.n >= 0 && <span className="text-[10.5px] font-semibold tabular-nums" style={{ color: e.color }} title={cd.label}>{cd.short}</span>}
        {overdue && <span className="inline-flex items-center gap-1 text-[10.5px] font-medium" style={{ color: "#B91C1C" }}><AlertTriangle className="w-3 h-3" />Overdue</span>}
        <span className="ml-auto"><OwnerBadge id={e.meta.owner} name /></span>
      </div>
      {e.meta.needs && e.meta.status !== "posted" && (
        <p className="mt-2 text-[11px] leading-snug rounded-md px-2 py-1" style={{ background: "#FFF6E0", color: "#8A4B06" }}>Needs: {e.meta.needs}</p>
      )}
      {r && e.meta.status !== "posted" && (
        <div className="mt-2 flex items-center gap-2" title={r.checks.filter((c) => !c.ok).map((c) => c.label).join("\n") || "Good to go"}>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#EFEDE7" }}>
            <div className="h-full rounded-full" style={{ width: `${(r.done / r.total) * 100}%`, background: r.done === r.total ? "#15803D" : C.accent }} />
          </div>
          <span className="text-[10px] tabular-nums" style={{ color: C.faint }}>{r.done}/{r.total}</span>
        </div>
      )}
    </button>
  );
}
