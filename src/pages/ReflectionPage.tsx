import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAPI } from '../utils/api';
const API = getAPI();

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

interface Props { user: any; readOnly?: boolean; }

export default function ReflectionPage({ user, readOnly = false }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const [month, setMonth] = useState(thisMonth);
  const [reflections, setReflections] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (readOnly) return;
    fetchReflections();
  }, [month, user?.id]);

  async function fetchReflections() {
    if (!user?.id) return;
    try {
      const r = await axios.get(`${API}/lesson-plans/reflections/${user.id}`, { params: { month } });
      setReflections(r.data);
    } catch { /**/ }
  }

  function openDate(dateStr: string) {
    const existing = reflections.find(r => r.date?.slice(0, 10) === dateStr);
    const d = new Date(dateStr);
    const dayName = DAYS[d.getDay()];
    setSelected({ date: dateStr, day_of_week: dayName });
    setForm(existing ? { ...existing } : {
      teacher_id: user.id, date: dateStr, day_of_week: dayName,
      what_went_well: '', challenges_faced: '', improvements_for_tomorrow: '', miscellaneous_notes: '', notes: '',
    });
    setSaved(false);
  }

  function f(key: string) {
    return (e: any) => { setForm((p: any) => ({ ...p, [key]: e.target.value })); setSaved(false); };
  }

  async function save() {
    setSaving(true);
    try {
      await axios.post(`${API}/lesson-plans/reflections/save`, { ...form, teacher_id: user.id });
      await fetchReflections();
      setSaved(true);
    } finally { setSaving(false); }
  }

  // Generate calendar days for the month
  const [year, mon] = month.split('-').map(Number);
  const firstDay = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();
  const calCells: (string | null)[] = [...Array(firstDay).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) {
    calCells.push(`${month}-${String(d).padStart(2, '0')}`);
  }
  while (calCells.length % 7 !== 0) calCells.push(null);

  const reflectedDates = new Set(reflections.map(r => r.date?.slice(0, 10)));

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800">Daily Reflection Diary</h2>
          <p className="text-xs text-gray-500 mt-0.5">Click a date to view or write your reflection for that day.</p>
        </div>
        <input type="month" className="border rounded px-2 py-1 text-xs" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b text-center text-xs font-semibold text-gray-500 py-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {calCells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} className="border-b border-r h-14 bg-gray-50" />;
            const day = parseInt(dateStr.split('-')[2]);
            const isToday = dateStr === today;
            const hasEntry = reflectedDates.has(dateStr);
            const isSelected = selected?.date === dateStr;
            const isWeekend = [0, 6].includes(i % 7);
            return (
              <button key={dateStr} onClick={() => !readOnly && openDate(dateStr)}
                className={`border-b border-r h-14 flex flex-col items-center justify-center text-xs transition-all
                  ${isSelected ? 'bg-indigo-100 border-indigo-300' : isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-50' : 'hover:bg-gray-50'}
                  ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                <span className={`font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</span>
                {hasEntry && <span className="w-2 h-2 rounded-full bg-green-500 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-400">Green dot = reflection written</p>

      {/* Form */}
      {selected && !readOnly && (
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm">
              {selected.day_of_week}, {selected.date}
            </h3>
            <div className="flex items-center gap-2">
              {saved && <span className="text-xs text-green-600 font-medium">Saved!</span>}
              <button onClick={save} disabled={saving}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {([
            ['what_went_well',            '1. What Went Well Today'],
            ['challenges_faced',          '2. Challenges Faced'],
            ['improvements_for_tomorrow', '3. Improvements for Tomorrow'],
            ['miscellaneous_notes',       'Miscellaneous Notes'],
            ['notes',                     'Notes'],
          ] as [string, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <textarea rows={3} className="w-full border rounded px-2 py-1 text-xs"
                value={form[key] || ''} onChange={f(key)} placeholder={`Write here…`} />
            </div>
          ))}
        </div>
      )}

      {/* Past entries list */}
      {reflections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-600">This Month's Reflections ({reflections.length})</h3>
          {reflections.map(r => (
            <div key={r.id} onClick={() => !readOnly && openDate(r.date?.slice(0, 10))}
              className={`bg-white border rounded-lg p-3 text-xs space-y-1 ${!readOnly ? 'cursor-pointer hover:border-indigo-300' : ''} ${selected?.date === r.date?.slice(0, 10) ? 'border-indigo-400 bg-indigo-50' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">{r.day_of_week}, {r.date?.slice(0, 10)}</span>
              </div>
              {r.what_went_well && <p className="text-gray-600 line-clamp-1"><span className="font-medium">Went well:</span> {r.what_went_well}</p>}
              {r.challenges_faced && <p className="text-gray-600 line-clamp-1"><span className="font-medium">Challenges:</span> {r.challenges_faced}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
