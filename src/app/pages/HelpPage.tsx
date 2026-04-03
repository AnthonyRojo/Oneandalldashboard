import { useState } from "react";
import { HelpCircle, Search, ChevronDown, ChevronUp, ExternalLink, MessageCircle, Book, Zap } from "lucide-react";

const FAQS = [
  { q: "How do I create a new team?", a: "Click on your team name in the top-left sidebar to open the team switcher. Then click '+ New Team' at the bottom of the dropdown. Enter a name and press Create." },
  { q: "How do I assign a task to someone?", a: "When creating or editing a task, use the 'Assign To' dropdown to select a team member. You can also update assignments by clicking on any task and changing the assignee." },
  { q: "Can I attach files to tasks?", a: "Yes! In the Task Details modal, you'll find an option to submit a work link. You can paste any URL including file sharing links from Google Drive, Dropbox, or Figma." },
  { q: "How do I pin an announcement?", a: "Open any announcement's options menu (the ··· button in the top right of the post) and select 'Pin to top'. Only team owners and admins can pin announcements." },
  { q: "How do calendar events work?", a: "Events are scoped to your currently active team. Click any day in the calendar to view that day's agenda, or click '+ New Event' to create one. Events include Meeting, Deadline, Review, and Other types." },
  { q: "What does the Time Tracker do?", a: "The Time Tracker on the Dashboard allows you to manually track time spent working. Click Start to begin, Pause to pause, and the stop button to reset. Time statistics are shown in Today/Week/Month slots." },
  { q: "How do I switch between teams?", a: "Use the team switcher dropdown in the top-left sidebar. Click the current team name to open the dropdown, then select any of your teams." },
];

export default function HelpPage() {
  const [searchQ, setSearchQ] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filtered = FAQS.filter(
    (f) => !searchQ || f.q.toLowerCase().includes(searchQ.toLowerCase()) || f.a.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#fffbeb" }}>
          <HelpCircle className="w-5 h-5" style={{ color: "#f59e0b" }} />
        </div>
        <div>
          <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>Help Center</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Find answers and get support</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: Book, title: "Documentation", desc: "Full guides", color: "#3b82f6", bg: "#eff6ff" },
          { icon: MessageCircle, title: "Live Chat", desc: "Talk to support", color: "#10b981", bg: "#ecfdf5" },
          { icon: Zap, title: "Quick Start", desc: "Get started fast", color: "#f59e0b", bg: "#fffbeb" },
        ].map(({ icon: Icon, title, desc, color, bg }) => (
          <button key={title} className="flex flex-col items-center gap-2 p-4 rounded-2xl border bg-white transition-all"
            style={{ borderColor: "#f0f0ea" }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "#f0f0ea"}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem" }}>{title}</p>
              <p style={{ color: "#6b7280", fontSize: "0.75rem" }}>{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9ca3af" }} />
        <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search FAQs..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white outline-none"
          style={{ borderColor: "#e5e5e0", fontSize: "0.875rem" }} />
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f0f0ea" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "#f0f0ea" }}>
          <h2 style={{ color: "#111827" }}>Frequently Asked Questions</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center" style={{ color: "#9ca3af" }}>No results found</div>
        ) : filtered.map((faq, i) => (
          <div key={i} className="border-b last:border-b-0" style={{ borderColor: "#f0f0ea" }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.background = "#fafaf7"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontWeight: 500, color: "#111827", fontSize: "0.9375rem" }}>{faq.q}</span>
              {openFaq === i ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "#f59e0b" }} /> : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#9ca3af" }} />}
            </button>
            {openFaq === i && (
              <div className="px-5 pb-4">
                <p style={{ color: "#6b7280", lineHeight: 1.7, fontSize: "0.9375rem" }}>{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-5 rounded-2xl flex items-center gap-4" style={{ background: "#111827" }}>
        <MessageCircle className="w-8 h-8 flex-shrink-0" style={{ color: "#f59e0b" }} />
        <div>
          <p style={{ color: "white", fontWeight: 600 }}>Still need help?</p>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Our support team typically responds within 2 hours.</p>
        </div>
        <button className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0"
          style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
          Contact Support <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
