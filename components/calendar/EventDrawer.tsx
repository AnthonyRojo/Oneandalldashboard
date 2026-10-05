"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Clock, Link2, Copy, Check, Pencil, Trash2, FolderOpen, AlertTriangle, CopyPlus, Circle, Heart, MessageCircle, Send, Bookmark, Hourglass, UserRound, ExternalLink, BarChart3 } from "lucide-react";
import { STATUSES, STATUS_IDS, IG, RESULT_FIELDS, engagementRate, type EventMeta, type PostResults, type PostStatus } from "@/lib/calendar-meta";
import { C, EVENT_LABELS, relDay, timeLabel, countdown, readiness, hashtagCount, safeUrl, todayStr, type Ev } from "./utils";
import { Drawer, CloseButton, CampaignTag, IconButton, FormatIcon, PlatformBadges, OwnerSelect } from "./ui";

interface Props {
  e: Ev;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onStatus: (s: PostStatus) => void;
  onShift: (days: number) => void;
  onJump: () => void;
  /** Merge fields into the event's metadata (owner, live link, results…) */
  onMeta: (patch: Partial<EventMeta>) => Promise<void>;
}

export default function EventDrawer({ e, onClose, onEdit, onDuplicate, onDelete, onStatus, onShift, onJump, onMeta }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState<"caption" | "tags" | null>(null);
  const [preview, setPreview] = useState(false);
  const cd = countdown(e);
  const r = readiness(e);
  const href = e.link ? (/^https?:\/\//.test(e.link) ? e.link : `https://${e.link}`) : "";
  const isPost = e.type === "Post";
  const copy = async (what: "caption" | "tags") => {
    const text = what === "caption" ? [e.meta.caption, e.meta.hashtags].filter(Boolean).join("\n\n") : e.meta.hashtags || "";
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1600); } catch { /* clipboard blocked */ }
  };

  return (
    <Drawer onClose={onClose} label={e.title}>
      <div className="h-1.5 flex-shrink-0" style={{ background: e.color }} />
      <div className="flex items-start gap-2 px-5 pt-4 pb-3 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap text-[12px]" style={{ color: C.sub }}>
            <span className="font-medium inline-flex items-center gap-1">{isPost && <FormatIcon format={e.meta.format} className="w-3.5 h-3.5" />}{isPost ? e.meta.format || "Post" : EVENT_LABELS[e.type]}</span>
            <CampaignTag c={e.meta.campaign} short={false} />
            <PlatformBadges platforms={e.meta.platforms} story={e.meta.story} />
          </div>
          <h2 className="text-[19px] font-semibold leading-snug" style={{ color: C.ink }}>{e.title}</h2>
        </div>
        <IconButton label="Duplicate" onClick={onDuplicate}><CopyPlus className="w-[18px] h-[18px]" /></IconButton>
        <CloseButton onClick={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-5">
        <div className="flex flex-col gap-2 text-[13.5px]" style={{ color: C.ink }}>
          <div className="flex items-center gap-2.5">
            <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: C.faint }} />
            <button type="button" onClick={onJump} className="hover:underline text-left">{format(parseISO(e.date), "EEEE d MMMM yyyy")}</button>
            <span className="text-[12px]" style={{ color: C.faint }}>{relDay(e.date)}</span>
          </div>
          <div className="flex items-center gap-2.5"><Clock className="w-4 h-4 flex-shrink-0" style={{ color: C.faint }} />{timeLabel(e)}</div>
          <div className="flex items-center gap-2.5">
            <UserRound className="w-4 h-4 flex-shrink-0" style={{ color: C.faint }} />
            <OwnerSelect value={e.meta.owner} onChange={(owner) => onMeta({ owner: owner || undefined })}
              className="text-[13.5px] bg-transparent rounded-md px-1 -ml-1 py-0.5 hover:bg-stone-100 cursor-pointer outline-none focus:ring-2 focus:ring-amber-200" />
          </div>
          {cd && (
            <div className="flex items-center gap-2.5"><Hourglass className="w-4 h-4 flex-shrink-0" style={{ color: C.faint }} /><span className="font-medium" style={{ color: e.color }}>{cd.label}</span></div>
          )}
          {href && (
            <div className="flex items-start gap-2.5">
              <Link2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.faint }} />
              <a href={href} target="_blank" rel="noopener noreferrer" className="underline break-all" style={{ color: "#1D4ED8" }}>{e.link}</a>
            </div>
          )}
          {e.meta.asset && (
            <div className="flex items-start gap-2.5"><FolderOpen className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.faint }} /><span className="break-words">{e.meta.asset}</span></div>
          )}
          <div className="flex items-center gap-1.5 pl-[26px] pt-0.5">
            <span className="text-[12px] mr-1" style={{ color: C.faint }}>Move</span>
            {[[1, "+1 day"], [7, "+1 week"], [-1, "−1 day"]].map(([d, l]) => (
              <button key={d} type="button" onClick={() => onShift(d as number)} className="text-[12px] font-medium px-2 py-0.5 rounded-md border hover:bg-stone-50" style={{ borderColor: C.line, color: C.sub }}>{l}</button>
            ))}
          </div>
        </div>

        {e.meta.needs && e.meta.status !== "posted" && (
          <div className="rounded-xl px-3 py-2.5 flex gap-2 text-[13px]" style={{ background: "#FFF6E0", color: "#7A4205" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span><b className="font-semibold">Needs:</b> {e.meta.needs}</span>
          </div>
        )}

        {isPost && (
          <div>
            <p className="text-[12px] font-medium mb-2" style={{ color: C.sub }}>Status</p>
            <div className="grid grid-cols-5 gap-1 p-1 rounded-xl" style={{ background: "#F3F2EE" }} role="radiogroup" aria-label="Status">
              {STATUS_IDS.map((s) => {
                const on = (e.meta.status || "idea") === s;
                return (
                  <button key={s} type="button" role="radio" aria-checked={on} onClick={() => onStatus(s)} title={STATUSES[s].hint}
                    className="rounded-lg py-1.5 text-[11.5px] font-medium leading-tight transition-colors"
                    style={on ? { background: "white", color: STATUSES[s].color, boxShadow: "0 1px 2px rgba(0,0,0,.08)" } : { color: C.sub }}>
                    {STATUSES[s].label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isPost && e.meta.status === "posted" && <Results key={e.id} e={e} onMeta={onMeta} />}

        {r && e.meta.status !== "posted" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-medium" style={{ color: C.sub }}>Ready to post?</p>
              <span className="text-[11.5px] font-medium tabular-nums" style={{ color: r.done === r.total ? "#15803D" : C.sub }}>{r.done === r.total ? "Good to go" : `${r.done} of ${r.total}`}</span>
            </div>
            <ul className="rounded-xl border divide-y text-[12.5px]" style={{ borderColor: C.line }}>
              {[...r.checks].sort((a, b) => Number(a.ok) - Number(b.ok)).map((c) => (
                <li key={c.label} className="flex items-start gap-2 px-3 py-1.5" style={{ borderColor: C.lineSoft, color: c.ok ? C.sub : C.ink }}>
                  {c.ok ? <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#15803D" }} /> : <Circle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: C.faint }} />}
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
            {r.done < r.total && <button type="button" onClick={onEdit} className="mt-1.5 text-[12px] font-medium hover:underline" style={{ color: C.accentInk }}>Fill in the gaps</button>}
          </div>
        )}

        {isPost && (e.meta.caption || e.meta.hashtags) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-medium" style={{ color: C.sub }}>Caption</p>
                <div className="flex rounded-md p-0.5 text-[11px] font-medium" style={{ background: "#F3F2EE" }}>
                  {(["Text", "Preview"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setPreview(t === "Preview")} aria-pressed={preview === (t === "Preview")}
                      className="px-1.5 py-0.5 rounded" style={preview === (t === "Preview") ? { background: "white", color: C.ink } : { color: C.sub }}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                {e.meta.hashtags && (
                  <button type="button" onClick={() => copy("tags")} className="text-[12px] font-medium px-2 py-1 rounded-md hover:bg-stone-100 inline-flex items-center gap-1" style={{ color: C.sub }}>
                    {copied === "tags" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Hashtags
                  </button>
                )}
                <button type="button" onClick={() => copy("caption")} className="text-[12px] font-medium px-2 py-1 rounded-md inline-flex items-center gap-1" style={{ background: "#FFF4D6", color: C.accentInk }}>
                  {copied === "caption" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === "caption" ? "Copied" : "Copy all"}
                </button>
              </div>
            </div>
            {preview ? <IgPreview e={e} /> : (
              <div className="rounded-xl border p-3 text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ borderColor: C.line, color: C.ink }}>
                {e.meta.caption || <span style={{ color: C.faint }}>No caption yet</span>}
                {e.meta.hashtags && <p className="mt-2" style={{ color: "#1D4ED8" }}>{e.meta.hashtags}</p>}
              </div>
            )}
            <p className="text-[11px] mt-1.5 tabular-nums" style={{ color: C.faint }}>
              {(e.meta.caption || "").length}/{IG.captionMax} characters · {hashtagCount(e.meta.hashtags)}/{IG.hashtagMax} hashtags
              {(e.meta.caption || "").length > IG.fold && ` · first ${IG.fold} show before "more"`}
            </p>
          </div>
        )}

        {e.body && (
          <div>
            <p className="text-[12px] font-medium mb-2" style={{ color: C.sub }}>Notes</p>
            <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ color: C.ink }}>{e.body}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-5 py-3 border-t flex-shrink-0" style={{ borderColor: C.line, background: "#FAFAF8" }}>
        {confirm ? (
          <>
            <span className="text-sm mr-auto" style={{ color: "#B91C1C" }}>Delete this for everyone?</span>
            <button type="button" onClick={() => setConfirm(false)} className="px-3 py-2 rounded-xl border bg-white text-sm" style={{ borderColor: C.line }}>Keep</button>
            <button type="button" onClick={onDelete} className="px-3 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "#B91C1C" }}>Delete</button>
          </>
        ) : (
          <>
            <IconButton label="Delete" tone="danger" onClick={() => setConfirm(true)}><Trash2 className="w-[18px] h-[18px]" /></IconButton>
            <span className="mr-auto" />
            {isPost && e.meta.status !== "posted" && (
              <button type="button" onClick={() => onStatus("posted")} className="px-3 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-1.5" style={{ background: "#EDFAF1", color: "#15803D" }}>
                <Check className="w-4 h-4" /> Mark posted
              </button>
            )}
            <button type="button" onClick={onEdit} className="px-4 py-2 rounded-xl text-sm font-medium text-white inline-flex items-center gap-1.5" style={{ background: C.ink }}>
              <Pencil className="w-4 h-4" /> Edit
            </button>
          </>
        )}
      </div>
    </Drawer>
  );
}

/** Roughly how the caption reads in the Instagram feed, cut at the "… more" fold. */
function IgPreview({ e }: { e: Ev }) {
  const [open, setOpen] = useState(false);
  const full = [e.meta.caption, e.meta.hashtags].filter(Boolean).join("\n\n");
  const firstLine = full.split("\n")[0];
  const cut = Math.min(IG.fold, firstLine.length);
  const folded = full.length > cut;
  return (
    <div className="rounded-xl border overflow-hidden text-[13px]" style={{ borderColor: C.line, color: "#111" }}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: "conic-gradient(#FFD734, #E83686, #FFD734)", padding: 2 }}><span className="block w-full h-full rounded-full bg-white" /></span>
        <span className="font-semibold text-[12.5px]">One &amp; All Hub</span>
      </div>
      <div className="aspect-square flex flex-col items-center justify-center gap-1.5 text-[12px]" style={{ background: `${e.color}14`, color: e.color }}>
        <FormatIcon format={e.meta.format} className="w-6 h-6" />
        <span className="font-medium px-6 text-center">{e.meta.asset || e.title}</span>
      </div>
      <div className="flex items-center gap-3 px-3 pt-2.5" aria-hidden><Heart className="w-5 h-5" /><MessageCircle className="w-5 h-5" /><Send className="w-5 h-5" /><Bookmark className="w-5 h-5 ml-auto" /></div>
      <p className="px-3 pt-2 pb-3 leading-snug whitespace-pre-wrap">
        <span className="font-semibold">One &amp; All Hub</span>{" "}
        {open || !folded ? full : <>{full.slice(0, cut).trimEnd()}… <button type="button" onClick={() => setOpen(true)} style={{ color: "#737373" }}>more</button></>}
      </p>
    </div>
  );
}

/** After it's posted: the live link and the numbers from Instagram Insights. */
function Results({ e, onMeta }: { e: Ev; onMeta: (patch: Partial<EventMeta>) => Promise<void> }) {
  const [url, setUrl] = useState(e.meta.postUrl || "");
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(RESULT_FIELDS.map(({ key }) => [key, e.meta.results?.[key]?.toString() ?? ""])));
  const [saving, setSaving] = useState(false);
  const dirty = url.trim() !== (e.meta.postUrl || "") || RESULT_FIELDS.some(({ key }) => vals[key] !== (e.meta.results?.[key]?.toString() ?? ""));
  const rate = engagementRate(e.meta.results);
  const save = async () => {
    const results: PostResults = {};
    RESULT_FIELDS.forEach(({ key }) => { const n = parseInt(vals[key].replace(/[^0-9]/g, ""), 10); if (!Number.isNaN(n)) results[key] = n; });
    const has = Object.keys(results).length > 0;
    setSaving(true);
    try { await onMeta({ postUrl: url.trim() || undefined, results: has ? { ...results, at: todayStr() } : undefined }); } finally { setSaving(false); }
  };
  return (
    <div className="rounded-xl border p-3 flex flex-col gap-3" style={{ borderColor: C.line, background: "#FAFAF8" }}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium inline-flex items-center gap-1.5" style={{ color: C.sub }}><BarChart3 className="w-3.5 h-3.5" /> Results</p>
        {rate !== null && <span className="text-[12px] font-semibold tabular-nums" style={{ color: "#15803D" }} title="Likes + comments + saves + shares, per 100 people reached">{rate.toFixed(1)}% engagement</span>}
      </div>
      <div className="flex items-center gap-2">
        <input type="url" value={url} onChange={(ev) => setUrl(ev.target.value)} placeholder="Paste the link to the live post" aria-label="Link to the live post"
          className="flex-1 min-w-0 px-2.5 py-1.5 border rounded-lg text-[13px] bg-white outline-none focus:border-amber-400" style={{ borderColor: C.line }} />
        {e.meta.postUrl && (
          <a href={safeUrl(e.meta.postUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-1.5 rounded-lg hover:bg-white" style={{ color: "#1D4ED8" }}>
            Open <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {RESULT_FIELDS.map(({ key, label: l }) => (
          <label key={key} className="flex flex-col gap-0.5">
            <span className="text-[10.5px]" style={{ color: C.faint }}>{l}</span>
            <input inputMode="numeric" value={vals[key]} onChange={(ev) => setVals((v) => ({ ...v, [key]: ev.target.value }))} placeholder="–"
              className="w-full px-1.5 py-1 border rounded-md text-[13px] tabular-nums bg-white outline-none focus:border-amber-400" style={{ borderColor: C.line }} />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: C.faint }}>
          {e.meta.results?.at ? `Numbers from ${format(parseISO(e.meta.results.at), "d MMM")}` : "From Instagram Insights, about a week after posting"}
        </span>
        <button type="button" onClick={save} disabled={!dirty || saving} className="px-3 py-1 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-40" style={{ background: C.ink }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
