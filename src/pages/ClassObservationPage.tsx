import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Cell,
} from "recharts";

const API = "https://cbas-backend-production.up.railway.app";
const ACADEMIC_YEARS = ["2025-26", "2024-25", "2026-27"];

const CRITERIA = [
  { key: "preparation", label: "Prep", color: "#6366f1" },
  { key: "purposeful_class", label: "Purpose", color: "#f59e0b" },
  { key: "action", label: "Action", color: "#10b981" },
  { key: "analysis", label: "Analysis", color: "#ef4444" },
  { key: "application", label: "Apply", color: "#8b5cf6" },
  { key: "assessment", label: "Assess", color: "#06b6d4" },
  { key: "super_teacher", label: "Super", color: "#f97316" },
  { key: "high_energy", label: "Energy", color: "#ec4899" },
];

const SCORE_OPTIONS = [
  { value: "not_done", label: "0", score: 0 },
  { value: "attempted", label: "1", score: 1 },
  { value: "done", label: "2", score: 2 },
  { value: "well_done", label: "3", score: 3 },
];

const CLASSES = [
  "Pre-KG","LKG","UKG","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
  "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10",
];

const getScoreVal = (v: string) => SCORE_OPTIONS.find(s => s.value === v)?.score || 0;
const calcTotal = (row: any) => CRITERIA.reduce((sum, c) => sum + getScoreVal(row[c.key] || "not_done"), 0);
const calcPct = (total: number) => +((total / 24) * 100).toFixed(1);
const scoreColor = (pct: number) => pct >= 80 ? "text-green-600" : pct >= 60 ? "text-blue-600" : pct >= 40 ? "text-yellow-600" : pct > 0 ? "text-red-500" : "text-gray-400";
const scoreBg = (pct: number) => pct >= 80 ? "bg-green-100 text-green-800" : pct >= 60 ? "bg-blue-100 text-blue-800" : pct >= 40 ? "bg-yellow-100 text-yellow-800" : pct > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-400";

const emptyRow = (name: string) => ({
  teacher_name: name,
  observation_date: new Date().toISOString().split("T")[0],
  grade_observed: "Grade 1", section_observed: "", subject_observed: "", block_number: "",
  number_of_students: "", classroom_norms_discussed: false,
  lesson_plan_available: false, observed_by: "",
  preparation: "not_done", purposeful_class: "not_done", action: "not_done",
  analysis: "not_done", application: "not_done", assessment: "not_done",
  super_teacher: "not_done", high_energy: "not_done",
  what_went_well: "", what_could_be_better: "", action_steps: "",
});

export default function ClassObservationPage() {
  const [activeTab, setActiveTab] = useState<"table" | "dashboard">("table");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [allTeachers, setAllTeachers] = useState<string[]>([]);
  const [teacherEmails, setTeacherEmails] = useState<Record<string, string>>({});
  const [dashboard, setDashboard] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [newRows, setNewRows] = useState<Record<string, any>>({});
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [expandLoading, setExpandLoading] = useState<string | null>(null);
  const [dashTeacher, setDashTeacher] = useState<string | null>(null);
  const [teacherObs, setTeacherObs] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchAll(); }, [academicYear]);

  const showMsg = (msg: string) => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    setMessage(msg);
    msgTimerRef.current = setTimeout(() => setMessage(""), 3000);
  };

  const fetchAll = async () => {
    setDashLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([
        axios.get(`${API}/observation/teachers`),
        axios.get(`${API}/observation/dashboard?academic_year=${academicYear}`),
      ]);
      const emailMap: Record<string, string> = {};
      const names: string[] = (tRes.data || []).map((t: any) => {
        emailMap[t.name] = t.email || "";
        return t.name;
      });
      const observedNames: string[] = (dRes.data?.teachers || []).map((t: any) => t.teacher_name);
      const extra = observedNames.filter((n: string) => !names.includes(n));
      setTeacherEmails(emailMap);
      setAllTeachers([...names, ...extra]);
      setDashboard(dRes.data);
    } catch { }
    setDashLoading(false);
  };

  const fetchTeacherObs = async (name: string) => {
    try {
      const res = await axios.get(`${API}/observation/teacher/${encodeURIComponent(name)}?academic_year=${academicYear}`);
      setTeacherObs(prev => ({ ...prev, [name]: res.data }));
      return res.data;
    } catch { return null; }
  };

  const updateRow = (name: string, key: string, value: any) => {
    setNewRows(prev => ({
      ...prev,
      [name]: { ...(prev[name] || emptyRow(name)), [key]: value },
    }));
  };

  const getRow = (name: string) => newRows[name] || emptyRow(name);

  const handleSave = async (name: string) => {
    const row = getRow(name);
    if (!row.subject_observed) { showMsg("❌ Subject is required"); return; }
    if (!row.observation_date) { showMsg("❌ Date is required"); return; }
    if (!row.observed_by?.trim()) { showMsg("❌ Observer name is required"); return; }
    setSaving(name);
    try {
      await axios.post(`${API}/observation`, {
        ...row,
        teacher_email: teacherEmails[name] || "",
        academic_year: academicYear,
      });
      showMsg("✅ Observation saved for " + name);
      setNewRows(prev => ({ ...prev, [name]: emptyRow(name) }));
      await fetchAll();
      setExpandedTeacher(name);
      await fetchTeacherObs(name);
    } catch { showMsg("❌ Error saving"); }
    setSaving(null);
  };

  const handleDelete = async (id: string, teacherName: string) => {
    if (!confirm("Delete this observation?")) return;
    setDeleting(id);
    try {
      await axios.delete(`${API}/observation/${id}`);
      showMsg("✅ Deleted");
      await fetchAll();
      await fetchTeacherObs(teacherName);
    } catch { showMsg("❌ Error deleting"); }
    setDeleting(null);
  };

  const handleExpand = async (name: string) => {
    if (expandedTeacher === name) { setExpandedTeacher(null); return; }
    setExpandedTeacher(name);
    setExpandLoading(name);
    await fetchTeacherObs(name);
    setExpandLoading(null);
  };

  const handleDashTeacher = async (name: string) => {
    setDashTeacher(name);
    await fetchTeacherObs(name);
    await fetchAll();
  };

  const handleShare = async (id: string, currentShared: boolean, teacherName: string) => {
    try {
      await axios.patch(`${API}/observation/${id}/share`, { is_shared: !currentShared });
      showMsg(currentShared ? "✅ Share removed" : "✅ Observation shared with teacher");
      await fetchTeacherObs(teacherName);
    } catch { showMsg("❌ Error updating share"); }
  };

  const ScoreBtn = ({ name, cKey }: { name: string; cKey: string }) => {
    const current = getRow(name)[cKey] || "not_done";
    return (
      <div className="flex gap-0.5 justify-center">
        {SCORE_OPTIONS.map(opt => (
          <button key={opt.value}
            onClick={() => updateRow(name, cKey, opt.value)}
            className={`w-7 h-7 text-xs font-bold rounded border transition-all ${
              current === opt.value
                ? opt.score === 0 ? "bg-red-500 text-white border-red-600"
                : opt.score === 1 ? "bg-orange-400 text-white border-orange-500"
                : opt.score === 2 ? "bg-blue-500 text-white border-blue-600"
                : "bg-green-500 text-white border-green-600"
                : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
    );
  };

  // Build line chart data with small jitter offset for overlapping lines
  const buildTeacherLineData = (obs: any[]) => {
    return obs.map((o: any, i: number) => {
      const point: any = { name: `Obs ${i + 1}`, date: o.observation_date };
      const scoreBuckets: Record<number, number> = {};
      CRITERIA.forEach(c => {
        const score = getScoreVal(o[c.key]);
        scoreBuckets[score] = (scoreBuckets[score] || 0) + 1;
      });
      const scoreCount: Record<number, number> = {};
      CRITERIA.forEach(c => {
        const score = getScoreVal(o[c.key]);
        if (!scoreCount[score]) scoreCount[score] = 0;
        const total = scoreBuckets[score];
        const offset = total > 1 ? (scoreCount[score] - (total - 1) / 2) * 0.07 : 0;
        point[c.label] = +(score + offset).toFixed(3);
        scoreCount[score]++;
      });
      return point;
    });
  };

  const buildTeacherAvgData = (obs: any[]) => {
    if (!obs || obs.length === 0) return [];
    const result = CRITERIA.map(c => {
      const avg = obs.reduce((sum: number, o: any) => sum + getScoreVal(o[c.key]), 0) / obs.length;
      return { name: c.label, avg: +avg.toFixed(2), color: c.color };
    });
    const overallAvg = obs.reduce((sum: number, o: any) => {
      const total = CRITERIA.reduce((s, c) => s + getScoreVal(o[c.key]), 0);
      return sum + (total / 24) * 3;
    }, 0) / obs.length;
    result.push({ name: "Overall", avg: +overallAvg.toFixed(2), color: "#374151" });
    return result;
  };

  const buildSchoolCriteriaData = () => {
    if (!dashboard) return [];
    return CRITERIA.map(c => ({
      name: c.label,
      avg: +(dashboard.school_criteria_avg?.[c.key] || 0).toFixed(2),
      color: c.color,
    }));
  };

  const buildTeacherRankingData = () => {
    if (!dashboard) return [];
    return [...(dashboard.teachers || [])]
      .sort((a: any, b: any) => b.avg_percentage - a.avg_percentage)
      .map((t: any) => ({
        name: t.teacher_name.split(" ")[0],
        fullName: t.teacher_name,
        pct: t.avg_percentage,
        score: t.avg_score,
      }));
  };

  const stickyLeft = (bg: string) => `sticky left-0 z-20 ${bg} border-r border-gray-200`;
  const stickyR1 = (bg: string) => `sticky right-[140px] z-20 ${bg} border-l border-gray-200`;
  const stickyR2 = (bg: string) => `sticky right-[70px] z-20 ${bg}`;
  const stickyR3 = (bg: string) => `sticky right-0 z-20 ${bg} border-l border-gray-200`;

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Class Observation — Module 5</h1>
          <p className="text-sm text-gray-500">
            Direct table entry · Name and scores fixed · scroll horizontally for all fields
          </p>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-nowrap">
        {[
          { id: "table", label: "👩‍🏫 Observation Entry" },
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

      {activeTab === "table" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="flex gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs flex-wrap items-center">
            <span className="text-gray-500 font-medium">Rating:</span>
            {SCORE_OPTIONS.map(opt => (
              <span key={opt.value} className={`px-2 py-0.5 rounded font-bold text-white ${opt.score === 0 ? "bg-red-500" : opt.score === 1 ? "bg-orange-400" : opt.score === 2 ? "bg-blue-500" : "bg-green-500"}`}>
                {opt.label} = {["Not Done","Attempted","Done","Well Done"][opt.score]}
              </span>
            ))}
            <span className="text-gray-400 ml-2">Max = 24 pts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: "2200px" }}>
              <thead>
                <tr className="bg-indigo-700 text-white text-xs">
                  <th className="px-3 py-3 text-left sticky left-0 z-30 bg-indigo-700 border-r border-indigo-600 min-w-[170px]">Teacher</th>
                  <th className="px-2 py-3 text-center min-w-[115px]">Date</th>
                  <th className="px-2 py-3 text-center min-w-[100px]">Grade</th>
                  <th className="px-2 py-3 text-center min-w-[80px]">Section</th>
                  <th className="px-2 py-3 text-center min-w-[95px]">Subject</th>
                  <th className="px-2 py-3 text-center min-w-[65px]">Block</th>
                  <th className="px-2 py-3 text-center min-w-[60px]">Stdnts</th>
                  <th className="px-2 py-3 text-center min-w-[55px]">Norms</th>
                  <th className="px-2 py-3 text-center min-w-[45px]">LP</th>
                  <th className="px-2 py-3 text-center min-w-[90px]">Obs. By</th>
                  {CRITERIA.map(c => (
                    <th key={c.key} className="px-2 py-3 text-center min-w-[105px] border-l border-indigo-600"
                      style={{ borderTop: `3px solid ${c.color}` }}>
                      {c.label}
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center min-w-[160px] border-l border-indigo-600">✅ Continue</th>
                  <th className="px-2 py-3 text-center min-w-[160px]">🛑 Stop</th>
                  <th className="px-2 py-3 text-center min-w-[160px]">🚀 Start</th>
                  <th className="px-2 py-3 text-center sticky right-[140px] z-30 bg-indigo-700 border-l border-indigo-600 min-w-[70px]">Total</th>
                  <th className="px-2 py-3 text-center sticky right-[70px] z-30 bg-indigo-700 min-w-[70px]">%</th>
                  <th className="px-2 py-3 text-center sticky right-0 z-30 bg-indigo-700 border-l border-indigo-600 min-w-[70px]">Save</th>
                </tr>
              </thead>
              <tbody>
                {allTeachers.map((name, idx) => {
                  const td = dashboard?.teachers?.find((t: any) => t.teacher_name === name);
                  const obsCount = td?.observation_count || 0;
                  const row = getRow(name);
                  const total = calcTotal(row);
                  const pct = calcPct(total);
                  const isExpanded = expandedTeacher === name;
                  const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                  const obs = teacherObs[name]?.observations || [];

                  return (
                    <>
                      <tr key={`row-${name}`} className={`border-b border-gray-100 ${bg}`}>
                        <td className={`px-3 py-2 font-medium ${stickyLeft(bg)}`}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${obsCount > 0 ? "bg-green-500" : "bg-gray-300"}`} />
                              {obsCount > 0 ? (
                                <button onClick={() => handleExpand(name)}
                                  className="text-indigo-700 font-semibold hover:underline text-xs flex items-center gap-1">
                                  {name} {isExpanded ? "▲" : "▼"}
                                  <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-xs">{obsCount}</span>
                                </button>
                              ) : (
                                <span className="text-gray-700 text-xs font-semibold">{name}</span>
                              )}
                            </div>
                            {td && (
                              <div className="flex items-center gap-1 ml-3">
                                <span className={`text-xs font-bold ${scoreColor(td.avg_percentage)}`}>
                                  Avg: {td.avg_score}/24
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${scoreBg(td.avg_percentage)}`}>
                                  {td.avg_percentage}%
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`px-1 py-1.5 ${bg}`}>
                          <input type="date" value={row.observation_date}
                            onChange={e => updateRow(name, "observation_date", e.target.value)}
                            className="border border-gray-300 rounded px-1 py-1 text-xs w-full" />
                        </td>
                        <td className={`px-1 py-1.5 ${bg}`}>
                          <select value={row.grade_observed}
                            onChange={e => updateRow(name, "grade_observed", e.target.value)}
                            className="border border-gray-300 rounded px-1 py-1 text-xs w-full">
                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className={`px-1 py-1.5 ${bg}`}>
                          <input value={row.section_observed || ""}
                            onChange={e => updateRow(name, "section_observed", e.target.value.toUpperCase())}
                            placeholder="Section"
                            className="border border-gray-300 rounded px-1 py-1 text-xs w-full" />
                        </td>
                        <td className={`px-1 py-1.5 ${bg}`}>
                          <input value={row.subject_observed}
                            onChange={e => updateRow(name, "subject_observed", e.target.value)}
                            placeholder="Subject"
                            className="border border-gray-300 rounded px-1 py-1 text-xs w-full" />
                        </td>
                        <td className={`px-1 py-1.5 ${bg}`}>
                          <input value={row.block_number}
                            onChange={e => updateRow(name, "block_number", e.target.value)}
                            placeholder="B1"
                            className="border border-gray-300 rounded px-1 py-1 text-xs w-full" />
                        </td>
                        <td className={`px-1 py-1.5 ${bg}`}>
                          <input type="number" value={row.number_of_students}
                            onChange={e => updateRow(name, "number_of_students", e.target.value)}
                            placeholder="0"
                            className="border border-gray-300 rounded px-1 py-1 text-xs w-full" />
                        </td>
                        <td className={`px-1 py-1.5 text-center ${bg}`}>
                          <input type="checkbox" checked={row.classroom_norms_discussed}
                            onChange={e => updateRow(name, "classroom_norms_discussed", e.target.checked)}
                            className="w-4 h-4 accent-indigo-600" />
                        </td>
                        <td className={`px-1 py-1.5 text-center ${bg}`}>
                          <input type="checkbox" checked={row.lesson_plan_available}
                            onChange={e => updateRow(name, "lesson_plan_available", e.target.checked)}
                            className="w-4 h-4 accent-indigo-600" />
                        </td>
                        <td className={`px-1 py-1.5 ${bg}`}>
                          <input value={row.observed_by}
                            onChange={e => updateRow(name, "observed_by", e.target.value)}
                            placeholder="Observer"
                            className="border border-gray-300 rounded px-1 py-1 text-xs w-full" />
                        </td>
                        {CRITERIA.map(c => (
                          <td key={c.key} className={`px-1 py-1.5 text-center border-l border-gray-100 ${bg}`}>
                            <ScoreBtn name={name} cKey={c.key} />
                          </td>
                        ))}
                        <td className={`px-1 py-1.5 border-l border-gray-100 ${bg}`}>
                          <textarea value={row.what_went_well}
                            onChange={e => updateRow(name, "what_went_well", e.target.value)}
                            placeholder="What went well..."
                            rows={2}
                            className="border border-green-200 bg-green-50 rounded px-1 py-1 text-xs w-full resize-none" />
                        </td>
                        <td className={`px-1 py-1.5 ${bg}`}>
                          <textarea value={row.what_could_be_better}
                            onChange={e => updateRow(name, "what_could_be_better", e.target.value)}
                            placeholder="What could be better..."
                            rows={2}
                            className="border border-red-200 bg-red-50 rounded px-1 py-1 text-xs w-full resize-none" />
                        </td>
                        <td className={`px-1 py-1.5 ${bg}`}>
                          <textarea value={row.action_steps}
                            onChange={e => updateRow(name, "action_steps", e.target.value)}
                            placeholder="Action steps..."
                            rows={2}
                            className="border border-blue-200 bg-blue-50 rounded px-1 py-1 text-xs w-full resize-none" />
                        </td>
                        <td className={`px-2 py-1.5 text-center ${stickyR1(bg)}`}>
                          <span className={`font-bold text-sm ${scoreColor(pct)}`}>{total}/24</span>
                        </td>
                        <td className={`px-2 py-1.5 text-center ${stickyR2(bg)}`}>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(pct)}`}>{pct}%</span>
                        </td>
                        <td className={`px-2 py-1.5 text-center ${stickyR3(bg)}`}>
                          <button onClick={() => handleSave(name)} disabled={saving === name}
                            className="px-2 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                            {saving === name ? "..." : "Save"}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`exp-${name}`}>
                          <td colSpan={22} className="p-0 border-b border-indigo-200">
                            <div className="bg-white border-l-4 border-indigo-500 p-4">
                              {expandLoading === name ? (
                                <p className="text-xs text-indigo-500 py-4 text-center">Loading observations...</p>
                              ) : (<>
                              <p className="text-xs font-bold text-indigo-700 mb-2 uppercase tracking-wide">
                                All {obs.length} Observations — {name}
                              </p>
                              <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-xs bg-white" style={{ minWidth: "1400px" }}>
                                  <thead>
                                    <tr className="bg-gray-100 text-gray-600">
                                      <th className="px-3 py-2">#</th>
                                      <th className="px-3 py-2">Date</th>
                                      <th className="px-3 py-2">Grade</th>
                                      <th className="px-3 py-2">Section</th>
                                      <th className="px-3 py-2">Subject</th>
                                      <th className="px-3 py-2">Block</th>
                                      <th className="px-3 py-2">Stdnts</th>
                                      <th className="px-3 py-2">Norms</th>
                                      <th className="px-3 py-2">LP</th>
                                      <th className="px-3 py-2">By</th>
                                      {CRITERIA.map(c => (
                                        <th key={c.key} className="px-2 py-2 text-center" style={{ color: c.color }}>{c.label}</th>
                                      ))}
                                      <th className="px-3 py-2 text-center">Continue</th>
                                      <th className="px-3 py-2 text-center">Stop</th>
                                      <th className="px-3 py-2 text-center">Start</th>
                                      <th className="px-3 py-2 text-center font-bold">Total</th>
                                      <th className="px-3 py-2 text-center font-bold">%</th>
                                      <th className="px-3 py-2 text-center">Share</th>
                                      <th className="px-3 py-2 text-center">Del</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {obs.map((o: any, i: number) => (
                                      <tr key={o.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{o.observation_date}</td>
                                        <td className="px-3 py-2">{o.grade_observed}</td>
                                        <td className="px-3 py-2">{o.section_observed || "—"}</td>
                                        <td className="px-3 py-2">{o.subject_observed}</td>
                                        <td className="px-3 py-2">{o.block_number || "—"}</td>
                                        <td className="px-3 py-2 text-center">{o.number_of_students || "—"}</td>
                                        <td className="px-3 py-2 text-center">{o.classroom_norms_discussed ? "✅" : "—"}</td>
                                        <td className="px-3 py-2 text-center">{o.lesson_plan_available ? "✅" : "—"}</td>
                                        <td className="px-3 py-2">{o.observed_by || "—"}</td>
                                        {CRITERIA.map(c => {
                                          const s = getScoreVal(o[c.key]);
                                          return (
                                            <td key={c.key} className="px-2 py-2 text-center">
                                              <span className={`w-6 h-6 inline-flex items-center justify-center rounded font-bold text-white text-xs
                                                ${s === 0 ? "bg-red-400" : s === 1 ? "bg-orange-400" : s === 2 ? "bg-blue-400" : "bg-green-500"}`}>
                                                {s}
                                              </span>
                                            </td>
                                          );
                                        })}
                                        <td className="px-3 py-2 text-xs text-gray-600 max-w-[100px] truncate">{o.what_went_well || "—"}</td>
                                        <td className="px-3 py-2 text-xs text-gray-600 max-w-[100px] truncate">{o.what_could_be_better || "—"}</td>
                                        <td className="px-3 py-2 text-xs text-gray-600 max-w-[100px] truncate">{o.action_steps || "—"}</td>
                                        <td className="px-3 py-2 text-center">
                                          <span className={`font-bold ${scoreColor(+o.percentage)}`}>{o.total_score}/24</span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${scoreBg(+o.percentage)}`}>{o.percentage}%</span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <button onClick={() => handleShare(o.id, !!o.is_shared, name)}
                                            className={`px-2 py-1 text-xs rounded font-medium transition-all ${o.is_shared ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700"}`}>
                                            {o.is_shared ? "Shared ✓" : "Share"}
                                          </button>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <button onClick={() => handleDelete(o.id, name)}
                                            disabled={deleting === o.id}
                                            className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50">
                                            {deleting === o.id ? "..." : "Del"}
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {obs.length > 1 && (
                                      <tr className="bg-indigo-50 border-t-2 border-indigo-300 font-bold">
                                        <td colSpan={9} className="px-3 py-2 text-indigo-700">
                                          Average ({obs.length} obs)
                                        </td>
                                        {CRITERIA.map(c => {
                                          const avg = obs.reduce((sum: number, o: any) => sum + getScoreVal(o[c.key]), 0) / obs.length;
                                          return (
                                            <td key={c.key} className="px-2 py-2 text-center">
                                              <span className={`px-1.5 py-0.5 rounded font-bold text-xs ${scoreBg(avg * 33.3)}`}>
                                                {avg.toFixed(1)}
                                              </span>
                                            </td>
                                          );
                                        })}
                                        <td colSpan={3} />
                                        <td className="px-3 py-2 text-center">
                                          <span className={`font-bold ${scoreColor(td?.avg_percentage || 0)}`}>{td?.avg_score}/24</span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${scoreBg(td?.avg_percentage || 0)}`}>{td?.avg_percentage}%</span>
                                        </td>
                                        <td /><td />
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              </>)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {activeTab === "dashboard" && dashLoading && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          <p className="text-sm">Loading dashboard...</p>
        </div>
      )}
      {activeTab === "dashboard" && !dashLoading && !dashboard && (
        <div className="bg-white rounded-xl shadow p-10 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm font-semibold text-gray-600">No observations recorded for {academicYear}</p>
          <p className="text-xs text-gray-400 mt-1">Add observations in the Entry tab to see data here.</p>
        </div>
      )}
      {activeTab === "dashboard" && !dashLoading && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total Teachers", value: dashboard.total_teachers, color: "border-indigo-500" },
              { label: "Total Observations", value: dashboard.total_observations, color: "border-blue-500" },
              { label: "Observed Once+", value: dashboard.observed_once, color: "border-green-500" },
              { label: "Multiple Obs.", value: dashboard.observed_multiple, color: "border-purple-500" },
              { label: "School Avg", value: `${dashboard.school_avg_percentage}%`, color: "border-orange-500" },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">School Criteria Radar</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={CRITERIA.map(c => ({
                  criteria: c.label,
                  score: +(dashboard.school_criteria_avg?.[c.key] || 0).toFixed(2),
                }))}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="criteria" tick={{ fontSize: 11 }} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Tooltip formatter={(v: any) => [`${v}/3`, "Avg Score"]} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">School Criteria Averages</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={buildSchoolCriteriaData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 3]} ticks={[0,1,2,3]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={55} />
                  <Tooltip formatter={(v: any) => [`${v}/3`, "Avg"]} />
                  <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                    {buildSchoolCriteriaData().map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Teacher Rankings (Avg %)</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, buildTeacherRankingData().length * 32)}>
              <BarChart data={buildTeacherRankingData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: any, _: any, props: any) => [`${props.payload.score}/24 (${v}%)`, props.payload.fullName]} />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                  {buildTeacherRankingData().map((e, i) => (
                    <Cell key={i} fill={e.pct >= 80 ? "#10b981" : e.pct >= 60 ? "#6366f1" : e.pct >= 40 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Per Teacher Detail</h3>
            <div className="flex gap-2 flex-wrap mb-4">
              {dashboard.teachers?.map((t: any) => (
                <button key={t.teacher_name}
                  onClick={() => handleDashTeacher(t.teacher_name)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-all ${dashTeacher === t.teacher_name ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}>
                  {t.teacher_name}
                  <span className={`ml-1.5 text-xs font-bold ${scoreColor(t.avg_percentage)}`}>{t.avg_percentage}%</span>
                </button>
              ))}
            </div>

            {dashTeacher && teacherObs[dashTeacher]?.observations?.length > 0 && (() => {
              const obs = teacherObs[dashTeacher]?.observations || [];
              const lineData = buildTeacherLineData(obs);
              const avgData = buildTeacherAvgData(obs);
              const totalScoreAvg = +(obs.reduce((sum: number, o: any) => sum + (+o.total_score), 0) / obs.length).toFixed(2);
              const pctAvg = calcPct(totalScoreAvg);

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-lg flex-wrap">
                    <div className={`rounded-lg px-4 py-2 text-center border ${scoreBg(pctAvg)}`}>
                      <p className="text-xs text-gray-500">Overall Avg</p>
                      <p className={`text-xl font-bold ${scoreColor(pctAvg)}`}>{totalScoreAvg}/24</p>
                      <p className={`text-xs font-bold ${scoreColor(pctAvg)}`}>{pctAvg}%</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        Criteria Averages across {obs.length} observation{obs.length > 1 ? "s" : ""}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {CRITERIA.map(c => {
                          const avg = obs.reduce((sum: number, o: any) => sum + getScoreVal(o[c.key]), 0) / obs.length;
                          return (
                            <span key={c.key}
                              style={{ backgroundColor: c.color + "20", color: c.color, borderColor: c.color }}
                              className="text-xs px-2 py-0.5 rounded-full font-medium border">
                              {c.label}: {avg.toFixed(2)}/3
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Total Obs</p>
                      <p className="text-xl font-bold text-indigo-700">{obs.length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Growth line chart with jitter */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                      <h4 className="text-xs font-bold text-gray-700 mb-1">
                        Criteria Growth Across Observations
                      </h4>
                      <p className="text-xs text-gray-400 mb-2">
                        X = Observation · Y = Score 0-3 · Lines slightly offset when overlapping · hover for real score
                      </p>
                      <ResponsiveContainer width="100%" height={340}>
                        <LineChart data={lineData} margin={{ top: 10, right: 20, left: 10, bottom: 90 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis
                            domain={[-0.3, 3.3]}
                            ticks={[0, 1, 2, 3]}
                            tick={{ fontSize: 10 }}
                            label={{ value: "Score (0-3)", angle: -90, position: "insideLeft", style: { fontSize: 9 } }} />
                          <Tooltip formatter={(v: any, name: any) => [`${Math.round(v)}/3`, name]} />
                          <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                          {CRITERIA.map(c => (
                            <Line
                              key={c.key}
                              type="monotone"
                              dataKey={c.label}
                              stroke={c.color}
                              strokeWidth={2.5}
                              dot={{ fill: c.color, r: 5, strokeWidth: 2, stroke: "#fff" }}
                              activeDot={{ r: 7 }} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Avg bar chart */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                      <h4 className="text-xs font-bold text-gray-700 mb-1">
                        Average per Criteria
                      </h4>
                      <p className="text-xs text-gray-400 mb-2">
                        Average score per criteria across all {obs.length} observations
                      </p>
                      <ResponsiveContainer width="100%" height={340}>
                        <BarChart data={avgData} layout="vertical" margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 3]} ticks={[0,1,2,3]} tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                          <Tooltip formatter={(v: any) => [`${v}/3`, "Avg Score"]} />
                          <Bar dataKey="avg" radius={[0, 5, 5, 0]}
                            label={{ position: "right", fontSize: 10, formatter: (v: any) => `${v}` }}>
                            {avgData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}

            {dashTeacher && (!teacherObs[dashTeacher] || teacherObs[dashTeacher]?.observations?.length === 0) && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No observations found for {dashTeacher}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}