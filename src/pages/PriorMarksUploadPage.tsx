import { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { currentAcademicYear } from "../utils/academicYear";
import { getAPI } from "../utils/api";

const API = getAPI();

function previousAcademicYear(year: string): string {
  const startYr = parseInt((year || "").split("-")[0], 10);
  if (!startYr) return year;
  const prevStart = startYr - 1;
  return `${prevStart}-${String(prevStart + 1).slice(2)}`;
}

function normalizeGradeLabel(raw: string): string {
  const s = (raw ?? "").toString().trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (lower === "nursery") return "Nursery";
  if (["pre-kg", "prekg", "pkg"].includes(lower)) return "Pre-KG";
  if (lower === "lkg") return "LKG";
  if (lower === "ukg") return "UKG";
  const gMatch = s.match(/^g(?:rade)?\.?\s*(\d+)$/i);
  if (gMatch) return `Grade ${gMatch[1]}`;
  if (/^\d+$/.test(s)) return `Grade ${s}`;
  return s;
}

interface ParsedRow { grade: string; subject: string; average_percentage: number }

const GRADE_ORDER = ['Nursery','Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];
// Prior-year rows are stored under the grade BEFORE the one they benchmark (e.g. a "Grade 9" row
// feeds this year's Grade 10 teachers) — so scoping to an AHM's stage must also include the one
// grade just below their stage's lowest grade, or they could never upload the feeder data their
// own stage's lowest grade needs.
function expandWithFeederGrades(grades?: string[]): string[] | undefined {
  if (!grades?.length) return undefined;
  const set = new Set(grades);
  grades.forEach(g => {
    const idx = GRADE_ORDER.indexOf(g);
    if (idx > 0) set.add(GRADE_ORDER[idx - 1]);
  });
  return [...set];
}

export default function PriorMarksUploadPage({ allowedGrades }: { allowedGrades?: string[] } = {}) {
  const scopedGrades = expandWithFeederGrades(allowedGrades);
  const [academicYear, setAcademicYear] = useState(previousAcademicYear(currentAcademicYear()));
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [existing, setExisting] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [gradeSubjects, setGradeSubjects] = useState<Record<string,string[]>>({});

  const fetchExisting = async (year: string) => {
    setLoadingExisting(true);
    try {
      const r = await axios.get(`${API}/grade-prior-marks?academic_year=${encodeURIComponent(year)}`);
      setExisting(r.data || []);
    } catch { setExisting([]); }
    setLoadingExisting(false);
  };

  useEffect(() => { fetchExisting(academicYear); }, [academicYear]);
  useEffect(() => {
    axios.get(`${API}/grade-subjects`).then(r => setGradeSubjects(r.data || {})).catch(() => {});
  }, []);

  const downloadTemplate = () => {
    const grades = Object.keys(gradeSubjects).filter(g => !scopedGrades?.length || scopedGrades.includes(g));
    const allSubjects = [...new Set(Object.values(gradeSubjects).flat())].sort();
    if (!grades.length || !allSubjects.length) return;
    const header = ["Grade", ...allSubjects];
    const rows = grades.map(g => [g, ...allSubjects.map(() => "")]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prior Marks");
    XLSX.writeFile(wb, "prior_year_marks_template.xlsx");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMessage("");
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // Raw array-of-arrays: row 0 = headers (col 0 = grade, rest = subjects)
        const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (grid.length < 2) { setMessage("❌ Sheet looks empty — need a header row plus at least one data row"); setParsedRows([]); return; }
        const headers = grid[0].map((h: any) => (h ?? "").toString().trim());
        const subjectCols = headers.slice(1);
        const rows: ParsedRow[] = [];
        for (let i = 1; i < grid.length; i++) {
          const row = grid[i];
          const grade = normalizeGradeLabel(row[0]);
          if (!grade) continue;
          if (scopedGrades?.length && !scopedGrades.includes(grade)) continue;
          for (let c = 0; c < subjectCols.length; c++) {
            const subject = subjectCols[c];
            if (!subject) continue;
            const raw = row[c + 1];
            if (raw === "" || raw === null || raw === undefined) continue;
            const pct = Number(raw);
            if (isNaN(pct)) continue;
            rows.push({ grade, subject, average_percentage: pct });
          }
        }
        setParsedRows(rows);
        if (rows.length === 0) setMessage("❌ Couldn't find any grade/subject/number combinations — check the file's layout");
      } catch {
        setMessage("❌ Couldn't read that file — is it a valid .xlsx/.xls?");
        setParsedRows([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const save = async () => {
    if (parsedRows.length === 0) return;
    setUploading(true);
    setMessage("");
    try {
      const stored = localStorage.getItem("cbas_user");
      const uploaded_by = stored ? (JSON.parse(stored)?.name || "") : "";
      const r = await axios.post(`${API}/grade-prior-marks/upload`, {
        academic_year: academicYear,
        rows: parsedRows,
        uploaded_by,
      });
      setMessage(`✅ Saved ${r.data?.saved ?? parsedRows.length} grade/subject rows for ${academicYear}`);
      setParsedRows([]);
      setFileName("");
      fetchExisting(academicYear);
    } catch {
      setMessage("❌ Error saving — please try again");
    }
    setUploading(false);
    setTimeout(() => setMessage(""), 5000);
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Prior Year Marks</h1>
        <p className="text-sm text-gray-500">
          Upload each stage's final-exam averages (one file per stage: Name/Grade in the first column, one column per subject).
          Teachers automatically see the matching previous-grade number for whatever they teach this year.
          {scopedGrades?.length ? ` You can only upload/view grades relevant to your stage: ${scopedGrades.join(", ")}.` : ""}
        </p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-200 p-4 mb-4">
        <label className="text-xs text-gray-500 block mb-1">These marks are from academic year</label>
        <input
          value={academicYear}
          onChange={e => setAcademicYear(e.target.value)}
          placeholder="e.g. 2025-26"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-40 mb-3"
        />
        <p className="text-xs text-gray-400 mb-3">
          Defaults to last year ({previousAcademicYear(currentAcademicYear())}). Change this if you're uploading a different year's file.
        </p>

        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-500">Excel file (one stage at a time)</label>
          <button onClick={downloadTemplate} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 font-medium">
            ⬇ Download Template
          </button>
        </div>
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="text-sm" />
        {fileName && <p className="text-xs text-gray-500 mt-1">Selected: {fileName}</p>}
        <p className="text-xs text-gray-400 mt-2">
          The template lists every grade as a row and every subject configured in the Subjects module as a column — fill in only the cells that apply, leave the rest blank.
        </p>
      </div>

      {parsedRows.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">Preview — {parsedRows.length} rows parsed</h3>
            <button
              onClick={save}
              disabled={uploading}
              className="px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold"
            >
              {uploading ? "Saving..." : `💾 Save for ${academicYear}`}
            </button>
          </div>
          <div className="overflow-y-auto max-h-80 border border-gray-100 rounded">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-gray-600 border-b border-gray-200">
                  <th className="px-3 py-1.5 text-left">Grade</th>
                  <th className="px-3 py-1.5 text-left">Subject</th>
                  <th className="px-3 py-1.5 text-right">Average %</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-1.5">{r.grade}</td>
                    <td className="px-3 py-1.5">{r.subject}</td>
                    <td className="px-3 py-1.5 text-right">{r.average_percentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-700">Already on file for {academicYear}</h3>
        </div>
        {loadingExisting ? (
          <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
        ) : existing.filter((r: any) => !scopedGrades?.length || scopedGrades.includes(r.grade)).length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Nothing uploaded for this year yet</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="px-4 py-2 text-left">Grade</th>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-right">Average %</th>
              </tr>
            </thead>
            <tbody>
              {existing.filter((r: any) => !scopedGrades?.length || scopedGrades.includes(r.grade)).map((r: any) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="px-4 py-2">{r.grade}</td>
                  <td className="px-4 py-2">{r.subject}</td>
                  <td className="px-4 py-2 text-right">{Number(r.average_percentage)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
