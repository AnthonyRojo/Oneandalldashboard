"use client";

import { useMemo, useState } from "react";
import { useDrop } from "react-dnd";
import { format, parseISO } from "date-fns";
import { Check, Clapperboard, GalleryHorizontalEnd } from "lucide-react";
import { STATUSES } from "@/lib/calendar-meta";
import { C, onIgGrid, sortEv, type Ev } from "./utils";
import { DND_EVENT, useEventDrag, type DragItem, FormatIcon } from "./ui";

interface Props {
  events: Ev[];
  today: string;
  onOpen: (e: Ev) => void;
  /** Swap the dates of two posts (drag one tile onto another). */
  onSwap: (dragId: string, targetId: string) => void;
}

/** Instagram profile grid: newest top-left, exactly as the feed will read. */
export default function GridView({ events, today, onOpen, onSwap }: Props) {
  const [hideIdeas, setHideIdeas] = useState(false);
  const feed = useMemo(() => events.filter(onIgGrid).filter((e) => !hideIdeas || (e.meta.status && e.meta.status !== "idea")).sort((a, b) => sortEv(b, a)), [events, hideIdeas]);
  const live = feed.filter((e) => e.meta.status === "posted").length;
  const firstPast = feed.findIndex((e) => e.date < today || e.meta.status === "posted");

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="w-full max-w-[560px] mx-auto bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.line }}>
        <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: C.lineSoft }}>
          <span className="w-11 h-11 rounded-full flex-shrink-0 p-[2px]" style={{ background: "conic-gradient(#FFD734, #E83686, #FFD734)" }}><span className="block w-full h-full rounded-full bg-white" /></span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: C.ink }}>One &amp; All Hub</p>
            <p className="text-[12px]" style={{ color: C.sub }}>{live} live · {feed.length - live} planned</p>
          </div>
          <label className="ml-auto flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: C.sub }}>
            <input type="checkbox" checked={hideIdeas} onChange={(e) => setHideIdeas(e.target.checked)} className="accent-amber-500" /> Hide ideas
          </label>
        </div>
        {feed.length === 0 ? (
          <p className="p-10 text-center text-sm" style={{ color: C.sub }}>No feed posts here. Stories and EDMs don&apos;t show on the grid.</p>
        ) : (
          <div className="grid grid-cols-3 gap-[2px]" style={{ background: C.lineSoft }}>
            {feed.map((e, i) => <Tile key={e.id} e={e} today={today} divider={i === firstPast && i > 0} onOpen={onOpen} onSwap={onSwap} />)}
          </div>
        )}
      </div>
      <aside className="w-full lg:w-[240px] text-[12.5px] leading-relaxed rounded-2xl border bg-white p-4 flex flex-col gap-2" style={{ borderColor: C.line, color: C.sub }}>
        <p className="font-semibold text-[13px]" style={{ color: C.ink }}>How to use the grid</p>
        <p>Newest is top-left, the way people see your profile. Use it to check that colours and formats alternate well before posts go out.</p>
        <p><b style={{ color: C.ink }}>Drag one tile onto another</b> to swap their dates.</p>
        <p>Add a <b style={{ color: C.ink }}>cover image link</b> when editing a post to see the real thumbnail here.</p>
        <p>Stories and EDMs are left out. Posts without a platform are shown in case they&apos;re for Instagram.</p>
      </aside>
    </div>
  );
}

function Tile({ e, today, divider, onOpen, onSwap }: { e: Ev; today: string; divider: boolean; onOpen: (e: Ev) => void; onSwap: (a: string, b: string) => void }) {
  const { isDragging, dragRef } = useEventDrag(e.id);
  const [{ isOver }, drop] = useDrop(() => ({
    accept: DND_EVENT,
    canDrop: (item: DragItem) => item.id !== e.id,
    drop: (item: DragItem) => onSwap(item.id, e.id),
    collect: (m) => ({ isOver: m.isOver() && m.canDrop() }),
  }), [e.id, onSwap]);
  const posted = e.meta.status === "posted";
  const status = e.meta.status || "idea";
  const Corner = e.meta.format === "Reel" || e.meta.format === "Video" ? Clapperboard : e.meta.format === "Carousel" ? GalleryHorizontalEnd : null;
  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>} className="relative" style={{ outline: isOver ? `3px solid ${C.accent}` : "none", outlineOffset: -3, zIndex: isOver ? 1 : 0 }}>
      {divider && <span className="absolute -top-[2px] left-0 right-0 h-[2px] z-10" style={{ background: C.accent }} aria-hidden />}
      <button ref={dragRef} type="button" onClick={() => onOpen(e)} title={`${e.title} · ${format(parseISO(e.date), "EEE d MMM")} · ${STATUSES[status].label}`}
        className="relative block w-full overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
        style={{ aspectRatio: "3 / 4", opacity: isDragging ? 0.4 : 1, cursor: "grab", background: `${e.color}1A` }}>
        {e.meta.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.meta.cover} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 text-center" style={{ color: e.color }}>
            <FormatIcon format={e.meta.format} className="w-5 h-5" />
            <span className="text-[11px] sm:text-[12px] font-semibold leading-tight line-clamp-4" style={{ color: C.ink }}>{e.title}</span>
          </span>
        )}
        {Corner && <Corner className="absolute top-1.5 right-1.5 w-4 h-4 drop-shadow" style={{ color: e.meta.cover ? "white" : e.color }} aria-hidden />}
        <span className="absolute left-1 bottom-1 right-1 flex items-center gap-1">
          <span className="px-1.5 py-px rounded text-[10px] font-semibold tabular-nums" style={{ background: "rgba(255,255,255,.92)", color: posted ? "#15803D" : e.date < today ? "#B91C1C" : C.ink }}>
            {posted && <Check className="w-2.5 h-2.5 inline -mt-px mr-0.5" />}{format(parseISO(e.date), "d MMM")}
          </span>
          {!posted && <span className="px-1.5 py-px rounded text-[10px] font-medium truncate" style={{ background: STATUSES[status].bg, color: STATUSES[status].color }}>{STATUSES[status].label}</span>}
        </span>
        {status === "idea" && <span className="absolute inset-0 border-2 border-dashed pointer-events-none" style={{ borderColor: `${e.color}66` }} aria-hidden />}
      </button>
    </div>
  );
}
