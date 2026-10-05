"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { format, startOfWeek, eachDayOfInterval, endOfWeek, getDay } from "date-fns";
import { Check } from "lucide-react";
import { C, dkey, fmt12, timeLabel, toMin, fromMin, WEEK_OPTS, type Ev } from "./utils";
import { DND_EVENT, useEventDrag, type DragItem, StatusPill } from "./ui";

const HOUR = 52; // px per hour
const SNAP = 15;

interface Props {
  cursor: Date;
  byDate: Map<string, Ev[]>;
  today: string;
  onOpen: (e: Ev) => void;
  onCreate: (date: string, start?: string) => void;
  onDrop: (id: string, date: string, start?: string) => void;
}

export default function WeekView({ cursor, byDate, today, onOpen, onCreate, onDrop }: Props) {
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(cursor, WEEK_OPTS), end: endOfWeek(cursor, WEEK_OPTS) }), [cursor]);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = HOUR * 8 - 8; }, []);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const split = days.map((d) => {
    const list = byDate.get(dkey(d)) || [];
    return { key: dkey(d), day: d, untimed: list.filter((e) => e.meta.tbc || !e.start), timed: list.filter((e) => !e.meta.tbc && e.start) };
  });
  const maxUntimed = Math.max(0, ...split.map((s) => s.untimed.length));

  return (
    <div className="bg-white rounded-2xl border overflow-hidden flex flex-col" style={{ borderColor: C.line }}>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Day headers */}
          <div className="grid border-b" style={{ gridTemplateColumns: "56px repeat(7, minmax(0,1fr))", borderColor: C.line }}>
            <div />
            {split.map(({ key, day }) => {
              const isToday = key === today;
              return (
                <div key={key} className="px-2 py-2 flex items-baseline gap-1.5 border-l" style={{ borderColor: C.lineSoft }}>
                  <span className="text-xs font-medium" style={{ color: isToday ? C.accentInk : C.sub }}>{format(day, "EEE")}</span>
                  <span className="text-lg font-semibold tabular-nums w-8 h-8 inline-flex items-center justify-center rounded-full"
                    style={{ background: isToday ? C.today : "transparent", color: key < today ? C.faint : C.ink }}>{format(day, "d")}</span>
                </div>
              );
            })}
          </div>

          {/* Untimed row (posts without a set time, all-day items) */}
          <div className="grid border-b" style={{ gridTemplateColumns: "56px repeat(7, minmax(0,1fr))", borderColor: C.line, background: "#FCFBF8" }}>
            <div className="text-[10px] leading-tight px-1.5 pt-2 text-right" style={{ color: C.faint }}>No set<br />time</div>
            {split.map(({ key, untimed }) => (
              <UntimedCell key={key} dateKey={key} events={untimed} minRows={Math.min(maxUntimed, 4)} onOpen={onOpen} onCreate={onCreate} onDrop={onDrop} />
            ))}
          </div>

          {/* Time grid */}
          <div ref={scrollRef} className="overflow-y-auto relative" style={{ maxHeight: "min(68vh, 760px)" }}>
            <div className="grid relative" style={{ gridTemplateColumns: "56px repeat(7, minmax(0,1fr))", height: HOUR * 24 }}>
              <div className="relative">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="absolute right-2 text-[10px] tabular-nums -translate-y-1/2" style={{ top: h * HOUR, color: C.faint }}>
                    {h === 0 ? "" : fmt12(`${String(h).padStart(2, "0")}:00`)}
                  </div>
                ))}
              </div>
              {split.map(({ key, day, timed }) => (
                <TimeColumn key={key} dateKey={key} weekend={getDay(day) === 0 || getDay(day) === 6} events={timed}
                  nowMin={key === today ? nowMin : null} onOpen={onOpen} onCreate={onCreate} onDrop={onDrop} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UntimedCell({ dateKey, events, minRows, onOpen, onCreate, onDrop }: {
  dateKey: string; events: Ev[]; minRows: number; onOpen: (e: Ev) => void; onCreate: (d: string) => void; onDrop: (id: string, d: string, s?: string) => void;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: DND_EVENT, drop: (item: DragItem) => onDrop(item.id, dateKey), collect: (m) => ({ isOver: m.isOver() }),
  }), [dateKey, onDrop]);
  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>} onClick={() => onCreate(dateKey)}
      className="border-l p-1 flex flex-col gap-[3px] cursor-pointer" style={{ borderColor: C.lineSoft, minHeight: 28 + minRows * 24, background: isOver ? "#FFF7D6" : undefined }}>
      {events.map((e) => <UntimedChip key={e.id} e={e} onOpen={onOpen} />)}
    </div>
  );
}

function UntimedChip({ e, onOpen }: { e: Ev; onOpen: (e: Ev) => void }) {
  const { isDragging, dragRef } = useEventDrag(e.id);
  const posted = e.meta.status === "posted";
  return (
    <button ref={dragRef} type="button" onClick={(ev) => { ev.stopPropagation(); onOpen(e); }} title={e.title}
      className="text-left px-1.5 py-[3px] text-[11.5px] leading-[15px] truncate flex items-center gap-1"
      style={{ background: `${e.color}14`, borderLeft: `3px solid ${e.color}`, borderRadius: "2px 5px 5px 2px", color: C.ink, opacity: isDragging ? 0.35 : posted ? 0.6 : 1, cursor: "grab" }}>
      {posted && <Check className="w-3 h-3 flex-shrink-0" style={{ color: e.color }} />}
      <span className="truncate" style={{ textDecoration: posted ? "line-through" : undefined }}>{e.title}</span>
    </button>
  );
}

/** Assign overlapping events to side-by-side lanes. */
function layout(events: Ev[]) {
  const items = events.map((e) => {
    const s = toMin(e.start);
    const en = Math.max(toMin(e.end || e.start), s + 30);
    return { e, s, en, lane: 0, lanes: 1 };
  }).sort((a, b) => a.s - b.s || b.en - a.en);
  let group: typeof items = [];
  let groupEnd = -1;
  const flush = () => { const n = Math.max(1, ...group.map((g) => g.lane + 1)); group.forEach((g) => (g.lanes = n)); group = []; };
  items.forEach((it) => {
    if (it.s >= groupEnd) { flush(); groupEnd = -1; }
    const used = new Set(group.filter((g) => g.en > it.s).map((g) => g.lane));
    let lane = 0; while (used.has(lane)) lane++;
    it.lane = lane; group.push(it); groupEnd = Math.max(groupEnd, it.en);
  });
  flush();
  return items;
}

function TimeColumn({ dateKey, weekend, events, nowMin, onOpen, onCreate, onDrop }: {
  dateKey: string; weekend: boolean; events: Ev[]; nowMin: number | null;
  onOpen: (e: Ev) => void; onCreate: (d: string, s?: string) => void; onDrop: (id: string, d: string, s?: string) => void;
}) {
  const colRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const minuteAt = (clientY: number) => {
    const r = colRef.current?.getBoundingClientRect();
    if (!r) return 9 * 60;
    return Math.round(((clientY - r.top) / HOUR) * 60 / SNAP) * SNAP;
  };
  const [{ isOver }, drop] = useDrop(() => ({
    accept: DND_EVENT,
    drop: (item: DragItem, monitor) => {
      const off = monitor.getClientOffset();
      onDrop(item.id, dateKey, off ? fromMin(minuteAt(off.y)) : undefined);
    },
    hover: (_i, monitor) => { const off = monitor.getClientOffset(); if (off) setHover(minuteAt(off.y)); },
    collect: (m) => ({ isOver: m.isOver() }),
  }), [dateKey, onDrop]);
  useEffect(() => { if (!isOver) setHover(null); }, [isOver]);

  const placed = layout(events);
  return (
    <div ref={(n) => { colRef.current = n; (drop as unknown as (n: HTMLDivElement | null) => void)(n); }}
      className="relative border-l cursor-pointer" style={{ borderColor: C.lineSoft, background: weekend ? "#FBFAF7" : undefined }}
      onClick={(ev) => { const m = Math.floor(minuteAt(ev.clientY) / 30) * 30; onCreate(dateKey, fromMin(m)); }}>
      {Array.from({ length: 24 }, (_, h) => (
        <div key={h} className="absolute left-0 right-0 border-t" style={{ top: h * HOUR, borderColor: h === 0 ? "transparent" : C.lineSoft }} />
      ))}
      {isOver && hover !== null && (
        <div className="absolute left-1 right-1 rounded-md text-[10px] font-semibold px-1.5 py-0.5 pointer-events-none"
          style={{ top: (hover / 60) * HOUR, background: "#FFF1C2", color: C.accentInk, border: `1px dashed ${C.accent}` }}>
          {fmt12(fromMin(hover))}
        </div>
      )}
      {placed.map(({ e, s, en, lane, lanes }) => (
        <TimedBlock key={e.id} e={e} top={(s / 60) * HOUR} height={Math.max(((en - s) / 60) * HOUR - 2, 22)}
          left={`calc(${(lane / lanes) * 100}% + 2px)`} width={`calc(${100 / lanes}% - 4px)`} onOpen={onOpen} />
      ))}
      {nowMin !== null && (
        <div className="absolute left-0 right-0 pointer-events-none" style={{ top: (nowMin / 60) * HOUR }}>
          <div className="h-[2px]" style={{ background: "#E11D48" }} />
          <div className="absolute -left-1 -top-[4px] w-2.5 h-2.5 rounded-full" style={{ background: "#E11D48" }} />
        </div>
      )}
    </div>
  );
}

function TimedBlock({ e, top, height, left, width, onOpen }: { e: Ev; top: number; height: number; left: string; width: string; onOpen: (e: Ev) => void }) {
  const { isDragging, dragRef } = useEventDrag(e.id);
  const isEvent = e.type !== "Post";
  return (
    <button ref={dragRef} type="button" onClick={(ev) => { ev.stopPropagation(); onOpen(e); }}
      className="absolute text-left rounded-lg px-2 py-1 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
      style={{
        top, height, left, width,
        background: isEvent ? e.color : `${e.color}1F`,
        color: isEvent ? "white" : C.ink,
        borderLeft: isEvent ? "none" : `3px solid ${e.color}`,
        opacity: isDragging ? 0.35 : 1, cursor: "grab", boxShadow: "0 1px 2px rgba(0,0,0,.06)",
      }}>
      <p className="text-[11.5px] font-semibold leading-tight truncate">{e.title}</p>
      {height > 34 && <p className="text-[10.5px] leading-tight mt-0.5 tabular-nums" style={{ opacity: 0.85 }}>{timeLabel(e)}</p>}
      {height > 60 && e.type === "Post" && <div className="mt-1"><StatusPill status={e.meta.status} size="xs" /></div>}
    </button>
  );
}
