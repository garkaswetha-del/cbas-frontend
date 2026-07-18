import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { currentAcademicYear } from '../utils/academicYear';

const API = 'https://cbas-backend-production.up.railway.app';

const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = 2025 + i;
  return `${y}-${String(y + 1).slice(2)}`;
});

const EVENT_TYPES = [
  { value: 'holiday',  label: 'Holiday',    color: 'bg-red-100 text-red-800 border-red-200',          dot: 'bg-red-500',    ring: 'ring-red-400' },
  { value: 'vacation', label: 'Vacation',   color: 'bg-green-100 text-green-800 border-green-200',    dot: 'bg-green-500',  ring: 'ring-green-400' },
  { value: 'exam',     label: 'Exam',       color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500', ring: 'ring-orange-400' },
  { value: 'ptm',      label: 'PTM',        color: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500', ring: 'ring-purple-400' },
  { value: 'event',    label: 'Event',      color: 'bg-blue-100 text-blue-800 border-blue-200',       dot: 'bg-blue-500',   ring: 'ring-blue-400' },
  { value: 'buffer',   label: 'Buffer Day', color: 'bg-gray-100 text-gray-700 border-gray-200',       dot: 'bg-gray-400',   ring: 'ring-gray-400' },
];

const TYPE_MAP = Object.fromEntries(EVENT_TYPES.map(t => [t.value, t]));

// To add a new template chip: add one entry here, it will appear automatically.
const TEMPLATES = [
  { group: 'Holiday', title: 'Independence Day', event_type: 'holiday', defaultMMDD: '08-15', multiDay: false },
  { group: 'Holiday', title: 'Gandhi Jayanti',   event_type: 'holiday', defaultMMDD: '10-02', multiDay: false },
  { group: 'Holiday', title: 'Rajyotsava',       event_type: 'holiday', defaultMMDD: '11-01', multiDay: false },
  { group: 'Holiday', title: 'Christmas',        event_type: 'holiday', defaultMMDD: '12-25', multiDay: false },
  { group: 'Holiday', title: 'Republic Day',     event_type: 'holiday', defaultMMDD: '01-26', multiDay: false },
  { group: 'Exam',    title: 'PA1',              event_type: 'exam',    defaultMMDD: null,    multiDay: false },
  { group: 'Exam',    title: 'PA2',              event_type: 'exam',    defaultMMDD: null,    multiDay: false },
  { group: 'Exam',    title: 'SA1',              event_type: 'exam',    defaultMMDD: null,    multiDay: true  },
  { group: 'Exam',    title: 'PA3',              event_type: 'exam',    defaultMMDD: null,    multiDay: false },
  { group: 'Exam',    title: 'SA2',              event_type: 'exam',    defaultMMDD: null,    multiDay: true  },
  { group: 'School',  title: 'PTM',              event_type: 'ptm',     defaultMMDD: null,    multiDay: false },
  { group: 'School',  title: 'Sports Day',       event_type: 'event',   defaultMMDD: null,    multiDay: false },
  { group: 'School',  title: 'Annual Day',       event_type: 'event',   defaultMMDD: null,    multiDay: false },
];

function templateDate(mmdd: string, academicYear: string): string {
  const startYear = parseInt(academicYear.split('-')[0]);
  const month = parseInt(mmdd.split('-')[0]);
  const year = month >= 5 ? startYear : startYear + 1;
  return `${year}-${mmdd}`;
}

function getAcademicMonths(year: string): Date[] {
  const startYear = parseInt(year.split('-')[0]);
  const months: Date[] = [];
  for (let m = 4; m <= 11; m++) months.push(new Date(startYear, m, 1));
  for (let m = 0; m <= 2; m++)  months.push(new Date(startYear + 1, m, 1));
  return months;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
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

type TemplateDef = typeof TEMPLATES[0];

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
  const [currentMonthIdx, setCurrentMonthIdx] = useState(0);

  // Full modal (for edit and "more options")
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; event?: CalendarEvent } | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);

  // Quick-add popover (click on a date cell)
  const [quickAdd, setQuickAdd] = useState<{ date: string; x: number; y: number } | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState('holiday');
  const [quickEndDate, setQuickEndDate] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const quickPopoverRef = useRef<HTMLDivElement>(null);

  // Template chip popover
  const [templateAdd, setTemplateAdd] = useState<TemplateDef | null>(null);
  const [templateStart, setTemplateStart] = useState('');
  const [templateEnd, setTemplateEnd] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const templatePopoverRef = useRef<HTMLDivElement>(null);

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

  // Close popovers on outside click
  useEffect(() => {
    if (!quickAdd && !templateAdd) return;
    function onMouseDown(e: MouseEvent) {
      if (quickPopoverRef.current && !quickPopoverRef.current.contains(e.target as Node)) {
        setQuickAdd(null);
      }
      if (templatePopoverRef.current && !templatePopoverRef.current.contains(e.target as Node)) {
        setTemplateAdd(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [quickAdd, templateAdd]);

  // Build date → events map
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

  // ── Quick-add handlers ──
  function openQuickAdd(date: string, e: React.MouseEvent) {
    if (readOnly) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 300);
    const y = Math.min(rect.bottom + 4, window.innerHeight - 220);
    setQuickTitle('');
    setQuickType('holiday');
    setQuickEndDate(date);
    setQuickAdd({ date, x, y });
  }

  async function doQuickSave() {
    if (!quickTitle.trim() || !quickAdd || quickSaving) return;
    setQuickSaving(true);
    try {
      await axios.post(`${API}/calendar`, {
        academic_year: academicYear,
        title: quickTitle.trim(),
        event_type: quickType,
        start_date: quickAdd.date,
        end_date: quickEndDate || quickAdd.date,
        applies_to: 'all',
        grade: null,
      });
      setQuickAdd(null);
      await load();
    } finally {
      setQuickSaving(false);
    }
  }

  function openMoreOptions() {
    if (!quickAdd) return;
    setForm({
      title: quickTitle,
      event_type: quickType,
      start_date: quickAdd.date,
      end_date: quickEndDate || quickAdd.date,
      applies_to: 'all',
      grade: '',
    });
    setModal({ mode: 'add' });
    setQuickAdd(null);
  }

  // ── Template handlers ──
  function openTemplatePick(t: TemplateDef) {
    const defaultStart = t.defaultMMDD ? templateDate(t.defaultMMDD, academicYear) : '';
    setTemplateStart(defaultStart);
    setTemplateEnd(defaultStart);
    setTemplateAdd(t);
  }

  async function doTemplateSave() {
    if (!templateAdd || !templateStart || templateSaving) return;
    setTemplateSaving(true);
    try {
      await axios.post(`${API}/calendar`, {
        academic_year: academicYear,
        title: templateAdd.title,
        event_type: templateAdd.event_type,
        start_date: templateStart,
        end_date: templateEnd || templateStart,
        applies_to: 'all',
        grade: null,
      });
      setTemplateAdd(null);
      await load();
    } finally {
      setTemplateSaving(false);
    }
  }

  // ── Full modal handlers ──
  function openAdd() {
    setForm({ ...BLANK_FORM });
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

  async function modalSave() {
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
  const totalDays  = daysInMonth(cy, cm);
  const startOffset = firstDayOfMonth(cy, cm);
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
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
              onClick={openAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1.5 rounded font-medium"
            >
              + Add Event
            </button>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-3 mb-3">
        {EVENT_TYPES.map(t => (
          <span key={t.value} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />
            {t.label}
          </span>
        ))}
      </div>

      {/* ── Template chips ── */}
      {!readOnly && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 mb-2">Quick add common events:</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t, i) => {
              const td = TYPE_MAP[t.event_type];
              return (
                <button
                  key={i}
                  onClick={() => openTemplatePick(t)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-opacity hover:opacity-75 ${td?.color}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${td?.dot}`} />
                  {t.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading && <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>}

      {/* ── CALENDAR VIEW ── */}
      {!loading && view === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setCurrentMonthIdx(i => Math.max(0, i - 1))}
              disabled={currentMonthIdx === 0}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600 text-lg leading-none"
            >
              ‹
            </button>
            <h2 className="text-sm font-semibold text-gray-700">{monthName}</h2>
            <button
              onClick={() => setCurrentMonthIdx(i => Math.min(months.length - 1, i + 1))}
              disabled={currentMonthIdx === months.length - 1}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600 text-lg leading-none"
            >
              ›
            </button>
          </div>

          {/* Month tabs */}
          <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
            {months.map((m, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentMonthIdx(idx)}
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
                <div key={`e-${i}`} className="bg-gray-50 h-20" />
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day     = i + 1;
                const dateStr = isoDate(cy, cm, day);
                const dayEvs  = eventsByDate.get(dateStr) || [];
                const isToday = dateStr === new Date().toISOString().slice(0, 10);
                const isActive = quickAdd?.date === dateStr;

                return (
                  <div
                    key={day}
                    onClick={e => openQuickAdd(dateStr, e)}
                    className={`bg-white h-20 p-1 transition-colors ${
                      readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-indigo-50'
                    } ${isActive ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : ''}`}
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
                            onClick={e => { e.stopPropagation(); if (!readOnly) openEdit(ev); }}
                            className={`text-xs px-1 py-0.5 rounded truncate border ${t?.color ?? 'bg-gray-100 text-gray-700 border-gray-200'} ${!readOnly ? 'cursor-pointer hover:opacity-75' : ''}`}
                            title={ev.title}
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

          {!readOnly && (
            <p className="text-xs text-gray-400 text-center pb-3">
              Click any date to add an event · Click an event pill to edit
            </p>
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
              return s <= new Date(y, mo + 1, 0) && e >= new Date(y, mo, 1);
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
              {!readOnly && (
                <button onClick={openAdd} className="mt-3 text-indigo-600 text-sm hover:underline">
                  Add the first event
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── QUICK-ADD POPOVER ── */}
      {quickAdd && !readOnly && (
        <div
          ref={quickPopoverRef}
          style={{ position: 'fixed', left: quickAdd.x, top: quickAdd.y, zIndex: 1000 }}
          className="w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-3"
        >
          <input
            autoFocus
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') doQuickSave();
              if (e.key === 'Escape') setQuickAdd(null);
            }}
            placeholder="Event name…"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2.5"
          />

          {/* Type selector */}
          <div className="flex items-center gap-1.5 mb-2.5">
            {EVENT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setQuickType(t.value)}
                title={t.label}
                className={`w-6 h-6 rounded-full flex-shrink-0 transition-all ${t.dot} ${
                  quickType === t.value
                    ? `ring-2 ring-offset-1 ${t.ring} scale-110`
                    : 'opacity-40 hover:opacity-80'
                }`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1 flex-1">{TYPE_MAP[quickType]?.label}</span>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
            <span className="font-medium">{quickAdd.date}</span>
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={quickEndDate}
              min={quickAdd.date}
              onChange={e => setQuickEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-0.5 text-xs flex-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={openMoreOptions}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
            >
              More options →
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setQuickAdd(null)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={doQuickSave}
                disabled={!quickTitle.trim() || quickSaving}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md font-medium disabled:opacity-50"
              >
                {quickSaving ? '…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEMPLATE PICK POPOVER ── */}
      {templateAdd && !readOnly && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div ref={templatePopoverRef} className="bg-white rounded-xl shadow-2xl w-72">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${TYPE_MAP[templateAdd.event_type]?.dot}`} />
              <span className="text-sm font-semibold text-gray-800">{templateAdd.title}</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${TYPE_MAP[templateAdd.event_type]?.color}`}>
                {TYPE_MAP[templateAdd.event_type]?.label}
              </span>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  {templateAdd.multiDay ? 'Start Date' : 'Date'} *
                </label>
                <input
                  type="date"
                  autoFocus
                  value={templateStart}
                  onChange={e => {
                    setTemplateStart(e.target.value);
                    if (!templateAdd.multiDay) setTemplateEnd(e.target.value);
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !templateAdd.multiDay) doTemplateSave(); }}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              {templateAdd.multiDay && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">End Date *</label>
                  <input
                    type="date"
                    value={templateEnd}
                    min={templateStart}
                    onChange={e => setTemplateEnd(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') doTemplateSave(); }}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                onClick={() => setTemplateAdd(null)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={doTemplateSave}
                disabled={!templateStart || templateSaving}
                className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-medium disabled:opacity-50"
              >
                {templateSaving ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL MODAL (add with more options / edit) ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">
                {modal.mode === 'add' ? 'Add Event' : 'Edit Event'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Dasara Holiday, PA1 Exam, PTM"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Event Type *</label>
                <div className="flex gap-2 flex-wrap">
                  {EVENT_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setForm(f => ({ ...f, event_type: t.value }))}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                        form.event_type === t.value
                          ? t.color + ' ring-2 ring-offset-1 ' + t.ring
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                      {t.label}
                    </button>
                  ))}
                </div>
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
                onClick={modalSave}
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
  ev, onEdit, onDelete, readOnly = false,
}: {
  ev: CalendarEvent;
  onEdit: (ev: CalendarEvent) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}) {
  const t = TYPE_MAP[ev.event_type];
  const start = ev.start_date.slice(0, 10);
  const end   = ev.end_date.slice(0, 10);
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const dateLabel = start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t?.dot ?? 'bg-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{ev.title}</p>
        <p className="text-xs text-gray-500">
          {dateLabel}
          {ev.applies_to === 'grade' && ev.grade != null && (
            <span className="ml-2 text-indigo-500">Grade {ev.grade}</span>
          )}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${t?.color ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
        {t?.label ?? ev.event_type}
      </span>
      {!readOnly && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(ev)}
            className="text-xs text-gray-500 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-indigo-50"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(ev.id)}
            className="text-xs text-gray-500 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
