import { useState, useEffect } from "react";
import axios from "axios";
import AcademicYearSelect from "../components/AcademicYearSelect";
import { currentAcademicYear } from "../utils/academicYear";
import { getAPI } from "../utils/api";

const API = getAPI();

interface SummaryRow {
  grade: string; subject: string;
  previous_grade: string | null; previous_academic_year: string;
  achieved_percentage: number | null;
  this_year_goal: number | null; set_by: string | null; updated_at: string | null;
}

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// restrictToGrades: pass an AHM's stage grades to scope the view; omit for admin (all grades)
export default function GoalTrackerPage({ restrictToGrades, title, subtitle }: { restrictToGrades?: string[]; title?: string; subtitle?: string }) {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const gradesParam = restrictToGrades && restrictToGrades.length ? `&grades=${encodeURIComponent(restrictToGrades.join(","))}` : "";
    axios.get(`${API}/grade-subject-goals/summary?academic_year=${academicYear}${gradesParam}`)
      .then(r => setRows(r.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [academicYear, restrictToGrades?.join(",")]);

  const grouped = rows.reduce((acc: Record<string, SummaryRow[]>, r) => {
    if (!acc[r.grade]) acc[r.grade] = [];
    acc[r.grade].push(r);
    return acc;
  }, {});

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{title || "Goal Tracker"}</h1>
          <p className="text-sm text-gray-500">
            {subtitle || (restrictToGrades ? "Goals set by teachers across your stage" : "Goals set by teachers, across every grade")}
          </p>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-0.5">Academic Year</label>
          <AcademicYearSelect value={academicYear} onChange={setAcademicYear} />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">Loading…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          No subjects configured{restrictToGrades ? " for your stage" : ""} yet — add them under Grade &amp; Subject Mapping.
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([grade, gradeRows]) => (
            <div key={grade} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-700">{grade}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-600 border-b border-gray-100">
                      <th className="px-4 py-2 text-left">Subject</th>
                      <th className="px-4 py-2 text-right">Last year ({gradeRows[0]?.previous_grade || "—"})</th>
                      <th className="px-4 py-2 text-right">This year's goal</th>
                      <th className="px-4 py-2 text-left">Set by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeRows.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-2 font-medium text-gray-800">{r.subject}</td>
                        <td className="px-4 py-2 text-right">
                          {r.achieved_percentage !== null ? `${r.achieved_percentage}%` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {r.this_year_goal !== null ? <span className="font-semibold text-indigo-700">{r.this_year_goal}%</span> : <span className="text-gray-300">Not set</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-500">
                          {r.set_by ? `${r.set_by}${r.updated_at ? " · " + formatDate(r.updated_at) : ""}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
