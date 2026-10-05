"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check } from "lucide-react";
import { CAMPAIGNS, type CampaignId } from "@/lib/calendar-meta";
import { SCHEDULE_GROUPS, RETIRED_SRCS, scheduleMatcher, type ScheduleItem } from "@/lib/campaign-schedule";
import { C, fmt12, type Ev } from "./utils";
import { Modal, CloseButton, StatusPill } from "./ui";

export interface ImportPlan { create: ScheduleItem[]; update: { id: string; item: ScheduleItem }[]; remove: string[]; }

export default function ImportModal({ existing, onClose, onImport }: { existing: Ev[]; onClose: () => void; onImport: (p: ImportPlan) => Promise<void> }) {
  const match = useMemo(() => scheduleMatcher(existing), [existing]);
  const [picked, setPicked] = useState<Set<CampaignId>>(new Set(SCHEDULE_GROUPS.map((g) => g.id)));
  const [refresh, setRefresh] = useState(false);
  const retired = useMemo(() => RETIRED_SRCS.flatMap((r) => { const e = existing.find((x) => x.meta.src === r.src); return e ? [{ e, why: r.why }] : []; }), [existing]);
  const [dropRetired, setDropRetired] = useState(true);
  const [busy, setBusy] = useState(false);

  const groups = SCHEDULE_GROUPS.filter((g) => picked.has(g.id));
  const plan: ImportPlan = {
    create: groups.flatMap((g) => g.items.filter((s) => !match(s))),
    update: refresh ? groups.flatMap((g) => g.items.flatMap((s) => { const m = match(s); return m ? [{ id: m.id, item: s }] : []; })) : [],
    remove: dropRetired ? retired.map((r) => r.e.id) : [],
  };
  const total = plan.create.length + plan.update.length + plan.remove.length;

  return (
    <Modal onClose={busy ? () => {} : onClose} width={680} label="Import campaign schedule">
      <div className="px-6 pt-5 pb-3 flex items-start gap-3">
        <div className="flex-1">
          <h2 className="text-[17px] font-semibold" style={{ color: C.ink }}>Import campaign schedule</h2>
          <p className="text-[13px] mt-1" style={{ color: C.sub }}>Adds planned sessions and posts with captions, hashtags and what each one is waiting on. Anything already in the calendar is skipped.</p>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="px-6 pb-4 flex flex-col gap-3">
        {SCHEDULE_GROUPS.map((g) => {
          const on = picked.has(g.id); const color = CAMPAIGNS[g.id].color;
          const fresh = g.items.filter((s) => !match(s)).length;
          return (
            <div key={g.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: on ? color : C.line }}>
              <label className="flex items-center gap-3 px-4 py-3 cursor-pointer" style={{ background: on ? `${color}0D` : "white" }}>
                <input type="checkbox" checked={on} disabled={busy} className="w-4 h-4" style={{ accentColor: color }}
                  onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold" style={{ color: C.ink }}>{g.label}</span>
                  <span className="block text-[12px]" style={{ color: C.sub }}>{g.blurb}</span>
                </span>
                <span className="text-[12px] text-right tabular-nums" style={{ color: C.sub }}>{fresh} new<br /><span style={{ color: C.faint }}>{g.items.length - fresh} already in</span></span>
              </label>
              <div className="max-h-52 overflow-y-auto border-t" style={{ borderColor: C.lineSoft }}>
                {g.items.map((s) => {
                  const have = !!match(s);
                  return (
                    <div key={s.src} className="px-4 py-1.5 flex items-center gap-3 text-[12.5px]" style={{ opacity: have && !refresh ? 0.45 : 1 }}>
                      <span className="w-[84px] flex-shrink-0 tabular-nums" style={{ color: C.sub }}>{format(parseISO(s.date), "EEE d MMM")}</span>
                      <span className="flex-1 truncate" style={{ color: C.ink }}>{s.title}</span>
                      {s.type === "Post" ? <StatusPill status={s.status} size="xs" /> : <span className="text-[11px]" style={{ color: C.sub }}>{s.tbc ? "Event" : fmt12(s.start || "")}</span>}
                      {have && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#15803D" }} aria-label="Already in calendar" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {retired.length > 0 && (
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "#F5D27A", background: "#FFFBEB" }}>
            <label className="flex items-start gap-2.5 text-[13px] cursor-pointer" style={{ color: C.ink }}>
              <input type="checkbox" checked={dropRetired} onChange={(e) => setDropRetired(e.target.checked)} className="mt-0.5 accent-amber-500" />
              <span>Remove {retired.length} item{retired.length === 1 ? "" : "s"} that the plan has replaced</span>
            </label>
            <ul className="mt-1.5 pl-6 flex flex-col gap-0.5 text-[12px]" style={{ color: C.sub }}>
              {retired.map(({ e, why }) => <li key={e.id}><span style={{ color: C.ink }}>{format(parseISO(e.date), "d MMM")} · {e.title}</span>: {why}</li>)}
            </ul>
          </div>
        )}
        <label className="flex items-start gap-2.5 text-[13px] cursor-pointer px-1" style={{ color: C.sub }}>
          <input type="checkbox" checked={refresh} onChange={(e) => setRefresh(e.target.checked)} className="mt-0.5 accent-amber-500" />
          <span>Also refresh items that are already in the calendar <span style={{ color: C.faint }}>(overwrites their status, caption, hashtags and notes with the schedule&apos;s version)</span></span>
        </label>
      </div>
      <div className="px-6 py-4 border-t flex items-center gap-3 sticky bottom-0 bg-white" style={{ borderColor: C.line }}>
        <span className="text-[13px] mr-auto" style={{ color: C.sub }}>
          {plan.create.length} to add{plan.update.length ? `, ${plan.update.length} to refresh` : ""}{plan.remove.length ? `, ${plan.remove.length} to remove` : ""}
        </span>
        <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-xl border bg-white text-sm" style={{ borderColor: C.line }}>Cancel</button>
        <button type="button" disabled={!total || busy} onClick={async () => { setBusy(true); try { await onImport(plan); } finally { setBusy(false); } }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: C.accent }}>
          {busy ? "Updating…" : total ? `Update calendar (${total})` : "Nothing new"}
        </button>
      </div>
    </Modal>
  );
}
