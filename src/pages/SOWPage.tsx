import { useState, useEffect, useRef, useCallback } from "react";
import { currentAcademicYear } from "../utils/academicYear";
import AcademicYearSelect from "../components/AcademicYearSelect";

import { getAPI } from '../utils/api';
const API = getAPI();

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COMMON_SUBJECTS = ["Mathematics", "English", "Kannada", "Science", "Social Studies", "Hindi", "Telugu", "EVS", "Computer Science", "Physical Education"];
const GRADES = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];

// ── helpers ──────────────────────────────────────────────────────────────────

function getAcademicMonths(ay: string) {
  const yr = parseInt(ay.split("-")[0]);
  return [
    { year: yr,     month: 5,  label: "Jun" },
    { year: yr,     month: 6,  label: "Jul" },
    { year: yr,     month: 7,  label: "Aug" },
    { year: yr,     month: 8,  label: "Sep" },
    { year: yr,     month: 9,  label: "Oct" },
    { year: yr,     month: 10, label: "Nov" },
    { year: yr,     month: 11, label: "Dec" },
    { year: yr + 1, month: 0,  label: "Jan" },
    { year: yr + 1, month: 1,  label: "Feb" },
    { year: yr + 1, month: 2,  label: "Mar" },
  ];
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getEventsForDate(date: Date, events: any[]): any[] {
  const d = fmtDate(date);
  return events.filter(e => {
    const s = (e.start_date || "").substring(0, 10);
    const en = (e.end_date || e.start_date || "").substring(0, 10);
    return s <= d && d <= en;
  });
}

function defaultMonthIdx(ay: string) {
  const months = getAcademicMonths(ay);
  const now = new Date();
  const idx = months.findIndex(m => m.year === now.getFullYear() && m.month === now.getMonth());
  return idx >= 0 ? idx : 0;
}

function isSOWGrade(grade: string) {
  const n = parseInt(grade.replace(/\D/g, ""));
  return n >= 1 && n <= 10;
}

function topLabel(block: any, track: string) {
  if (track === "exceed") return `Block ${block.block_number}`;
  if (block.item_type === "unit") return `Unit ${block.block_number}`;
  return `Ch ${block.block_number}`;
}

function subLabel(lp: any, track: string) {
  if (track === "exceed") return `LP ${lp.lp_number}`;
  return `Ch ${lp.lp_number}`;
}

function buildDropdownOptions(curriculum: any) {
  if (!curriculum) return [];
  const opts: { value: string; label: string }[] = [];
  for (const b of curriculum.blocks) {
    if (b.lps.length > 0) {
      for (const lp of b.lps) {
        const bLabel = b.block_name ? `${topLabel(b, curriculum.track)}: ${b.block_name}` : topLabel(b, curriculum.track);
        const lLabel = lp.lp_name ? `${subLabel(lp, curriculum.track)}: ${lp.lp_name}` : subLabel(lp, curriculum.track);
        opts.push({ value: `lp:${b.block_number}:${lp.lp_number}`, label: `${bLabel} → ${lLabel}` });
      }
    } else {
      const bLabel = b.block_name ? `${topLabel(b, curriculum.track)}: ${b.block_name}` : topLabel(b, curriculum.track);
      opts.push({ value: `block:${b.block_number}`, label: bLabel });
    }
  }
  opts.push(
    { value: "activity",   label: "Activity" },
    { value: "assessment", label: "Block Assessment" },
    { value: "revision",   label: "Revision" },
    { value: "other",      label: "Other" },
  );
  return opts;
}

function entryToValue(entry: any): string {
  if (!entry) return "";
  if (entry.entry_type === "lp")    return `lp:${entry.block_number}:${entry.lp_number}`;
  if (entry.entry_type === "block") return `block:${entry.block_number}`;
  return entry.entry_type;
}

function valueToFields(value: string): { entry_type: string; block_number?: number; lp_number?: number } {
  if (value.startsWith("lp:")) {
    const [, bn, ln] = value.split(":");
    return { entry_type: "lp", block_number: +bn, lp_number: +ln };
  }
  if (value.startsWith("block:")) {
    return { entry_type: "block", block_number: +value.split(":")[1] };
  }
  return { entry_type: value };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    needs_revision: "bg-yellow-100 text-yellow-700",
  };
  const labels: Record<string, string> = {
    draft: "Draft", submitted: "Submitted", approved: "Approved ✓", needs_revision: "Needs Revision",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── AutoInput (inline editable, saves on blur) ────────────────────────────────

function AutoInput({ id, value, disabled, onSave, placeholder, className = "" }: {
  id: string; value: string; disabled: boolean;
  onSave: (id: string, val: string) => void;
  placeholder?: string; className?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <input
      type="text" value={local} disabled={disabled} placeholder={placeholder}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onSave(id, local); }}
      className={`w-full px-2 py-1 text-sm border border-transparent rounded focus:outline-none focus:border-indigo-300 bg-transparent disabled:text-gray-700 disabled:cursor-default ${className}`}
    />
  );
}

// ── CurriculumGrid ────────────────────────────────────────────────────────────

function CurriculumGrid({ curriculum, canEdit, onSaveBlock, onSaveLp, onAddBlock, onDeleteBlock, onAddLp, onDeleteLp }: {
  curriculum: any; canEdit: boolean;
  onSaveBlock: (id: string, val: string) => void;
  onSaveLp: (id: string, val: string) => void;
  onAddBlock: (itemType?: string) => void;
  onDeleteBlock: (id: string) => void;
  onAddLp: (blockId: string) => void;
  onDeleteLp: (blockId: string, lpId: string) => void;
}) {
  const { track, blocks } = curriculum;

  if (track === "exceed") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-indigo-50 text-xs text-gray-500">
              <th className="border border-gray-200 px-2 py-2 w-8 text-center">#</th>
              <th className="border border-gray-200 px-2 py-2 text-left w-44">Block Name</th>
              <th className="border border-gray-200 px-2 py-2 text-left">LP 1</th>
              <th className="border border-gray-200 px-2 py-2 text-left">LP 2</th>
              <th className="border border-gray-200 px-2 py-2 text-left">LP 3</th>
              <th className="border border-gray-200 px-2 py-2 text-left">LP 4</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b: any) => {
              const lps = [...b.lps].sort((a: any, z: any) => a.lp_number - z.lp_number);
              return (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-1 text-center text-xs text-gray-400">{b.block_number}</td>
                  <td className="border border-gray-200 px-1 py-1">
                    <AutoInput id={b.id} value={b.block_name} disabled={!canEdit} onSave={onSaveBlock} placeholder="Block name…" />
                  </td>
                  {lps.map((lp: any) => (
                    <td key={lp.id} className="border border-gray-200 px-1 py-1">
                      <AutoInput id={lp.id} value={lp.lp_name} disabled={!canEdit} onSave={onSaveLp} placeholder="LP name…" />
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - lps.length) }).map((_, i) => (
                    <td key={i} className="border border-gray-200" />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((b: any) => {
        const lps = [...b.lps].sort((a: any, z: any) => a.lp_number - z.lp_number);
        const isUnit = b.item_type === "unit";
        return (
          <div key={b.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-indigo-600 w-16 flex-shrink-0">
                {isUnit ? `Unit ${b.block_number}` : `Ch ${b.block_number}`}
              </span>
              <AutoInput id={b.id} value={b.block_name} disabled={!canEdit} onSave={onSaveBlock}
                placeholder={isUnit ? "Unit name…" : "Chapter name…"} className="flex-1" />
              {canEdit && (
                <button onClick={() => onDeleteBlock(b.id)} className="text-red-400 hover:text-red-600 text-xs px-1 flex-shrink-0">✕</button>
              )}
            </div>
            {lps.length > 0 && (
              <div className="ml-16 space-y-1 mt-1">
                {lps.map((lp: any) => (
                  <div key={lp.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-12 flex-shrink-0">Ch {lp.lp_number}</span>
                    <AutoInput id={lp.id} value={lp.lp_name} disabled={!canEdit} onSave={onSaveLp}
                      placeholder="Sub-chapter name…" className="flex-1" />
                    {canEdit && lps.length > 1 && (
                      <button onClick={() => onDeleteLp(b.id, lp.id)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button onClick={() => onAddLp(b.id)} className="text-xs text-indigo-500 hover:text-indigo-700 mt-1">+ Add sub-chapter</button>
                )}
              </div>
            )}
            {lps.length === 0 && canEdit && (
              <button onClick={() => onAddLp(b.id)} className="ml-16 text-xs text-indigo-500 hover:text-indigo-700 mt-1">+ Add sub-chapter</button>
            )}
          </div>
        );
      })}
      {canEdit && (
        <div className="flex gap-2">
          <button onClick={onAddBlock} className="flex-1 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition">
            + Add Chapter
          </button>
          <button
            onClick={() => onAddBlock("unit")}
            className="flex-1 py-2 border-2 border-dashed border-purple-200 rounded-lg text-sm text-purple-500 hover:border-purple-400 hover:text-purple-600 transition"
          >
            + Add Unit
          </button>
        </div>
      )}
    </div>
  );
}

// ── Day planner ───────────────────────────────────────────────────────────────

function DayPlanner({ teacherId, academicYear, grade, section, subject, curriculum, calendarEvents }: {
  teacherId: string; academicYear: string; grade: string; section: string; subject: string;
  curriculum: any; calendarEvents: any[];
}) {
  const months = getAcademicMonths(academicYear);
  const [monthIdx, setMonthIdx] = useState(() => defaultMonthIdx(academicYear));
  const [scheduleMap, setScheduleMap] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const dropdownOptions = buildDropdownOptions(curriculum);
  const selMonth = months[monthIdx];

  const fetchMonth = useCallback(async () => {
    if (!selMonth) return;
    const mk = monthKey(selMonth.year, selMonth.month);
    const res = await fetch(
      `${API}/sow/schedule?teacher_id=${teacherId}&academic_year=${encodeURIComponent(academicYear)}&grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&subject=${encodeURIComponent(subject)}&month=${mk}`
    );
    const data = await res.json();
    const map: Record<string, any> = {};
    for (const e of data) map[e.entry_date.substring(0, 10)] = e;
    setScheduleMap(map);
  }, [selMonth?.year, selMonth?.month, teacherId, academicYear, grade, section, subject]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  async function handleSelect(date: Date, value: string) {
    const dk = fmtDate(date);
    setSaving(s => ({ ...s, [dk]: true }));
    try {
      if (!value) {
        const existing = scheduleMap[dk];
        if (existing?.id) {
          await fetch(`${API}/sow/schedule/${existing.id}`, { method: "DELETE" });
          setScheduleMap(m => { const n = { ...m }; delete n[dk]; return n; });
        }
        return;
      }
      const fields = valueToFields(value);
      const res = await fetch(`${API}/sow/schedule/save`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: teacherId, academic_year: academicYear, grade, section, subject,
          entry_date: dk, done: scheduleMap[dk]?.done ?? false,
          notes: scheduleMap[dk]?.notes ?? null,
          ...fields,
        }),
      });
      const saved = await res.json();
      setScheduleMap(m => ({ ...m, [dk]: saved }));
    } finally {
      setSaving(s => ({ ...s, [dk]: false }));
    }
  }

  async function handleDone(date: Date, done: boolean) {
    const dk = fmtDate(date);
    const existing = scheduleMap[dk];
    if (!existing?.id) return;
    setScheduleMap(m => ({ ...m, [dk]: { ...m[dk], done } }));
    await fetch(`${API}/sow/schedule/done`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: existing.id, done }),
    });
  }

  async function handleNotes(date: Date, notes: string) {
    const dk = fmtDate(date);
    const existing = scheduleMap[dk];
    if (!existing?.id) return;
    await fetch(`${API}/sow/schedule/save`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...existing, entry_date: dk, notes }),
    });
    setScheduleMap(m => ({ ...m, [dk]: { ...m[dk], notes } }));
  }

  const days = selMonth ? getDaysInMonth(selMonth.year, selMonth.month) : [];

  return (
    <div>
      {/* Month tabs */}
      <div className="flex overflow-x-auto gap-1 pb-1 mb-3">
        {months.map((m, i) => (
          <button key={i} onClick={() => setMonthIdx(i)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              i === monthIdx ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Day table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="border border-gray-200 px-3 py-2 text-left w-24">Date</th>
              <th className="border border-gray-200 px-2 py-2 text-left w-10">Day</th>
              <th className="border border-gray-200 px-2 py-2 text-left w-16">Event</th>
              <th className="border border-gray-200 px-2 py-2 text-left">What I'm teaching</th>
              <th className="border border-gray-200 px-2 py-2 text-left w-32">Notes</th>
              <th className="border border-gray-200 px-2 py-2 text-center w-14">Done</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const dk = fmtDate(day);
              const dayEvents = getEventsForDate(day, calendarEvents);
              const entry = scheduleMap[dk];
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const hasEvent = dayEvents.length > 0;
              // Only lock days with calendar events — weekends may be working days
              const rowBg = hasEvent ? "bg-red-50" : isWeekend ? "bg-gray-50" : "bg-white";

              return (
                <tr key={dk} className={rowBg}>
                  <td className="border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 whitespace-nowrap">
                    {day.getDate()} {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][day.getMonth()]}
                  </td>
                  <td className={`border border-gray-200 px-2 py-1.5 text-xs font-medium ${isWeekend ? "text-orange-400" : "text-gray-500"}`}>
                    {DAYS[day.getDay()]}
                  </td>
                  <td className="border border-gray-200 px-2 py-1.5 text-xs">
                    {hasEvent && (
                      <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs truncate max-w-[4.5rem]" title={dayEvents.map(e => e.title).join(", ")}>
                        {dayEvents[0].title.length > 9 ? dayEvents[0].title.substring(0, 9) + "…" : dayEvents[0].title}
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-200 px-1 py-1">
                    {hasEvent ? (
                      <span className="px-2 text-xs text-red-400 italic">Holiday / Event — no teaching</span>
                    ) : (
                      <select
                        value={entryToValue(entry)}
                        disabled={saving[dk]}
                        onChange={e => handleSelect(day, e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:border-indigo-300 max-w-xs"
                      >
                        <option value="">— select —</option>
                        {dropdownOptions.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="border border-gray-200 px-1 py-1">
                    {!hasEvent && entry?.id && (
                      <NotesInput value={entry.notes ?? ""} onBlur={v => handleNotes(day, v)} />
                    )}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-center">
                    {!hasEvent && entry?.id && (
                      <input type="checkbox" checked={!!entry.done}
                        onChange={e => handleDone(day, e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotesInput({ value, onBlur }: { value: string; onBlur: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <input type="text" value={local} onChange={e => setLocal(e.target.value)}
      onBlur={() => onBlur(local)}
      placeholder="Notes…"
      className="w-full px-2 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-300" />
  );
}

// ── Teacher SOW (exported for teacher dashboard) ──────────────────────────────

export function TeacherSOW({ user, mappings, academicYear }: { user: any; mappings: any; academicYear: string }) {
  const subjects = (mappings?.mappings ?? []).filter((m: any) => isSOWGrade(m.grade));
  const [selIdx, setSelIdx] = useState(0);
  const [curriculum, setCurriculum] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRef, setShowRef] = useState(false);

  const sel = subjects[selIdx];

  useEffect(() => {
    fetch(`${API}/calendar?academic_year=${encodeURIComponent(academicYear)}`)
      .then(r => r.json()).then(d => setCalendarEvents(Array.isArray(d) ? d : [])).catch(() => {});
  }, [academicYear]);

  useEffect(() => {
    if (!sel) return;
    setCurriculum(null);
    fetch(`${API}/sow/curriculum?academic_year=${encodeURIComponent(academicYear)}&grade=${encodeURIComponent(sel.grade)}&subject=${encodeURIComponent(sel.subject)}`)
      .then(r => r.json()).then(setCurriculum).catch(() => {});
    // fetch status
    fetch(`${API}/sow/teacher-schedule?teacher_id=${user.id}&academic_year=${encodeURIComponent(academicYear)}&grade=${encodeURIComponent(sel.grade)}&section=${encodeURIComponent(sel.section)}&subject=${encodeURIComponent(sel.subject)}`)
      .then(r => r.json()).then(d => setStatus(d?.status ?? null)).catch(() => {});
  }, [sel?.grade, sel?.section, sel?.subject, academicYear, user?.id]);

  async function handleSubmit() {
    if (!sel) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/sow/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_id: user.id, academic_year: academicYear, grade: sel.grade, section: sel.section, subject: sel.subject }),
      });
      setStatus((s: any) => ({ ...s, status: "submitted" }));
    } finally { setSubmitting(false); }
  }

  if (subjects.length === 0) return (
    <div className="p-6 text-center text-gray-500 text-sm">No SOW-eligible subjects assigned (Grades 1–10).</div>
  );

  const sowStatus = status?.status ?? "draft";

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">Scheme of Work</h2>
        <div className="flex items-center gap-3">
          <StatusBadge status={sowStatus} />
          {(sowStatus === "draft" || sowStatus === "needs_revision") && (
            <button onClick={handleSubmit} disabled={submitting}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit for Review"}
            </button>
          )}
        </div>
      </div>

      {/* Subject tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {subjects.map((s: any, i: number) => (
          <button key={i} onClick={() => { setSelIdx(i); setCurriculum(null); setStatus(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              i === selIdx ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-200 hover:border-indigo-400"
            }`}>
            {s.subject}
            <span className="text-xs ml-1 opacity-70">{s.grade} {s.section}</span>
          </button>
        ))}
      </div>

      {!curriculum && <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>}

      {curriculum && sel && (
        <>
          <DayPlanner
            teacherId={user.id} academicYear={academicYear}
            grade={sel.grade} section={sel.section} subject={sel.subject}
            curriculum={curriculum} calendarEvents={calendarEvents}
          />

          {/* Collapsible curriculum reference */}
          <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setShowRef(r => !r)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100">
              <span>📚 Curriculum Reference — {sel.subject} {sel.grade}</span>
              <span className="text-xs text-gray-400">{showRef ? "▲ Hide" : "▼ Show"}</span>
            </button>
            {showRef && (
              <div className="p-4">
                <CurriculumGrid
                  curriculum={curriculum} canEdit={false}
                  onSaveBlock={() => {}} onSaveLp={() => {}}
                  onAddBlock={() => {}} onDeleteBlock={() => {}}
                  onAddLp={() => {}} onDeleteLp={() => {}}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Admin Curriculum Setup tab ────────────────────────────────────────────────

function CurriculumSetupTab({ academicYear }: { academicYear: string }) {
  const [grade, setGrade] = useState("Grade 1");
  const [subject, setSubject] = useState("Mathematics");
  const [curriculum, setCurriculum] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCurriculum = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/sow/curriculum?academic_year=${encodeURIComponent(academicYear)}&grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}`);
      setCurriculum(await res.json());
    } finally { setLoading(false); }
  }, [academicYear, grade, subject]);

  useEffect(() => { setCurriculum(null); loadCurriculum(); }, [loadCurriculum]);

  async function saveBlock(id: string, block_name: string) {
    await fetch(`${API}/sow/curriculum/block/save`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, block_name }) });
    setCurriculum((c: any) => c ? { ...c, blocks: c.blocks.map((b: any) => b.id === id ? { ...b, block_name } : b) } : c);
  }

  async function saveLp(id: string, lp_name: string) {
    await fetch(`${API}/sow/curriculum/lp/save`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, lp_name }) });
    setCurriculum((c: any) => {
      if (!c) return c;
      return { ...c, blocks: c.blocks.map((b: any) => ({ ...b, lps: b.lps.map((l: any) => l.id === id ? { ...l, lp_name } : l) })) };
    });
  }

  async function addBlock(itemType = "chapter") {
    const res = await fetch(`${API}/sow/curriculum/block/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ academic_year: academicYear, grade, subject, item_type: itemType }) });
    const newBlock = await res.json();
    setCurriculum((c: any) => c ? { ...c, blocks: [...c.blocks, newBlock] } : c);
  }

  async function deleteBlock(id: string) {
    if (!confirm("Delete this chapter/unit and all its sub-chapters?")) return;
    await fetch(`${API}/sow/curriculum/block/${id}`, { method: "DELETE" });
    setCurriculum((c: any) => c ? { ...c, blocks: c.blocks.filter((b: any) => b.id !== id) } : c);
  }

  async function addLp(block_id: string) {
    const res = await fetch(`${API}/sow/curriculum/lp/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ block_id }) });
    const newLp = await res.json();
    setCurriculum((c: any) => c ? { ...c, blocks: c.blocks.map((b: any) => b.id === block_id ? { ...b, lps: [...b.lps, newLp] } : b) } : c);
  }

  async function deleteLp(blockId: string, lpId: string) {
    await fetch(`${API}/sow/curriculum/lp/${lpId}`, { method: "DELETE" });
    setCurriculum((c: any) => c ? { ...c, blocks: c.blocks.map((b: any) => b.id === blockId ? { ...b, lps: b.lps.filter((l: any) => l.id !== lpId) } : b) } : c);
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("Parsing…");
    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim());
        const obj: any = {};
        headers.forEach((h, i) => obj[h] = vals[i] ?? "");
        return obj;
      }).filter(r => r.grade && r.subject && r.type && r.name);

      const res = await fetch(`${API}/sow/curriculum/import`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academic_year: academicYear, rows }),
      });
      const result = await res.json();
      setImportMsg(`✓ Imported ${result.count} items`);
      await loadCurriculum();
    } catch (err) {
      setImportMsg("✗ Import failed — check CSV format");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      {/* Grade + Subject picker */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Grade</label>
          <select value={grade} onChange={e => setGrade(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Subject</label>
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48">
            {COMMON_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input type="file" accept=".csv" ref={fileRef} onChange={handleCSVImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 border border-indigo-300 text-indigo-600 text-sm rounded-lg hover:bg-indigo-50">
            📥 Import CSV
          </button>
          {importMsg && <span className={`text-xs ${importMsg.startsWith("✓") ? "text-green-600" : importMsg.startsWith("✗") ? "text-red-500" : "text-gray-400"}`}>{importMsg}</span>}
        </div>
      </div>

      {/* CSV format hint */}
      <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        CSV columns: <strong>Grade, Subject, Type, Number, Name, Parent</strong> — Type values: Block / LP / Chapter / Unit — Parent is the parent item's Number (leave empty for top-level)
      </div>

      {loading && <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>}
      {!loading && curriculum && (
        <CurriculumGrid
          curriculum={curriculum} canEdit
          onSaveBlock={saveBlock} onSaveLp={saveLp}
          onAddBlock={addBlock} onDeleteBlock={deleteBlock}
          onAddLp={addLp} onDeleteLp={deleteLp}
        />
      )}
    </div>
  );
}

// ── Admin Teacher Plans tab ───────────────────────────────────────────────────

// ── helpers for TeacherPlansTab ──────────────────────────────────────────────

function worstStatus(statuses: string[]): string {
  if (statuses.includes("needs_revision")) return "needs_revision";
  if (statuses.includes("draft"))          return "draft";
  if (statuses.includes("submitted"))      return "submitted";
  if (statuses.includes("approved"))       return "approved";
  return "draft";
}

function DonePill({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-yellow-400" : "bg-gray-300";
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{done}/{total}</span>
    </div>
  );
}

// ── Detail drawer (shared) ────────────────────────────────────────────────────

function SubjectDetailDrawer({ selected, detail, academicYear, onClose, onReviewSaved, user }: {
  selected: any; detail: any; academicYear: string;
  onClose: () => void; onReviewSaved: () => void; user: any;
}) {
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [saving, setSaving] = useState(false);

  async function saveReview() {
    if (!detail?.status?.id) return;
    setSaving(true);
    try {
      await fetch(`${API}/sow/review/${detail.status.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewStatus, reviewed_by: String(user.id) }),
      });
      onReviewSaved();
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <p className="font-semibold text-gray-800">{selected.teacher_name} — {selected.subject}</p>
            <p className="text-xs text-gray-500">{selected.grade} {selected.section} · {academicYear}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {!detail && <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>}
          {detail && (
            <>
              {detail.schedule.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No schedule entries yet.</p>
              ) : (
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="py-1 text-left">Date</th>
                      <th className="py-1 text-left">What was planned</th>
                      <th className="py-1 text-center w-10">Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.schedule.map((e: any) => (
                      <tr key={e.id} className="border-b border-gray-50">
                        <td className="py-1.5 text-xs text-gray-600 whitespace-nowrap">{e.entry_date?.substring(0, 10)}</td>
                        <td className="py-1.5 text-xs">
                          {e.entry_type === "lp" ? `Block ${e.block_number} LP ${e.lp_number}` : e.entry_type}
                          {e.notes && <span className="text-gray-400 ml-1">· {e.notes}</span>}
                        </td>
                        <td className="py-1.5 text-center text-green-600">{e.done ? "✓" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {detail.status && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Review decision</p>
                  <div className="flex items-center gap-3">
                    <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1.5 text-sm">
                      <option value="approved">Approve ✓</option>
                      <option value="needs_revision">Needs Revision ⚠</option>
                    </select>
                    <button onClick={saveReview} disabled={saving}
                      className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50">
                      {saving ? "Saving…" : "Save Review"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main TeacherPlansTab ──────────────────────────────────────────────────────

function TeacherPlansTab({ academicYear, user }: { academicYear: string; user: any }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"teacher" | "grade">("teacher");
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch(`${API}/sow/all?academic_year=${encodeURIComponent(academicYear)}`).then(r => r.json());
      setRows(Array.isArray(d) ? d : []);
    } finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { reload(); }, [reload]);

  async function openDetail(row: any) {
    setSelected(row); setDetail(null);
    const d = await fetch(`${API}/sow/teacher-schedule?teacher_id=${row.teacher_id}&academic_year=${encodeURIComponent(academicYear)}&grade=${encodeURIComponent(row.grade)}&section=${encodeURIComponent(row.section)}&subject=${encodeURIComponent(row.subject)}`).then(r => r.json());
    setDetail(d);
  }

  function toggleTeacher(id: string) {
    setExpandedTeachers(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleGrade(g: string) {
    setExpandedGrades(s => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n; });
  }

  if (loading) return <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>;

  // ── Summary cards ──────────────────────────────────────────────────────────

  const teacherIds = [...new Set(rows.map(r => r.teacher_id))];
  const totalTeachers = teacherIds.length;

  // Per-teacher aggregate
  const byTeacher = new Map<string, { name: string; rows: any[] }>();
  for (const r of rows) {
    if (!byTeacher.has(r.teacher_id)) byTeacher.set(r.teacher_id, { name: r.teacher_name ?? r.teacher_id, rows: [] });
    byTeacher.get(r.teacher_id)!.rows.push(r);
  }

  const teacherSummaries = [...byTeacher.entries()].map(([tid, { name, rows: trows }]) => {
    const totalE = trows.reduce((s, r) => s + (r.total_entries ?? 0), 0);
    const doneE  = trows.reduce((s, r) => s + (r.done_entries  ?? 0), 0);
    const overallStatus = worstStatus(trows.map(r => r.status ?? "draft"));
    return { tid, name, trows, totalE, doneE, overallStatus };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const approvedCount     = teacherSummaries.filter(t => t.overallStatus === "approved").length;
  const submittedCount    = teacherSummaries.filter(t => t.overallStatus === "submitted").length;
  const needsRevCount     = teacherSummaries.filter(t => t.overallStatus === "needs_revision").length;
  const draftCount        = teacherSummaries.filter(t => t.overallStatus === "draft").length;

  // Per-grade aggregate
  const gradeOrder = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];
  const byGrade = new Map<string, any[]>();
  for (const r of rows) {
    if (!byGrade.has(r.grade)) byGrade.set(r.grade, []);
    byGrade.get(r.grade)!.push(r);
  }
  const gradeSummaries = [...byGrade.entries()]
    .sort(([a], [b]) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));

  if (rows.length === 0) return (
    <div className="text-center py-16 text-gray-400 text-sm">
      <p className="text-2xl mb-2">📋</p>
      No SOW entries for {academicYear} yet. Teachers need to start entering their plans.
    </div>
  );

  return (
    <>
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Teachers", value: totalTeachers, color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
          { label: "Approved",       value: approvedCount,  color: "bg-green-50 border-green-200 text-green-700" },
          { label: "Submitted",      value: submittedCount, color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Needs Revision", value: needsRevCount,  color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl px-4 py-3 ${c.color}`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Draft count note */}
      {draftCount > 0 && (
        <p className="text-xs text-gray-400 mb-4">{draftCount} teacher{draftCount > 1 ? "s" : ""} have not yet submitted their SOW.</p>
      )}

      {/* ── View toggle ── */}
      <div className="flex gap-2 mb-4">
        {(["teacher", "grade"] as const).map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium border transition ${viewMode === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
            {m === "teacher" ? "👤 By Teacher" : "🏫 By Grade"}
          </button>
        ))}
      </div>

      {/* ── BY TEACHER view ── */}
      {viewMode === "teacher" && (
        <div className="space-y-2">
          {teacherSummaries.map(({ tid, name, trows, totalE, doneE, overallStatus }) => {
            const isOpen = expandedTeachers.has(tid);
            // Group this teacher's rows by grade
            const gradeMap = new Map<string, any[]>();
            for (const r of trows) {
              if (!gradeMap.has(r.grade)) gradeMap.set(r.grade, []);
              gradeMap.get(r.grade)!.push(r);
            }

            return (
              <div key={tid} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Teacher header row */}
                <button onClick={() => toggleTeacher(tid)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-left transition">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {name[0]?.toUpperCase()}
                  </span>
                  <span className="font-medium text-gray-800 flex-1 text-sm">{name}</span>
                  <span className="text-xs text-gray-400 mr-2">{trows.length} subject{trows.length > 1 ? "s" : ""}</span>
                  <div className="mr-3 w-28">
                    <DonePill done={doneE} total={totalE} />
                  </div>
                  <StatusBadge status={overallStatus} />
                  <span className="ml-2 text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                </button>

                {/* Expanded subject rows */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {[...gradeMap.entries()]
                      .sort(([a], [b]) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b))
                      .map(([grade, grows]) => (
                      <div key={grade}>
                        <p className="px-5 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">{grade}</p>
                        {grows.map((r, i) => (
                          <div key={i} className="flex items-center gap-3 px-5 py-2 border-t border-gray-50 hover:bg-indigo-50 group">
                            <span className="text-sm text-gray-700 flex-1">{r.subject}</span>
                            <span className="text-xs text-gray-400">{r.section}</span>
                            <div className="w-28">
                              <DonePill done={r.done_entries ?? 0} total={r.total_entries ?? 0} />
                            </div>
                            <StatusBadge status={r.status ?? "draft"} />
                            <button onClick={() => openDetail(r)}
                              className="ml-2 text-xs px-2 py-1 border border-indigo-200 text-indigo-600 rounded opacity-0 group-hover:opacity-100 transition hover:bg-indigo-50">
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── BY GRADE view ── */}
      {viewMode === "grade" && (
        <div className="space-y-2">
          {gradeSummaries.map(([grade, grows]) => {
            const isOpen = expandedGrades.has(grade);
            const totalE = grows.reduce((s, r) => s + (r.total_entries ?? 0), 0);
            const doneE  = grows.reduce((s, r) => s + (r.done_entries  ?? 0), 0);
            const gradeStatus = worstStatus(grows.map(r => r.status ?? "draft"));
            // Group by subject
            const subjectMap = new Map<string, any[]>();
            for (const r of grows) {
              if (!subjectMap.has(r.subject)) subjectMap.set(r.subject, []);
              subjectMap.get(r.subject)!.push(r);
            }

            return (
              <div key={grade} className="border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => toggleGrade(grade)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-left transition">
                  <span className="font-semibold text-gray-800 flex-1 text-sm">{grade}</span>
                  <span className="text-xs text-gray-400 mr-2">{subjectMap.size} subjects · {grows.length} entries</span>
                  <div className="mr-3 w-28">
                    <DonePill done={doneE} total={totalE} />
                  </div>
                  <StatusBadge status={gradeStatus} />
                  <span className="ml-2 text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100">
                    {[...subjectMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([subject, srows]) => {
                      const sTotal = srows.reduce((s, r) => s + (r.total_entries ?? 0), 0);
                      const sDone  = srows.reduce((s, r) => s + (r.done_entries  ?? 0), 0);
                      return (
                        <div key={subject}>
                          <p className="px-5 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 flex items-center gap-2">
                            <span className="flex-1">{subject}</span>
                            <DonePill done={sDone} total={sTotal} />
                          </p>
                          {srows.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-2 border-t border-gray-50 hover:bg-indigo-50 group">
                              <span className="text-sm text-gray-700 flex-1">{r.teacher_name ?? r.teacher_id}</span>
                              <span className="text-xs text-gray-400">{r.section}</span>
                              <DonePill done={r.done_entries ?? 0} total={r.total_entries ?? 0} />
                              <StatusBadge status={r.status ?? "draft"} />
                              <button onClick={() => openDetail(r)}
                                className="ml-1 text-xs px-2 py-1 border border-indigo-200 text-indigo-600 rounded opacity-0 group-hover:opacity-100 transition hover:bg-indigo-50">
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail drawer ── */}
      {selected && (
        <SubjectDetailDrawer
          selected={selected} detail={detail} academicYear={academicYear}
          onClose={() => { setSelected(null); setDetail(null); }}
          onReviewSaved={reload} user={user}
        />
      )}
    </>
  );
}

// ── Default export: Admin / AHM page ─────────────────────────────────────────

export default function SOWPage({ user }: { user?: any }) {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [tab, setTab] = useState<"curriculum" | "plans">("curriculum");

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="text-xl font-bold text-gray-800 flex-1">Scheme of Work</h2>
        <AcademicYearSelect value={academicYear} onChange={setAcademicYear} />
      </div>

      <div className="flex gap-2 mb-5 border-b border-gray-200">
        {(["curriculum", "plans"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "curriculum" ? "⚙ Curriculum Setup" : "📋 Teacher Plans"}
          </button>
        ))}
      </div>

      {tab === "curriculum" && <CurriculumSetupTab academicYear={academicYear} />}
      {tab === "plans"      && <TeacherPlansTab academicYear={academicYear} user={user} />}
    </div>
  );
}
