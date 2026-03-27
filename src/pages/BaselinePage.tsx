import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts";

const API = "http://localhost:3000";

const generateAcademicYears = () => {
  const years = [];
  for (let i = 2025; i <= 2035; i++) {
    years.push(`${i}-${String(i + 1).slice(2)}`);
  }
  return years;
};
const ACADEMIC_YEARS = generateAcademicYears();

const ROUNDS = [
  { value: "baseline_1", label: "Baseline 1" },
  { value: "baseline_2", label: "Baseline 2" },
  { value: "baseline_3", label: "Baseline 3" },
  { value: "midline", label: "Midline" },
  { value: "endline", label: "Endline" },
];

const GRADES = [
  "Pre-KG", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
];

const STAGES = [
  { value: "foundation", label: "Foundation (Pre-KG to Grade 2)" },
  { value: "preparatory", label: "Preparatory (Grade 3-5)" },
  { value: "middle", label: "Middle (Grade 6-8)" },
  { value: "secondary", label: "Secondary (Grade 9-10)" },
];

const levelBg = (level: string) => {
  if (level?.includes("4")) return "bg-green-100 text-green-800";
  if (level?.includes("3")) return "bg-blue-100 text-blue-800";
  if (level?.includes("2")) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

const scoreBg = (s: number) =>
  s >= 80 ? "bg-green-100 text-green-800" :
  s >= 60 ? "bg-blue-100 text-blue-800" :
  s >= 40 ? "bg-yellow-100 text-yellow-800" :
  s > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-400";

export default function BaselinePage() {
  const [activeTab, setActiveTab] = useState<"entry" | "teacher" | "dashboard">("entry");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [round, setRound] = useState("baseline_1");
  const [grade, setGrade] = useState("Grade 1");
  const [sections, setSections] = useState<string[]>([]);
  const [section, setSection] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [studentData, setStudentData] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Teacher entry
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherStage, setTeacherStage] = useState("foundation");
  const [teacherScores, setTeacherScores] = useState<Record<string, Record<string, string>>>({});
  const [savingTeacher, setSavingTeacher] = useState(false);

  // Dashboard
  const [dashTab, setDashTab] = useState<"school" | "grade" | "teachers" | "alerts">("school");
  const [schoolData, setSchoolData] = useState<any>(null);
  const [gradeData, setGradeData] = useState<any>(null);
  const [teacherDashData, setTeacherDashData] = useState<any>(null);
  const [studentAlerts, setStudentAlerts] = useState<any[]>([]);
  const [teacherAlerts, setTeacherAlerts] = useState<any[]>([]);
  const [dashGrade, setDashGrade] = useState("Grade 1");
  const [schoolDashTab, setSchoolDashTab] = useState<"numeracy" | "literacy" | "overall">("overall");
  const [gradeDashTab, setGradeDashTab] = useState<"numeracy" | "literacy" | "overall">("overall");
  const [teacherDashTab, setTeacherDashTab] = useState<"overall" | "literacy" | "numeracy">("overall");

  useEffect(() => { if (grade) fetchSections(); }, [grade]);
  useEffect(() => { if (grade && section) fetchStudents(); }, [grade, section, academicYear, round]);
  useEffect(() => { fetchTeachers(); }, []);

  useEffect(() => {
    if (dashTab === "school") fetchSchoolDash();
    if (dashTab === "grade") fetchGradeDash();
    if (dashTab === "teachers") fetchTeacherDash();
    if (dashTab === "alerts") fetchAlerts();
  }, [dashTab, academicYear, round, dashGrade]);

  const fetchSections = async () => {
    try {
      const r = await axios.get(`${API}/students?limit=2000`);
      const students = r.data?.data || r.data || [];
      const secs = [...new Set(
        students.filter((s: any) => s.current_class === grade).map((s: any) => s.section).filter(Boolean)
      )] as string[];
      setSections(secs.sort());
      if (secs.length) setSection(secs[0]);
    } catch { }
  };

  const fetchStudents = async () => {
    try {
      const r = await axios.get(`${API}/baseline/section?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&academic_year=${academicYear}&round=${round}`);
      setStudentData(r.data || []);
      const s: Record<string, any> = {};
      (r.data || []).forEach((st: any) => {
        s[st.student_id] = {
          listening: st.assessment?.listening_score || "",
          speaking: st.assessment?.speaking_score || "",
          reading: st.assessment?.reading_score || "",
          writing: st.assessment?.writing_score || "",
          operations: st.assessment?.operations_score || "",
          base10: st.assessment?.base10_score || "",
          measurement: st.assessment?.measurement_score || "",
          geometry: st.assessment?.geometry_score || "",
          stage: st.assessment?.stage || "foundation",
        };
      });
      setScores(s);
    } catch { }
  };

  const fetchTeachers = async () => {
    try {
      const r = await axios.get(`${API}/users?role=teacher`);
      setTeachers(r.data || []);
    } catch { }
  };

  const fetchSchoolDash = async () => {
    try {
      const r = await axios.get(`${API}/baseline/dashboard/school?academic_year=${academicYear}&round=${round}`);
      setSchoolData(r.data);
    } catch { }
  };

  const fetchGradeDash = async () => {
    try {
      const r = await axios.get(`${API}/baseline/dashboard/grade/${encodeURIComponent(dashGrade)}?academic_year=${academicYear}&round=${round}`);
      setGradeData(r.data);
    } catch { }
  };

  const fetchTeacherDash = async () => {
    try {
      const r = await axios.get(`${API}/baseline/dashboard/teachers?academic_year=${academicYear}&round=${round}`);
      setTeacherDashData(r.data);
    } catch { }
  };

  const fetchAlerts = async () => {
    try {
      const [sr, tr] = await Promise.all([
        axios.get(`${API}/baseline/alerts/students?academic_year=${academicYear}`),
        axios.get(`${API}/baseline/alerts/teachers?academic_year=${academicYear}`),
      ]);
      setStudentAlerts(sr.data || []);
      setTeacherAlerts(tr.data || []);
    } catch { }
  };

  const updateScore = (studentId: string, field: string, val: string) => {
    setScores(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [field]: val } }));
  };

  const saveScores = async () => {
    setSaving(true);
    try {
      const assessments = studentData.map(st => ({
        student_id: st.student_id,
        student_name: st.student_name,
        listening_score: scores[st.student_id]?.listening || undefined,
        speaking_score: scores[st.student_id]?.speaking || undefined,
        reading_score: scores[st.student_id]?.reading || undefined,
        writing_score: scores[st.student_id]?.writing || undefined,
        operations_score: scores[st.student_id]?.operations || undefined,
        base10_score: scores[st.student_id]?.base10 || undefined,
        measurement_score: scores[st.student_id]?.measurement || undefined,
        geometry_score: scores[st.student_id]?.geometry || undefined,
        stage: scores[st.student_id]?.stage || "foundation",
      }));
      await axios.post(`${API}/baseline/section`, { grade, section, academic_year: academicYear, round, assessment_date: assessmentDate, assessments });
      setMessage("✅ Saved successfully");
      fetchStudents();
    } catch { setMessage("❌ Error saving"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const saveTeacherScore = async () => {
    setSavingTeacher(true);
    let saved = 0;
    try {
      for (const teacher of teachers) {
        const sc = teacherScores[teacher.id];
        if (!sc) continue;
        const hasData = Object.values(sc).some(v => v && v !== "");
        if (!hasData) continue;
        await axios.post(`${API}/baseline/teacher`, {
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          academic_year: academicYear,
          round,
          stage: sc.stage || teacherStage,
          subject: "literacy",
          assessment_date: assessmentDate,
          listening_score: sc.listening || undefined,
          speaking_score: sc.speaking || undefined,
          reading_score: sc.reading || undefined,
          writing_score: sc.writing || undefined,
          operations_score: sc.operations || undefined,
          base10_score: sc.base10 || undefined,
          measurement_score: sc.measurement || undefined,
          geometry_score: sc.geometry || undefined,
        });
        saved++;
      }
      setMessage(`✅ Saved ${saved} teacher baseline records`);
    } catch { setMessage("❌ Error saving"); }
    setSavingTeacher(false);
    setTimeout(() => setMessage(""), 3000);
  };

  // Score input for students
  const ScoreInput = ({ studentId, field }: { studentId: string; field: string }) => {
    const val = scores[studentId]?.[field] || "";
    const num = parseFloat(val);
    const color = !isNaN(num) && val !== "" ? (num >= 80 ? "border-green-400 bg-green-50" : num >= 60 ? "border-blue-400 bg-blue-50" : num >= 40 ? "border-yellow-400 bg-yellow-50" : "border-red-400 bg-red-50") : "border-gray-300";
    return (
      <input type="number" min={0} max={100} step={0.5}
        value={val}
        onChange={e => updateScore(studentId, field, e.target.value)}
        placeholder="—"
        className={`w-14 text-center text-xs border rounded px-1 py-0.5 ${color}`} />
    );
  };

  const calcAverages = (sc: any) => {
    const litVals = [sc?.listening, sc?.speaking, sc?.reading, sc?.writing].map(v => parseFloat(v)).filter(v => !isNaN(v));
    const numVals = [sc?.operations, sc?.base10, sc?.measurement, sc?.geometry].map(v => parseFloat(v)).filter(v => !isNaN(v));
    const litAvg = litVals.length ? +(litVals.reduce((a, b) => a + b, 0) / litVals.length).toFixed(1) : null;
    const numAvg = numVals.length ? +(numVals.reduce((a, b) => a + b, 0) / numVals.length).toFixed(1) : null;
    const both = [litAvg, numAvg].filter(v => v !== null) as number[];
    const overall = both.length ? +(both.reduce((a, b) => a + b, 0) / both.length).toFixed(1) : null;
    const level = overall !== null ? (overall >= 80 ? "Level 4 – Exceeding" : overall >= 60 ? "Level 3 – Meeting" : overall >= 40 ? "Level 2 – Approaching" : "Level 1 – Beginning") : null;
    return { litAvg, numAvg, overall, level };
  };

  const EntryTableHeaders = () => (
    <>
      <tr className="bg-indigo-700 text-white">
        <th className="px-3 py-2 text-left sticky left-0 z-20 bg-indigo-700 border-r border-indigo-600 min-w-[180px]">Name</th>
        <th className="px-2 py-2 text-center min-w-[90px]">Stage</th>
        <th className="px-2 py-2 text-center border-l border-indigo-500 bg-blue-700" colSpan={4}>📚 Literacy</th>
        <th className="px-2 py-2 text-center border-l border-indigo-500 bg-purple-700" colSpan={4}>🔢 Numeracy</th>
        <th className="px-2 py-2 text-center border-l border-indigo-600 min-w-[70px]">Lit Avg</th>
        <th className="px-2 py-2 text-center min-w-[70px]">Num Avg</th>
        <th className="px-2 py-2 text-center min-w-[80px]">Overall</th>
        <th className="px-2 py-2 text-center min-w-[100px]">Level</th>
      </tr>
      <tr className="bg-gray-100 text-gray-600 text-xs">
        <th className="px-3 py-1.5 sticky left-0 z-20 bg-gray-100 border-r border-gray-200" />
        <th className="px-2 py-1.5" />
        <th className="px-2 py-1.5 text-center border-l border-gray-200">Listen</th>
        <th className="px-2 py-1.5 text-center">Speak</th>
        <th className="px-2 py-1.5 text-center">Read</th>
        <th className="px-2 py-1.5 text-center">Write</th>
        <th className="px-2 py-1.5 text-center border-l border-gray-200">Ops</th>
        <th className="px-2 py-1.5 text-center">Base10</th>
        <th className="px-2 py-1.5 text-center">Measure</th>
        <th className="px-2 py-1.5 text-center">Geom</th>
        <th colSpan={4} />
      </tr>
    </>
  );

  const ScoreCells = ({ sc, onUpdate, idKey }: { sc: any; onUpdate: (field: string, val: string) => void; idKey: string }) => {
    const { litAvg, numAvg, overall, level } = calcAverages(sc);
    const makeInput = (field: string) => {
      const val = sc?.[field] || "";
      const num = parseFloat(val);
      const color = !isNaN(num) && val !== "" ? (num >= 80 ? "border-green-400 bg-green-50" : num >= 60 ? "border-blue-400 bg-blue-50" : num >= 40 ? "border-yellow-400 bg-yellow-50" : "border-red-400 bg-red-50") : "border-gray-300";
      return (
        <input type="number" min={0} max={100} step={0.5} value={val}
          onChange={e => onUpdate(field, e.target.value)} placeholder="—"
          className={`w-14 text-center text-xs border rounded px-1 py-0.5 ${color}`} />
      );
    };
    return (
      <>
        <td className="px-1 py-1 text-center border-l border-gray-100">{makeInput("listening")}</td>
        <td className="px-1 py-1 text-center">{makeInput("speaking")}</td>
        <td className="px-1 py-1 text-center">{makeInput("reading")}</td>
        <td className="px-1 py-1 text-center">{makeInput("writing")}</td>
        <td className="px-1 py-1 text-center border-l border-gray-100">{makeInput("operations")}</td>
        <td className="px-1 py-1 text-center">{makeInput("base10")}</td>
        <td className="px-1 py-1 text-center">{makeInput("measurement")}</td>
        <td className="px-1 py-1 text-center">{makeInput("geometry")}</td>
        <td className="px-2 py-1.5 text-center border-l border-gray-200">
          {litAvg !== null ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(litAvg)}`}>{litAvg}</span> : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-2 py-1.5 text-center">
          {numAvg !== null ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(numAvg)}`}>{numAvg}</span> : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-2 py-1.5 text-center">
          {overall !== null ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(overall)}`}>{overall}</span> : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-2 py-1.5 text-center">
          {level ? <span className={`text-xs px-1.5 py-0.5 rounded ${levelBg(level)}`}>{level.split("–")[0].trim()}</span> : <span className="text-gray-300">—</span>}
        </td>
      </>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Baseline Assessment</h1>
        <p className="text-sm text-gray-500">Student and teacher literacy and numeracy baseline tracking</p>
      </div>

      {/* Global selectors */}
      <div className="flex gap-3 mb-4 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Round</label>
          <select value={round} onChange={e => setRound(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Assessment Date</label>
          <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "entry", label: "📝 Student Entry" },
          { id: "teacher", label: "👩‍🏫 Teacher Entry" },
          { id: "dashboard", label: "📊 Dashboard" },
        ].map(t => (
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

      {/* ── STUDENT ENTRY ── */}
      {activeTab === "entry" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Section</label>
                <select value={section} onChange={e => setSection(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={saveScores} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold ml-auto">
                {saving ? "Saving..." : "💾 Save All"}
              </button>
            </div>
          </div>

          {studentData.length > 0 && (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-700">{grade} — {section} — {round}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{studentData.length} students · All scores out of 100</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: "1100px" }}>
                  <thead><EntryTableHeaders /></thead>
                  <tbody>
                    {studentData.map((st, idx) => {
                      const sc = scores[st.student_id] || {};
                      const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                      return (
                        <tr key={st.student_id} className={`border-b border-gray-100 ${bg}`}>
                          <td className={`px-3 py-1.5 font-medium text-gray-800 sticky left-0 z-10 border-r border-gray-200 ${bg}`}>
                            {st.student_name}
                            {st.assessment && <span className="ml-1 text-xs text-green-500">✓</span>}
                          </td>
                          <td className="px-1 py-1">
                            <select value={sc.stage || "foundation"}
                              onChange={e => updateScore(st.student_id, "stage", e.target.value)}
                              className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full">
                              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label.split(" ")[0]}</option>)}
                            </select>
                          </td>
                          <ScoreCells
                            sc={sc}
                            idKey={st.student_id}
                            onUpdate={(field, val) => updateScore(st.student_id, field, val)}
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TEACHER ENTRY ── */}
      {activeTab === "teacher" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Default Stage</label>
                <select value={teacherStage} onChange={e => setTeacherStage(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <button onClick={saveTeacherScore} disabled={savingTeacher}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold ml-auto">
                {savingTeacher ? "Saving..." : "💾 Save All Teachers"}
              </button>
            </div>
          </div>

          {teachers.length > 0 && (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-700">Teacher Baseline Entry — {round} — {academicYear}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{teachers.length} teachers · All scores out of 100</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: "1100px" }}>
                  <thead><EntryTableHeaders /></thead>
                  <tbody>
                    {teachers.map((teacher, idx) => {
                      const sc = teacherScores[teacher.id] || {};
                      const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                      return (
                        <tr key={teacher.id} className={`border-b border-gray-100 ${bg}`}>
                          <td className={`px-3 py-1.5 font-medium text-gray-800 sticky left-0 z-10 border-r border-gray-200 ${bg}`}>
                            {teacher.name}
                          </td>
                          <td className="px-1 py-1">
                            <select value={sc.stage || teacherStage}
                              onChange={e => setTeacherScores(prev => ({ ...prev, [teacher.id]: { ...(prev[teacher.id] || {}), stage: e.target.value } }))}
                              className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full">
                              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label.split(" ")[0]}</option>)}
                            </select>
                          </td>
                          <ScoreCells
                            sc={sc}
                            idKey={teacher.id}
                            onUpdate={(field, val) => setTeacherScores(prev => ({
                              ...prev,
                              [teacher.id]: { ...(prev[teacher.id] || {}), [field]: val },
                            }))}
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
              { id: "teachers", label: "👩‍🏫 Teachers" },
              { id: "alerts", label: "⚠️ Alerts" },
            ].map(t => (
              <button key={t.id} onClick={() => setDashTab(t.id as any)}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${dashTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── SCHOOL DASHBOARD ── */}
          {dashTab === "school" && schoolData && (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-3">
                {[
                  { label: "Total Students", value: schoolData.totalStudents, color: "border-indigo-500" },
                  { label: "Assessed", value: schoolData.assessed, color: "border-green-500" },
                  { label: "Pending", value: schoolData.pending, color: "border-red-500" },
                  { label: "School Avg", value: `${schoolData.overallAvg}%`, color: "border-blue-500" },
                  { label: "Round", value: ROUNDS.find(r => r.value === round)?.label, color: "border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Literacy / Numeracy / Overall avg cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Literacy Avg", value: schoolData.literacyAvg, color: "bg-blue-500" },
                  { label: "Numeracy Avg", value: schoolData.numeracyAvg, color: "bg-purple-500" },
                  { label: "Overall Avg", value: schoolData.overallAvg, color: "bg-indigo-500" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <div className={`text-2xl font-bold text-white ${s.color} rounded-xl px-4 py-2 inline-block`}>{s.value}%</div>
                  </div>
                ))}
              </div>

              {/* Grade-wise sub tabs */}
              {schoolData.gradeWise?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[
                      { id: "overall", label: "📊 Overall" },
                      { id: "literacy", label: "📚 Literacy" },
                      { id: "numeracy", label: "🔢 Numeracy" },
                    ].map(t => (
                      <button key={t.id} onClick={() => setSchoolDashTab(t.id as any)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium ${schoolDashTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Grade-wise {schoolDashTab === "overall" ? "Overall" : schoolDashTab === "literacy" ? "Literacy" : "Numeracy"} Average
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={schoolData.gradeWise.map((g: any) => ({
                        name: g.grade.replace("Grade ", "G"),
                        value: schoolDashTab === "overall" ? g.overallAvg : schoolDashTab === "literacy" ? g.literacyAvg : g.numeracyAvg,
                        count: g.count, full: g.grade,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any, _, p) => [`${v}% (${p.payload.count} students)`, p.payload.full]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}
                          fill={schoolDashTab === "overall" ? "#6366f1" : schoolDashTab === "literacy" ? "#3b82f6" : "#8b5cf6"} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Level distribution */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Level Distribution</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: "L4", label: "Level 4 – Exceeding", color: "#10b981", bg: "bg-green-50 border-green-200" },
                    { key: "L3", label: "Level 3 – Meeting", color: "#6366f1", bg: "bg-blue-50 border-blue-200" },
                    { key: "L2", label: "Level 2 – Approaching", color: "#f59e0b", bg: "bg-yellow-50 border-yellow-200" },
                    { key: "L1", label: "Level 1 – Beginning", color: "#ef4444", bg: "bg-red-50 border-red-200" },
                  ].map(l => (
                    <div key={l.key} className={`rounded-xl p-4 text-center border ${l.bg}`}>
                      <p className="text-xs font-medium mb-1" style={{ color: l.color }}>{l.label}</p>
                      <p className="text-3xl font-bold text-gray-800">{schoolData.levelDist[l.key]}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {schoolData.assessed > 0 ? ((schoolData.levelDist[l.key] / schoolData.assessed) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── GRADE DASHBOARD ── */}
          {dashTab === "grade" && (
            <div className="space-y-4">
              <div className="flex gap-3 items-end mb-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Grade</label>
                  <select value={dashGrade} onChange={e => setDashGrade(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {gradeData && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Assessed", value: gradeData.totalAssessed, color: "border-indigo-500" },
                      { label: "Literacy Avg", value: `${gradeData.literacyAvg}%`, color: "border-blue-500" },
                      { label: "Numeracy Avg", value: `${gradeData.numeracyAvg}%`, color: "border-purple-500" },
                      { label: "Overall Avg", value: `${gradeData.overallAvg}%`, color: "border-green-500" },
                    ].map(s => (
                      <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                        <p className="text-xs text-gray-500">{s.label}</p>
                        <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Grade sub-tabs */}
                  <div className="flex gap-2">
                    {[
                      { id: "overall", label: "📊 Overall" },
                      { id: "literacy", label: "📚 Literacy" },
                      { id: "numeracy", label: "🔢 Numeracy" },
                    ].map(t => (
                      <button key={t.id} onClick={() => setGradeDashTab(t.id as any)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium ${gradeDashTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Section-wise {gradeDashTab === "overall" ? "Overall" : gradeDashTab === "literacy" ? "Literacy" : "Numeracy"} Average — {dashGrade}
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={gradeData.sections.map((s: any) => ({
                        name: s.section,
                        value: gradeDashTab === "overall" ? s.overallAvg : gradeDashTab === "literacy" ? s.literacyAvg : s.numeracyAvg,
                        atRisk: s.atRisk, count: s.count,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any, _, p) => [`${v}% (${p.payload.count} students)`, p.payload.name]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}
                          fill={gradeDashTab === "overall" ? "#6366f1" : gradeDashTab === "literacy" ? "#3b82f6" : "#8b5cf6"} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Numeracy section */}
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">🔢 Numeracy Average per Section</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gradeData.sections.map((s: any) => ({ name: s.section, avg: s.numeracyAvg, count: s.count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any) => [`${v}%`, "Numeracy Avg"]} />
                        <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Literacy section */}
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">📚 Literacy Average per Section</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gradeData.sections.map((s: any) => ({ name: s.section, avg: s.literacyAvg, count: s.count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any) => [`${v}%`, "Literacy Avg"]} />
                        <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Overall section */}
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Overall Average per Section</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gradeData.sections.map((s: any) => ({ name: s.section, avg: s.overallAvg, atRisk: s.atRisk, count: s.count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any, _, p) => [`${v}% (${p.payload.atRisk} at risk)`, "Overall Avg"]} />
                        <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                          {gradeData.sections.map((s: any, i: number) => (
                            <Cell key={i} fill={s.overallAvg >= 60 ? "#6366f1" : s.overallAvg >= 40 ? "#f59e0b" : "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Section table */}
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Section Details</h3>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-700 text-white">
                          <th className="px-3 py-2 text-left">Section</th>
                          <th className="px-3 py-2 text-center">Students</th>
                          <th className="px-3 py-2 text-center">Literacy Avg</th>
                          <th className="px-3 py-2 text-center">Numeracy Avg</th>
                          <th className="px-3 py-2 text-center">Overall Avg</th>
                          <th className="px-3 py-2 text-center">At Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradeData.sections.map((s: any, i: number) => (
                          <tr key={s.section} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 font-semibold text-gray-800">{s.section}</td>
                            <td className="px-3 py-2 text-center">{s.count}</td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.literacyAvg)}`}>{s.literacyAvg}%</span></td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.numeracyAvg)}`}>{s.numeracyAvg}%</span></td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.overallAvg)}`}>{s.overallAvg}%</span></td>
                            <td className="px-3 py-2 text-center">
                              {s.atRisk > 0 ? <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{s.atRisk} ⚠️</span> : <span className="text-gray-400">0</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TEACHER DASHBOARD ── */}
          {dashTab === "teachers" && teacherDashData && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Total Teachers", value: teacherDashData.totalTeachers, color: "border-indigo-500" },
                  { label: "Assessed", value: teacherDashData.assessed, color: "border-green-500" },
                  { label: "Pending", value: teacherDashData.pending, color: "border-red-500" },
                  { label: "Literacy Avg", value: `${teacherDashData.literacyAvg}%`, color: "border-blue-500" },
                  { label: "Numeracy Avg", value: `${teacherDashData.numeracyAvg}%`, color: "border-purple-500" },
                  { label: "Overall Avg", value: `${teacherDashData.overallAvg}%`, color: "border-green-600" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Teacher bar charts with tabs */}
              {teacherDashData.teacherBarData?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[
                      { id: "overall", label: "📊 Overall" },
                      { id: "literacy", label: "📚 Literacy" },
                      { id: "numeracy", label: "🔢 Numeracy" },
                    ].map(t => (
                      <button key={t.id} onClick={() => setTeacherDashTab(t.id as any)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium ${teacherDashTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      {teacherDashTab === "overall" ? "📊 Teacher Overall Scores" : teacherDashTab === "literacy" ? "📚 Teacher Literacy Scores" : "🔢 Teacher Numeracy Scores"}
                    </h3>
                    <ResponsiveContainer width="100%" height={Math.max(240, teacherDashData.teacherBarData.length * 32)}>
                      <BarChart data={teacherDashData.teacherBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip formatter={(v: any, _, p) => [`${v}%`, p.payload.fullName]} />
                        <Bar dataKey={teacherDashTab} radius={[0, 4, 4, 0]}>
                          {teacherDashData.teacherBarData.map((t: any, i: number) => {
                            const val = t[teacherDashTab];
                            return <Cell key={i} fill={val >= 80 ? "#10b981" : val >= 60 ? "#6366f1" : val >= 40 ? "#f59e0b" : "#ef4444"} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Domain averages */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain Averages</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={teacherDashData.domainData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="domain" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={(v: any) => [`${v}%`, "Avg"]} />
                    <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Level distribution */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Level Distribution</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: "L4", label: "Level 4 – Exceeding", color: "#10b981", bg: "bg-green-50 border-green-200" },
                    { key: "L3", label: "Level 3 – Meeting", color: "#6366f1", bg: "bg-blue-50 border-blue-200" },
                    { key: "L2", label: "Level 2 – Approaching", color: "#f59e0b", bg: "bg-yellow-50 border-yellow-200" },
                    { key: "L1", label: "Level 1 – Beginning", color: "#ef4444", bg: "bg-red-50 border-red-200" },
                  ].map(l => (
                    <div key={l.key} className={`rounded-xl p-4 text-center border ${l.bg}`}>
                      <p className="text-xs font-medium mb-1" style={{ color: l.color }}>{l.label}</p>
                      <p className="text-3xl font-bold text-gray-800">{teacherDashData.levelDist[l.key]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher list */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">All Teachers</h3>
                <div className="space-y-1">
                  {teacherDashData.teacherList.map((t: any) => (
                    <div key={t.teacher_id} className={`flex items-center justify-between p-2 rounded border ${t.assessment ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
                      <span className="text-sm font-medium text-gray-800">{t.teacher_name}</span>
                      {t.assessment ? (
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(+(+t.assessment.literacy_total || 0).toFixed(1))}`}>Lit: {(+t.assessment.literacy_total || 0).toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(+(+t.assessment.numeracy_total || 0).toFixed(1))}`}>Num: {(+t.assessment.numeracy_total || 0).toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(+(+t.assessment.overall_score || 0).toFixed(1))}`}>{(+t.assessment.overall_score || 0).toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${levelBg(t.assessment.level)}`}>{t.assessment.level?.split("–")[0].trim()}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Not assessed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ALERTS ── */}
          {dashTab === "alerts" && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-yellow-800 mb-1">⚠️ Consecutive Decline Alert</h3>
                <p className="text-xs text-yellow-600">
                  Students and teachers who have scored lower in 3 consecutive assessments — persistent decline needing attention.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📉 Students with Consecutive Decline ({studentAlerts.length})</h3>
                {studentAlerts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No students with 3 consecutive declines found</p>
                ) : (
                  <div className="space-y-3">
                    {studentAlerts.map((s: any, i: number) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-sm font-bold text-red-800">{s.entity_name}</span>
                            <span className="text-xs text-gray-500 ml-2">{s.grade} — {s.section}</span>
                          </div>
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                            Drop: {s.decline_from} → {s.decline_to} (-{s.drop})
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {s.scores.map((sc: any, j: number) => (
                            <div key={j} className={`text-center rounded px-2 py-1 text-xs border ${scoreBg(sc.overall)}`}>
                              <p className="font-bold">{sc.overall}%</p>
                              <p className="text-gray-500">{sc.round?.replace("_", " ")}</p>
                              <p className="text-gray-400">{sc.academic_year}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📉 Teachers with Consecutive Decline ({teacherAlerts.length})</h3>
                {teacherAlerts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No teachers with 3 consecutive declines found</p>
                ) : (
                  <div className="space-y-3">
                    {teacherAlerts.map((t: any, i: number) => (
                      <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-orange-800">{t.entity_name}</span>
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                            Drop: {t.decline_from} → {t.decline_to} (-{t.drop})
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {t.scores.map((sc: any, j: number) => (
                            <div key={j} className={`text-center rounded px-2 py-1 text-xs border ${scoreBg(sc.overall)}`}>
                              <p className="font-bold">{sc.overall}%</p>
                              <p className="text-gray-500">{sc.round?.replace("_", " ")}</p>
                              <p className="text-gray-400">{sc.academic_year}</p>
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