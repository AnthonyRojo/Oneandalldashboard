// Ready-made campaign schedule that can be imported into the calendar
// (Calendar → "Import schedule"). Items already in the calendar (same title +
// date) are skipped, so importing twice is safe.
//
// Sources: Hub Letter EDM brief, Hub After Hours video work, fashionABLE
// content calendar (merged 31-post plan). Times marked `tbc` are not confirmed.

import type { EventType } from "@/context/AppContext";
import type { CampaignId, PostFormat, PostStatus } from "@/lib/calendar-meta";

export interface ScheduleItem {
  title: string;
  date: string; // yyyy-MM-dd
  start?: string; // HH:mm — omit when tbc
  end?: string;
  type: EventType;
  campaign: CampaignId;
  status?: PostStatus;
  format?: PostFormat;
  tbc?: boolean;
  notes?: string;
}

const FA_TAGS = "#OneAndAll #SydneyNDIS #Randwick #fashionABLE";
const HAH_TAGS = "#OneAndAll #SydneyNDIS #Randwick #HubAfterHours";
const VENUE = "21 Munda St, Randwick";

// Helper for fashionABLE posts (posting time not set → tbc)
const fa = (date: string, title: string, format: PostFormat, status: PostStatus, notes?: string): ScheduleItem => ({
  title, date, type: "Post", campaign: "fashionable", format, status, tbc: true,
  notes: [notes, FA_TAGS].filter(Boolean).join("\n\n"),
});

export const HUB_AFTER_HOURS: ScheduleItem[] = [
  {
    title: "Hub After Hours: Art: Me Time (pilot)", date: "2026-08-30", start: "15:30", end: "17:30",
    type: "Other", campaign: "hub-after-hours",
    notes: `Somatic breathwork · Guided meditation · Visualisation · Intuitive art.\nBooked via Humanitix. ${VENUE}.`,
  },
  {
    title: "Hub After Hours: Art: Me Time", date: "2026-09-07", start: "18:00", end: "20:00",
    type: "Other", campaign: "hub-after-hours",
    notes: `Arrive 5:30pm for a cuppa, start 6pm.\nSomatic breathwork · Guided meditation · Visualisation · Intuitive art.\nBooked via Humanitix. ${VENUE}.`,
  },
  {
    title: "Open Day", date: "2026-09-24", start: "10:30", end: "12:00",
    type: "Other", campaign: "general",
    notes: `Connect · Explore · Experience · Discover. ${VENUE}.`,
  },
  {
    title: "Launch: Hub After Hours", date: "2026-09-24", type: "Other", campaign: "hub-after-hours", tbc: true,
    notes: "A space to slow down, listen inward, express yourself and reconnect through creativity.\nTime still TBC — update once confirmed.",
  },
  {
    title: "Hub After Hours recap reel", date: "2026-09-29", type: "Post", campaign: "hub-after-hours",
    format: "Reel", status: "ready", tbc: true,
    notes: `Final cut v12. Hook: "LONG WEEK? COME UNWIND WITH US". CTA: Secure your ticket on Humanitix · link in bio.\n\nCaption:\nLong week? Here are 3 ways to unwind at Hub After Hours 🌙\n01 🏺 Pottery Night: get your hands in the clay and take home something you made\n02 🎨 Paint Night: no pressure, no experience needed, just you and a canvas\n03 🍪 The Hang: snacks, stories and good company\nReal people. Real fun. Right here in Randwick.\nWant in on the next one? Book your spot on Humanitix. Link in bio 💛\n\n${HAH_TAGS}`,
  },
  {
    title: "Art: Me Time teaser reel", date: "2026-09-29", type: "Post", campaign: "hub-after-hours",
    format: "Reel", status: "ready", tbc: true,
    notes: `Final cut v7. FOMO teaser with cards for the 4 steps (Somatic breathwork, Guided meditation, Visualisation, Intuitive art). CTA: Secure your ticket on Humanitix · link in bio.\n\n${HAH_TAGS} #ArtMeTime`,
  },
];

export const FASHIONABLE: ScheduleItem[] = [
  {
    title: "fashionABLE Show — Transformation", date: "2026-11-26", start: "18:00", end: "21:00",
    type: "Other", campaign: "fashionable",
    notes: `Inclusive runway show + fundraiser. Theme: Transformation. ${VENUE}. Tickets: link in bio.`,
  },
  fa("2026-09-30", "Mystery teaser: \"Something is changing\"", "Reel", "ready", "Cocoon → butterfly animation, ends on 26.11.26. Mark Posted if it's up."),
  fa("2026-10-02", "Save the date", "Static", "ready", "Feed (4:5) + story (9:16). Mark Posted if it's up."),
  fa("2026-10-05", "Throwback: \"It's back\"", "Reel", "in-progress", "Re-render needed — details card still says 6–10PM. Correct time is 6–9PM."),
  fa("2026-10-07", "Theme reel: TRANSFORMATION", "Reel", "ready", "Clean version is the keeper (B&W snapping to colour)."),
  fa("2026-10-09", "Hero illustration reveal", "Carousel", "ready"),
  fa("2026-10-12", "Hype reel v9 (house track) — pin to profile", "Reel", "ready", "Check the details card shows 6–9PM before posting."),
  fa("2026-10-14", "\"What does transformation mean to you?\" #1", "Static", "waiting", "Waiting on: participant quote."),
  fa("2026-10-16", "6 weeks to go + countdown sticker", "Story", "ready"),
  fa("2026-10-19", "BTS: Prop and Pop (tie-dye + printing)", "Reel", "in-progress", "Filming."),
  fa("2026-10-21", "Meet the models #1", "Carousel", "waiting", "Waiting on: media consent."),
  fa("2026-10-23", "Transformation #2 — to-camera clip", "Reel", "in-progress", "Filming."),
  fa("2026-10-26", "BTS: Weave and Connect (fabric close-ups)", "Reel", "in-progress", "Filming."),
  fa("2026-10-28", "Meet the models #2", "Carousel", "waiting", "Waiting on: media consent."),
  fa("2026-10-30", "4 weeks to go + \"Are you coming?\" poll", "Story", "ready"),
  fa("2026-11-02", "BTS: Entwined rehearsal", "Reel", "in-progress", "Filming. Hub Letter feature goes out the same week."),
  fa("2026-11-04", "Meet the models #3", "Carousel", "waiting", "Waiting on: media consent."),
  fa("2026-11-06", "Vogue edit v10", "Reel", "ready"),
  fa("2026-11-09", "Rehearsal walk-off (3-sec walks on the beat)", "Reel", "in-progress", "Filming."),
  fa("2026-11-11", "Sponsor thank-you (incl. Wolper)", "Carousel", "waiting", "Waiting on: confirmed sponsor list."),
  fa("2026-11-13", "2 weeks to go + Bright Shadows / Frame by Frame teaser", "Reel", "in-progress", "Filming."),
  fa("2026-11-16", "Meet the models #4 / designer spotlight", "Carousel", "waiting", "Waiting on: media consent."),
  fa("2026-11-18", "Poster drop: \"Tag who you're bringing\"", "Static", "ready"),
  fa("2026-11-20", "\"Next Thursday\" reel", "Reel", "ready", "v4 (96 BPM): crossed-out plans → checklist → ticket.\n\nCaption:\nNext Thursday 🦋 The looks, the moves, the runway. FASHION-ABLE is almost here. Thursday 26 November, 6–9pm, 21 Munda St, Randwick. Tickets: link in bio"),
  fa("2026-11-23", "\"This Thursday\" stories", "Story", "ready"),
  fa("2026-11-24", "Final rehearsal stories", "Story", "in-progress", "Filming."),
  fa("2026-11-25", "\"Tomorrow.\"", "Static", "ready"),
  fa("2026-11-26", "Show night: backstage + runway stories", "Story", "in-progress", "Live on the night. \"Opening now\" post at 6pm."),
  fa("2026-11-27", "Thank you", "Carousel", "waiting", "Waiting on: show photos."),
  fa("2026-11-30", "Recap reel", "Reel", "in-progress"),
  fa("2026-12-02", "\"Transformation, in pictures\"", "Carousel", "in-progress"),
  fa("2026-12-03", "International Day of People with Disability", "Static", "in-progress", "\"How it felt to walk\" reflections."),
];

export const SCHEDULE_GROUPS: { id: CampaignId; label: string; items: ScheduleItem[] }[] = [
  { id: "hub-after-hours", label: "Hub After Hours + Open Day", items: HUB_AFTER_HOURS },
  { id: "fashionable", label: "fashionABLE Show content", items: FASHIONABLE },
];
