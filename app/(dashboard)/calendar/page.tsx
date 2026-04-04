"use client";

import { useState, useCallback } from "react";
import { useApp, CalendarEvent, EventType } from "@/context/AppContext";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Video, Eye, FileText, Trash2 } from "lucide-react";
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
  const [newEvent, setNewEvent] = useState({
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

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return currentEvents.filter((event) => event.date === dateStr);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    await addEvent({
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6" style={{ background: "#fafaf7", minHeight: "100vh" }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-gray-100">
              <ChevronLeft className="w-5 h-5" style={{ color: "#6b7280" }} />
            </button>
            <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>{format(currentMonth, "MMMM yyyy")}</h1>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-gray-100">
              <ChevronRight className="w-5 h-5" style={{ color: "#6b7280" }} />
            </button>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium" style={{ background: "#f59e0b", color: "white" }}>
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <div className="grid grid-cols-7 border-b" style={{ borderColor: "#e5e7eb" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium" style={{ color: "#6b7280" }}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => (
              <CalendarDay key={i} day={day} events={getEventsForDay(day)} isCurrentMonth={isSameMonth(day, currentMonth)} isToday={isToday(day)} onEventClick={setSelectedEvent} onEventDrop={handleMoveEvent} />
            ))}
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
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
                  <DatePicker label="Date" value={newEvent.date} onChange={(val) => setNewEvent({ ...newEvent, date: val })} />
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

        {selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "#e5e7eb" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${EVENT_COLORS[selectedEvent.type]}20` }}>
                    {(() => { const Icon = EVENT_ICONS[selectedEvent.type]; return <Icon className="w-4 h-4" style={{ color: EVENT_COLORS[selectedEvent.type] }} />; })()}
                  </div>
                  <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>{selectedEvent.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { deleteEvent(selectedEvent.id); setSelectedEvent(null); }} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} /></button>
                  <button onClick={() => setSelectedEvent(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#374151" }}>Date</p>
                  <p style={{ color: "#6b7280" }}>{format(new Date(selectedEvent.date + "T12:00:00"), "MMMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#374151" }}>Time</p>
                  <p style={{ color: "#6b7280" }}>{selectedEvent.startTime} - {selectedEvent.endTime}</p>
                </div>
                {selectedEvent.link && (
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#374151" }}>Link</p>
                    <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{selectedEvent.link}</a>
                  </div>
                )}
                {selectedEvent.description && (
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#374151" }}>Description</p>
                    <p style={{ color: "#6b7280" }}>{selectedEvent.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

function CalendarDay({ day, events, isCurrentMonth, isToday: isTodayDay, onEventClick, onEventDrop }: { day: Date; events: CalendarEvent[]; isCurrentMonth: boolean; isToday: boolean; onEventClick: (event: CalendarEvent) => void; onEventDrop: (eventId: string, newDate: Date) => void; }) {
  const [{ isOver }, drop] = useDrop({ accept: "event", drop: (item: { id: string }) => { onEventDrop(item.id, day); }, collect: (monitor) => ({ isOver: monitor.isOver() }) });
  return (
    <div ref={drop} className="min-h-[100px] p-2 border-b border-r" style={{ borderColor: "#e5e7eb", background: isOver ? "#fef3c7" : isTodayDay ? "#fffbeb" : "transparent", opacity: isCurrentMonth ? 1 : 0.5 }}>
      <div className={`text-sm mb-1 ${isTodayDay ? "font-semibold" : ""}`} style={{ color: isTodayDay ? "#f59e0b" : "#374151" }}>{format(day, "d")}</div>
      <div className="space-y-1">
        {events.slice(0, 3).map((event) => <DraggableEvent key={event.id} event={event} onClick={() => onEventClick(event)} />)}
        {events.length > 3 && <div className="text-xs" style={{ color: "#6b7280" }}>+{events.length - 3} more</div>}
      </div>
    </div>
  );
}

function DraggableEvent({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const [{ isDragging }, drag] = useDrag({ type: "event", item: { id: event.id }, collect: (monitor) => ({ isDragging: monitor.isDragging() }) });
  return <div ref={drag} onClick={onClick} className="px-2 py-1 rounded text-xs truncate cursor-pointer" style={{ background: `${EVENT_COLORS[event.type]}20`, color: EVENT_COLORS[event.type], opacity: isDragging ? 0.5 : 1 }}>{event.title}</div>;
}
