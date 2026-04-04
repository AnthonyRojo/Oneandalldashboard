"use client";

import { useState, useCallback } from "react";
import { useApp, CalendarEvent, EventType } from "@/context/AppContext";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Video, Eye, FileText, Trash2, CalendarDays, Pencil } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

const EVENT_COLORS: Record<EventType, string> = {
  Meeting: "#3b82f6",
  Review: "#f59e0b",
  Post: "#8b5cf6",
  Other: "#6b7280",
};

const EVENT_ICONS: Record<EventType, typeof Video> = {
  Meeting: Video,
  Review: Eye,
  Post: FileText,
  Other: Clock,
};

export default function CalendarPage() {
  const { currentEvents, addEvent, updateEvent, deleteEvent } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    type: "Meeting" as EventType,
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    link: "",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    type: "Meeting" as EventType,
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    link: "",
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get today's events
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayEvents = currentEvents.filter((event) => event.date === todayStr);

  // Get upcoming events (next 7 days, excluding today)
  const upcomingEvents = currentEvents
    .filter((event) => {
      const eventDate = new Date(event.date + "T12:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return eventDate > today && eventDate <= weekFromNow;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return currentEvents.filter((event) => event.date === dateStr);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.startTime) return;
    
    // Ensure date is in YYYY-MM-DD format
    let dateStr = newEvent.date;
    if (newEvent.date instanceof Date) {
      dateStr = format(newEvent.date, "yyyy-MM-dd");
    } else if (typeof newEvent.date === "object") {
      dateStr = format(new Date(newEvent.date as any), "yyyy-MM-dd");
    }
    
    // Combine date with time to create full ISO timestamps
    const startDateTime = `${dateStr}T${newEvent.startTime}:00`;
    const endDateTime = `${dateStr}T${newEvent.endTime}:00`;
    
    console.log("[v0] Creating event with:", { dateStr, startDateTime, endDateTime });
    
    await addEvent({
      title: newEvent.title,
      description: newEvent.description,
      startTime: startDateTime,
      endTime: endDateTime,
      type: newEvent.type,
      link: newEvent.link || undefined,
    });
    setShowCreateModal(false);
    setNewEvent({ title: "", description: "", type: "Meeting", date: "", startTime: "09:00", endTime: "10:00", link: "" });
  };

  const handleMoveEvent = useCallback(async (eventId: string, newDate: Date) => {
    const newDateStr = format(newDate, "yyyy-MM-dd");
    await updateEvent(eventId, { date: newDateStr });
  }, [updateEvent]);

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      description: event.description || "",
      type: event.type,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      link: event.link || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    await updateEvent(editingEvent.id, {
      title: editForm.title,
      description: editForm.description,
      type: editForm.type,
      date: editForm.date,
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      link: editForm.link || undefined,
    });
    setEditingEvent(null);
    setSelectedEvent(null);
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Calendar</h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{currentEvents.length} event{currentEvents.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium" style={{ background: "#f59e0b", color: "white" }}>
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>

        {/* Today and Upcoming Events Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Today's Events */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f59e0b" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "#e5e7eb", background: "#fffbeb" }}>
              <CalendarDays className="w-5 h-5" style={{ color: "#f59e0b" }} />
              <h3 style={{ color: "#111827", fontWeight: 600 }}>Today</h3>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#f59e0b", color: "white" }}>
                {todayEvents.length}
              </span>
            </div>
            <div className="divide-y max-h-[250px] overflow-y-auto" style={{ borderColor: "#f0f0ea" }}>
              {todayEvents.length > 0 ? todayEvents.map((event) => {
                const Icon = EVENT_ICONS[event.type];
                return (
                  <button 
                    key={event.id} 
                    onClick={() => setSelectedEvent(event)}
                    className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${EVENT_COLORS[event.type]}20` }}>
                      <Icon className="w-4 h-4" style={{ color: EVENT_COLORS[event.type] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium" style={{ color: "#111827", fontSize: "0.875rem" }}>{event.title}</p>
                      <p style={{ color: "#6b7280", fontSize: "0.75rem" }}>{formatTime(event.startTime)} - {formatTime(event.endTime)}</p>
                    </div>
                  </button>
                );
              }) : (
                <div className="px-5 py-8 text-center">
                  <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No events today</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "#e5e7eb" }}>
              <Clock className="w-5 h-5" style={{ color: "#3b82f6" }} />
              <h3 style={{ color: "#111827", fontWeight: 600 }}>Upcoming (Next 7 Days)</h3>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#3b82f6", color: "white" }}>
                {upcomingEvents.length}
              </span>
            </div>
            <div className="divide-y max-h-[250px] overflow-y-auto" style={{ borderColor: "#f0f0ea" }}>
              {upcomingEvents.length > 0 ? upcomingEvents.map((event) => {
                const Icon = EVENT_ICONS[event.type];
                return (
                  <button 
                    key={event.id} 
                    onClick={() => setSelectedEvent(event)}
                    className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${EVENT_COLORS[event.type]}20` }}>
                      <Icon className="w-4 h-4" style={{ color: EVENT_COLORS[event.type] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium" style={{ color: "#111827", fontSize: "0.875rem" }}>{event.title}</p>
                      <p style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                        {formatEventDate(event.date)} • {formatTime(event.startTime)}
                      </p>
                    </div>
                  </button>
                );
              }) : (
                <div className="px-5 py-8 text-center">
                  <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No upcoming events</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-gray-100">
                <ChevronLeft className="w-5 h-5" style={{ color: "#6b7280" }} />
              </button>
              <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>{format(currentMonth, "MMMM yyyy")}</h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-gray-100">
                <ChevronRight className="w-5 h-5" style={{ color: "#6b7280" }} />
              </button>
            </div>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: "#f3f4f6", color: "#374151" }}
            >
              Today
            </button>
          </div>
          <div className="grid grid-cols-7 border-b" style={{ borderColor: "#e5e7eb" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium" style={{ color: "#6b7280" }}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => (
              <CalendarDay key={i} day={day} events={getEventsForDay(day)} isCurrentMonth={isSameMonth(day, currentMonth)} isToday={isToday(day)} onEventClick={setSelectedEvent} />
            ))}
          </div>
        </div>

        {/* Create Event Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "#e5e7eb" }}>
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Create Event</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Title</label>
                  <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="Event title" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Type</label>
                  <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                    <option value="Meeting">Meeting</option>
                    <option value="Review">Review</option>
                    <option value="Post">Post</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <DatePicker 
                    label="Date" 
                    value={newEvent.date ? new Date(newEvent.date) : undefined} 
                    onChange={(val) => {
                      const dateStr = val instanceof Date ? format(val, "yyyy-MM-dd") : (typeof val === "string" ? val : "");
                      setNewEvent({ ...newEvent, date: dateStr });
                      console.log("[v0] DatePicker changed to:", { val, dateStr });
                    }} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Start Time</label>
                    <input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>End Time</label>
                    <input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Link (optional)</label>
                  <input type="url" value={newEvent.link} onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="https://meet.google.com/..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Description</label>
                  <textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border resize-none" style={{ borderColor: "#e5e7eb" }} rows={3} placeholder="Event description" />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: "#e5e7eb" }}>
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Cancel</button>
                <button onClick={handleCreateEvent} className="px-4 py-2 rounded-xl text-white" style={{ background: "#f59e0b" }}>Create Event</button>
              </div>
            </div>
          </div>
        )}

      {/* Selected Event Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "#e5e7eb" }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: EVENT_COLORS[selectedEvent.type] }}></div>
                  <span className="text-sm font-medium" style={{ color: "#6b7280" }}>{selectedEvent.type}</span>
                </div>
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>{selectedEvent.title}</h2>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
            </div>
            <div className="p-6 space-y-4">
              {selectedEvent.description && <p style={{ color: "#6b7280" }}>{selectedEvent.description}</p>}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" style={{ color: "#6b7280" }} />
                  <span style={{ color: "#374151" }}>{formatEventDate(selectedEvent.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: "#6b7280" }} />
                  <span style={{ color: "#374151" }}>{formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</span>
                </div>
                {selectedEvent.link && (
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" style={{ color: "#6b7280" }} />
                    <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#3b82f6" }}>{selectedEvent.link}</a>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Close</button>
              <button onClick={() => { deleteEvent(selectedEvent.id); setSelectedEvent(null); }} className="px-4 py-2 rounded-xl text-white flex items-center gap-2" style={{ background: "#ef4444" }}>
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarDay({ day, events, isCurrentMonth, isToday: isTodayDay, onEventClick }: { day: Date; events: CalendarEvent[]; isCurrentMonth: boolean; isToday: boolean; onEventClick: (event: CalendarEvent) => void }) {
  return (
    <div className="min-h-[100px] p-2 border-b border-r" style={{ borderColor: "#e5e7eb", background: isTodayDay ? "#fffbeb" : "transparent", opacity: isCurrentMonth ? 1 : 0.5 }}>
      <div className={`text-sm mb-1 ${isTodayDay ? "font-semibold" : ""}`} style={{ color: isTodayDay ? "#f59e0b" : "#374151" }}>{format(day, "d")}</div>
      <div className="space-y-1">
        {events.slice(0, 3).map((event) => (
          <button key={event.id} onClick={() => onEventClick(event)} className="w-full text-left px-2 py-1 rounded text-xs truncate cursor-pointer transition-opacity hover:opacity-80" style={{ background: `${EVENT_COLORS[event.type]}20`, color: EVENT_COLORS[event.type] }}>{event.title}</button>
        ))}
        {events.length > 3 && <div className="text-xs" style={{ color: "#6b7280" }}>+{events.length - 3} more</div>}
      </div>
    </div>
  );
}
