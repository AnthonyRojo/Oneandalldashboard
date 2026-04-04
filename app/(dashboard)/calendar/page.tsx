"use client";

import { useState, useCallback, memo } from "react";
import { useApp, CalendarEvent, EventType } from "@/context/AppContext";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
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

  const handleMoveEvent = useCallback(async (eventId: string, newDate: Date) => {
    const event = currentEvents.find((e) => e.id === eventId);
    if (!event) return;
    const newDateStr = format(newDate, "yyyy-MM-dd");
    const startDateTime = `${newDateStr}T${event.startTime.split("T")[1]}`;
    const endDateTime = `${newDateStr}T${event.endTime.split("T")[1]}`;
    await updateEvent(eventId, { startTime: startDateTime, endTime: endDateTime });
  }, [currentEvents, updateEvent]);

  const handleDateClick = (date: Date) => {
    setNewEvent({ ...newEvent, date: format(date, "yyyy-MM-dd") });
    setShowCreateModal(true);
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
    <DndProvider backend={HTML5Backend}>
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
                const Icon = EVENT_ICONS[event.type] || Clock;
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
                const Icon = EVENT_ICONS[event.type] || Clock;
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
              <CalendarDay key={i} day={day} events={getEventsForDay(day)} isCurrentMonth={isSameMonth(day, currentMonth)} isToday={isToday(day)} onEventClick={setSelectedEvent} onEventDrop={handleMoveEvent} onDateClick={handleDateClick} />
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
              <button onClick={() => { setEditingEvent(selectedEvent); setEditForm({ title: selectedEvent.title, description: selectedEvent.description, type: selectedEvent.type, date: selectedEvent.date, startTime: selectedEvent.startTime.split("T")[1], endTime: selectedEvent.endTime.split("T")[1], link: "" }); setSelectedEvent(null); }} className="px-4 py-2 rounded-xl text-white flex items-center gap-2" style={{ background: "#3b82f6" }}>
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => { deleteEvent(selectedEvent.id); setSelectedEvent(null); }} className="px-4 py-2 rounded-xl text-white flex items-center gap-2" style={{ background: "#ef4444" }}>
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "#e5e7eb" }}>
              <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Edit Event</h2>
              <button onClick={() => setEditingEvent(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Title</label>
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="Event title" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Type</label>
                <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as EventType })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                  <option value="Meeting">Meeting</option>
                  <option value="Review">Review</option>
                  <option value="Post">Post</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <DatePicker 
                  label="Date" 
                  value={editForm.date ? new Date(editForm.date) : undefined} 
                  onChange={(val) => {
                    const dateStr = val instanceof Date ? format(val, "yyyy-MM-dd") : (typeof val === "string" ? val : "");
                    setEditForm({ ...editForm, date: dateStr });
                  }} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Start Time</label>
                  <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>End Time</label>
                  <input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Link (optional)</label>
                <input type="url" value={editForm.link} onChange={(e) => setEditForm({ ...editForm, link: e.target.value })} className="w-full px-4 py-2 rounded-xl border" style={{ borderColor: "#e5e7eb" }} placeholder="https://meet.google.com/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border resize-none" style={{ borderColor: "#e5e7eb" }} rows={3} placeholder="Event description" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setEditingEvent(null)} className="px-4 py-2 rounded-xl" style={{ background: "#f3f4f6" }}>Cancel</button>
              <button onClick={async () => {
                const startDateTime = `${editForm.date}T${editForm.startTime}:00`;
                const endDateTime = `${editForm.date}T${editForm.endTime}:00`;
                await updateEvent(editingEvent.id, { title: editForm.title, description: editForm.description, type: editForm.type, startTime: startDateTime, endTime: endDateTime, link: editForm.link });
                setEditingEvent(null);
              }} className="px-4 py-2 rounded-xl text-white" style={{ background: "#3b82f6" }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DndProvider>
  );
}

function CalendarDay({ day, events, isCurrentMonth, isToday: isTodayDay, onEventClick, onEventDrop, onDateClick }: { day: Date; events: CalendarEvent[]; isCurrentMonth: boolean; isToday: boolean; onEventClick: (event: CalendarEvent) => void; onEventDrop: (eventId: string, newDate: Date) => void; onDateClick: (date: Date) => void; }) {
  const [{ isOver }, drop] = useDrop(() => ({ accept: "event", drop: (item: { id: string }) => { onEventDrop(item.id, day); }, collect: (monitor) => ({ isOver: monitor.isOver() }) }), [day, onEventDrop]);
  return (
    <div ref={drop as unknown as React.LegacyRef<HTMLDivElement>} onClick={() => onDateClick(day)} className="min-h-[100px] p-2 border-b border-r transition-colors cursor-pointer hover:bg-blue-50" style={{ borderColor: "#e5e7eb", background: isOver ? "#fef3c7" : isTodayDay ? "#fffbeb" : "transparent", opacity: isCurrentMonth ? 1 : 0.5 }}>
      <div className={`text-sm mb-1 ${isTodayDay ? "font-semibold" : ""}`} style={{ color: isTodayDay ? "#f59e0b" : "#374151" }}>{format(day, "d")}</div>
      <div className="space-y-1">
        {events.slice(0, 3).map((event) => <MemoizedDraggableEvent key={event.id} event={event} onClick={(e) => { e.stopPropagation(); onEventClick(event); }} />)}
        {events.length > 3 && <div className="text-xs" style={{ color: "#6b7280" }}>+{events.length - 3} more</div>}
      </div>
    </div>
  );
}

function DraggableEvent({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({ type: "event", item: { id: event.id }, collect: (monitor) => ({ isDragging: monitor.isDragging() }) }), [event.id]);
  const eventColor = EVENT_COLORS[event.type as EventType] || "#6b7280";
  return <button ref={drag as unknown as React.LegacyRef<HTMLButtonElement>} onClick={onClick} className="w-full text-left px-2 py-1 rounded text-xs truncate cursor-move transition-all border-l-4" style={{ background: `${eventColor}15`, color: eventColor, borderColor: eventColor, opacity: isDragging ? 0.5 : 1, borderRadius: "0.375rem" }}>{event.title}</button>;
}

const MemoizedDraggableEvent = memo(DraggableEvent);
