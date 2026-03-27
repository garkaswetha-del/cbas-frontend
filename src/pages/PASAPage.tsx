import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const API = "http://localhost:3000";
const EXAM_TYPES = ["PA1", "PA2", "SA1", "PA3", "PA4", "SA2", "Custom"];

const ACADEMIC_YEARS = Array.from({ length: 10 }, (_, i) => {
  const y = 2025 + i;
  return `${y}-${String(y + 1).slice(2)}`;
});

const BAND_COLORS: Record<string, string> = {
  "A": "#ef4444", "M2": "#f97316", "M1": "#f59e0b",
  "E2": "#84cc16", "E1": "#10b981", "A+": "#6366f1",
};

const SUBJECT_COLORS = [
  "#ef4444", "#f97316", "#10b981", "#8b5cf6",
  "#06b6d4", "#f59e0b", "#ec4899", "#84cc16", "#14b8a6", "#6366f1",
];

const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const scoreBg = (p: number) => p >= 80 ? "bg-green-100 text-green-800" : p >= 60 ? "bg-blue-100 text-blue-800" : p >= 40 ? "bg-yellow-100 text-yellow-800" : p > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-400";
const scoreColor = (p: number) => p >= 80 ? "text-green-600" : p >= 60 ? "text-blue-600" : p >= 40 ? "text-yellow-600" : p > 0 ? "text-red-500" : "text-gray-400";
const n = (v: any) => +(v ?? 0);

function RankingLineChart({ students, title }: { students: any[], title: string }) {
  const data = [...students]
    .sort((a, b) => n(b.grand_percentage) - n(a.grand_percentage))
    .map((s, i) => ({
      name: s.student_name?.split(" ")[0] + (s.student_name?.split(" ")[1] ? " " + s.student_name.split(" ")[1][0] + "." : ""),
      fullName: s.student_name,
      rank: i + 1,
      "Grand Percentage": n(s.grand_percentage),
      section: s.section,
    }));

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-3">Students sorted high to low by Grand % · X = Student · Y = Grand %</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" interval={0} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: "Grand Percentage", angle: -90, position: "insideLeft", style: { fontSize: 9 } }} />
          <Tooltip formatter={(v: any, _, props) => [`${n(v).toFixed(1)}% (Rank #${props.payload.rank})`, props.payload.fullName]} />
          <Line type="monotone" dataKey="Grand Percentage" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function GrandVsSubjectChart({ data, subjectName, color }: { data: any[], subjectName: string, color: string }) {
  const chartData = [...data]
    .sort((a, b) => n(b.grand_percentage) - n(a.grand_percentage))
    .map(s => ({
      name: s.student_name?.split(" ")[0],
      fullName: s.student_name,
      "Grand Percentage": n(s.grand_percentage),
      [subjectName]: n(s.subject_percentage),
    }));

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-xs font-bold text-gray-700 mb-2">Grand % vs {subjectName}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 7 }} angle={-45} textAnchor="end" interval={0} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
          <Tooltip formatter={(v: any, name: any, props) => [`${n(v).toFixed(1)}%`, name === "Grand Percentage" ? `Grand % (${props.payload.fullName})` : name]} />
          <Legend wrapperStyle={{ fontSize: "10px" }} />
          <Line type="monotone" dataKey="Grand Percentage" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 2 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey={subjectName} stroke={color} strokeWidth={2} dot={{ fill: color, r: 2 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PASAPage() {
  const [activeTab, setActiveTab] = useState<"entry" | "dashboard">("entry");
  const [academicYear, setAcademicYear] = useState("2025-26");

  // Entry
  const [grades, setGrades] = useState<string[]>([]);
  const [entryGrade, setEntryGrade] = useState("");
  const [entryExam, setEntryExam] = useState("PA1");
  const [customExam, setCustomExam] = useState("");
  const [entrySections, setEntrySections] = useState<string[]>([]);
  const [entrySection, setEntrySection] = useState("");
  const [subjects, setSubjects] = useState<{ subject: string; max_marks: number }[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newMax, setNewMax] = useState(100);
  const [marksTable, setMarksTable] = useState<any>(null);
  const [marks, setMarks] = useState<Record<string, Record<string, any>>>({});
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [configSaved, setConfigSaved] = useState(false);
  const [sortCol, setSortCol] = useState("grand_percentage");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const fileRef = useRef<HTMLInputElement>(null);

  // Dashboard
  const [dashTab, setDashTab] = useState<"school" | "grade" | "section" | "student" | "alerts">("school");
  const [dashExam, setDashExam] = useState("PA1");
  const [dashGrade, setDashGrade] = useState("");
  const [dashSection, setDashSection] = useState("");
  const [dashSections, setDashSections] = useState<string[]>([]);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [gradeData, setGradeData] = useState<any>(null);
  const [sectionData, setSectionData] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [longData, setLongData] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [studentGrade, setStudentGrade] = useState("");
  const [studentSection, setStudentSection] = useState("");
  const [studentSections, setStudentSections] = useState<string[]>([]);
  const [sectionStudents, setSectionStudents] = useState<string[]>([]);
  const [dashSortCol, setDashSortCol] = useState("grand_percentage");
  const [dashSortDir, setDashSortDir] = useState<"asc" | "desc">("desc");
  const [pasaAlerts, setPasaAlerts] = useState<any[]>([]);

  const effectiveExam = entryExam === "Custom" ? customExam : entryExam;

  // ── LOAD GRADES ───────────────────────────────────────────────
  useEffect(() => { fetchGrades(); }, []);

  const fetchGrades = async () => {
    try {
      const res = await axios.get(`${API}/students?limit=2000`);
      const students = res.data?.data || res.data || [];
      const gradeSet = [...new Set(students.map((s: any) => s.current_class).filter(Boolean))] as string[];
      const sorted = gradeSet.sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, "")) || 0;
        const nb = parseInt(b.replace(/\D/g, "")) || 0;
        return na - nb;
      });
      setGrades(sorted);
      if (sorted.length) {
        setEntryGrade(sorted[0]);
        setDashGrade(sorted[0]);
        setStudentGrade(sorted[0]);
      }
    } catch { }
  };

  // ── ENTRY EFFECTS ─────────────────────────────────────────────
  useEffect(() => { if (entryGrade) fetchEntrySections(); }, [entryGrade]);
  useEffect(() => { if (entryGrade && effectiveExam) fetchConfig(); }, [entryGrade, effectiveExam, academicYear]);
  useEffect(() => {
    if (entryGrade && entrySection && effectiveExam && configSaved) fetchMarksTable();
  }, [entryGrade, entrySection, effectiveExam, configSaved, academicYear]);

  const fetchEntrySections = async () => {
    try {
      let secs: string[] = [];
      const r = await axios.get(`${API}/pasa/sections?academic_year=${academicYear}&grade=${encodeURIComponent(entryGrade)}`);
      secs = r.data || [];
      if (!secs.length) {
        const sr = await axios.get(`${API}/students?limit=2000`);
        const st = sr.data?.data || sr.data || [];
        secs = ([...new Set(st.filter((s: any) => s.current_class === entryGrade).map((s: any) => s.section).filter(Boolean))] as string[]).sort();
      }
      setEntrySections(secs);
      setEntrySection(secs[0] || "");
    } catch { }
  };

  const fetchConfig = async () => {
    try {
      const r = await axios.get(`${API}/pasa/config?academic_year=${academicYear}&exam_type=${effectiveExam}&grade=${encodeURIComponent(entryGrade)}`);
      if (r.data?.length) {
        setSubjects(r.data.map((c: any) => ({ subject: c.subject, max_marks: n(c.max_marks) })));
        setConfigSaved(true);
      } else {
        try {
          const pr = await axios.get(`${API}/pasa/subjects?academic_year=${academicYear}&exam_type=PA1&grade=${encodeURIComponent(entryGrade)}`);
          if (pr.data?.length) setSubjects(pr.data.map((s: string) => ({ subject: s, max_marks: 100 })));
          else setSubjects([]);
        } catch { setSubjects([]); }
        setConfigSaved(false);
      }
    } catch { }
  };

  const fetchMarksTable = async () => {
    try {
      const r = await axios.get(`${API}/pasa/marks/table?academic_year=${academicYear}&exam_type=${effectiveExam}&grade=${encodeURIComponent(entryGrade)}&section=${encodeURIComponent(entrySection)}`);
      setMarksTable(r.data);
      const m: Record<string, Record<string, any>> = {};
      (r.data?.students || []).forEach((s: any) => {
        m[s.student_name] = {};
        Object.keys(s.subjects).forEach(sub => {
          m[s.student_name][sub] = {
            marks: s.subjects[sub].marks !== null && s.subjects[sub].marks !== undefined ? String(s.subjects[sub].marks) : "",
            is_absent: s.subjects[sub].is_absent || false,
          };
        });
      });
      setMarks(m);
    } catch { }
  };

  const saveConfig = async () => {
    if (!subjects.length) { setMessage("❌ Add at least one subject"); setTimeout(() => setMessage(""), 3000); return; }
    if (!effectiveExam) { setMessage("❌ Enter exam name"); setTimeout(() => setMessage(""), 3000); return; }
    try {
      await axios.post(`${API}/pasa/config`, { academic_year: academicYear, exam_type: effectiveExam, grade: entryGrade, subjects });
      setConfigSaved(true);
      setMessage("✅ Config saved");
      if (entrySection) fetchMarksTable();
    } catch { setMessage("❌ Error saving config"); }
    setTimeout(() => setMessage(""), 3000);
  };

  const addSubject = () => {
    if (!newSubject.trim()) return;
    if (subjects.find(s => s.subject === newSubject.trim().toUpperCase())) return;
    setSubjects(prev => [...prev, { subject: newSubject.trim().toUpperCase(), max_marks: newMax }]);
    setNewSubject(""); setNewMax(100);
  };

  const updateMark = (name: string, sub: string, val: string) => {
    setMarks(prev => ({ ...prev, [name]: { ...(prev[name] || {}), [sub]: { ...((prev[name] || {})[sub] || {}), marks: val } } }));
  };

  const toggleAbsent = (name: string, sub: string) => {
    setMarks(prev => {
      const current = prev[name]?.[sub]?.is_absent || false;
      return { ...prev, [name]: { ...(prev[name] || {}), [sub]: { marks: "", is_absent: !current } } };
    });
  };

  const saveMarks = async () => {
    if (!marksTable) return;
    setSaving(true);
    try {
      const entries: any[] = [];
      marksTable.students.forEach((student: any) => {
        marksTable.subjects.forEach((sub: string) => {
          const config = marksTable.configs?.find((c: any) => c.subject === sub);
          const md = marks[student.student_name]?.[sub];
          const maxMarks = n(config?.max_marks) || 100;
          const marksObtained = md?.is_absent ? null : (md?.marks === "" || md?.marks === undefined ? null : parseFloat(String(md.marks)));
          entries.push({
            student_id: student.student_id, student_name: student.student_name,
            roll_number: student.roll_number, subject: sub,
            marks_obtained: isNaN(marksObtained as number) ? null : marksObtained,
            max_marks: maxMarks, is_absent: md?.is_absent || false,
          });
        });
      });
      await axios.post(`${API}/pasa/marks`, { academic_year: academicYear, exam_type: effectiveExam, grade: entryGrade, section: entrySection, entries });
      setMessage("✅ Marks saved successfully");
      fetchMarksTable();
    } catch { setMessage("❌ Error saving marks"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file); fd.append("academic_year", academicYear); fd.append("exam_type", effectiveExam || "PA3");
    try {
      const r = await axios.post(`${API}/pasa/import`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMessage(`✅ Imported: ${r.data.sheets_processed} sheets, ${r.data.marks_saved} marks`);
      setConfigSaved(true);
      await fetchConfig();
      if (entrySection) fetchMarksTable();
    } catch { setMessage("❌ Import failed"); }
    setImporting(false);
    setTimeout(() => setMessage(""), 5000);
    if (fileRef.current) fileRef.current.value = "";
  };

  const sortedStudents = marksTable ? [...(marksTable.students || [])].map((s: any) => {
    let to = 0, tm = 0;
    (marksTable?.subjects || []).forEach((sub: string) => {
      const cfg = marksTable?.configs?.find((c: any) => c.subject === sub);
      const md = marks[s.student_name]?.[sub];
      if (!md?.is_absent && md?.marks !== "" && md?.marks !== null && md?.marks !== undefined) {
        const m = parseFloat(String(md.marks));
        if (!isNaN(m)) { to += m; tm += n(cfg?.max_marks) || 100; }
      }
    });
    return { ...s, _total: to, _max: tm, _pct: tm > 0 ? (to / tm) * 100 : 0 };
  }).sort((a, b) => {
    const va = sortCol === "grand_percentage" ? a._pct : n(a.subjects[sortCol]?.percentage);
    const vb = sortCol === "grand_percentage" ? b._pct : n(b.subjects[sortCol]?.percentage);
    return sortDir === "desc" ? vb - va : va - vb;
  }) : [];

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  // ── DASHBOARD EFFECTS ─────────────────────────────────────────
  useEffect(() => { if (dashTab === "school") fetchSchool(); }, [dashTab, dashExam, academicYear]);
  useEffect(() => { if (dashTab === "grade" && dashGrade) { fetchGrade(); fetchLongitudinal(); } }, [dashTab, dashExam, dashGrade, academicYear]);
  useEffect(() => { if (dashTab === "section" && dashGrade && dashSection) fetchSection(); }, [dashTab, dashExam, dashGrade, dashSection, academicYear]);
  useEffect(() => { if ((dashTab === "grade" || dashTab === "section") && dashGrade) fetchDashSections(); }, [dashGrade, dashTab]);
  useEffect(() => { if (dashTab === "student" && studentGrade) fetchStudentSections(); }, [dashTab, studentGrade]);
  useEffect(() => { if (studentGrade && studentSection) fetchSectionStudents(); }, [studentGrade, studentSection]);
  useEffect(() => { if (dashTab === "alerts") fetchPasaAlerts(); }, [dashTab, academicYear]);

  const fetchPasaAlerts = async () => {
    try {
      const r = await axios.get(`${API}/pasa/alerts/decline?academic_year=${academicYear}`);
      setPasaAlerts(r.data || []);
    } catch { }
  };

  const fetchSchool = async () => {
    try { const r = await axios.get(`${API}/pasa/analysis/school?academic_year=${academicYear}&exam_type=${dashExam}`); setSchoolData(r.data); } catch { }
  };
  const fetchGrade = async () => {
    try { const r = await axios.get(`${API}/pasa/analysis/grade?academic_year=${academicYear}&exam_type=${dashExam}&grade=${encodeURIComponent(dashGrade)}`); setGradeData(r.data); } catch { }
  };
  const fetchSection = async () => {
    try { const r = await axios.get(`${API}/pasa/analysis/section?academic_year=${academicYear}&exam_type=${dashExam}&grade=${encodeURIComponent(dashGrade)}&section=${encodeURIComponent(dashSection)}`); setSectionData(r.data); } catch { }
  };
  const fetchLongitudinal = async (sec?: string) => {
    try {
      const url = `${API}/pasa/analysis/longitudinal?academic_year=${academicYear}&grade=${encodeURIComponent(dashGrade)}${sec ? `&section=${encodeURIComponent(sec)}` : ""}`;
      const r = await axios.get(url); setLongData(r.data);
    } catch { }
  };
  const fetchDashSections = async () => {
    try {
      let secs: string[] = [];
      const r = await axios.get(`${API}/pasa/sections?academic_year=${academicYear}&grade=${encodeURIComponent(dashGrade)}`);
      secs = r.data || [];
      if (!secs.length) {
        const sr = await axios.get(`${API}/students?limit=2000`);
        const st = sr.data?.data || sr.data || [];
        secs = ([...new Set(st.filter((s: any) => s.current_class === dashGrade).map((s: any) => s.section).filter(Boolean))] as string[]).sort();
      }
      setDashSections(secs);
      if (secs.length) setDashSection(secs[0]);
    } catch { }
  };
  const fetchStudentSections = async () => {
    try {
      let secs: string[] = [];
      const r = await axios.get(`${API}/pasa/sections?academic_year=${academicYear}&grade=${encodeURIComponent(studentGrade)}`);
      secs = r.data || [];
      if (!secs.length) {
        const sr = await axios.get(`${API}/students?limit=2000`);
        const st = sr.data?.data || sr.data || [];
        secs = ([...new Set(st.filter((s: any) => s.current_class === studentGrade).map((s: any) => s.section).filter(Boolean))] as string[]).sort();
      }
      setStudentSections(secs);
      if (secs.length) setStudentSection(secs[0]);
    } catch { }
  };
  const fetchSectionStudents = async () => {
    try {
      const sr = await axios.get(`${API}/students?limit=2000`);
      const st = sr.data?.data || sr.data || [];
      const names = st
        .filter((s: any) => s.current_class === studentGrade && s.section === studentSection)
        .map((s: any) => s.name)
        .filter(Boolean)
        .sort();
      setSectionStudents(names);
    } catch { }
  };
  const searchStudent = async (q: string) => {
    setStudentSearch(q);
    if (q.length < 2) { setStudentResults([]); return; }
    try { const r = await axios.get(`${API}/pasa/search/students?academic_year=${academicYear}&q=${encodeURIComponent(q)}`); setStudentResults(r.data || []); } catch { }
  };
  const fetchStudentData = async (name: string) => {
    setStudentSearch(name); setStudentResults([]); setStudentData(null);
    try { const r = await axios.get(`${API}/pasa/analysis/student?academic_year=${academicYear}&student_name=${encodeURIComponent(name)}`); setStudentData(r.data); } catch { }
  };
  const dashSortedStudents = (students: any[]) => [...students].sort((a, b) => {
    const va = dashSortCol === "grand_percentage" ? n(a.grand_percentage) : n(a.subjects?.[dashSortCol]?.percentage);
    const vb = dashSortCol === "grand_percentage" ? n(b.grand_percentage) : n(b.subjects?.[dashSortCol]?.percentage);
    return dashSortDir === "desc" ? vb - va : va - vb;
  });
  const toggleDashSort = (col: string) => {
    if (dashSortCol === col) setDashSortDir(d => d === "desc" ? "asc" : "desc");
    else { setDashSortCol(col); setDashSortDir("desc"); }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">PA/SA Marks — Module 3</h1>
          <p className="text-sm text-gray-500">Periodic and Summative Assessment marks entry and analysis</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[{ id: "entry", label: "📝 Marks Entry" }, { id: "dashboard", label: "📊 Dashboard" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${activeTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      {/* ── MARKS ENTRY ── */}
      {activeTab === "entry" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Step 1 — Select Exam, Grade and Section</h2>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Exam Type</label>
                <select value={entryExam} onChange={e => { setEntryExam(e.target.value); setConfigSaved(false); setMarksTable(null); }}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                  {EXAM_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              {entryExam === "Custom" && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Custom Exam Name</label>
                  <input value={customExam} onChange={e => { setCustomExam(e.target.value); setConfigSaved(false); }}
                    placeholder="e.g. Unit Test 1" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={entryGrade} onChange={e => { setEntryGrade(e.target.value); setConfigSaved(false); setMarksTable(null); }}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Section</label>
                <select value={entrySection} onChange={e => setEntrySection(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                  {entrySections.length ? entrySections.map(s => <option key={s} value={s}>{s}</option>) : <option value="">No sections found</option>}
                </select>
              </div>
            </div>

            <h2 className="text-sm font-bold text-gray-700 mb-2">
              Step 2 — Subjects and Max Marks
              <span className="ml-2 text-xs font-normal text-gray-400">(pre-filled from previous config if available)</span>
            </h2>
            {subjects.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {subjects.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-bold text-indigo-700">{s.subject}</span>
                    <span className="text-xs text-gray-400">Max:</span>
                    <input type="number" value={s.max_marks}
                      onChange={e => setSubjects(prev => prev.map((x, j) => j === i ? { ...x, max_marks: +e.target.value } : x))}
                      className="w-16 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center font-bold text-indigo-700" />
                    <button onClick={() => setSubjects(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end mb-3 flex-wrap">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Add Subject</label>
                <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSubject()}
                  placeholder="e.g. MATHEMATICS" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-44" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Max Marks</label>
                <input type="number" value={newMax} onChange={e => setNewMax(+e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-24" />
              </div>
              <button onClick={addSubject} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200">+ Add Subject</button>
              <button onClick={saveConfig} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">💾 Save Config & Load Table</button>
            </div>
            <div className="flex gap-3 items-center pt-3 border-t border-gray-100 flex-wrap">
              <p className="text-xs text-gray-500 font-medium">Import from Excel:</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importExcel} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={importing}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {importing ? "Importing..." : "📥 Import Excel"}
              </button>
              <p className="text-xs text-gray-400">Select exam type first — file auto-detects grades and sections</p>
            </div>
          </div>

          {configSaved && marksTable && (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div>
                  <h2 className="text-sm font-bold text-gray-700">
                    Step 3 — Enter Marks: {entryGrade} — {entrySection} — {effectiveExam}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">{sortedStudents.length} students · Click headers to sort · AB = Mark as Absent</p>
                </div>
                <button onClick={saveMarks} disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold">
                  {saving ? "Saving..." : "💾 Save All Marks"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: `${440 + (marksTable.subjects?.length || 0) * 155}px` }}>
                  <thead>
                    <tr className="bg-indigo-700 text-white">
                      <th className="px-3 py-2 text-left sticky left-0 z-20 bg-indigo-700 border-r border-indigo-600 min-w-[40px]">#</th>
                      <th className="px-3 py-2 text-left sticky left-[40px] z-20 bg-indigo-700 border-r border-indigo-600 min-w-[180px]">Student Name</th>
                      <th className="px-3 py-2 text-center min-w-[70px]">Roll No</th>
                      {marksTable.subjects?.map((sub: string) => {
                        const cfg = marksTable.configs?.find((c: any) => c.subject === sub);
                        return (
                          <th key={sub} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[155px]">
                            <button onClick={() => toggleSort(sub)} className="hover:underline w-full">
                              <div>{sub}</div>
                              <div className="text-indigo-300 text-xs font-normal">Max: {n(cfg?.max_marks) || 100}{sortCol === sub ? (sortDir === "desc" ? " ▼" : " ▲") : ""}</div>
                            </button>
                          </th>
                        );
                      })}
                      <th className="px-3 py-2 text-center sticky right-[100px] z-20 bg-indigo-700 border-l border-indigo-600 min-w-[90px]">Total</th>
                      <th className="px-3 py-2 text-center sticky right-0 z-20 bg-indigo-700 border-l border-indigo-600 min-w-[100px]">
                        <button onClick={() => toggleSort("grand_percentage")} className="hover:underline">
                          Grand % {sortCol === "grand_percentage" ? (sortDir === "desc" ? "▼" : "▲") : ""}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map((student: any, idx: number) => {
                      const studentMarks = marks[student.student_name] || {};
                      const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                      let liveTotal = 0, liveMax = 0;
                      marksTable.subjects?.forEach((sub: string) => {
                        const cfg = marksTable.configs?.find((c: any) => c.subject === sub);
                        const md = studentMarks[sub];
                        if (!md?.is_absent && md?.marks !== "" && md?.marks !== null && md?.marks !== undefined) {
                          const m = parseFloat(String(md.marks));
                          if (!isNaN(m)) { liveTotal += m; liveMax += n(cfg?.max_marks) || 100; }
                        }
                      });
                      const livePct = liveMax > 0 ? (liveTotal / liveMax) * 100 : 0;
                      return (
                        <tr key={student.student_name} className={`border-b border-gray-100 ${bg}`}>
                          <td className={`px-3 py-1.5 text-gray-400 sticky left-0 z-10 border-r border-gray-200 ${bg}`}>{idx + 1}</td>
                          <td className={`px-3 py-1.5 font-medium text-gray-800 sticky left-[40px] z-10 border-r border-gray-200 ${bg}`}>{student.student_name}</td>
                          <td className="px-3 py-1.5 text-center text-gray-500">{student.roll_number || "—"}</td>
                          {marksTable.subjects?.map((sub: string) => {
                            const cfg = marksTable.configs?.find((c: any) => c.subject === sub);
                            const md = studentMarks[sub] || {};
                            const maxMarks = n(cfg?.max_marks) || 100;
                            const markVal = parseFloat(String(md.marks));
                            const subPct = !md.is_absent && !isNaN(markVal) && md.marks !== "" ? (markVal / maxMarks) * 100 : null;
                            return (
                              <td key={sub} className={`px-1 py-1 text-center border-l border-gray-100 ${bg}`}>
                                {md.is_absent ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">ABSENT</span>
                                    <button onClick={() => toggleAbsent(student.student_name, sub)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">✕</button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 justify-center">
                                    <input type="number" value={md.marks ?? ""} min={0} max={maxMarks} step={0.25}
                                      onChange={e => updateMark(student.student_name, sub, e.target.value)}
                                      className={`w-16 text-center border rounded px-1 py-0.5 text-xs font-medium ${subPct !== null
                                        ? subPct >= 80 ? "border-green-300 bg-green-50 text-green-800"
                                          : subPct >= 60 ? "border-blue-300 bg-blue-50 text-blue-800"
                                          : subPct >= 33 ? "border-yellow-300 bg-yellow-50 text-yellow-800"
                                          : "border-red-300 bg-red-50 text-red-800"
                                        : "border-gray-300"}`} />
                                    {subPct !== null && <span className={`text-xs font-bold ${scoreColor(subPct)}`}>{subPct.toFixed(0)}%</span>}
                                    <button onClick={() => toggleAbsent(student.student_name, sub)}
                                      className="text-xs text-gray-300 hover:text-red-500 font-bold ml-0.5" title="Mark absent">AB</button>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className={`px-3 py-1.5 text-center sticky right-[100px] z-10 border-l border-gray-200 ${bg}`}>
                            <span className={`font-bold text-xs ${scoreColor(livePct)}`}>{liveTotal.toFixed(1)}/{liveMax}</span>
                          </td>
                          <td className={`px-3 py-1.5 text-center sticky right-0 z-10 border-l border-gray-200 ${bg}`}>
                            {liveMax > 0 ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(livePct)}`}>{fmtPct(livePct)}</span> : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {sortedStudents.length > 0 && (
                      <tr className="bg-indigo-50 border-t-2 border-indigo-300 font-bold">
                        <td className="px-3 py-2 sticky left-0 bg-indigo-50 border-r border-gray-200" />
                        <td className="px-3 py-2 text-indigo-700 text-xs sticky left-[40px] bg-indigo-50 border-r border-gray-200">Class Average ({sortedStudents.length})</td>
                        <td />
                        {marksTable.subjects?.map((sub: string) => {
                          const cfg = marksTable.configs?.find((c: any) => c.subject === sub);
                          const maxMarks = n(cfg?.max_marks) || 100;
                          const vals = sortedStudents.filter((s: any) => {
                            const md = marks[s.student_name]?.[sub];
                            return !md?.is_absent && md?.marks !== "" && md?.marks !== null && md?.marks !== undefined;
                          }).map((s: any) => parseFloat(String(marks[s.student_name][sub].marks)) || 0);
                          const avgMark = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                          const avgPct = (avgMark / maxMarks) * 100;
                          return (
                            <td key={sub} className="px-2 py-2 text-center border-l border-indigo-200">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(avgPct)}`}>
                                {avgMark.toFixed(1)} ({avgPct.toFixed(1)}%)
                              </span>
                            </td>
                          );
                        })}
                        {(() => {
                          const totalPcts = sortedStudents.map(s => {
                            let to = 0, tm = 0;
                            marksTable.subjects?.forEach((sub: string) => {
                              const cfg = marksTable.configs?.find((c: any) => c.subject === sub);
                              const md = marks[s.student_name]?.[sub];
                              if (!md?.is_absent && md?.marks !== "" && md?.marks !== null && md?.marks !== undefined) {
                                const m = parseFloat(String(md.marks));
                                if (!isNaN(m)) { to += m; tm += n(cfg?.max_marks) || 100; }
                              }
                            });
                            return tm > 0 ? (to / tm) * 100 : 0;
                          });
                          const classAvgPct = totalPcts.length ? totalPcts.reduce((a, b) => a + b, 0) / totalPcts.length : 0;
                          return (
                            <>
                              <td className="px-3 py-2 text-center sticky right-[100px] bg-indigo-50 border-l border-gray-200"><span className="text-xs font-bold text-indigo-700">Avg</span></td>
                              <td className="px-3 py-2 text-center sticky right-0 bg-indigo-50 border-l border-gray-200">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(classAvgPct)}`}>{fmtPct(classAvgPct)}</span>
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!configSaved && entryGrade && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-sm text-yellow-800 font-medium">Configure subjects and max marks above, then click <strong>Save Config & Load Table</strong></p>
              <p className="text-xs text-yellow-600 mt-1">Or import an Excel file directly</p>
            </div>
          )}
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {activeTab === "dashboard" && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { id: "school", label: "🏫 School" },
              { id: "grade", label: "📚 Grade" },
              { id: "section", label: "🏛 Section" },
              { id: "student", label: "👤 Student" },
              { id: "alerts", label: "⚠️ Alerts" },
            ].map(t => (
              <button key={t.id} onClick={() => setDashTab(t.id as any)}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${dashTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {dashTab !== "student" && dashTab !== "alerts" && (
            <div className="flex gap-3 mb-4 items-end flex-wrap">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Exam</label>
                <select value={dashExam} onChange={e => setDashExam(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {EXAM_TYPES.filter(e => e !== "Custom").map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              {(dashTab === "grade" || dashTab === "section") && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Grade</label>
                  <select value={dashGrade} onChange={e => setDashGrade(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}
              {dashTab === "section" && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Section</label>
                  <select value={dashSection} onChange={e => setDashSection(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    {dashSections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* SCHOOL */}
          {dashTab === "school" && (schoolData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total Students", value: schoolData.total_students, color: "border-indigo-500" },
                  { label: "School Avg %", value: fmtPct(n(schoolData.school_avg)), color: "border-green-500" },
                  { label: "Total Grades", value: schoolData.grades?.length, color: "border-blue-500" },
                  { label: "Exam", value: schoolData.exam_type, color: "border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Grade-wise Average %</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={Object.entries(schoolData.grade_averages || {}).map(([g, v]) => ({ name: g.replace("Grade ", "G"), avg: n(v), full: g }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any, _, p) => [`${v}%`, p.payload.full]} />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {Object.entries(schoolData.grade_averages || {}).map(([_, v], i) => (
                          <Cell key={i} fill={n(v) >= 80 ? "#10b981" : n(v) >= 60 ? "#6366f1" : n(v) >= 40 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise School Average %</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={Object.entries(schoolData.subject_averages || {}).map(([s, v]) => ({ name: s, avg: n(v) }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip formatter={(v: any) => [`${v}%`, "Avg"]} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                        {Object.entries(schoolData.subject_averages || {}).map((_, i) => <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">School Grade Band Distribution</h3>
                <div className="flex gap-3 flex-wrap">
                  {Object.entries(schoolData.overall_band_distribution || {}).map(([band, data]: [string, any]) => (
                    <div key={band} className="flex-1 min-w-[100px] rounded-lg p-3 text-center border"
                      style={{ backgroundColor: BAND_COLORS[band] + "15", borderColor: BAND_COLORS[band] }}>
                      <p className="text-xs font-bold" style={{ color: BAND_COLORS[band] }}>{schoolData.grade_bands?.find((b: any) => b.key === band)?.label || band}</p>
                      <p className="text-xl font-bold text-gray-800">{data.count}</p>
                      <p className="text-xs text-gray-500">{data.percentage}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400"><p className="text-sm">No data for {dashExam}. Import or enter marks first.</p></div>
          )}

          {/* GRADE */}
          {dashTab === "grade" && (gradeData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Sections", value: gradeData.sections?.length, color: "border-indigo-500" },
                  { label: "Subjects", value: gradeData.subjects?.length, color: "border-blue-500" },
                  { label: "Top Student", value: gradeData.top10?.[0]?.student_name?.split(" ")[0] || "—", color: "border-green-500" },
                  { label: "Exam", value: gradeData.exam_type, color: "border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-lg font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Section-wise Average %</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={Object.entries(gradeData.section_averages || {}).map(([s, v]) => ({ name: s, avg: n(v) }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => [`${v}%`, "Avg"]} />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {Object.entries(gradeData.section_averages || {}).map((_, i) => <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Average %</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={Object.entries(gradeData.subject_averages || {}).map(([s, v]) => ({ name: s, avg: n(v) }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip formatter={(v: any) => [`${v}%`, "Avg"]} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                        {Object.entries(gradeData.subject_averages || {}).map((_, i) => <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grade Band Distribution per Subject — NEW */}
              {gradeData.band_distribution && Object.keys(gradeData.band_distribution).length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Grade Band Distribution per Subject</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left border border-gray-200 min-w-[120px]">Subject</th>
                          {gradeData.grade_bands?.map((b: any) => (
                            <th key={b.key} className="px-3 py-2 text-center border border-gray-200 min-w-[100px]"
                              style={{ color: b.color }}>{b.label}</th>
                          ))}
                          <th className="px-3 py-2 text-center border border-gray-200 font-bold">Avg %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradeData.subjects?.map((sub: string, i: number) => (
                          <tr key={sub} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 border border-gray-200 font-semibold text-gray-700">{sub}</td>
                            {gradeData.grade_bands?.map((b: any) => {
                              const dist = gradeData.band_distribution?.[sub]?.[b.key];
                              return (
                                <td key={b.key} className="px-3 py-2 text-center border border-gray-200">
                                  {dist?.count > 0 ? (
                                    <div>
                                      <span className="font-bold text-sm" style={{ color: b.color }}>{dist.count}</span>
                                      <span className="text-gray-400 text-xs ml-1">({dist.percentage}%)</span>
                                    </div>
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center border border-gray-200">
                              <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${scoreBg(n(gradeData.subject_averages?.[sub]))}`}>
                                {fmtPct(n(gradeData.subject_averages?.[sub]))}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {/* Overall row */}
                        {gradeData.overall_band_distribution && (
                          <tr className="bg-indigo-50 border-t-2 border-indigo-300 font-bold">
                            <td className="px-3 py-2 border border-gray-200 text-indigo-700">Overall</td>
                            {gradeData.grade_bands?.map((b: any) => {
                              const dist = gradeData.overall_band_distribution?.[b.key];
                              return (
                                <td key={b.key} className="px-3 py-2 text-center border border-gray-200">
                                  {dist?.count > 0 ? (
                                    <div>
                                      <span className="font-bold text-sm" style={{ color: b.color }}>{dist.count}</span>
                                      <span className="text-gray-400 text-xs ml-1">({dist.percentage}%)</span>
                                    </div>
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center border border-gray-200">
                              <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${scoreBg(n(gradeData.grade_avg))}`}>
                                {fmtPct(n(gradeData.grade_avg))}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Longitudinal */}
              {longData?.data?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">📈 Longitudinal — Subject Average across Exams (only conducted exams)</h3>
                  <p className="text-xs text-gray-400 mb-3">X = Exam · Y = Avg % · Each line = one subject · Dashed = Overall</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={longData.data} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exam" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any, name: any) => [`${v}%`, name]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                      {gradeData.subjects?.map((sub: string, i: number) => (
                        <Line key={sub} type="monotone" dataKey={sub} stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                          strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                      ))}
                      <Line type="monotone" dataKey="Overall" stroke="#374151" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">🏆 Top 10 Students</h3>
                  <div className="space-y-1">
                    {gradeData.top10?.map((s: any, i: number) => (
                      <div key={s.student_name} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-700 w-5">{i + 1}.</span>
                          <span className="text-xs font-medium text-gray-800">{s.student_name}</span>
                          <span className="text-xs text-gray-400">{s.section}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(n(s.grand_percentage))}`}>{fmtPct(n(s.grand_percentage))}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">📉 Bottom 10 Students</h3>
                  <div className="space-y-1">
                    {gradeData.bottom10?.map((s: any, i: number) => (
                      <div key={s.student_name} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-700 w-5">{i + 1}.</span>
                          <span className="text-xs font-medium text-gray-800">{s.student_name}</span>
                          <span className="text-xs text-gray-400">{s.section}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(n(s.grand_percentage))}`}>{fmtPct(n(s.grand_percentage))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400"><p className="text-sm">No data for {dashGrade} — {dashExam}.</p></div>
          )}

          {/* SECTION */}
          {dashTab === "section" && (sectionData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Total Students", value: sectionData.total_students, color: "border-indigo-500" },
                  { label: "Section Avg %", value: fmtPct(n(sectionData.section_avg)), color: "border-green-500" },
                  { label: "Subjects", value: sectionData.subjects?.length, color: "border-blue-500" },
                  { label: "Grade", value: sectionData.grade, color: "border-purple-500" },
                  { label: "Section", value: sectionData.section, color: "border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-lg font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              <RankingLineChart students={sectionData.students_ranked || []} title={`Student Rankings — ${sectionData.section} (Top to Bottom by Grand %)`} />

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Average %</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={Object.entries(sectionData.subject_averages || {}).map(([s, v]) => ({ name: s, avg: n(v) }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip formatter={(v: any) => [`${v}%`, "Avg"]} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                        {Object.entries(sectionData.subject_averages || {}).map((_, i) => <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Pass/Fail per Subject (pass = 33%+)</h3>
                  <div className="space-y-2 mt-2">
                    {Object.entries(sectionData.pass_fail || {}).map(([sub, data]: [string, any]) => (
                      <div key={sub} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700 w-28 truncate">{sub}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-5 overflow-hidden flex">
                          <div className="bg-green-500 h-full flex items-center justify-center text-white text-xs font-bold" style={{ width: `${data.pass_pct}%` }}>{data.pass_pct > 15 ? data.pass : ""}</div>
                          <div className="bg-red-400 h-full flex items-center justify-center text-white text-xs font-bold" style={{ width: `${100 - data.pass_pct}%` }}>{(100 - data.pass_pct) > 15 ? data.fail : ""}</div>
                        </div>
                        <span className="text-xs text-green-700 font-bold w-14 text-right">{data.pass_pct}% pass</span>
                        {data.absent > 0 && <span className="text-xs text-gray-400">{data.absent} AB</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Grand % vs Subject Comparison</h3>
                <div className="grid grid-cols-2 gap-4">
                  {sectionData.subjects?.map((sub: string, i: number) => (
                    <GrandVsSubjectChart key={sub} data={sectionData.grand_vs_subject?.[sub] || []} subjectName={sub} color={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
                  ))}
                </div>
              </div>

              {/* Band table */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Grade Band Distribution per Subject</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left border border-gray-200 min-w-[120px]">Subject</th>
                        {sectionData.grade_bands?.map((b: any) => (
                          <th key={b.key} className="px-3 py-2 text-center border border-gray-200 min-w-[100px]" style={{ color: b.color }}>{b.label}</th>
                        ))}
                        <th className="px-3 py-2 text-center border border-gray-200 font-bold">Avg %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionData.subjects?.map((sub: string, i: number) => (
                        <tr key={sub} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 border border-gray-200 font-semibold text-gray-700">{sub}</td>
                          {sectionData.grade_bands?.map((b: any) => {
                            const dist = sectionData.band_distribution?.[sub]?.[b.key];
                            return (
                              <td key={b.key} className="px-3 py-2 text-center border border-gray-200">
                                {dist?.count > 0 ? <div><span className="font-bold text-sm" style={{ color: b.color }}>{dist.count}</span><span className="text-gray-400 text-xs ml-1">({dist.percentage}%)</span></div> : <span className="text-gray-300">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center border border-gray-200">
                            <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${scoreBg(n(sectionData.subject_averages?.[sub]))}`}>{fmtPct(n(sectionData.subject_averages?.[sub]))}</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-indigo-50 border-t-2 border-indigo-300 font-bold">
                        <td className="px-3 py-2 border border-gray-200 text-indigo-700">Overall</td>
                        {sectionData.grade_bands?.map((b: any) => {
                          const dist = sectionData.overall_band_distribution?.[b.key];
                          return (
                            <td key={b.key} className="px-3 py-2 text-center border border-gray-200">
                              {dist?.count > 0 ? <div><span className="font-bold text-sm" style={{ color: b.color }}>{dist.count}</span><span className="text-gray-400 text-xs ml-1">({dist.percentage}%)</span></div> : <span className="text-gray-300">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center border border-gray-200">
                          <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${scoreBg(n(sectionData.section_avg))}`}>{fmtPct(n(sectionData.section_avg))}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Student rankings */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Student Rankings — {sectionData.section} ({sectionData.total_students} students)
                  <span className="ml-2 text-xs font-normal text-gray-400">Click headers to sort</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ minWidth: `${400 + (sectionData.subjects?.length || 0) * 110}px` }}>
                    <thead>
                      <tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-center sticky left-0 bg-indigo-700 border-r border-indigo-600 min-w-[50px]">Rank</th>
                        <th className="px-3 py-2 text-left sticky left-[50px] bg-indigo-700 border-r border-indigo-600 min-w-[160px]">Student</th>
                        {sectionData.subjects?.map((sub: string) => (
                          <th key={sub} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[100px]">
                            <button onClick={() => toggleDashSort(sub)} className="hover:underline w-full">
                              {sub} {dashSortCol === sub ? (dashSortDir === "desc" ? "▼" : "▲") : ""}
                            </button>
                          </th>
                        ))}
                        <th className="px-3 py-2 text-center border-l border-indigo-600 min-w-[80px]">
                          <button onClick={() => toggleDashSort("grand_percentage")} className="hover:underline">
                            Grand % {dashSortCol === "grand_percentage" ? (dashSortDir === "desc" ? "▼" : "▲") : ""}
                          </button>
                        </th>
                        <th className="px-3 py-2 text-center min-w-[60px]">Band</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashSortedStudents(sectionData.students_ranked || []).map((s: any, i: number) => (
                        <tr key={s.student_name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 text-center font-bold text-gray-400 sticky left-0 bg-inherit border-r border-gray-200">{s.rank}</td>
                          <td className="px-3 py-2 font-medium text-gray-800 sticky left-[50px] bg-inherit border-r border-gray-200">{s.student_name}</td>
                          {sectionData.subjects?.map((sub: string) => {
                            const sd = s.subjects?.[sub];
                            return (
                              <td key={sub} className="px-2 py-2 text-center border-l border-gray-100">
                                {sd?.is_absent ? <span className="text-red-400 text-xs font-bold">AB</span>
                                  : sd?.percentage !== null && sd?.percentage !== undefined ? (
                                    <div><span className="font-bold">{sd.marks}</span><br /><span className={`text-xs px-1 py-0.5 rounded ${scoreBg(n(sd.percentage))}`}>{n(sd.percentage).toFixed(1)}%</span></div>
                                  ) : <span className="text-gray-300">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center border-l border-gray-100">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(n(s.grand_percentage))}`}>
                              {s.grand_percentage ? fmtPct(n(s.grand_percentage)) : "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {s.band && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: BAND_COLORS[s.band] + "20", color: BAND_COLORS[s.band] }}>{s.band}</span>}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-indigo-50 border-t-2 border-indigo-300 font-bold">
                        <td colSpan={2} className="px-3 py-2 text-indigo-700 text-xs sticky left-0 bg-indigo-50">Subject Average</td>
                        {sectionData.subjects?.map((sub: string) => (
                          <td key={sub} className="px-2 py-2 text-center border-l border-indigo-200">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${scoreBg(n(sectionData.subject_averages?.[sub]))}`}>{fmtPct(n(sectionData.subject_averages?.[sub]))}</span>
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center border-l border-indigo-200">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(n(sectionData.section_avg))}`}>{fmtPct(n(sectionData.section_avg))}</span>
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400"><p className="text-sm">No data for {dashGrade} — {dashSection} — {dashExam}.</p></div>
          )}

          {/* STUDENT */}
          {dashTab === "student" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Find Student</h3>
                <div className="flex gap-3 items-end flex-wrap mb-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Grade</label>
                    <select value={studentGrade} onChange={e => setStudentGrade(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                      {grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Section</label>
                    <select value={studentSection} onChange={e => setStudentSection(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                      {studentSections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-gray-500 block mb-1">Select Student</label>
                    <select onChange={e => e.target.value && fetchStudentData(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                      <option value="">-- Select student --</option>
                      {sectionStudents.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="text-gray-400 text-xs self-center">or</div>
                  <div className="relative flex-1 min-w-[200px]">
                    <label className="text-xs text-gray-500 block mb-1">Search by Name</label>
                    <input value={studentSearch} onChange={e => searchStudent(e.target.value)}
                      placeholder="Type name to search..." className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full" />
                    {studentResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 max-h-60 overflow-y-auto">
                        {studentResults.map((s: any) => (
                          <button key={s.student_name} onClick={() => fetchStudentData(s.student_name)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 border-b border-gray-100">
                            <span className="font-medium text-gray-800">{s.student_name}</span>
                            <span className="text-xs text-gray-400">{s.grade} — {s.section}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {studentData && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <p className="text-lg font-bold text-gray-800">{studentData.student_name}</p>
                        <p className="text-sm text-gray-500">{studentData.grade} — {studentData.section}</p>
                      </div>
                      {studentData.exam_summary?.map((e: any) => (
                        <div key={e.exam} className="text-center border border-gray-200 rounded-lg px-3 py-2 min-w-[70px]">
                          <p className="text-xs font-bold text-gray-500">{e.exam}</p>
                          <p className={`text-sm font-bold ${scoreColor(n(e.grand_percentage))}`}>{e.grand_percentage ? fmtPct(n(e.grand_percentage)) : "—"}</p>
                          {e.band && <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: BAND_COLORS[e.band] + "20", color: BAND_COLORS[e.band] }}>{e.band}</span>}
                          {studentData.rank_per_exam?.[e.exam] && <p className="text-xs text-indigo-600 font-bold mt-0.5">#{studentData.rank_per_exam[e.exam]}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {studentData.subject_trend?.length > 1 && (
                    <div className="bg-white rounded-xl shadow p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">📈 Longitudinal — Subject Performance Across Exams</h3>
                      <p className="text-xs text-gray-400 mb-3">X = Exam · Y = % · Each line = one subject · Only conducted exams shown</p>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={studentData.subject_trend} margin={{ top: 5, right: 20, left: 0, bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="exam" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: any, name: any) => [v !== null ? `${v}%` : "Not taken", name]} />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                          {studentData.subjects?.map((sub: string, i: number) => (
                            <Line key={sub} type="monotone" dataKey={sub} stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                              strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                          ))}
                          <Line type="monotone" dataKey="Overall" stroke="#374151" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5 }} activeDot={{ r: 7 }} connectNulls={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">All Exams × All Subjects</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse" style={{ minWidth: `${300 + (studentData.subjects?.length || 0) * 130}px` }}>
                        <thead>
                          <tr className="bg-indigo-700 text-white">
                            <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 border-r border-indigo-600 min-w-[70px]">Exam</th>
                            {studentData.subjects?.map((sub: string) => (
                              <th key={sub} className="px-3 py-2 text-center border-l border-indigo-600 min-w-[120px]">{sub}</th>
                            ))}
                            <th className="px-3 py-2 text-center border-l border-indigo-600 min-w-[80px]">Grand %</th>
                            <th className="px-3 py-2 text-center min-w-[60px]">Band</th>
                            <th className="px-3 py-2 text-center min-w-[60px]">Rank</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentData.exam_summary?.map((e: any, i: number) => (
                            <tr key={e.exam} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-3 py-2 font-bold text-indigo-700 sticky left-0 bg-inherit border-r border-gray-200">{e.exam}</td>
                              {studentData.subjects?.map((sub: string) => {
                                const sd = e.subjects?.[sub];
                                return (
                                  <td key={sub} className="px-3 py-2 text-center border-l border-gray-100">
                                    {sd?.is_absent ? <span className="text-red-400 font-bold text-xs">ABSENT</span>
                                      : sd?.marks !== null && sd?.marks !== undefined ? (
                                        <div><span className="font-bold">{sd.marks}</span><span className="text-gray-400 text-xs">/{sd.max_marks}</span><br />
                                          <span className={`text-xs px-1.5 py-0.5 rounded ${scoreBg(n(sd.percentage))}`}>{n(sd.percentage).toFixed(1)}%</span></div>
                                      ) : <span className="text-gray-300">—</span>}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-center border-l border-gray-100">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(n(e.grand_percentage))}`}>
                                  {e.grand_percentage ? fmtPct(n(e.grand_percentage)) : "—"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                {e.band && <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: BAND_COLORS[e.band] + "20", color: BAND_COLORS[e.band] }}>{e.band}</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {studentData.rank_per_exam?.[e.exam] ? <span className="font-bold text-indigo-700">#{studentData.rank_per_exam[e.exam]}</span> : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {!studentData && (
                <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
                  <p className="text-sm">Select a grade, section and student above to view their complete analysis</p>
                </div>
              )}
            </div>
          )}

          {/* ALERTS */}
          {dashTab === "alerts" && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-yellow-800 mb-1">⚠️ Consecutive Score Decline Alert</h3>
                <p className="text-xs text-yellow-600">
                  Students whose overall grand % has dropped across 3 consecutive exams — needs attention.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Students with Consecutive Decline ({pasaAlerts.length})
                </h3>
                {pasaAlerts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No students with 3 consecutive exam declines found for {academicYear}.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pasaAlerts.map((s: any, i: number) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-sm font-bold text-red-800">{s.student_name}</span>
                            <span className="text-xs text-gray-500 ml-2">{s.grade} — {s.section}</span>
                          </div>
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                            Drop: {s.decline_from}% → {s.decline_to}% (-{s.drop}%)
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {s.exam_scores.map((sc: any, j: number) => (
                            <div key={j} className={`text-center rounded-lg px-3 py-2 text-xs border min-w-[70px] ${
                              j > 0 && sc.pct < s.exam_scores[j - 1].pct ? "bg-red-100 border-red-300" : "bg-gray-50 border-gray-200"
                            }`}>
                              <p className="font-bold text-sm text-gray-800">{sc.pct}%</p>
                              <p className="text-gray-600 font-medium">{sc.exam}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
