"use client";

import { useMemo, useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths, differenceInCalendarDays, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { CAMPAIGNS, CAMPAIGN_IDS, type CampaignId } from "@/lib/calendar-meta";
import { C, dkey, isOverdue, WEEK_OPTS, type Ev } from "./utils";

interface Props {
  all: Ev[];
  today: string;
  cursor: Date;
  hidden: CampaignId[];
  hideNoCampaign: boolean;
  onToggleCampaign: (c: CampaignId) => void;
  onOnlyCampaign: (c: CampaignId) => void;
  onToggleNoCampaign: () => void;
  onJump: (date: string) => void;
  onOpen: (e: Ev) => void;
}

export default function Sidebar({ all, today, cursor, hidden, hideNoCampaign, onToggleCampaign, onOnlyCampaign, onToggleNoCampaign, onJump, onOpen }: Props) {
  const attention = useMemo(() => {
    const soon = dkey(addDays(new Date(), 14));
    return all.filter((e) => isOverdue(e, today) || (e.meta.status === "waiting" && e.date <= soon))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [all, today]);

  const stats = useMemo(() => CAMPAIGN_IDS.map((c) => {
    const posts = all.filter((e) => e.meta.campaign === c && e.type === "Post");
    return { c, total: posts.length, posted: posts.filter((e) => e.meta.status === "posted").length, ready: posts.filter((e) => e.meta.status === "ready").length, any: all.some((e) => e.meta.campaign === c) };
  }), [all]);
  const noCampaignCount = all.filter((e) => !e.meta.campaign).length;

  return (
    <aside className="flex flex-col gap-4">
      <MiniMonth cursor={cursor} today={today} all={all} onJump={onJump} />

      <section className="bg-white rounded-2xl border p-3" style={{ borderColor: C.line }}>
        <h3 className="text-sm font-semibold px-1 mb-2" style={{ color: C.ink }}>Campaigns</h3>
        <div className="flex flex-col gap-1">
          {stats.filter((s) => s.any || s.c === "fashionable" || s.c === "hub-after-hours").map(({ c, total, posted, ready }) => {
            const k = CAMPAIGNS[c];
            const off = hidden.includes(c);
            const days = k.date ? differenceInCalendarDays(parseISO(k.date), new Date()) : null;
            return (
              <div key={c} className="group rounded-xl px-2 py-2 hover:bg-stone-50" style={{ opacity: off ? 0.5 : 1 }}>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-[4px] flex-shrink-0" style={{ background: k.color }} />
                  <button type="button" onClick={() => onOnlyCampaign(c)} className="text-[13px] font-medium truncate text-left hover:underline" style={{ color: C.ink }} title="Show only this campaign">
                    {k.label}
                  </button>
                  <button type="button" onClick={() => onToggleCampaign(c)} aria-label={off ? `Show ${k.label}` : `Hide ${k.label}`} title={off ? "Show" : "Hide"}
                    className="ml-auto w-6 h-6 rounded-md inline-flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-white" style={{ color: C.sub }}>
                    {off ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {days !== null && days >= 0 && (
                  <p className="pl-5 text-[12px] font-semibold tabular-nums" style={{ color: k.color }}>
                    {days === 0 ? `The ${k.dateLabel} is today` : `${days} days to the ${k.dateLabel}`}
                  </p>
                )}
                {total > 0 && (
                  <div className="mt-1.5 pl-5">
                    <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: "#EFEDE7" }}>
                      <div style={{ width: `${(posted / total) * 100}%`, background: k.color }} />
                      <div style={{ width: `${(ready / total) * 100}%`, background: `${k.color}55` }} />
                    </div>
                    <p className="text-[11px] mt-1 tabular-nums" style={{ color: C.sub }}>{posted} of {total} posted · {ready} ready</p>
                  </div>
                )}
              </div>
            );
          })}
          {noCampaignCount > 0 && (
            <button type="button" onClick={onToggleNoCampaign} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-stone-50 text-left" style={{ opacity: hideNoCampaign ? 0.5 : 1 }}>
              <span className="w-3 h-3 rounded-[4px] border" style={{ borderColor: C.faint }} />
              <span className="text-[13px]" style={{ color: C.sub }}>No campaign</span>
              <span className="ml-auto text-[11px]" style={{ color: C.faint }}>{noCampaignCount}</span>
            </button>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl border p-3" style={{ borderColor: C.line }}>
        <h3 className="text-sm font-semibold px-1 mb-1 flex items-center gap-1.5" style={{ color: C.ink }}>
          Needs attention {attention.length > 0 && <span className="text-[11px] font-semibold rounded-full px-1.5" style={{ background: "#FFF1D6", color: "#A15C07" }}>{attention.length}</span>}
        </h3>
        {attention.length === 0 ? (
          <p className="text-[12.5px] px-1 py-2" style={{ color: C.sub }}>Nothing overdue or blocked in the next two weeks.</p>
        ) : (
          <div className="flex flex-col">
            {attention.slice(0, 7).map((e) => {
              const overdue = isOverdue(e, today);
              return (
                <button key={e.id} type="button" onClick={() => onOpen(e)} className="text-left rounded-lg px-1.5 py-1.5 hover:bg-stone-50 flex gap-2">
                  <span className="w-1 rounded-full flex-shrink-0" style={{ background: e.color }} />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium truncate" style={{ color: C.ink }}>{e.title}</span>
                    <span className="block text-[11px] truncate" style={{ color: overdue ? "#B91C1C" : "#8A4B06" }}>
                      {overdue ? <><AlertTriangle className="w-3 h-3 inline -mt-0.5 mr-0.5" />Overdue · {format(parseISO(e.date), "d MMM")}</> : <>{format(parseISO(e.date), "d MMM")} · {e.meta.needs || "Waiting on something"}</>}
                    </span>
                  </span>
                </button>
              );
            })}
            {attention.length > 7 && <p className="text-[11px] px-1.5 pt-1" style={{ color: C.faint }}>+{attention.length - 7} more in List view</p>}
          </div>
        )}
      </section>
    </aside>
  );
}

function MiniMonth({ cursor, today, all, onJump }: { cursor: Date; today: string; all: Ev[]; onJump: (d: string) => void }) {
  const [month, setMonth] = useState(startOfMonth(cursor));
  const [seen, setSeen] = useState(dkey(cursor));
  if (dkey(cursor) !== seen) { setSeen(dkey(cursor)); setMonth(startOfMonth(cursor)); }
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), WEEK_OPTS), end: endOfWeek(endOfMonth(month), WEEK_OPTS) });
  const busy = useMemo(() => new Set(all.map((e) => e.date)), [all]);
  const sel = dkey(cursor);
  return (
    <section className="hidden lg:block bg-white rounded-2xl border p-3" style={{ borderColor: C.line }}>
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-sm font-semibold" style={{ color: C.ink }}>{format(month, "MMMM yyyy")}</span>
        <div className="flex">
          <button type="button" onClick={() => setMonth(subMonths(month, 1))} aria-label="Previous month" className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-stone-100"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month" className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-stone-100"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="text-[10.5px] py-1" style={{ color: C.faint }}>{d}</span>)}
        {days.map((d) => {
          const k = dkey(d);
          const isT = k === today;
          return (
            <button key={k} type="button" onClick={() => onJump(k)} aria-label={format(d, "EEEE d MMMM")}
              className="relative h-8 text-[12px] tabular-nums rounded-full mx-auto w-8 hover:bg-stone-100"
              style={{
                color: !isSameMonth(d, month) ? "#C9CCD2" : C.ink,
                background: isT ? C.today : k === sel ? "#F1F0EC" : undefined,
                fontWeight: isT || k === sel ? 700 : 400,
              }}>
              {format(d, "d")}
              {busy.has(k) && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: isT ? C.ink : C.accent }} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
