"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO, addWeeks } from "date-fns";
import { Check, Trash2 } from "lucide-react";
import type { EventType } from "@/context/AppContext";
import DatePicker from "@/components/ui/DatePicker";
import {
  CAMPAIGNS, CAMPAIGN_IDS, STATUSES, STATUS_IDS, FORMATS, LOCKED_HASHTAGS, CAMPAIGN_HASHTAGS, PLATFORMS, PLATFORM_IDS, POST_TIMES, IG,
  type PostFormat, type PostStatus,
} from "@/lib/calendar-meta";
import { C, EVENT_COLORS, EVENT_ICONS, EVENT_LABELS, EVENT_TYPES, FORMAT_ICONS, addMinutes, toMin, hashtagCount, type FormValues } from "./utils";
import { Drawer, CloseButton, Kbd, OwnerSelect, usePeople } from "./ui";
import CoverInput from "./CoverInput";

interface Props {
  mode: "create" | "edit";
  initial: FormValues;
  onCancel: () => void;
  onSave: (v: FormValues) => Promise<void>;
  onDelete?: () => void;
}

const label = "block text-[12px] font-medium mb-1.5";
const input = "w-full px-3 py-2 border rounded-xl text-[13.5px] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 bg-white";

export default function EventForm({ mode, initial, onCancel, onSave, onDelete }: Props) {
  const [v, setV] = useState<FormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const set = (p: Partial<FormValues>) => setV((s) => ({ ...s, ...p }));

  const errors = {
    title: !v.title.trim() ? "Give it a title" : "",
    date: !v.date ? "Pick a date" : "",
    time: !v.tbc && v.end && v.start && toMin(v.end) < toMin(v.start) ? "End time is before the start time" : "",
  };
  const valid = !errors.title && !errors.date && !errors.time;
  const isPost = v.type === "Post";

  const submit = async () => {
    setTried(true);
    if (!valid || saving) return;
    setSaving(true);
    try { await onSave(v); } finally { setSaving(false); }
  };

  const changeStart = (start: string) => {
    const dur = v.start && v.end ? Math.max(toMin(v.end) - toMin(v.start), 15) : 60;
    set({ start, end: addMinutes(start, dur) });
  };
  const changeType = (type: EventType) => set({ type, tbc: type === "Post" ? v.tbc : false, platforms: type === "Post" && !v.platforms.length ? ["instagram"] : v.platforms });
  const togglePlatform = (p: (typeof PLATFORM_IDS)[number]) => set({ platforms: v.platforms.includes(p) ? v.platforms.filter((x) => x !== p) : [...v.platforms, p] });
  const tagCount = hashtagCount(v.hashtags);
  const { meId } = usePeople();
  const addLockedTags = () => {
    const extra = v.campaign ? CAMPAIGN_HASHTAGS[v.campaign] : "";
    const want = `${LOCKED_HASHTAGS}${extra ? ` ${extra}` : ""}`.split(" ");
    const have = new Set(v.hashtags.split(/\s+/).filter(Boolean));
    set({ hashtags: [...have, ...want.filter((t) => !have.has(t))].join(" ") });
  };
  const dur = toMin(v.end) - toMin(v.start);
  const lastRepeat = v.date && v.repeatWeeks > 1 ? format(addWeeks(parseISO(v.date), v.repeatWeeks - 1), "d MMM") : "";

  return (
    <Drawer onClose={onCancel} label={mode === "edit" ? "Edit" : "New item"} width={500}>
      <div className="flex flex-col h-full" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <h2 className="text-[17px] font-semibold" style={{ color: C.ink }}>{mode === "edit" ? "Edit" : isPost ? "New post" : "New event"}</h2>
          <CloseButton onClick={onCancel} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-5">
          <div>
            <input ref={titleRef} value={v.title} onChange={(e) => set({ title: e.target.value })}
              placeholder={isPost ? "What's the post?" : "What's happening?"} aria-label="Title"
              className="w-full text-[18px] font-medium outline-none border-b-2 pb-2 bg-transparent"
              style={{ borderColor: tried && errors.title ? "#DC2626" : C.line, color: C.ink }} />
            {tried && errors.title && <p className="text-xs mt-1" style={{ color: "#DC2626" }}>{errors.title}</p>}
          </div>

          <div>
            <span className={label} style={{ color: C.sub }}>Type</span>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl" style={{ background: "#F3F2EE" }}>
              {EVENT_TYPES.map((t) => {
                const Icon = EVENT_ICONS[t]; const on = v.type === t;
                return (
                  <button key={t} type="button" onClick={() => changeType(t)} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[13px] font-medium"
                    style={on ? { background: "white", color: EVENT_COLORS[t], boxShadow: "0 1px 2px rgba(0,0,0,.08)" } : { color: C.sub }}>
                    <Icon className="w-3.5 h-3.5" />{EVENT_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className={label} style={{ color: C.sub }}>Campaign</span>
            <div className="flex flex-wrap gap-1.5">
              {CAMPAIGN_IDS.map((c) => {
                const on = v.campaign === c; const k = CAMPAIGNS[c];
                return (
                  <button key={c} type="button" onClick={() => set({ campaign: on ? "" : c })} aria-pressed={on}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors"
                    style={{ borderColor: on ? k.color : C.line, background: on ? `${k.color}14` : "white", color: on ? k.color : C.sub }}>
                    <span className="w-2 h-2 rounded-[3px]" style={{ background: k.color }} />{k.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-medium" style={{ color: C.sub }} htmlFor="oa-owner">{isPost ? "Who's making and posting it" : "Who's in charge"}</label>
              {meId && v.owner !== meId && <button type="button" onClick={() => set({ owner: meId })} className="text-[11.5px] font-medium hover:underline" style={{ color: C.accentInk }}>Assign to me</button>}
            </div>
            <OwnerSelect value={v.owner} onChange={(owner) => set({ owner })} className={input} style={{ borderColor: C.line }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <DatePicker label="Date" value={v.date} onChange={(d) => set({ date: d })} />
              {tried && errors.date && <p className="text-xs mt-1" style={{ color: "#DC2626" }}>{errors.date}</p>}
            </div>
            {mode === "create" && (
              <div>
                <label className={label} style={{ color: C.sub }} htmlFor="oa-repeat">Repeat</label>
                <select id="oa-repeat" value={v.repeatWeeks} onChange={(e) => set({ repeatWeeks: Number(e.target.value) })} className={input} style={{ borderColor: C.line }}>
                  <option value={1}>Doesn&apos;t repeat</option>
                  {[2, 3, 4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>Weekly, {n} times</option>)}
                </select>
                {lastRepeat && <p className="text-[11px] mt-1" style={{ color: C.faint }}>Last one on {lastRepeat}</p>}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium" style={{ color: C.sub }}>Time</span>
              <label className="flex items-center gap-1.5 text-[12.5px] cursor-pointer" style={{ color: C.sub }}>
                <input type="checkbox" checked={v.tbc} onChange={(e) => set({ tbc: e.target.checked })} className="accent-amber-500" /> No set time
              </label>
            </div>
            {!v.tbc && (
              <>
                <div className="flex items-center gap-2">
                  <input type="time" value={v.start} step={900} onChange={(e) => changeStart(e.target.value)} className={input} style={{ borderColor: C.line }} aria-label="Start time" />
                  <span style={{ color: C.faint }}>to</span>
                  <input type="time" value={v.end} step={900} onChange={(e) => set({ end: e.target.value })} className={input} style={{ borderColor: errors.time ? "#DC2626" : C.line }} aria-label="End time" />
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {[30, 60, 90, 120, 180].map((m) => (
                    <button key={m} type="button" onClick={() => set({ end: addMinutes(v.start, m) })}
                      className="px-2.5 py-0.5 rounded-full text-[11.5px] font-medium border"
                      style={{ borderColor: dur === m ? C.accent : C.line, background: dur === m ? "#FFF7E0" : "white", color: dur === m ? C.accentInk : C.sub }}>
                      {m < 60 ? `${m} min` : `${m / 60} hr`}
                    </button>
                  ))}
                </div>
                {errors.time && <p className="text-xs mt-1" style={{ color: "#DC2626" }}>{errors.time}</p>}
              </>
            )}
            {isPost && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[11px] mr-0.5" style={{ color: C.faint }}>Post at</span>
                {POST_TIMES.map(({ time, label: l }) => {
                  const on = !v.tbc && v.start === time;
                  return (
                    <button key={time} type="button" onClick={() => set({ tbc: false, start: time, end: addMinutes(time, 15) })} aria-pressed={on}
                      className="px-2.5 py-0.5 rounded-full text-[11.5px] font-medium border"
                      style={{ borderColor: on ? C.accent : C.line, background: on ? "#FFF7E0" : "white", color: on ? C.accentInk : C.sub }}>
                      {l}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {isPost && (
            <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ background: "#FAF9F6", border: `1px solid ${C.lineSoft}` }}>
              <div>
                <span className={label} style={{ color: C.sub }}>Where it goes</span>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_IDS.map((p) => {
                    const on = v.platforms.includes(p); const k = PLATFORMS[p];
                    return (
                      <button key={p} type="button" onClick={() => togglePlatform(p)} aria-pressed={on}
                        className="px-2.5 py-1 rounded-lg text-[12.5px] font-medium border inline-flex items-center gap-1.5"
                        style={{ borderColor: on ? k.color : C.line, background: on ? `${k.color}12` : "white", color: on ? k.color : C.sub }}>
                        {on && <Check className="w-3.5 h-3.5" />}{k.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <span className={label} style={{ color: C.sub }}>Format</span>
                <div className="flex flex-wrap gap-1.5">
                  {FORMATS.map((f) => {
                    const Icon = FORMAT_ICONS[f];
                    return (
                      <button key={f} type="button" onClick={() => set({ format: v.format === f ? "" : (f as PostFormat) })} aria-pressed={v.format === f}
                        className="px-2.5 py-1 rounded-lg text-[12.5px] font-medium border inline-flex items-center gap-1.5"
                        style={{ borderColor: v.format === f ? C.ink : C.line, background: v.format === f ? C.ink : "white", color: v.format === f ? "white" : C.sub }}>
                        <Icon className="w-3.5 h-3.5" />{f}
                      </button>
                    );
                  })}
                </div>
                {v.format !== "Story" && v.format !== "EDM" && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <label className="flex items-center gap-1.5 text-[12.5px] cursor-pointer" style={{ color: C.sub }} title="Main-feed posts are the ones shown in the Grid view">
                      <input type="checkbox" checked={v.feed} onChange={(e) => set({ feed: e.target.checked })} className="accent-amber-500" /> Goes on the main feed
                    </label>
                    <label className="flex items-center gap-1.5 text-[12.5px] cursor-pointer" style={{ color: C.sub }}>
                      <input type="checkbox" checked={v.story} onChange={(e) => set({ story: e.target.checked })} className="accent-amber-500" /> Share to stories too
                    </label>
                  </div>
                )}
              </div>
              <div>
                <span className={label} style={{ color: C.sub }}>Status</span>
                <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-white border" style={{ borderColor: C.line }}>
                  {STATUS_IDS.map((s) => (
                    <button key={s} type="button" onClick={() => set({ status: s as PostStatus })} title={STATUSES[s].hint}
                      className="rounded-lg py-1.5 text-[11.5px] font-medium"
                      style={v.status === s ? { background: STATUSES[s].bg, color: STATUSES[s].color } : { color: C.sub }}>
                      {STATUSES[s].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-medium" style={{ color: C.sub }} htmlFor="oa-caption">Caption</label>
                  <span className="text-[11px] tabular-nums" style={{ color: v.caption.length > IG.captionMax ? "#DC2626" : C.faint }}>{v.caption.length}/{IG.captionMax}</span>
                </div>
                <textarea id="oa-caption" value={v.caption} onChange={(e) => set({ caption: e.target.value })} rows={5} className={input} style={{ borderColor: C.line }}
                  placeholder="Write it how it'll go out. End with one clear call to action." />
                {v.caption.length > IG.fold && (
                  <p className="text-[11px] mt-1 leading-snug" style={{ color: C.faint }}>
                    Before &ldquo;more&rdquo;: <span style={{ color: C.sub }}>&ldquo;{v.caption.split("\n")[0].slice(0, IG.fold).trimEnd()}…&rdquo;</span>
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-medium" style={{ color: C.sub }} htmlFor="oa-tags">Hashtags</label>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] tabular-nums" style={{ color: tagCount > IG.hashtagMax ? "#DC2626" : C.faint }}>{tagCount}/{IG.hashtagMax}</span>
                    <button type="button" onClick={addLockedTags} className="text-[11.5px] font-medium hover:underline" style={{ color: C.accentInk }}>Add our usual set</button>
                  </span>
                </div>
                <input id="oa-tags" value={v.hashtags} onChange={(e) => set({ hashtags: e.target.value })} className={input} style={{ borderColor: C.line }} placeholder={LOCKED_HASHTAGS} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={label} style={{ color: C.sub }} htmlFor="oa-needs">Waiting on</label>
              <input id="oa-needs" value={v.needs} onChange={(e) => set({ needs: e.target.value })} className={input} style={{ borderColor: C.line }} placeholder="e.g. written consent, footage, sponsor logos" />
            </div>
            <div>
              <label className={label} style={{ color: C.sub }} htmlFor="oa-asset">Where the files are</label>
              <input id="oa-asset" value={v.asset} onChange={(e) => set({ asset: e.target.value })} className={input} style={{ borderColor: C.line }} placeholder="File name, Figma frame or Canva design" />
            </div>
            {isPost && (
              <CoverInput value={v.cover} onChange={(cover) => set({ cover })} />
            )}
            {isPost && v.status === "posted" && (
              <div>
                <label className={label} style={{ color: C.sub }} htmlFor="oa-posturl">Link to the live post</label>
                <input id="oa-posturl" type="url" value={v.postUrl} onChange={(e) => set({ postUrl: e.target.value })} className={input} style={{ borderColor: C.line }} placeholder="https://www.instagram.com/p/…" />
              </div>
            )}
            <div>
              <label className={label} style={{ color: C.sub }} htmlFor="oa-link">Link</label>
              <input id="oa-link" type="url" value={v.link} onChange={(e) => set({ link: e.target.value })} className={input} style={{ borderColor: C.line }} placeholder="Humanitix, Canva, Drive or meeting link" />
            </div>
            <div>
              <label className={label} style={{ color: C.sub }} htmlFor="oa-notes">Notes</label>
              <textarea id="oa-notes" value={v.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} className={input} style={{ borderColor: C.line }} placeholder="Shot list, brief, anything the team should know" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t flex-shrink-0" style={{ borderColor: C.line, background: "#FAFAF8" }}>
          {onDelete && (
            <button type="button" onClick={onDelete} className="px-2.5 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 hover:bg-red-50" style={{ color: "#B91C1C" }}>
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
          <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-[11px]" style={{ color: C.faint }}><Kbd>Ctrl</Kbd><Kbd>Enter</Kbd> to save</span>
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border bg-white text-sm" style={{ borderColor: C.line }}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ background: C.accent, color: "white" }}>
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : v.repeatWeeks > 1 ? `Add ${v.repeatWeeks}` : isPost ? "Add post" : "Add event"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
