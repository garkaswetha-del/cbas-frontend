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

const SEVERITY_STYLES: Record<ValidationIssue["severity"], string> = {
  error: "bg-red-50 border-red-300 text-red-800",
  warning: "bg-yellow-50 border-yellow-300 text-yellow-800",
  info: "bg-blue-50 border-blue-300 text-blue-800",
};

export default function SubstitutionPage() {
  const [status, setStatus] = useState<TimetableStatus | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [permanentExceptions, setPermanentExceptions] = useState<{ id: string; teacher_id: string; teacher: Teacher }[]>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [day, setDay] = useState("Mo");
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [tempUnavailableIds, setTempUnavailableIds] = useState<string[]>([]);
  const [newExceptionId, setNewExceptionId] = useState("");

  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [hasBlockingErrors, setHasBlockingErrors] = useState(false);
  const [validating, setValidating] = useState(false);

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
    } finally {
      setValidating(false);
    }
  }, [day, absentIds, tempUnavailableIds]);

  useEffect(() => {
    if (status?.hasActiveTimetable) {
      runValidation();
    }
  }, [status?.hasActiveTimetable, runValidation]);

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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Teacher Substitution</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h2 className="font-semibold text-gray-700 mb-2">Timetable</h2>

        {status?.hasActiveTimetable ? (
          <p className="text-sm text-gray-600 mb-3">
            Active timetable uploaded on{" "}
            {status.uploadedAt ? new Date(status.uploadedAt).toLocaleString() : "—"} —{" "}
            {status.teacherCount} teachers, {status.periodCount} periods. You don't need to re-upload
            unless the timetable has changed.
          </p>
        ) : (
          <p className="text-sm text-gray-600 mb-3">No timetable uploaded yet. Upload one to get started.</p>
        )}

        <label className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-md cursor-pointer hover:bg-indigo-700">
          {uploading ? "Uploading..." : status?.hasActiveTimetable ? "Re-upload Timetable PDF" : "Upload Timetable PDF"}
          <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>

        {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
      </div>

      {status?.hasActiveTimetable && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h2 className="font-semibold text-gray-700 mb-3">Permanent Exception List</h2>
            <p className="text-xs text-gray-500 mb-3">
              Teachers who should never be assigned substitution duty. This list carries over every day.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {permanentExceptions.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                >
                  {e.teacher?.name}
                  <button
                    onClick={() => removePermanentException(e.teacher_id)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <select
                value={newExceptionId}
                onChange={(e) => setNewExceptionId(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm flex-1"
              >
                <option value="">Select a teacher...</option>
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
                <p className="text-sm font-medium text-gray-600 mb-2">Absent Teachers</p>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {sortedTeachers.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm py-1">
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
                <p className="text-sm font-medium text-gray-600 mb-2">Temporarily Unavailable Today</p>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {sortedTeachers.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm py-1">
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

          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h2 className="font-semibold text-gray-700 mb-3">Validation {validating && "(checking...)"}</h2>

            {issues.length === 0 && !validating && (
              <p className="text-sm text-green-700">No issues found.</p>
            )}

            <div className="space-y-2">
              {issues.map((issue, i) => (
                <div key={i} className={`border rounded-md px-3 py-2 text-sm ${SEVERITY_STYLES[issue.severity]}`}>
                  <span className="font-mono text-xs mr-2">[{issue.code}]</span>
                  {issue.message}
                </div>
              ))}
            </div>

            <button
              disabled={hasBlockingErrors}
              title={
                hasBlockingErrors
                  ? "Resolve all errors above before proceeding."
                  : "Allocation engine not yet implemented."
              }
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Proceed to Allocation
            </button>
          </div>
        </>
      )}
    </div>
  );
}
