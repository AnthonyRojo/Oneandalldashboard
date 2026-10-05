"use client";

import { useMemo, useState } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Check, Copy, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { C, dkey, relDay, timeLabel, isOverdue, readiness, type Ev } from "./utils";
import { CampaignTag, FormatIcon, PlatformBadges, StatusPill } from "./ui";

interface Props {
  all: Ev[];
  today: string;
  onOpen: (e: Ev) => void;
  onPosted: (id: string) => void;
}

/** The "what do I post today?" panel: overdue, today, then the next few days. */
export default function TodayStrip({ all, today, onOpen, onPosted }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { overdue, todays, next } = useMemo(() => {
    const horizon = dkey(addDays(parseISO(today), 7));
    const posts = all.filter((e) => e.type === "Post");
    return {
      overdue: posts.filter((e) => isOverdue(e, today)),
      todays: posts.filter((e) => e.date === today),
      next: posts.filter((e) => e.date > today && e.date <= horizon && e.meta.status !== "posted").slice(0, 4),
    };
  }, [all, today]);
  const left = todays.filter((e) => e.meta.status !== "posted").length;
  if (!overdue.length && !todays.length && !next.length) return null;

  const copy = async (e: Ev) => {
    const text = [e.meta.caption, e.meta.hashtags].filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(text); setCopied(e.id); setTimeout(() => setCopied(null), 1600); } catch { /* clipboard blocked */ }
  };

  const summary = [
    left ? `${left} to post today` : todays.length ? "Today's posts are done" : "Nothing due today",
    overdue.length ? `${overdue.length} overdue` : "",
    next.length ? `${next.length} coming up this week` : "",
  ].filter(Boolean).join(" · ");

  return (
    <section className="mb-4 rounded-2xl border bg-white" style={{ borderColor: C.line }} aria-label="Posting today">
      <button type="button" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
        <span className="text-[14px] font-semibold" style={{ color: C.ink }}>Posting today</span>
        <span className="text-[12.5px] truncate" style={{ color: overdue.length ? "#B91C1C" : C.sub }}>{summary}</span>
        <span className="ml-auto" style={{ color: C.faint }}>{collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</span>
      </button>
      {!collapsed && (
        <div className="flex gap-2.5 overflow-x-auto px-3 pb-3 snap-x">
          {overdue.map((e) => <PostCard key={e.id} e={e} tag="overdue" copied={copied === e.id} onCopy={copy} onOpen={onOpen} onPosted={onPosted} />)}
          {todays.map((e) => <PostCard key={e.id} e={e} tag="today" copied={copied === e.id} onCopy={copy} onOpen={onOpen} onPosted={onPosted} />)}
          {next.map((e) => <PostCard key={e.id} e={e} tag="next" copied={copied === e.id} onCopy={copy} onOpen={onOpen} onPosted={onPosted} />)}
        </div>
      )}
    </section>
  );
}

function PostCard({ e, tag, copied, onCopy, onOpen, onPosted }: {
  e: Ev; tag: "overdue" | "today" | "next"; copied: boolean; onCopy: (e: Ev) => void; onOpen: (e: Ev) => void; onPosted: (id: string) => void;
}) {
  const posted = e.meta.status === "posted";
  const r = readiness(e);
  const when = tag === "overdue" ? `Overdue · ${format(parseISO(e.date), "EEE d MMM")}` : tag === "today" ? `Today · ${timeLabel(e)}` : `${relDay(e.date)} · ${format(parseISO(e.date), "EEE d MMM")}`;
  return (
    <div className="snap-start flex-shrink-0 w-[250px] rounded-xl border p-3 flex flex-col gap-1.5"
      style={{ borderColor: tag === "overdue" ? "#FCA5A5" : C.line, borderLeft: `3px solid ${e.color}`, background: posted ? "#FAFAF8" : "white" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold truncate" style={{ color: tag === "overdue" ? "#B91C1C" : tag === "today" ? C.accentInk : C.sub }}>
          {tag === "overdue" && <AlertTriangle className="w-3 h-3 inline -mt-0.5 mr-1" />}{when}
        </span>
        <StatusPill status={e.meta.status || "idea"} size="xs" />
      </div>
      <button type="button" onClick={() => onOpen(e)} className="text-left text-[13px] font-medium leading-snug line-clamp-2 hover:underline" style={{ color: posted ? C.faint : C.ink }}>
        {e.title}
      </button>
      <div className="flex items-center gap-2 flex-wrap text-[11px]" style={{ color: C.sub }}>
        <span className="inline-flex items-center gap-1"><FormatIcon format={e.meta.format} />{e.meta.format || "Post"}</span>
        <PlatformBadges platforms={e.meta.platforms} story={e.meta.story} />
        <CampaignTag c={e.meta.campaign} />
      </div>
      {e.meta.needs && !posted ? (
        <p className="text-[11px] leading-snug rounded-md px-2 py-1 line-clamp-2" style={{ background: "#FFF6E0", color: "#8A4B06" }}>Needs: {e.meta.needs}</p>
      ) : r && !posted && r.done < r.total ? (
        <p className="text-[11px]" style={{ color: C.faint }}>{r.done} of {r.total} ready</p>
      ) : null}
      {!posted && (
        <div className="flex gap-1.5 mt-auto pt-1">
          <button type="button" onClick={() => onCopy(e)} disabled={!e.meta.caption && !e.meta.hashtags}
            className="flex-1 text-[12px] font-medium px-2 py-1.5 rounded-lg inline-flex items-center justify-center gap-1 disabled:opacity-40"
            style={{ background: "#FFF4D6", color: C.accentInk }} title={e.meta.caption ? "Copy caption + hashtags" : "No caption yet"}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? "Copied" : "Caption"}
          </button>
          <button type="button" onClick={() => onPosted(e.id)}
            className="flex-1 text-[12px] font-medium px-2 py-1.5 rounded-lg inline-flex items-center justify-center gap-1"
            style={{ background: "#EDFAF1", color: "#15803D" }}>
            <Check className="w-3.5 h-3.5" /> Posted
          </button>
        </div>
      )}
    </div>
  );
}
