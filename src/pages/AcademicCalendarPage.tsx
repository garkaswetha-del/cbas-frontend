import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { currentAcademicYear } from '../utils/academicYear';

const API = 'https://cbas-backend-production.up.railway.app';

const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = 2025 + i;
  return `${y}-${String(y + 1).slice(2)}`;
});

const EVENT_TYPES = [
  { value: 'holiday',   label: 'Holiday',    color: 'bg-red-100 text-red-800 border-red-200',       dot: 'bg-red-500' },
  { value: 'vacation',  label: 'Vacation',   color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' },
  { value: 'exam',      label: 'Exam',       color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  { value: 'ptm',       label: 'PTM',        color: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  { value: 'event',     label: 'Event',      color: 'bg-blue-100 text-blue-800 border-blue-200',    dot: 'bg-blue-500' },
  { value: 'buffer',    label: 'Buffer Day', color: 'bg-gray-100 text-gray-700 border-gray-200',    dot: 'bg-gray-400' },
];

const TYPE_MAP = Object.fromEntries(EVENT_TYPES.map(t => [t.value, t]));

// Academic year months: May of start year → March of end year
function getAcademicMonths(year: string): Date[] {
  const startYear = parseInt(year.split('-')[0]);
  const months: Date[] = [];
  for (let m = 4; m <= 11; m++) months.push(new Date(startYear, m, 1));       // May–Dec
  for (let m = 0; m <= 2; m++)  months.push(new Date(startYear + 1, m, 1));   // Jan–Mar
  return months;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  // 0=Sun → shift to Mon-start: Sun becomes 6, Mon=0
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

interface CalendarEvent {
  id: string;
  academic_year: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  applies_to: string;
  grade: number | null;
}

const BLANK_FORM = {
  title: '',
  event_type: 'holiday',
  start_date: '',
  end_date: '',
  applies_to: 'all',
  grade: '' as string | number,
};

export default function AcademicCalendarPage({ readOnly = false }: { readOnly?: boolean }) {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentMonthIdx, setCurrentMonthIdx] = useState(0); // index into academic months
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; event?: CalendarEvent } | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const months = getAcademicMonths(academicYear);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/calendar?academic_year=${academicYear}`);
      setEvents(res.data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { load(); setCurrentMonthIdx(0); }, [load]);

  // Map events to date strings they cover
  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach(ev => {
    const start = new Date(ev.start_date);
    const end   = new Date(ev.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)!.push(ev);
    }
  });

  function openAdd(prefillDate?: string) {
    setForm({
      ...BLANK_FORM,
      start_date: prefillDate || '',
      end_date:   prefillDate || '',
    });
    setModal({ mode: 'add' });
  }

  function openEdit(ev: CalendarEvent) {
    setForm({
      title:      ev.title,
      event_type: ev.event_type,
      start_date: ev.start_date.slice(0, 10),
      end_date:   ev.end_date.slice(0, 10),
      applies_to: ev.applies_to,
      grade:      ev.grade ?? '',
    });
    setModal({ mode: 'edit', event: ev });
  }

  async function save() {
    if (!form.title.trim() || !form.start_date || !form.end_date) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        academic_year: academicYear,
        grade: form.grade !== '' ? Number(form.grade) : null,
      };
      if (modal?.mode === 'edit' && modal.event) {
        await axios.patch(`${API}/calendar/${modal.event.id}`, payload);
      } else {
        await axios.post(`${API}/calendar`, payload);
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this event?')) return;
    await axios.delete(`${API}/calendar/${id}`);
    await load();
  }

  const currentMonth = months[currentMonthIdx];
  const cy = currentMonth.getFullYear();
  const cm = currentMonth.getMonth();
  const totalDays = daysInMonth(cy, cm);
  const startOffset = firstDayOfMonth(cy, cm);
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Events for selected date
  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) || []) : [];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Academic Calendar</h1>
          <p className="text-xs text-gray-500 mt-0.5">Plan holidays, exams, events and buffer days</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            {ACADEMIC_YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
          <div className="flex rounded overflow-hidden border border-gray-300 text-sm">
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 ${view === 'calendar' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 ${view === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              List
            </button>
          </div>
          {!readOnly && (
            <button
              onClick={() => openAdd()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1.5 rounded font-medium"
            >
              + Add Event
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EVENT_TYPES.map(t => (
          <span key={t.value} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />
            {t.label}
          </span>
        ))}
      </div>

      {loading && (
        <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {!loading && view === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => { setCurrentMonthIdx(i => Math.max(0, i - 1)); setSelectedDate(null); }}
              disabled={currentMonthIdx === 0}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600"
            >
              ‹
            </button>
            <h2 className="text-sm font-semibold text-gray-700">{monthName}</h2>
            <button
              onClick={() => { setCurrentMonthIdx(i => Math.min(months.length - 1, i + 1)); setSelectedDate(null); }}
              disabled={currentMonthIdx === months.length - 1}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600"
            >
              ›
            </button>
          </div>

          {/* Month tabs */}
          <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50 scrollbar-hide">
            {months.map((m, idx) => (
              <button
                key={idx}
                onClick={() => { setCurrentMonthIdx(idx); setSelectedDate(null); }}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                  idx === currentMonthIdx
                    ? 'border-b-2 border-indigo-600 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m.toLocaleString('default', { month: 'short' })}
              </button>
            ))}
          </div>

          {/* Day grid */}
          <div className="p-3">
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50 h-20" />
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day   = i + 1;
                const dateStr = isoDate(cy, cm, day);
                const dayEvs  = eventsByDate.get(dateStr) || [];
                const isSelected = selectedDate === dateStr;
                const isToday    = dateStr === new Date().toISOString().slice(0, 10);

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`bg-white h-20 p-1 cursor-pointer hover:bg-indigo-50 transition-colors ${
                      isSelected ? 'ring-2 ring-inset ring-indigo-400' : ''
                    }`}
                  >
                    <div className={`text-xs font-semibold mb-0.5 w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvs.slice(0, 3).map(ev => {
                        const t = TYPE_MAP[ev.event_type];
                        return (
                          <div
                            key={ev.id}
                            className={`text-xs px-1 py-0.5 rounded truncate border ${t?.color ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvs.length > 3 && (
                        <div className="text-xs text-gray-400">+{dayEvs.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected date events */}
          {selectedDate && (
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {!readOnly && (
                  <button
                    onClick={() => openAdd(selectedDate)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    + Add event on this day
                  </button>
                )}
              </div>
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-gray-400">No events on this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(ev => (
                    <EventRow key={ev.id} ev={ev} onEdit={openEdit} onDelete={remove} readOnly={readOnly} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {!loading && view === 'list' && (
        <div className="space-y-5">
          {months.map((m, idx) => {
            const y  = m.getFullYear();
            const mo = m.getMonth();
            const monthEvents = events.filter(ev => {
              const s = new Date(ev.start_date);
              const e = new Date(ev.end_date);
              const mStart = new Date(y, mo, 1);
              const mEnd   = new Date(y, mo + 1, 0);
              return s <= mEnd && e >= mStart;
            });
            if (monthEvents.length === 0) return null;
            return (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
                  <h3 className="text-sm font-semibold text-indigo-700">
                    {m.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {monthEvents.map(ev => (
                    <EventRow key={ev.id} ev={ev} onEdit={openEdit} onDelete={remove} readOnly={readOnly} />
                  ))}
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-sm">No events yet for {academicYear}</p>
              <button onClick={() => openAdd()} className="mt-3 text-indigo-600 text-sm hover:underline">
                Add the first event
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">
                {modal.mode === 'add' ? 'Add Event' : 'Edit Event'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Dasara Holiday, PA1 Exam, PTM"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Event Type *</label>
                <select
                  value={form.event_type}
                  onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: f.end_date || e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={form.end_date}
                    min={form.start_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Applies To</label>
                  <select
                    value={form.applies_to}
                    onChange={e => setForm(f => ({ ...f, applies_to: e.target.value, grade: '' }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="all">All Grades</option>
                    <option value="grade">Specific Grade</option>
                  </select>
                </div>
                {form.applies_to === 'grade' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Grade</label>
                    <select
                      value={form.grade}
                      onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">Select grade</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(g => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-4">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.title.trim() || !form.start_date || !form.end_date}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Event' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventRow({
  ev,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  ev: CalendarEvent;
  onEdit: (ev: CalendarEvent) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}) {
  const t = TYPE_MAP[ev.event_type];
  const start = ev.start_date.slice(0, 10);
  const end   = ev.end_date.slice(0, 10);
  const dateLabel = start === end
    ? new Date(start + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : `${new Date(start + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(end + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t?.dot ?? 'bg-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{ev.title}</p>
        <p className="text-xs text-gray-500">
          {dateLabel}
          {ev.applies_to === 'grade' && ev.grade && <span className="ml-2 text-indigo-500">Grade {ev.grade}</span>}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${t?.color ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
        {t?.label ?? ev.event_type}
      </span>
      {!readOnly && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(ev)} className="text-xs text-gray-500 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-indigo-50">
            Edit
          </button>
          <button onClick={() => onDelete(ev.id)} className="text-xs text-gray-500 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
