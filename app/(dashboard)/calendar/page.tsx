"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { format, parseISO, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, addDays, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, Search, Download, Upload, SlidersHorizontal, ChevronDown,
  CalendarRange, Columns3, KanbanSquare, List, X, Check, Keyboard, LayoutGrid,
} from "lucide-react";
import { useApp, type EventType } from "@/context/AppContext";
import {
  buildDescription, STATUSES, STATUS_IDS, FORMATS, PLATFORMS, PLATFORM_IDS,
  type CampaignId, type EventMeta, type Platform, type PostFormat, type PostStatus,
} from "@/lib/calendar-meta";
import { SCHEDULE_GROUPS, RETIRED_SRCS, scheduleMatcher, type ScheduleItem } from "@/lib/campaign-schedule";
import {
  C, EVENT_LABELS, EVENT_TYPES, WEEK_OPTS, UNASSIGNED_COLOR, dkey, enrich, ownerColorMap, sortEv, todayStr, toStamp, toMin, fromMin, isOverdue,
  blankForm, formFromEvent, payloadFromForm, payloadFromEvent, exportCsv, exportIcs,
  type Ev, type FormValues, type EventPayload,
} from "@/components/calendar/utils";
import { Popover, MenuItem, Kbd, PeopleContext, type Person } from "@/components/calendar/ui";
import GridView from "@/components/calendar/GridView";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import BoardView from "@/components/calendar/BoardView";
import ListView from "@/components/calendar/ListView";
import Sidebar from "@/components/calendar/Sidebar";
import EventDrawer from "@/components/calendar/EventDrawer";
import EventForm from "@/components/calendar/EventForm";
import ImportModal, { type ImportPlan } from "@/components/calendar/ImportModal";
import TodayStrip from "@/components/calendar/TodayStrip";

type View = "month" | "week" | "board" | "grid" | "list";
type StatusFilter = PostStatus | "all" | "overdue";
const VIEWS: { id: View; label: string; key: string; icon: typeof List }[] = [
  { id: "month", label: "Month", key: "M", icon: CalendarRange },
  { id: "week", label: "Week", key: "W", icon: Columns3 },
  { id: "board", label: "Board", key: "B", icon: KanbanSquare },
  { id: "grid", label: "Grid", key: "G", icon: LayoutGrid },
  { id: "list", label: "List", key: "L", icon: List },
];
const PREFS_KEY = "oa-calendar-prefs-v2";

function scheduleToForm(s: ScheduleItem): FormValues {
  return {
    ...blankForm(s.date, s.type), title: s.title, campaign: s.campaign, tbc: !!s.tbc,
    start: s.start || "09:00", end: s.end || s.start || "09:00",
    status: s.status || "idea", format: s.format || "", platforms: s.platforms || [], story: !!s.story, caption: s.caption || "", hashtags: s.hashtags || "",
    asset: s.asset || "", needs: s.needs || "", notes: s.notes || "", src: s.src,
  };
}

export default function CalendarPage() {
  const { currentEvents, currentMembers, currentUser, addEvent, updateEvent, deleteEvent, addToast } = useApp();
  const people = useMemo<Person[]>(() => currentMembers.map((m) => ({ id: m.userId || m.id, name: m.name, avatar: m.avatar })), [currentMembers]);
  const meId = currentUser?.id;
  const peopleCtx = useMemo(() => ({ people, meId }), [people, meId]);

  // ── View state (view + campaign visibility are remembered per browser)
  const [view, setView] = useState<View>("month");
  const [hidden, setHidden] = useState<CampaignId[]>([]);
  const [hideNoCampaign, setHideNoCampaign] = useState(false);
  const [colorBy, setColorBy] = useState<"person" | "campaign">("person");
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (p.view) setView(p.view); if (Array.isArray(p.hidden)) setHidden(p.hidden); if (p.hideNoCampaign) setHideNoCampaign(true); if (p.colorBy) setColorBy(p.colorBy);
    } catch { /* storage unavailable */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ view, hidden, hideNoCampaign, colorBy })); } catch { /* storage unavailable */ }
  }, [view, hidden, hideNoCampaign, colorBy]);

  const [cursor, setCursor] = useState(new Date());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formatFilter, setFormatFilter] = useState<PostFormat | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all"); // "all" | "me" | "none" | person id
  const [bannerHidden, setBannerHidden] = useState(false);
  const [form, setForm] = useState<{ mode: "create" | "edit"; id?: string; values: FormValues } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [undo, setUndo] = useState<{ label: string; run: () => Promise<void> } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const today = todayStr();
  const ownerColors = useMemo(() => ownerColorMap(people.map((p) => p.id)), [people]);
  const all = useMemo(() => currentEvents.map((e) => enrich(e, colorBy === "person" ? ownerColors : undefined)).sort(sortEv), [currentEvents, colorBy, ownerColors]);
  const byId = useMemo(() => new Map(all.map((e) => [e.id, e])), [all]);
  const detail = detailId ? byId.get(detailId) || null : null;

  // Planned schedule rows (e.g. the fashionABLE social schedule) that aren't in the calendar yet.
  const missing = useMemo(() => {
    const match = scheduleMatcher(all);
    const groups = SCHEDULE_GROUPS.map((g) => { const n = g.items.filter((s) => !match(s)).length; return { n, text: `${n} new from ${g.label}` }; }).filter((g) => g.n > 0);
    const retired = all.filter((e) => RETIRED_SRCS.some((r) => r.src === e.meta.src)).length;
    return retired ? [...groups, { n: retired, text: `${retired} replaced, to remove` }] : groups;
  }, [all]);
  const missingTotal = missing.reduce((n, g) => n + g.n, 0);

  const filtersActive = !!search || typeFilter !== "all" || statusFilter !== "all" || formatFilter !== "all" || platformFilter !== "all" || ownerFilter !== "all" || hidden.length > 0 || hideNoCampaign;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((e) => {
      if (e.meta.campaign ? hidden.includes(e.meta.campaign) : hideNoCampaign) return false;
      if (q && !`${e.title} ${e.body} ${e.meta.caption || ""} ${e.meta.hashtags || ""} ${e.meta.needs || ""} ${e.meta.asset || ""}`.toLowerCase().includes(q)) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (formatFilter !== "all" && (e.meta.format !== formatFilter && !(formatFilter === "Story" && e.meta.story))) return false;
      if (platformFilter !== "all" && !e.meta.platforms?.includes(platformFilter)) return false;
      if (ownerFilter === "none" ? !!e.meta.owner : ownerFilter !== "all" && e.meta.owner !== (ownerFilter === "me" ? meId : ownerFilter)) return false;
      if (statusFilter === "overdue") return isOverdue(e, today);
      if (statusFilter !== "all" && (e.meta.status || (e.type === "Post" ? "idea" : "")) !== statusFilter) return false;
      return true;
    });
  }, [all, search, typeFilter, statusFilter, formatFilter, platformFilter, ownerFilter, meId, hidden, hideNoCampaign, today]);
  const byDate = useMemo(() => {
    const m = new Map<string, Ev[]>();
    filtered.forEach((e) => { const l = m.get(e.date); if (l) l.push(e); else m.set(e.date, [e]); });
    return m;
  }, [filtered]);

  const weekStats = useMemo(() => {
    const ws = dkey(startOfWeek(new Date(), WEEK_OPTS)); const we = dkey(endOfWeek(new Date(), WEEK_OPTS));
    const week = all.filter((e) => e.date >= ws && e.date <= we);
    return { posts: week.filter((e) => e.type === "Post").length, events: week.filter((e) => e.type !== "Post").length, overdue: all.filter((e) => isOverdue(e, today)).length };
  }, [all, today]);

  // ── Undo
  const offerUndo = useCallback((label: string, run: () => Promise<void>) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ label, run });
    undoTimer.current = setTimeout(() => setUndo(null), 7000);
  }, []);
  const doUndo = async () => {
    const u = undo; setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (u) { try { await u.run(); addToast("Undone", "info"); } catch { addToast("Couldn't undo that", "error"); } }
  };

  // ── Navigation
  const goPrev = useCallback(() => setCursor((c) => (view === "week" ? subWeeks(c, 1) : subMonths(c, 1))), [view]);
  const goNext = useCallback(() => setCursor((c) => (view === "week" ? addWeeks(c, 1) : addMonths(c, 1))), [view]);
  const goToday = useCallback(() => setCursor(new Date()), []);
  const jumpTo = useCallback((date: string) => { setCursor(parseISO(date)); if (view === "board" || view === "grid" || view === "list") setView("month"); }, [view]);

  const openCreate = useCallback((date?: string, type: EventType = "Post", start?: string, status?: PostStatus) => {
    setDetailId(null);
    const base = blankForm(date || (isSameMonth(cursor, new Date()) ? today : dkey(cursor)), type, start);
    setForm({ mode: "create", values: status ? { ...base, status } : base });
  }, [cursor, today]);

  // ── Keyboard
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (ev.key === "Escape") {
        if (form) setForm(null); else if (detailId) setDetailId(null); else if (importOpen) setImportOpen(false); else if (helpOpen) setHelpOpen(false);
        return;
      }
      if (typing || form || detailId || importOpen || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const k = ev.key.toLowerCase();
      if (ev.key === "ArrowLeft" && (view === "month" || view === "week")) goPrev();
      else if (ev.key === "ArrowRight" && (view === "month" || view === "week")) goNext();
      else if (k === "t") goToday();
      else if (k === "n") { ev.preventDefault(); openCreate(undefined, "Post"); }
      else if (k === "e") { ev.preventDefault(); openCreate(undefined, "Other"); }
      else if (k === "m") setView("month");
      else if (k === "w") setView("week");
      else if (k === "b") setView("board");
      else if (k === "g") setView("grid");
      else if (k === "l") setView("list");
      else if (ev.key === "?") setHelpOpen((o) => !o);
      else if (ev.key === "/") { ev.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, detailId, importOpen, helpOpen, view, goPrev, goNext, goToday, openCreate]);

  // ── Mutations
  const snapshot = (e: Ev): Partial<EventPayload> => ({ date: e.date, startTime: e.startTime, endTime: e.endTime, description: e.description });

  const saveForm = async (v: FormValues) => {
    try {
      if (form?.mode === "edit" && form.id) {
        await updateEvent(form.id, payloadFromForm(v));
        addToast("Saved", "success");
      } else {
        const n = Math.max(1, v.repeatWeeks);
        for (let i = 0; i < n; i++) await addEvent(payloadFromForm(v, dkey(addDays(parseISO(v.date), i * 7))));
        addToast(n > 1 ? `Added ${n} weekly items` : v.type === "Post" ? "Post added" : "Event added", "success");
      }
      setForm(null);
      // Only jump if the new item lands outside what's on screen.
      const [vs, ve] = view === "week"
        ? [dkey(startOfWeek(cursor, WEEK_OPTS)), dkey(endOfWeek(cursor, WEEK_OPTS))]
        : [dkey(startOfWeek(startOfMonth(cursor), WEEK_OPTS)), dkey(endOfWeek(endOfMonth(cursor), WEEK_OPTS))];
      if ((view === "month" || view === "week") && (v.date < vs || v.date > ve)) setCursor(parseISO(v.date));
    } catch {
      addToast("Couldn't save. Check your connection and try again.", "error");
    }
  };

  const moveEvent = useCallback(async (id: string, date: string, start?: string) => {
    const e = byId.get(id);
    if (!e) return;
    const wasTimed = !e.meta.tbc && !!e.start;
    const dur = wasTimed ? Math.max(toMin(e.end || e.start) - toMin(e.start), 15) : 60;
    let s = e.meta.tbc ? "09:00" : e.start || "09:00";
    let en = e.meta.tbc ? "09:00" : e.end || s;
    let description = e.description;
    if (start) { s = start; en = fromMin(toMin(start) + dur); if (e.meta.tbc) description = buildDescription(e.body, { ...e.meta, tbc: false }); }
    if (date === e.date && s === (e.meta.tbc ? "09:00" : e.start) && description === e.description) return;
    const before = snapshot(e);
    try {
      await updateEvent(id, { date, startTime: toStamp(date, s), endTime: toStamp(date, en), description });
      offerUndo(`Moved to ${format(parseISO(date), "EEE d MMM")}${start ? `, ${start}` : ""}`, () => updateEvent(id, before));
    } catch { addToast("Couldn't move that", "error"); }
  }, [byId, updateEvent, offerUndo, addToast]);

  const shiftEvents = async (ids: string[], days: number) => {
    const evs = ids.map((id) => byId.get(id)).filter(Boolean) as Ev[];
    const before = evs.map((e) => [e.id, snapshot(e)] as const);
    try {
      for (const e of evs) {
        const d = dkey(addDays(parseISO(e.date), days));
        const s = e.meta.tbc ? "09:00" : e.start || "09:00"; const en = e.meta.tbc ? "09:00" : e.end || s;
        await updateEvent(e.id, { date: d, startTime: toStamp(d, s), endTime: toStamp(d, en) });
      }
      offerUndo(`Moved ${evs.length > 1 ? `${evs.length} items ` : ""}${days > 0 ? "+" : ""}${days} day${Math.abs(days) === 1 ? "" : "s"}`,
        async () => { for (const [id, b] of before) await updateEvent(id, b); });
    } catch { addToast("Couldn't move those", "error"); }
  };

  const setStatus = useCallback(async (ids: string[], status: PostStatus) => {
    const evs = (ids.map((id) => byId.get(id)).filter(Boolean) as Ev[]).filter((e) => e.type === "Post" && (e.meta.status || "idea") !== status);
    if (!evs.length) return;
    const before = evs.map((e) => [e.id, e.description] as const);
    try {
      for (const e of evs) await updateEvent(e.id, { description: buildDescription(e.body, { ...e.meta, status }) });
      offerUndo(`${evs.length > 1 ? `${evs.length} posts` : "Marked"} ${STATUSES[status].label.toLowerCase()}`,
        async () => { for (const [id, d] of before) await updateEvent(id, { description: d }); });
    } catch { addToast("Couldn't update status", "error"); }
  }, [byId, updateEvent, offerUndo, addToast]);

  const updateMeta = useCallback(async (ids: string[], patch: Partial<EventMeta>, label: string) => {
    const evs = ids.map((id) => byId.get(id)).filter(Boolean) as Ev[];
    if (!evs.length) return;
    const before = evs.map((e) => [e.id, e.description] as const);
    try {
      for (const e of evs) await updateEvent(e.id, { description: buildDescription(e.body, { ...e.meta, ...patch }) });
      offerUndo(label, async () => { for (const [id, d] of before) await updateEvent(id, { description: d }); });
    } catch { addToast("Couldn't save that", "error"); }
  }, [byId, updateEvent, offerUndo, addToast]);

  const assign = (ids: string[], owner: string) => {
    const who = owner ? (owner === meId ? "you" : people.find((p) => p.id === owner)?.name.split(" ")[0] || "them") : "nobody";
    return updateMeta(ids, { owner: owner || undefined }, `${ids.length > 1 ? `${ids.length} items` : "Assigned"} ${ids.length > 1 ? "assigned to" : "to"} ${who}`);
  };

  // Grid view: drop one post on another to trade dates (each keeps its own time).
  const swapDates = useCallback(async (aId: string, bId: string) => {
    const a = byId.get(aId); const b = byId.get(bId);
    if (!a || !b || a.date === b.date) return;
    const at = (e: Ev, date: string) => {
      const s = e.meta.tbc ? "09:00" : e.start || "09:00"; const en = e.meta.tbc ? "09:00" : e.end || s;
      return { date, startTime: toStamp(date, s), endTime: toStamp(date, en) };
    };
    const before = [[a.id, snapshot(a)], [b.id, snapshot(b)]] as const;
    try {
      await updateEvent(a.id, at(a, b.date)); await updateEvent(b.id, at(b, a.date));
      offerUndo(`Swapped "${a.title}" and "${b.title}"`, async () => { for (const [id, s] of before) await updateEvent(id, s); });
    } catch { addToast("Couldn't swap those", "error"); }
  }, [byId, updateEvent, offerUndo, addToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeEvents = async (ids: string[]) => {
    const evs = ids.map((id) => byId.get(id)).filter(Boolean) as Ev[];
    setDetailId(null); setForm(null);
    try {
      for (const e of evs) await deleteEvent(e.id);
      offerUndo(evs.length > 1 ? `Deleted ${evs.length} items` : `Deleted "${evs[0]?.title}"`,
        async () => { for (const e of evs) await addEvent(payloadFromEvent(e)); });
    } catch { addToast("Couldn't delete that", "error"); }
  };

  const runImport = async ({ create, update, remove }: ImportPlan) => {
    let ok = 0;
    for (const s of create) { try { await addEvent(payloadFromForm(scheduleToForm(s))); ok++; } catch { /* continue */ } }
    for (const { id, item } of update) {
      // Refresh the plan's text, but keep what the team has added since (owner, links, results…).
      const cur = byId.get(id)?.meta || {};
      const f = scheduleToForm(item);
      const merged = { ...f, feed: !!cur.feed, owner: cur.owner || "", cover: cur.cover || "", postUrl: cur.postUrl || "", results: cur.results, platforms: cur.platforms?.length ? cur.platforms : f.platforms };
      try { await updateEvent(id, payloadFromForm(merged)); ok++; } catch { /* continue */ }
    }
    for (const id of remove) { try { await deleteEvent(id); ok++; } catch { /* continue */ } }
    const total = create.length + update.length + remove.length;
    addToast(ok === total ? `Calendar updated (${ok} changes)` : `Made ${ok} of ${total} changes. Try again for the rest.`, ok === total ? "success" : "error");
    setImportOpen(false);
  };

  const rangeLabel = view === "week"
    ? (() => { const s = startOfWeek(cursor, WEEK_OPTS); const e = endOfWeek(cursor, WEEK_OPTS); return s.getMonth() === e.getMonth() ? `${format(s, "d")}–${format(e, "d MMMM yyyy")}` : `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`; })()
    : view === "month" ? format(cursor, "MMMM yyyy") : view === "board" ? "Content board" : view === "grid" ? "Instagram grid" : "Everything coming up";
  const exportSet = view === "month"
    ? filtered.filter((e) => e.date >= dkey(startOfMonth(cursor)) && e.date <= dkey(endOfMonth(cursor)))
    : filtered;
  const filterCount = [typeFilter, statusFilter, formatFilter, platformFilter, ownerFilter].filter((f) => f !== "all").length;
  const clearFilters = () => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); setFormatFilter("all"); setPlatformFilter("all"); setOwnerFilter("all"); setHidden([]); setHideNoCampaign(false); };

  return (
    <DndProvider backend={HTML5Backend}>
      <PeopleContext.Provider value={peopleCtx}>
      <div className="p-4 md:p-6 min-h-screen" style={{ background: C.page, color: C.ink }}>
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight leading-none">Calendar</h1>
            <p className="text-[13.5px] mt-2" style={{ color: C.sub }}>
              This week: {weekStats.posts} post{weekStats.posts === 1 ? "" : "s"}, {weekStats.events} event{weekStats.events === 1 ? "" : "s"}
              {weekStats.overdue > 0 && (
                <> · <button type="button" onClick={() => { setStatusFilter("overdue"); setView("list"); }} className="font-medium underline underline-offset-2" style={{ color: "#B91C1C" }}>{weekStats.overdue} overdue</button></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setImportOpen(true)} className="h-9 px-3 rounded-xl border bg-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-stone-50" style={{ borderColor: C.line }}>
              <Upload className="w-4 h-4" /> Import
            </button>
            <Popover align="right" width={230} trigger={(open, toggle) => (
              <button type="button" onClick={toggle} aria-expanded={open} className="h-9 px-3 rounded-xl border bg-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-stone-50" style={{ borderColor: C.line }}>
                <Download className="w-4 h-4" /> Export
              </button>
            )}>
              {(close) => (
                <>
                  <p className="px-2.5 pt-1 pb-1.5 text-[11.5px]" style={{ color: C.faint }}>{exportSet.length} items in the current view</p>
                  <MenuItem onClick={() => { exportCsv(exportSet); close(); }}>Spreadsheet (.csv)</MenuItem>
                  <MenuItem onClick={() => { exportIcs(exportSet); close(); }}>Google / Outlook calendar (.ics)</MenuItem>
                </>
              )}
            </Popover>
            <div className="flex rounded-xl overflow-hidden shadow-sm" style={{ background: C.accent }}>
              <button type="button" onClick={() => openCreate(undefined, "Post")} className="h-9 pl-3.5 pr-3 text-[13px] font-semibold text-white inline-flex items-center gap-1.5 hover:brightness-95" title="New post (N)">
                <Plus className="w-4 h-4" /> New post
              </button>
              <Popover align="right" width={190} trigger={(open, toggle) => (
                <button type="button" onClick={toggle} aria-label="More things to add" aria-expanded={open} className="h-9 px-2 text-white border-l border-white/30 hover:brightness-95">
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}>
                {(close) => EVENT_TYPES.map((t) => (
                  <MenuItem key={t} onClick={() => { close(); openCreate(undefined, t); }}>New {EVENT_LABELS[t].toLowerCase()}</MenuItem>
                ))}
              </Popover>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(view === "month" || view === "week") && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={goToday} className="h-9 px-3 rounded-xl border bg-white text-[13px] font-medium hover:bg-stone-50" style={{ borderColor: C.line }} title="Today (T)">Today</button>
              <button type="button" onClick={goPrev} className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-white" aria-label={`Previous ${view}`}><ChevronLeft className="w-5 h-5" /></button>
              <button type="button" onClick={goNext} className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-white" aria-label={`Next ${view}`}><ChevronRight className="w-5 h-5" /></button>
            </div>
          )}
          <h2 className="text-[18px] font-semibold mr-auto px-1" aria-live="polite">{rangeLabel}</h2>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.faint }} />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search the calendar"
              className="h-9 pl-9 pr-8 rounded-xl border bg-white text-[13px] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 w-40 md:w-56" style={{ borderColor: C.line }} />
            {search ? (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-stone-100"><X className="w-3.5 h-3.5" style={{ color: C.sub }} /></button>
            ) : <span className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline"><Kbd>/</Kbd></span>}
          </div>

          <Popover align="right" width={300} trigger={(open, toggle) => (
            <button type="button" onClick={toggle} aria-expanded={open} className="h-9 px-3 rounded-xl border bg-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-stone-50"
              style={{ borderColor: filterCount ? C.accent : C.line, color: filterCount ? C.accentInk : C.ink }}>
              <SlidersHorizontal className="w-4 h-4" /> Filter{filterCount ? ` (${filterCount})` : ""}
            </button>
          )}>
            {() => (
              <div className="p-1.5 flex flex-col gap-3">
                <div>
                  <p className="text-[12px] font-medium mb-1.5" style={{ color: C.sub }}>Type</p>
                  <div className="flex flex-wrap gap-1">
                    {(["all", ...EVENT_TYPES] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setTypeFilter(t)} className="px-2.5 py-1 rounded-lg text-[12.5px] border"
                        style={{ borderColor: typeFilter === t ? C.ink : C.line, background: typeFilter === t ? C.ink : "white", color: typeFilter === t ? "white" : C.sub }}>
                        {t === "all" ? "All" : EVENT_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium mb-1.5" style={{ color: C.sub }}>Assigned to</p>
                  <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-[13px] bg-white" style={{ borderColor: C.line }} aria-label="Assigned to">
                    <option value="all">Anyone</option>
                    {meId && <option value="me">Me</option>}
                    <option value="none">Nobody yet</option>
                    {people.filter((p) => p.id !== meId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[12px] font-medium mb-1.5" style={{ color: C.sub }}>Format</p>
                  <div className="flex flex-wrap gap-1">
                    {(["all", ...FORMATS] as const).map((f) => (
                      <button key={f} type="button" onClick={() => setFormatFilter(f)} className="px-2.5 py-1 rounded-lg text-[12.5px] border"
                        style={{ borderColor: formatFilter === f ? C.ink : C.line, background: formatFilter === f ? C.ink : "white", color: formatFilter === f ? "white" : C.sub }}>
                        {f === "all" ? "All" : f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium mb-1.5" style={{ color: C.sub }}>Platform</p>
                  <div className="flex flex-wrap gap-1">
                    {(["all", ...PLATFORM_IDS] as const).map((p) => (
                      <button key={p} type="button" onClick={() => setPlatformFilter(p)} className="px-2.5 py-1 rounded-lg text-[12.5px] border"
                        style={{ borderColor: platformFilter === p ? C.ink : C.line, background: platformFilter === p ? C.ink : "white", color: platformFilter === p ? "white" : C.sub }}>
                        {p === "all" ? "All" : PLATFORMS[p].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium mb-1.5" style={{ color: C.sub }}>Status</p>
                  <div className="flex flex-col">
                    {(["all", ...STATUS_IDS, "overdue"] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setStatusFilter(s)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] hover:bg-stone-50 text-left">
                        <span className="w-4">{statusFilter === s && <Check className="w-4 h-4" style={{ color: C.accentInk }} />}</span>
                        {s === "all" ? "Any status" : s === "overdue" ? "Overdue" : STATUSES[s].label}
                      </button>
                    ))}
                  </div>
                </div>
                {filtersActive && <button type="button" onClick={clearFilters} className="text-[12.5px] font-medium text-left px-2" style={{ color: C.accentInk }}>Clear all filters</button>}
              </div>
            )}
          </Popover>

          {meId && (
            <button type="button" onClick={() => setOwnerFilter((f) => (f === "me" ? "all" : "me"))} aria-pressed={ownerFilter === "me"} title="Only things assigned to me"
              className="h-9 px-3 rounded-xl border text-[13px] font-medium"
              style={ownerFilter === "me" ? { background: C.ink, color: "white", borderColor: C.ink } : { background: "white", borderColor: C.line, color: C.ink }}>
              Mine
            </button>
          )}
          <div className="flex rounded-xl p-1 border bg-white" style={{ borderColor: C.line }} role="tablist" aria-label="View">
            {VIEWS.map(({ id, label, key, icon: Icon }) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} title={`${label} (${key})`}
                className="h-7 px-2.5 rounded-lg text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors"
                style={view === id ? { background: C.ink, color: "white" } : { color: C.sub }}>
                <Icon className="w-4 h-4" /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-x-3 gap-y-1.5 mb-3 text-[12.5px] flex-wrap" style={{ color: C.sub }}>
          <div className="flex rounded-lg p-0.5 border bg-white" style={{ borderColor: C.line }} role="group" aria-label="Colour by">
            {(["person", "campaign"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setColorBy(m)} aria-pressed={colorBy === m}
                className="h-6 px-2 rounded-md text-[12px] font-medium" style={colorBy === m ? { background: C.ink, color: "white" } : { color: C.sub }}>
                {m === "person" ? "Colour by person" : "Colour by campaign"}
              </button>
            ))}
          </div>
          {colorBy === "person" && (
            <>
              {people.map((p) => (
                <button key={p.id} type="button" onClick={() => setOwnerFilter((f) => (f === p.id || (f === "me" && p.id === meId) ? "all" : p.id))}
                  title={`Only show ${p.name}'s`} className="inline-flex items-center gap-1.5 rounded-md px-1 hover:bg-white"
                  style={{ fontWeight: p.id === meId ? 600 : 400, color: p.id === meId ? C.ink : C.sub }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: ownerColors.get(p.id) }} />
                  {p.id === meId ? `${p.name.split(" ")[0]} (you)` : p.name.split(" ")[0]}
                </button>
              ))}
              <span className="inline-flex items-center gap-1.5 px-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: UNASSIGNED_COLOR }} />Unassigned</span>
            </>
          )}
        </div>

        {filtersActive && (
          <div className="flex items-center gap-2 mb-3 text-[12.5px] flex-wrap" style={{ color: C.sub }}>
            <span>Showing {filtered.length} of {all.length}</span>
            {hidden.length > 0 && <span className="px-2 py-0.5 rounded-full bg-white border" style={{ borderColor: C.line }}>{hidden.length} campaign{hidden.length > 1 ? "s" : ""} hidden</span>}
            {typeFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-white border" style={{ borderColor: C.line }}>{EVENT_LABELS[typeFilter]}s</span>}
            {ownerFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-white border" style={{ borderColor: C.line }}>{ownerFilter === "me" ? "Mine" : ownerFilter === "none" ? "Unassigned" : people.find((p) => p.id === ownerFilter)?.name || "Assigned"}</span>}
            {formatFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-white border" style={{ borderColor: C.line }}>{formatFilter}</span>}
            {platformFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-white border" style={{ borderColor: C.line }}>{PLATFORMS[platformFilter].label}</span>}
            {statusFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-white border" style={{ borderColor: C.line }}>{statusFilter === "overdue" ? "Overdue" : STATUSES[statusFilter].label}</span>}
            {search && <span className="px-2 py-0.5 rounded-full bg-white border" style={{ borderColor: C.line }}>&ldquo;{search}&rdquo;</span>}
            <button type="button" onClick={clearFilters} className="font-medium underline underline-offset-2" style={{ color: C.accentInk }}>Clear</button>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-4 items-start ${view === "board" || view === "grid" ? "" : "lg:grid-cols-[minmax(0,1fr)_272px]"}`}>
          <main className="min-w-0 order-1">
            {all.length === 0 && (
              <div className="mb-4 rounded-2xl border bg-white p-5 flex flex-wrap items-center gap-4" style={{ borderColor: C.line }}>
                <div className="flex-1 min-w-[220px]">
                  <p className="font-semibold">Your calendar is empty</p>
                  <p className="text-[13px] mt-0.5" style={{ color: C.sub }}>Import the Hub After Hours and fashionABLE schedules to start with everything that&apos;s already planned.</p>
                </div>
                <button type="button" onClick={() => setImportOpen(true)} className="h-9 px-4 rounded-xl text-[13px] font-semibold text-white" style={{ background: C.accent }}>Import schedules</button>
              </div>
            )}
            {all.length > 0 && missingTotal > 0 && !bannerHidden && (
              <div className="mb-4 rounded-2xl border px-4 py-3 flex flex-wrap items-center gap-3" style={{ borderColor: "#F5D27A", background: "#FFFBEB" }}>
                <p className="flex-1 min-w-[220px] text-[13px]" style={{ color: C.ink }}>
                  <b className="font-semibold">The plan has {missingTotal} update{missingTotal === 1 ? "" : "s"} for your calendar</b>
                  <span style={{ color: C.sub }}> · {missing.map((g) => g.text).join(", ")}</span>
                </p>
                <button type="button" onClick={() => setImportOpen(true)} className="h-8 px-3.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: C.accent }}>Review and add</button>
                <button type="button" onClick={() => setBannerHidden(true)} aria-label="Dismiss" className="p-1 rounded-lg hover:bg-amber-100"><X className="w-4 h-4" style={{ color: C.sub }} /></button>
              </div>
            )}
            {view !== "board" && view !== "grid" && <TodayStrip all={all} today={today} onOpen={(e) => setDetailId(e.id)} onPosted={(id) => setStatus([id], "posted")} />}
            {view === "month" && <MonthView cursor={cursor} byDate={byDate} today={today} onOpen={(e) => setDetailId(e.id)} onCreate={(d) => openCreate(d, "Post")} onDrop={(id, d) => moveEvent(id, d)} />}
            {view === "week" && <WeekView cursor={cursor} byDate={byDate} today={today} onOpen={(e) => setDetailId(e.id)} onCreate={(d, s) => openCreate(d, s ? "Other" : "Post", s)} onDrop={moveEvent} />}
            {view === "board" && <BoardView events={filtered} today={today} onOpen={(e) => setDetailId(e.id)} onStatus={(id, s) => setStatus([id], s)} onCreate={(s) => openCreate(undefined, "Post", undefined, s)} />}
            {view === "grid" && <GridView events={filtered} today={today} onOpen={(e) => setDetailId(e.id)} onSwap={swapDates} />}
            {view === "list" && (
              <ListView events={filtered} today={today} filtersActive={filtersActive} onOpen={(e) => setDetailId(e.id)} onCreate={() => openCreate()}
                onStatus={(id, s) => setStatus([id], s)} onBulkStatus={setStatus} onBulkShift={shiftEvents} onBulkOwner={assign} onBulkDelete={removeEvents} />
            )}
          </main>
          <div className={view === "board" || view === "grid" ? "hidden" : "order-2"}>
            <Sidebar all={all} today={today} cursor={cursor} hidden={hidden} hideNoCampaign={hideNoCampaign}
              onToggleCampaign={(c) => setHidden((h) => (h.includes(c) ? h.filter((x) => x !== c) : [...h, c]))}
              onOnlyCampaign={(c) => { setHidden((["fashionable", "hub-after-hours", "gifts4good", "general"] as CampaignId[]).filter((x) => x !== c)); setHideNoCampaign(true); }}
              onToggleNoCampaign={() => setHideNoCampaign((v) => !v)}
              onJump={(d) => jumpTo(d)} onOpen={(e) => setDetailId(e.id)} />
            <button type="button" onClick={() => setHelpOpen(true)} className="mt-3 hidden lg:inline-flex items-center gap-1.5 text-[12px] px-1" style={{ color: C.faint }}>
              <Keyboard className="w-3.5 h-3.5" /> Keyboard shortcuts <Kbd>?</Kbd>
            </button>
          </div>
        </div>

        {detail && !form && (
          <EventDrawer e={detail} onClose={() => setDetailId(null)} onEdit={() => setForm({ mode: "edit", id: detail.id, values: formFromEvent(detail) })}
            onDuplicate={() => { setDetailId(null); setForm({ mode: "create", values: { ...formFromEvent(detail), title: `${detail.title} (copy)`, src: undefined, status: detail.type === "Post" ? "idea" : detail.meta.status || "idea" } }); }}
            onDelete={() => removeEvents([detail.id])} onStatus={(s) => setStatus([detail.id], s)} onShift={(d) => shiftEvents([detail.id], d)}
            onJump={() => { jumpTo(detail.date); setDetailId(null); }}
            onMeta={(patch) => "owner" in patch && Object.keys(patch).length === 1 ? assign([detail.id], patch.owner || "")
              : "feed" in patch && Object.keys(patch).length === 1 ? updateMeta([detail.id], patch, patch.feed ? "Added to the main feed" : "Taken off the main feed")
              : updateMeta([detail.id], patch, "Results saved")} />
        )}
        {form && (
          <EventForm key={form.id || "new"} mode={form.mode} initial={form.values} onCancel={() => setForm(null)} onSave={saveForm}
            onDelete={form.mode === "edit" && form.id ? () => removeEvents([form.id as string]) : undefined} />
        )}
        {importOpen && <ImportModal existing={all} onClose={() => setImportOpen(false)} onImport={runImport} />}
        {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}

        {undo && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl shadow-2xl text-[13px] whitespace-nowrap max-w-[92vw]" style={{ background: C.ink, color: "white" }} role="status">
            <span>{undo.label}</span>
            <button type="button" onClick={doUndo} className="px-3 py-1 rounded-lg font-semibold" style={{ color: C.today }}>Undo</button>
            <button type="button" onClick={() => setUndo(null)} aria-label="Dismiss" className="p-1 rounded-lg opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      </PeopleContext.Provider>
    </DndProvider>
  );
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["N", "New post"], ["E", "New event"], ["T", "Jump to today"], ["← →", "Previous / next"],
    ["M W B G L", "Month, week, board, grid, list"], ["/", "Search"], ["Esc", "Close a panel"], ["Ctrl Enter", "Save the form"],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(24,24,27,.3)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm" role="dialog" aria-label="Keyboard shortcuts">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-stone-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-col gap-2">
          {rows.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between text-[13px]">
              <span style={{ color: C.sub }}>{d}</span>
              <span className="flex gap-1">{k.split(" ").map((x) => <Kbd key={x}>{x}</Kbd>)}</span>
            </div>
          ))}
        </div>
        <p className="text-[12px] mt-4" style={{ color: C.faint }}>Drag anything to reschedule it. In Week view, drop it on a time. On the board, drop a card on a column to change its status.</p>
      </div>
    </div>
  );
}
