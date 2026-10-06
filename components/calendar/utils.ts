import { format, parseISO, differenceInCalendarDays } from "date-fns";
import type { CalendarEvent, EventType } from "@/context/AppContext";
import { Video, Eye, FileText, CalendarClock, Clapperboard, GalleryHorizontalEnd, Image, CircleDashed, Mail, Shapes } from "lucide-react";
import {
  CAMPAIGNS, PLATFORMS, IG, parseEventMeta, buildDescription,
  type CampaignId, type EventMeta, type Platform, type PostFormat, type PostResults, type PostStatus,
} from "@/lib/calendar-meta";

export const EVENT_COLORS: Record<EventType, string> = {
  Meeting: "#DB2777",
  Review: "#D97706",
  Post: "#7C3AED",
  Other: "#475569",
};
export const EVENT_LABELS: Record<EventType, string> = { Post: "Post", Meeting: "Meeting", Review: "Review", Other: "Event" };
export const EVENT_ICONS: Record<EventType, typeof Video> = { Meeting: Video, Review: Eye, Post: FileText, Other: CalendarClock };
export const EVENT_TYPES: EventType[] = ["Post", "Other", "Meeting", "Review"];
export const FORMAT_ICONS: Record<PostFormat, typeof Video> = {
  Reel: Clapperboard, Carousel: GalleryHorizontalEnd, Static: Image, Story: CircleDashed, Video: Video, EDM: Mail, Other: Shapes,
};
export const WEEK_OPTS = { weekStartsOn: 1 as const }; // Monday-first (AU)

export const OWNER_COLORS = [
  "#2563EB", "#DC2626", "#16A34A", "#9333EA", "#EA580C", "#0891B2",
  "#DB2777", "#65A30D", "#4F46E5", "#B45309", "#0D9488", "#BE123C",
];
export const UNASSIGNED_COLOR = "#9AA0AB";

/** Colour per person, by team order so teammates never share one (until the palette runs out). */
export const ownerColorMap = (ids: string[]) =>
  new Map(ids.map((id, i) => [id, OWNER_COLORS[i % OWNER_COLORS.length]]));

export const C = {
  page: "#F7F6F2",
  surface: "#FFFFFF",
  ink: "#1F2328",
  sub: "#5B6170",
  faint: "#9AA0AB",
  line: "#E8E6E0",
  lineSoft: "#F1EFEA",
  accent: "#F59E0B",
  accentInk: "#B45309",
  today: "#FFD734",
};

export interface Ev extends CalendarEvent {
  body: string;
  meta: EventMeta;
  color: string;
  start: string; // HH:mm
  end: string;
}

export const hhmm = (t?: string) => {
  if (!t) return "";
  const s = t.includes("T") ? t.split("T")[1] : t;
  return s.slice(0, 5);
};
export const fmt12 = (hm: string) => {
  if (!hm) return "";
  const [h, m] = hm.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "pm" : "am"}`;
};
export const timeLabel = (e: { meta: EventMeta; start: string; end: string }) =>
  e.meta.tbc ? "No set time" : e.end && e.end !== e.start ? `${fmt12(e.start)}–${fmt12(e.end)}` : fmt12(e.start);

// Times are stored as UTC wall-clock so they read back identically everywhere.
export const toStamp = (date: string, hm: string) => `${date}T${hm}:00Z`;
export const todayStr = () => format(new Date(), "yyyy-MM-dd");
export const dkey = (d: Date) => format(d, "yyyy-MM-dd");
export const relDay = (date: string) => {
  const n = differenceInCalendarDays(parseISO(date), new Date());
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
};
export const toMin = (hm: string) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
export const fromMin = (t: number) => {
  const c = Math.min(Math.max(Math.round(t), 0), 23 * 60 + 59);
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
};
export const addMinutes = (hm: string, mins: number) => fromMin(toMin(hm) + mins);

export function enrich(e: CalendarEvent, ownerColors?: Map<string, string>): Ev {
  const { body, meta } = parseEventMeta(e.description);
  const color = ownerColors
    ? (meta.owner && ownerColors.get(meta.owner)) || UNASSIGNED_COLOR
    : meta.campaign
      ? CAMPAIGNS[meta.campaign]?.color || EVENT_COLORS[e.type]
      : e.type === "Post" && e.color ? e.color : EVENT_COLORS[e.type] || "#475569";
  return { ...e, body, meta, color, start: hhmm(e.startTime), end: hhmm(e.endTime) };
}
export const sortEv = (a: Ev, b: Ev) =>
  a.date.localeCompare(b.date) || Number(!a.meta.tbc) - Number(!b.meta.tbc) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title);
export const isOverdue = (e: Ev, today: string) =>
  e.type === "Post" && !!e.meta.status && e.meta.status !== "posted" && e.date < today;
export const isPosted = (e: Ev) => e.meta.status === "posted";

/** Shows on the Instagram profile grid (feed formats, IG or no platform set yet). */
export const onIgGrid = (e: Ev) =>
  e.type === "Post" && e.meta.format !== "Story" && e.meta.format !== "EDM" && (!e.meta.platforms?.length || e.meta.platforms.includes("instagram"));

export const safeUrl = (u?: string) => (u ? (/^https?:\/\//i.test(u) ? u : `https://${u}`) : "");

/** "52 days to the show" style countdown for posts in a campaign with a key date. */
export function countdown(e: { date: string; meta: EventMeta }) {
  const k = e.meta.campaign ? CAMPAIGNS[e.meta.campaign] : undefined;
  if (!k?.date) return null;
  const n = differenceInCalendarDays(parseISO(k.date), parseISO(e.date));
  const what = k.dateLabel || "date";
  return { n, label: n === 0 ? `${what[0].toUpperCase()}${what.slice(1)} day` : n > 0 ? `${n} day${n === 1 ? "" : "s"} to the ${what}` : `${-n} day${n === -1 ? "" : "s"} after the ${what}`, short: n === 0 ? "D-day" : n > 0 ? `D-${n}` : `D+${-n}` };
}

export const hashtagCount = (tags?: string) => (tags || "").split(/\s+/).filter((t) => t.startsWith("#")).length;

/** What still has to happen before a post can go out. Ticked items first. */
export function readiness(e: { type: EventType; link?: string; meta: EventMeta }) {
  if (e.type !== "Post") return null;
  const m = e.meta;
  const checks = [
    { ok: !!m.owner, label: "Someone assigned" },
    { ok: !!m.format, label: "Format chosen" },
    { ok: !!m.caption?.trim(), label: "Caption written" },
    { ok: hashtagCount(m.hashtags) > 0 && hashtagCount(m.hashtags) <= IG.hashtagMax, label: hashtagCount(m.hashtags) > IG.hashtagMax ? `Too many hashtags (max ${IG.hashtagMax})` : "Hashtags added" },
    { ok: !!m.asset?.trim(), label: "Files linked" },
    { ok: !m.needs?.trim(), label: m.needs?.trim() ? `Waiting on: ${m.needs.trim()}` : "Nothing blocking" },
    { ok: !!m.platforms?.length, label: m.platforms?.length ? `Going to ${m.platforms.map((p) => PLATFORMS[p].label).join(", ")}` : "Platform picked" },
  ];
  return { checks, done: checks.filter((c) => c.ok).length, total: checks.length };
}

// ── Form model ───────────────────────────────────────────────────────────────

export interface FormValues {
  title: string;
  type: EventType;
  campaign: CampaignId | "";
  date: string;
  start: string;
  end: string;
  tbc: boolean;
  repeatWeeks: number;
  status: PostStatus;
  format: PostFormat | "";
  platforms: Platform[];
  story: boolean;
  caption: string;
  hashtags: string;
  asset: string;
  needs: string;
  link: string;
  notes: string;
  owner: string;
  cover: string;
  postUrl: string;
  results?: PostResults;
  src?: string;
}

export const blankForm = (date: string, type: EventType = "Post", start?: string): FormValues => ({
  title: "", type, campaign: "", date,
  start: start || "10:00", end: addMinutes(start || "10:00", 60),
  tbc: type === "Post" && !start, repeatWeeks: 1,
  status: "idea", format: "", platforms: type === "Post" ? ["instagram"] : [], story: false, caption: "", hashtags: "", asset: "", needs: "", link: "", notes: "", owner: "", cover: "", postUrl: "",
});

export const formFromEvent = (e: Ev): FormValues => ({
  title: e.title, type: e.type, campaign: e.meta.campaign || "", date: e.date,
  start: e.start || "10:00", end: e.end || e.start || "11:00", tbc: !!e.meta.tbc, repeatWeeks: 1,
  status: e.meta.status || "idea", format: e.meta.format || "", platforms: e.meta.platforms || [], story: !!e.meta.story,
  caption: e.meta.caption || "", hashtags: e.meta.hashtags || "", asset: e.meta.asset || "", needs: e.meta.needs || "",
  link: e.link || "", notes: e.body, owner: e.meta.owner || "", cover: e.meta.cover || "", postUrl: e.meta.postUrl || "", results: e.meta.results, src: e.meta.src,
});

export function payloadFromForm(v: FormValues, dateOverride?: string) {
  const date = dateOverride || v.date;
  const isPost = v.type === "Post";
  const meta: EventMeta = {
    campaign: v.campaign || undefined,
    tbc: v.tbc || undefined,
    status: isPost ? v.status : undefined,
    format: isPost && v.format ? v.format : undefined,
    platforms: isPost && v.platforms.length ? v.platforms : undefined,
    story: isPost && v.story && v.format !== "Story" ? true : undefined,
    caption: isPost ? v.caption : undefined,
    hashtags: isPost ? v.hashtags : undefined,
    asset: v.asset || undefined,
    needs: v.needs || undefined,
    owner: v.owner || undefined,
    cover: isPost && v.cover.trim() ? v.cover.trim() : undefined,
    postUrl: isPost && v.postUrl.trim() ? v.postUrl.trim() : undefined,
    results: isPost && v.results && Object.keys(v.results).length ? v.results : undefined,
    src: v.src,
  };
  const start = v.tbc ? "09:00" : v.start;
  const end = v.tbc ? "09:00" : v.end || v.start;
  return {
    title: v.title.trim(),
    description: buildDescription(v.notes, meta),
    type: v.type,
    date,
    startTime: toStamp(date, start),
    endTime: toStamp(date, end),
    link: v.link.trim(),
    color: v.campaign ? CAMPAIGNS[v.campaign].color : EVENT_COLORS[v.type],
  };
}
export type EventPayload = ReturnType<typeof payloadFromForm>;

/** Rebuild a payload from an existing event (used for undo-after-delete). */
export const payloadFromEvent = (e: Ev): EventPayload => payloadFromForm(formFromEvent(e));

// ── Export ───────────────────────────────────────────────────────────────────

function download(name: string, mime: string, text: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv(events: Ev[]) {
  const head = ["Date", "Day", "Time", "Title", "Type", "Campaign", "Format", "Platforms", "Status", "Needs", "Caption", "Hashtags", "Asset", "Link", "Notes"];
  const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
  const rows = events.map((e) => [
    e.date, format(parseISO(e.date), "EEE"), timeLabel(e), e.title, EVENT_LABELS[e.type],
    e.meta.campaign ? CAMPAIGNS[e.meta.campaign].label : "", `${e.meta.format || ""}${e.meta.story ? " + Story" : ""}`,
    (e.meta.platforms || []).map((p) => PLATFORMS[p].label).join(", "),
    e.meta.status ? e.meta.status : "", e.meta.needs || "", e.meta.caption || "", e.meta.hashtags || "",
    e.meta.asset || "", e.link || "", e.body,
  ].map(esc).join(","));
  download(`calendar-${todayStr()}.csv`, "text/csv;charset=utf-8", "\ufeff" + [head.join(","), ...rows].join("\r\n"));
}

export function exportIcs(events: Ev[]) {
  const esc = (s: string) => (s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const d = (date: string) => date.replace(/-/g, "");
  const t = (date: string, hm: string) => `${d(date)}T${hm.replace(":", "")}00`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//One&All Hub//Dashboard Calendar//EN", "CALSCALE:GREGORIAN"];
  events.forEach((e) => {
    lines.push("BEGIN:VEVENT", `UID:${e.id}@oneandall-dashboard`, `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss")}`);
    if (e.meta.tbc) {
      const next = format(new Date(parseISO(e.date).getTime() + 86400000), "yyyyMMdd");
      lines.push(`DTSTART;VALUE=DATE:${d(e.date)}`, `DTEND;VALUE=DATE:${next}`);
    } else {
      lines.push(`DTSTART:${t(e.date, e.start)}`, `DTEND:${t(e.date, e.end || e.start)}`);
    }
    const desc = [e.meta.caption, e.meta.needs && `Needs: ${e.meta.needs}`, e.body].filter(Boolean).join("\n\n");
    lines.push(`SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(desc)}`);
    if (e.link) lines.push(`URL:${esc(e.link)}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  download(`calendar-${todayStr()}.ics`, "text/calendar;charset=utf-8", lines.join("\r\n"));
}
