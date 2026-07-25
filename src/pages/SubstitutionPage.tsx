import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "https://cbas-backend-production.up.railway.app";

const DAYS = [
  { value: "Mo", label: "Monday" },
  { value: "Tu", label: "Tuesday" },
  { value: "We", label: "Wednesday" },
  { value: "Th", label: "Thursday" },
  { value: "Fr", label: "Friday" },
  { value: "Sa", label: "Saturday" },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const ALLOCATION_RULES = [
  { num: 1, text: "A teacher's total workload per day (regular periods + substitutions) must not exceed 7. Teachers at the cap are excluded." },
  { num: 2, text: "Only teachers with a FREE period at that exact slot are eligible." },
  { num: 3, text: "Absent teachers, permanent exceptions (Principal, AHM etc.), and temporarily unavailable teachers are excluded." },
  { num: 4, text: "Stages: Preparatory = Grade 3–5 · Middle = Grade 6–8 · Secondary = Grade 9–10. For any absent teacher, substitutes are first chosen from the same stage." },
  { num: 5, text: "If no same-stage teacher is free, a teacher from any other stage is assigned. This is shown in amber as 'cross-stage assigned'." },
  { num: 6, text: "Among all eligible same-stage teachers, the one with the fewest substitutions in the past 7 days is chosen to maintain fair weekly distribution." },
];

interface Teacher {
  id: string;
  name: string;
}

interface TimetableStatus {
  hasActiveTimetable: boolean;
  uploadedAt: string | null;
  teacherCount: number;
  periodCount: number;
}

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  context: Record<string, unknown>;
}

interface Assignment {
  period: number;
  absent_teacher_id: string;
  absent_teacher_name: string;
  substitute_id: string | null;
  substitute_name: string | null;
  substitute_regular_periods: number;
  substitute_subs_today: number;
  grades: number[];
  classes: string[];
  raw: string;
  reason: string;
  cross_stage: boolean;
}

const SEVERITY_STYLES: Record<ValidationIssue["severity"], string> = {
  error: "bg-red-50 border-red-300 text-red-800",
  warning: "bg-yellow-50 border-yellow-300 text-yellow-800",
  info: "bg-blue-50 border-blue-300 text-blue-800",
};

function todayDay(): string {
  return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][new Date().getDay()];
}

function classLabel(a: Assignment): string {
  if (a.classes?.length > 0) return a.classes.join(", ");
  if (a.grades?.length > 0) return a.grades.map((g) => `Grade ${g}`).join(", ");
  return a.raw;
}

interface TeacherSchedule {
  teacher: Teacher;
  schedule: Record<string, Record<number, string>>;
}

export default function SubstitutionPage() {
  const [activeTab, setActiveTab] = useState<"substitution" | "timetable">("substitution");

  const [status, setStatus] = useState<TimetableStatus | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [permanentExceptions, setPermanentExceptions] = useState<{ id: string; teacher_id: string; teacher: Teacher }[]>([]);

  // Timetable viewer state
  const [timetableTeacherId, setTimetableTeacherId] = useState("");
  const [timetableData, setTimetableData] = useState<TeacherSchedule | null>(null);
  const [timetableLoading, setTimetableLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [day, setDay] = useState(() => {
    const d = todayDay();
    return DAYS.find((x) => x.value === d)?.value ?? "Mo";
  });
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [tempUnavailableIds, setTempUnavailableIds] = useState<string[]>([]);
  const [newExceptionId, setNewExceptionId] = useState("");

  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [hasBlockingErrors, setHasBlockingErrors] = useState(false);
  const [validating, setValidating] = useState(false);

  const [allocating, setAllocating] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);

  const [rulesOpen, setRulesOpen] = useState(false);

  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name));

  const loadStatus = useCallback(async () => {
    const res = await axios.get(`${API}/substitution/timetable/status`);
    setStatus(res.data);
  }, []);

  const loadTeachers = useCallback(async () => {
    const res = await axios.get(`${API}/substitution/teachers`);
    setTeachers(res.data);
  }, []);

  const loadPermanentExceptions = useCallback(async () => {
    const res = await axios.get(`${API}/substitution/permanent-exceptions`);
    setPermanentExceptions(res.data);
  }, []);

  useEffect(() => {
    loadStatus();
    loadTeachers();
    loadPermanentExceptions();
  }, [loadStatus, loadTeachers, loadPermanentExceptions]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(`${API}/substitution/timetable/upload`, formData);
      await Promise.all([loadStatus(), loadTeachers()]);
      setAbsentIds([]);
      setTempUnavailableIds([]);
      setAssignments(null);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || "Failed to parse timetable PDF.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const runValidation = useCallback(async () => {
    setValidating(true);
    try {
      const res = await axios.post(`${API}/substitution/validate`, {
        day,
        date: new Date().toISOString().slice(0, 10),
        absent_teacher_ids: absentIds,
        temp_unavailable_teacher_ids: tempUnavailableIds,
      });
      setIssues(res.data.issues);
      setHasBlockingErrors(res.data.hasBlockingErrors);
      setAssignments(null);
    } finally {
      setValidating(false);
    }
  }, [day, absentIds, tempUnavailableIds]);

  useEffect(() => {
    if (status?.hasActiveTimetable) runValidation();
  }, [status?.hasActiveTimetable, runValidation]);

  const printPlan = () => {
    if (!assignments) return;
    const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    const rows = grouped
      .map((group) => {
        const unresolved = group.periods.filter((p) => !p.substitute_id).length;
        const headerColor = unresolved > 0 ? "#fef2f2" : "#eef2ff";
        const periodRows = group.periods
          .map((a) => {
            const cls = a.classes?.length > 0
              ? a.classes.join(", ")
              : a.grades?.length > 0
              ? a.grades.map((g) => `Grade ${g}`).join(", ")
              : a.raw;
            const sub = a.substitute_id
              ? `<span style="color:#15803d;font-weight:600">${a.substitute_name}</span>`
              : `<span style="color:#dc2626;font-weight:600">⚠ No substitute available</span>`;
            const regPeriods = a.substitute_id ? a.substitute_regular_periods : "—";
            const subToday = a.substitute_id ? a.substitute_subs_today : "—";
            const reason = a.substitute_id
              ? `<span style="background:${a.cross_stage ? '#fffbeb' : '#eef2ff'};color:${a.cross_stage ? '#92400e' : '#4338ca'};padding:2px 6px;border-radius:4px;font-size:11px">${a.reason}</span>`
              : "";
            return `<tr>
              <td style="border:1px solid #e5e7eb;padding:6px 10px;text-align:center;font-weight:600">${a.period}</td>
              <td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:12px">${cls}</td>
              <td style="border:1px solid #e5e7eb;padding:6px 10px">${sub}</td>
              <td style="border:1px solid #e5e7eb;padding:6px 10px;text-align:center">${regPeriods}</td>
              <td style="border:1px solid #e5e7eb;padding:6px 10px;text-align:center">${subToday}</td>
              <td style="border:1px solid #e5e7eb;padding:6px 10px">${reason}</td>
            </tr>`;
          })
          .join("");
        return `
          <div style="margin-bottom:20px;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;page-break-inside:avoid">
            <div style="background:${headerColor};padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:700;font-size:14px">${group.teacherName}</span>
              <span style="font-size:12px;color:#6b7280">${group.periods.length} period(s) to cover${unresolved > 0 ? ` · <span style="color:#dc2626">${unresolved} unresolved</span>` : ""}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="background:#f9fafb;font-size:11px;color:#6b7280;text-transform:uppercase">
                  <th style="border:1px solid #e5e7eb;padding:6px 10px;text-align:center;width:60px">Period</th>
                  <th style="border:1px solid #e5e7eb;padding:6px 10px;text-align:left">Class / Grade</th>
                  <th style="border:1px solid #e5e7eb;padding:6px 10px;text-align:left">Substitute</th>
                  <th style="border:1px solid #e5e7eb;padding:6px 10px;text-align:center">Regular<br>Periods</th>
                  <th style="border:1px solid #e5e7eb;padding:6px 10px;text-align:center">Sub Periods<br>Today</th>
                  <th style="border:1px solid #e5e7eb;padding:6px 10px;text-align:left">Rule Applied</th>
                </tr>
              </thead>
              <tbody>${periodRows}</tbody>
            </table>
          </div>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Substitution Plan — ${dayLabel} ${dateStr}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
    @media print { @page { margin: 15mm; } }
  </style>
</head>
<body>
  <h1>Substitution Plan</h1>
  <p class="meta">${dayLabel}, ${dateStr} &nbsp;·&nbsp; ${assignments.length} period(s) to cover &nbsp;·&nbsp; ${unresolvedCount > 0 ? `${unresolvedCount} unresolved` : "All covered"}</p>
  ${rows}
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Pop-up blocked — please allow pop-ups for this site and try again."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const runAllocation = async () => {
    setAllocating(true);
    try {
      const res = await axios.post(`${API}/substitution/allocate`, {
        day,
        date: new Date().toISOString().slice(0, 10),
        absent_teacher_ids: absentIds,
        temp_unavailable_teacher_ids: tempUnavailableIds,
      });
      setAssignments(res.data.assignments);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Allocation failed. Please try again.");
    } finally {
      setAllocating(false);
    }
  };

  const loadTimetable = async (teacherId: string) => {
    if (!teacherId) { setTimetableData(null); return; }
    setTimetableLoading(true);
    try {
      const res = await axios.get(`${API}/substitution/timetable/teacher`, { params: { teacher_id: teacherId } });
      setTimetableData(res.data);
    } finally {
      setTimetableLoading(false);
    }
  };

  const toggleId = (list: string[], setList: (ids: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const addPermanentException = async () => {
    if (!newExceptionId) return;
    await axios.post(`${API}/substitution/permanent-exceptions`, { teacher_id: newExceptionId });
    setNewExceptionId("");
    await loadPermanentExceptions();
  };

  const removePermanentException = async (teacherId: string) => {
    await axios.delete(`${API}/substitution/permanent-exceptions/${teacherId}`);
    await loadPermanentExceptions();
  };

  const permanentExceptionIds = permanentExceptions.map((e) => e.teacher_id);
  const availableForException = sortedTeachers.filter((t) => !permanentExceptionIds.includes(t.id));
  const dayLabel = DAYS.find((d) => d.value === day)?.label ?? day;
  const unresolvedCount = assignments?.filter((a) => !a.substitute_id).length ?? 0;

  // Group assignments by absent teacher
  const grouped: { teacherId: string; teacherName: string; periods: Assignment[] }[] = [];
  if (assignments) {
    const seen = new Map<string, number>();
    for (const a of assignments) {
      if (!seen.has(a.absent_teacher_id)) {
        seen.set(a.absent_teacher_id, grouped.length);
        grouped.push({ teacherId: a.absent_teacher_id, teacherName: a.absent_teacher_name, periods: [] });
      }
      grouped[seen.get(a.absent_teacher_id)!].periods.push(a);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Teacher Substitution</h1>

      {/* ── Tab strip ── */}
      <div className="flex border-b border-gray-200 mb-6">
        {(["substitution", "timetable"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "substitution" ? "Substitution" : "Timetable Viewer"}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
           TIMETABLE VIEWER TAB
      ══════════════════════════════════════════════ */}
      {activeTab === "timetable" && (
        <div>
          {!status?.hasActiveTimetable ? (
            <p className="text-sm text-gray-500">No timetable uploaded yet. Upload a PDF first from the Substitution tab.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <select
                  value={timetableTeacherId}
                  onChange={(e) => {
                    setTimetableTeacherId(e.target.value);
                    loadTimetable(e.target.value);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
                >
                  <option value="">Select a teacher…</option>
                  {sortedTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {timetableLoading && <span className="text-xs text-gray-400">Loading…</span>}
              </div>

              {timetableData && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {timetableData.teacher.name} — Weekly Timetable
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="border-collapse text-sm w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-600 w-20">Day</th>
                          {PERIODS.map((p) => (
                            <th key={p} className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-600 w-24">
                              P{p}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map(({ value: d, label }) => (
                          <tr key={d} className="even:bg-gray-50">
                            <td className="border border-gray-300 px-3 py-2 font-medium text-gray-700 text-xs">{label}</td>
                            {PERIODS.map((p) => {
                              const cell = timetableData.schedule[d]?.[p];
                              const isFree = !cell || cell === "FREE";
                              return (
                                <td
                                  key={p}
                                  className={`border border-gray-300 px-2 py-2 text-center text-xs ${
                                    isFree ? "text-gray-300 bg-gray-50" : "text-gray-800"
                                  }`}
                                >
                                  {isFree ? "—" : cell}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
           SUBSTITUTION TAB
      ══════════════════════════════════════════════ */}
      {activeTab === "substitution" && <>

      {/* ── Allocation Rules ── */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <button
          onClick={() => setRulesOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg"
        >
          <span>ℹ Allocation Rules</span>
          <span className="text-gray-400 text-xs">{rulesOpen ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {rulesOpen && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
            <ol className="space-y-1.5">
              {ALLOCATION_RULES.map((r) => (
                <li key={r.num} className="flex gap-2 text-sm text-gray-700">
                  <span className="font-semibold text-indigo-600 min-w-[1.5rem]">{r.num}.</span>
                  <span>{r.text}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* ── Timetable upload ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h2 className="font-semibold text-gray-700 mb-2">Timetable</h2>
        {status?.hasActiveTimetable ? (
          <p className="text-sm text-gray-600 mb-3">
            Active timetable uploaded on{" "}
            {status.uploadedAt ? new Date(status.uploadedAt).toLocaleString() : "—"} —{" "}
            {status.teacherCount} teachers, {status.periodCount} periods.
          </p>
        ) : (
          <p className="text-sm text-gray-600 mb-3">No timetable uploaded yet. Upload a PDF to get started.</p>
        )}
        <label className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-md cursor-pointer hover:bg-indigo-700">
          {uploading ? "Uploading…" : status?.hasActiveTimetable ? "Re-upload Timetable PDF" : "Upload Timetable PDF"}
          <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
      </div>

      {status?.hasActiveTimetable && (
        <>
          {/* ── Permanent exceptions ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h2 className="font-semibold text-gray-700 mb-1">Permanent Exception List</h2>
            <p className="text-xs text-gray-500 mb-3">
              Teachers who are never assigned substitution duty (e.g. Principal, AHM).
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {permanentExceptions.map((e) => (
                <span key={e.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm">
                  {e.teacher?.name}
                  <button onClick={() => removePermanentException(e.teacher_id)} className="text-gray-500 hover:text-red-600">×</button>
                </span>
              ))}
              {permanentExceptions.length === 0 && <span className="text-xs text-gray-400">None added yet.</span>}
            </div>
            <div className="flex gap-2">
              <select
                value={newExceptionId}
                onChange={(e) => setNewExceptionId(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm flex-1"
              >
                <option value="">Select a teacher…</option>
                {availableForException.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={addPermanentException}
                disabled={!newExceptionId}
                className="px-3 py-1 bg-gray-700 text-white text-sm rounded-md disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {/* ── Daily inputs ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700">Daily Inputs</h2>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Absent Teachers <span className="font-normal text-gray-400">({absentIds.length} selected)</span>
                </p>
                <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {sortedTeachers.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-gray-50 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={absentIds.includes(t.id)}
                        onChange={() => toggleId(absentIds, setAbsentIds, t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Temporarily Unavailable <span className="font-normal text-gray-400">({tempUnavailableIds.length} selected)</span>
                </p>
                <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {sortedTeachers.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-gray-50 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={tempUnavailableIds.includes(t.id)}
                        onChange={() => toggleId(tempUnavailableIds, setTempUnavailableIds, t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Validation ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700">
                Validation {validating && <span className="text-xs font-normal text-gray-400 ml-1">(checking…)</span>}
              </h2>
              <button
                onClick={runValidation}
                disabled={validating}
                className="text-xs px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
              >
                Re-check
              </button>
            </div>
            {issues.length === 0 && !validating && (
              <p className="text-sm text-green-700">✓ No issues found.</p>
            )}
            <div className="space-y-2 mb-4">
              {issues.map((issue, i) => (
                <div key={i} className={`border rounded-md px-3 py-2 text-sm ${SEVERITY_STYLES[issue.severity]}`}>
                  <span className="font-mono text-xs mr-2 opacity-60">[{issue.code}]</span>
                  {issue.message}
                </div>
              ))}
            </div>
            <button
              onClick={runAllocation}
              disabled={hasBlockingErrors || allocating || absentIds.length === 0}
              title={
                absentIds.length === 0
                  ? "Mark at least one teacher as absent first."
                  : hasBlockingErrors
                  ? "Resolve all errors above before proceeding."
                  : ""
              }
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {allocating ? "Allocating…" : "Generate Substitution Plan"}
            </button>
          </div>

          {/* ── Allocation results (teacher-wise) ── */}
          {assignments && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-gray-800">
                    Substitution Plan — {dayLabel}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {assignments.length} period{assignments.length !== 1 ? "s" : ""} to cover
                    {unresolvedCount > 0 && (
                      <span className="text-red-600 ml-2">· {unresolvedCount} unresolved</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={printPlan}
                  className="px-4 py-1.5 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
                >
                  🖨 Print / Save PDF
                </button>
              </div>

              {grouped.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  No periods to cover for absent teachers on {dayLabel}.
                </p>
              ) : (
                <div className="space-y-6">
                  {grouped.map((group) => {
                    const unresolved = group.periods.filter((p) => !p.substitute_id).length;
                    return (
                      <div key={group.teacherId} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Teacher header */}
                        <div className={`px-4 py-2.5 flex items-center justify-between ${unresolved > 0 ? "bg-red-50" : "bg-indigo-50"}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 text-sm">{group.teacherName}</span>
                            <span className="text-xs text-gray-500">
                              — {group.periods.length} period{group.periods.length !== 1 ? "s" : ""} to cover
                            </span>
                          </div>
                          {unresolved > 0 && (
                            <span className="text-xs text-red-600 font-medium">
                              {unresolved} unresolved
                            </span>
                          )}
                        </div>

                        {/* Periods table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                                <th className="px-3 py-2 text-center w-16">Period</th>
                                <th className="px-3 py-2 text-left">Class / Grade</th>
                                <th className="px-3 py-2 text-left">Substitute</th>
                                <th className="px-3 py-2 text-center" title="Substitute's regular periods on this day from timetable">
                                  Regular<br/>Periods
                                </th>
                                <th className="px-3 py-2 text-center" title="Substitution periods assigned to this teacher today">
                                  Sub Periods<br/>Today
                                </th>
                                <th className="px-3 py-2 text-left">Rule Applied</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.periods.map((a, i) => (
                                <tr
                                  key={i}
                                  className={`border-b border-gray-100 last:border-0 ${
                                    a.substitute_id ? "hover:bg-gray-50" : "bg-red-50"
                                  }`}
                                >
                                  <td className="px-3 py-2 text-center font-medium text-gray-700">
                                    {a.period}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600 text-xs">
                                    {classLabel(a)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {a.substitute_id ? (
                                      <span className="text-green-700 font-medium">{a.substitute_name}</span>
                                    ) : (
                                      <span className="text-red-600 font-medium">⚠ No substitute available</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700 tabular-nums">
                                    {a.substitute_id ? a.substitute_regular_periods : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700 tabular-nums">
                                    {a.substitute_id ? a.substitute_subs_today : "—"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {a.substitute_id ? (
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        a.cross_stage
                                          ? "text-amber-700 bg-amber-50"
                                          : "text-indigo-600 bg-indigo-50"
                                      }`}>
                                        {a.reason}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {unresolvedCount > 0 && (
                <p className="mt-4 text-xs text-red-600">
                  {unresolvedCount} period{unresolvedCount > 1 ? "s" : ""} could not be covered — all eligible teachers are busy or excluded during those slots.
                </p>
              )}
            </div>
          )}
        </>
      )}

      </> /* end substitution tab */ }
    </div>
  );
}
