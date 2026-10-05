"use client";

import { useMemo, useState, useEffect, useRef, memo } from "react";
import { useDrop } from "react-dnd";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, getDay } from "date-fns";
import { Check, Plus, X } from "lucide-react";
import { C, dkey, fmt12, timeLabel, WEEK_OPTS, type Ev } from "./utils";
import { DND_EVENT, useEventDrag, type DragItem, EventTitle, StatusPill } from "./ui";

interface Props {
  cursor: Date;
  byDate: Map<string, Ev[]>;
  today: string;
  onOpen: (e: Ev) => void;
  onCreate: (date: string) => void;
  onDrop: (id: string, date: string) => void;
}

const MAX = 4;

export default function MonthView({ cursor, byDate, today, onOpen, onCreate, onDrop }: Props) {
  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), WEEK_OPTS),
    end: endOfWeek(endOfMonth(cursor), WEEK_OPTS),
  }), [cursor]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = days.length / 7;

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.line }}>
      <div className="grid grid-cols-7 border-b" style={{ borderColor: C.line }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
          <div key={d} className="px-2.5 py-2 text-xs font-medium" style={{ color: i >= 5 ? C.faint : C.sub }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
        {days.map((day, i) => {
          const k = dkey(day);
          return (
            <MonthCell key={k} dateKey={k} day={day} events={byDate.get(k) || []}
              inMonth={isSameMonth(day, cursor)} isToday={k === today} isPast={k < today}
              lastCol={i % 7 === 6} lastRow={i >= days.length - 7}
              expanded={expanded === k} setExpanded={setExpanded}
              onOpen={onOpen} onCreate={onCreate} onDrop={onDrop} />
          );
        })}
      </div>
    </div>
  );
}

function MonthCell({ dateKey, day, events, inMonth, isToday, isPast, lastCol, lastRow, expanded, setExpanded, onOpen, onCreate, onDrop }: {
  dateKey: string; day: Date; events: Ev[]; inMonth: boolean; isToday: boolean; isPast: boolean; lastCol: boolean; lastRow: boolean;
  expanded: boolean; setExpanded: (k: string | null) => void;
  onOpen: (e: Ev) => void; onCreate: (d: string) => void; onDrop: (id: string, d: string) => void;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: DND_EVENT,
    drop: (item: DragItem) => onDrop(item.id, dateKey),
    collect: (m) => ({ isOver: m.isOver() }),
  }), [dateKey, onDrop]);
  const weekend = getDay(day) === 0 || getDay(day) === 6;
  const shown = events.length > MAX ? events.slice(0, MAX - 1) : events;
  const hidden = events.length - shown.length;

  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>}
      onClick={() => onCreate(dateKey)}
      className="group relative min-h-[76px] sm:min-h-[128px] p-1.5 cursor-pointer"
      style={{
        borderRight: lastCol ? "none" : `1px solid ${C.lineSoft}`,
        borderBottom: lastRow ? "none" : `1px solid ${C.lineSoft}`,
        background: isOver ? "#FFF7D6" : weekend ? "#FBFAF7" : "white",
        outline: isOver ? `2px dashed ${C.accent}` : "none", outlineOffset: -3,
      }}>
      <div className="flex items-center justify-between mb-1 px-0.5">
        <span className="text-[13px] tabular-nums w-7 h-7 inline-flex items-center justify-center rounded-full"
          style={{
            background: isToday ? C.today : "transparent",
            color: isToday ? "#1F2328" : !inMonth ? "#C9CCD2" : isPast ? C.faint : C.ink,
            fontWeight: isToday ? 700 : 500,
          }}>
          {format(day, "d")}
        </span>
        <span className="hidden sm:inline-flex w-6 h-6 rounded-md items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.accentInk, background: "#FFF4D6" }} aria-hidden>
          <Plus className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Desktop pills */}
      <div className="hidden sm:flex flex-col gap-[3px]" style={{ opacity: inMonth ? 1 : 0.5 }}>
        {shown.map((e) => <MemoPill key={e.id} e={e} onOpen={onOpen} />)}
        {hidden > 0 && (
          <button type="button" onClick={(ev) => { ev.stopPropagation(); setExpanded(dateKey); }}
            className="text-left text-[11px] font-medium px-1.5 py-0.5 rounded hover:bg-stone-100" style={{ color: C.sub }}>
            {hidden} more
          </button>
        )}
      </div>

      {/* Phone: coloured bars */}
      <div className="flex sm:hidden flex-col gap-0.5" onClick={(ev) => { if (events.length) { ev.stopPropagation(); setExpanded(dateKey); } }}>
        {events.slice(0, 3).map((e) => <span key={e.id} className="h-1.5 rounded-full" style={{ background: e.color, opacity: e.meta.status === "posted" ? 0.35 : 1 }} />)}
        {events.length > 3 && <span className="text-[10px]" style={{ color: C.sub }}>+{events.length - 3}</span>}
      </div>

      {expanded && <DayPopover dateKey={dateKey} day={day} events={events} onClose={() => setExpanded(null)} onOpen={onOpen} onCreate={onCreate} alignRight={lastCol} />}
    </div>
  );
}

function DayPopover({ dateKey, day, events, onClose, onOpen, onCreate, alignRight }: {
  dateKey: string; day: Date; events: Ev[]; onClose: () => void; onOpen: (e: Ev) => void; onCreate: (d: string) => void; alignRight: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey, true); };
  }, [onClose]);
  return (
    <div ref={ref} onClick={(e) => e.stopPropagation()}
      className={`absolute top-1 z-30 w-[280px] max-w-[85vw] bg-white rounded-xl border shadow-2xl p-2 cursor-default ${alignRight ? "right-1" : "left-1"}`}
      style={{ borderColor: C.line }}>
      <div className="flex items-center justify-between px-1.5 pb-1.5">
        <p className="text-sm font-semibold" style={{ color: C.ink }}>{format(day, "EEEE d MMMM")}</p>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-stone-100"><X className="w-4 h-4" style={{ color: C.sub }} /></button>
      </div>
      <div className="flex flex-col gap-1 max-h-[320px] overflow-y-auto">
        {events.map((e) => (
          <button key={e.id} type="button" onClick={() => { onClose(); onOpen(e); }}
            className="text-left rounded-lg px-2 py-1.5 hover:bg-stone-50 border-l-[3px]" style={{ borderColor: e.color }}>
            <p className="text-[13px] font-medium leading-snug"><EventTitle e={e} /></p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px]" style={{ color: C.sub }}>{timeLabel(e)}</span>
              {e.type === "Post" && <StatusPill status={e.meta.status} size="xs" />}
            </div>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => { onClose(); onCreate(dateKey); }}
        className="mt-1.5 w-full text-sm font-medium rounded-lg py-1.5 flex items-center justify-center gap-1.5 hover:bg-amber-50" style={{ color: C.accentInk }}>
        <Plus className="w-4 h-4" /> Add to this day
      </button>
    </div>
  );
}

function Pill({ e, onOpen }: { e: Ev; onOpen: (e: Ev) => void }) {
  const { isDragging, dragRef } = useEventDrag(e.id);
  const posted = e.meta.status === "posted";
  const isEvent = e.type !== "Post";
  return (
    <button ref={dragRef} type="button" onClick={(ev) => { ev.stopPropagation(); onOpen(e); }}
      title={`${e.title} · ${timeLabel(e)}`}
      className="w-full text-left rounded-[5px] px-1.5 py-[3px] text-[11.5px] leading-[15px] flex items-center gap-1 min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
      style={{
        background: isEvent ? e.color : `${e.color}14`,
        color: isEvent ? "white" : C.ink,
        borderLeft: isEvent ? "none" : `3px solid ${e.color}`,
        borderTopLeftRadius: isEvent ? undefined : 2, borderBottomLeftRadius: isEvent ? undefined : 2,
        opacity: isDragging ? 0.35 : posted ? 0.6 : 1,
        cursor: "grab",
      }}>
      {posted && <Check className="w-3 h-3 flex-shrink-0" style={{ color: e.color }} />}
      {!e.meta.tbc && e.start && <span className="flex-shrink-0 font-semibold tabular-nums" style={{ color: isEvent ? "rgba(255,255,255,.85)" : e.color }}>{fmt12(e.start)}</span>}
      <span className="truncate" style={{ textDecoration: posted ? "line-through" : undefined }}>{e.title}</span>
    </button>
  );
}
const MemoPill = memo(Pill);
