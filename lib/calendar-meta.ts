// Calendar metadata (campaign, status, format, caption…) for events.
//
// The `events` table has no columns for these, so they ride along at the end of
// the description as a hidden marker:  <!--oa:{"campaign":"fashionable",...}-->
// No DB migration needed. Always read descriptions through `parseEventMeta`
// so the marker never shows up in the UI.

export type CampaignId = "fashionable" | "hub-after-hours" | "gifts4good" | "general";
export type PostStatus = "idea" | "in-progress" | "waiting" | "ready" | "posted";
export type PostFormat = "Reel" | "Carousel" | "Static" | "Story" | "Video" | "EDM" | "Other";

export interface EventMeta {
  campaign?: CampaignId;
  status?: PostStatus;
  format?: PostFormat;
  /** Time not confirmed yet — UI shows "No set time" instead of a clock time. */
  tbc?: boolean;
  caption?: string;
  hashtags?: string;
  /** Where the asset lives (file name, Figma frame, Canva link…) */
  asset?: string;
  /** What's blocking it (consent, footage, quote…) */
  needs?: string;
  /** Stable id for items that came from an imported schedule */
  src?: string;
}

export const CAMPAIGNS: Record<CampaignId, { label: string; short: string; color: string; date?: string; dateLabel?: string }> = {
  fashionable: { label: "fashionABLE Show", short: "fashionABLE", color: "#E83686", date: "2026-11-26", dateLabel: "show" },
  "hub-after-hours": { label: "Hub After Hours", short: "After Hours", color: "#2F7A7E" },
  gifts4good: { label: "Gifts4Good", short: "Gifts4Good", color: "#C2611F" },
  general: { label: "General", short: "General", color: "#78716C" },
};
export const CAMPAIGN_IDS = Object.keys(CAMPAIGNS) as CampaignId[];

export const STATUSES: Record<PostStatus, { label: string; color: string; bg: string; hint: string }> = {
  idea: { label: "Idea", color: "#57534E", bg: "#F1F0EC", hint: "Not started" },
  "in-progress": { label: "In progress", color: "#1D4ED8", bg: "#EEF3FF", hint: "Being filmed or made" },
  waiting: { label: "Waiting on", color: "#A15C07", bg: "#FFF6E0", hint: "Blocked by consent, footage, a quote…" },
  ready: { label: "Ready", color: "#6D28D9", bg: "#F4EFFF", hint: "Made and approved, not posted yet" },
  posted: { label: "Posted", color: "#15803D", bg: "#EDFAF1", hint: "Live" },
};
export const STATUS_IDS = Object.keys(STATUSES) as PostStatus[];

export const FORMATS: PostFormat[] = ["Reel", "Carousel", "Static", "Story", "Video", "EDM", "Other"];

export const LOCKED_HASHTAGS = "#OneAndAll #SydneyNDIS #Randwick";
export const CAMPAIGN_HASHTAGS: Partial<Record<CampaignId, string>> = {
  fashionable: "#fashionABLE",
  "hub-after-hours": "#HubAfterHours",
};

const META_RE = /\s*<!--oa:(\{[\s\S]*?\})-->\s*$/;

export function parseEventMeta(description?: string | null): { body: string; meta: EventMeta } {
  const raw = description || "";
  const m = raw.match(META_RE);
  if (!m) return { body: raw, meta: {} };
  try {
    const meta = JSON.parse(m[1]) as EventMeta;
    return { body: raw.replace(META_RE, ""), meta };
  } catch {
    return { body: raw.replace(META_RE, ""), meta: {} };
  }
}

export function buildDescription(body: string, meta: EventMeta): string {
  const clean: Record<string, unknown> = {};
  (Object.keys(meta) as (keyof EventMeta)[]).forEach((k) => {
    const v = meta[k];
    if (v === undefined || v === null || v === "" || v === false) return;
    clean[k] = typeof v === "string" ? v.trim() : v;
  });
  const text = (body || "").replace(META_RE, "").trimEnd();
  if (Object.keys(clean).length === 0) return text;
  // Escape ">" so a value can never close the HTML comment early.
  const json = JSON.stringify(clean).replace(/>/g, "\\u003e");
  return `${text}${text ? "\n\n" : ""}<!--oa:${json}-->`;
}
