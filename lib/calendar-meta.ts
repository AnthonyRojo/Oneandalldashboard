// Calendar metadata (campaign, status, format, time-TBC) for events.
//
// The `events` table has no columns for these, so they ride along at the end of
// the description as a hidden marker:  <!--oa:{"campaign":"fashionable",...}-->
// No DB migration needed. Always read descriptions through `parseEventMeta`
// so the marker never shows up in the UI.

export type CampaignId = "fashionable" | "hub-after-hours" | "gifts4good" | "general";
export type PostStatus = "idea" | "in-progress" | "waiting" | "ready" | "posted";
export type PostFormat = "Reel" | "Carousel" | "Static" | "Story" | "EDM" | "Other";

export interface EventMeta {
  campaign?: CampaignId;
  status?: PostStatus;
  format?: PostFormat;
  /** Time not confirmed yet — UI shows "Time TBC" instead of a clock time. */
  tbc?: boolean;
}

export const CAMPAIGNS: Record<CampaignId, { label: string; short: string; color: string }> = {
  fashionable: { label: "fashionABLE Show", short: "fashionABLE", color: "#E83686" },
  "hub-after-hours": { label: "Hub After Hours", short: "After Hours", color: "#6D28D9" },
  gifts4good: { label: "Gifts4Good", short: "Gifts4Good", color: "#059669" },
  general: { label: "General", short: "General", color: "#F59E0B" },
};
export const CAMPAIGN_IDS = Object.keys(CAMPAIGNS) as CampaignId[];

export const STATUSES: Record<PostStatus, { label: string; color: string; bg: string }> = {
  idea: { label: "Idea", color: "#6b7280", bg: "#f3f4f6" },
  "in-progress": { label: "In progress", color: "#2563eb", bg: "#eff6ff" },
  waiting: { label: "Waiting on", color: "#b45309", bg: "#fffbeb" },
  ready: { label: "Ready", color: "#7c3aed", bg: "#f5f3ff" },
  posted: { label: "Posted", color: "#15803d", bg: "#f0fdf4" },
};
export const STATUS_IDS = Object.keys(STATUSES) as PostStatus[];

export const FORMATS: PostFormat[] = ["Reel", "Carousel", "Static", "Story", "EDM", "Other"];

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
  const clean: EventMeta = {};
  if (meta.campaign) clean.campaign = meta.campaign;
  if (meta.status) clean.status = meta.status;
  if (meta.format) clean.format = meta.format;
  if (meta.tbc) clean.tbc = true;
  const text = (body || "").replace(META_RE, "").trimEnd();
  if (Object.keys(clean).length === 0) return text;
  return `${text}${text ? "\n\n" : ""}<!--oa:${JSON.stringify(clean)}-->`;
}
