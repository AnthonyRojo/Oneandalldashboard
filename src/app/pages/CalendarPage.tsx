import { useState, useCallback } from "react";
import { useApp, CalendarEvent, EventType } from "../context/AppContext";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Link, Video, Eye, FileText, HelpCircle, Pencil, Trash2, ExternalLink, Save } from "lucide-react";
import DatePicker from "../components/ui/DatePicker";

// ── Color palette — high contrast, disability-friendly (WCAG AA) ───────────────
const EVENT_COLORS: Record<EventType, { color: string; bg: string; dot: string; border: string; text: string }> = {
  Meeting:  { color: "#1d4ed8", bg: "#dbeafe", dot: "#2563eb", border: "#93c5fd", text: "#1e3a8a" },
  Review:   { color: "#6d28d9", bg: "#ede9fe", dot: "#7c3aed", border: "#c4b5fd", text: "#4c1d95" },
  Post:     { color: "#065f46", bg: "#d1fae5", dot: "#059669", border: "#6ee7b7", text: "#022c22" },
  Other:    { color: "#374151", bg: "#f3f4f6", dot: "#6b7280", border: "#d1d5db", text: "#111827" },
};

// Fallback for old "Deadline" events
const getEventColor = (type: string) => EVENT_COLORS[type as EventType] || EVENT_COLORS.Other;

const EVENT_ICONS: Record<string, typeof Video> = {
  Meeting: Video,
  Review:  Eye,
  Post:    FileText,
  Other:   HelpCircle,
  Deadline: HelpCircle, // backward compat
};

const ITEM_TYPE = "CALENDAR_EVENT";

// ── Draggable Event Chip ───────────────────────────────────────────────────────
function DraggableEvent({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const conf = getEventColor(event.type);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { id: event.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [event.id]);

  return (
    <button
      ref={drag as any}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full text-left rounded-md px-1.5 py-0.5 truncate text-xs font-medium transition-all"
      style={{
        background: conf.bg, color: conf.text,
        border: `1px solid ${conf.border}`,
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
      }}
      aria-label={event.title}
      title={event.title}>
      {event.title}
    </button>
  );
}

// ── Droppable Day Cell ──────────────────────────────────────────────────────────
function DroppableDay({
  day, events, isSelected, isTodayDate, isCurrentMonth,
  onSelect, onEventClick, onDrop,
}: {
  day: Date; events: CalendarEvent[]; isSelected: boolean; isTodayDate: boolean;
  isCurrentMonth: boolean; onSelect: () => void;
  onEventClick: (e: CalendarEvent) => void; onDrop: (eventId: string, date: string) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: { id: string }) => {
      onDrop(item.id, format(day, "yyyy-MM-dd"));
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [day, onDrop]);

  return (
    <div
      ref={drop as any}
      onClick={onSelect}
      className="min-h-[80px] p-1 rounded-xl flex flex-col gap-0.5 cursor-pointer transition-all"
      style={{
        background: isOver && canDrop ? "#fffbeb" : isSelected ? "#111827" : isTodayDate ? "#fef9e7" : "transparent",
        opacity: isCurrentMonth ? 1 : 0.4,
        border: isOver && canDrop ? "2px dashed #f59e0b" : isSelected ? "2px solid #f59e0b" : "2px solid transparent",
      }}
      role="button"
      aria-label={`${format(day, "MMMM d")}${events.length ? `, ${events.length} events` : ""}`}
      aria-selected={isSelected}>
      <span className="text-sm font-medium self-center"
        style={{ color: isSelected ? "white" : isTodayDate ? "#d97706" : "#374151" }}>
        {format(day, "d")}
      </span>
      <div className="flex flex-col gap-0.5">
        {events.slice(0, 2).map((e) => (
          <DraggableEvent key={e.id} event={e} onClick={() => onEventClick(e)} />
        ))}
        {events.length > 2 && (
          <span className="text-xs px-1" style={{ color: "#9ca3af" }}>+{events.length - 2} more</span>
        )}
      </div>
    </div>
  );
}

// ── Event Form Fields ──────────────────────────────────────────────────────────
function EventFormFields({ title, setTitle, description, setDescription, date, setDate, startTime, setStartTime, endTime, setEndTime, type, setType, link, setLink }: any) {
  return (
    <>
      <div>
        <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" required
          className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
      </div>
      <div>
        <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          placeholder="Event details..." className="w-full px-4 py-2.5 rounded-xl border outline-none resize-none"
          style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
      </div>
      <DatePicker value={date} onChange={setDate} label="Date" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Start</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
        </div>
        <div>
          <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>End</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
        </div>
      </div>
      <div>
        <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Event Type</label>
        <div className="grid grid-cols-2 gap-2">
          {(["Meeting", "Review", "Post", "Other"] as EventType[]).map((t) => {
            const conf = EVENT_COLORS[t];
            const Icon = EVENT_ICONS[t];
            return (
              <button key={t} type="button" onClick={() => setType(t)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={{ background: type === t ? conf.bg : "#f9f9f6", color: type === t ? conf.text : "#6b7280", fontWeight: type === t ? 600 : 400, border: `2px solid ${type === t ? conf.color : "transparent"}` }}
                aria-pressed={type === t}>
                <Icon className="w-3.5 h-3.5" />
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>
          <Link className="w-3.5 h-3.5 inline mr-1.5" />Meet / Post Link
        </label>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/..."
          className="w-full px-4 py-2.5 rounded-xl border outline-none" style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }} />
      </div>
    </>
  );
}

// ── Create Event Modal ─────────────────────────────────────────────────────────
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: "#111827" }}>New Event</h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "#9ca3af" }}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <EventFormFields title={title} setTitle={setTitle} description={description} setDescription={setDescription}
            date={date} setDate={setDate} startTime={startTime} setStartTime={setStartTime}
            endTime={endTime} setEndTime={setEndTime} type={type} setType={setType} link={link} setLink={setLink} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border" style={{ borderColor: "#e5e7eb", color: "#374151" }}>Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl" style={{ background: "#f59e0b", color: "#111827", fontWeight: 600 }}>Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Event Detail / Edit Modal ──────────────────────────────────────────────────
function EventDetailModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const { updateEvent, deleteEvent } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  const [date, setDate] = useState(event.date);
  const [startTime, setStartTime] = useState(event.startTime);
  const [endTime, setEndTime] = useState(event.endTime);
  const [type, setType] = useState<EventType>(event.type as EventType);
  const [link, setLink] = useState(event.link || "");

  const conf = getEventColor(event.type);
  const Icon = EVENT_ICONS[event.type] || HelpCircle;

  const handleSave = () => {
    updateEvent(event.id, { title, description, date, startTime, endTime, type, link: link || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 max-h-[92vh] overflow-y-auto">
        <div className="p-5 rounded-t-2xl" style={{ background: conf.bg, borderBottom: `2px solid ${conf.border}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "white" }}>
                <Icon className="w-5 h-5" style={{ color: conf.color }} />
              </div>
              <div>
                <h2 style={{ color: conf.text, fontSize: "1.125rem" }}>{event.title}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs mt-1 inline-block font-semibold"
                  style={{ background: conf.color, color: "white" }}>{event.type}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditMode(!editMode)} className="p-2 rounded-xl"
                style={{ color: editMode ? conf.color : "#9ca3af" }} aria-label="Edit event">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => { if (confirm("Delete event?")) { deleteEvent(event.id); onClose(); } }}
                className="p-2 rounded-xl" style={{ color: "#ef4444" }} aria-label="Delete event">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "#9ca3af" }}><X className="w-5 h-5" /></button>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {editMode ? (
            <>
              <EventFormFields title={title} setTitle={setTitle} description={description} setDescription={setDescription}
                date={date} setDate={setDate} startTime={startTime} setStartTime={setStartTime}
                endTime={endTime} setEndTime={setEndTime} type={type} setType={setType} link={link} setLink={setLink} />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditMode(false)} className="flex-1 py-2.5 rounded-xl border" style={{ borderColor: "#e5e7eb", color: "#374151" }}>Cancel</button>
                <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2"
                  style={{ background: "#f59e0b", color: "#111827", fontWeight: 600 }}>
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#fafaf7" }}>
                <Clock className="w-4 h-4" style={{ color: conf.color }} />
                <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                  {format(new Date(event.date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
                </span>
                <span style={{ marginLeft: "auto", fontSize: "0.875rem", color: "#6b7280" }}>
                  {event.startTime} – {event.endTime}
                </span>
              </div>
              {event.description && (
                <div className="p-3 rounded-xl" style={{ background: "#fafaf7" }}>
                  <p style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#374151", marginBottom: 4 }}>Details</p>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{event.description}</p>
                </div>
              )}
              {event.link && (
                <a href={event.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: conf.bg, color: conf.text, border: `1.5px solid ${conf.border}`, textDecoration: "none" }}>
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                    {event.type === "Meeting" ? "Join Meeting" : "Open Link"}
                  </span>
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Calendar Page ─────────────────────────────────────────────────────────
function CalendarContent() {
  const { currentEvents, updateEvent } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = useCallback((day: Date) =>
    currentEvents.filter((e) => isSameDay(new Date(e.date + "T12:00:00"), day)), [currentEvents]);

  const selectedDayEvents = getEventsForDay(selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleDrop = useCallback((eventId: string, newDate: string) => {
    updateEvent(eventId, { date: newDate });
  }, [updateEvent]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 style={{ color: "#111827", fontSize: "1.5rem" }}>Calendar</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: 4 }}>Drag events to reschedule · Click to view/edit</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: "#f59e0b", color: "#111827", fontWeight: 600, fontSize: "0.875rem" }}>
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 style={{ color: "#111827", fontSize: "1.125rem" }}>{format(currentMonth, "MMMM yyyy")}</h2>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "#6b7280" }} aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }} className="px-3 py-1 rounded-lg text-xs"
                style={{ background: "#fffbeb", color: "#f59e0b", fontWeight: 600 }}>Today</button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "#6b7280" }} aria-label="Next month">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center py-1" style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              return (
                <DroppableDay
                  key={day.toString()}
                  day={day}
                  events={dayEvents}
                  isSelected={isSameDay(day, selectedDate)}
                  isTodayDate={isToday(day)}
                  isCurrentMonth={isSameMonth(day, currentMonth)}
                  onSelect={() => setSelectedDate(day)}
                  onEventClick={setSelectedEvent}
                  onDrop={handleDrop}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t" style={{ borderColor: "#f0f0ea" }}>
            {(Object.entries(EVENT_COLORS) as [EventType, typeof EVENT_COLORS[EventType]][]).map(([type, conf]) => {
              const Icon = EVENT_ICONS[type];
              return (
                <div key={type} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: conf.bg, border: `1px solid ${conf.border}` }}>
                  <Icon className="w-3 h-3" style={{ color: conf.color }} aria-hidden />
                  <span style={{ fontSize: "0.75rem", color: conf.text, fontWeight: 600 }}>{type}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agenda Panel */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#f0f0ea" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ color: "#111827" }}>{format(selectedDate, "EEEE")}</h3>
              <p style={{ color: "#6b7280", fontSize: "0.8125rem" }}>{format(selectedDate, "MMMM d, yyyy")}</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "#fffbeb", color: "#f59e0b" }} aria-label="Add event">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "#fafaf7" }}>
                <Clock className="w-6 h-6" style={{ color: "#d1d5db" }} />
              </div>
              <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No events today</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 px-4 py-2 rounded-xl text-sm"
                style={{ background: "#fffbeb", color: "#f59e0b", fontWeight: 500 }}>
                + Add Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map((event) => {
                const conf = getEventColor(event.type);
                const Icon = EVENT_ICONS[event.type] || HelpCircle;
                return (
                  <button key={event.id} onClick={() => setSelectedEvent(event)}
                    className="w-full text-left p-4 rounded-xl transition-all"
                    style={{ background: conf.bg, border: `1.5px solid ${conf.border}`, borderLeft: `4px solid ${conf.color}` }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "white" }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: conf.color }} aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight: 600, color: conf.text, fontSize: "0.875rem" }}>{event.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3 h-3" style={{ color: conf.color }} aria-hidden />
                          <span style={{ fontSize: "0.75rem", color: conf.color, fontWeight: 500 }}>
                            {event.startTime} – {event.endTime}
                          </span>
                        </div>
                        {event.description && (
                          <p className="truncate mt-1" style={{ fontSize: "0.75rem", color: "#6b7280" }}>{event.description}</p>
                        )}
                        {event.link && (
                          <span className="inline-flex items-center gap-1 mt-1" style={{ fontSize: "0.75rem", color: conf.color }}>
                            <Link className="w-3 h-3" aria-hidden /> Has link
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Upcoming */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#f0f0ea" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Upcoming</p>
            <div className="space-y-2">
              {currentEvents
                .filter((e) => new Date(e.date + "T12:00:00") >= new Date())
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 5)
                .map((event) => {
                  const conf = getEventColor(event.type);
                  return (
                    <button key={event.id} className="w-full text-left flex items-center gap-3"
                      onClick={() => { setSelectedDate(new Date(event.date + "T12:00:00")); setSelectedEvent(event); }}>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: conf.dot }} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontSize: "0.8125rem", color: "#374151", fontWeight: 500 }}>{event.title}</p>
                        <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          {format(new Date(event.date + "T12:00:00"), "MMM d")} · {event.startTime}
                        </p>
                      </div>
                      {event.link && <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: conf.color }} />}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} defaultDate={format(selectedDate, "yyyy-MM-dd")} />}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <DndProvider backend={HTML5Backend}>
      <CalendarContent />
    </DndProvider>
  );
}
