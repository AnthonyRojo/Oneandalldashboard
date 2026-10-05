"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ExternalLink } from "lucide-react";
import type { CalendarEvent, TeamMember } from "@/context/AppContext";
import { CAMPAIGNS, engagementRate } from "@/lib/calendar-meta";
import { enrich, safeUrl } from "./utils";

const INK = "#111827", SUB = "#6b7280", FAINT = "#9ca3af", LINE = "#e5e7eb", BAR = "#D97706";
const nf = new Intl.NumberFormat("en-AU");

/** Social results typed in on posted calendar items (Calendar → post → Results). */
export default function SocialAnalytics({ events, members }: { events: CalendarEvent[]; members: TeamMember[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const data = useMemo(() => {
    const posts = events.map(enrich).filter((e) => e.type === "Post");
    const posted = posts.filter((e) => e.meta.status === "posted");
    const measured = posted.filter((e) => e.meta.results?.reach);
    const reach = measured.reduce((n, e) => n + (e.meta.results?.reach || 0), 0);
    const inter = measured.reduce((n, e) => { const r = e.meta.results!; return n + (r.likes || 0) + (r.comments || 0) + (r.saves || 0) + (r.shares || 0); }, 0);
    const byFormat = new Map<string, { sum: number; n: number }>();
    measured.forEach((e) => {
      const k = e.meta.format || "Other"; const cur = byFormat.get(k) || { sum: 0, n: 0 };
      byFormat.set(k, { sum: cur.sum + (engagementRate(e.meta.results) || 0), n: cur.n + 1 });
    });
    const formats = [...byFormat.entries()].map(([f, v]) => ({ f, avg: v.sum / v.n, n: v.n })).sort((a, b) => b.avg - a.avg);
    const top = [...measured].sort((a, b) => (engagementRate(b.meta.results) || 0) - (engagementRate(a.meta.results) || 0)).slice(0, 5);
    const owners = new Map<string, { posted: number; open: number }>();
    posts.forEach((e) => {
      if (!e.meta.owner) return;
      const o = owners.get(e.meta.owner) || { posted: 0, open: 0 };
      if (e.meta.status === "posted") o.posted++; else o.open++;
      owners.set(e.meta.owner, o);
    });
    return { posted: posted.length, measured: measured.length, missingLink: posted.filter((e) => !e.meta.postUrl).length, reach, rate: reach ? (inter / reach) * 100 : null, formats, top, owners };
  }, [events]);

  const max = Math.max(1, ...data.formats.map((f) => f.avg));
  const name = (id: string) => members.find((m) => (m.userId || m.id) === id)?.name || "Former member";

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: INK }}>Social</h2>
          <p className="text-sm" style={{ color: SUB }}>From results added to posted items in the Calendar</p>
        </div>
        {data.missingLink > 0 && <p className="text-xs" style={{ color: SUB }}>{data.missingLink} posted item{data.missingLink === 1 ? " has" : "s have"} no live link yet</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {[
          { label: "Posts published", value: nf.format(data.posted), note: `${data.measured} with results` },
          { label: "Total reach", value: data.reach ? nf.format(data.reach) : "–", note: "Across posts with results" },
          { label: "Engagement rate", value: data.rate !== null ? `${data.rate.toFixed(1)}%` : "–", note: "Likes, comments, saves, shares per 100 reached" },
        ].map((t) => (
          <div key={t.label} className="p-5 rounded-2xl border bg-white" style={{ borderColor: LINE }}>
            <p className="text-sm" style={{ color: SUB }}>{t.label}</p>
            <p className="text-2xl font-semibold tabular-nums mt-1" style={{ color: INK }}>{t.value}</p>
            <p className="text-xs mt-1" style={{ color: FAINT }}>{t.note}</p>
          </div>
        ))}
      </div>

      {data.measured === 0 ? (
        <div className="p-6 rounded-2xl border bg-white text-sm" style={{ borderColor: LINE, color: SUB }}>
          No results yet. Open a posted item in the Calendar and fill in <b style={{ color: INK }}>Results</b> (reach, likes, comments, saves, shares) from Instagram Insights.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border bg-white" style={{ borderColor: LINE }}>
            <h3 className="font-semibold mb-1" style={{ color: INK }}>Engagement rate by format</h3>
            <p className="text-xs mb-4" style={{ color: FAINT }}>Average per post</p>
            <div className="flex flex-col gap-3" role="table" aria-label="Engagement rate by format">
              {data.formats.map((f) => (
                <div key={f.f} role="row" className="grid items-center gap-3" style={{ gridTemplateColumns: "72px 1fr 64px" }}
                  onMouseEnter={() => setHover(f.f)} onMouseLeave={() => setHover(null)}>
                  <span role="cell" className="text-sm" style={{ color: INK }}>{f.f}</span>
                  <div role="cell" className="relative h-5 flex items-center">
                    <div className="h-3 rounded-r" style={{ width: `${(f.avg / max) * 100}%`, minWidth: 4, background: BAR, opacity: hover && hover !== f.f ? 0.45 : 1, transition: "opacity .12s" }} />
                    {hover === f.f && (
                      <span className="absolute left-0 -top-7 z-10 whitespace-nowrap text-xs rounded-md px-2 py-1 shadow" style={{ background: INK, color: "white" }}>
                        {f.f}: {f.avg.toFixed(1)}% avg over {f.n} post{f.n === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <span role="cell" className="text-sm tabular-nums text-right" style={{ color: SUB }}>{f.avg.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl border bg-white" style={{ borderColor: LINE }}>
            <h3 className="font-semibold mb-3" style={{ color: INK }}>Top posts</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs" style={{ color: FAINT }}><th className="font-medium pb-2">Post</th><th className="font-medium pb-2 text-right">Reach</th><th className="font-medium pb-2 text-right">Eng.</th></tr></thead>
              <tbody>
                {data.top.map((e) => (
                  <tr key={e.id} className="border-t" style={{ borderColor: LINE }}>
                    <td className="py-2 pr-2">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: e.meta.campaign ? CAMPAIGNS[e.meta.campaign].color : FAINT }} />
                        <span className="truncate" style={{ color: INK }}>{e.title}</span>
                        {e.meta.postUrl && <a href={safeUrl(e.meta.postUrl)} target="_blank" rel="noopener noreferrer" aria-label="Open live post"><ExternalLink className="w-3.5 h-3.5" style={{ color: SUB }} /></a>}
                      </span>
                      <span className="text-xs" style={{ color: FAINT }}>{format(parseISO(e.date), "d MMM")} · {e.meta.format || "Post"}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums" style={{ color: SUB }}>{nf.format(e.meta.results?.reach || 0)}</td>
                    <td className="py-2 text-right tabular-nums font-medium" style={{ color: INK }}>{(engagementRate(e.meta.results) || 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.owners.size > 0 && (
        <div className="mt-4 p-5 rounded-2xl border bg-white" style={{ borderColor: LINE }}>
          <h3 className="font-semibold mb-3" style={{ color: INK }}>Posts by person</h3>
          <div className="flex flex-wrap gap-2">
            {[...data.owners.entries()].sort((a, b) => b[1].open - a[1].open).map(([id, o]) => (
              <span key={id} className="px-3 py-1.5 rounded-xl text-sm" style={{ background: "#f9fafb", color: INK, border: `1px solid ${LINE}` }}>
                {name(id)} <span className="tabular-nums" style={{ color: SUB }}>· {o.open} to do · {o.posted} posted</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
