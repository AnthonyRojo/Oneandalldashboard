"use client";

import { useState, useMemo, useEffect, useRef, useCallback, memo } from "react";
import { useApp, CalendarEvent, EventType } from "@/context/AppContext";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, differenceInCalendarDays,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, Video, Eye, FileText, Trash2, CalendarDays, Pencil,
  Search, Download, Copy, Check, TriangleAlert, List, Columns3, CalendarRange, CircleCheck,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import {
  CAMPAIGNS, CAMPAIGN_IDS, STATUSES, STATUS_IDS, FORMATS,
  parseEventMeta, buildDescription,
  type CampaignId, type PostStatus, type PostFormat, type EventMeta,
} from "@/lib/calendar-meta";
import { SCHEDULE_GROUPS, type ScheduleItem } from "@/lib/campaign-schedule";

// ── Constants & helpers ──────────────────────────────────────────────────────

const EVENT_COLORS: Record<EventType, string> = {
  Meeting: "#ec4899",
  Review: "#f59e0b",
  Post: "#8b5cf6",
  Other: "#6b7280",
};
const EVENT_ICONS: Record<EventType, typeof Video> = { Meeting: Video, Review: Eye, Post: FileText, Other: Clock };
const EVENT_TYPES: EventType[] = ["Post", "Meeting", "Review", "Other"];
const WEEK_OPTS = { weekStartsOn: 1 as const }; // Monday-first (AU)

type View = "month" | "week" | "agenda";
type StatusFilter = PostStatus | "all" | "overdue";
type CampaignFilter = CampaignId | "none";

interface Ev extends CalendarEvent {
  body: string;
  meta: EventMeta;
  color: string;
  start: string; // HH:mm
  end: string;
}

const hhmm = (t?: string) => {
  if (!t) return "";
  const s = t.includes("T") ? t.split("T")[1] : t;
  return s.slice(0, 5);
};
const fmt12 = (hm: string) => {
  if (!hm) return "";
  const [h, m] = hm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h >= 12 ? "pm" : "am"}`;
};
const timeLabel = (e: Ev) => (e.meta.tbc ? "Time TBC" : e.end && e.end !== e.start ? `${fmt12(e.start)} – ${fmt12(e.end)}` : fmt12(e.start));
// Times are stored as UTC wall-clock so they read back the same everywhere.
const toStamp = (date: string, hm: string) => `${date}T${hm}:00Z`;
const todayStr = () => format(new Date(), "yyyy-MM-dd");
const dkey = (d: Date) => format(d, "yyyy-MM-dd");
const relDay = (date: string) => {
  const n = differenceInCalendarDays(parseISO(date), new Date());
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
};
const addMinutes = (hm: string, mins: number) => {
  const [h, m] = hm.split(":").map(Number);
  const t = Math.min(Math.max(h * 60 + m + mins, 0), 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const minutesBetween = (a: string, b: string) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
};

function enrich(e: CalendarEvent): Ev {
  const { body, meta } = parseEventMeta(e.description);
  const color = meta.campaign
    ? CAMPAIGNS[meta.campaign].color
    : e.type === "Post" && e.color ? e.color : EVENT_COLORS[e.type] || "#6b7280";
  return { ...e, body, meta, color, start: hhmm(e.startTime), end: hhmm(e.endTime) };
}
const sortEv = (a: Ev, b: Ev) =>
  a.date.localeCompare(b.date) || Number(!!a.meta.tbc) - Number(!!b.meta.tbc) || a.start.localeCompare(b.start);
const isOverdue = (e: Ev, today: string) =>
  e.type === "Post" && !!e.meta.status && e.meta.status !== "posted" && e.date < today;

// ── Form model ───────────────────────────────────────────────────────────────

interface FormValues {
  title: string;
  type: EventType;
  campaign: CampaignId | "";
  date: string;
  start: string;
  end: string;
  tbc: boolean;
  status: PostStatus;
  format: PostFormat | "";
  link: string;
  notes: string;
}
const blankForm = (date: string, type: EventType = "Post"): FormValues => ({
  title: "", type, campaign: "", date, start: "09:00", end: "10:00", tbc: false,
  status: "idea", format: "", link: "", notes: "",
});
const formFromEvent = (e: Ev): FormValues => ({
  title: e.title, type: e.type, campaign: e.meta.campaign || "", date: e.date,
  start: e.start || "09:00", end: e.end || e.start || "10:00", tbc: !!e.meta.tbc,
  status: e.meta.status || "idea", format: e.meta.format || "", link: e.link || "", notes: e.body,
});
function payloadFromForm(v: FormValues) {
  const meta: EventMeta = {
    campaign: v.campaign || undefined,
    tbc: v.tbc || undefined,
    status: v.type === "Post" ? v.status : undefined,
    format: v.type === "Post" && v.format ? v.format : undefined,
  };
  const start = v.tbc ? "09:00" : v.start;
  const end = v.tbc ? "09:00" : v.end || v.start;
  return {
    title: v.title.trim(),
    description: buildDescription(v.notes, meta),
    type: v.type,
    date: v.date,
    startTime: toStamp(v.date, start),
    endTime: toStamp(v.date, end),
    link: v.link.trim(),
    color: v.campaign ? CAMPAIGNS[v.campaign].color : EVENT_COLORS[v.type],
  };
}
function payloadFromSchedule(s: ScheduleItem) {
  return payloadFromForm({
    title: s.title, type: s.type, campaign: s.campaign, date: s.date,
    start: s.start || "09:00", end: s.end || s.start || "09:00", tbc: !!s.tbc,
    status: s.status || "idea", format: s.format || "", link: "", notes: s.notes || "",
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { currentEvents, addEvent, updateEvent, deleteEvent, addToast } = useApp();

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter[]>([]);
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showPast, setShowPast] = useState(false);

  const [form, setForm] = useState<{ mode: "create" | "edit"; id?: string; values: FormValues } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const today = todayStr();
  const all = useMemo(() => currentEvents.map(enrich).sort(sortEv), [currentEvents]);
  const detail = all.find((e) => e.id === detailId) || null;

  const filtersActive = !!search || campaignFilter.length > 0 || typeFilter !== "all" || statusFilter !== "all";
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((e) => {
      if (q && !`${e.title} ${e.body}`.toLowerCase().includes(q)) return false;
      if (campaignFilter.length && !campaignFilter.includes(e.meta.campaign || "none")) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (statusFilter === "overdue" && !isOverdue(e, today)) return false;
      if (statusFilter !== "all" && statusFilter !== "overdue" && e.meta.status !== statusFilter) return false;
      return true;
    });
  }, [all, search, campaignFilter, typeFilter, statusFilter, today]);

  const byDate = useMemo(() => {
    const m = new Map<string, Ev[]>();
    filtered.forEach((e) => m.set(e.date, [...(m.get(e.date) || []), e]));
    return m;
  }, [filtered]);

  // Stats (ignore filters so the numbers stay trustworthy)
  const stats = useMemo(() => {
    const ws = dkey(startOfWeek(new Date(), WEEK_OPTS));
    const we = dkey(endOfWeek(new Date(), WEEK_OPTS));
    const in7 = dkey(addDays(new Date(), 7));
    return {
      thisWeek: all.filter((e) => e.date >= ws && e.date <= we).length,
      postsDue: all.filter((e) => e.type === "Post" && e.date >= today && e.date <= in7 && e.meta.status !== "posted").length,
      overdue: all.filter((e) => isOverdue(e, today)).length,
      waiting: all.filter((e) => e.meta.status === "waiting" && e.date >= today).length,
    };
  }, [all, today]);

  // ── Navigation
  const goPrev = useCallback(() => setCursor((c) => (view === "week" ? subWeeks(c, 1) : subMonths(c, 1))), [view]);
  const goNext = useCallback(() => setCursor((c) => (view === "week" ? addWeeks(c, 1) : addMonths(c, 1))), [view]);
  const goToday = useCallback(() => { setCursor(new Date()); setSelectedDate(todayStr()); }, []);
  const jumpTo = (date: string) => { setCursor(parseISO(date)); setSelectedDate(date); };

  const openCreate = useCallback((date?: string, type?: EventType) => {
    setDetailId(null);
    setForm({ mode: "create", values: blankForm(date || selectedDate, type) });
  }, [selectedDate]);
  const openEdit = (e: Ev) => { setDetailId(null); setForm({ mode: "edit", id: e.id, values: formFromEvent(e) }); };
  const openDuplicate = (e: Ev) => {
    setDetailId(null);
    setForm({ mode: "create", values: { ...formFromEvent(e), title: `${e.title} (copy)`, status: e.type === "Post" ? "idea" : e.meta.status || "idea" } });
  };

  // ── Keyboard shortcuts
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (ev.key === "Escape") {
        if (form) setForm(null); else if (detailId) setDetailId(null); else if (importOpen) setImportOpen(false);
        return;
      }
      if (typing || form || detailId || importOpen || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const k = ev.key.toLowerCase();
      if (ev.key === "ArrowLeft") goPrev();
      else if (ev.key === "ArrowRight") goNext();
      else if (k === "t") goToday();
      else if (k === "n") { ev.preventDefault(); openCreate(); }
      else if (k === "m") setView("month");
      else if (k === "w") setView("week");
      else if (k === "a") setView("agenda");
      else if (ev.key === "/") { ev.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, detailId, importOpen, goPrev, goNext, goToday, openCreate]);

  // ── Mutations
  const saveForm = async (v: FormValues) => {
    const payload = payloadFromForm(v);
    try {
      if (form?.mode === "edit" && form.id) {
        await updateEvent(form.id, payload);
        addToast("Event updated", "success");
      } else {
        await addEvent(payload);
        addToast("Event added", "success");
      }
      setForm(null);
      jumpTo(v.date);
    } catch {
      addToast("Couldn't save the event. Try again.", "error");
    }
  };

  const moveEvent = async (id: string, newDate: string) => {
    const e = all.find((x) => x.id === id);
    if (!e || e.date === newDate) return;
    try {
      await updateEvent(id, {
        date: newDate,
        startTime: toStamp(newDate, e.meta.tbc ? "09:00" : e.start || "09:00"),
        endTime: toStamp(newDate, e.meta.tbc ? "09:00" : e.end || e.start || "09:00"),
      });
      addToast(`Moved to ${format(parseISO(newDate), "EEE d MMM")}`, "success");
    } catch {
      addToast("Couldn't move the event", "error");
    }
  };

  const setStatus = async (e: Ev, status: PostStatus) => {
    try {
      await updateEvent(e.id, { description: buildDescription(e.body, { ...e.meta, status }) });
    } catch {
      addToast("Couldn't update status", "error");
    }
  };

  const removeEvent = async (e: Ev) => {
    setDetailId(null);
    try { await deleteEvent(e.id); addToast("Event deleted", "info"); }
    catch { addToast("Couldn't delete the event", "error"); }
  };

  // ── Range
  const monthDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), WEEK_OPTS),
    end: endOfWeek(endOfMonth(cursor), WEEK_OPTS),
  }), [cursor]);
  const weekDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(cursor, WEEK_OPTS), end: endOfWeek(cursor, WEEK_OPTS),
  }), [cursor]);
  const rangeLabel = view === "week"
    ? `${format(weekDays[0], "d MMM")} – ${format(weekDays[6], "d MMM yyyy")}`
    : view === "month" ? format(cursor, "MMMM yyyy") : "Agenda";

  const selectedEvents = byDate.get(selectedDate) || [];
  const clearFilters = () => { setSearch(""); setCampaignFilter([]); setTypeFilter("all"); setStatusFilter("all"); };
  const toggleCampaign = (c: CampaignFilter) =>
    setCampaignFilter((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4 md:p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Calendar</h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              {all.length} events · content, sessions and shows in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white text-sm font-medium hover:bg-gray-50" style={{ borderColor: "#e5e7eb", color: "#374151" }}>
              <Download className="w-4 h-4" /> Import schedule
            </button>
            <button onClick={() => openCreate()} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm" style={{ background: "#f59e0b", color: "white" }} title="New event (N)">
              <Plus className="w-4 h-4" /> New event
            </button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard label="This week" value={stats.thisWeek} hint="events" onClick={() => { clearFilters(); setView("week"); goToday(); }} />
          <StatCard label="Posts due" value={stats.postsDue} hint="next 7 days" onClick={() => { clearFilters(); setTypeFilter("Post"); setView("agenda"); setShowPast(false); }} />
          <StatCard label="Overdue posts" value={stats.overdue} hint="not marked posted" tone={stats.overdue ? "warn" : undefined} onClick={() => { clearFilters(); setStatusFilter("overdue"); setView("agenda"); setShowPast(true); }} />
          <StatCard label="Waiting on" value={stats.waiting} hint="consent, quotes, sponsors" onClick={() => { clearFilters(); setStatusFilter("waiting"); setView("agenda"); setShowPast(false); }} />
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border mb-4" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "#f0f0ea" }}>
            {view !== "agenda" && (
              <>
                <button onClick={goToday} className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-gray-50" style={{ borderColor: "#e5e7eb" }} title="Today (T)">Today</button>
                <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Previous" title="Previous (←)"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Next" title="Next (→)"><ChevronRight className="w-5 h-5" /></button>
              </>
            )}
            <h2 className="text-lg font-semibold mr-auto" style={{ color: "#111827" }}>{rangeLabel}</h2>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search  /"
                className="pl-9 pr-3 py-1.5 rounded-lg border text-sm outline-none focus:border-amber-400 w-40 md:w-52" style={{ borderColor: "#e5e7eb" }} />
            </div>

            <div className="flex rounded-lg p-0.5" style={{ background: "#f3f4f6" }} role="tablist">
              {([["month", "Month", CalendarRange], ["week", "Week", Columns3], ["agenda", "Agenda", List]] as const).map(([v, label, Icon]) => (
                <button key={v} onClick={() => setView(v)} role="tab" aria-selected={view === v} title={`${label} (${label[0]})`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={view === v ? { background: "white", color: "#111827", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" } : { color: "#6b7280" }}>
                  <Icon className="w-4 h-4" /><span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            {CAMPAIGN_IDS.map((c) => {
              const on = campaignFilter.includes(c);
              return (
                <button key={c} onClick={() => toggleCampaign(c)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                  style={{ borderColor: on ? CAMPAIGNS[c].color : "#e5e7eb", background: on ? `${CAMPAIGNS[c].color}14` : "white", color: on ? CAMPAIGNS[c].color : "#4b5563" }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: CAMPAIGNS[c].color }} />{CAMPAIGNS[c].short}
                </button>
              );
            })}
            <button onClick={() => toggleCampaign("none")} className="px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ borderColor: campaignFilter.includes("none") ? "#6b7280" : "#e5e7eb", background: campaignFilter.includes("none") ? "#f3f4f6" : "white", color: "#4b5563" }}>
              No campaign
            </button>
            <span className="w-px h-5 mx-1" style={{ background: "#e5e7eb" }} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as EventType | "all")} className="px-2 py-1 rounded-lg border text-xs bg-white" style={{ borderColor: "#e5e7eb" }} aria-label="Type">
              <option value="all">All types</option>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="px-2 py-1 rounded-lg border text-xs bg-white" style={{ borderColor: "#e5e7eb" }} aria-label="Status">
              <option value="all">Any status</option>
              {STATUS_IDS.map((s) => <option key={s} value={s}>{STATUSES[s].label}</option>)}
              <option value="overdue">Overdue</option>
            </select>
            {filtersActive && (
              <button onClick={clearFilters} className="text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100" style={{ color: "#6b7280" }}>
                <X className="w-3.5 h-3.5" /> Clear ({filtered.length} shown)
              </button>
            )}
            <span className="ml-auto hidden lg:inline text-xs" style={{ color: "#9ca3af" }}>Drag to reschedule · ← → T N M W A /</span>
          </div>
        </div>

        {/* Main area */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <div className="min-w-0">
            {view === "month" && (
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                <div className="grid grid-cols-7 border-b text-center text-xs font-semibold uppercase tracking-wide" style={{ color: "#9ca3af", borderColor: "#f0f0ea" }}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2.5">{d}</div>)}
                </div>
                <div className="grid grid-cols-7">
                  {monthDays.map((day) => {
                    const k = dkey(day);
                    return (
                      <MonthCell key={k} dateKey={k} day={day} events={byDate.get(k) || []}
                        inMonth={isSameMonth(day, cursor)} isToday={k === today} selected={k === selectedDate}
                        onSelect={setSelectedDate} onCreate={(d) => openCreate(d)} onOpen={(e) => setDetailId(e.id)} onDrop={moveEvent} />
                    );
                  })}
                </div>
              </div>
            )}

            {view === "week" && (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const k = dkey(day);
                  return (
                    <WeekColumn key={k} dateKey={k} day={day} events={byDate.get(k) || []} isToday={k === today} selected={k === selectedDate}
                      onSelect={setSelectedDate} onCreate={(d) => openCreate(d)} onOpen={(e) => setDetailId(e.id)} onDrop={moveEvent} />
                  );
                })}
              </div>
            )}

            {view === "agenda" && (
              <AgendaList events={filtered} today={today} showPast={showPast} setShowPast={setShowPast}
                onOpen={(e) => setDetailId(e.id)} onCreate={() => openCreate()} filtersActive={filtersActive} />
            )}
          </div>

          {/* Day panel */}
          <aside className="bg-white rounded-2xl border overflow-hidden self-start xl:sticky xl:top-4" style={{ borderColor: "#e5e7eb" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#f0f0ea", background: selectedDate === today ? "#fffbeb" : "white" }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: selectedDate === today ? "#d97706" : "#9ca3af" }}>{relDay(selectedDate)}</p>
                <h3 className="font-semibold" style={{ color: "#111827" }}>{format(parseISO(selectedDate), "EEEE d MMMM")}</h3>
              </div>
              <button onClick={() => openCreate(selectedDate)} className="p-2 rounded-xl hover:bg-amber-50" style={{ color: "#f59e0b" }} aria-label="Add on this day" title="Add on this day">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="divide-y max-h-[520px] overflow-y-auto" style={{ borderColor: "#f3f4f6" }}>
              {selectedEvents.length ? selectedEvents.map((e) => <EventRow key={e.id} e={e} onClick={() => setDetailId(e.id)} />) : (
                <div className="p-6 text-center">
                  <p className="text-sm" style={{ color: "#9ca3af" }}>Nothing on this day</p>
                  <div className="flex justify-center gap-2 mt-3">
                    <button onClick={() => openCreate(selectedDate, "Post")} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#f5f3ff", color: "#7c3aed" }}>+ Post</button>
                    <button onClick={() => openCreate(selectedDate, "Meeting")} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#fdf2f8", color: "#db2777" }}>+ Meeting</button>
                    <button onClick={() => openCreate(selectedDate, "Other")} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#f3f4f6", color: "#4b5563" }}>+ Event</button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {form && (
          <EventFormModal mode={form.mode} initial={form.values} onCancel={() => setForm(null)} onSave={saveForm}
            onDelete={form.mode === "edit" && form.id ? () => { const e = all.find((x) => x.id === form.id); setForm(null); if (e) removeEvent(e); } : undefined} />
        )}

        {detail && (
          <EventDetailModal e={detail} onClose={() => setDetailId(null)} onEdit={() => openEdit(detail)} onDuplicate={() => openDuplicate(detail)}
            onDelete={() => removeEvent(detail)} onStatus={(s) => setStatus(detail, s)} onJump={() => { jumpTo(detail.date); setDetailId(null); }} />
        )}

        {importOpen && (
          <ImportModal existing={all} onClose={() => setImportOpen(false)}
            onImport={async (items) => {
              let ok = 0;
              for (const it of items) {
                try { await addEvent(payloadFromSchedule(it)); ok++; } catch { /* keep going */ }
              }
              addToast(ok === items.length ? `Imported ${ok} items` : `Imported ${ok} of ${items.length} — some failed`, ok === items.length ? "success" : "error");
              setImportOpen(false);
            }} />
        )}
      </div>
    </DndProvider>
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function StatCard({ label, value, hint, tone, onClick }: { label: string; value: number; hint: string; tone?: "warn"; onClick: () => void }) {
  const warn = tone === "warn";
  return (
    <button onClick={onClick} className="text-left bg-white rounded-2xl border px-4 py-3 hover:shadow-sm transition-shadow"
      style={{ borderColor: warn ? "#fcd34d" : "#e5e7eb", background: warn ? "#fffbeb" : "white" }}>
      <p className="text-xs font-medium flex items-center gap-1" style={{ color: warn ? "#b45309" : "#6b7280" }}>
        {warn && <TriangleAlert className="w-3.5 h-3.5" />}{label}
      </p>
      <p className="text-2xl font-semibold mt-0.5" style={{ color: "#111827" }}>{value}</p>
      <p className="text-xs" style={{ color: "#9ca3af" }}>{hint}</p>
    </button>
  );
}

function StatusChip({ status }: { status?: PostStatus }) {
  if (!status) return null;
  const s = STATUSES[status];
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function CampaignChip({ c }: { c?: CampaignId }) {
  if (!c) return null;
  const k = CAMPAIGNS[c];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap" style={{ color: k.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: k.color }} />{k.short}
    </span>
  );
}

function EventRow({ e, onClick, showDate }: { e: Ev; onClick: () => void; showDate?: boolean }) {
  const Icon = EVENT_ICONS[e.type] || Clock;
  const posted = e.meta.status === "posted";
  return (
    <button onClick={onClick} className="w-full text-left px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${e.color}18` }}>
        {posted ? <Check className="w-4 h-4" style={{ color: e.color }} /> : <Icon className="w-4 h-4" style={{ color: e.color }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: posted ? "#9ca3af" : "#111827", textDecoration: posted ? "line-through" : "none" }}>{e.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
          {showDate && `${format(parseISO(e.date), "EEE d MMM")} · `}{timeLabel(e)}{e.meta.format && ` · ${e.meta.format}`}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <CampaignChip c={e.meta.campaign} />
          {e.type === "Post" && <StatusChip status={e.meta.status} />}
        </div>
      </div>
    </button>
  );
}

// ── Month view ───────────────────────────────────────────────────────────────

interface CellProps {
  dateKey: string;
  day: Date;
  events: Ev[];
  isToday: boolean;
  selected: boolean;
  onSelect: (d: string) => void;
  onCreate: (d: string) => void;
  onOpen: (e: Ev) => void;
  onDrop: (id: string, d: string) => void;
}

function MonthCell({ dateKey, day, events, inMonth, isToday, selected, onSelect, onCreate, onOpen, onDrop }: CellProps & { inMonth: boolean }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "event",
    drop: (item: { id: string }) => onDrop(item.id, dateKey),
    collect: (m) => ({ isOver: m.isOver() }),
  }), [dateKey, onDrop]);
  const MAX = 3;
  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>} onClick={() => onSelect(dateKey)} onDoubleClick={() => onCreate(dateKey)}
      className="group relative min-h-[64px] sm:min-h-[112px] p-1.5 border-b border-r cursor-pointer transition-colors"
      style={{
        borderColor: "#f0f0ea",
        background: isOver ? "#fef3c7" : selected ? "#fffdf5" : "transparent",
        boxShadow: selected ? "inset 0 0 0 2px #fbbf24" : "none",
      }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs w-6 h-6 flex items-center justify-center rounded-full"
          style={{ background: isToday ? "#f59e0b" : "transparent", color: isToday ? "white" : inMonth ? "#374151" : "#d1d5db", fontWeight: isToday ? 700 : 500 }}>
          {format(day, "d")}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onCreate(dateKey); }} aria-label={`Add on ${dateKey}`}
          className="w-6 h-6 rounded-md items-center justify-center hidden sm:flex opacity-0 group-hover:opacity-100 hover:bg-amber-100 transition-opacity" style={{ color: "#d97706" }}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Desktop: chips */}
      <div className="space-y-1 hidden sm:block" style={{ opacity: inMonth ? 1 : 0.55 }}>
        {events.slice(0, MAX).map((e) => <MemoChip key={e.id} e={e} onOpen={onOpen} />)}
        {events.length > MAX && (
          <button onClick={(ev) => { ev.stopPropagation(); onSelect(dateKey); }} className="text-[11px] font-medium px-1.5 hover:underline" style={{ color: "#6b7280" }}>
            +{events.length - MAX} more
          </button>
        )}
      </div>
      {/* Mobile: dots */}
      <div className="flex flex-wrap gap-0.5 sm:hidden">
        {events.slice(0, 6).map((e) => <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />)}
      </div>
    </div>
  );
}

function Chip({ e, onOpen }: { e: Ev; onOpen: (e: Ev) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({ type: "event", item: { id: e.id }, collect: (m) => ({ isDragging: m.isDragging() }) }), [e.id]);
  const posted = e.meta.status === "posted";
  return (
    <button ref={drag as unknown as React.Ref<HTMLButtonElement>} onClick={(ev) => { ev.stopPropagation(); onOpen(e); }}
      title={`${e.title} · ${timeLabel(e)}`}
      className="w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-4 truncate border-l-[3px] flex items-center gap-1"
      style={{ background: `${e.color}14`, color: posted ? "#9ca3af" : "#1f2937", borderColor: e.color, opacity: isDragging ? 0.4 : 1, cursor: "grab" }}>
      {posted && <Check className="w-3 h-3 flex-shrink-0" style={{ color: e.color }} />}
      {!e.meta.tbc && e.start && <span className="flex-shrink-0 font-semibold" style={{ color: e.color }}>{fmt12(e.start)}</span>}
      <span className="truncate" style={{ textDecoration: posted ? "line-through" : "none" }}>{e.title}</span>
    </button>
  );
}
const MemoChip = memo(Chip);

// ── Week view ────────────────────────────────────────────────────────────────

function WeekColumn({ dateKey, day, events, isToday, selected, onSelect, onCreate, onOpen, onDrop }: CellProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "event",
    drop: (item: { id: string }) => onDrop(item.id, dateKey),
    collect: (m) => ({ isOver: m.isOver() }),
  }), [dateKey, onDrop]);
  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>} onClick={() => onSelect(dateKey)}
      className="bg-white rounded-2xl border flex flex-col md:min-h-[420px] transition-colors"
      style={{ borderColor: selected ? "#fbbf24" : "#e5e7eb", background: isOver ? "#fef3c7" : "white" }}>
      <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "#f0f0ea" }}>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold uppercase" style={{ color: isToday ? "#d97706" : "#9ca3af" }}>{format(day, "EEE")}</span>
          <span className="text-lg font-semibold" style={{ color: isToday ? "#d97706" : "#111827" }}>{format(day, "d")}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onCreate(dateKey); }} className="p-1 rounded-md hover:bg-amber-50" style={{ color: "#d97706" }} aria-label={`Add on ${dateKey}`}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="p-2 space-y-1.5 flex-1">
        {events.map((e) => <WeekCard key={e.id} e={e} onOpen={onOpen} />)}
        {!events.length && <p className="text-[11px] text-center py-3" style={{ color: "#d1d5db" }}>—</p>}
      </div>
    </div>
  );
}

function WeekCard({ e, onOpen }: { e: Ev; onOpen: (e: Ev) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({ type: "event", item: { id: e.id }, collect: (m) => ({ isDragging: m.isDragging() }) }), [e.id]);
  const posted = e.meta.status === "posted";
  return (
    <button ref={drag as unknown as React.Ref<HTMLButtonElement>} onClick={(ev) => { ev.stopPropagation(); onOpen(e); }}
      className="w-full text-left rounded-lg p-2 border-l-[3px] hover:shadow-sm transition-shadow"
      style={{ background: `${e.color}10`, borderColor: e.color, opacity: isDragging ? 0.4 : 1, cursor: "grab" }}>
      <p className="text-[11px] font-semibold" style={{ color: e.color }}>{timeLabel(e)}</p>
      <p className="text-xs font-medium leading-snug mt-0.5" style={{ color: posted ? "#9ca3af" : "#111827", textDecoration: posted ? "line-through" : "none" }}>{e.title}</p>
      {(e.type === "Post" && e.meta.status) || e.meta.format ? (
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {e.type === "Post" && <StatusChip status={e.meta.status} />}
          {e.meta.format && <span className="text-[11px]" style={{ color: "#6b7280" }}>{e.meta.format}</span>}
        </div>
      ) : null}
    </button>
  );
}

// ── Agenda view ──────────────────────────────────────────────────────────────

function AgendaList({ events, today, showPast, setShowPast, onOpen, onCreate, filtersActive }: {
  events: Ev[]; today: string; showPast: boolean; setShowPast: (v: boolean) => void;
  onOpen: (e: Ev) => void; onCreate: () => void; filtersActive: boolean;
}) {
  const list = showPast ? events : events.filter((e) => e.date >= today);
  const groups: [string, Ev[]][] = [];
  list.forEach((e) => {
    const last = groups[groups.length - 1];
    if (last && last[0] === e.date) last[1].push(e); else groups.push([e.date, [e]]);
  });
  const pastCount = events.filter((e) => e.date < today).length;
  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
      <div className="px-5 py-3 border-b flex items-center justify-between text-sm" style={{ borderColor: "#f0f0ea" }}>
        <span style={{ color: "#6b7280" }}>{list.length} {showPast ? "items" : "upcoming"}</span>
        {pastCount > 0 && (
          <label className="flex items-center gap-2 cursor-pointer" style={{ color: "#4b5563" }}>
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="accent-amber-500" />
            Show past ({pastCount})
          </label>
        )}
      </div>
      {groups.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm" style={{ color: "#9ca3af" }}>{filtersActive ? "Nothing matches these filters." : "Nothing coming up."}</p>
          {!filtersActive && <button onClick={onCreate} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: "#f59e0b", color: "white" }}>Add an event</button>}
        </div>
      ) : (
        <div>
          {groups.map(([date, evs]) => (
            <div key={date}>
              <div className="px-5 py-2 flex items-baseline gap-2 sticky top-0 z-[1]" style={{ background: date === today ? "#fffbeb" : "#fafaf7" }}>
                <span className="text-sm font-semibold" style={{ color: date === today ? "#d97706" : "#111827" }}>{format(parseISO(date), "EEE d MMM")}</span>
                <span className="text-xs" style={{ color: "#9ca3af" }}>{relDay(date)}</span>
              </div>
              <div className="divide-y" style={{ borderColor: "#f3f4f6" }}>
                {evs.map((e) => <EventRow key={e.id} e={e} onClick={() => onOpen(e)} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modals ───────────────────────────────────────────────────────────────────

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-white w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-xl`}>
        {children}
      </div>
    </div>
  );
}

function EventFormModal({ mode, initial, onCancel, onSave, onDelete }: {
  mode: "create" | "edit"; initial: FormValues; onCancel: () => void; onSave: (v: FormValues) => Promise<void>; onDelete?: () => void;
}) {
  const [v, setV] = useState<FormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);

  const set = (p: Partial<FormValues>) => setV((s) => ({ ...s, ...p }));
  const errors = {
    title: !v.title.trim() ? "Add a title" : "",
    date: !v.date ? "Pick a date" : "",
    time: !v.tbc && v.end && v.start && v.end < v.start ? "End time is before start time" : "",
  };
  const valid = !errors.title && !errors.date && !errors.time;

  const submit = async () => {
    setTried(true);
    if (!valid || saving) return;
    setSaving(true);
    try { await onSave(v); } finally { setSaving(false); }
  };

  const changeStart = (start: string) => {
    const dur = v.start && v.end ? Math.max(minutesBetween(v.start, v.end), 0) : 60;
    set({ start, end: addMinutes(start, dur) });
  };

  const label = "block text-xs font-semibold uppercase tracking-wide mb-1.5";
  const input = "w-full px-3 py-2 border rounded-xl text-sm outline-none focus:border-amber-400";

  return (
    <Modal onClose={onCancel}>
      <div onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}>
        <div className="flex justify-between items-center px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold">{mode === "edit" ? "Edit event" : "New event"}</h2>
          <button onClick={onCancel} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-6 pb-4 space-y-4">
          <div>
            <input ref={titleRef} value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="What's happening?"
              className="w-full text-lg font-medium outline-none border-b pb-2 focus:border-amber-400" style={{ borderColor: tried && errors.title ? "#ef4444" : "#e5e7eb" }} />
            {tried && errors.title && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors.title}</p>}
          </div>

          <div>
            <span className={label} style={{ color: "#6b7280" }}>Type</span>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl" style={{ background: "#f3f4f6" }}>
              {EVENT_TYPES.map((t) => {
                const Icon = EVENT_ICONS[t];
                const on = v.type === t;
                return (
                  <button key={t} type="button" onClick={() => set({ type: t })} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium"
                    style={on ? { background: "white", color: EVENT_COLORS[t], boxShadow: "0 1px 2px rgba(0,0,0,0.08)" } : { color: "#6b7280" }}>
                    <Icon className="w-3.5 h-3.5" />{t}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className={label} style={{ color: "#6b7280" }}>Campaign</span>
            <div className="flex flex-wrap gap-1.5">
              {CAMPAIGN_IDS.map((c) => {
                const on = v.campaign === c;
                return (
                  <button key={c} type="button" onClick={() => set({ campaign: on ? "" : c })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                    style={{ borderColor: on ? CAMPAIGNS[c].color : "#e5e7eb", background: on ? `${CAMPAIGNS[c].color}14` : "white", color: on ? CAMPAIGNS[c].color : "#4b5563" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: CAMPAIGNS[c].color }} />{CAMPAIGNS[c].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <DatePicker label="Date" value={v.date} onChange={(d) => set({ date: d })} />
            {tried && errors.date && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors.date}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={label + " mb-0"} style={{ color: "#6b7280" }}>Time</span>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "#4b5563" }}>
                <input type="checkbox" checked={v.tbc} onChange={(e) => set({ tbc: e.target.checked })} className="accent-amber-500" /> Time TBC / no set time
              </label>
            </div>
            {!v.tbc && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input type="time" value={v.start} onChange={(e) => changeStart(e.target.value)} className={input} style={{ borderColor: "#e5e7eb" }} aria-label="Start time" />
                  <input type="time" value={v.end} onChange={(e) => set({ end: e.target.value })} className={input} style={{ borderColor: errors.time ? "#ef4444" : "#e5e7eb" }} aria-label="End time" />
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[30, 60, 90, 120, 180].map((m) => (
                    <button key={m} type="button" onClick={() => set({ end: addMinutes(v.start, m) })} className="px-2 py-0.5 rounded-md text-[11px] font-medium border hover:bg-gray-50"
                      style={{ borderColor: minutesBetween(v.start, v.end) === m ? "#f59e0b" : "#e5e7eb", color: "#4b5563" }}>
                      {m < 60 ? `${m}m` : `${m / 60}h`}
                    </button>
                  ))}
                </div>
                {errors.time && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors.time}</p>}
              </>
            )}
          </div>

          {v.type === "Post" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl" style={{ background: "#faf9ff" }}>
              <div>
                <span className={label} style={{ color: "#6b7280" }}>Format</span>
                <select value={v.format} onChange={(e) => set({ format: e.target.value as PostFormat | "" })} className={input + " bg-white"} style={{ borderColor: "#e5e7eb" }}>
                  <option value="">—</option>
                  {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <span className={label} style={{ color: "#6b7280" }}>Status</span>
                <select value={v.status} onChange={(e) => set({ status: e.target.value as PostStatus })} className={input + " bg-white"} style={{ borderColor: "#e5e7eb" }}>
                  {STATUS_IDS.map((s) => <option key={s} value={s}>{STATUSES[s].label}</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <span className={label} style={{ color: "#6b7280" }}>Link</span>
            <input type="url" value={v.link} onChange={(e) => set({ link: e.target.value })} className={input} style={{ borderColor: "#e5e7eb" }} placeholder="Humanitix, Canva, Drive, meeting link…" />
          </div>
          <div>
            <span className={label} style={{ color: "#6b7280" }}>Notes</span>
            <textarea value={v.notes} onChange={(e) => set({ notes: e.target.value })} className={input} style={{ borderColor: "#e5e7eb" }} rows={4} placeholder="Caption, hashtags, what's needed…" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-6 py-4 border-t bg-gray-50 sticky bottom-0">
          {onDelete && (
            <button onClick={onDelete} className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 hover:bg-red-50" style={{ color: "#dc2626" }}>
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
          <span className="ml-auto hidden sm:inline text-xs" style={{ color: "#9ca3af" }}>Ctrl+Enter to save</span>
          <button onClick={onCancel} className="px-4 py-2 bg-white border rounded-xl text-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60" style={{ background: "#f59e0b" }}>
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add event"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EventDetailModal({ e, onClose, onEdit, onDuplicate, onDelete, onStatus, onJump }: {
  e: Ev; onClose: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
  onStatus: (s: PostStatus) => void; onJump: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const href = e.link ? (e.link.startsWith("http") ? e.link : `https://${e.link}`) : "";
  return (
    <Modal onClose={onClose}>
      <div className="h-1.5" style={{ background: e.color }} />
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: e.color }}>{e.type}</span>
            {e.meta.campaign && <span className="text-xs" style={{ color: "#9ca3af" }}>·</span>}
            <CampaignChip c={e.meta.campaign} />
            {e.meta.format && <span className="text-xs" style={{ color: "#6b7280" }}>· {e.meta.format}</span>}
          </div>
          <h2 className="text-lg font-semibold leading-snug" style={{ color: "#111827" }}>{e.title}</h2>
        </div>
        <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
      </div>
      <div className="px-6 pb-5 space-y-4">
        <div className="space-y-1.5 text-sm" style={{ color: "#374151" }}>
          <button onClick={onJump} className="flex items-center gap-2 hover:underline">
            <CalendarDays className="w-4 h-4 text-gray-400" />{format(parseISO(e.date), "EEEE d MMMM yyyy")}
            <span className="text-xs" style={{ color: "#9ca3af" }}>({relDay(e.date)})</span>
          </button>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" />{timeLabel(e)}</div>
          {href && (
            <div className="flex items-start gap-2">
              <Video className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all hover:text-blue-800">{e.link}</a>
            </div>
          )}
        </div>

        {e.type === "Post" && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#6b7280" }}>Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_IDS.map((s) => {
                const on = e.meta.status === s;
                return (
                  <button key={s} onClick={() => onStatus(s)} className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                    style={{ borderColor: on ? STATUSES[s].color : "#e5e7eb", background: on ? STATUSES[s].bg : "white", color: on ? STATUSES[s].color : "#6b7280" }}>
                    {on && <Check className="w-3 h-3 inline -mt-0.5 mr-1" />}{STATUSES[s].label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {e.body && <div className="text-sm whitespace-pre-wrap rounded-xl p-3" style={{ background: "#fafaf7", color: "#374151" }}>{e.body}</div>}
      </div>
      <div className="px-6 py-4 border-t flex flex-wrap items-center gap-2 bg-gray-50">
        {confirmDelete ? (
          <>
            <span className="text-sm mr-auto" style={{ color: "#dc2626" }}>Delete this event?</span>
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 bg-white border rounded-xl text-sm">Keep</button>
            <button onClick={onDelete} className="px-3 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "#dc2626" }}>Delete</button>
          </>
        ) : (
          <>
            <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-xl hover:bg-red-50" style={{ color: "#dc2626" }} aria-label="Delete" title="Delete"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onDuplicate} className="p-2 rounded-xl hover:bg-gray-100" style={{ color: "#4b5563" }} aria-label="Duplicate" title="Duplicate"><Copy className="w-4 h-4" /></button>
            <span className="mr-auto" />
            {e.type === "Post" && e.meta.status !== "posted" && (
              <button onClick={() => onStatus("posted")} className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5" style={{ background: "#f0fdf4", color: "#15803d" }}>
                <CircleCheck className="w-4 h-4" /> Mark posted
              </button>
            )}
            <button onClick={onEdit} className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-1.5" style={{ background: "#111827" }}>
              <Pencil className="w-4 h-4" /> Edit
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function ImportModal({ existing, onClose, onImport }: { existing: Ev[]; onClose: () => void; onImport: (items: ScheduleItem[]) => Promise<void> }) {
  const have = useMemo(() => new Set(existing.map((e) => `${e.title.trim().toLowerCase()}|${e.date}`)), [existing]);
  const isNew = (s: ScheduleItem) => !have.has(`${s.title.trim().toLowerCase()}|${s.date}`);
  const [picked, setPicked] = useState<Set<CampaignId>>(new Set(SCHEDULE_GROUPS.map((g) => g.id)));
  const [busy, setBusy] = useState(false);
  const toImport = SCHEDULE_GROUPS.filter((g) => picked.has(g.id)).flatMap((g) => g.items.filter(isNew));

  return (
    <Modal onClose={busy ? () => {} : onClose} wide>
      <div className="px-6 pt-5 pb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Import campaign schedule</h2>
          <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>Adds the planned sessions and content posts. Anything already in the calendar is skipped.</p>
        </div>
        <button onClick={onClose} disabled={busy} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
      </div>
      <div className="px-6 pb-4 space-y-4">
        {SCHEDULE_GROUPS.map((g) => {
          const fresh = g.items.filter(isNew).length;
          const on = picked.has(g.id);
          const color = CAMPAIGNS[g.id].color;
          return (
            <div key={g.id} className="rounded-xl border overflow-hidden" style={{ borderColor: on ? color : "#e5e7eb" }}>
              <label className="flex items-center gap-3 px-4 py-3 cursor-pointer" style={{ background: on ? `${color}0d` : "white" }}>
                <input type="checkbox" checked={on} disabled={busy} className="w-4 h-4" style={{ accentColor: color }}
                  onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })} />
                <span className="font-medium text-sm flex-1" style={{ color: "#111827" }}>{g.label}</span>
                <span className="text-xs" style={{ color: "#6b7280" }}>{fresh} new · {g.items.length - fresh} already added</span>
              </label>
              <div className="max-h-48 overflow-y-auto divide-y text-sm" style={{ borderColor: "#f3f4f6" }}>
                {g.items.map((s) => {
                  const n = isNew(s);
                  return (
                    <div key={s.title + s.date} className="px-4 py-2 flex items-center gap-3" style={{ opacity: n ? 1 : 0.45 }}>
                      <span className="w-20 flex-shrink-0 text-xs font-medium" style={{ color: "#6b7280" }}>{format(parseISO(s.date), "EEE d MMM")}</span>
                      <span className="flex-1 truncate" style={{ color: "#111827" }}>{s.title}</span>
                      {s.type === "Post" ? <StatusChip status={s.status} /> : <span className="text-[11px]" style={{ color: "#6b7280" }}>{s.tbc ? "Time TBC" : `${fmt12(s.start || "")}`}</span>}
                      {!n && <Check className="w-3.5 h-3.5" style={{ color: "#16a34a" }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-6 py-4 border-t flex items-center gap-3 bg-gray-50 sticky bottom-0">
        <span className="text-sm mr-auto" style={{ color: "#6b7280" }}>{toImport.length} to add</span>
        <button onClick={onClose} disabled={busy} className="px-4 py-2 bg-white border rounded-xl text-sm">Cancel</button>
        <button disabled={!toImport.length || busy} onClick={async () => { setBusy(true); try { await onImport(toImport); } finally { setBusy(false); } }}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: "#f59e0b" }}>
          {busy ? "Importing…" : `Import ${toImport.length}`}
        </button>
      </div>
    </Modal>
  );
}
