"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Clock, Link2, Copy, Check, Pencil, Trash2, FolderOpen, AlertTriangle, CopyPlus } from "lucide-react";
import { STATUSES, STATUS_IDS, type PostStatus } from "@/lib/calendar-meta";
import { C, EVENT_LABELS, relDay, timeLabel, type Ev } from "./utils";
import { Drawer, CloseButton, CampaignTag, IconButton } from "./ui";

interface Props {
  e: Ev;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onStatus: (s: PostStatus) => void;
  onShift: (days: number) => void;
  onJump: () => void;
}

export default function EventDrawer({ e, onClose, onEdit, onDuplicate, onDelete, onStatus, onShift, onJump }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState<"caption" | "tags" | null>(null);
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
            <span className="font-medium">{isPost ? e.meta.format || "Post" : EVENT_LABELS[e.type]}</span>
            <CampaignTag c={e.meta.campaign} short={false} />
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

        {isPost && (e.meta.caption || e.meta.hashtags) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-medium" style={{ color: C.sub }}>Caption</p>
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
            <div className="rounded-xl border p-3 text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ borderColor: C.line, color: C.ink }}>
              {e.meta.caption || <span style={{ color: C.faint }}>No caption yet</span>}
              {e.meta.hashtags && <p className="mt-2" style={{ color: "#1D4ED8" }}>{e.meta.hashtags}</p>}
            </div>
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
