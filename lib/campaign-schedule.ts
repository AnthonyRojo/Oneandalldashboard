// Ready-made campaign schedules that can be imported into the calendar
// (Calendar → Import). Each item has a stable `src` id, so importing again
// skips (or optionally refreshes) what's already there instead of duplicating.
//
// Sources:
// - fashionABLE: FashionAble_2026_Social_Schedule.xlsx (posts #2–#31) + the show itself.
// - Hub After Hours: past sessions + launch (Hub Letter EDM), finished reels, and a
//   Tue/Thu promo plan for Term 4 so it doesn't clash with fashionABLE's Mon/Wed/Fri posts.
//   Session dates for Term 4 aren't confirmed, so date-dependent posts are marked "Waiting on".

import type { EventType } from "@/context/AppContext";
import type { CampaignId, PostFormat, PostStatus } from "@/lib/calendar-meta";

export interface ScheduleItem {
  src: string;
  title: string;
  date: string; // yyyy-MM-dd
  start?: string; // HH:mm (omit when tbc)
  end?: string;
  type: EventType;
  campaign: CampaignId;
  status?: PostStatus;
  format?: PostFormat;
  tbc?: boolean;
  notes?: string;
  asset?: string;
  needs?: string;
  caption?: string;
  hashtags?: string;
}

const VENUE = "21 Munda St, Randwick";
const HAH_TAGS = "#OneAndAll #SydneyNDIS #Randwick #HubAfterHours";
const ART_TAGS = `${HAH_TAGS} #ArtMeTime`;
const NEED_DATE = "Next session date + Humanitix link";

const hah = (src: string, date: string, title: string, format: PostFormat, status: PostStatus, extra: Partial<ScheduleItem> = {}): ScheduleItem => ({
  src: `hah-${src}`, date, title, type: "Post", campaign: "hub-after-hours", format, status, tbc: true, hashtags: HAH_TAGS, ...extra,
});

export const HUB_AFTER_HOURS: ScheduleItem[] = [
  // ── Sessions & events
  {
    src: "hah-s1", title: "Hub After Hours: Art: Me Time (pilot)", date: "2026-08-30", start: "15:30", end: "17:30",
    type: "Other", campaign: "hub-after-hours",
    notes: `Somatic breathwork, guided meditation, visualisation and intuitive art. Booked via Humanitix. ${VENUE}.`,
  },
  {
    src: "hah-s2", title: "Hub After Hours: Art: Me Time", date: "2026-09-07", start: "18:00", end: "20:00",
    type: "Other", campaign: "hub-after-hours",
    notes: `Arrive 5:30pm for a cuppa, start 6pm. Booked via Humanitix. ${VENUE}.`,
  },
  {
    src: "gen-openday", title: "Open Day", date: "2026-09-24", start: "10:30", end: "12:00",
    type: "Other", campaign: "general", notes: `Connect, explore, experience, discover. ${VENUE}.`,
  },
  {
    src: "hah-s3", title: "Launch: Hub After Hours", date: "2026-09-24", type: "Other", campaign: "hub-after-hours", tbc: true,
    notes: "A space to slow down, listen inward, express yourself and reconnect through creativity.",
    needs: "Confirm launch time",
  },

  // ── Marketing (Tue/Thu)
  hah("01", "2026-10-06", "Recap reel: \"Long week? Come unwind with us\"", "Reel", "ready", {
    notes: "Pottery Night, Paint Night and The Hang. Final cut v12.",
    asset: "Hub After Hours recap v12 (Hub after hrs video chat)",
    caption: "Long week? Here are 3 ways to unwind at Hub After Hours 🌙\n\n01 🏺 Pottery Night: get your hands in the clay and take home something you made\n02 🎨 Paint Night: no pressure, no experience needed, just you and a canvas\n03 🍪 The Hang: snacks, stories and good company\n\nReal people. Real fun. Right here in Randwick.\n\nWant in on the next one? Book your spot on Humanitix. Link in bio 💛",
    needs: "Humanitix link in bio",
  }),
  hah("02", "2026-10-08", "Art: Me Time teaser reel", "Reel", "ready", {
    notes: "FOMO teaser with a card for each of the 4 steps. Final cut v7.",
    asset: "Art: Me Time teaser v7 + Canva uploads (step cards)",
    caption: "Two hours that are just for you 🎨 Breathe, settle, imagine, then let it out on paper. Art: Me Time at Hub After Hours. Secure your ticket on Humanitix, link in bio.",
    hashtags: ART_TAGS,
  }),
  hah("03", "2026-10-13", "Carousel: 3 ways to unwind", "Carousel", "in-progress", {
    notes: "One slide each for Pottery Night, Paint Night and The Hang, then a booking slide. Reuse stills from the recap reel.",
    needs: "Pick 4 stills from the recap footage",
    caption: "Pick your vibe 🌙 Clay, canvas or just good company. Hub After Hours, Randwick. Book on Humanitix, link in bio.",
  }),
  hah("04", "2026-10-15", "Carousel: what happens at Art: Me Time", "Carousel", "ready", {
    notes: "1 Somatic breathwork → 2 Guided meditation → 3 Visualisation → 4 Intuitive art. Reuse the teaser's step cards.",
    asset: "Canva uploads: Art: Me Time step cards",
    caption: "What actually happens at Art: Me Time? Swipe 👉 Breathe. Settle. Imagine. Create. No art experience needed.",
    hashtags: ART_TAGS,
  }),
  hah("05", "2026-10-20", "Story: next session + booking link", "Story", "waiting", {
    notes: "Date, time, venue and a Humanitix link sticker. Add a countdown sticker.",
    needs: NEED_DATE,
  }),
  hah("06", "2026-10-22", "Quote card: \"How I felt after\"", "Static", "waiting", {
    notes: "One line from someone who came to a session, with first name only.",
    needs: "A real quote + written consent",
  }),
  hah("07", "2026-10-27", "Reel: Pottery Night, start to finish", "Reel", "in-progress", {
    notes: "Hands-only shots (no faces needed): clay kits → shaping → finished pieces.",
    needs: "Hands footage from the next Pottery Night",
  }),
  hah("08", "2026-10-29", "Carousel: your questions, answered", "Carousel", "idea", {
    notes: "Who's it for? Do I need experience? What should I bring? Can my support worker come? How do I book?",
    needs: "Confirm age, access and cost details before posting",
  }),
  hah("09", "2026-11-03", "Story poll: Paint or clay?", "Story", "ready", {
    notes: "Poll sticker, then a booking link frame.",
  }),
  hah("10", "2026-11-05", "Reel: blank canvas to finished piece", "Reel", "in-progress", {
    notes: "Time-lapse of one painting from first stroke to the end.",
    needs: "Time-lapse footage from the next Paint Night",
  }),
  hah("11", "2026-11-10", "Hub Letter feature: Hub After Hours", "EDM", "idea", {
    notes: "Short feature in the Hub Letter EDM with photos and the booking link. Same EDM as the fashionABLE feature.",
    needs: NEED_DATE, hashtags: "",
  }),
  hah("12", "2026-11-12", "Static: bring a friend", "Static", "idea", {
    notes: "\"Better with a friend\" post with a tag prompt.",
    caption: "Tag the friend who needs a night off 👇 Hub After Hours, Randwick. Book on Humanitix, link in bio.",
  }),
  hah("13", "2026-11-17", "Story: last session before the show", "Story", "waiting", {
    notes: "Light reminder only, since fashionABLE takes over socials in show week.",
    needs: NEED_DATE,
  }),
  hah("14", "2026-12-01", "Reel: wind down the year", "Reel", "waiting", {
    notes: "End-of-year session promo, using the recap's calm shots.",
    needs: "End-of-year session date + link",
  }),
  hah("15", "2026-12-10", "Story: last Hub After Hours for 2026", "Story", "waiting", {
    needs: "Confirm last session date",
  }),
  hah("16", "2026-12-15", "Carousel: thank you, see you in 2027", "Carousel", "idea", {
    notes: "Best photos from the term and a thank-you to everyone who came.",
    needs: "Photos with consent",
  }),
];

export const FASHIONABLE: ScheduleItem[] = [
  {
    src: "fa-show", title: "fashionABLE Show: Transformation", date: "2026-11-26", start: "18:00", end: "21:00",
    type: "Other", campaign: "fashionable",
    notes: `Inclusive runway show and fundraiser. ${VENUE}. Tickets: link in bio.`,
  },
  {
    src: "fa-01", title: "Mystery teaser: \"Something is changing\"", date: "2026-09-30", type: "Post", campaign: "fashionable",
    format: "Reel", status: "ready", tbc: true,
    notes: "Cocoon to butterfly animation, ends on 26.11.26. Mark Posted if it's up.",
    hashtags: "#OneAndAll #SydneyNDIS #Randwick #fashionABLE",
  },
  {"src": "fa-02", "date": "2026-10-02", "title": "Save the date", "type": "Post", "campaign": "fashionable", "format": "Static", "status": "ready", "tbc": true, "notes": "Poster-style save the date: 26.11.26, 6–9pm, 21 Munda St, Transformation.\nFormat: Feed + Story", "asset": "Funky Hype Video chat"},
  {"src": "fa-03", "date": "2026-10-05", "title": "“It’s back” hype reel", "type": "Post", "campaign": "fashionable", "format": "Reel", "status": "posted", "tbc": true, "notes": "“We didn’t come to blend in.” Runway looks, bold words, FOMO line, details card.", "asset": "05-Oct_ItsBack_HypeReel.mp4", "needs": "Fix details card: says 6–10PM, should be 6–9pm", "caption": "The runway is BACK 💃🕺 FASHION-ABLE lands Thursday 26 November, 6–9pm at 21 Munda St, Randwick. Bold looks, big energy, everybody welcome. Tickets: link in bio", "hashtags": "#OneAndAll #SydneyNDIS #Randwick #fashionABLE"},
  {"src": "fa-04", "date": "2026-10-07", "title": "Transformation theme reel", "type": "Post", "campaign": "fashionable", "format": "Reel", "status": "ready", "tbc": true, "notes": "“What if you could become anyone?” Sketch → colour models, Art/Music/Movement/Fashion, illustration reveal, “Come as you are.”", "asset": "07-Oct_Transformation_ThemeReel.mp4", "caption": "What if you could become anyone? 🦋 This year’s FASHION-ABLE theme is TRANSFORMATION. Art, music, movement and fashion, all on one runway. Thursday 26 November, 6–9pm, 21 Munda St, Randwick. Come as you are. Tickets: link in bio", "hashtags": "#OneAndAll #SydneyNDIS #Randwick #fashionABLE"},
  {"src": "fa-05", "date": "2026-10-09", "title": "Hero reveal: seamless spread", "type": "Post", "campaign": "fashionable", "format": "Carousel", "status": "ready", "tbc": true, "notes": "One continuous spread: giant TRANSFORMATION, illustration on the seam, callouts (butterfly, gaze, colour), details grid, end card.\nFormat: Carousel (5)", "asset": "Figma: fashionABLE 2026 file › #5 › A (9Oct_ slices)", "caption": "Meet the face of Transformation 🦋 Swipe through the artwork behind this year’s FASHION-ABLE, from the butterfly to the gaze to every last ruffle. Thursday 26 November, 6–9pm, 21 Munda St, Randwick. Come as you are. Tickets: link in bio", "hashtags": "#OneAndAll #SydneyNDIS #Randwick #fashionABLE"},
  {"src": "fa-06", "date": "2026-10-12", "title": "“Which one are you?” quiz", "type": "Post", "campaign": "fashionable", "format": "Carousel", "status": "ready", "tbc": true, "notes": "Four transformation types (Butterfly, Gaze, Colour, Ruffle). Comment your number.\nFormat: Carousel (7)", "asset": "Figma: fashionABLE 2026 file › #5 › C (12Oct_ frames)", "needs": "Date chosen by Claude — move if needed", "caption": "Which one are you? 🦋 Butterfly, Gaze, Colour or Ruffle. Drop your number in the comments 👇 Thursday 26 November, 6–9pm, 21 Munda St, Randwick. Tickets: link in bio", "hashtags": "#OneAndAll #SydneyNDIS #Randwick #fashionABLE"},
  {"src": "fa-07", "date": "2026-10-14", "title": "Quote 01: What does transformation mean to you?", "type": "Post", "campaign": "fashionable", "format": "Video", "status": "waiting", "tbc": true, "notes": "Participant talks to camera; yellow opener, framed clip, word-by-word captions. Static card version in Figma.\nFormat: Talking video / card", "asset": "Overlay pack (Quote) or Figma › #7 (14Oct_Quote_01)", "needs": "Clip or quote, first name, photo, written consent"},
  {"src": "fa-08", "date": "2026-10-16", "title": "Countdown: 6 weeks to go", "type": "Post", "campaign": "fashionable", "format": "Static", "status": "ready", "tbc": true, "notes": "Runway photo top, giant yellow 6 breaking the edge, details. Add IG countdown sticker on story.\nFormat: Feed + Story", "asset": "Figma: fashionABLE 2026 file › #6 (16Oct_ frames)", "caption": "6 weeks until FASHION-ABLE 🦋 Thursday 26 November, 6–9pm, 21 Munda St, Randwick. Tickets: link in bio", "hashtags": "#OneAndAll #SydneyNDIS #Randwick #fashionABLE"},
  {"src": "fa-09", "date": "2026-10-19", "title": "Behind the scenes: fittings", "type": "Post", "campaign": "fashionable", "format": "Reel", "status": "in-progress", "tbc": true, "notes": "Phone clips of fittings and mirror moments.", "needs": "Footage from fittings"},
  {"src": "fa-10", "date": "2026-10-21", "title": "Meet the models 01", "type": "Post", "campaign": "fashionable", "format": "Video", "status": "waiting", "tbc": true, "notes": "Yellow “Meet the models 01” opener, they answer My look / Why I’m walking / Transformation is…\nFormat: Talking video / feed", "asset": "Overlay pack (Models) or Figma › #8 (21Oct_)", "needs": "Clip or photo + 3 answers, first name, consent"},
  {"src": "fa-11", "date": "2026-10-23", "title": "Quote 02", "type": "Post", "campaign": "fashionable", "format": "Video", "status": "waiting", "tbc": true, "notes": "Same format as Quote 01.\nFormat: Talking video / card", "asset": "Overlay pack (Quote) or Figma › #7 (23Oct_Quote_02)", "needs": "Clip or quote, first name, photo, consent; date chosen by Claude"},
  {"src": "fa-12", "date": "2026-10-26", "title": "Look spotlight: the details", "type": "Post", "campaign": "fashionable", "format": "Reel", "status": "in-progress", "tbc": true, "notes": "Close-ups of fabric, beading, accessories.", "needs": "Detail footage"},
  {"src": "fa-13", "date": "2026-10-28", "title": "Meet the models 02", "type": "Post", "campaign": "fashionable", "format": "Video", "status": "waiting", "tbc": true, "notes": "Same format as Meet the models 01.\nFormat: Talking video / feed", "asset": "Overlay pack (Models) or Figma › #8 (28Oct_)", "needs": "Clip or photo + answers, consent"},
  {"src": "fa-14", "date": "2026-10-30", "title": "Countdown: 4 weeks to go + story poll", "type": "Post", "campaign": "fashionable", "format": "Static", "status": "ready", "tbc": true, "notes": "Countdown post; story poll “Are you coming?” with ticket link sticker.\nFormat: Feed + Story", "asset": "Figma: fashionABLE 2026 file › #6 (30Oct_ frames)", "caption": "Four weeks. The looks are coming together 👀 Thursday 26 November, 6–9pm, 21 Munda St, Randwick. Tickets: link in bio", "hashtags": "#OneAndAll #SydneyNDIS #Randwick #fashionABLE"},
  {"src": "fa-15", "date": "2026-11-02", "title": "Behind the scenes: making the outfits", "type": "Post", "campaign": "fashionable", "format": "Reel", "status": "in-progress", "tbc": true, "notes": "Workshop footage. Same week: fashionABLE feature in the Hub Letter EDM.", "needs": "Workshop footage"},
  {"src": "fa-16", "date": "2026-11-04", "title": "Meet the models 03", "type": "Post", "campaign": "fashionable", "format": "Video", "status": "waiting", "tbc": true, "notes": "Same format.\nFormat: Talking video / feed", "asset": "Overlay pack (Models) or Figma › #8 (04Nov_)", "needs": "Clip or photo + answers, consent"},
  {"src": "fa-17", "date": "2026-11-06", "title": "Hype reel #2 (vogue edit)", "type": "Post", "campaign": "fashionable", "format": "Reel", "status": "ready", "tbc": true, "notes": "Second hype edit made in the Funky Hype chat.", "asset": "Funky Hype Video chat", "needs": "Check the details card says 6–9pm"},
  {"src": "fa-18", "date": "2026-11-09", "title": "Rehearsal walk-off", "type": "Post", "campaign": "fashionable", "format": "Reel", "status": "in-progress", "tbc": true, "notes": "Each model does a 3-second walk, cut to the beat.", "needs": "Rehearsal footage"},
  {"src": "fa-19", "date": "2026-11-11", "title": "Partner & sponsor thank-you", "type": "Post", "campaign": "fashionable", "format": "Static", "status": "waiting", "tbc": true, "notes": "Logos and thanks to show partners and funders (incl. Wolper).\nFormat: Feed / Carousel", "needs": "Confirmed sponsor list + logos"},
  {"src": "fa-20", "date": "2026-11-13", "title": "Countdown: 2 weeks to go (+ Quote 03 story)", "type": "Post", "campaign": "fashionable", "format": "Static", "status": "waiting", "tbc": true, "notes": "Countdown post; Quote 03 as a story.\nFormat: Feed + Story", "asset": "Figma: fashionABLE 2026 file › #6 (13Nov_) and #7 (13Nov_)", "needs": "Quote 03 needs a real quote + consent", "caption": "Two weeks to go! Grab your tickets before they’re gone. Thursday 26 November, 6–9pm, 21 Munda St, Randwick. Link in bio", "hashtags": "#OneAndAll #SydneyNDIS #Randwick #fashionABLE"},
  {"src": "fa-21", "date": "2026-11-16", "title": "Meet the models 04", "type": "Post", "campaign": "fashionable", "format": "Video", "status": "waiting", "tbc": true, "notes": "Same format.\nFormat: Talking video / feed", "asset": "Overlay pack (Models) or Figma › #8 (16Nov_)", "needs": "Clip or photo + answers, consent"},
  {"src": "fa-22", "date": "2026-11-18", "title": "Poster drop: “Tag who you’re bringing”", "type": "Post", "campaign": "fashionable", "format": "Static", "status": "ready", "tbc": true, "notes": "The poster, tilted like a print, with an “@ your +1” tag.\nFormat: Feed + Story", "asset": "Figma: fashionABLE 2026 file › #11 (18Nov_ frames)", "caption": "The poster’s here 🦋 Tag who you’re bringing to FASHION-ABLE 👇 Thursday 26 November, 6–9pm, 21 Munda St, Randwick. Tickets: link in bio", "hashtags": "#OneAndAll #SydneyNDIS #Randwick #fashionABLE"},
  {"src": "fa-23", "date": "2026-11-20", "title": "“Next Thursday”", "type": "Post", "campaign": "fashionable", "format": "Reel", "status": "ready", "tbc": true, "notes": "Plans crossed out, checklist (Outfit ✓ Moves ✓ Bestie ✓ Ticket?), ticket + stamp, “See you next Thursday.”", "asset": "20-Nov_NextThursday_Reel.mp4", "caption": "Cancel your Thursday plans 😌 Outfit ✓ Moves ✓ Bestie ✓ Ticket…? FASHION-ABLE is next Thursday, 26 November, 6–9pm at 21 Munda St, Randwick. Tickets: link in bio", "hashtags": "#OneAndAll #SydneyNDIS #Randwick #fashionABLE"},
  {"src": "fa-24", "date": "2026-11-23", "title": "“This Thursday” story set", "type": "Post", "campaign": "fashionable", "format": "Story", "status": "ready", "tbc": true, "notes": "This Thursday / Ready? checklist / ticket with link stamp. Add link + countdown stickers.\nFormat: Stories (3)", "asset": "Figma: fashionABLE 2026 file › #10 (23Nov_ frames)"},
  {"src": "fa-25", "date": "2026-11-24", "title": "Final rehearsal", "type": "Post", "campaign": "fashionable", "format": "Story", "status": "in-progress", "tbc": true, "notes": "Behind the scenes from the dress rehearsal.\nFormat: Stories", "needs": "Rehearsal clips"},
  {"src": "fa-26", "date": "2026-11-25", "title": "“Tomorrow.”", "type": "Post", "campaign": "fashionable", "format": "Static", "status": "ready", "tbc": true, "notes": "Invitation-style: When / Time / Where, tickets button.\nFormat: Feed + Story", "asset": "Figma: fashionABLE 2026 file › #10 (25Nov_ frames)", "caption": "Tomorrow. 🦋 FASHION-ABLE, Thursday 26 November, 6–9pm, 21 Munda St, Randwick. Come as you are. Tickets: link in bio", "hashtags": "#OneAndAll #SydneyNDIS #Randwick #fashionABLE"},
  {"src": "fa-27", "date": "2026-11-26", "title": "SHOW NIGHT", "type": "Post", "campaign": "fashionable", "format": "Story", "status": "in-progress", "tbc": true, "notes": "Getting ready, doors open, runway clips through the night.\nFormat: Stories (live)", "needs": "Film on the night"},
  {"src": "fa-28", "date": "2026-11-27", "title": "Thank you", "type": "Post", "campaign": "fashionable", "format": "Static", "status": "in-progress", "tbc": true, "notes": "Thanks to models, volunteers, families, partners.\nFormat: Feed / Carousel", "needs": "Photos from the night"},
  {"src": "fa-29", "date": "2026-11-30", "title": "Recap reel", "type": "Post", "campaign": "fashionable", "format": "Reel", "status": "in-progress", "tbc": true, "notes": "Same style as the reels, footage from the night.", "needs": "Footage from the night"},
  {"src": "fa-30", "date": "2026-12-02", "title": "“Transformation, in pictures”", "type": "Post", "campaign": "fashionable", "format": "Carousel", "status": "in-progress", "tbc": true, "notes": "Best photos from the night.", "needs": "Photos from the night"},
  {"src": "fa-31", "date": "2026-12-03", "title": "International Day of People with Disability: “How it felt to walk”", "type": "Post", "campaign": "fashionable", "format": "Reel", "status": "waiting", "tbc": true, "notes": "Participant reflections; recap in the next Hub Letter.\nFormat: Reel / cards", "needs": "Short clips or quotes, consent"},
];

export const SCHEDULE_GROUPS: { id: CampaignId; label: string; blurb: string; items: ScheduleItem[] }[] = [
  { id: "hub-after-hours", label: "Hub After Hours", blurb: "Sessions, Open Day and a Tue/Thu promo plan to mid-December", items: HUB_AFTER_HOURS },
  { id: "fashionable", label: "fashionABLE Show", blurb: "The show plus all 31 posts from the social schedule", items: FASHIONABLE },
];
