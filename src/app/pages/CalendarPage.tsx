import { useState } from "react";
import { useApp, CalendarEvent, EventType } from "../context/AppContext";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Link, Video, AlertCircle, Eye, BookOpen, Trash2 } from "lucide-react";

const EVENT_COLORS: Record<EventType, { color: string; bg: string; dot: string }> = {
  Meeting: { color: "#3b82f6", bg: "#eff6ff", dot: "#3b82f6" },
  Deadline: { color: "#ef4444", bg: "#fef2f2", dot: "#ef4444" },
  Review: { color: "#8b5cf6", bg: "#f5f3ff", dot: "#8b5cf6" },
  Other: { color: "#6b7280", bg: "#f3f4f6", dot: "#6b7280" },
};

const EVENT_ICONS: Record<EventType, typeof Video> = {
  Meeting: Video,
  Deadline: AlertCircle,
  Review: Eye,
  Other: BookOpen,
};

function CreateEventModal({ onClose, defaultDate }: { onClose: () => void; defaultDate?: string }) {
  const { addEvent } = useApp();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate || format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [type, setType] = useState<EventType>("Meeting");
  const [link, setLink] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addEvent({ title, description, date, startTime, endTime, type, link: link || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: "#111827" }}>New Event</h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "#9ca3af" }}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" required
              className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Event details..." className="w-full px-4 py-2.5 rounded-xl border outline-none resize-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
            </div>
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Event Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as EventType)}
              className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }}>
              <option>Meeting</option><option>Deadline</option><option>Review</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>
              <Link className="w-3.5 h-3.5 inline mr-1.5" />Video Call Link (optional)
            </label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/..."
              className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border" style={{ borderColor: "#e5e7eb", color: "#374151", fontSize: "0.875rem" }}>Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl" style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>Create Event</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { currentEvents, deleteEvent } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day: Date) =>
    currentEvents.filter((e) => isSameDay(new Date(e.date + "T12:00:00"), day));

  const selectedDayEvents = getEventsForDay(selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>Calendar</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: 4 }}>Manage your team's schedule and events</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-5">
            <h2 style={{ color: "#111827", fontSize: "1.125rem" }}>{format(currentMonth, "MMMM yyyy")}</h2>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "#6b7280" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1 rounded-lg text-xs transition-colors"
                style={{ background: "#fffbeb", color: "#f59e0b", fontWeight: 600 }}>
                Today
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "#6b7280" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center py-1" style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <button key={day.toString()} onClick={() => setSelectedDate(day)}
                  className="relative aspect-square flex flex-col items-center p-1 rounded-xl transition-all"
                  style={{
                    background: isSelected ? "#111827" : isTodayDate ? "#fffbeb" : "transparent",
                    opacity: isCurrentMonth ? 1 : 0.35,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f3f4f6"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isTodayDate ? "#fffbeb" : "transparent"; }}>
                  <span style={{
                    fontSize: "0.8125rem",
                    fontWeight: isSelected || isTodayDate ? 700 : 400,
                    color: isSelected ? "white" : isTodayDate ? "#f59e0b" : "#374151",
                  }}>
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <div key={i} className="w-1 h-1 rounded-full" style={{ background: isSelected ? "white" : EVENT_COLORS[e.type].dot }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t" style={{ borderColor: "#f0f0ea" }}>
            {(Object.entries(EVENT_COLORS) as [EventType, typeof EVENT_COLORS[EventType]][]).map(([type, conf]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: conf.dot }} />
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Agenda Panel */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ color: "#111827" }}>{format(selectedDate, "EEEE")}</h3>
              <p style={{ color: "#6b7280", fontSize: "0.8125rem" }}>{format(selectedDate, "MMMM d, yyyy")}</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: "#fffbeb", color: "#f59e0b" }}>
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "#fafaf7" }}>
                <Clock className="w-6 h-6" style={{ color: "#d1d5db" }} />
              </div>
              <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No events today</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 px-4 py-2 rounded-xl text-sm transition-colors"
                style={{ background: "#fffbeb", color: "#f59e0b", fontWeight: 500, fontSize: "0.8125rem" }}>
                + Add Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map((event) => {
                const conf = EVENT_COLORS[event.type];
                const Icon = EVENT_ICONS[event.type];
                return (
                  <div key={event.id} className="p-4 rounded-xl border-l-4" style={{ background: conf.bg, borderLeftColor: conf.color }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "white" }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: conf.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem" }}>{event.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3 h-3" style={{ color: conf.color }} />
                          <span style={{ fontSize: "0.75rem", color: conf.color }}>{event.startTime} – {event.endTime}</span>
                        </div>
                        {event.description && (
                          <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4 }}>{event.description}</p>
                        )}
                        {event.link && (
                          <a href={event.link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 mt-2 transition-opacity" style={{ color: "#3b82f6", fontSize: "0.75rem" }}>
                            <Link className="w-3 h-3" /> Join Meeting
                          </a>
                        )}
                      </div>
                      <button onClick={() => deleteEvent(event.id)} className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                        style={{ color: "#ef4444" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fee2e2"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#f0f0ea" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Upcoming This Month
            </p>
            <div className="space-y-2">
              {currentEvents
                .filter((e) => new Date(e.date + "T12:00:00") >= new Date())
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 4)
                .map((event) => {
                  const conf = EVENT_COLORS[event.type];
                  return (
                    <div key={event.id} className="flex items-center gap-3" onClick={() => setSelectedDate(new Date(event.date + "T12:00:00"))} style={{ cursor: "pointer" }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: conf.dot }} />
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "0.8125rem", color: "#374151", fontWeight: 500 }} className="truncate">{event.title}</p>
                        <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{format(new Date(event.date + "T12:00:00"), "MMM d")} · {event.startTime}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateEventModal onClose={() => setShowCreate(false)} defaultDate={format(selectedDate, "yyyy-MM-dd")} />
      )}
    </div>
  );
}
