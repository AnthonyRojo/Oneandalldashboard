"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Search, MessageCircle, Book, Mail } from "lucide-react";

const faqs = [
  { q: "How do I create a new task?", a: "Navigate to the Tasks page and click the 'New Task' button. Fill in the task details including title, description, priority, and assignee, then click 'Create Task'." },
  { q: "How do I invite team members?", a: "Go to the Team page and click 'Invite Member'. Enter their email address and select a role, then send the invitation." },
  { q: "How do I create an announcement?", a: "Visit the Announcements page and click 'New Announcement'. You can create general announcements, urgent notices, updates, or polls." },
  { q: "How do I schedule an event?", a: "Go to the Calendar page and click 'New Event'. Set the title, type, date range, and description for your event." },
  { q: "How do I change my password?", a: "Navigate to Settings > Security. Enter your current password and new password, then click 'Update Password'." },
  { q: "How do I switch between teams?", a: "Click on the team name in the sidebar to open the team dropdown. You can select a different team or create a new one." },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const filteredFaqs = faqs.filter((faq) => faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || faq.a.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Help Center</h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Find answers to common questions</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#9ca3af" }} />
        <input type="text" placeholder="Search for help..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-2xl border text-lg" style={{ borderColor: "#e5e7eb", background: "white" }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Book, title: "Documentation", desc: "Read our guides", color: "#3b82f6" },
          { icon: MessageCircle, title: "Chat Support", desc: "Talk to our team", color: "#8b5cf6" },
          { icon: Mail, title: "Email Us", desc: "support@oneandall.com", color: "#22c55e" },
        ].map((item) => (
          <div key={item.title} className="p-6 rounded-2xl border cursor-pointer hover:shadow-md transition-shadow" style={{ background: "white", borderColor: "#e5e7eb" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${item.color}20` }}>
              <item.icon className="w-6 h-6" style={{ color: item.color }} />
            </div>
            <h3 className="font-semibold mb-1" style={{ color: "#111827" }}>{item.title}</h3>
            <p className="text-sm" style={{ color: "#6b7280" }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "white", borderColor: "#e5e7eb" }}>
        <div className="p-6 border-b" style={{ borderColor: "#e5e7eb" }}>
          <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Frequently Asked Questions</h2>
        </div>
        <div>
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="border-b last:border-b-0" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setExpandedFaq(expandedFaq === index ? null : index)} className="w-full flex items-center justify-between p-6 text-left">
                <span className="font-medium" style={{ color: "#111827" }}>{faq.q}</span>
                {expandedFaq === index ? <ChevronUp className="w-5 h-5" style={{ color: "#6b7280" }} /> : <ChevronDown className="w-5 h-5" style={{ color: "#6b7280" }} />}
              </button>
              {expandedFaq === index && (
                <div className="px-6 pb-6">
                  <p style={{ color: "#6b7280" }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
          {filteredFaqs.length === 0 && (
            <div className="p-12 text-center">
              <HelpCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#d1d5db" }} />
              <p style={{ color: "#6b7280" }}>No results found for your search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
