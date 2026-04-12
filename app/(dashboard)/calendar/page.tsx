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

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.startTime) return;
    let dateStr: any = newEvent.date;
    if (dateStr instanceof Date) {
      dateStr = format(dateStr, "yyyy-MM-dd");
    }
    const startDateTime = `${dateStr}T${newEvent.startTime}:00`;
    const endDateTime = `${dateStr}T${newEvent.endTime}:00`;
    
    await addEvent({
      ...newEvent,
      date: dateStr,
      startTime: startDateTime,
      endTime: endDateTime,
    });
    
    setShowCreateModal(false);
    setNewEvent({ title: "", description: "", type: "Meeting", date: "", startTime: "09:00", endTime: "10:00", link: "" });
  };

  const handleMoveEvent = async (eventId: string, newDate: Date) => {
    const dateStr = format(newDate, "yyyy-MM-dd");
    const event = currentEvents.find(e => e.id === eventId);
    if (!event) return;
    const oldStartTime = event.startTime.includes('T') ? event.startTime.split('T')[1] : "09:00:00";
    const oldEndTime = event.endTime.includes('T') ? event.endTime.split('T')[1] : "10:00:00";
    await updateEvent(eventId, {
      date: dateStr,
      startTime: `${dateStr}T${oldStartTime}`,
      endTime: `${dateStr}T${oldEndTime}`
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    try {
      const timeStr = time.includes('T') ? time.split('T')[1].substring(0, 5) : time;
      const [h, m] = timeStr.split(":");
      const hour = parseInt(h);
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    } catch (e) { return time; }
  };

  const formatEventDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Calendar</h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{currentEvents.length} events</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium" style={{ background: "#f59e0b", color: "white" }}>
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>

        {/* Today and Upcoming Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f59e0b" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "#e5e7eb", background: "#fffbeb" }}>
              <CalendarDays className="w-5 h-5" style={{ color: "#f59e0b" }} />
              <h3 style={{ color: "#111827", fontWeight: 600 }}>Today</h3>
            </div>
            <div className="divide-y max-h-[250px] overflow-y-auto">
              {todayEvents.length > 0 ? todayEvents.map((event) => {
                const Icon = EVENT_ICONS[event.type] || Clock;
                return (
                  <button key={event.id} onClick={() => setSelectedEvent(event)} className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${EVENT_COLORS[event.type]}20` }}>
                      <Icon className="w-4 h-4" style={{ color: EVENT_COLORS[event.type] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-sm text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500">{formatTime(event.startTime)} - {formatTime(event.endTime)}</p>
                    </div>
                  </button>
                );
              }) : <div className="p-5 text-center text-sm text-gray-400">No events today</div>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: "#3b82f6" }} />
              <h3 style={{ color: "#111827", fontWeight: 600 }}>Upcoming</h3>
            </div>
            <div className="divide-y max-h-[250px] overflow-y-auto">
              {upcomingEvents.length > 0 ? upcomingEvents.map((event) => {
                const Icon = EVENT_ICONS[event.type] || Clock;
                return (
                  <button key={event.id} onClick={() => setSelectedEvent(event)} className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${EVENT_COLORS[event.type]}20` }}>
                      <Icon className="w-4 h-4" style={{ color: EVENT_COLORS[event.type] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-sm text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500">{formatEventDate(event.date)} • {formatTime(event.startTime)}</p>
                    </div>
                  </button>
                );
              }) : <div className="p-5 text-center text-sm text-gray-400">No upcoming events</div>}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
              <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b text-center text-sm font-medium text-gray-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="p-3">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => (
              <CalendarDay key={i} day={day} events={getEventsForDay(day)} isCurrentMonth={isSameMonth(day, currentMonth)} isToday={isToday(day)} onEventClick={setSelectedEvent} onEventDrop={handleMoveEvent} onDateClick={(d: Date) => { setNewEvent(p => ({...p, date: format(d, "yyyy-MM-dd")})); setShowCreateModal(true); }} />
            ))}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-lg font-semibold">Create Event</h2>
                <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="w-full px-4 py-2 border rounded-xl" placeholder="Event title" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Event Type</label>
                <select 
                  value={newEvent.type} 
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })} 
                  className="w-full px-4 py-2 border rounded-xl bg-white"
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Review">Review</option>
                  <option value="Post">Post</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <DatePicker label="Date" value={newEvent.date ? new Date(newEvent.date) : undefined} onChange={(val: any) => setNewEvent({ ...newEvent, date: val instanceof Date ? format(val, "yyyy-MM-dd") : val })} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} className="w-full border p-2 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} className="w-full border p-2 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link (optional)</label>
                <input type="url" value={newEvent.link} onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })} className="w-full px-4 py-2 border rounded-xl" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} className="w-full px-4 py-2 border rounded-xl" rows={3} placeholder="Description..." />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gray-100 rounded-xl">Cancel</button>
                <button onClick={handleCreateEvent} className="px-4 py-2 bg-amber-500 text-white rounded-xl">Create Event</button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Event Preview Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: EVENT_COLORS[selectedEvent.type] }}></div>
                    <span className="text-sm font-medium text-gray-500">{selectedEvent.type}</span>
                  </div>
                  <h2 className="text-lg font-semibold">{selectedEvent.title}</h2>
                </div>
                <button onClick={() => setSelectedEvent(null)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                {selectedEvent.description && <p className="text-gray-600 whitespace-pre-wrap">{selectedEvent.description}</p>}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <span>{formatEventDate(selectedEvent.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</span>
                  </div>
                  {selectedEvent.link && (
                    <div className="flex items-start gap-2 max-w-full">
                      <Video className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                      <a 
                        href={selectedEvent.link.startsWith('http') ? selectedEvent.link : `https://${selectedEvent.link}`} 
                        target="_blank" rel="noopener noreferrer" 
                        className="text-blue-600 underline break-all hover:text-blue-800"
                      >
                        {selectedEvent.link}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
                <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 bg-white border rounded-xl">Close</button>
                <button 
                  onClick={() => {
                    setEditingEvent(selectedEvent);
                    setEditForm({
                      title: selectedEvent.title,
                      description: selectedEvent.description || "",
                      type: selectedEvent.type,
                      date: selectedEvent.date,
                      startTime: selectedEvent.startTime.includes("T") ? selectedEvent.startTime.split("T")[1].substring(0,5) : selectedEvent.startTime,
                      endTime: selectedEvent.endTime.includes("T") ? selectedEvent.endTime.split("T")[1].substring(0,5) : selectedEvent.endTime,
                      link: selectedEvent.link || ""
                    });
                    setSelectedEvent(null);
                  }} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => { deleteEvent(selectedEvent.id); setSelectedEvent(null); }} className="px-4 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {editingEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-lg font-semibold">Edit Event</h2>
                <button onClick={() => setEditingEvent(null)}><X className="w-5 h-5" /></button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Event Type</label>
                <select 
                  value={editForm.type} 
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as EventType })} 
                  className="w-full px-4 py-2 border rounded-xl bg-white"
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Review">Review</option>
                  <option value="Post">Post</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <DatePicker label="Date" value={editForm.date ? new Date(editForm.date) : undefined} onChange={(val: any) => setEditForm({ ...editForm, date: val instanceof Date ? format(val, "yyyy-MM-dd") : val })} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} className="w-full border p-2 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} className="w-full border p-2 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link</label>
                <input type="url" value={editForm.link} onChange={(e) => setEditForm({ ...editForm, link: e.target.value })} className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-4 py-2 border rounded-xl" rows={3} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setEditingEvent(null)} className="px-4 py-2 bg-gray-100 rounded-xl">Cancel</button>
                <button 
                  onClick={async () => {
                    const startT = `${editForm.date}T${editForm.startTime}:00`;
                    const endT = `${editForm.date}T${editForm.endTime}:00`;
                    await updateEvent(editingEvent.id, { ...editForm, startTime: startT, endTime: endT });
                    setEditingEvent(null);
                  }} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

function CalendarDay({ day, events, isCurrentMonth, isToday: isTodayDay, onEventClick, onEventDrop, onDateClick }: any) {
  const [{ isOver }, drop] = useDrop(() => ({ accept: "event", drop: (item: any) => onEventDrop(item.id, day), collect: (m) => ({ isOver: m.isOver() }) }), [day]);
  return (
    <div ref={drop as any} onClick={() => onDateClick(day)} className="min-h-[100px] p-2 border-b border-r hover:bg-blue-50 cursor-pointer" style={{ borderColor: "#e5e7eb", background: isOver ? "#fef3c7" : isTodayDay ? "#fffbeb" : "transparent", opacity: isCurrentMonth ? 1 : 0.5 }}>
      <div className={`text-sm mb-1 ${isTodayDay ? "font-semibold text-amber-500" : "text-gray-700"}`}>{format(day, "d")}</div>
      <div className="space-y-1">
        {events.slice(0, 3).map((event: any) => <MemoizedDraggableEvent key={event.id} event={event} onClick={(e: any) => { e.stopPropagation(); onEventClick(event); }} />)}
        {events.length > 3 && <div className="text-xs text-gray-400">+{events.length - 3} more</div>}
      </div>
    </div>
  );
}

function DraggableEvent({ event, onClick }: any) {
  const [{ isDragging }, drag] = useDrag(() => ({ type: "event", item: { id: event.id }, collect: (m) => ({ isDragging: m.isDragging() }) }), [event.id]);
  const color = EVENT_COLORS[event.type as EventType] || "#6b7280";
  return <button ref={drag as any} onClick={onClick} className="w-full text-left px-2 py-1 rounded text-xs truncate border-l-4" style={{ background: `${color}15`, color: color, borderColor: color, opacity: isDragging ? 0.5 : 1 }}>{event.title}</button>;
}
const MemoizedDraggableEvent = memo(DraggableEvent);
