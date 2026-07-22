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
  grades: number[];
  classes: string[];
  raw: string;
}

const SEVERITY_STYLES: Record<ValidationIssue["severity"], string> = {
  error: "bg-red-50 border-red-300 text-red-800",
  warning: "bg-yellow-50 border-yellow-300 text-yellow-800",
  info: "bg-blue-50 border-blue-300 text-blue-800",
};

function todayDay(): string {
  return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][new Date().getDay()];
}

export default function SubstitutionPage() {
  const [status, setStatus] = useState<TimetableStatus | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [permanentExceptions, setPermanentExceptions] = useState<{ id: string; teacher_id: string; teacher: Teacher }[]>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [day, setDay] = useState(() => {
    const d = todayDay();
    return DAYS.find(x => x.value === d)?.value ?? "Mo";
  });
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [tempUnavailableIds, setTempUnavailableIds] = useState<string[]>([]);
  const [newExceptionId, setNewExceptionId] = useState("");

  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [hasBlockingErrors, setHasBlockingErrors] = useState(false);
  const [validating, setValidating] = useState(false);

  const [allocating, setAllocating] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);

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
      setAssignments(null); // clear old results when inputs change
    } finally {
      setValidating(false);
    }
  }, [day, absentIds, tempUnavailableIds]);

  useEffect(() => {
    if (status?.hasActiveTimetable) runValidation();
  }, [status?.hasActiveTimetable, runValidation]);

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

  const dayLabel = DAYS.find(d => d.value === day)?.label ?? day;
  const unresolvedCount = assignments?.filter(a => !a.substitute_id).length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Teacher Substitution</h1>

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
              <select value={newExceptionId} onChange={(e) => setNewExceptionId(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm flex-1">
                <option value="">Select a teacher…</option>
                {availableForException.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button onClick={addPermanentException} disabled={!newExceptionId}
                className="px-3 py-1 bg-gray-700 text-white text-sm rounded-md disabled:opacity-40">
                Add
              </button>
            </div>
          </div>

          {/* ── Daily inputs ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700">Daily Inputs</h2>
              <select value={day} onChange={(e) => setDay(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm">
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
                      <input type="checkbox" checked={absentIds.includes(t.id)}
                        onChange={() => toggleId(absentIds, setAbsentIds, t.id)} />
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
                      <input type="checkbox" checked={tempUnavailableIds.includes(t.id)}
                        onChange={() => toggleId(tempUnavailableIds, setTempUnavailableIds, t.id)} />
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
              <button onClick={runValidation} disabled={validating}
                className="text-xs px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40">
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

          {/* ── Allocation results ── */}
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
                  onClick={() => window.print()}
                  className="px-4 py-1.5 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
                >
                  🖨 Print
                </button>
              </div>

              {assignments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No periods to cover for absent teachers on {dayLabel}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="border border-gray-200 px-3 py-2 text-center w-16">Period</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Absent Teacher</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Class / Grade</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Substitute Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a, i) => (
                        <tr key={i} className={a.substitute_id ? "bg-white hover:bg-gray-50" : "bg-red-50"}>
                          <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">
                            {a.period}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-gray-800">
                            {a.absent_teacher_name}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-gray-600 text-xs">
                            {a.classes?.length > 0
                              ? a.classes.join(", ")
                              : a.grades?.length > 0
                              ? a.grades.map(g => `Grade ${g}`).join(", ")
                              : a.raw}
                          </td>
                          <td className="border border-gray-200 px-3 py-2">
                            {a.substitute_id ? (
                              <span className="text-green-700 font-medium">{a.substitute_name}</span>
                            ) : (
                              <span className="text-red-600 font-medium">⚠ No substitute available</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {unresolvedCount > 0 && (
                <p className="mt-3 text-xs text-red-600">
                  {unresolvedCount} period{unresolvedCount > 1 ? "s" : ""} could not be covered — all eligible teachers are busy or excluded during those slots.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
