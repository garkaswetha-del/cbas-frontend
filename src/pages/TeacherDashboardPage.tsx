import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const API = "https://cbas-backend-production.up.railway.app";
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

const SUBJECT_COLORS = ["#ef4444","#f97316","#10b981","#8b5cf6","#06b6d4","#f59e0b","#ec4899","#84cc16","#14b8a6","#6366f1"];
const BAND_COLORS: Record<string, string> = { "A": "#ef4444", "M2": "#f97316", "M1": "#f59e0b", "E2": "#84cc16", "E1": "#10b981", "A+": "#6366f1" };

const n = (v: any) => +(v ?? 0);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const scoreBg = (p: number) => p >= 80 ? "bg-green-100 text-green-800" : p >= 60 ? "bg-blue-100 text-blue-800" : p >= 40 ? "bg-yellow-100 text-yellow-800" : p > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-400";
const scoreColor = (p: number) => p >= 80 ? "text-green-600" : p >= 60 ? "text-blue-600" : p >= 40 ? "text-yellow-600" : p > 0 ? "text-red-500" : "text-gray-400";

const EXAM_TYPES = ["PA1", "PA2", "SA1", "PA3", "PA4", "SA2"];
const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => { const y = 2025 + i; return `${y}-${String(y + 1).slice(2)}`; });

interface TeacherDashboardProps {
  user: any;
}

export default function TeacherDashboardPage({ user }: TeacherDashboardProps) {
  const [activeGroup, setActiveGroup] = useState<"class" | "self">("class");
  const [activeTab, setActiveTab] = useState<"students" | "classview" | "pasa" | "examconfig" | "activities" | "baseline_entry" | "baseline_dash" | "student_ai" | "alerts" | "promotion" | "profile" | "self_baseline" | "appraisal" | "self_ai" | "homework" | "portfolio" | "ai_tools">("students");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [mappings, setMappings] = useState<any>(null);

  useEffect(() => { fetchMappings(); }, [academicYear]);

  const fetchMappings = async () => {
    if (!user?.id) return;
    try {
      const r = await axios.get(`${API}/mappings/teacher/${user.id}/dashboard?academic_year=${academicYear}`);
      setMappings(r.data);
    } catch { }
  };

  const isClassTeacher = !!(mappings?.is_class_teacher || user?.class_teacher_of);

  const CLASS_TABS = [
    { id: "students",       label: "👥 My Students",      show: true },
    { id: "classview",      label: "🏛 My Class",         show: isClassTeacher },
    { id: "pasa",           label: "✏️ PA/SA Marks",       show: true },
    { id: "baseline_entry", label: "📊 Baseline Entry",    show: isClassTeacher },
    { id: "baseline_dash",  label: "📈 Baseline Dashboard", show: true },
    { id: "activities",     label: "🎯 Activities",        show: true },
    { id: "ai_tools",       label: "🤖 AI Tools",          show: true },
    { id: "alerts",         label: "⚠️ Alerts",            show: true },
    { id: "promotion",      label: "🎓 Promotion",         show: isClassTeacher },
    { id: "portfolio",      label: "📁 Student Portfolio",  show: true },
  ];

  const SELF_TABS = [
    { id: "profile",        label: "👤 My Profile",       show: true },
    { id: "self_baseline",  label: "📈 My Baseline",      show: true },
    { id: "appraisal",      label: "📋 My Appraisal",     show: true },
    { id: "self_ai",        label: "🤖 AI Learning",      show: true },
    { id: "learning_res",   label: "📚 Learning Resources", show: true },
  ];

  const activeTabs = activeGroup === "class" ? CLASS_TABS : SELF_TABS;

  // When switching group, reset to first tab
  const switchGroup = (g: "class" | "self") => {
    setActiveGroup(g);
    setActiveTab(g === "class" ? "students" : "profile");
  };

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Teacher Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500">Welcome, {user?.name} · {user?.role}</p>
        </div>
        <div className="flex items-end gap-3">
          {academicYear !== "2025-26" && (
            <div className="px-3 py-1.5 bg-yellow-50 border border-yellow-300 rounded-lg text-xs text-yellow-700 font-medium">
              👁 Viewing {academicYear} — past year
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Group switcher */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-nowrap">
        <button onClick={() => switchGroup("class")}
          className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-bold transition-all border-2 whitespace-nowrap flex-shrink-0 ${activeGroup === "class" ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50"}`}>
          🏫 Class Management
        </button>
        <button onClick={() => switchGroup("self")}
          className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-bold transition-all border-2 whitespace-nowrap flex-shrink-0 ${activeGroup === "self" ? "bg-purple-600 text-white border-purple-600 shadow-md" : "bg-white text-purple-600 border-purple-300 hover:bg-purple-50"}`}>
          👤 Self Management
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-2 flex-nowrap">
        {activeTabs.filter(t => t.show).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === t.id
              ? activeGroup === "class" ? "bg-indigo-600 text-white shadow" : "bg-purple-600 text-white shadow"
              : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Class Management tabs */}
      {activeTab === "students"       && <StudentsTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "classview"      && <ClassTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "pasa"           && <PASATab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "baseline_entry" && <BaselineEntryTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "baseline_dash"  && <BaselineDashTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "activities"     && <ActivitiesTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "ai_tools"       && <AIToolsTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "alerts"         && <AlertsTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "promotion"      && <PromotionTab user={user} mappings={mappings} />}
      {activeTab === "portfolio"      && <PortfolioTab user={user} mappings={mappings} academicYear={academicYear} />}

      {/* Self Management tabs */}
      {activeTab === "profile"        && <ProfileTab user={user} />}
      {activeTab === "self_baseline"  && <BaselineTab user={user} academicYear={academicYear} />}
      {activeTab === "appraisal"      && <AppraisalTab user={user} academicYear={academicYear} />}
      {activeTab === "self_ai"        && <SelfAITab user={user} academicYear={academicYear} />}
      {activeTab === "learning_res"   && <LearningResourcesTab user={user} academicYear={academicYear} />}
      {activeTab === "homework"       && <HomeworkTab user={user} mappings={mappings} academicYear={academicYear} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 1: MY PROFILE
// ─────────────────────────────────────────────────────────────────
function ProfileTab({ user }: { user: any }) {
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", qualification: user?.qualification || "", experience: user?.experience || "" });
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [photo, setPhoto] = useState<string>(user?.photo || "");
  const [msg, setMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/users/${user.id}`, { ...form, photo: photo || undefined });
      // Update local storage
      const stored = localStorage.getItem("cbas_user");
      if (stored) {
        const u = JSON.parse(stored);
        localStorage.setItem("cbas_user", JSON.stringify({ ...u, ...form, photo }));
      }
      setMsg("✅ Profile saved successfully");
    } catch { setMsg("❌ Error saving profile"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const changePassword = async () => {
    if (!pwForm.newPw || pwForm.newPw !== pwForm.confirm) { setPwMsg("❌ Passwords do not match"); setTimeout(() => setPwMsg(""), 3000); return; }
    if (pwForm.newPw.length < 6) { setPwMsg("❌ Password must be at least 6 characters"); setTimeout(() => setPwMsg(""), 3000); return; }
    try {
      await axios.patch(`${API}/users/${user.id}`, { password: pwForm.newPw });
      setPwMsg("✅ Password changed successfully");
      setPwForm({ current: "", newPw: "", confirm: "" });
    } catch { setPwMsg("❌ Error changing password"); }
    setTimeout(() => setPwMsg(""), 3000);
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Photo + basic info */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Profile Information</h2>
        <div className="flex items-start gap-6 mb-5">
          <div className="flex flex-col items-center gap-2">
            {photo ? (
              <img src={photo} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-300" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold border-2 border-indigo-300">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="text-xs text-indigo-600 hover:underline">Change Photo</button>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Qualification</label>
              <input value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
                placeholder="e.g. B.Ed, M.Sc" className="border border-gray-300 rounded px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Experience (years)</label>
              <input type="number" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Email</label>
              <input value={user?.email || ""} disabled className="border border-gray-200 rounded px-3 py-2 text-sm w-full bg-gray-50 text-gray-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Role</label>
              <input value={user?.role || ""} disabled className="border border-gray-200 rounded px-3 py-2 text-sm w-full bg-gray-50 text-gray-400 capitalize" />
            </div>
          </div>
        </div>
        {msg && <p className={`text-sm mb-3 ${msg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
        <button onClick={saveProfile} disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
          {saving ? "Saving..." : "💾 Save Profile"}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Change Password</h2>
        <div className="grid grid-cols-1 gap-3 max-w-sm">
          <div>
            <label className="text-xs text-gray-500 block mb-1">New Password</label>
            <input type="password" value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Confirm New Password</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full" />
          </div>
        </div>
        {pwMsg && <p className={`text-sm mt-2 mb-2 ${pwMsg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{pwMsg}</p>}
        <button onClick={changePassword} className="mt-3 px-5 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 font-medium">
          🔒 Change Password
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHARED: Student Analysis View (used by Tab 2 + Tab 3)
// ─────────────────────────────────────────────────────────────────
function StudentAnalysisView({ students, subjects, sectionData, pasaData, baselineData, activitiesData, academicYear }: any) {
  const [subTab, setSubTab] = useState<"pasa" | "baseline" | "activities">("pasa");
  const [selectedExam, setSelectedExam] = useState("PA1");

  const SUB_TABS = [
    { id: "pasa",       label: "📊 PA/SA Marks" },
    { id: "baseline",   label: "📈 Baseline" },
    { id: "activities", label: "🎯 Activities" },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-2">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium border ${subTab === t.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PA/SA Sub-tab */}
      {subTab === "pasa" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Exam:</label>
            <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              {EXAM_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {sectionData?.[selectedExam] ? (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Students", value: sectionData[selectedExam].total_students || students.length, color: "border-indigo-500" },
                  { label: "Section Avg", value: fmtPct(n(sectionData[selectedExam].section_avg)), color: "border-green-500" },
                  { label: "Subjects", value: subjects?.length || sectionData[selectedExam].subjects?.length || "—", color: "border-blue-500" },
                  { label: "Exam", value: selectedExam, color: "border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-lg font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Advancing / Retracting indicators */}
              {(sectionData[selectedExam].advancing?.length > 0 || sectionData[selectedExam].retracting?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow p-4 border-t-4 border-green-400">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      📈 Advancing
                      <span className="ml-auto bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{sectionData[selectedExam].advancing?.length}</span>
                    </h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sectionData[selectedExam].advancing?.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-green-50 rounded border border-green-100 text-xs">
                          <span className="font-medium text-gray-800">{s.student_name}</span>
                          <span className="text-green-700 font-bold">▲+{n(s.change).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-4 border-t-4 border-red-400">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      📉 Retracting
                      <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{sectionData[selectedExam].retracting?.length}</span>
                    </h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sectionData[selectedExam].retracting?.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-red-50 rounded border border-red-100 text-xs">
                          <span className="font-medium text-gray-800">{s.student_name}</span>
                          <span className="text-red-700 font-bold">▼{Math.abs(n(s.change)).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Student rankings table */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Rankings — {selectedExam}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ minWidth: `${350 + (sectionData[selectedExam].subjects?.length || 0) * 100}px` }}>
                    <thead>
                      <tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-center sticky left-0 bg-indigo-700 min-w-[45px]">Rank</th>
                        <th className="px-3 py-2 text-left sticky left-[45px] bg-indigo-700 border-l border-indigo-600 min-w-[160px]">Student</th>
                        {sectionData[selectedExam].subjects?.map((sub: string) => (
                          <th key={sub} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[90px]">{sub}</th>
                        ))}
                        <th className="px-3 py-2 text-center border-l border-indigo-600 min-w-[75px]">Grand %</th>
                        <th className="px-3 py-2 text-center min-w-[55px]">Band</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(sectionData[selectedExam].students_ranked || [])].sort((a, b) => n(b.grand_percentage) - n(a.grand_percentage)).map((s: any, i: number) => {
                        const isAdv = sectionData[selectedExam].advancing?.some((a: any) => a.student_name === s.student_name);
                        const isRet = sectionData[selectedExam].retracting?.some((r: any) => r.student_name === s.student_name);
                        return (
                          <tr key={s.student_name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 text-center font-bold text-gray-400 sticky left-0 bg-inherit">{s.rank || i + 1}</td>
                            <td className="px-3 py-2 sticky left-[45px] bg-inherit border-l border-gray-100 font-medium text-gray-800">
                              {s.student_name}
                              {isAdv && <span className="ml-1 text-green-500 text-xs font-bold">▲</span>}
                              {isRet && <span className="ml-1 text-red-500 text-xs font-bold">▼</span>}
                            </td>
                            {sectionData[selectedExam].subjects?.map((sub: string) => {
                              const sd = s.subjects?.[sub];
                              return (
                                <td key={sub} className="px-2 py-2 text-center border-l border-gray-100">
                                  {sd?.is_absent ? <span className="text-red-400 font-bold">AB</span>
                                    : sd?.percentage != null ? <span className={`text-xs px-1 py-0.5 rounded ${scoreBg(n(sd.percentage))}`}>{n(sd.percentage).toFixed(0)}%</span>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center border-l border-gray-100">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(n(s.grand_percentage))}`}>{s.grand_percentage ? fmtPct(n(s.grand_percentage)) : "—"}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {s.band && <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: BAND_COLORS[s.band] + "20", color: BAND_COLORS[s.band] }}>{s.band}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Subject avg chart */}
              {sectionData[selectedExam].subject_averages && Object.keys(sectionData[selectedExam].subject_averages).length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Average %</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={Object.entries(sectionData[selectedExam].subject_averages).map(([s, v]) => ({ name: s, avg: n(v) }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip formatter={(v: any) => [`${v}%`, "Avg"]} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                        {Object.entries(sectionData[selectedExam].subject_averages).map((_, i) => <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
              <p className="text-sm">No PA/SA data for {selectedExam}. Marks not entered yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Baseline Sub-tab */}
      {subTab === "baseline" && (
        <div className="space-y-4">
          {baselineData?.length > 0 ? (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Baseline Assessment Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-indigo-700 text-white">
                      <th className="px-3 py-2 text-left min-w-[160px]">Student</th>
                      <th className="px-3 py-2 text-center">Subject</th>
                      <th className="px-3 py-2 text-center">Score %</th>
                      <th className="px-3 py-2 text-center">Level</th>
                      <th className="px-3 py-2 text-left">Learning Gaps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baselineData.map((b: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 font-medium text-gray-800">{b.student_name}</td>
                        <td className="px-3 py-2 text-center">{b.subject}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(n(b.percentage))}`}>{fmtPct(n(b.percentage))}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">{b.level || "—"}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{b.learning_gaps || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
              <p className="text-sm">No baseline data available for your students.</p>
            </div>
          )}
        </div>
      )}

      {/* Activities Sub-tab */}
      {subTab === "activities" && (
        <div className="space-y-4">
          {activitiesData?.length > 0 ? (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Activities & Marks</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-indigo-700 text-white">
                      <th className="px-3 py-2 text-left min-w-[160px]">Student</th>
                      <th className="px-3 py-2 text-center">Activity</th>
                      <th className="px-3 py-2 text-center">Subject</th>
                      <th className="px-3 py-2 text-center">Marks</th>
                      <th className="px-3 py-2 text-center">Max</th>
                      <th className="px-3 py-2 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activitiesData.map((a: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 font-medium text-gray-800">{a.student_name}</td>
                        <td className="px-3 py-2 text-center">{a.activity_name || a.activity}</td>
                        <td className="px-3 py-2 text-center">{a.subject}</td>
                        <td className="px-3 py-2 text-center font-bold">{a.marks_obtained ?? "—"}</td>
                        <td className="px-3 py-2 text-center text-gray-400">{a.max_marks}</td>
                        <td className="px-3 py-2 text-center">
                          {a.max_marks > 0 ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${scoreBg(n(a.marks_obtained) / n(a.max_marks) * 100)}`}>{((n(a.marks_obtained) / n(a.max_marks)) * 100).toFixed(0)}%</span> : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
              <p className="text-sm">No activities data available for your students.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 2: MY STUDENTS
// ─────────────────────────────────────────────────────────────────
function StudentsTab({ user, mappings, academicYear }: any) {
  const [sectionData, setSectionData] = useState<Record<string, any>>({});
  const [baselineData, setBaselineData] = useState<any[]>([]);
  const [activitiesData, setActivitiesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Build unique grade/section combos from mappings
  const combos: { grade: string; section: string; subjects: string[] }[] = [];
  if (mappings?.mappings) {
    const seen = new Set<string>();
    mappings.mappings.forEach((m: any) => {
      const key = `${m.grade}||${m.section}`;
      if (!seen.has(key)) {
        seen.add(key);
        combos.push({ grade: m.grade, section: m.section, subjects: mappings.mappings.filter((x: any) => x.grade === m.grade && x.section === m.section).map((x: any) => x.subject) });
      }
    });
  }

  useEffect(() => {
    if (combos.length && !selectedGrade) {
      setSelectedGrade(combos[0].grade);
      setSelectedSection(combos[0].section);
    }
  }, [mappings]);

  useEffect(() => {
    if (selectedGrade && selectedSection) fetchData();
  }, [selectedGrade, selectedSection, academicYear]);

  const [students, setStudents] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch actual students first
      try {
        const sr = await axios.get(`${API}/students?grade=${encodeURIComponent(selectedGrade)}&section=${encodeURIComponent(selectedSection)}`);
        setStudents((sr.data?.data || sr.data || []).filter((s: any) => s.is_active !== false));
      } catch { setStudents([]); }

      // Fetch PA/SA for all exam types
      const examData: Record<string, any> = {};
      await Promise.all(EXAM_TYPES.map(async exam => {
        try {
          const r = await axios.get(`${API}/pasa/analysis/section?academic_year=${academicYear}&exam_type=${exam}&grade=${encodeURIComponent(selectedGrade)}&section=${encodeURIComponent(selectedSection)}`);
          if (r.data?.students_ranked?.length) examData[exam] = r.data;
        } catch { }
      }));
      setSectionData(examData);

      // Baseline
      try {
        const r = await axios.get(`${API}/baseline/section?academic_year=${academicYear}&grade=${encodeURIComponent(selectedGrade)}&section=${encodeURIComponent(selectedSection)}`);
        setBaselineData(r.data || []);
      } catch { setBaselineData([]); }

      // Activities
      try {
        const r = await axios.get(`${API}/activities/section?academic_year=${academicYear}&grade=${encodeURIComponent(selectedGrade)}&section=${encodeURIComponent(selectedSection)}`);
        setActivitiesData(r.data || []);
      } catch { setActivitiesData([]); }
    } catch { }
    setLoading(false);
  };

  if (!mappings) {
    return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400"><p className="text-sm">Loading your assignments...</p></div>;
  }

  if (!combos.length) {
    return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400"><p className="text-sm">No student assignments found for {academicYear}. Contact admin.</p></div>;
  }

  const currentCombo = combos.find(c => c.grade === selectedGrade && c.section === selectedSection);

  return (
    <div className="space-y-4">
      {/* Section selector */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Assigned Sections</h3>
        <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
          {combos.map(c => (
            <button key={`${c.grade}-${c.section}`}
              onClick={() => { setSelectedGrade(c.grade); setSelectedSection(c.section); }}
              className={`px-3 py-2 text-xs rounded-lg font-medium border transition-all ${selectedGrade === c.grade && selectedSection === c.section ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>
              {c.grade} — {c.section}
              <span className="block text-xs opacity-75">{c.subjects.join(", ")}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400"><p className="text-sm">Loading...</p></div>
      ) : (
        <StudentAnalysisView
          students={students}
          subjects={currentCombo?.subjects}
          sectionData={sectionData}
          baselineData={baselineData}
          activitiesData={activitiesData}
          academicYear={academicYear}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 3: MY CLASS (class teacher only)
// ─────────────────────────────────────────────────────────────────
function ClassTab({ user, mappings, academicYear }: any) {
  const API = "https://cbas-backend-production.up.railway.app";
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [sectionData, setSectionData] = useState<any>({});
  const [baselineData, setBaselineData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const rawCTO = (mappings?.class_teacher_of || user?.class_teacher_of || "").trim();
  const ctoParts = rawCTO.split(' ').filter(Boolean);
  const classGrade = mappings?.class_grade || (ctoParts.length >= 3 ? ctoParts.slice(0,-1).join(' ') : ctoParts.length === 2 ? ctoParts[0] : "");
  const classSection = mappings?.class_section || (ctoParts.length >= 2 ? ctoParts[ctoParts.length-1] : "");

  useEffect(() => {
    if (classGrade && classSection) fetchAll();
  }, [classGrade, classSection, academicYear]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sr, pr, br] = await Promise.all([
        axios.get(`${API}/students?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}`),
        axios.get(`${API}/pasa/analysis/section?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}&academic_year=${academicYear}`).catch(() => ({ data: {} })),
        axios.get(`${API}/baseline/section/rounds?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}&academic_year=${academicYear}`).catch(() => ({ data: null })),
      ]);
      const studs = (sr.data?.data || sr.data || []).filter((s: any) => s.is_active !== false);
      setStudents(studs);
      setSectionData(pr.data || {});
      setBaselineData(br.data);
      const subj = [...new Set((mappings?.mappings || []).filter((m: any) => m.grade === classGrade).map((m: any) => m.subject).filter(Boolean))] as string[];
      setSubjects(subj);
    } catch {}
    setLoading(false);
  };

  if (!classGrade || !classSection) return (
    <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">
      No class assigned. Contact admin to set your class teacher assignment.
    </div>
  );

  if (loading) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-800">🏛 My Class — {classGrade} · {classSection}</h3>
        <p className="text-xs text-indigo-600 mt-0.5">{students.length} students</p>
      </div>
      <StudentAnalysisView
        students={students}
        subjects={subjects}
        sectionData={sectionData}
        pasaData={sectionData}
        baselineData={baselineData}
        activitiesData={[]}
        academicYear={academicYear}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 4: MY APPRAISAL
// ─────────────────────────────────────────────────────────────────
function AppraisalTab({ user, academicYear }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [academicYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/appraisal/teacher/${user.id}?academic_year=${academicYear}`);
      setData(r.data);
    } catch { setData(null); }
    setLoading(false);
  };

  if (loading) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400"><p className="text-sm">Loading...</p></div>;
  if (!data) return (
    <div className="bg-white rounded-xl shadow p-10 text-center">
      <p className="text-4xl mb-3">📋</p>
      <p className="text-sm font-semibold text-gray-600">No appraisal found for {academicYear}</p>
      <p className="text-xs text-gray-400 mt-1">Your appraisal will appear here once the principal completes your evaluation.</p>
    </div>
  );

  // overall_score is stored as fraction (0-1), overall_percentage = overall_score * 100
  const pct = n(data.overall_percentage || (data.overall_score ? data.overall_score * 100 : 0));
  const score = pct.toFixed(2);
  const maxScore = 100;

  return (
    <div className="max-w-3xl space-y-4">
      {/* Score card */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">{user?.name}</h2>
            <p className="text-sm text-gray-500">Appraisal Report — {academicYear}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: pct >= 80 ? "#10b981" : pct >= 60 ? "#6366f1" : pct >= 40 ? "#f59e0b" : "#ef4444" }}>{score}%</p>
            <p className="text-xs text-gray-400">out of {maxScore}%</p>
            <p className={`text-xs font-bold mt-0.5 ${scoreBg(pct)} px-2 py-0.5 rounded-full`}>{fmtPct(pct)}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 80 ? "#10b981" : pct >= 60 ? "#6366f1" : pct >= 40 ? "#f59e0b" : "#ef4444" }} />
        </div>
      </div>

      {/* Parameters / criteria breakdown */}
      {(data.parameters || data.criteria || data.categories)?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Parameter-wise Breakdown</h3>
          <div className="space-y-3">
            {(data.parameters || data.criteria || data.categories).map((p: any, i: number) => {
              const pScore = n(p.score || p.marks || p.obtained);
              const pMax = n(p.max_score || p.max_marks || p.max || 10);
              const pPct = pMax > 0 ? (pScore / pMax) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{p.name || p.parameter || p.criterion}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(pPct)}`}>{pScore}/{pMax}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(pPct, 100)}%`, backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                  </div>
                  {p.remarks && <p className="text-xs text-gray-400 mt-0.5 italic">{p.remarks}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart if multiple params */}
      {(data.parameters || data.criteria || data.categories)?.length > 1 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(data.parameters || data.criteria || data.categories).map((p: any) => ({ name: (p.name || p.parameter || "").substring(0, 18), score: n(p.score || p.marks || p.obtained), max: n(p.max_score || p.max_marks || p.max || 10) }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={130} />
              <Tooltip formatter={(v: any, name: any) => [v, name === "score" ? "Score" : "Max"]} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {(data.parameters || data.criteria || data.categories).map((_: any, i: number) => <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Remarks */}
      {data.overall_remarks && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-1">Principal's Remarks</h3>
          <p className="text-sm text-blue-700">{data.overall_remarks}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 5: MY BASELINE
// ─────────────────────────────────────────────────────────────────
function BaselineTab({ user, academicYear }: any) {
  const STAGE_ORDER = ["foundation","preparatory","middle","secondary"];
  const STAGE_LABELS: Record<string,string> = { foundation:"Foundation", preparatory:"Preparatory", middle:"Middle", secondary:"Secondary" };
  const STAGE_GRADE: Record<string,string> = { foundation:"Grade 2", preparatory:"Grade 5", middle:"Grade 8", secondary:"Grade 10" };
  const PROMOTION_THRESHOLD = 80;
  const DOMAIN_COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#84cc16"];

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubj, setActiveSubj] = useState<"literacy"|"numeracy">("literacy");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => { fetchData(); }, [academicYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/baseline/teacher/${user.id}?academic_year=${academicYear}`);
      setData(r.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch { setData(null); }
    setLoading(false);
  };

  if (loading) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Loading...</div>;
  if (!data?.assessments?.length) return (
    <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
      <p className="text-2xl mb-2">📊</p>
      <p className="text-sm font-medium">No baseline data found for {academicYear}.</p>
      <p className="text-xs mt-1">Your administrator will enter your assessment scores.</p>
    </div>
  );

  const assessments: any[] = data.assessments || [];

  // All assessments are now single records per round (subject field kept for compat)
  const allRounds = assessments.sort((a:any,b:any) => a.round > b.round ? 1 : -1);
  const latest = allRounds[allRounds.length - 1];

  const hasLit = allRounds.some((a:any) => a.literacy_scores && Object.keys(a.literacy_scores).length > 0);
  const hasNum = allRounds.some((a:any) => a.numeracy_scores && Object.keys(a.numeracy_scores).length > 0);
  const litRounds = allRounds.filter((a:any) => a.literacy_scores && Object.keys(a.literacy_scores).length > 0);
  const numRounds = allRounds.filter((a:any) => a.numeracy_scores && Object.keys(a.numeracy_scores).length > 0);
  const latestLit = litRounds[litRounds.length - 1];
  const latestNum = numRounds[numRounds.length - 1];

  const litAvg = latest?.literacy_total ? +latest.literacy_total : null;
  const numAvg = latest?.numeracy_total ? +latest.numeracy_total : null;
  const overall = latest?.overall_score ? +latest.overall_score : (litAvg !== null && numAvg !== null ? (litAvg+numAvg)/2 : (litAvg ?? numAvg ?? 0));

  // Get domain names dynamically
  const LIT_LABELS = latest?.literacy_scores ? Object.keys(latest.literacy_scores) : ["Listening","Speaking","Reading","Writing"];
  const NUM_LABELS = latest?.numeracy_scores ? Object.keys(latest.numeracy_scores) : ["Operations","Base 10","Measurement","Geometry"];
  const LIT_DOMAINS = LIT_LABELS; // same — now using names directly
  const NUM_DOMAINS = NUM_LABELS;

  const litStage = (latestLit?.gaps as any)?.lit_stage || latestLit?.stage || latest?.stage || "foundation";
  const numStage = (latestNum?.gaps as any)?.num_stage || latestNum?.stage || latest?.stage || "foundation";
  const litGrade = STAGE_GRADE[litStage];
  const numGrade = STAGE_GRADE[numStage];

  // Subject-wise promotion — read from gaps JSONB where we stored lit_promoted / num_promoted
  const litPromotedInfo = (latestLit?.gaps as any) || {};
  const numPromotedInfo = (latestNum?.gaps as any) || {};
  const litPromoted = litPromotedInfo.lit_promoted === true || latestLit?.promoted === true;
  const numPromoted = numPromotedInfo.num_promoted === true || latestNum?.promoted === true;
  const litPromotedTo = litPromotedInfo.lit_promoted_to || latestLit?.promoted_to_stage || null;
  const numPromotedTo = numPromotedInfo.num_promoted_to || latestNum?.promoted_to_stage || null;

  // Gaps = domains below 60% (using pct values from literacy_pct / numeracy_pct)
  const litGaps = hasLit && latestLit?.literacy_pct
    ? Object.entries(latestLit.literacy_pct).filter(([,v]) => (v as number) < 60).map(([d]) => d)
    : [];
  const numGaps = hasNum && latestNum?.numeracy_pct
    ? Object.entries(latestNum.numeracy_pct).filter(([,v]) => (v as number) < 60).map(([d]) => d)
    : [];

  // Stage progression per subject
  const getStageGroups = (rounds: any[], domains: string[]) => {
    const groups: Record<string, any[]> = {};
    rounds.forEach(r => {
      const s = r.stage || "foundation";
      if (!groups[s]) groups[s] = [];
      groups[s].push(r);
    });
    return groups;
  };

  // Chart data for a subject: one point per round using pct values
  const buildTrendData = (rounds: any[], domains: string[], labels: string[], pctKey: string) =>
    rounds.map((r:any, i:number) => {
      const pctObj = r[pctKey] || {};
      const obj: any = { name: `R${i+1}`, round: r.round };
      labels.forEach((l,j) => { obj[l] = +(pctObj[domains[j]] ?? pctObj[l] ?? 0); });
      const vals = labels.map(l => +(pctObj[l] ?? 0)).filter(v=>v>0);
      obj["Avg"] = vals.length ? +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : 0;
      return obj;
    });

  const litTrend = buildTrendData(litRounds, LIT_DOMAINS, LIT_LABELS, "literacy_pct");
  const numTrend = buildTrendData(numRounds, NUM_DOMAINS, NUM_LABELS, "numeracy_pct");

  const litStageGroups = getStageGroups(litRounds, LIT_DOMAINS);
  const numStageGroups = getStageGroups(numRounds, NUM_DOMAINS);

  const scoreBadge = (v: number) => v >= 80 ? "bg-green-100 text-green-800" : v >= 60 ? "bg-blue-100 text-blue-800" : v >= 40 ? "bg-yellow-100 text-yellow-800" : v > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-400";

  const SubjectCharts = ({ rounds, trend, domains, labels, stageGroups, subj, pctKey }: any) => {
    if (!rounds.length) return null;
    const latestRnd = rounds[rounds.length-1];
    const pctObj = latestRnd[pctKey] || {};
    const vals = labels.map((l:string) => +(pctObj[l] ?? 0)).filter((v:number)=>v>0);
    const avg = vals.length ? vals.reduce((a:number,b:number)=>a+b,0)/vals.length : 0;
    const rGaps = (latestRnd?.gaps as any) || {};
    const isLit = subj === "literacy";
    const promoted = isLit ? (rGaps.lit_promoted === true || latestRnd?.promoted === true) : (rGaps.num_promoted === true);
    const promotedTo = isLit ? (rGaps.lit_promoted_to || latestRnd?.promoted_to_stage) : rGaps.num_promoted_to;
    const currentStage = isLit ? (rGaps.lit_stage || latestRnd?.stage || "foundation") : (rGaps.num_stage || latestRnd?.stage || "foundation");
    const currentGrade = STAGE_GRADE[currentStage] || "Grade 2";

    return (
      <div className="space-y-4">
        {/* Stage journey */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500 font-medium">Stage Journey:</span>
          {STAGE_ORDER.map((s,i) => {
            const hasStage = !!stageGroups[s];
            const isCurrentStage = currentStage === s;
            const wasPromoted = rounds.some((r:any) => {
              const rg = (r.gaps as any) || {};
              return (isLit ? rg.lit_promoted : rg.num_promoted) && (isLit ? (rg.lit_stage || r.stage) : (rg.num_stage || r.stage)) === s;
            });
            return (
              <span key={s} className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                wasPromoted ? "bg-green-600 text-white border-green-600" :
                isCurrentStage ? "bg-indigo-600 text-white border-indigo-600" :
                hasStage ? "bg-gray-200 text-gray-600 border-gray-300" :
                "bg-gray-50 text-gray-300 border-gray-200"
              }`}>
                {STAGE_LABELS[s]} {wasPromoted ? "✓" : isCurrentStage ? "← now" : ""}
              </span>
            );
          })}
        </div>

        {/* Promotion banner */}
        {promoted && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-sm font-bold text-green-800">Stage Promoted!</p>
              <p className="text-xs text-green-600">Promoted to <strong>{STAGE_LABELS[promotedTo]||promotedTo}</strong> stage · Next assessment: {STAGE_GRADE[promotedTo?.toLowerCase()||"foundation"]} competencies</p>
            </div>
          </div>
        )}

        {/* Domain scores — latest round */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-xs font-bold text-gray-600 mb-3">Latest Round — {STAGE_LABELS[currentStage]||currentStage} Stage (Assessed on {currentGrade} competencies)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {labels.map((label:string) => {
              const val = +(pctObj[label] ?? 0);
              return (
                <div key={label} className={`rounded-lg p-3 text-center ${scoreBadge(val)}`}>
                  <div className="text-lg font-bold">{val > 0 ? val.toFixed(1)+"%" : "—"}</div>
                  <div className="text-xs mt-0.5">{label}</div>
                  {val > 0 && val < 60 && <div className="text-xs mt-0.5">⚠️ gap</div>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Subject Average</span>
            <span className={`text-sm font-bold px-3 py-1 rounded-lg ${scoreBadge(avg)}`}>
              {avg > 0 ? avg.toFixed(1)+"%" : "—"} {avg >= 80 ? "🎉" : ""}
            </span>
          </div>
        </div>

        {/* Trend chart — only if 2+ rounds */}
        {trend.length >= 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-xs font-bold text-gray-600 mb-3">Score Trend Across Rounds</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top:5, right:20, bottom:5, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize:11 }} />
                <YAxis domain={[0,100]} tick={{ fontSize:11 }} tickFormatter={v=>`${v}%`} />
                <Tooltip formatter={(v:any)=>`${(+v).toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                {/* 80% threshold line */}
                <Line type="monotone" dataKey="Avg" stroke="#6366f1" strokeWidth={3} dot={{ r:5 }} name="Avg" />
                {labels.map((l:string,i:number) => (
                  <Line key={l} type="monotone" dataKey={l} stroke={DOMAIN_COLORS[i]} strokeWidth={1.5} dot={{ r:3 }} strokeDasharray="4 2" />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {/* 80% indicator */}
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-6 h-0.5 bg-green-500"></div>
              <span>80% = Promotion threshold</span>
            </div>
          </div>
        )}

        {/* Per-domain bar chart */}
        {trend.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-xs font-bold text-gray-600 mb-3">Domain Breakdown (Latest Round)</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={labels.map((l:string) => ({ domain:l, score: +(pctObj[l] ?? 0), threshold:80 }))} margin={{top:5,right:10,bottom:5,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="domain" tick={{ fontSize:10 }} />
                <YAxis domain={[0,100]} tick={{ fontSize:10 }} tickFormatter={v=>`${v}%`} />
                <Tooltip formatter={(v:any)=>`${(+v).toFixed(1)}%`} />
                <Bar dataKey="score" radius={[4,4,0,0]}>
                  {labels.map((_:string,i:number) => {
                    const val = +(pctObj[labels[i]] ?? 0);
                    return <Cell key={i} fill={val >= 80 ? "#10b981" : val >= 60 ? "#6366f1" : val >= 40 ? "#f59e0b" : "#ef4444"} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full max-w-3xl">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-700">📊 My Baseline Assessment</h3>
          {lastUpdated && <p className="text-xs text-gray-400">Last synced: {lastUpdated}</p>}
        </div>
        <button onClick={fetchData} disabled={loading}
          className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50">
          {loading ? "⏳" : "🔄"} Refresh
        </button>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"Overall", val: overall > 0 ? overall.toFixed(1)+"%" : "—", color: scoreBadge(overall) },
          { label:"Lit Avg", val: litAvg !== null ? litAvg.toFixed(1)+"%" : "—", color: scoreBadge(litAvg||0) },
          { label:"Num Avg", val: numAvg !== null ? numAvg.toFixed(1)+"%" : "—", color: scoreBadge(numAvg||0) },
          { label:"Gaps", val: [...litGaps,...numGaps].length, color:"bg-orange-50 text-orange-800" },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-3 text-center border ${k.color}`}>
            <div className="text-xl font-bold">{k.val}</div>
            <div className="text-xs mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Stage summary */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Current Stage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hasLit && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-600 font-semibold mb-1">📖 Literacy</div>
              <div className="text-sm font-bold text-blue-800">{STAGE_LABELS[litStage]} Stage</div>
              <div className="text-xs text-blue-600">Assessed on {litGrade} competencies</div>
              {litPromoted && (
                <div className="text-xs text-green-700 font-bold mt-1 bg-green-50 rounded px-2 py-0.5">
                  🎉 Promoted to {litPromotedTo ? STAGE_LABELS[litPromotedTo] || litPromotedTo : "next stage"}
                </div>
              )}
            </div>
          )}
          {hasNum && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-xs text-purple-600 font-semibold mb-1">🔢 Numeracy</div>
              <div className="text-sm font-bold text-purple-800">{STAGE_LABELS[numStage]} Stage</div>
              <div className="text-xs text-purple-600">Assessed on {numGrade} competencies</div>
              {numPromoted && (
                <div className="text-xs text-green-700 font-bold mt-1 bg-green-50 rounded px-2 py-0.5">
                  🎉 Promoted to {numPromotedTo ? STAGE_LABELS[numPromotedTo] || numPromotedTo : "next stage"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stage progression timeline — all rounds */}
      {allRounds.length > 1 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">📈 Stage Progression</h3>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full" style={{minWidth:"400px"}}>
              <thead>
                <tr className="bg-indigo-700 text-white">
                  <th className="px-3 py-2 text-left">Subject</th>
                  {allRounds.map((r:any, i:number) => (
                    <th key={r.round} className="px-3 py-2 text-center">Round {i+1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50">
                  <td className="px-3 py-2 font-bold text-blue-700">📖 Literacy</td>
                  {allRounds.map((r:any, i:number) => {
                    const rGaps = (r.gaps as any) || {};
                    const stage = rGaps.lit_stage || r.stage || "foundation";
                    const promoted = rGaps.lit_promoted === true;
                    const promotedTo = rGaps.lit_promoted_to;
                    const pct = r.literacy_total ? +r.literacy_total : null;
                    return (
                      <td key={r.round} className="px-2 py-2 text-center">
                        <div className="text-xs capitalize font-medium text-blue-700">{STAGE_LABELS[stage]||stage}</div>
                        {pct !== null && <div className={`text-xs font-bold mt-0.5 px-1.5 py-0.5 rounded-full inline-block ${pct>=80?"bg-green-100 text-green-700":pct>=60?"bg-blue-100 text-blue-700":pct>=40?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700"}`}>{pct.toFixed(1)}%</div>}
                        {promoted && <div className="text-green-600 font-bold text-xs mt-0.5">🎉 → {STAGE_LABELS[promotedTo]||promotedTo}</div>}
                      </td>
                    );
                  })}
                </tr>
                <tr className="bg-purple-50">
                  <td className="px-3 py-2 font-bold text-purple-700">🔢 Numeracy</td>
                  {allRounds.map((r:any, i:number) => {
                    const rGaps = (r.gaps as any) || {};
                    const stage = rGaps.num_stage || r.stage || "foundation";
                    const promoted = rGaps.num_promoted === true;
                    const promotedTo = rGaps.num_promoted_to;
                    const pct = r.numeracy_total ? +r.numeracy_total : null;
                    return (
                      <td key={r.round} className="px-2 py-2 text-center">
                        <div className="text-xs capitalize font-medium text-purple-700">{STAGE_LABELS[stage]||stage}</div>
                        {pct !== null && <div className={`text-xs font-bold mt-0.5 px-1.5 py-0.5 rounded-full inline-block ${pct>=80?"bg-green-100 text-green-700":pct>=60?"bg-blue-100 text-blue-700":pct>=40?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700"}`}>{pct.toFixed(1)}%</div>}
                        {promoted && <div className="text-green-600 font-bold text-xs mt-0.5">🎉 → {STAGE_LABELS[promotedTo]||promotedTo}</div>}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gap analysis */}
      {(litGaps.length > 0 || numGaps.length > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-orange-800 mb-2">⚠️ Gap Areas (below subject average)</h3>
          <div className="flex flex-wrap gap-2">
            {litGaps.map(g => <span key={g} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">📖 {g}</span>)}
            {numGaps.map(g => <span key={g} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">🔢 {g}</span>)}
          </div>
          <p className="text-xs text-orange-600 mt-2">These domains are below your subject average. Use AI Practice Paper to improve.</p>
        </div>
      )}

      {/* Subject tabs */}
      {hasLit && hasNum && (
        <div className="flex gap-2">
          {["literacy","numeracy"].map(s => (
            <button key={s} onClick={()=>setActiveSubj(s as any)}
              className={`px-4 py-2 text-sm rounded-lg font-medium border ${activeSubj===s?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>
              {s === "literacy" ? "📖 Literacy" : "🔢 Numeracy"}
            </button>
          ))}
        </div>
      )}

      {/* Charts */}
      {(!hasLit || !hasNum || activeSubj === "literacy") && hasLit && (
        <SubjectCharts rounds={litRounds} trend={litTrend} domains={LIT_DOMAINS} labels={LIT_LABELS} stageGroups={litStageGroups} subj="literacy" pctKey="literacy_pct" />
      )}
      {(!hasLit || !hasNum || activeSubj === "numeracy") && hasNum && (
        <SubjectCharts rounds={numRounds} trend={numTrend} domains={NUM_DOMAINS} labels={NUM_LABELS} stageGroups={numStageGroups} subj="numeracy" pctKey="numeracy_pct" />
      )}

      {/* All rounds history table */}
      {assessments.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700">All Rounds History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{minWidth:"600px"}}>
              <thead>
                <tr className="bg-indigo-700 text-white">
                  <th className="px-3 py-2 text-left">Round</th>
                  <th className="px-3 py-2 text-center">Subject</th>
                  <th className="px-3 py-2 text-center">Stage</th>
                  <th className="px-3 py-2 text-center">Date</th>
                  <th className="px-3 py-2 text-center">Avg</th>
                  <th className="px-3 py-2 text-center">Promoted?</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a:any,i:number) => {
                  const domains = a.subject==="literacy" ? LIT_DOMAINS : NUM_DOMAINS;
                  const avg = domains.reduce((s:number,d:string)=>s + Number(a[d]||0),0)/domains.length;
                  return (
                    <tr key={a.id||i} className={`border-b border-gray-100 ${i%2===0?"bg-white":"bg-gray-50"}`}>
                      <td className="px-3 py-2 font-medium">{a.round?.replace("baseline_","R")}</td>
                      <td className="px-3 py-2 text-center">{a.subject==="literacy"?"📖 Literacy":"🔢 Numeracy"}</td>
                      <td className="px-3 py-2 text-center capitalize">{STAGE_LABELS[a.stage]||a.stage}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{a.assessment_date||"—"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold ${scoreBadge(avg)}`}>{avg>0?avg.toFixed(1)+"%":"—"}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {a.promoted ? <span className="text-green-700 font-bold">🎉 → {a.promoted_to_stage}</span> : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// PA/SA TAB — Marks Entry + Full Analysis (teacher's subjects only)
// ─────────────────────────────────────────────────────────────────
function PASATab({ user, mappings, academicYear }: any) {
  const API = "https://cbas-backend-production.up.railway.app";
  const EXAM_TYPES = ["FA1","FA2","SA1","FA3","FA4","SA2","Custom"];

  const allMappingsPasa: any[] = mappings?.mappings || [];
  const teacherSubjects: string[] = [...new Set(allMappingsPasa.map((m:any) => m.subject).filter(Boolean))] as string[];
  const isClassTeacher = !!(mappings?.is_class_teacher || user?.class_teacher_of);
  const classGrade = mappings?.class_grade || "";
  const classSection = mappings?.class_section || "";

  const [subTab, setSubTab] = useState<"config"|"entry"|"dashboard">("config");

  // Config state
  const [configs, setConfigs] = useState<any[]>([]);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configForm, setConfigForm] = useState({ subject: teacherSubjects[0]||"", exam_type:"FA1", exam_date:"", description:"" });
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [loadingComps, setLoadingComps] = useState(false);
  const [selectedComps, setSelectedComps] = useState<any[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Entry state
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [entryStudents, setEntryStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string,Record<string,number|null>>>({});
  const [absent, setAbsent] = useState<Record<string,boolean>>({});
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // Dashboard state
  const [dashData, setDashData] = useState<any>(null);
  const [dashExam, setDashExam] = useState("");
  const [loadingDash, setLoadingDash] = useState(false);

  const [msg, setMsg] = useState("");

  useEffect(() => { fetchConfigs(); }, [academicYear, mappings]);
  useEffect(() => { if (subTab==="dashboard") fetchDashboard(); }, [subTab, dashExam, academicYear]);

  const fetchConfigs = async () => {
    try {
      // Fetch configs for this teacher across all their assigned sections
      const allMappingsLocal: any[] = mappings?.mappings || [];
      const sections = classGrade && classSection
        ? [{ grade: classGrade, section: classSection }]
        : [...new Map(allMappingsLocal.map((m:any) => [`${m.grade}__${m.section}`, { grade: m.grade, section: m.section }])).values()];

      let allConfigs: any[] = [];
      for (const sec of sections) {
        if (!sec.grade || !sec.section) continue;
        const r = await axios.get(`${API}/pasa/config/section?grade=${encodeURIComponent(sec.grade)}&section=${encodeURIComponent(sec.section)}&academic_year=${academicYear}`);
        allConfigs.push(...(r.data?.configs || []));
      }
      setConfigs(allConfigs);
    } catch {}
  };

  const fetchCompetencies = async (subj?: string) => {
    const s = subj || configForm.subject;
    if (!s) return;
    setLoadingComps(true);
    try {
      let url = `${API}/activities/competencies?subject=${encodeURIComponent(s)}`;
      if (classGrade) url += `&grade=${encodeURIComponent(classGrade)}`;
      let r = await axios.get(url);
      let data = r.data?.competencies || [];
      // Fallback: try without grade if no results
      if (data.length === 0 && classGrade) {
        r = await axios.get(`${API}/activities/competencies?subject=${encodeURIComponent(s)}`);
        data = r.data?.competencies || [];
      }
      setCompetencies(Array.isArray(data) ? data : []);
    } catch {}
    setLoadingComps(false);
  };

  // Auto-load competencies when subject changes
  useEffect(() => { if (configForm.subject && classGrade) fetchCompetencies(); }, [configForm.subject, classGrade]);

  const toggleComp = (comp: any) => {
    setSelectedComps(prev => {
      const exists = prev.find((c:any)=>c.competency_id===comp.id);
      if (exists) return prev.filter((c:any)=>c.competency_id!==comp.id);
      return [...prev,{competency_id:comp.id,competency_code:comp.code,competency_name:comp.name,max_marks:10}];
    });
  };

  const updateMaxMarks = (cid:string, mm:number) => setSelectedComps(p=>p.map((c:any)=>c.competency_id===cid?{...c,max_marks:mm}:c));
  const totalMarks = selectedComps.reduce((s:number,c:any)=>s+(+c.max_marks||0),0);

  const saveConfig = async () => {
    if (!configForm.subject||!configForm.exam_type||!selectedComps.length){setMsg("❌ Fill all fields and select competencies");return;}
    setSavingConfig(true);
    try {
      const r = await axios.post(`${API}/pasa/config`,{
        teacher_id:user.id, teacher_name:user.name,
        subject:configForm.subject, grade:classGrade, section:classSection,
        exam_type:configForm.exam_type, exam_date:configForm.exam_date,
        description:configForm.description, academic_year:academicYear,
        competencies:selectedComps,
      });
      if(r.data?.success){setMsg("✅ Config saved!");setShowConfigForm(false);setSelectedComps([]);fetchConfigs();}
    } catch {setMsg("❌ Save failed");}
    setSavingConfig(false);setTimeout(()=>setMsg(""),3000);
  };

  const loadEntryStudents = async (config:any) => {
    setSelectedConfig(config);setLoadingEntry(true);setEntryStudents([]);
    try {
      // Use grade/section from config itself — works for both class and subject teachers
      const entryGrade = config.grade || classGrade;
      const entrySection = config.section || classSection;
      const r = await axios.get(`${API}/pasa/marks/entry?exam_config_id=${config.id}&grade=${encodeURIComponent(entryGrade)}&section=${encodeURIComponent(entrySection)}`);
      const sl = r.data?.students||[];
      setEntryStudents(sl);
      const im:Record<string,Record<string,number|null>>={};
      const ia:Record<string,boolean>={};
      sl.forEach((s:any)=>{
        im[s.student_id]={};
        ia[s.student_id]=s.existing_marks?.is_absent||false;
        const cs=s.existing_marks?.competency_scores||[];
        (config.competencies as any[]).forEach((c:any)=>{
          const ex=cs.find((x:any)=>x.competency_id===c.competency_id);
          im[s.student_id][c.competency_id]=ex?.marks_obtained??null;
        });
      });
      setMarks(im);setAbsent(ia);
      setSubTab("entry");
    } catch {setMsg("❌ Failed to load students.");}
    setLoadingEntry(false);
  };

  const calcTotal = (sid:string) => {
    if(absent[sid]||!selectedConfig)return{total:0,pct:0};
    let total=0;
    (selectedConfig.competencies as any[]).forEach((c:any)=>{total+=+(marks[sid]?.[c.competency_id]||0);});
    return{total,pct:selectedConfig.total_marks>0?+((total/selectedConfig.total_marks)*100).toFixed(1):0};
  };

  const saveMarks = async () => {
    if(!selectedConfig||!entryStudents.length)return;
    setSavingMarks(true);
    try {
      const entries = entryStudents.map((s:any)=>({
        student_id:s.student_id, student_name:s.student_name,
        is_absent:absent[s.student_id]||false,
        competency_scores:(selectedConfig.competencies as any[]).map((c:any)=>({
          competency_id:c.competency_id, competency_code:c.competency_code,
          competency_name:c.competency_name,
          marks_obtained:absent[s.student_id]?null:(marks[s.student_id]?.[c.competency_id]??null),
          max_marks:c.max_marks,
        })),
      }));
      await axios.post(`${API}/pasa/marks`,{
        exam_config_id:selectedConfig.id,
        grade:selectedConfig.grade||classGrade,
        section:selectedConfig.section||classSection,
        subject:selectedConfig.subject, exam_type:selectedConfig.exam_type,
        academic_year:academicYear, teacher_id:user.id, entries,
      });
      setMsg("✅ Marks saved!");
    } catch {setMsg("❌ Save failed.");}
    setSavingMarks(false);setTimeout(()=>setMsg(""),3000);
  };

  const fetchDashboard = async () => {
    setLoadingDash(true);setDashData(null);
    try {
      const et = dashExam?`&exam_type=${dashExam}`:"";
      const r = await axios.get(`${API}/pasa/dashboard/section?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}&academic_year=${academicYear}${et}`);
      setDashData(r.data);
    } catch {}
    setLoadingDash(false);
  };

  if (!classGrade||!classSection) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
        <p className="text-sm">PA/SA marks are available for class teachers and subject teachers with assigned sections.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
        <p className="text-sm font-bold text-indigo-800">📝 PA/SA Marks — {classGrade} · {classSection}</p>
        <p className="text-xs text-indigo-600">Competency-mapped exam system · {academicYear}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{id:"config",label:"⚙️ Exam Config"},{id:"entry",label:"✏️ Marks Entry"},{id:"dashboard",label:"📊 Dashboard"}].map(t=>(
          <button key={t.id} onClick={()=>setSubTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${subTab===t.id?"bg-indigo-600 text-white":"bg-white border border-gray-300 text-gray-600 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {msg&&<div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅")?"bg-green-50 border-green-300 text-green-800":"bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* CONFIG TAB */}
      {subTab==="config"&&(
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">{configs.length} configurations for {classGrade} · {classSection}</p>
            <button onClick={()=>setShowConfigForm(!showConfigForm)} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
              {showConfigForm?"✕ Cancel":"+ New Config"}
            </button>
          </div>

          {showConfigForm&&(
            <div className="bg-white rounded-xl shadow border p-4 space-y-4">
              <h3 className="text-sm font-bold text-gray-700">New Exam Config for {classGrade} · {classSection}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Subject *</label>
                  {teacherSubjects.length>0?(
                    <select value={configForm.subject} onChange={e=>setConfigForm(p=>({...p,subject:e.target.value}))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                      {teacherSubjects.map((s:string)=><option key={s} value={s}>{s}</option>)}
                    </select>
                  ):(
                    <input type="text" value={configForm.subject} onChange={e=>setConfigForm(p=>({...p,subject:e.target.value}))} placeholder="Subject" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Exam Type *</label>
                  <select value={configForm.exam_type} onChange={e=>setConfigForm(p=>({...p,exam_type:e.target.value}))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    {EXAM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Exam Date</label>
                  <input type="date" value={configForm.exam_date} onChange={e=>setConfigForm(p=>({...p,exam_date:e.target.value}))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">Select Competencies</label>
                  {loadingComps && <span className="text-xs text-indigo-500 animate-pulse">Loading competencies...</span>}
                </div>
                {competencies.length>0&&(
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded divide-y">
                    {competencies.map((c:any)=>{
                      const sel=selectedComps.find((x:any)=>x.competency_id===c.id);
                      return(
                        <div key={c.id} className={`px-3 py-2 flex items-center gap-2 ${sel?"bg-indigo-50":""}`}>
                          <input type="checkbox" checked={!!sel} onChange={()=>toggleComp(c)} className="accent-indigo-600" />
                          <span className="text-xs text-indigo-600 font-medium">[{c.code}]</span>
                          <span className="text-xs text-gray-700 flex-1">{c.name?.slice(0,60)}</span>
                          {sel&&<input type="number" value={sel.max_marks} min={1} max={100} onChange={e=>updateMaxMarks(c.id,+e.target.value)} className="border rounded px-1 py-0.5 text-xs w-14 text-center" />}
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedComps.length>0&&(
                  <div className="mt-2 bg-indigo-50 rounded p-2 text-xs">
                    <span className="font-bold text-indigo-800">{selectedComps.length} selected · Total: {totalMarks} marks</span>
                  </div>
                )}
              </div>
              <button onClick={saveConfig} disabled={savingConfig} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                {savingConfig?"Saving...":"💾 Save Config"}
              </button>
            </div>
          )}

          {configs.length===0?(
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">No configs yet. Create one above.</div>
          ):(
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="divide-y divide-gray-100">
                {configs.map((c:any)=>(
                  <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">{c.exam_type}</span>
                        <span className="text-sm font-medium text-gray-800">{c.subject}</span>
                        <span className="text-xs text-gray-500">· {(c.competencies as any[])?.length||0} comps · {c.total_marks} marks</span>
                      </div>
                    </div>
                    <button onClick={()=>loadEntryStudents(c)} disabled={loadingEntry}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50">
                      {loadingEntry?"Loading...":"✏️ Enter Marks"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ENTRY TAB */}
      {subTab==="entry"&&selectedConfig&&entryStudents.length>0&&(
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-bold text-indigo-800">{selectedConfig.exam_type} — {selectedConfig.subject}</p>
              <p className="text-xs text-indigo-600">{(selectedConfig.competencies as any[]).length} competencies · {selectedConfig.total_marks} total marks</p>
            </div>
            <button onClick={saveMarks} disabled={savingMarks} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
              {savingMarks?"Saving...":"💾 Save Marks"}
            </button>
          </div>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-indigo-700 text-white">
                    <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[150px]">Student</th>
                    <th className="px-2 py-2 text-center w-14">Absent</th>
                    {(selectedConfig.competencies as any[]).map((c:any)=>(
                      <th key={c.competency_id} className="px-2 py-2 text-center min-w-[70px]">
                        <div>{c.competency_code}</div>
                        <div className="text-indigo-200">/{c.max_marks}</div>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center min-w-[55px]">Total</th>
                    <th className="px-2 py-2 text-center min-w-[45px]">%</th>
                  </tr>
                </thead>
                <tbody>
                  {entryStudents.map((s:any,i:number)=>{
                    const {total,pct}=calcTotal(s.student_id);
                    const isAbs=absent[s.student_id];
                    return(
                      <tr key={s.student_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                        <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit">{s.student_name}</td>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={isAbs} onChange={e=>setAbsent(p=>({...p,[s.student_id]:e.target.checked}))} className="accent-red-500" /></td>
                        {(selectedConfig.competencies as any[]).map((c:any)=>(
                          <td key={c.competency_id} className="px-2 py-1 text-center">
                            <input type="number" min={0} max={c.max_marks}
                              value={marks[s.student_id]?.[c.competency_id]??""}
                              disabled={isAbs}
                              onChange={e=>{
                                const v=e.target.value===""?null:Math.min(+e.target.value,c.max_marks);
                                setMarks(p=>({...p,[s.student_id]:{...p[s.student_id],[c.competency_id]:v}}));
                              }}
                              className="border border-gray-300 rounded px-1 py-0.5 w-12 text-center disabled:bg-gray-100" />
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center font-bold">
                          {isAbs?<span className="text-red-500">Absent</span>:total}</td>
                        <td className="px-2 py-2 text-center">
                          {!isAbs&&pct>0&&<span className={`px-1 py-0.5 rounded text-xs font-bold ${pct>=80?"bg-green-100 text-green-700":pct>=60?"bg-blue-100 text-blue-700":pct>=40?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700"}`}>{pct}%</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={saveMarks} disabled={savingMarks} className="px-6 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
            {savingMarks?"Saving...":"💾 Save Marks"}
          </button>
        </div>
      )}
      {subTab==="entry"&&!selectedConfig&&(
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">Select an exam config from the Config tab and click "Enter Marks".</div>
      )}

      {/* DASHBOARD TAB */}
      {subTab==="dashboard"&&(
        <div className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Exam Type</label>
              <select value={dashExam} onChange={e=>setDashExam(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">All Exams</option>
                {EXAM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={fetchDashboard} className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">🔄 Refresh</button>
          </div>
          {loadingDash?(
            <div className="bg-white rounded-xl shadow p-8 text-center"><div className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
          ):dashData&&(
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Subject & Competency Overview</h3>
              {dashData.subjectSummary?.length===0?(
                <p className="text-xs text-gray-400">No data yet. Enter marks first.</p>
              ):dashData.subjectSummary?.map((s:any)=>(
                <div key={s.subject} className="mb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-medium text-gray-700 w-24 truncate">{s.subject}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{width:`${s.avg_percentage}%`}}></div>
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-20 text-right">{s.avg_percentage?.toFixed(1)}%</span>
                  </div>
                  {s.competency_avgs?.length>0&&(
                    <div className="ml-28 flex gap-2 flex-wrap">
                      {s.competency_avgs.map((c:any)=>(
                        <span key={c.code} className={`px-1.5 py-0.5 rounded text-xs ${c.avg<60?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>{c.code}: {c.avg?.toFixed(0)}%</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ACTIVITIES TAB — Create + Marks Entry + Coverage + Analysis
// ─────────────────────────────────────────────────────────────────
function ActivitiesTab({ user, mappings, academicYear }: any) {
  const API = "https://cbas-backend-production.up.railway.app";
  const ACTIVITY_TYPES = ["Individual","Group","Project","Assessment","Workshop","Other"];
  const LEVELS = ["Beginning","Developing","Approaching","Meeting","Exceeding","Proficient","Advanced","Mastery"];
  const LEVEL_COLOR: Record<string,string> = {
    Beginning:"bg-red-100 text-red-700", Developing:"bg-orange-100 text-orange-700",
    Approaching:"bg-yellow-100 text-yellow-700", Meeting:"bg-lime-100 text-lime-700",
    Exceeding:"bg-green-100 text-green-700", Proficient:"bg-teal-100 text-teal-700",
    Advanced:"bg-blue-100 text-blue-700", Mastery:"bg-purple-100 text-purple-700",
  };
  const GRADE_TO_STAGE: Record<string,string> = {
    "Pre-KG":"foundation","LKG":"foundation","UKG":"foundation",
    "Grade 1":"foundation","Grade 2":"foundation",
    "Grade 3":"preparatory","Grade 4":"preparatory","Grade 5":"preparatory",
    "Grade 6":"middle","Grade 7":"middle","Grade 8":"middle",
    "Grade 9":"secondary","Grade 10":"secondary",
  };
  const normalizeSubject = (s: string) => s.trim().toLowerCase().replace(/\s+/g,"_").replace(/[()]/g,"");

  const [subTab, setSubTab] = useState<"create"|"marks"|"report"|"coverage"|"analysis">("create");
  const [activities, setActivities] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Build teacher combos from mappings
  const allMappings: any[] = mappings?.mappings || [];
  const gradeSet = new Set<string>();
  const sectionsByGrade: Record<string,string[]> = {};
  const subjectSet = new Set<string>();
  allMappings.forEach((m: any) => {
    gradeSet.add(m.grade);
    if (m.subject) subjectSet.add(m.subject);
    if (!sectionsByGrade[m.grade]) sectionsByGrade[m.grade] = [];
    if (m.section && !sectionsByGrade[m.grade].includes(m.section)) sectionsByGrade[m.grade].push(m.section);
  });
  const allGrades = [...gradeSet].sort();
  const allSubjects = [...subjectSet].sort();

  // Create form state
  const [form, setForm] = useState({
    name: "", description: "", grade: allGrades[0]||"",
    sections: [] as string[], subject: allSubjects[0]||"",
    activity_type: "Individual", activity_date: new Date().toISOString().split("T")[0],
  });
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [selectedComps, setSelectedComps] = useState<string[]>([]);
  // rubrics: { [competency_id]: { name: string, items: [{name:string, max_marks:number}] } }
  const [rubrics, setRubrics] = useState<Record<string,{name:string,items:{name:string,max_marks:number}[]}>>({});
  const [savingActivity, setSavingActivity] = useState(false);

  // Marks entry state
  const [marksFilterGrade, setMarksFilterGrade] = useState(allGrades[0]||"");
  const [marksFilterSection, setMarksFilterSection] = useState("");
  const [marksFilterSubject, setMarksFilterSubject] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [marksData, setMarksData] = useState<any>(null);
  // { student_id: { competency_id: { rubric_index: marks } } }
  const [localMarks, setLocalMarks] = useState<Record<string,Record<string,Record<string,number|null>>>>({});
  const [savingMarks, setSavingMarks] = useState(false);

  // Coverage
  const [coverageGrade, setCoverageGrade] = useState("");
  const [coverage, setCoverage] = useState<any>(null);

  // Subject-wise report
  const [reportGrade, setReportGrade] = useState(allGrades[0]||"");
  const [reportSection, setReportSection] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string|null>(null);

  useEffect(() => { fetchActivities(); }, [academicYear]);
  useEffect(() => {
    if (form.grade && form.subject) fetchCompetencies();
    setForm(p => ({ ...p, sections: [], }));
    setSelectedComps([]);
    setRubrics({});
  }, [form.grade, form.subject]);
  useEffect(() => { if (selectedActivity) fetchMarksData(); }, [selectedActivity]);
  useEffect(() => { if (subTab==="coverage" && coverageGrade) fetchCoverage(); }, [subTab, coverageGrade]);
  useEffect(() => {
    if (subTab==="report") {
      const g = reportGrade || allGrades[0];
      const s = reportSection || (sectionsByGrade[g]||[])[0];
      if (g && s) fetchReport(g, s);
    }
  }, [subTab, reportGrade, reportSection]);

  const fetchActivities = async () => {
    try {
      const results = await Promise.all(allGrades.map(grade =>
        axios.get(`${API}/activities?academic_year=${academicYear}&grade=${encodeURIComponent(grade)}`).then(r=>r.data||[]).catch(()=>[])
      ));
      const merged = results.flat();
      const seen = new Set<string>();
      setActivities(merged.filter((a:any)=>{ if(seen.has(a.id))return false; seen.add(a.id); return true; }));
    } catch {}
  };

  const fetchCompetencies = async () => {
    try {
      const subNorm = normalizeSubject(form.subject);
      const stage = GRADE_TO_STAGE[form.grade]||"middle";
      let r = await axios.get(`${API}/activities/competencies?subject=${encodeURIComponent(subNorm)}&grade=${encodeURIComponent(form.grade)}`);
      let data = r.data?.competencies || r.data || [];
      if (!data.length) {
        r = await axios.get(`${API}/activities/competencies?subject=${encodeURIComponent(subNorm)}&stage=${encodeURIComponent(stage)}`);
        data = r.data?.competencies || r.data || [];
      }
      setCompetencies(data);
    } catch { setCompetencies([]); }
  };

  const fetchMarksData = async () => {
    if (!selectedActivity) return;
    try {
      const r = await axios.get(`${API}/activities/${selectedActivity.id}/marks?academic_year=${academicYear}`);
      setMarksData(r.data);
      // Initialize localMarks from existing data
      const init: Record<string,Record<string,Record<string,number|null>>> = {};
      (r.data?.students || []).forEach((s:any) => {
        init[s.student.id] = {};
        const cm = s.assessment?.competency_marks || {};
        (r.data?.rubrics || []).forEach((rub:any) => {
          init[s.student.id][rub.competency_id] = {};
          (rub.rubric_items||[]).forEach((_:any, i:number) => {
            init[s.student.id][rub.competency_id][String(i)] = cm[rub.competency_id]?.[String(i)] ?? null;
          });
        });
      });
      setLocalMarks(init);
    } catch {}
  };

  const fetchCoverage = async () => {
    if (!coverageGrade) return;
    try {
      const sec = sectionsByGrade[coverageGrade]?.[0];
      if (!sec) { setCoverage(null); return; }
      const r = await axios.get(`${API}/activities/coverage/section/${encodeURIComponent(coverageGrade)}/${encodeURIComponent(sec)}?academic_year=${academicYear}`);
      setCoverage(r.data);
    } catch { setCoverage(null); }
  };

  const toggleComp = (id: string) => {
    setSelectedComps(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x=>x!==id);
        setRubrics(r => { const n={...r}; delete n[id]; return n; });
        return next;
      }
      // Add with default empty rubric
      const comp = competencies.find(c=>c.id===id);
      setRubrics(r => ({...r, [id]: { name: comp?.name||comp?.description||"", items:Array(5).fill(null).map(()=>({name:"",max_marks:0})) }}));
      return [...prev, id];
    });
  };

  const addRubricItem = (compId: string) => {
    setRubrics(r => ({...r, [compId]: {...r[compId], items:[...r[compId].items, {name:"",max_marks:0}]}}));
  };

  const removeRubricItem = (compId: string, idx: number) => {
    setRubrics(r => ({...r, [compId]: {...r[compId], items: r[compId].items.filter((_,i)=>i!==idx)}}));
  };

  const updateRubricItem = (compId: string, idx: number, field: "name"|"max_marks", value: any) => {
    setRubrics(r => {
      const items = [...r[compId].items];
      items[idx] = {...items[idx], [field]: field==="max_marks"?+value:value};
      return {...r, [compId]: {...r[compId], items}};
    });
  };

  const totalMaxMarks = selectedComps.reduce((sum, cid) => {
    return sum + (rubrics[cid]?.items||[]).reduce((s,item)=>s+(+item.max_marks||0),0);
  }, 0);

  const saveActivity = async () => {
    if (!form.name||!form.grade||!form.subject||!form.sections.length) {
      setMsg("❌ Name, Grade, Subject and at least one Section are required"); setTimeout(()=>setMsg(""),3000); return;
    }
    if (!selectedComps.length) {
      setMsg("❌ Select at least one competency"); setTimeout(()=>setMsg(""),3000); return;
    }
    // Validate rubrics - each selected competency needs at least one filled rubric
    for (const cid of selectedComps) {
      const rub = rubrics[cid];
      const filled=(rub?.items||[]).filter(item=>item.name.trim()&&+item.max_marks>0);
      if (!filled.length) { setMsg("❌ Each selected competency needs at least one rubric with a name and marks > 0"); setTimeout(()=>setMsg(""),3000); return; }
    }
    setSavingActivity(true);
    try {
      const stage = GRADE_TO_STAGE[form.grade]||"middle";
      const rubricsArr = selectedComps.map(cid => {
        const comp = competencies.find(c=>c.id===cid);
        return {
          competency_id: cid,
          competency_code: comp?.code||comp?.competency_code||"",
          competency_name: comp?.name||comp?.description||"",
          rubric_items: (rubrics[cid]?.items||[]).filter(item=>item.name.trim()||+item.max_marks>0),
        };
      });
      const res = await axios.post(`${API}/activities`, {
        ...form, stage, academic_year: academicYear, created_by: user?.id,
        sections: form.sections,
        competency_mappings: selectedComps,
        rubrics: rubricsArr,
      });
      const skipped = res.data?.skipped_sections || [];
      setMsg(skipped.length
        ? `✅ Created for ${res.data.created_count} section(s). ⚠️ Already exists in: ${skipped.join(", ")}`
        : `✅ Activity created for ${res.data.created_count} section(s)`);
      setShowForm(false);
      setSelectedComps([]); setRubrics({});
      setForm(p=>({...p, name:"", description:"", sections:[], }));
      fetchActivities();
    } catch { setMsg("❌ Error creating activity"); }
    setSavingActivity(false);
    setTimeout(()=>setMsg(""),3000);
  };

  const fetchReport = async (g: string, s: string) => {
    setLoadingReport(true); setReportData(null);
    try {
      const r = await axios.get(`${API}/activities/report/subject-wise/${encodeURIComponent(g)}/${encodeURIComponent(s)}?academic_year=${academicYear}`);
      setReportData(r.data);
    } catch {}
    setLoadingReport(false);
  };

    const deleteActivity = async (id: string) => {
    if (!confirm("Delete this activity?")) return;
    try { await axios.delete(`${API}/activities/${id}`); setMsg("✅ Deleted"); fetchActivities(); } catch { setMsg("❌ Error"); }
    setTimeout(()=>setMsg(""),3000);
  };

  const updateMark = (studentId: string, compId: string, rubricIdx: string, value: number|null) => {
    setLocalMarks(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId]||{}),
        [compId]: { ...(prev[studentId]?.[compId]||{}), [rubricIdx]: value }
      }
    }));
  };

  const calcStudentTotal = (studentId: string) => {
    if (!marksData?.rubrics) return { obtained: 0, max: 0, pct: 0 };
    let obtained = 0; let max = 0;
    marksData.rubrics.forEach((rub:any) => {
      (rub.rubric_items||[]).forEach((item:any, i:number) => {
        max += +(item.max_marks||0);
        obtained += +(localMarks[studentId]?.[rub.competency_id]?.[String(i)]||0);
      });
    });
    const pct = max > 0 ? +((obtained/max)*100).toFixed(1) : 0;
    return { obtained, max, pct };
  };

  const getLevel = (pct: number) => {
    if (pct>=95) return "Mastery";
    if (pct>=86) return "Advanced";
    if (pct>=76) return "Proficient";
    if (pct>=66) return "Exceeding";
    if (pct>=51) return "Meeting";
    if (pct>=36) return "Approaching";
    if (pct>=21) return "Developing";
    return "Beginning";
  };

  const saveMarks = async () => {
    if (!marksData||!selectedActivity) return;
    setSavingMarks(true);
    try {
      const entries = (marksData.students||[]).map((s:any) => ({
        student_id: s.student.id,
        student_name: s.student.name,
        competency_marks: localMarks[s.student.id] || {},
      }));
      await axios.post(`${API}/activities/${selectedActivity.id}/marks`, { academic_year: academicYear, entries });
      setMsg("✅ Marks saved!"); fetchMarksData();
    } catch { setMsg("❌ Error saving marks"); }
    setSavingMarks(false);
    setTimeout(()=>setMsg(""),3000);
  };

  if (!allGrades.length) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No subject assignments found. Contact admin.</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
        {[{id:"create",label:"📋 Activities"},{id:"marks",label:"✏️ Marks Entry"},{id:"report",label:"📑 Subject Report"},{id:"coverage",label:"📊 Coverage"},{id:"analysis",label:"📈 Analysis"}].map(t=>(
          <button key={t.id} onClick={()=>setSubTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium border ${subTab===t.id?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>{t.label}</button>
        ))}
      </div>
      {msg&&<div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅")?"bg-green-50 border-green-300 text-green-800":"bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* ── CREATE ── */}
      {subTab==="create"&&(
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
              {showForm?"✕ Cancel":"+ Create Activity"}
            </button>
          </div>
          {showForm&&(
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-5">
              <h3 className="text-sm font-bold text-gray-700">New Activity</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Activity Name *</label>
                  <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Story Writing" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Grade *</label>
                  <select value={form.grade} onChange={e=>setForm(p=>({...p,grade:e.target.value}))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    {allGrades.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Subject *</label>
                  <select value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value,}))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    {allSubjects.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Activity Type</label>
                  <select value={form.activity_type} onChange={e=>setForm(p=>({...p,activity_type:e.target.value}))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    {ACTIVITY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Date</label>
                  <input type="date" value={form.activity_date} onChange={e=>setForm(p=>({...p,activity_date:e.target.value}))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>
              </div>

              {/* Sections */}
              <div>
                <label className="text-xs text-gray-500 block mb-1 font-semibold">
                  Sections * ({form.sections.length} selected)
                  <button onClick={()=>setForm(p=>({...p,sections:sectionsByGrade[form.grade]||[]}))} className="ml-2 text-indigo-600 hover:underline text-xs font-normal">All</button>
                  <button onClick={()=>setForm(p=>({...p,sections:[]}))} className="ml-2 text-gray-400 hover:underline text-xs font-normal">Clear</button>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(sectionsByGrade[form.grade]||[]).map(s=>(
                    <button key={s} onClick={()=>setForm(p=>({...p,sections:p.sections.includes(s)?p.sections.filter(x=>x!==s):[...p.sections,s]}))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${form.sections.includes(s)?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300"}`}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Competency & Rubric unified table */}
              {competencies.length===0
                ? <p className="text-xs text-gray-400 italic">No competencies found. Add them in Admin → Competency Registry.</p>
                : (() => {
                  const tcDomains=[...new Set(competencies.map((c:any)=>c.domain||"General"))] as string[];
                  const tcDomColor: Record<string,string>={};
                  const TC_COLORS=["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#84cc16","#14b8a6"];
                  tcDomains.forEach((d,i)=>{tcDomColor[d]=TC_COLORS[i%TC_COLORS.length];});
                  const grandTotal=selectedComps.reduce((sum,cid)=>sum+(rubrics[cid]?.items||[]).reduce((s,item)=>s+(+item.max_marks||0),0),0);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-700">
                          Competency &amp; Rubric Setup
                          <span className="ml-2 text-gray-400 font-normal">({competencies.length} available)</span>
                        </label>
                        {selectedComps.length>0&&(
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                            {selectedComps.length} selected · Total: {grandTotal} marks
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                        <table className="text-xs border-collapse" style={{minWidth:"1000px",width:"100%"}}>
                          <thead>
                            <tr className="bg-indigo-700 text-white">
                              <th className="px-2 py-2 w-8 text-center">✓</th>
                              <th className="px-3 py-2 text-left min-w-[75px]">CG No.</th>
                              <th className="px-2 py-2 text-left min-w-[90px]">Domain</th>
                              <th className="px-2 py-2 text-left min-w-[180px]">Competency</th>
                              {[1,2,3,4,5].map(n=>(
                                <th key={n} colSpan={2} className="px-1 py-2 text-center border-l border-indigo-600 min-w-[170px]">Rubric {n}</th>
                              ))}
                              <th className="px-2 py-2 text-center border-l border-indigo-600 min-w-[55px]">Total</th>
                              <th className="px-2 py-2 text-center min-w-[65px]">Coverage</th>
                            </tr>
                            <tr className="bg-indigo-600 text-indigo-200">
                              <th colSpan={4}></th>
                              {[0,1,2,3,4].map(i=>(
                                <>{
                                  <th key={`tna${i}`} className="px-1 py-1 text-center border-l border-indigo-500 font-normal min-w-[110px]">Name</th>
                                }{
                                  <th key={`tmx${i}`} className="px-1 py-1 text-center font-normal min-w-[55px]">/Max</th>
                                }</>
                              ))}
                              <th colSpan={2}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {competencies.map((c:any,idx:number)=>{
                              const checked=selectedComps.includes(c.id);
                              const rub=rubrics[c.id];
                              const compTotal=checked?(rub?.items||[]).reduce((s,item)=>s+(+item.max_marks||0),0):0;
                              const usedIn=activities.filter(a=>(a.rubrics||[]).some((r:any)=>r.competency_id===c.id)).length;
                              const domColor=tcDomColor[c.domain||"General"]||"#6366f1";
                              return (
                                <tr key={c.id} className={`border-b border-gray-100 ${checked?"bg-indigo-50":idx%2===0?"bg-white":"bg-gray-50"} hover:bg-indigo-50 transition-colors`}>
                                  <td className="px-2 py-2 text-center">
                                    <input type="checkbox" checked={checked} onChange={()=>toggleComp(c.id)} className="w-4 h-4 accent-indigo-600 cursor-pointer"/>
                                  </td>
                                  <td className="px-3 py-2 font-mono font-bold text-indigo-700 whitespace-nowrap">{c.code||c.competency_code||"—"}</td>
                                  <td className="px-2 py-2">
                                    <span className="px-1.5 py-0.5 rounded text-white font-medium leading-tight" style={{backgroundColor:domColor,fontSize:"10px",wordBreak:"break-word",whiteSpace:"normal",display:"inline-block",maxWidth:"90px"}}>
                                      {c.domain||"General"}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-gray-700" style={{minWidth:"200px"}}>{c.name||c.description||""}</td>
                                  {[0,1,2,3,4].map(i=>{
                                    const item=rub?.items?.[i]||{name:"",max_marks:0};
                                    return (
                                      <>
                                        <td key={`tn${i}`} className={`px-1 py-1 border-l border-gray-100 ${!checked?"bg-gray-50":""}`}>
                                          <input value={item.name} disabled={!checked}
                                            onChange={e=>{
                                              const items=[...(rub?.items||Array(5).fill(null).map(()=>({name:"",max_marks:0})))];
                                              items[i]={...items[i],name:e.target.value};
                                              setRubrics(r=>({...r,[c.id]:{...(r[c.id]||{name:"",items:[]}),items}}));
                                            }}
                                            placeholder={checked?"Rubric name":""}
                                            className={`rounded px-1.5 py-0.5 w-[105px] text-xs ${checked?"border border-gray-300 bg-white":"border-0 bg-transparent text-gray-300 cursor-not-allowed"}`}/>
                                        </td>
                                        <td key={`tm${i}`} className={`px-1 py-1 text-center ${!checked?"bg-gray-50":""}`}>
                                          <input type="number" min={0} value={item.max_marks||""} disabled={!checked}
                                            onChange={e=>{
                                              const items=[...(rub?.items||Array(5).fill(null).map(()=>({name:"",max_marks:0})))];
                                              items[i]={...items[i],max_marks:+e.target.value};
                                              setRubrics(r=>({...r,[c.id]:{...(r[c.id]||{name:"",items:[]}),items}}));
                                            }}
                                            placeholder={checked?"0":""}
                                            className={`rounded px-1 py-0.5 w-12 text-center text-xs ${checked?"border border-gray-300 bg-white":"border-0 bg-transparent text-gray-300 cursor-not-allowed"}`}/>
                                        </td>
                                      </>
                                    );
                                  })}
                                  <td className={`px-2 py-2 text-center font-bold border-l border-gray-100 ${checked?"text-indigo-700":"text-gray-300"}`}>
                                    {checked?compTotal:"—"}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    {usedIn>0
                                      ?<span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium" style={{fontSize:"10px"}}>{usedIn} act.</span>
                                      :<span className="text-gray-300">—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {selectedComps.length>0&&(
                            <tfoot>
                              <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                                <td colSpan={4} className="px-3 py-2 font-bold text-indigo-700 text-xs">{selectedComps.length} competency(ies) selected</td>
                                <td colSpan={11} className="px-3 py-2 font-bold text-indigo-700 text-xs text-right">Grand Total: {grandTotal} marks</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  );
                })()
              }

              <div><label className="text-xs text-gray-500 block mb-1">Description (optional)</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button onClick={saveActivity} disabled={savingActivity} className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50">
                  {savingActivity?"Saving...":"💾 Save Activity"}
                </button>
                <button onClick={()=>setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          {/* Activities list — table grouped by subject */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Activities — {activities.length} total</h3>
              <div className="flex gap-2 text-xs text-gray-500">
                <span>{[...new Set(activities.map((a:any)=>a.grade))].join(", ")}</span>
              </div>
            </div>
            {activities.length===0
              ? <p className="text-sm text-gray-400 text-center py-8">No activities yet. Create one above.</p>
              : (() => {
                  // Group by subject
                  const bySubject: Record<string,any[]> = {};
                  activities.forEach((a:any) => {
                    const sub = a.subject||"General";
                    if (!bySubject[sub]) bySubject[sub] = [];
                    bySubject[sub].push(a);
                  });
                  return (
                    <div>
                      {Object.entries(bySubject).map(([subject, acts]:[string,any[]])=>(
                        <div key={subject}>
                          {/* Subject header */}
                          <div className="px-4 py-2 bg-indigo-50 border-y border-indigo-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">{subject}</span>
                            <span className="text-xs text-indigo-500">{acts.length} activities · {acts.reduce((s,a)=>(a.competency_mappings||[]).length+s,0)} competency mappings</span>
                          </div>
                          {/* Activities table */}
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                <th className="px-4 py-2 text-left font-medium">Activity Name</th>
                                <th className="px-3 py-2 text-left font-medium">Grade · Section</th>
                                <th className="px-3 py-2 text-left font-medium">Type</th>
                                <th className="px-3 py-2 text-left font-medium">Date</th>
                                <th className="px-3 py-2 text-left font-medium">Competencies</th>
                                <th className="px-3 py-2 text-center font-medium">Max Marks</th>
                                <th className="px-3 py-2 text-center font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {acts.map((a:any, idx:number)=>(
                                <tr key={a.id} className={`border-b border-gray-50 ${idx%2===0?"bg-white":"bg-gray-50"} hover:bg-indigo-50 transition-colors`}>
                                  <td className="px-4 py-2.5 font-medium text-gray-800">{a.name}</td>
                                  <td className="px-3 py-2.5 text-gray-500">{a.grade} · {a.section}</td>
                                  <td className="px-3 py-2.5">
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{a.activity_type}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-gray-500">{a.activity_date||"-"}</td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex flex-wrap gap-1">
                                      {((a.rubrics||[]) as any[]).slice(0,3).map((r:any)=>(
                                        <span key={r.competency_id} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs border border-indigo-100">
                                          {r.competency_code}
                                        </span>
                                      ))}
                                      {(a.rubrics||[]).length>3&&(
                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">+{(a.rubrics||[]).length-3}</span>
                                      )}
                                      {!(a.rubrics||[]).length&&(a.competency_mappings||[]).length>0&&(
                                        <span className="text-xs text-gray-400">{(a.competency_mappings||[]).length} mapped</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-center font-bold text-indigo-700">{a.total_max_marks||0}</td>
                                  <td className="px-3 py-2.5 text-center">
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={()=>{setSelectedActivity(a);setSubTab("marks");}}
                                        className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 font-medium">✏️ Marks</button>
                                      <button onClick={()=>deleteActivity(a.id)}
                                        className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">🗑️</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  );
                })()
            }
          </div>
        </div>
      )}

      {/* ── MARKS ENTRY ── */}
      {subTab==="marks"&&(
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="flex gap-3 flex-wrap items-end">
              <div><label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={marksFilterGrade} onChange={e=>{setMarksFilterGrade(e.target.value);setMarksFilterSection("");setMarksFilterSubject("");setSelectedActivity(null);setMarksData(null);}}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="">All Grades</option>
                  {allGrades.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500 block mb-1">Section</label>
                <select value={marksFilterSection} onChange={e=>{setMarksFilterSection(e.target.value);setSelectedActivity(null);setMarksData(null);}}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="">All Sections</option>
                  {(sectionsByGrade[marksFilterGrade]||[]).map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500 block mb-1">Subject</label>
                <select value={marksFilterSubject} onChange={e=>{setMarksFilterSubject(e.target.value);setSelectedActivity(null);setMarksData(null);}}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="">All Subjects</option>
                  {allSubjects.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Select Activity</label>
              <select value={selectedActivity?.id||""} onChange={e=>{const a=activities.find(x=>x.id===e.target.value);setSelectedActivity(a||null);setMarksData(null);}}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-xl">
                <option value="">-- Select activity --</option>
                {activities
                  .filter(a=>(!marksFilterGrade||a.grade===marksFilterGrade)&&(!marksFilterSection||a.section===marksFilterSection)&&(!marksFilterSubject||a.subject===marksFilterSubject))
                  .map(a=><option key={a.id} value={a.id}>
                    {a.name} — {a.grade} · {a.section} · {a.subject}{a.created_by==="admin"?" [Admin]":""}
                  </option>)}
              </select>
            </div>
          </div>

          {selectedActivity&&marksData&&(
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-bold text-indigo-800">{selectedActivity.name} — {selectedActivity.grade} · {selectedActivity.section}</p>
                  <p className="text-xs text-indigo-600">{(marksData.rubrics||[]).length} competencies · Total max: {selectedActivity.total_max_marks} marks · {(marksData.students||[]).length} students</p>
                </div>
                <button onClick={saveMarks} disabled={savingMarks} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                  {savingMarks?"Saving...":"💾 Save All Marks"}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[160px]">Student</th>
                        {(marksData.rubrics||[]).map((rub:any)=>(
                          <th key={rub.competency_id} className="px-2 py-2 text-center border-l border-indigo-600" colSpan={(rub.rubric_items||[]).length+1}>
                            <div className="text-xs font-bold">[{rub.competency_code}]</div>
                            <div className="text-xs text-indigo-200 font-normal truncate max-w-[200px]">{rub.competency_name}</div>
                          </th>
                        ))}
                        <th className="px-2 py-2 text-center border-l border-indigo-600 min-w-[80px]">Total</th>
                        <th className="px-2 py-2 text-center min-w-[60px]">%</th>
                        <th className="px-2 py-2 text-center min-w-[90px]">Level</th>
                      </tr>
                      <tr className="bg-indigo-600 text-white">
                        <th className="px-3 py-1 sticky left-0 bg-indigo-600"></th>
                        {(marksData.rubrics||[]).map((rub:any)=>(
                          <>{(rub.rubric_items||[]).map((item:any,i:number)=>(
                            <th key={i} className="px-2 py-1 text-center border-l border-indigo-500 min-w-[70px]">
                              <div className="text-xs truncate max-w-[100px]">{item.name}</div>
                              <div className="text-indigo-200 text-xs">/{item.max_marks}</div>
                            </th>
                          ))}
                          <th className="px-2 py-1 text-center border-l border-indigo-500 bg-indigo-800 min-w-[55px]">
                            /{(rub.rubric_items||[]).reduce((s:number,it:any)=>s+(+it.max_marks||0),0)}
                          </th></>
                        ))}
                        <th className="px-2 py-1 text-center border-l border-indigo-500 bg-indigo-800">/{selectedActivity.total_max_marks}</th>
                        <th className="px-2 py-1"></th>
                        <th className="px-2 py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(marksData.students||[]).map((s:any,idx:number)=>{
                        const {obtained,max,pct} = calcStudentTotal(s.student.id);
                        const level = getLevel(pct);
                        return (
                          <tr key={s.student.id} className={idx%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit">{s.student.name}</td>
                            {(marksData.rubrics||[]).map((rub:any)=>{
                              const compItems = rub.rubric_items||[];
                              const compObtained = compItems.reduce((sum:number,_:any,i:number)=>sum+(+(localMarks[s.student.id]?.[rub.competency_id]?.[String(i)]||0)),0);
                              const compMax = compItems.reduce((s:number,it:any)=>s+(+it.max_marks||0),0);
                              return (
                                <>{compItems.map((item:any,i:number)=>(
                                  <td key={i} className="px-2 py-1 text-center border-l border-gray-100">
                                    <input type="number" min={0} max={item.max_marks}
                                      value={localMarks[s.student.id]?.[rub.competency_id]?.[String(i)]??""}
                                      onChange={e=>{const v=e.target.value===""?null:Math.min(+e.target.value,item.max_marks);updateMark(s.student.id,rub.competency_id,String(i),v);}}
                                      className="border border-gray-200 rounded px-1 py-0.5 w-14 text-center text-xs" />
                                  </td>
                                ))}
                                <td className="px-2 py-1 text-center border-l border-gray-200 font-bold text-indigo-700 bg-indigo-50">
                                  {compObtained}/{compMax}
                                </td></>
                              );
                            })}
                            <td className="px-2 py-1 text-center border-l border-gray-200 font-bold text-gray-800">{obtained}/{max}</td>
                            <td className="px-2 py-1 text-center font-bold text-indigo-700">{pct}%</td>
                            <td className="px-2 py-1 text-center">
                              {pct>0&&<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLOR[level]||""}`}>{level}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <button onClick={saveMarks} disabled={savingMarks} className="px-6 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                {savingMarks?"Saving...":"💾 Save All Marks"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SUBJECT-WISE REPORT ── */}
      {subTab==="report"&&(
        <div className="space-y-4">
          {/* Grade + Section selectors */}
          <div className="bg-white rounded-xl shadow p-4 flex gap-4 flex-wrap items-end">
            <div><label className="text-xs text-gray-500 block mb-1">Grade</label>
              <select value={reportGrade} onChange={e=>{setReportGrade(e.target.value);setReportSection("");setReportData(null);}} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                {allGrades.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-500 block mb-1">Section</label>
              <select value={reportSection||(sectionsByGrade[reportGrade]||[])[0]||""} onChange={e=>{setReportSection(e.target.value);setReportData(null);}} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                {(sectionsByGrade[reportGrade]||[]).map((s:string)=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={()=>fetchReport(reportGrade,(reportSection||(sectionsByGrade[reportGrade]||[])[0]||""))}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              🔄 Refresh
            </button>
          </div>

          {loadingReport&&<div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 animate-pulse">Loading report...</div>}

          {reportData&&!loadingReport&&(
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
                  <p className="text-xs text-gray-500">Total Activities</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.report?.reduce((s:number,r:any)=>s+r.activities.length,0)||0}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                  <p className="text-xs text-gray-500">Subjects Covered</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.report?.length||0}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange-500">
                  <p className="text-xs text-gray-500">Total Competencies Mapped</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.report?.reduce((s:number,r:any)=>s+r.covered_competencies,0)||0}</p>
                </div>
              </div>

              {/* Subject-wise breakdown */}
              {(reportData.report||[]).map((subRep:any)=>(
                <div key={subRep.subject} className="bg-white rounded-xl shadow overflow-hidden">
                  {/* Subject header */}
                  <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-indigo-800 uppercase">{subRep.subject}</span>
                      <span className="ml-3 text-xs text-indigo-600">{(subRep.activities||[]).length} activities</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Competency Coverage</p>
                        <p className="text-sm font-bold text-indigo-700">{subRep.covered_competencies}/{subRep.total_competencies} ({subRep.coverage_percent}%)</p>
                      </div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${subRep.coverage_percent>=80?"bg-green-500":subRep.coverage_percent>=50?"bg-yellow-500":"bg-red-500"}`}
                          style={{width:`${subRep.coverage_percent}%`}} />
                      </div>
                    </div>
                  </div>

                  {/* Activities table */}
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                        <th className="px-4 py-2 text-left font-medium">Activity</th>
                        <th className="px-3 py-2 text-left font-medium">Type</th>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Competencies Mapped</th>
                        <th className="px-3 py-2 text-center font-medium">Max Marks</th>
                        <th className="px-3 py-2 text-center font-medium">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subRep.activities.map((act:any, i:number)=>(
                        <>
                          <tr key={act.id} className={`border-b border-gray-50 ${i%2===0?"bg-white":"bg-gray-50"}`}>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{act.name}</td>
                            <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{act.activity_type}</span></td>
                            <td className="px-3 py-2.5 text-gray-500">{act.activity_date||"-"}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {(act.rubrics||[]).map((r:any)=>(
                                  <span key={r.competency_id} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 text-xs">{r.competency_code}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-indigo-700">{act.total_max_marks||0}</td>
                            <td className="px-3 py-2.5 text-center">
                              <button onClick={()=>setExpandedActivity(expandedActivity===act.id?null:act.id)}
                                className="text-xs text-indigo-600 hover:underline">{expandedActivity===act.id?"Hide":"View"}</button>
                            </td>
                          </tr>
                          {expandedActivity===act.id&&(
                            <tr key={act.id+"_exp"} className="bg-indigo-50">
                              <td colSpan={6} className="px-4 py-3">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Rubric Details:</p>
                                <div className="space-y-2">
                                  {(act.rubrics||[]).map((r:any)=>(
                                    <div key={r.competency_id} className="bg-white rounded-lg p-3 border border-indigo-100">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-indigo-700">[{r.competency_code}]</span>
                                        <span className="text-xs text-gray-600">{r.competency_name}</span>
                                        <span className="ml-auto text-xs font-bold text-indigo-600">{r.max_marks} marks</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {(r.rubric_items||[]).map((item:any,j:number)=>(
                                          <span key={j} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                                            {item.name}: <strong>{item.max_marks}m</strong>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {(reportData.report||[]).length===0&&(
                <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No activities found for this class.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── COVERAGE ── */}
      {subTab==="coverage"&&(
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-3 mb-4">
              <div><label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={coverageGrade} onChange={e=>setCoverageGrade(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                  <option value="">-- Select --</option>
                  {allGrades.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <button onClick={fetchCoverage} className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Check Coverage</button>
            </div>
            {coverage&&(
              <div>
                {(()=>{
                  const tSubs=allSubjects.map((s:string)=>normalizeSubject(s));
                  const fByS=(coverage.bySubject||[]).filter((s:any)=>tSubs.length===0||tSubs.includes(normalizeSubject(s.subject||'')));
                  const tot=fByS.reduce((a:number,s:any)=>a+s.total,0);
                  const cov=fByS.reduce((a:number,s:any)=>a+s.covered,0);
                  const pct=tot>0?+((cov/tot)*100).toFixed(1):0;
                  const covComps=fByS.flatMap((s:any)=>s.covered_competencies||[]);
                  const uncovComps=fByS.flatMap((s:any)=>s.uncovered_competencies||[]);
                  return <>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[{label:"Total",value:tot,color:"text-gray-700"},{label:"Covered",value:cov,color:"text-green-700"},{label:"Pending",value:tot-cov,color:"text-red-600"},{label:"Coverage %",value:pct+"%",color:pct>=80?"text-green-700":pct>=50?"text-yellow-600":"text-red-600"}].map(k=>(
                    <div key={k.label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                      <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                    </div>
                  ))}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div className={`h-3 rounded-full ${pct>=80?"bg-green-500":pct>=50?"bg-yellow-500":"bg-red-500"}`} style={{width:pct+"%"}} />
                </div>
                {covComps.length>0&&(
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-green-700 mb-2">✅ Covered ({covComps.length})</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {covComps.map((c:any)=>(
                        <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded text-xs">
                          <span className="font-mono text-green-700 font-semibold">{c.competency_code}</span>
                          <span className="text-gray-600">{c.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {uncovComps.length>0&&(
                  <div>
                    <div className="text-xs font-semibold text-red-600 mb-2">⏳ Pending ({uncovComps.length})</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {uncovComps.map((c:any)=>(
                        <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs">
                          <span className="font-mono text-red-600 font-semibold">{c.competency_code}</span>
                          <span className="text-gray-600">{c.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>;
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ANALYSIS ── */}
      {subTab==="analysis"&&(
        <ActivityAnalysisPanel
          allGrades={allGrades}
          sectionsByGrade={sectionsByGrade}
          allSubjects={allSubjects}
          academicYear={academicYear}
          API={API}
          LEVEL_COLOR={LEVEL_COLOR}
          getLevel={getLevel}
        />
      )}
    </div>
  );
}


// ── ACTIVITY ANALYSIS PANEL ──
function ActivityAnalysisPanel({ allGrades, sectionsByGrade, allSubjects, academicYear, API, LEVEL_COLOR, getLevel }: any) {
  const DOMAIN_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];
  const pctBg = (v: number) => v>=76?"bg-green-100 text-green-800":v>=51?"bg-blue-100 text-blue-800":v>=36?"bg-yellow-100 text-yellow-800":v>0?"bg-red-100 text-red-800":"bg-gray-100 text-gray-400";
  const toP = (v: number) => +(v*25).toFixed(1); // convert 0-4 score to %

  if (!allGrades?.length) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No grade assignments found.</div>;

  const [dashTab, setDashTab] = useState<"grade"|"section"|"student"|"alerts"|"coverage">("grade");
  const [dashGrade, setDashGrade] = useState(allGrades[0]||"");
  const [dashSection, setDashSection] = useState("");
  const [gradeDash, setGradeDash] = useState<any>(null);
  const [sectionDash, setSectionDash] = useState<any>(null);
  const [studentDash, setStudentDash] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [coverageData, setCoverageData] = useState<any>(null);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [compFilter, setCompFilter] = useState<"all"|"weak"|"strong">("all");

  const sectionsForGrade = sectionsByGrade[dashGrade]||[];

  useEffect(()=>{ if(sectionsForGrade.length&&!dashSection) setDashSection(sectionsForGrade[0]); },[dashGrade]);
  useEffect(()=>{
    if(dashTab==="grade"&&dashGrade) fetchGradeDash();
    if(dashTab==="section"&&dashGrade&&dashSection) fetchSectionDash();
    if(dashTab==="alerts") fetchAlerts();
    if(dashTab==="coverage"&&dashGrade&&dashSection) fetchCovDash();
  },[dashTab,dashGrade,dashSection,academicYear]);
  useEffect(()=>{ if(dashTab==="student"&&dashGrade&&dashSection) fetchStudentList(); },[dashSection,dashTab]);

  const fetchGradeDash=async()=>{ setLoading(true); try{ const r=await axios.get(`${API}/activities/dashboard/grade/${encodeURIComponent(dashGrade)}?academic_year=${academicYear}`); setGradeDash(r.data); }catch{} setLoading(false); };
  const fetchSectionDash=async()=>{ setLoading(true); try{ const r=await axios.get(`${API}/activities/dashboard/section/${encodeURIComponent(dashGrade)}/${encodeURIComponent(dashSection)}?academic_year=${academicYear}`); setSectionDash(r.data); }catch{} setLoading(false); };
  const fetchAlerts=async()=>{ try{ const r=await axios.get(`${API}/activities/alerts/decline?academic_year=${academicYear}`); const mg=Object.keys(sectionsByGrade).map(g=>g.toLowerCase()); setAlerts((r.data||[]).filter((a:any)=>mg.includes((a.grade||"").toLowerCase()))); }catch{ setAlerts([]); } };
  const fetchCovDash=async()=>{ try{ const r=await axios.get(`${API}/activities/coverage/section/${encodeURIComponent(dashGrade)}/${encodeURIComponent(dashSection)}?academic_year=${academicYear}`); setCoverageData(r.data); }catch{ setCoverageData(null); } };
  const fetchStudentList=async()=>{ try{ const r=await axios.get(`${API}/students?grade=${encodeURIComponent(dashGrade)}&section=${encodeURIComponent(dashSection)}`); setStudentList(r.data?.data||r.data||[]); }catch{} };
  const fetchStudentDash=async(id:string)=>{ setLoading(true); try{ const r=await axios.get(`${API}/activities/dashboard/student/${id}?academic_year=${academicYear}`); setStudentDash(r.data); }catch{} setLoading(false); };

  const filteredComps = (comps: any[]) => {
    if (compFilter==="weak") return comps.filter(c=>toP(c.avg)<60);
    if (compFilter==="strong") return comps.filter(c=>toP(c.avg)>=75);
    return comps;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 flex gap-4 flex-wrap items-end">
        <div><label className="text-xs text-gray-500 block mb-1">Grade</label>
          <select value={dashGrade} onChange={e=>{setDashGrade(e.target.value);setDashSection("");setGradeDash(null);setSectionDash(null);setStudentDash(null);}} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            {allGrades.map((g:string)=><option key={g} value={g}>{g}</option>)}</select>
        </div>
        {(dashTab==="section"||dashTab==="student"||dashTab==="coverage")&&(
          <div><label className="text-xs text-gray-500 block mb-1">Section</label>
            <select value={dashSection} onChange={e=>setDashSection(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              {sectionsForGrade.map((s:string)=><option key={s} value={s}>{s}</option>)}</select>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
        {[{id:"grade",label:"📊 Grade"},{id:"section",label:"🏫 Section"},{id:"student",label:"👤 Student"},{id:"alerts",label:"⚠️ Alerts"},{id:"coverage",label:"📋 Coverage"}].map(t=>(
          <button key={t.id} onClick={()=>setDashTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium border ${dashTab===t.id?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>{t.label}</button>
        ))}
      </div>

      {loading&&<div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm animate-pulse">Loading...</div>}

      {/* ── GRADE ── */}
      {!loading&&dashTab==="grade"&&(
        <div className="space-y-4">
          {gradeDash?(
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{label:"Total Students",value:gradeDash.total_students,color:"border-indigo-500"},
                  {label:"Assessed",value:gradeDash.total_assessed,color:"border-green-500"},
                  {label:"Overall Avg %",value:gradeDash.overall_avg?toP(+gradeDash.overall_avg).toFixed(1)+"%":"-",color:"border-blue-500"},
                  {label:"Level",value:gradeDash.overall_avg?getLevel(toP(+gradeDash.overall_avg)):"-",color:"border-orange-500"}].map(s=>(
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {gradeDash.sections?.length>0&&(
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Section-wise Avg %</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gradeDash.sections.map((s:any)=>({name:s.section,avg:toP(s.avg)}))}>
                        <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis domain={[0,100]} tick={{fontSize:10}}/>
                        <Tooltip formatter={(v:any)=>[`${v}%`,"Avg"]}/><Bar dataKey="avg" radius={[4,4,0,0]}>{gradeDash.sections.map((_:any,i:number)=><Cell key={i} fill={DOMAIN_COLORS[i%DOMAIN_COLORS.length]}/>)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {gradeDash.subjects?.length>0&&(
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Avg %</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gradeDash.subjects.map((s:any)=>({name:s.subject,avg:toP(s.avg)}))}>
                        <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis domain={[0,100]} tick={{fontSize:10}}/>
                        <Tooltip formatter={(v:any)=>[`${v}%`,"Avg"]}/><Bar dataKey="avg" radius={[4,4,0,0]}>{gradeDash.subjects.map((_:any,i:number)=><Cell key={i} fill={DOMAIN_COLORS[i%DOMAIN_COLORS.length]}/>)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              {gradeDash.domains?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Avg %</h3>
                  <ResponsiveContainer width="100%" height={Math.max(150,gradeDash.domains.length*32)}>
                    <BarChart data={gradeDash.domains.map((d:any)=>({name:d.domain,avg:toP(d.avg)}))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3"/><XAxis type="number" domain={[0,100]} tick={{fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fontSize:10}} width={120}/>
                      <Tooltip formatter={(v:any)=>[`${v}%`,"Avg"]}/><Bar dataKey="avg" radius={[0,4,4,0]}>{gradeDash.domains.map((d:any,i:number)=><Cell key={i} fill={toP(d.avg)>=76?"#10b981":toP(d.avg)>=51?"#6366f1":toP(d.avg)>=36?"#f59e0b":"#ef4444"}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {gradeDash.competencies?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Competency Averages</h3>
                    <div className="flex gap-2">
                      {["all","weak","strong"].map(f=>(
                        <button key={f} onClick={()=>setCompFilter(f as any)}
                          className={`px-2 py-0.5 rounded text-xs ${compFilter===f?"bg-indigo-600 text-white":"bg-gray-100 text-gray-600"}`}>
                          {f==="all"?"All":f==="weak"?"Below 60%":"Above 75%"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead><tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Domain</th>
                        <th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-center">Avg %</th><th className="px-3 py-2 text-center">Level</th>
                      </tr></thead>
                      <tbody>
                        {filteredComps(gradeDash.competencies).map((c:any,i:number)=>{const p=toP(c.avg);return(
                          <tr key={c.competency_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-1.5 font-medium text-indigo-700">{c.competency_code}</td>
                            <td className="px-3 py-1.5 text-gray-500">{c.domain}</td>
                            <td className="px-3 py-1.5 text-gray-500">{c.subject}</td>
                            <td className="px-3 py-1.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pctBg(p)}`}>{p.toFixed(1)}%</span></td>
                            <td className="px-3 py-1.5 text-center"><span className={`px-2 py-0.5 rounded text-xs ${LEVEL_COLOR[getLevel(p)]||""}`}>{getLevel(p)}</span></td>
                          </tr>
                        );})}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {gradeDash.studentRankings?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Rankings</h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {gradeDash.studentRankings.map((s:any,i:number)=>{const p=toP(s.avg);return(
                      <div key={s.student_id} className="flex items-center justify-between p-2 rounded border border-gray-100 hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-6">{i+1}.</span>
                          <span className="text-xs font-medium text-gray-800">{s.name}</span>
                          <span className="text-xs text-gray-400">{s.section}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pctBg(p)}`}>{p.toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${LEVEL_COLOR[getLevel(p)]||""}`}>{getLevel(p)}</span>
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              )}
            </>
          ):<div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No data. Create activities and enter marks first.</div>}
        </div>
      )}

      {/* ── SECTION ── */}
      {!loading&&dashTab==="section"&&(
        <div className="space-y-4">
          {sectionDash?(
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{label:"Total Students",value:sectionDash.total_students,color:"border-indigo-500"},
                  {label:"Overall Avg %",value:sectionDash.overall_avg?toP(+sectionDash.overall_avg).toFixed(1)+"%":"-",color:"border-green-500"},
                  {label:"Grade",value:sectionDash.grade,color:"border-blue-500"},
                  {label:"Section",value:sectionDash.section,color:"border-orange-500"}].map(s=>(
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>
              {sectionDash.domains?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Avg %</h3>
                  <ResponsiveContainer width="100%" height={Math.max(150,sectionDash.domains.length*32)}>
                    <BarChart data={sectionDash.domains.map((d:any)=>({name:d.domain,avg:toP(d.avg)}))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3"/><XAxis type="number" domain={[0,100]} tick={{fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fontSize:10}} width={120}/>
                      <Tooltip formatter={(v:any)=>[`${v}%`,"Avg"]}/><Bar dataKey="avg" radius={[0,4,4,0]}>{sectionDash.domains.map((d:any,i:number)=><Cell key={i} fill={toP(d.avg)>=76?"#10b981":toP(d.avg)>=51?"#6366f1":"#ef4444"}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {sectionDash.weakest?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">⚠️ Weakest Competencies (below 60%)</h3>
                  <div className="space-y-2">
                    {sectionDash.weakest.map((c:any)=>{const p=toP(c.avg);return(
                      <div key={c.competency_id} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                        <div>
                          <span className="text-xs font-bold text-red-700">{c.competency_code}</span>
                          <span className="text-xs text-gray-500 ml-2">{c.domain} · {c.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pctBg(p)}`}>{p.toFixed(1)}%</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_COLOR[getLevel(p)]||""}`}>{getLevel(p)}</span>
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              )}
              {sectionDash.competencyAvgs?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">All Competency Averages</h3>
                    <div className="flex gap-2">
                      {["all","weak","strong"].map(f=>(
                        <button key={f} onClick={()=>setCompFilter(f as any)}
                          className={`px-2 py-0.5 rounded text-xs ${compFilter===f?"bg-indigo-600 text-white":"bg-gray-100 text-gray-600"}`}>
                          {f==="all"?"All":f==="weak"?"Below 60%":"Above 75%"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead><tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Domain</th>
                        <th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-center">Avg %</th><th className="px-3 py-2 text-center">Level</th>
                      </tr></thead>
                      <tbody>
                        {filteredComps(sectionDash.competencyAvgs).map((c:any,i:number)=>{const p=toP(c.avg);return(
                          <tr key={c.competency_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-1.5 font-medium text-indigo-700">{c.competency_code}</td>
                            <td className="px-3 py-1.5 text-gray-500">{c.domain}</td>
                            <td className="px-3 py-1.5 text-gray-500">{c.subject}</td>
                            <td className="px-3 py-1.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pctBg(p)}`}>{p.toFixed(1)}%</span></td>
                            <td className="px-3 py-1.5 text-center"><span className={`px-2 py-0.5 rounded text-xs ${LEVEL_COLOR[getLevel(p)]||""}`}>{getLevel(p)}</span></td>
                          </tr>
                        );})}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {sectionDash.studentDomainBreakdown?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Student × Domain Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-700 text-white">
                          <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[160px]">Student</th>
                          {(sectionDash.domains||[]).map((d:any)=><th key={d.domain} className="px-3 py-2 text-center border-l border-indigo-600 min-w-[90px]">{d.domain}</th>)}
                          <th className="px-3 py-2 text-center border-l border-indigo-600 min-w-[80px]">Overall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionDash.studentDomainBreakdown.map((s:any,i:number)=>{const op=toP(s.overall_avg);return(
                          <tr key={s.student_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit">{s.student_name}</td>
                            {(sectionDash.domains||[]).map((d:any)=>{const val=toP(s.domain_avgs?.[d.domain]||0);return(
                              <td key={d.domain} className="px-3 py-2 text-center border-l border-gray-100">
                                {val>0?<span className={`text-xs font-bold px-1.5 py-0.5 rounded ${pctBg(val)}`}>{val.toFixed(1)}%</span>:<span className="text-gray-300">—</span>}
                              </td>
                            );})}
                            <td className="px-3 py-2 text-center border-l border-gray-200">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pctBg(op)}`}>{op.toFixed(1)}%</span>
                            </td>
                          </tr>
                        );})}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ):<div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No data for {dashGrade} — {dashSection}.</div>}
        </div>
      )}

      {/* ── STUDENT ── */}
      {!loading&&dashTab==="student"&&(
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <label className="text-xs text-gray-500 block mb-2">Select Student</label>
            <select value={selectedStudentId} onChange={e=>{setSelectedStudentId(e.target.value);if(e.target.value)fetchStudentDash(e.target.value);}}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-md">
              <option value="">-- Select student --</option>
              {studentList.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {studentDash&&(
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
                <p className="text-lg font-bold text-gray-800">{studentDash.student?.name}</p>
                <p className="text-sm text-gray-500">{studentDash.student?.current_class} — {studentDash.student?.section}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {studentDash.subjectSummary?.length>0&&(
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Avg %</h3>
                    <div className="space-y-2">
                      {studentDash.subjectSummary.map((s:any)=>{const p=toP(s.avg);return(
                        <div key={s.subject} className="flex items-center justify-between p-2 rounded border border-gray-100">
                          <span className="text-xs font-medium text-gray-700">{s.subject}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pctBg(p)}`}>{p.toFixed(1)}%</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_COLOR[getLevel(p)]||""}`}>{getLevel(p)}</span>
                          </div>
                        </div>
                      );})}
                    </div>
                  </div>
                )}
                {studentDash.domainSummary?.length>0&&(
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Avg %</h3>
                    <ResponsiveContainer width="100%" height={Math.max(150,studentDash.domainSummary.length*32)}>
                      <BarChart data={studentDash.domainSummary.map((d:any)=>({name:d.domain,avg:toP(d.avg)}))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3"/><XAxis type="number" domain={[0,100]} tick={{fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fontSize:9}} width={100}/>
                        <Tooltip formatter={(v:any)=>[`${v}%`,"Avg"]}/><Bar dataKey="avg" radius={[0,4,4,0]}>{studentDash.domainSummary.map((d:any,i:number)=><Cell key={i} fill={toP(d.avg)>=76?"#10b981":toP(d.avg)>=51?"#6366f1":"#ef4444"}/>)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              {studentDash.competencyScores?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Competency-wise Scores</h3>
                    <div className="flex gap-2">
                      {["all","weak","strong"].map(f=>(
                        <button key={f} onClick={()=>setCompFilter(f as any)}
                          className={`px-2 py-0.5 rounded text-xs ${compFilter===f?"bg-indigo-600 text-white":"bg-gray-100 text-gray-600"}`}>
                          {f==="all"?"All":f==="weak"?"Below 60%":"Above 75%"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead><tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-left">Domain</th><th className="px-3 py-2 text-left">Subject</th>
                        <th className="px-3 py-2 text-center">Avg %</th><th className="px-3 py-2 text-center">Level</th><th className="px-3 py-2 text-center">Attempts</th>
                      </tr></thead>
                      <tbody>
                        {filteredComps(studentDash.competencyScores.map((c:any)=>({...c,avg:c.avg}))).map((c:any,i:number)=>{const p=toP(c.avg);return(
                          <tr key={c.competency_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-1.5 font-medium text-indigo-700">{c.competency_code}</td>
                            <td className="px-3 py-1.5 text-gray-600 max-w-[180px] truncate">{c.description||c.competency_name}</td>
                            <td className="px-3 py-1.5 text-gray-500">{c.domain}</td>
                            <td className="px-3 py-1.5 text-gray-500">{c.subject}</td>
                            <td className="px-3 py-1.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pctBg(p)}`}>{p.toFixed(1)}%</span></td>
                            <td className="px-3 py-1.5 text-center"><span className={`px-2 py-0.5 rounded text-xs ${LEVEL_COLOR[getLevel(p)]||""}`}>{getLevel(p)}</span></td>
                            <td className="px-3 py-1.5 text-center text-gray-400">{c.assessment_count}x</td>
                          </tr>
                        );})}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ALERTS ── */}
      {!loading&&dashTab==="alerts"&&(
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-yellow-800 mb-1">⚠️ Consecutive Decline Alert</h3>
            <p className="text-xs text-yellow-600">Students whose activity scores dropped in 3 consecutive activities.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            {alerts.length===0
              ?<p className="text-sm text-gray-400 text-center py-4">No consecutive declines found in your sections.</p>
              :<div className="space-y-3">
                {alerts.map((s:any,i:number)=>(
                  <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div><span className="text-sm font-bold text-red-800">{s.student_name}</span><span className="text-xs text-gray-500 ml-2">{s.grade} — {s.section}</span></div>
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Declining</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {s.scores?.map((sc:any,j:number)=>(
                        <div key={j} className={`text-center rounded px-2 py-1 text-xs border ${pctBg(toP(sc.avg))}`}>
                          <p className="font-bold">{toP(sc.avg).toFixed(1)}%</p>
                          <p className="text-gray-500 truncate max-w-[80px]">{sc.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}

      {/* ── COVERAGE ── */}
      {!loading&&dashTab==="coverage"&&(
        <div className="space-y-4">
          {coverageData?(
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{label:"Total Competencies",value:coverageData.total,color:"text-gray-700"},
                  {label:"Covered",value:coverageData.covered,color:"text-green-700"},
                  {label:"Pending",value:coverageData.uncovered,color:"text-red-600"},
                  {label:"Coverage %",value:`${coverageData.coverage_percent}%`,color:coverageData.coverage_percent>=80?"text-green-700":"text-yellow-600"}].map(k=>(
                  <div key={k.label} className="bg-white rounded-xl shadow p-4 text-center border border-gray-200">
                    <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className={`h-3 rounded-full ${coverageData.coverage_percent>=80?"bg-green-500":coverageData.coverage_percent>=50?"bg-yellow-500":"bg-red-500"}`} style={{width:`${coverageData.coverage_percent}%`}} />
              </div>
              {/* Subject-wise coverage */}
              {coverageData.bySubject?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Coverage</h3>
                  {coverageData.bySubject.map((s:any)=>(
                    <div key={s.subject} className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{s.subject}</span>
                        <span className="text-xs text-gray-500">{s.covered}/{s.total} ({s.coverage_percent}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${s.coverage_percent>=80?"bg-green-500":s.coverage_percent>=50?"bg-yellow-500":"bg-red-500"}`} style={{width:`${s.coverage_percent}%`}} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {coverageData.covered_competencies?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-green-700 mb-2">✅ Covered ({coverageData.covered_competencies.length})</h3>
                  <div className="flex flex-wrap gap-1">
                    {coverageData.covered_competencies.map((c:any)=>(
                      <span key={c.id} className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700">{c.competency_code}</span>
                    ))}
                  </div>
                </div>
              )}
              {coverageData.uncovered_competencies?.length>0&&(
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-red-600 mb-2">⏳ Pending ({coverageData.uncovered_competencies.length})</h3>
                  <div className="flex flex-wrap gap-1">
                    {coverageData.uncovered_competencies.map((c:any)=>(
                      <span key={c.id} className="px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-600">{c.competency_code}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ):<div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No coverage data. Add competencies to registry first.</div>}
        </div>
      )}
    </div>
  );
}


function MarksEntryPanel({ activity, combinedMarks, localRatings, updateRating, saveActivityMarks, saving, RATING_COLORS, API, academicYear }: any) {
  const [students, setStudents] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, Record<string, string>>>({});
  const [localSaving, setLocalSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!activity) return;
    fetchStudentsAndCompetencies();
  }, [activity]);

  const fetchStudentsAndCompetencies = async () => {
    try {
      // Fetch students directly
      const sr = await axios.get(`${API}/students?grade=${encodeURIComponent(activity.grade)}&section=${encodeURIComponent(activity.section)}`);
      const studentList = (sr.data?.data || sr.data || []).filter((s: any) => s.is_active !== false);
      setStudents(studentList);

      // Fetch ALL competencies (no filter) then match by mapped IDs
      // This ensures cross-curricular competencies are also found
      const mappedIds: string[] = activity.competency_mappings || [];
      if (mappedIds.length) {
        // Fetch competencies for the activity's grade AND without grade filter as fallback
        const [r1, r2] = await Promise.all([
          axios.get(`${API}/activities/competencies?grade=${encodeURIComponent(activity.grade)}`).catch(() => ({ data: [] })),
          axios.get(`${API}/activities/competencies`).catch(() => ({ data: [] })),
        ]);
        const all = [...(r1.data || []), ...(r2.data || [])];
        // Deduplicate by id
        const seen = new Set<string>();
        const unique = all.filter((c: any) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
        // Keep only mapped ones, preserve order
        const mapped = mappedIds.map(id => unique.find((c: any) => c.id === id)).filter(Boolean);
        setCompetencies(mapped);
      } else {
        setCompetencies([]);
      }

      // Load existing marks if any
      try {
        const mr = await axios.get(`${API}/activities/${activity.id}/marks?academic_year=${academicYear}`);
        const existingRatings: Record<string, Record<string, string>> = {};
        (mr.data?.entries || mr.data || []).forEach((entry: any) => {
          existingRatings[entry.student_id] = entry.competency_ratings || {};
        });
        setRatings(existingRatings);
      } catch { setRatings({}); }
    } catch { setStudents([]); }
  };

  const updateLocalRating = (studentId: string, competencyId: string, value: string) => {
    setRatings(prev => ({ ...prev, [studentId]: { ...(prev[studentId]||{}), [competencyId]: value } }));
  };

  const saveMarks = async () => {
    setLocalSaving(true);
    try {
      const entries = students.map(s => ({
        student_id: s.id,
        student_name: s.name,
        competency_ratings: ratings[s.id] || {},
      }));
      await axios.post(`${API}/activities/${activity.id}/marks`, { academic_year: academicYear, entries });
      setMsg("✅ Marks saved successfully");
    } catch { setMsg("❌ Error saving marks"); }
    setLocalSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  if (!students.length) return <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">Loading students...</div>;

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div>
          <h3 className="text-sm font-bold text-gray-700">{activity.name} — {activity.grade} · {activity.section}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{students.length} students · {competencies.length} competencies</p>
        </div>
        <button onClick={saveMarks} disabled={localSaving}
          className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold">
          {localSaving ? "Saving..." : "💾 Save Marks"}
        </button>
      </div>
      {msg && <div className={`px-4 py-2 text-sm ${msg.startsWith("✅") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg}</div>}
      {competencies.length === 0 ? (
        <div className="p-6 text-center text-gray-400 text-sm">No competencies mapped to this activity. Edit the activity to add competencies.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" style={{ minWidth: `${200 + competencies.length * 130}px` }}>
            <thead>
              <tr className="bg-indigo-700 text-white">
                <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[180px]">Student</th>
                {competencies.map((c: any) => (
                  <th key={c.id} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[140px]">
                    <div className="font-mono text-xs font-bold">{c.competency_code}</div>
                    <div className="text-indigo-200 text-xs font-normal" style={{fontSize:'10px', lineHeight:'1.2'}}>{c.description?.substring(0, 40)}{c.description?.length > 40 ? '...' : ''}</div>
                    {c.subject !== activity.subject && <div className="text-purple-300 text-xs">[{c.subject}]</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student: any, i: number) => (
                <tr key={student.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit">{student.name}</td>
                  {competencies.map((c: any) => {
                    const current = ratings[student.id]?.[c.id] || "";
                    return (
                      <td key={c.id} className="px-2 py-1 text-center border-l border-gray-100">
                        <select value={current} onChange={e => updateLocalRating(student.id, c.id, e.target.value)}
                          className={`text-xs rounded px-1 py-0.5 border w-full ${current ? RATING_COLORS[current] : "border-gray-200 bg-white"}`}>
                          <option value="">—</option>
                          <option value="beginning">Beginning</option>
                          <option value="approaching">Approaching</option>
                          <option value="meeting">Meeting</option>
                          <option value="exceeding">Exceeding</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Sub-component: Analytics panel — class averages, level distribution, domain charts
function BaselineAnalyticsPanel({ sectionData, activeRoundIdx, LITERACY_DOMAINS, NUMERACY_DOMAINS, getLevel, calcAvg, grade, section }: any) {
  if (!sectionData?.students?.length || !sectionData?.rounds?.length) return null;

  const roundKey = sectionData.rounds[activeRoundIdx];
  const DOMAIN_COLORS = ["#2196F3","#E91E63","#9C27B0","#FF5722","#00BCD4","#8BC34A","#FF9800","#607D8B"];

  // Helper: get pct value for a domain from a round
  const getRndLitPct = (rnd: any, d: string) => rnd?.literacy_pct?.[d] ?? rnd?.literacy_scores?.[d] ?? 0;
  const getRndNumPct = (rnd: any, d: string) => rnd?.numeracy_pct?.[d] ?? rnd?.numeracy_scores?.[d] ?? 0;
  const getRndLitAvg = (rnd: any) => rnd?.literacy_total != null ? +rnd.literacy_total : 0;
  const getRndNumAvg = (rnd: any) => rnd?.numeracy_total != null ? +rnd.numeracy_total : 0;
  const getRndOverall = (rnd: any) => rnd?.overall != null ? +rnd.overall : 0;

  // Get dynamic domains from actual data
  const assessed = sectionData.students.filter((s: any) => s.rounds[activeRoundIdx]?.exists);
  if (!assessed.length) return null;

  const sampleRnd = assessed[0]?.rounds[activeRoundIdx];
  const litDomains = sampleRnd?.literacy_scores ? Object.keys(sampleRnd.literacy_scores) : LITERACY_DOMAINS;
  const numDomains = sampleRnd?.numeracy_scores ? Object.keys(sampleRnd.numeracy_scores) : NUMERACY_DOMAINS;
  const allDomains = [...litDomains, ...numDomains];

  const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;

  const litAvgs = assessed.map((s: any) => getRndLitAvg(s.rounds[activeRoundIdx]));
  const numAvgs = assessed.map((s: any) => getRndNumAvg(s.rounds[activeRoundIdx]));
  const overallAvgs = assessed.map((s: any) => getRndOverall(s.rounds[activeRoundIdx]));

  const classLitAvg = avg(litAvgs);
  const classNumAvg = avg(numAvgs);
  const classOverall = avg(overallAvgs);

  const levelDist: Record<string, number> = { "Exceeding":0, "Meeting":0, "Approaching":0, "Beginning":0 };
  overallAvgs.forEach(o => { const lv = getLevel(o); levelDist[lv.label] = (levelDist[lv.label]||0)+1; });

  const domainData = [
    ...litDomains.map((d: string, i: number) => ({ domain:d, avg: avg(assessed.map((s: any) => getRndLitPct(s.rounds[activeRoundIdx], d))), type:"literacy" })),
    ...numDomains.map((d: string, i: number) => ({ domain:d, avg: avg(assessed.map((s: any) => getRndNumPct(s.rounds[activeRoundIdx], d))), type:"numeracy" })),
  ];

  const progressData = sectionData.rounds.map((rk: string, i: number) => {
    const roundStudents = sectionData.students.filter((s: any) => s.rounds[i]?.exists);
    if (!roundStudents.length) return null;
    return {
      name: `Round ${i+1}`,
      overall: avg(roundStudents.map((s: any) => getRndOverall(s.rounds[i]))),
      literacy: avg(roundStudents.map((s: any) => getRndLitAvg(s.rounds[i]))),
      numeracy: avg(roundStudents.map((s: any) => getRndNumAvg(s.rounds[i]))),
    };
  }).filter(Boolean);

  const downloadReport = () => {
    const rows = assessed.map((s: any) => {
      const r = s.rounds[activeRoundIdx];
      return [s.student_name,
        ...litDomains.map((d: string) => r.literacy_scores?.[d]??0),
        getRndLitAvg(r).toFixed(1),
        ...numDomains.map((d: string) => r.numeracy_scores?.[d]??0),
        getRndNumAvg(r).toFixed(1),
        getRndOverall(r).toFixed(1),
        getLevel(getRndOverall(r)).label,
        r.promoted ? `Promoted → ${r.promoted_to_stage}` : "In progress"
      ].join(",");
    });
    const header = ["Student",...litDomains,"Lit%",...numDomains,"Num%","Overall%","Level","Status"].join(",");
    const csv = [header,...rows].join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url;
    a.download=`Baseline_${grade}_${section}_Round${activeRoundIdx+1}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const downloadHTMLReport = () => {
    const rows = assessed.map((s: any) => {
      const r = s.rounds[activeRoundIdx];
      const lv = getLevel(getRndOverall(r));
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">${s.student_name}</td>
        ${litDomains.map((d: string) => `<td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${r.literacy_scores?.[d]??0}</td>`).join("")}
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;color:#2563eb">${getRndLitAvg(r).toFixed(1)}%</td>
        ${numDomains.map((d: string) => `<td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${r.numeracy_scores?.[d]??0}</td>`).join("")}
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;color:#d97706">${getRndNumAvg(r).toFixed(1)}%</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700">${getRndOverall(r).toFixed(1)}%</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${lv.label}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;color:${r.promoted?"#16a34a":"#6b7280"}">${r.promoted?"🎉 Promoted":"In progress"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Baseline Report — ${grade} ${section} Round ${activeRoundIdx+1}</title>
    <style>body{font-family:Arial,sans-serif;max-width:1100px;margin:30px auto;color:#111}
    h1{color:#4338ca}table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#4338ca;color:white;padding:10px 8px;text-align:center}
    tr:nth-child(even){background:#f9fafb}
    .kpi{display:flex;gap:16px;margin:20px 0}
    .kpi-card{flex:1;background:#f5f3ff;border-left:4px solid #6366f1;padding:12px 16px;border-radius:8px}
    .kpi-card .val{font-size:22px;font-weight:700;color:#4338ca}
    .kpi-card .lbl{font-size:12px;color:#6b7280}
    </style></head><body>
    <h1>Baseline Assessment Report</h1>
    <p style="color:#6b7280">${grade} — ${section} &nbsp;·&nbsp; Round ${activeRoundIdx+1} &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</p>
    <div class="kpi">
      <div class="kpi-card"><div class="val">${assessed.length}</div><div class="lbl">Students Assessed</div></div>
      <div class="kpi-card"><div class="val">${classLitAvg}%</div><div class="lbl">Class Literacy Avg</div></div>
      <div class="kpi-card"><div class="val">${classNumAvg}%</div><div class="lbl">Class Numeracy Avg</div></div>
      <div class="kpi-card"><div class="val">${classOverall}%</div><div class="lbl">Class Overall Avg</div></div>
      <div class="kpi-card"><div class="val">${assessed.filter((s: any) => s.rounds[activeRoundIdx].promoted).length}</div><div class="lbl">Promoted (≥80%)</div></div>
    </div>
    <table><thead><tr>
      <th style="text-align:left">Student</th>
      ${litDomains.map((d: string) => `<th>${d.substring(0,5)}</th>`).join("")}<th>📖%</th>
      ${numDomains.map((d: string) => `<th>${d.substring(0,5)}</th>`).join("")}<th>🔢%</th>
      <th>Overall</th><th>Level</th><th>Status</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <p style="margin-top:30px;color:#9ca3af;font-size:12px">Generated by CBAS — Wisdom Techno School</p>
    </body></html>`;
    const blob = new Blob([html],{type:"text/html"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url;
    a.download=`Baseline_Report_${grade}_${section}_Round${activeRoundIdx+1}.html`; a.click(); URL.revokeObjectURL(url);
  };

  const LEVEL_COLORS: Record<string,string> = { "Exceeding":"#16a34a","Meeting":"#2563eb","Approaching":"#d97706","Beginning":"#dc2626" };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">📊 Analytics — Round {activeRoundIdx+1}</h3>
        <div className="flex gap-2">
          <button onClick={downloadReport} className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">⬇️ CSV</button>
          <button onClick={downloadHTMLReport} className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium">⬇️ Report Card</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          {label:"Assessed",value:assessed.length,color:"border-indigo-500"},
          {label:"Lit Avg",value:`${classLitAvg}%`,color:"border-blue-500"},
          {label:"Num Avg",value:`${classNumAvg}%`,color:"border-orange-500"},
          {label:"Overall Avg",value:`${classOverall}%`,color:"border-green-500"},
          {label:"Promoted",value:assessed.filter((s: any) => s.rounds[activeRoundIdx].promoted).length,color:"border-purple-500"},
        ].map(k => (
          <div key={k.label} className={`bg-white rounded-xl shadow p-3 border-l-4 ${k.color}`}>
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-lg font-bold text-gray-800">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Level Distribution</h4>
          <div className="space-y-2">
            {Object.entries(levelDist).map(([level, count]) => {
              const pct = assessed.length > 0 ? (count/assessed.length)*100 : 0;
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-600">{level}</span>
                    <span className="text-xs font-bold" style={{color:LEVEL_COLORS[level]}}>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full" style={{width:`${pct}%`,backgroundColor:LEVEL_COLORS[level]}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Domain Averages</h4>
          <div className="space-y-1.5">
            {domainData.map((d: any, i: number) => (
              <div key={d.domain} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-24 shrink-0">{d.domain}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full" style={{width:`${Math.min(d.avg,100)}%`,backgroundColor:DOMAIN_COLORS[i%8]}} />
                </div>
                <span className="text-xs font-bold w-12 text-right" style={{color:DOMAIN_COLORS[i%8]}}>{d.avg}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {progressData.length > 1 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">📈 Class Progress Across Rounds</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{fontSize:10}} />
              <YAxis domain={[0,100]} tick={{fontSize:10}} />
              <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`]} />
              <Legend wrapperStyle={{fontSize:"11px"}} />
              <Line type="monotone" dataKey="overall" name="Overall" stroke="#6366f1" strokeWidth={3} dot={{r:5}} />
              <Line type="monotone" dataKey="literacy" name="Literacy" stroke="#3b82f6" strokeWidth={2} dot={{r:4}} />
              <Line type="monotone" dataKey="numeracy" name="Numeracy" stroke="#f59e0b" strokeWidth={2} dot={{r:4}} />
              <Line type="monotone" dataKey={() => 80} name="Target (80%)" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Student Rankings — Round {activeRoundIdx+1}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-indigo-700 text-white">
                <th className="px-3 py-2 text-center w-10">Rank</th>
                <th className="px-3 py-2 text-left min-w-[150px]">Student</th>
                <th className="px-3 py-2 text-center">📖 Literacy</th>
                <th className="px-3 py-2 text-center">🔢 Numeracy</th>
                <th className="px-3 py-2 text-center">Overall</th>
                <th className="px-3 py-2 text-center">Level</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...assessed]
                .sort((a: any, b: any) => getRndOverall(b.rounds[activeRoundIdx]) - getRndOverall(a.rounds[activeRoundIdx]))
                .map((s: any, i: number) => {
                  const r = s.rounds[activeRoundIdx];
                  const litA = getRndLitAvg(r);
                  const numA = getRndNumAvg(r);
                  const ov = getRndOverall(r);
                  const lv = getLevel(ov);
                  return (
                    <tr key={s.student_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                      <td className="px-3 py-2 text-center font-bold text-gray-400">{i+1}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800">{s.student_name}</td>
                      <td className="px-3 py-2 text-center font-bold text-blue-700">{litA.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center font-bold text-orange-600">{numA.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lv.bg} ${lv.color}`}>{ov.toFixed(1)}%</span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-gray-600">{lv.label}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {r.promoted
                          ? <span className="text-green-600 font-bold">🎉 Promoted</span>
                          : <span className="text-gray-400">In progress</span>}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Read-only marks table for existing rounds (JSONB aware)
function MarksTable({ students, roundKey, roundIdx, isEditing, localMarks, updateMark, LITERACY_DOMAINS, NUMERACY_DOMAINS, calcAvg, getLevel, onStudentClick }: any) {
  // Detect actual domains from data
  const sampleRnd = students.find((s: any) => s.rounds[roundIdx]?.exists)?.rounds[roundIdx];
  const litDomains = sampleRnd?.literacy_scores ? Object.keys(sampleRnd.literacy_scores) : LITERACY_DOMAINS;
  const numDomains = sampleRnd?.numeracy_scores ? Object.keys(sampleRnd.numeracy_scores) : NUMERACY_DOMAINS;

  const getLitVal = (rnd: any, d: string) => rnd?.literacy_scores?.[d] ?? 0;
  const getNumVal = (rnd: any, d: string) => rnd?.numeracy_scores?.[d] ?? 0;
  const getLitAvg = (rnd: any) => rnd?.literacy_total != null ? +rnd.literacy_total : 0;
  const getNumAvg = (rnd: any) => rnd?.numeracy_total != null ? +rnd.numeracy_total : 0;
  const getOverall = (rnd: any) => rnd?.overall != null ? +rnd.overall : 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" style={{ minWidth:`${300+(litDomains.length+numDomains.length)*70}px` }}>
        <thead>
          <tr className="bg-indigo-700 text-white">
            <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[160px]">Student</th>
            {litDomains.map((d: string) => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[65px] bg-blue-700"><span className="text-blue-200">📖</span> {d.substring(0,5)}</th>)}
            <th className="px-2 py-2 text-center border-l border-indigo-500 bg-blue-800 min-w-[55px]">📖 Avg</th>
            {numDomains.map((d: string) => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[65px] bg-purple-700"><span className="text-orange-200">🔢</span> {d.substring(0,5)}</th>)}
            <th className="px-2 py-2 text-center border-l border-indigo-500 bg-purple-800 min-w-[55px]">🔢 Avg</th>
            <th className="px-2 py-2 text-center border-l border-indigo-500 min-w-[65px]">Overall</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s: any, i: number) => {
            const rnd = s.rounds[roundIdx];
            const litAvg = rnd?.exists ? getLitAvg(rnd) : 0;
            const numAvg = rnd?.exists ? getNumAvg(rnd) : 0;
            const overall = rnd?.exists ? getOverall(rnd) : 0;
            const lv = getLevel(overall);
            const bg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
            return (
              <tr key={s.student_id} className={`border-b border-gray-100 ${bg}`}>
                <td className={`px-3 py-2 sticky left-0 ${bg}`}>
                  <button onClick={() => onStudentClick(s.student_id)} className="text-left hover:text-indigo-600">
                    <span className="font-bold text-gray-800">{s.student_name}</span>
                    <span className="ml-1 text-gray-400 text-xs">({s.rounds.filter((r: any) => r.exists).length} rounds)</span>
                  </button>
                </td>
                {litDomains.map((d: string) => (
                  <td key={d} className="px-2 py-1 text-center border-l border-gray-100">
                    <span className="text-gray-700">{rnd?.exists ? getLitVal(rnd,d) : "—"}</span>
                  </td>
                ))}
                <td className="px-2 py-2 text-center border-l border-blue-100 bg-blue-50">
                  <span className="font-bold text-blue-700">{litAvg.toFixed(1)}%</span>
                </td>
                {numDomains.map((d: string) => (
                  <td key={d} className="px-2 py-1 text-center border-l border-gray-100">
                    <span className="text-gray-700">{rnd?.exists ? getNumVal(rnd,d) : "—"}</span>
                  </td>
                ))}
                <td className="px-2 py-2 text-center border-l border-orange-100 bg-orange-50">
                  <span className="font-bold text-orange-700">{numAvg.toFixed(1)}%</span>
                </td>
                <td className="px-2 py-2 text-center border-l border-gray-100">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lv.bg} ${lv.color}`}>{overall.toFixed(1)}%</span>
                  {rnd?.promoted && <div className="text-xs text-green-600 font-bold">🎉 Promoted</div>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Sub-component: New round entry table with number inputs
function NewRoundTable({ students, localMarks, updateMark, LITERACY_DOMAINS, NUMERACY_DOMAINS, calcAvg, getLevel, initMarks }: any) {
  useEffect(() => { if (Object.keys(localMarks).length === 0) initMarks(); }, [students]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" style={{ minWidth: `${400 + (LITERACY_DOMAINS.length + NUMERACY_DOMAINS.length) * 70}px` }}>
        <thead>
          <tr className="bg-blue-700 text-white">
            <th className="px-3 py-2 text-left sticky left-0 bg-blue-700 min-w-[160px]">Student</th>
            {LITERACY_DOMAINS.map((d: string) => <th key={d} className="px-2 py-2 text-center border-l border-blue-600 min-w-[70px]">📖 {d.substring(0,5)}</th>)}
            <th className="px-2 py-2 text-center border-l border-blue-500 min-w-[55px]">📖%</th>
            {NUMERACY_DOMAINS.map((d: string) => <th key={d} className="px-2 py-2 text-center border-l border-blue-600 min-w-[70px]">🔢 {d.substring(0,5)}</th>)}
            <th className="px-2 py-2 text-center border-l border-blue-500 min-w-[55px]">🔢%</th>
            <th className="px-2 py-2 text-center border-l border-blue-500 min-w-[65px]">Overall</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s: any, i: number) => {
            const litVals = localMarks[s.student_id]?.literacy || Object.fromEntries(LITERACY_DOMAINS.map((d: string) => [d, 0]));
            const numVals = localMarks[s.student_id]?.numeracy || Object.fromEntries(NUMERACY_DOMAINS.map((d: string) => [d, 0]));
            const litAvg = calcAvg(litVals);
            const numAvg = calcAvg(numVals);
            const overall = (litAvg + numAvg) / 2;
            const lv = getLevel(overall);
            const bg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
            return (
              <tr key={s.student_id} className={`border-b border-gray-100 ${bg}`}>
                <td className={`px-3 py-2 font-bold text-gray-800 sticky left-0 ${bg}`}>
                  {s.student_name}
                  <div className="text-gray-400 font-normal text-xs">{s.rounds.filter((r: any) => r.exists).length} prev rounds</div>
                </td>
                {LITERACY_DOMAINS.map((d: string) => (
                  <td key={d} className="px-1 py-1.5 border-l border-gray-100">
                    <input type="number" min={0} max={100} value={litVals[d] ?? 0}
                      onChange={e => updateMark(s.student_id, "literacy", d, Math.min(100, Math.max(0, +e.target.value)))}
                      className="w-full text-center border border-gray-300 rounded px-1 py-1 text-xs font-medium" />
                  </td>
                ))}
                <td className="px-2 py-2 text-center border-l border-blue-100 bg-blue-50">
                  <span className="font-bold text-blue-700">{litAvg.toFixed(0)}%</span>
                </td>
                {NUMERACY_DOMAINS.map((d: string) => (
                  <td key={d} className="px-1 py-1.5 border-l border-gray-100">
                    <input type="number" min={0} max={100} value={numVals[d] ?? 0}
                      onChange={e => updateMark(s.student_id, "numeracy", d, Math.min(100, Math.max(0, +e.target.value)))}
                      className="w-full text-center border border-gray-300 rounded px-1 py-1 text-xs font-medium" />
                  </td>
                ))}
                <td className="px-2 py-2 text-center border-l border-orange-100 bg-orange-50">
                  <span className="font-bold text-orange-700">{numAvg.toFixed(0)}%</span>
                </td>
                <td className="px-2 py-2 text-center border-l border-gray-100">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lv.bg} ${lv.color}`}>{overall.toFixed(0)}%</span>
                  {overall >= 80 && <div className="text-xs text-green-600 font-bold">🎉 Will promote</div>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Sub-component: Student baseline profile with charts
function StudentBaselineProfile({ studentId, sectionData, onBack, getLevel, LITERACY_DOMAINS, NUMERACY_DOMAINS }: any) {
  const student = sectionData.students.find((s: any) => s.student_id === studentId);
  if (!student) return null;

  const DOMAIN_COLORS = ["#2196F3","#E91E63","#9C27B0","#FF5722","#00BCD4","#8BC34A","#FF9800","#607D8B"];
  const rounds = student.rounds.filter((r: any) => r.exists);

  // Compute strengths and weaknesses from rolling averages
  const domainAvgs: Record<string, number[]> = {};
  rounds.forEach((r: any) => {
    LITERACY_DOMAINS.forEach((d: string) => { domainAvgs[d] = domainAvgs[d] || []; domainAvgs[d].push(r.literacy_pct?.[d] ?? r.literacy_scores?.[d] ?? 0); });
    NUMERACY_DOMAINS.forEach((d: string) => { domainAvgs[d] = domainAvgs[d] || []; domainAvgs[d].push(r.numeracy_pct?.[d] ?? r.numeracy_scores?.[d] ?? 0); });
  });
  const strengths: string[] = [], weaknesses: string[] = [];
  Object.entries(domainAvgs).forEach(([d, vals]) => {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (avg >= 80) strengths.push(`${d} — ${avg.toFixed(0)}%`);
    else if (avg < 60) weaknesses.push(`${d} — ${avg.toFixed(0)}%`);
  });

  const lastRound = rounds[rounds.length - 1];
  const litAvg = lastRound ? lastRound?.literacy_total != null ? +lastRound.literacy_total : 0 : 0;
  const numAvg = lastRound ? lastRound?.numeracy_total != null ? +lastRound.numeracy_total : 0 : 0;
  const overall = lastRound ? lastRound.overall : 0;
  const lv = getLevel(overall);

  // Chart data for overall trend
  const chartData = rounds.map((r: any, i: number) => ({
    name: `Round ${i + 1}`,
    overall: r.overall,
    literacy: (r.literacy_total != null ? +r.literacy_total : 0),
    numeracy: (r.numeracy_total != null ? +r.numeracy_total : 0),
  }));

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">← Back</button>
        <h3 className="text-base font-bold text-gray-800">{student.student_name}</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lv.bg} ${lv.color}`}>{lv.label}</span>
        {lastRound?.promoted && <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">🎉 Promoted → {lastRound.promoted_to_stage}</span>}
      </div>

      {rounds.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No assessment rounds yet.</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Rounds", value: rounds.length, color: "border-indigo-500" },
              { label: "📖 Literacy", value: `${litAvg.toFixed(1)}%`, color: "border-blue-500" },
              { label: "🔢 Numeracy", value: `${numAvg.toFixed(1)}%`, color: "border-orange-500" },
              { label: "Overall", value: `${overall.toFixed(1)}%`, color: "border-green-500" },
            ].map(k => (
              <div key={k.label} className={`bg-gray-50 rounded-xl p-3 border-l-4 ${k.color}`}>
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className="text-lg font-bold text-gray-800">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Progress charts */}
          {rounds.length > 1 && (
            <>
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">📈 Overall Progress</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`]} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Line type="monotone" dataKey="overall" name="Overall" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="literacy" name="Literacy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="numeracy" name="Numeracy" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    {/* Promotion threshold */}
                    <Line type="monotone" dataKey={() => 80} name="Target (80%)" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Domain charts */}
              {["literacy", "numeracy"].map(subj => {
                const domains = subj === "literacy" ? LITERACY_DOMAINS : NUMERACY_DOMAINS;
                const domData = rounds.map((r: any, i: number) => {
                  const row: any = { name: `Round ${i+1}` };
                  domains.forEach((d: string) => { row[d] = r[subj][d] || 0; });
                  return row;
                });
                return (
                  <div key={subj} className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{subj === "literacy" ? "📖 Literacy" : "🔢 Numeracy"} — Domain-wise</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={domData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        {domains.map((d: string, i: number) => (
                          <Line key={d} type="monotone" dataKey={d} stroke={DOMAIN_COLORS[i % 8]} strokeWidth={2} dot={{ r: 3 }} />
                        ))}
                        <Line type="monotone" dataKey={() => 80} name="Target" stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-green-800 mb-2">✨ Strengths (≥80%)</h4>
              {strengths.length > 0 ? strengths.map((s, i) => (
                <div key={i} className="text-xs text-green-700 bg-white rounded-lg px-3 py-1.5 mb-1 border border-green-100">{s}</div>
              )) : <p className="text-xs text-green-600">Keep working — strengths will appear here!</p>}
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-red-800 mb-2">📌 Needs Improvement (&lt;60%)</h4>
              {weaknesses.length > 0 ? weaknesses.map((w, i) => (
                <div key={i} className="text-xs text-red-700 bg-white rounded-lg px-3 py-1.5 mb-1 border border-red-100">{w}</div>
              )) : <div className="text-xs text-green-600 bg-white rounded-lg px-3 py-1.5 border border-green-100">No weak areas — great job! 🎉</div>}
            </div>
          </div>

          {/* Assessment history table */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 Assessment History</h4>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-indigo-700 text-white">
                  <th className="px-3 py-2">Round</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">📖 Literacy</th>
                  <th className="px-3 py-2">🔢 Numeracy</th>
                  <th className="px-3 py-2">Overall</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r: any, i: number) => {
                  const lv2 = getLevel(r.overall);
                  return (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 text-center font-bold text-indigo-700">Round {i+1}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{r.date}</td>
                      <td className="px-3 py-2 text-center capitalize text-gray-600">{r.stage}</td>
                      <td className="px-3 py-2 text-center font-bold text-blue-700">{(r.literacy_total != null ? +r.literacy_total : 0).toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center font-bold text-orange-600">{(r.numeracy_total != null ? +r.numeracy_total : 0).toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lv2.bg} ${lv2.color}`}>{r.overall?.toFixed(1)}%</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.promoted ? <span className="text-green-600 font-bold text-xs">🎉 Promoted → {r.promoted_to_stage}</span> : <span className="text-gray-400 text-xs">In progress</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STUDENT AI TAB — AI homework + assessment for students
// ─────────────────────────────────────────────────────────────────
function StudentAITab({ user, mappings, academicYear }: any) {
  const API = "https://cbas-backend-production.up.railway.app";
  const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

  const teacherSubjects: string[] = mappings?.subjects || user?.subjects || [];
  const classGrade = mappings?.class_grade || "";
  const classSection = mappings?.class_section || "";

  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [gapSource, setGapSource] = useState<"baseline"|"pasa">("pasa");
  const [subject, setSubject] = useState(teacherSubjects[0] || "");
  const [examType, setExamType] = useState("");
  const [gaps, setGaps] = useState<any[]>([]);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [numQ, setNumQ] = useState(10);
  const [difficulty, setDifficulty] = useState("Mixed");
  const [qTypes, setQTypes] = useState<string[]>(["Multiple Choice (MCQ)","Short Answer","Case-Based Short Answer"]);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [msg, setMsg] = useState("");
  const [examTypes, setExamTypes] = useState<string[]>([]);

  useEffect(() => { if (classGrade && classSection) fetchStudents(); }, [mappings, academicYear]);
  useEffect(() => { if (selectedStudent) fetchGaps(); }, [selectedStudent, gapSource, subject, examType]);
  useEffect(() => { fetchExamTypes(); }, [academicYear, classGrade]);

  const fetchStudents = async () => {
    try {
      const r = await axios.get(`${API}/students?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}`);
      setStudents((r.data?.data || r.data || []).filter((s: any) => s.is_active !== false));
    } catch {}
  };

  const fetchExamTypes = async () => {
    try {
      const r = await axios.get(`${API}/pasa/exam-types?academic_year=${academicYear}&grade=${encodeURIComponent(classGrade)}`);
      setExamTypes(r.data?.examTypes || []);
    } catch {}
  };

  const fetchGaps = async () => {
    if (!selectedStudent) return;
    setLoadingGaps(true); setGaps([]);
    try {
      if (gapSource === "pasa") {
        const r = await axios.get(`${API}/pasa/student/${selectedStudent.id}/analysis?academic_year=${academicYear}`);
        if (!r.data) { setGaps([]); setLoadingGaps(false); return; }
        // Find weak competencies from competency profile (below 60%)
        const weakComps = (r.data.competencyProfile || []).filter((c: any) => c.avg < 60);
        // Filter by selected subject if set
        const subjectGaps: any[] = [];
        (r.data.examSummary || []).forEach((exam: any) => {
          if (examType && exam.exam !== examType) return;
          Object.entries(exam.subjects || {}).forEach(([sub, sd]: [string, any]) => {
            if (subject && sub !== subject) return;
            (sd.competency_scores || []).forEach((cs: any) => {
              if (cs.marks_obtained !== null && cs.max_marks > 0) {
                const pct = (cs.marks_obtained / cs.max_marks) * 100;
                if (pct < 60) {
                  subjectGaps.push({
                    subject: sub, competency_code: cs.competency_code,
                    competency_name: cs.competency_name, score: pct,
                    exam: exam.exam,
                  });
                }
              }
            });
          });
        });
        setGaps(subjectGaps.length ? subjectGaps : weakComps.map((c: any) => ({ competency_code: c.code, competency_name: c.name, score: c.avg, subject })));
      } else {
        // Baseline gaps
        const r = await axios.get(`${API}/baseline/student/${selectedStudent.id}/portfolio`);
        const baselineGaps: any[] = [];
        const allAssessments: any[] = r.data?.assessments || [];
        const latest = allAssessments.sort((a: any, b: any) => a.round > b.round ? 1 : -1).slice(-1)[0];
        if (latest) {
          if (latest.literacy_pct) {
            Object.entries(latest.literacy_pct).forEach(([d, v]: [string, any]) => {
              if (+v < 60) baselineGaps.push({ subject: "literacy", domain: d, score: +v });
            });
          }
          if (latest.numeracy_pct) {
            Object.entries(latest.numeracy_pct).forEach(([d, v]: [string, any]) => {
              if (+v < 60) baselineGaps.push({ subject: "numeracy", domain: d, score: +v });
            });
          }
        }
        setGaps(baselineGaps);
      }
    } catch {}
    setLoadingGaps(false);
  };

  const generatePractice = async () => {
    if (!selectedStudent || !gaps.length) { setMsg("❌ Select a student with gap data first"); return; }
    setGenerating(true); setOutput(""); setMsg("");
    try {
      const gapBlock = gaps.slice(0, 8).map((g: any) =>
        `- ${g.subject || ""} ${g.competency_code || g.domain || ""}: ${g.competency_name || g.domain || ""} (Score: ${g.score?.toFixed(0)}%)`
      ).join("\n");

      const diffNote: Record<string, string> = {
        Easy: "Keep all questions straightforward — recall and basic application only.",
        Moderate: "Mix of recall, application and simple analysis.",
        Challenging: "Prioritise analysis, evaluation and synthesis questions.",
        Mixed: "Mix 40% easy, 40% moderate, 20% challenging.",
      };

      const prompt = `You are an expert educational assessor for students in India.

Create a PRACTICE PAPER for student: ${selectedStudent.name}
Grade: ${classGrade} | Section: ${classSection}
${subject ? `Subject focus: ${subject}` : ""}
${examType ? `Based on: ${examType} gaps` : ""}

STUDENT GAP AREAS (below 60%):
${gapBlock}

PAPER REQUIREMENTS:
- Exactly ${numQ} questions
- Question types: ${qTypes.join(", ")}
- Difficulty: ${difficulty} — ${diffNote[difficulty]}
- Tag every question with its competency code [CODE] where available
- Include complete Answer Key with brief explanations
- Age-appropriate language for ${classGrade} students

QUESTION FORMAT:
[MCQ] — 4 options A/B/C/D, mark correct with ✓, include 1-line reason
[SA] — Short Answer: model answer 2–3 sentences
[LA] — Long Answer: model answer 5–8 sentences
[TF] — True/False: answer + 1-sentence explanation
[FIB] — Fill in the Blank: answer below
[CBSA] — Case-Based Short Answer: 3-4 line scenario + question + 2–3 sentence answer

Title: Practice Paper — ${selectedStudent.name} — ${subject || "Mixed"} — ${new Date().toLocaleDateString()}`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], max_tokens: 3000, temperature: 0.7 }),
      });
      const data = await res.json();
      setOutput(data.choices?.[0]?.message?.content || "Generation failed.");
    } catch { setMsg("❌ Generation failed. Check API key."); }
    setGenerating(false);
  };

  const printOutput = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Practice Paper — ${selectedStudent?.name}</title><style>body{font-family:Arial;padding:20px;max-width:800px;margin:0 auto;}pre{white-space:pre-wrap;font-family:Arial;}</style></head><body><pre>${output}</pre></body></html>`);
    w.document.close(); w.print();
  };

  const Q_TYPES = ["Multiple Choice (MCQ)","Short Answer","Long Answer","True/False","Fill in the Blank","Case-Based Short Answer","Case-Based Long Answer"];

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h2 className="text-sm font-bold text-indigo-800 mb-1">🎯 Student Gap-Based Practice Paper</h2>
        <p className="text-xs text-indigo-600">Select a student → load their gaps from PA/SA or Baseline → generate a personalized practice paper targeting their weak competencies.</p>
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* Step 1: Select student + gap source */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Step 1 — Select Student & Gap Source</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Student *</label>
            <select value={selectedStudent?.id || ""} onChange={e => setSelectedStudent(students.find(s => s.id === e.target.value) || null)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
              <option value="">-- Select student --</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Gap Source</label>
            <select value={gapSource} onChange={e => setGapSource(e.target.value as any)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
              <option value="pasa">PA/SA Competency Gaps</option>
              <option value="baseline">Baseline Gaps</option>
            </select>
          </div>
          {gapSource === "pasa" && (
            <>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Subject Filter</label>
                <select value={subject} onChange={e => setSubject(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                  <option value="">All Subjects</option>
                  {teacherSubjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Exam Filter</label>
                <select value={examType} onChange={e => setExamType(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                  <option value="">All Exams</option>
                  {examTypes.map((t: string) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gap display */}
      {selectedStudent && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
            Gap Areas for {selectedStudent.name}
            {loadingGaps && <span className="ml-2 text-indigo-500 font-normal normal-case">Loading...</span>}
          </h3>
          {!loadingGaps && gaps.length === 0 && (
            <p className="text-xs text-gray-400">No gap areas found below 60%. Student is performing well, or no data available yet.</p>
          )}
          {!loadingGaps && gaps.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {gaps.slice(0, 10).map((g: any, i: number) => (
                <span key={i} className="px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {g.competency_code || g.domain || ""} {g.subject ? `(${g.subject})` : ""} — {g.score?.toFixed(0)}%
                </span>
              ))}
              {gaps.length > 10 && <span className="text-xs text-gray-400">+{gaps.length - 10} more</span>}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Paper settings */}
      {selectedStudent && gaps.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Step 2 — Paper Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Number of Questions</label>
              <select value={numQ} onChange={e => setNumQ(+e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                {[5,10,15,20].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                {["Easy","Moderate","Challenging","Mixed"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">Question Types</label>
            <div className="flex flex-wrap gap-2">
              {Q_TYPES.map(qt => (
                <label key={qt} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={qTypes.includes(qt)}
                    onChange={e => setQTypes(p => e.target.checked ? [...p, qt] : p.filter(q => q !== qt))}
                    className="accent-indigo-600" />
                  {qt}
                </label>
              ))}
            </div>
          </div>
          <button onClick={generatePractice} disabled={generating || !qTypes.length}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
            {generating ? "Generating..." : "⚡ Generate Practice Paper"}
          </button>
        </div>
      )}

      {/* Output */}
      {output && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">Practice Paper — {selectedStudent?.name}</h3>
            <button onClick={printOutput} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs rounded hover:bg-indigo-200">🖨 Print</button>
          </div>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{output}</pre>
        </div>
      )}
    </div>
  );
}


function SelfAITab({ user, academicYear }: any) {
  const GROQ_API2 = "https://api.groq.com/openai/v1/chat/completions";
  const GROQ_KEY2 = import.meta.env.VITE_GROQ_API_KEY || "";

  const STAGE_GRADE: Record<string,string> = { foundation:"Grade 2", preparatory:"Grade 5", middle:"Grade 8", secondary:"Grade 10" };
  const LIT_DOMAINS = ["Listening","Speaking","Reading","Writing"];
  const NUM_DOMAINS = ["Operations","Base 10","Measurement","Geometry"];
  const LIT_KEYS   = ["Listening","Speaking","Reading","Writing"];
  const NUM_KEYS   = ["Operations","Base 10","Measurement","Geometry"];

  const [baselineData, setBaselineData] = useState<any>(null);
  const [mode, setMode] = useState<"gap"|"custom">("gap");
  const [ppMode, setPpMode] = useState<"practice"|"assessment">("practice");
  // Gap-based settings
  const [numQ, setNumQ] = useState(10);
  const [difficulty, setDifficulty] = useState("Mixed");
  const [qTypes, setQTypes] = useState(["MCQ","Short Answer","Case-Based"]);
  const [focusGap, setFocusGap] = useState("All my gaps");
  // Custom topic settings
  const [custSubj, setCustSubj] = useState("literacy");
  const [custDomain, setCustDomain] = useState("Listening");
  const [custComps, setCustComps] = useState<any[]>([]);
  const [loadingComps, setLoadingComps] = useState(false);
  // Output
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchBaseline(); }, [academicYear]);
  useEffect(() => { if (mode === "custom") fetchCustomComps(); }, [custSubj, custDomain, baselineData]);

  const fetchBaseline = async () => {
    try {
      const r = await axios.get(`${API}/baseline/teacher/${user.id}?academic_year=${academicYear}`);
      setBaselineData(r.data);
    } catch {}
  };

  // Fetch competencies for custom mode
  const fetchCustomComps = async () => {
    if (!baselineData?.assessments?.length) return;
    const assessments = baselineData.assessments || [];
    const subjectRounds = assessments.filter((a:any) => a.subject === custSubj);
    const latest = subjectRounds[subjectRounds.length-1];
    const stage = latest?.stage || "foundation";
    const grade = STAGE_GRADE[stage];
    setLoadingComps(true);
    try {
      const r = await axios.get(`${API}/activities/competencies?subject=${custSubj}&stage=${stage}&grade=${encodeURIComponent(grade)}`);
      const all = r.data?.data || r.data || [];
      const domainMap: Record<string,string> = {
        "Listening":"listening","Speaking":"speaking","Reading":"reading","Reading and Comprehension":"reading","Writing":"writing",
        "Operations":"operations","Base 10":"base10","Measurement":"measurement","Geometry":"geometry",
      };
      const filtered = all.filter((c:any) => {
        const cd = (c.domain||"").toLowerCase();
        const sel = custDomain.toLowerCase().replace(" ","").replace("10","10");
        return cd.includes(sel) || cd.includes(custDomain.toLowerCase());
      });
      setCustComps(filtered.length ? filtered : all.slice(0,10));
    } catch { setCustComps([]); }
    setLoadingComps(false);
  };

  // Build gap list with competencies
  const buildGapContext = async () => {
    const assessments = baselineData?.assessments || [];
    const allRounds = [...assessments].sort((a:any,b:any) => a.round > b.round ? 1 : -1);
    const latest = allRounds[allRounds.length-1];

    const gaps: any[] = [];
    if (latest?.literacy_pct) {
      const litAvg = latest.literacy_total ? +latest.literacy_total : 0;
      Object.entries(latest.literacy_pct).forEach(([domain, pct]: [string, any]) => {
        const sc = +pct;
        if (sc < 60) gaps.push({ domain:"Literacy", sub:domain, score:sc, subject:"literacy", stage:latest.gaps?.lit_stage||latest.stage||"foundation", grade:STAGE_GRADE[latest.gaps?.lit_stage||latest.stage||"foundation"]||"Grade 2" });
      });
    }
    if (latest?.numeracy_pct) {
      const numAvg = latest.numeracy_total ? +latest.numeracy_total : 0;
      Object.entries(latest.numeracy_pct).forEach(([domain, pct]: [string, any]) => {
        const sc = +pct;
        if (sc < 60) gaps.push({ domain:"Numeracy", sub:domain, score:sc, subject:"numeracy", stage:latest.gaps?.num_stage||latest.stage||"foundation", grade:STAGE_GRADE[latest.gaps?.num_stage||latest.stage||"foundation"]||"Grade 2" });
      });
    }

    // Fetch competencies for each gap
    const gapWithComps = await Promise.all(gaps.map(async (g:any) => {
      const grade = STAGE_GRADE[g.stage];
      try {
        const r = await axios.get(`${API}/activities/competencies?subject=${g.subject}&stage=${g.stage}&grade=${encodeURIComponent(grade)}`);
        const all = r.data?.data || r.data || [];
        const comps = all.filter((c:any) => {
          const cd = (c.domain||"").toLowerCase();
          return cd.includes(g.sub.toLowerCase()) || cd.includes(g.sub.toLowerCase().replace(" ",""));
        }).slice(0,5);
        return { ...g, grade, competencies: comps };
      } catch { return { ...g, grade, competencies:[] }; }
    }));

    return gapWithComps;
  };

  const generate = async () => {
    if (!baselineData?.assessments?.length) { setMsg("No baseline data found. Complete your assessment first."); return; }
    setGenerating(true); setOutput(""); setMsg("");

    const assessments = baselineData.assessments || [];
    const sortedRounds = [...assessments].sort((a:any,b:any)=>a.round>b.round?1:-1);
    const latestRound = sortedRounds[sortedRounds.length-1];
    const litAvg = latestRound?.literacy_total ? +latestRound.literacy_total : null;
    const numAvg = latestRound?.numeracy_total ? +latestRound.numeracy_total : null;
    const overallAvg = litAvg!==null&&numAvg!==null?(litAvg+numAvg)/2:litAvg??numAvg??0;

    let prompt = "";

    if (mode === "gap") {
      const gaps = await buildGapContext();
      const selectedGaps = focusGap === "All my gaps" ? gaps : gaps.filter(g=>`${g.domain} – ${g.sub}`===focusGap);

      const compBlock = selectedGaps.map((g:any) => {
        const compLines = g.competencies.length
          ? g.competencies.map((c:any)=>`  - [${c.competency_code}]: ${c.description||c.desc||""}`).join("\n")
          : "  - General competencies";
        return `DOMAIN: ${g.domain} – ${g.sub} | Stage: ${g.stage} | Grade: ${g.grade} | Score: ${g.score.toFixed(0)}%\nCompetencies:\n${compLines}`;
      }).join("\n\n");

      const diffNote: Record<string,string> = {
        "Easy":"Recall and basic application only.",
        "Moderate":"Mix of recall, application and simple analysis.",
        "Challenging":"Prioritise analysis, evaluation and synthesis.",
        "Mixed":"40% easy, 40% moderate, 20% challenging."
      };

      const qtStr = qTypes.join(", ");

      prompt = `You are an expert educational assessor for teacher professional development in India.

Create a ${ppMode === "practice" ? "PRACTICE PAPER" : "ASSESSMENT PAPER"} for teacher ${user?.name} targeting their competency gaps.

TEACHER: ${user?.name}
Overall: ${overallAvg.toFixed(1)}%
Literacy Stage: ${latestRound?.gaps?.lit_stage||latestRound?.stage||"—"} (Grade: ${STAGE_GRADE[latestRound?.gaps?.lit_stage||latestRound?.stage||"foundation"]||"—"})
Numeracy Stage: ${latestRound?.gaps?.num_stage||latestRound?.stage||"—"} (Grade: ${STAGE_GRADE[latestRound?.gaps?.num_stage||latestRound?.stage||"foundation"]||"—"})

FOCUS COMPETENCIES (from gap analysis):
${compBlock || "General competencies — no specific gaps identified"}

PAPER REQUIREMENTS:
- Exactly ${numQ} questions
- Question types: ${qtStr}
- Difficulty: ${difficulty} — ${diffNote[difficulty]||"Mixed difficulty"}
- Tag every question with its competency code [CODE]
- Test both THEORETICAL KNOWLEDGE and CLASSROOM APPLICATION
- Include complete Answer Key with explanations

QUESTION FORMAT:
[MCQ] 4 options A/B/C/D, mark correct with ✓, 1-line reason
[SA] Short Answer: model answer 2-3 sentences
[LA] Long Answer: model answer 5-8 sentences
[TF] True/False: answer + explanation
[Case-Based] 4-5 line classroom scenario + question + model answer

Title: ${ppMode === "practice" ? "Practice" : "Assessment"} Paper — ${user?.name} — ${new Date().toLocaleDateString()}`;

    } else {
      // Custom topic mode
      const compLines = custComps.length
        ? custComps.map((c:any)=>`  - [${c.competency_code}]: ${c.description||c.desc||""}`).join("\n")
        : "  - General competencies";

      const subjectRounds = assessments.filter((a:any)=>a.subject===custSubj);
      const latest = subjectRounds[subjectRounds.length-1];
      const stage = latest?.stage || "foundation";
      const grade = STAGE_GRADE[stage];

      prompt = `You are an expert educational assessor for teacher professional development in India.

Create a ${ppMode === "practice" ? "PRACTICE PAPER" : "ASSESSMENT PAPER"} for teacher ${user?.name}.

TEACHER: ${user?.name}
Subject: ${custSubj === "literacy" ? "Literacy" : "Numeracy"}
Domain: ${custDomain}
Stage: ${stage} | Grade: ${grade}

COMPETENCIES TO ASSESS:
${compLines}

PAPER REQUIREMENTS:
- Exactly ${numQ} questions
- Question types: ${qTypes.join(", ")}
- Difficulty: ${difficulty}
- Tag every question with its competency code [CODE]
- Test THEORETICAL KNOWLEDGE and CLASSROOM APPLICATION
- Include complete Answer Key

Title: ${ppMode === "practice" ? "Practice" : "Assessment"} Paper — ${user?.name} — ${custSubj} — ${custDomain} — ${new Date().toLocaleDateString()}`;
    }

    try {
      const res = await fetch(GROQ_API2, {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_KEY2}`},
        body: JSON.stringify({ model:"llama-3.3-70b-versatile", messages:[{role:"user",content:prompt}], max_tokens:3000 }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg(`❌ GROQ Error ${res.status}: ${d.error?.message||JSON.stringify(d)}`); }
      else setOutput(d.choices?.[0]?.message?.content || "No response from AI");
    } catch(e:any) { setMsg(`❌ AI failed: ${e.message}`); }
    setGenerating(false);
  };

  const assessments = baselineData?.assessments || [];
  const latestA = [...assessments].sort((a:any,b:any)=>a.round>b.round?1:-1).slice(-1)[0];

  // Compute gaps for display — domains below 60%
  const gapList: string[] = [];
  if (latestA?.literacy_pct) Object.entries(latestA.literacy_pct).forEach(([d,v]:any) => { if (+v < 60) gapList.push(`Literacy – ${d}`); });
  if (latestA?.numeracy_pct) Object.entries(latestA.numeracy_pct).forEach(([d,v]:any) => { if (+v < 60) gapList.push(`Numeracy – ${d}`); });

  const custDomains = custSubj === "literacy" ? LIT_DOMAINS : NUM_DOMAINS;

  return (
    <div className="space-y-4 w-full max-w-3xl">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-800 mb-1">✍️ AI Practice & Assessment Paper</h3>
        <p className="text-xs text-indigo-600">Questions mapped to your exact competency framework — tagged with competency codes.</p>
      </div>

      {!assessments.length ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No baseline data found for {academicYear}. Complete assessment first.</div>
      ) : (
        <>
          {/* Paper type */}
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="flex gap-2">
              {[{id:"practice",label:"✍️ Practice Paper"},{id:"assessment",label:"📋 Assessment Paper"}].map(p=>(
                <button key={p.id} onClick={()=>setPpMode(p.id as any)}
                  className={`px-4 py-2 text-xs rounded-lg border font-medium ${ppMode===p.id?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Mode */}
            <div className="flex gap-2">
              {[{id:"gap",label:"📌 Based on My Gaps"},{id:"custom",label:"🎯 Custom Topic"}].map(m=>(
                <button key={m.id} onClick={()=>setMode(m.id as any)}
                  className={`px-4 py-2 text-xs rounded-lg border font-medium ${mode===m.id?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-300 hover:bg-purple-50"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "gap" && (
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              {gapList.length === 0 ? (
                <div className="text-sm text-green-700 bg-green-50 rounded-lg p-3">🎉 No gaps found — you're above average in all domains! Switch to Custom Topic to practise any area.</div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold block mb-1">Gap Areas (below subject average)</label>
                    <div className="flex flex-wrap gap-2">
                      {gapList.map(g=><span key={g} className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">⚠️ {g}</span>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Focus on</label>
                      <select value={focusGap} onChange={e=>setFocusGap(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                        <option>All my gaps</option>
                        {gapList.map(g=><option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Number of Questions</label>
                      <select value={numQ} onChange={e=>setNumQ(+e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                        {[5,10,15,20].map(n=><option key={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Difficulty</label>
                      <select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                        {["Easy","Moderate","Challenging","Mixed"].map(d=><option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Question Types</label>
                      <div className="flex flex-wrap gap-1">
                        {["MCQ","Short Answer","Long Answer","True/False","Fill-in-Blank","Case-Based"].map(qt=>(
                          <button key={qt} onClick={()=>setQTypes(prev=>prev.includes(qt)?prev.filter(x=>x!==qt):[...prev,qt])}
                            className={`px-2 py-0.5 rounded text-xs border ${qTypes.includes(qt)?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300"}`}>
                            {qt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {mode === "custom" && (
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Subject</label>
                  <select value={custSubj} onChange={e=>{setCustSubj(e.target.value);setCustDomain(e.target.value==="literacy"?"Listening":"Operations");}} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                    <option value="literacy">📖 Literacy</option>
                    <option value="numeracy">🔢 Numeracy</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Domain</label>
                  <select value={custDomain} onChange={e=>setCustDomain(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                    {custDomains.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">No. of Questions</label>
                  <select value={numQ} onChange={e=>setNumQ(+e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                    {[5,10,15,20].map(n=><option key={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              {loadingComps ? (
                <div className="text-xs text-gray-400">Loading competencies...</div>
              ) : custComps.length > 0 ? (
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-indigo-800 mb-2">{custComps.length} competencies found</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {custComps.map((c:any,i:number)=>(
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="font-mono text-indigo-600 font-bold shrink-0">[{c.competency_code}]</span>
                        <span className="text-gray-600 truncate">{c.description||c.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 bg-gray-50 rounded p-3">No competencies found for this selection. Questions will be general.</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Difficulty</label>
                  <select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                    {["Easy","Moderate","Challenging","Mixed"].map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Question Types</label>
                  <div className="flex flex-wrap gap-1">
                    {["MCQ","Short Answer","Case-Based"].map(qt=>(
                      <button key={qt} onClick={()=>setQTypes(prev=>prev.includes(qt)?prev.filter(x=>x!==qt):[...prev,qt])}
                        className={`px-2 py-0.5 rounded text-xs border ${qTypes.includes(qt)?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300"}`}>
                        {qt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {msg && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{msg}</p>}

          <button onClick={generate} disabled={generating||!GROQ_KEY2}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50">
            {generating ? "⏳ Generating..." : `🎯 Generate ${ppMode==="practice"?"Practice":"Assessment"} Paper (${numQ} questions)`}
          </button>
          {!GROQ_KEY2 && <p className="text-xs text-amber-600 text-center">⚠️ VITE_GROQ_API_KEY not set in .env</p>}

          {output && (
            <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-800">Generated Paper</h4>
                <button onClick={()=>{const b=new Blob([output],{type:"text/plain"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`Paper_${user?.name?.replace(/\s+/g,"_")}_${new Date().toISOString().split("T")[0]}.txt`;a.click();URL.revokeObjectURL(u);}}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">
                  📥 Download .txt
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed max-h-[600px] overflow-y-auto border border-gray-200">
                {output}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PROMOTION TAB — class teacher only
// ─────────────────────────────────────────────────────────────────

function AIToolsTab({ user, mappings, academicYear }: any) {
  const API = "https://cbas-backend-production.up.railway.app";
  const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

  // Correctly extract from mappings structure
  const allMappings: any[] = mappings?.mappings || [];
  const teacherSubjects: string[] = [...new Set(allMappings.map((m:any) => m.subject).filter(Boolean))] as string[];
  const classGrade = mappings?.class_grade || allMappings[0]?.grade || "";
  const classSection = mappings?.class_section || allMappings[0]?.section || "";
  const isClassTeacher = !!(mappings?.is_class_teacher);

  const [subTab, setSubTab] = useState<"ame"|"practice"|"assessment"|"parent"|"history">("ame");
  const [selectedSubject, setSelectedSubject] = useState(teacherSubjects[0] || "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // AME
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [selectedCompetency, setSelectedCompetency] = useState<any>(null);
  const [loadingComp, setLoadingComp] = useState(false);
  const [generatedAME, setGeneratedAME] = useState<{a:string;m:string;e:string}|null>(null);

  // Practice / Assessment — individual student gap-based
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [gapSource, setGapSource] = useState<"pasa"|"baseline">("pasa");
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [studentGaps, setStudentGaps] = useState<any[]>([]);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [numQ, setNumQ] = useState(10);
  const [difficulty, setDifficulty] = useState("Mixed");
  const [qTypes, setQTypes] = useState<string[]>(["Multiple Choice (MCQ)","Short Answer","Case-Based Short Answer"]);
  const [paperOutput, setPaperOutput] = useState("");

  // Weekly — class-level gap-aware
  const [weeklyTopic, setWeeklyTopic] = useState("");
  const [classGaps, setClassGaps] = useState<any[]>([]);
  const [loadingClassGaps, setLoadingClassGaps] = useState(false);
  const [weeklyOutput, setWeeklyOutput] = useState("");

  // Parent suggestions
  const [selectedParentStudent, setSelectedParentStudent] = useState<any>(null);
  const [parentContext, setParentContext] = useState("");
  const [parentOutput, setParentOutput] = useState("");

  // History
  const [history, setHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string|null>(null);

  // Auto-loads
  useEffect(() => { if (selectedSubject) fetchCompetencies(); }, [selectedSubject, classGrade]);
  useEffect(() => { if (allMappings.length > 0) fetchStudents(); }, [mappings]);
  useEffect(() => { if (classGrade) fetchExamTypes(); }, [classGrade, academicYear]);
  useEffect(() => { if ((subTab==="practice"||subTab==="assessment") && selectedStudent) fetchStudentGaps(); }, [selectedStudent, gapSource, selectedExam, selectedSubject]);
  useEffect(() => { if (subTab==="history") fetchHistory(); }, [subTab, historyFilter]);
  useEffect(() => { if (subTab==="parent" && selectedParentStudent) fetchActivityGaps(selectedParentStudent.id); }, [selectedParentStudent]);

  const fetchCompetencies = async () => {
    if (!selectedSubject) return;
    setLoadingComp(true);
    try {
      // Try with grade first, fallback to subject only
      let url = `${API}/activities/competencies?subject=${encodeURIComponent(selectedSubject)}`;
      if (classGrade) url += `&grade=${encodeURIComponent(classGrade)}`;
      let r = await axios.get(url);
      let comps = r.data?.competencies || [];
      // If no results with grade, try without grade filter
      if (comps.length === 0 && classGrade) {
        r = await axios.get(`${API}/activities/competencies?subject=${encodeURIComponent(selectedSubject)}`);
        comps = r.data?.competencies || [];
      }
      setCompetencies(comps);
    } catch {}
    setLoadingComp(false);
  };

  // Fetch activity gaps for a student - for parent suggestions
  const [activityGaps, setActivityGaps] = useState<any[]>([]);
  const [loadingActivityGaps, setLoadingActivityGaps] = useState(false);

  const fetchActivityGaps = async (studentId: string) => {
    setLoadingActivityGaps(true);
    setActivityGaps([]);
    try {
      const r = await axios.get(`${API}/activities/longitudinal/student/${studentId}`);
      const gaps: any[] = [];
      (r.data?.longitudinal || []).forEach((yr: any) => {
        (yr.subjects || []).forEach((sub: any) => {
          (sub.competencies || []).forEach((c: any) => {
            if (c.avg_score !== null && c.avg_score < 60) {
              gaps.push({ subject: sub.subject, competency_code: c.competency_code, competency_name: c.competency_name, avg_score: c.avg_score });
            }
          });
        });
      });
      setActivityGaps(gaps);
    } catch {}
    setLoadingActivityGaps(false);
  };

  const fetchStudents = async () => {
    try {
      let allStudents: any[] = [];
      if (classGrade && classSection) {
        // Class teacher - fetch from own class
        const r = await axios.get(`${API}/students?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}`);
        allStudents = r.data?.data || r.data || [];
      } else {
        // Subject teacher - fetch from all assigned sections
        const seen = new Set<string>();
        for (const m of allMappings) {
          if (!m.grade || !m.section) continue;
          const key = `${m.grade}__${m.section}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const r = await axios.get(`${API}/students?grade=${encodeURIComponent(m.grade)}&section=${encodeURIComponent(m.section)}`);
          allStudents.push(...(r.data?.data || r.data || []));
        }
      }
      setStudents(allStudents.filter((s:any) => s.is_active !== false));
    } catch {}
  };

  const fetchExamTypes = async () => {
    try {
      const r = await axios.get(`${API}/pasa/exam-types?academic_year=${academicYear}&grade=${encodeURIComponent(classGrade)}`);
      setExamTypes(r.data?.examTypes || []);
    } catch {}
  };

  const fetchStudentGaps = async () => {
    if (!selectedStudent) return;
    setLoadingGaps(true); setStudentGaps([]);
    try {
      if (gapSource === "pasa") {
        const r = await axios.get(`${API}/pasa/student/${selectedStudent.id}/analysis?academic_year=${academicYear}`);
        if (!r.data) { setLoadingGaps(false); return; }
        const gaps: any[] = [];
        (r.data.examSummary || []).forEach((exam: any) => {
          if (selectedExam && exam.exam !== selectedExam) return;
          Object.entries(exam.subjects || {}).forEach(([sub, sd]: [string, any]) => {
            if (selectedSubject && sub !== selectedSubject) return;
            (sd.competency_scores || []).forEach((cs: any) => {
              if (cs.marks_obtained !== null && cs.max_marks > 0 && (cs.marks_obtained / cs.max_marks) * 100 < 60) {
                gaps.push({ subject: sub, code: cs.competency_code, name: cs.competency_name, score: +((cs.marks_obtained/cs.max_marks)*100).toFixed(0), exam: exam.exam });
              }
            });
          });
        });
        setStudentGaps(gaps);
      } else {
        const r = await axios.get(`${API}/baseline/student/${selectedStudent.id}/portfolio`);
        const gaps: any[] = [];
        const allA: any[] = r.data?.assessments || [];
        const latestA = allA.sort((a: any, b: any) => a.round > b.round ? 1 : -1).slice(-1)[0];
        if (latestA) {
          if (latestA.literacy_pct) Object.entries(latestA.literacy_pct).forEach(([domain, score]: [string, any]) => {
            if (+score < 60) gaps.push({ subject: "literacy", domain, score: +score });
          });
          if (latestA.numeracy_pct) Object.entries(latestA.numeracy_pct).forEach(([domain, score]: [string, any]) => {
            if (+score < 60) gaps.push({ subject: "numeracy", domain, score: +score });
          });
        }
        setStudentGaps(gaps);
      }
    } catch {}
    setLoadingGaps(false);
  };

  const fetchClassGaps = async () => {
    if (!classGrade || !classSection) return;
    setLoadingClassGaps(true); setClassGaps([]);
    try {
      const et = selectedExam ? `&exam_type=${selectedExam}` : "";
      const r = await axios.get(`${API}/pasa/dashboard/section?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}&academic_year=${academicYear}${et}`);
      const weakComps: any[] = [];
      (r.data?.subjectSummary || []).forEach((s: any) => {
        if (selectedSubject && s.subject !== selectedSubject) return;
        (s.competency_avgs || []).forEach((c: any) => {
          if (c.avg < 60) weakComps.push({ subject: s.subject, code: c.code, avg: c.avg });
        });
      });
      setClassGaps(weakComps.sort((a,b) => a.avg - b.avg));
    } catch {}
    setLoadingClassGaps(false);
  };

  const callGroq = async (prompt: string, maxTokens = 2500): Promise<string> => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], max_tokens: maxTokens, temperature: 0.7 }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  };

  // Generate AME homework
  const generateAME = async () => {
    if (!selectedCompetency) { setMsg("❌ Select a competency first"); return; }
    setGenerating(true); setGeneratedAME(null); setMsg("");
    try {
      const prompt = `You are an experienced teacher creating differentiated homework for ${selectedSubject}, Grade ${classGrade}.
Competency: [${selectedCompetency.code || ""}] ${selectedCompetency.name}

Create 3 sets of homework (5 questions each) for different learning levels.
Format EXACTLY as:
===A===
[5 challenging/extension questions for ABOVE AVERAGE students]
===M===
[5 standard questions for AVERAGE students]
===E===
[5 simple/foundational questions for EMERGING students]

Make each question clear, age-appropriate, directly testing the competency.`;
      const raw = await callGroq(prompt);
      const aMatch = raw.match(/===A===([\s\S]*?)===M===/);
      const mMatch = raw.match(/===M===([\s\S]*?)===E===/);
      const eMatch = raw.match(/===E===([\s\S]*)$/);
      setGeneratedAME({ a: aMatch?.[1]?.trim()||raw, m: mMatch?.[1]?.trim()||"", e: eMatch?.[1]?.trim()||"" });
    } catch { setMsg("❌ Generation failed. Check API key."); }
    setGenerating(false);
  };

  // Generate Practice or Assessment paper
  const generatePaper = async (type: "Practice"|"Assessment") => {
    if (!selectedStudent || !studentGaps.length) { setMsg("❌ Select a student with gap data first"); return; }
    setGenerating(true); setPaperOutput(""); setMsg("");
    try {
      const gapBlock = studentGaps.slice(0,8).map((g:any) =>
        `- ${g.subject||""} [${g.code||g.domain||""}] ${g.name||g.domain||""} — Score: ${g.score}%`
      ).join("\n");
      const diffNote: Record<string,string> = {
        Easy:"All questions: recall and basic application only.",
        Moderate:"Mix of recall, application and simple analysis.",
        Challenging:"Focus on analysis, evaluation and synthesis.",
        Mixed:"Mix 40% easy, 40% moderate, 20% challenging.",
      };
      const qCount = type === "Practice" ? numQ : 15;
      const marksNote = type === "Assessment" ? "\n- Assign marks: 10 MCQ × 1 mark, 3 Short Answer × 4 marks, 2 Long Answer × 5 marks (Total 32 marks)" : "";
      const prompt = `You are an expert educational assessor creating a ${type} Paper for a student in India.

Student: ${selectedStudent.name} | Grade: ${classGrade} | Subject: ${selectedSubject||"Mixed"}
Gap source: ${gapSource==="pasa"?"PA/SA Assessment":"Baseline Assessment"}
${selectedExam?`Exam filter: ${selectedExam}`:""}

STUDENT GAP AREAS (below 60%):
${gapBlock}

REQUIREMENTS:
- Exactly ${qCount} questions
- Question types: ${type==="Practice"?qTypes.join(", "):"MCQ, Short Answer, Long Answer"}
- Difficulty: ${difficulty} — ${diffNote[difficulty]}
- Tag each question with competency code [CODE]
- Include complete Answer Key with explanations${marksNote}
- Age-appropriate language for Grade ${classGrade}

FORMATS:
[MCQ] 4 options A/B/C/D, correct marked ✓, 1-line reason
[SA] Short Answer: model answer 2–3 sentences
[LA] Long Answer: model answer 5–8 sentences
[FIB] Fill in the Blank with answer
[CBSA] 3-4 line classroom scenario + question + 2–3 sentence answer

Title: ${type} Paper — ${selectedStudent.name} — ${selectedSubject||"Mixed"} — ${new Date().toLocaleDateString()}`;
      setPaperOutput(await callGroq(prompt, 3000));
    } catch { setMsg("❌ Generation failed. Check API key."); }
    setGenerating(false);
  };

  // Generate gap-aware weekly homework
  const generateWeekly = async () => {
    setGenerating(true); setWeeklyOutput(""); setMsg("");
    try {
      const hasGaps = classGaps.length > 0;
      const gapBlock = classGaps.slice(0,6).map((g:any) =>
        `- [${g.code}] ${g.subject} — Class avg: ${g.avg?.toFixed(0)}%`
      ).join("\n");
      const prompt = `You are an experienced teacher creating a 5-day weekly homework plan for ${selectedSubject||"general subjects"}, Grade ${classGrade}.
${weeklyTopic ? `This week's topic: ${weeklyTopic}` : ""}
Mode: ${hasGaps ? "REMEDIAL — class has weak areas to address" : "ENRICHMENT — class is performing well"}
${hasGaps ? `
Class weak competencies (below 60%):
${gapBlock}` : ""}

Create a structured Monday-to-Friday homework plan:
- ${hasGaps ? "Focus questions on the weak competency areas above" : "Enrichment and extension activities"}
- Each day: 3-4 questions or activities, varied types
- Progressively build across the week (easy → challenging)
- Friday: 5-question mini-review with answer key
- End with a Parent Note: what to observe and how to support

Format exactly as:
📅 MONDAY — [Day theme]
[Questions/activities]

📅 TUESDAY — [Day theme]
[Questions/activities]

📅 WEDNESDAY — [Day theme]
[Questions/activities]

📅 THURSDAY — [Day theme]
[Questions/activities]

📅 FRIDAY — MINI REVIEW
[5 review questions + answers]

👨‍👩‍👧 PARENT NOTE
[Practical guidance for parents — what to look for, how to help at home]`;
      setWeeklyOutput(await callGroq(prompt, 3000));
    } catch { setMsg("❌ Generation failed. Check API key."); }
    setGenerating(false);
  };

  // Generate parent suggestion
  const generateParent = async () => {
    if (!selectedParentStudent) { setMsg("❌ Select a student first"); return; }
    setGenerating(true); setParentOutput(""); setMsg("");
    try {
      const gapBlock = activityGaps.length > 0
        ? activityGaps.slice(0,6).map((g:any) =>
            `- ${g.subject}: [${g.competency_code}] ${g.competency_name} (avg: ${g.avg_score?.toFixed(0)}%)`
          ).join("\n")
        : parentContext || "general improvement needed";

      const prompt = `Write a warm, constructive message to the parent of ${selectedParentStudent.name} (Grade ${classGrade}).
${activityGaps.length > 0 ? `The child is struggling with these specific activity-based competencies:\n${gapBlock}` : `Context: ${gapBlock}`}

Write a friendly, encouraging message (180-220 words) that:
1. Warmly acknowledges the child's efforts and strengths
2. Gently explains the specific competency areas where the child needs support (mention them by name)
3. Gives 3-4 simple, practical activities parents can do at home to strengthen these exact areas
4. Suggests how to make it fun and low-pressure at home
5. Ends with encouragement and confidence in the child's progress

Keep tone warm, professional and supportive — never alarming or critical.`;
      setParentOutput(await callGroq(prompt));
    } catch { setMsg("❌ Generation failed."); }
    setGenerating(false);
  };

  const saveRecord = async (type: string, extraData: any = {}) => {
    setSaving(true);
    try {
      await axios.post(`${API}/homework/save`, {
        teacher_id: user.id, teacher_name: user.name,
        grade: classGrade, section: classSection,
        subject: selectedSubject, academic_year: academicYear,
        type, competency_id: selectedCompetency?.id||null,
        competency_name: selectedCompetency?.name||null,
        ...extraData,
      });
      setMsg("✅ Saved!");
    } catch { setMsg("❌ Save failed."); }
    setSaving(false);
    setTimeout(()=>setMsg(""), 3000);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const tf = historyFilter !== "all" ? `&type=${historyFilter}` : "";
      const r = await axios.get(`${API}/homework/teacher/${user.id}?academic_year=${academicYear}${tf}`);
      setHistory(r.data?.records || []);
    } catch {}
    setLoadingHistory(false);
  };

  const deleteRecord = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    await axios.delete(`${API}/homework/${id}`);
    fetchHistory();
  };

  const printContent = (text: string, title: string) => {
    const w = window.open("","_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;padding:20px;max-width:800px;margin:0 auto;}pre{white-space:pre-wrap;font-family:Arial;line-height:1.6;}</style></head><body><h2>${title}</h2><pre>${text}</pre></body></html>`);
    w.document.close(); w.print();
  };

  const SUB_TABS = [
    {id:"ame", label:"📚 AME Homework", desc:"Select competency → generate 3 differentiated sets (Above/Medium/Emerging) for the whole class"},
    {id:"practice", label:"📝 Practice Paper", desc:"Select student → loads their PA/SA or Baseline gaps → generates targeted practice questions"},
    {id:"assessment", label:"📋 Assessment Paper", desc:"Select student → loads their gaps → generates formal assessment with marks allocation"},
    {id:"parent", label:"👨‍👩‍👧 Parent Suggestions", desc:"Select student → auto-loads their activity learning gaps → generates targeted home support suggestions for parents"},
    {id:"history", label:"🕒 History", desc:"All AI-generated records for this year — view, print, delete"},
  ];

  const Q_TYPE_OPTIONS = ["Multiple Choice (MCQ)","Short Answer","Long Answer","True/False","Fill in the Blank","Case-Based Short Answer"];

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h2 className="text-sm font-bold text-indigo-800 mb-1">🤖 AI Tools</h2>
        <p className="text-xs text-indigo-600">All generated content is automatically saved to records and accessible in Student Portfolio.</p>
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅")?"bg-green-50 border-green-300 text-green-800":"bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)}
            className={`px-3 py-2 text-xs rounded-lg font-medium whitespace-nowrap flex-shrink-0 ${subTab===t.id?"bg-indigo-600 text-white":"bg-white border border-gray-300 text-gray-600 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-gray-50 rounded-lg px-4 py-2 text-xs text-gray-500 italic">
        {SUB_TABS.find(t => t.id === subTab)?.desc}
      </div>

      {/* ── AME HOMEWORK ── */}
      {subTab === "ame" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Subject</label>
              <select value={selectedSubject} onChange={e=>{setSelectedSubject(e.target.value);setSelectedCompetency(null);}}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                {teacherSubjects.map((s:string)=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Competency * {loadingComp && <span className="text-indigo-400">Loading...</span>}</label>
              <select value={selectedCompetency?.id||""} onChange={e=>setSelectedCompetency(competencies.find(c=>c.id===e.target.value)||null)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                <option value="">-- Select competency --</option>
                {competencies.map((c:any)=><option key={c.id} value={c.id}>[{c.code}] {c.name?.slice(0,60)}</option>)}
              </select>
            </div>
          </div>
          {selectedCompetency && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-xs text-indigo-700">
              Selected: <strong>[{selectedCompetency.code}]</strong> {selectedCompetency.name}
            </div>
          )}
          <button onClick={generateAME} disabled={generating||!selectedCompetency}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
            {generating?"Generating 3 sets...":"⚡ Generate AME Homework"}
          </button>
          {generatedAME && (
            <div className="space-y-3">
              {[{key:"a",label:"🌟 A — Above Average",color:"border-green-500 bg-green-50"},
                {key:"m",label:"📘 M — Medium / Average",color:"border-blue-500 bg-blue-50"},
                {key:"e",label:"🌱 E — Emerging",color:"border-orange-500 bg-orange-50"}].map(({key,label,color})=>(
                <div key={key} className={`rounded-xl border-l-4 ${color} p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-700">{label}</h3>
                    <button onClick={()=>printContent(generatedAME[key as "a"|"m"|"e"],label)} className="text-xs text-indigo-600 hover:underline">🖨 Print</button>
                  </div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{generatedAME[key as "a"|"m"|"e"]}</pre>
                </div>
              ))}
              <button onClick={()=>saveRecord("AME",{content_a:generatedAME.a,content_m:generatedAME.m,content_e:generatedAME.e})} disabled={saving}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving?"Saving...":"💾 Save to Records"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PRACTICE / ASSESSMENT ── */}
      {(subTab==="practice"||subTab==="assessment") && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Subject Filter</label>
              <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                <option value="">All Subjects</option>
                {teacherSubjects.map((s:string)=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Gap Source</label>
              <select value={gapSource} onChange={e=>setGapSource(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                <option value="pasa">PA/SA Competency Gaps</option>
                <option value="baseline">Baseline Gaps</option>
              </select>
            </div>
            {gapSource==="pasa" && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Exam Filter</label>
                <select value={selectedExam} onChange={e=>setSelectedExam(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                  <option value="">All Exams</option>
                  {examTypes.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Student *</label>
              <select value={selectedStudent?.id||""} onChange={e=>setSelectedStudent(students.find(s=>s.id===e.target.value)||null)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                <option value="">-- Select student --</option>
                {students.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">No. of Questions</label>
              <select value={numQ} onChange={e=>setNumQ(+e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                {[5,10,15,20].map(n=><option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Difficulty</label>
              <select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                {["Easy","Moderate","Challenging","Mixed"].map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {subTab==="practice" && (
            <div className="bg-white rounded-xl shadow p-4">
              <label className="text-xs text-gray-500 block mb-2">Question Types</label>
              <div className="flex flex-wrap gap-2">
                {Q_TYPE_OPTIONS.map(qt=>(
                  <label key={qt} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={qTypes.includes(qt)} onChange={e=>setQTypes(p=>e.target.checked?[...p,qt]:p.filter(q=>q!==qt))} className="accent-indigo-600" />
                    {qt}
                  </label>
                ))}
              </div>
            </div>
          )}
          {/* Gap display */}
          {selectedStudent && (
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs font-bold text-gray-600 mb-2">
                Gaps for {selectedStudent.name}
                {loadingGaps && <span className="ml-2 text-indigo-400 font-normal animate-pulse">Loading...</span>}
              </p>
              {!loadingGaps && studentGaps.length===0 && <p className="text-xs text-gray-400">No gaps below 60% found. Try a different source or exam.</p>}
              {!loadingGaps && studentGaps.length>0 && (
                <div className="flex flex-wrap gap-2">
                  {studentGaps.slice(0,10).map((g:any,i:number)=>(
                    <span key={i} className="px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      [{g.code||g.domain}] {g.score}%
                    </span>
                  ))}
                  {studentGaps.length>10 && <span className="text-xs text-gray-400">+{studentGaps.length-10} more</span>}
                </div>
              )}
            </div>
          )}
          <button onClick={()=>generatePaper(subTab==="practice"?"Practice":"Assessment")}
            disabled={generating||!selectedStudent||studentGaps.length===0}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
            {generating?"Generating...":"⚡ Generate "+( subTab==="practice"?"Practice Paper":"Assessment Paper")}
          </button>
          {paperOutput && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">{subTab==="practice"?"Practice":"Assessment"} Paper — {selectedStudent?.name}</h3>
                <div className="flex gap-2">
                  <button onClick={()=>printContent(paperOutput,`${subTab==="practice"?"Practice":"Assessment"} Paper — ${selectedStudent?.name}`)} className="text-xs text-indigo-600 hover:underline">🖨 Print</button>
                  <button onClick={()=>saveRecord(subTab==="practice"?"Practice":"Assessment",{content:paperOutput,student_id:selectedStudent?.id,student_name:selectedStudent?.name})} disabled={saving} className="text-xs text-green-600 hover:underline">{saving?"Saving...":"💾 Save"}</button>
                </div>
              </div>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{paperOutput}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── PARENT SUGGESTIONS ── */}
      {subTab==="parent" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Student *</label>
              <select value={selectedParentStudent?.id||""} onChange={e=>setSelectedParentStudent(students.find(s=>s.id===e.target.value)||null)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                <option value="">-- Select student --</option>
                {students.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Additional Context (optional)</label>
              <input type="text" value={parentContext} onChange={e=>setParentContext(e.target.value)}
                placeholder="Any extra notes about the student..."
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
            </div>
          </div>
          {/* Show activity gaps */}
          {selectedParentStudent && (
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs font-bold text-gray-600 mb-2">
                Activity Learning Gaps for {selectedParentStudent.name}
                {loadingActivityGaps && <span className="ml-2 text-indigo-400 font-normal animate-pulse">Loading...</span>}
              </p>
              {!loadingActivityGaps && activityGaps.length === 0 && (
                <p className="text-xs text-green-600">✅ No significant gaps found in activities. Suggestion will focus on general enrichment.</p>
              )}
              {!loadingActivityGaps && activityGaps.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activityGaps.slice(0,8).map((g:any,i:number)=>(
                    <span key={i} className="px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                      [{g.competency_code}] {g.subject} — {g.avg_score?.toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={generateParent} disabled={generating||!selectedParentStudent}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
            {generating?"Generating...":"⚡ Generate Parent Suggestion"}
          </button>
          {parentOutput && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">Parent Suggestion — {selectedParentStudent?.name}</h3>
                <div className="flex gap-2">
                  <button onClick={()=>printContent(parentOutput,`Parent Suggestion — ${selectedParentStudent?.name}`)} className="text-xs text-indigo-600 hover:underline">🖨 Print</button>
                  <button onClick={()=>saveRecord("ParentSuggestion",{content:parentOutput,student_id:selectedParentStudent?.id,student_name:selectedParentStudent?.name})} disabled={saving} className="text-xs text-green-600 hover:underline">{saving?"Saving...":"💾 Save"}</button>
                </div>
              </div>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{parentOutput}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {subTab==="history" && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <select value={historyFilter} onChange={e=>{setHistoryFilter(e.target.value);setTimeout(fetchHistory,100);}} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              <option value="all">All Types</option>
              <option value="AME">AME Homework</option>
              <option value="Practice">Practice Paper</option>
              <option value="Assessment">Assessment Paper</option>
              <option value="Weekly">Weekly Homework</option>
              <option value="ParentSuggestion">Parent Suggestions</option>
            </select>
            <button onClick={fetchHistory} className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">🔄 Refresh</button>
          </div>
          {loadingHistory ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Loading...</div>
          ) : history.length===0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm">No records yet. Generate content to see it here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <span className="text-sm font-semibold text-gray-700">{history.length} Records</span>
              </div>
              <div className="divide-y divide-gray-100">
                {history.map((r:any)=>(
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.type==="AME"?"bg-green-100 text-green-700":r.type==="Practice"?"bg-blue-100 text-blue-700":r.type==="Assessment"?"bg-purple-100 text-purple-700":r.type==="Weekly"?"bg-orange-100 text-orange-700":"bg-pink-100 text-pink-700"}`}>{r.type}</span>
                          <span className="text-sm font-medium text-gray-800">{r.subject}</span>
                          {r.competency_name && <span className="text-xs text-gray-500">· {r.competency_name}</span>}
                          {r.student_name && <span className="text-xs text-gray-500">· {r.student_name}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString()} · {r.grade} {r.section}</p>
                      </div>
                      <div className="flex gap-2 ml-3">
                        <button onClick={()=>setExpandedRecord(expandedRecord===r.id?null:r.id)} className="text-xs text-indigo-600 hover:underline">{expandedRecord===r.id?"Hide":"View"}</button>
                        <button onClick={()=>deleteRecord(r.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </div>
                    {expandedRecord===r.id && (
                      <div className="mt-3 space-y-2">
                        {r.type==="AME" ? (
                          <>
                            {[{key:"content_a",label:"🌟 Above Average"},{key:"content_m",label:"📘 Medium"},{key:"content_e",label:"🌱 Emerging"}].map(({key,label})=>r[key]&&(
                              <div key={key} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-bold text-gray-600">{label}</p>
                                  <button onClick={()=>printContent(r[key],label)} className="text-xs text-indigo-600 hover:underline">🖨 Print</button>
                                </div>
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{r[key]}</pre>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-bold text-gray-600">Content</p>
                              <button onClick={()=>printContent(r.content,`${r.type} — ${r.subject}`)} className="text-xs text-indigo-600 hover:underline">🖨 Print</button>
                            </div>
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{r.content}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function AlertsTab({ user, mappings, academicYear }: any) {
  const API = "https://cbas-backend-production.up.railway.app";
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const myGrades = (mappings?.mappings || []).map((m: any) => m.grade).filter(Boolean);
  const uniqueGrades = [...new Set(myGrades)] as string[];

  useEffect(() => { fetchAlerts(); }, [academicYear]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/activities/alerts/decline?academic_year=${academicYear}`);
      const all = r.data || [];
      // Filter to teacher's grades only
      const teacherGrades = (user?.assigned_classes || []).map((g: string) => g.toLowerCase());
      const filtered = teacherGrades.length
        ? all.filter((a: any) => teacherGrades.includes((a.grade || "").toLowerCase()))
        : all;
      setAlerts(filtered);
    } catch { setAlerts([]); }
    setLoading(false);
  };

  const scoreBg = (v: number) => v >= 3.5 ? "bg-green-100 text-green-800" : v >= 2.5 ? "bg-blue-100 text-blue-800" : v >= 1.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-yellow-800 mb-1">⚠️ Consecutive Decline Alert</h3>
        <p className="text-xs text-yellow-600">Students in your sections whose competency average dropped in 3 consecutive activities.</p>
      </div>
      <div className="bg-white rounded-xl shadow p-4">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No students with consecutive declines in your sections. 🎉</p>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Students with Consecutive Decline ({alerts.length})</h3>
            {alerts.map((s: any, i: number) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold text-red-800">{s.student_name}</span>
                    <span className="text-xs text-gray-500 ml-2">{s.grade} — {s.section}</span>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                    Drop: {s.decline_from} → {s.decline_to} (-{s.drop})
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
                  {(s.scores || []).map((sc: any, j: number) => (
                    <div key={j} className={`text-center rounded px-2 py-1 text-xs border ${scoreBg(sc.avg)}`}>
                      <p className="font-bold">{sc.avg?.toFixed(2)}/4</p>
                      <p className="text-gray-500 text-xs truncate max-w-[80px]">{sc.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



function HomeworkPortfolioSection({ student, grade, section, subject, isClassTeacher, API }: any) {
  const [records, setRecords] = useState<any>(null);
  const [parentSuggestions, setParentSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string|null>(null);

  useEffect(() => {
    fetchRecords();
  }, [student]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [classRes, parentRes] = await Promise.all([
        axios.get(`${API}/homework/class/${encodeURIComponent(grade)}/${encodeURIComponent(section)}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`),
        axios.get(`${API}/homework/student/${student.id}/suggestions${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`),
      ]);
      setRecords(classRes.data?.byYear || {});
      setParentSuggestions(parentRes.data?.records || []);
    } catch { }
    setLoading(false);
  };

  const printContent = (content: string, title: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;padding:20px;}pre{white-space:pre-wrap;}</style></head><body><h2>${title}</h2><pre>${content}</pre></body></html>`);
    w.document.close();
    w.print();
  };

  if (loading) return <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Loading homework records...</div>;

  const years = Object.keys(records || {}).sort();
  const totalRecords = Object.values(records || {}).reduce((t: number, r: any) => t + r.length, 0);

  return (
    <div className="space-y-4">
      {/* Parent Suggestions */}
      {parentSuggestions.length > 0 && (
        <div className="bg-pink-50 border border-pink-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-pink-700 text-white">
            <h3 className="text-sm font-bold">👨‍👩‍👧 Parent Suggestions for {student.name}</h3>
          </div>
          <div className="divide-y divide-pink-100">
            {parentSuggestions.map((r: any) => (
              <div key={r.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-xs font-medium text-pink-700">{r.subject}</span>
                    <span className="text-xs text-gray-400 ml-2">{new Date(r.created_at).toLocaleDateString()} · {r.academic_year}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="text-xs text-indigo-600 hover:underline">
                      {expandedId === r.id ? "Hide" : "View"}
                    </button>
                    <button onClick={() => printContent(r.content, `Parent Suggestion — ${student.name}`)} className="text-xs text-gray-500 hover:underline">🖨 Print</button>
                  </div>
                </div>
                {expandedId === r.id && <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans mt-2 bg-white rounded p-3">{r.content}</pre>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Homework Records by Year */}
      {years.length === 0 && parentSuggestions.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm">No homework records found for this student's class.</p>
        </div>
      ) : years.map(year => (
        <div key={year} className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 bg-indigo-700 text-white flex items-center justify-between">
            <span className="font-bold text-sm">{year}</span>
            <span className="text-xs text-indigo-200">{records[year]?.length} records</span>
          </div>
          <div className="divide-y divide-gray-100">
            {records[year]?.map((r: any) => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.type==="AME" ? "bg-green-100 text-green-700" :
                        r.type==="Practice" ? "bg-blue-100 text-blue-700" :
                        r.type==="Assessment" ? "bg-purple-100 text-purple-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>{r.type}</span>
                      <span className="text-sm font-medium text-gray-800">{r.subject}</span>
                      {r.competency_name && <span className="text-xs text-gray-500">· {r.competency_name}</span>}
                      {r.topic && <span className="text-xs text-gray-500">· {r.topic}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString()} · by {r.teacher_name}</p>
                  </div>
                  <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="text-xs text-indigo-600 hover:underline ml-3">
                    {expandedId === r.id ? "Hide" : "View"}
                  </button>
                </div>
                {expandedId === r.id && (
                  <div className="mt-3 space-y-2">
                    {r.type === "AME" ? (
                      [{key:"content_a",label:"🌟 Above Average"},{key:"content_m",label:"📘 Medium"},{key:"content_e",label:"🌱 Emerging"}].map(({key,label}) => r[key] && (
                        <div key={key} className="bg-gray-50 rounded p-3">
                          <div className="flex justify-between mb-1">
                            <p className="text-xs font-bold text-gray-600">{label}</p>
                            <button onClick={() => printContent(r[key], label)} className="text-xs text-indigo-600 hover:underline">🖨 Print</button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{r[key]}</pre>
                        </div>
                      ))
                    ) : (
                      <div className="bg-gray-50 rounded p-3">
                        <div className="flex justify-between mb-1">
                          <p className="text-xs font-bold text-gray-600">Content</p>
                          <button onClick={() => printContent(r.content, `${r.type} — ${r.subject}`)} className="text-xs text-indigo-600 hover:underline">🖨 Print</button>
                        </div>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{r.content}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioTab({ user, mappings, academicYear }: any) {
  const API = "https://cbas-backend-production.up.railway.app";

  // Determine teacher's subjects and type
  const isClassTeacher = !!(mappings?.is_class_teacher || user?.class_teacher_of);
  const teacherSubjects: string[] = mappings?.subjects || user?.subjects || [];
  const isEnglishTeacher = teacherSubjects.some((s: string) => s.toLowerCase().includes("english") || s.toLowerCase().includes("literacy"));
  const isMathTeacher = teacherSubjects.some((s: string) => s.toLowerCase().includes("math") || s.toLowerCase().includes("numeracy") || s.toLowerCase().includes("maths"));

  // Students list
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search, setSearch] = useState("");

  // Selected student portfolio
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [portfolioTab, setPortfolioTab] = useState<"pasa"|"baseline"|"activities"|"homework">("pasa");

  // Load students based on teacher's current assignment
  useEffect(() => { fetchStudents(); }, [mappings, academicYear]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      let allStudents: any[] = [];
      // Try class teacher mapping first
      const cg = mappings?.class_grade;
      const cs = mappings?.class_section;
      // Fallback: parse from user.class_teacher_of
      let fallbackGrade = cg, fallbackSection = cs;
      if (!cg && user?.class_teacher_of) {
        const parts = user.class_teacher_of.trim().split(' ').filter(Boolean);
        fallbackSection = parts[parts.length - 1];
        fallbackGrade = parts.slice(0, -1).join(' ');
        if (/^\d+$/.test(fallbackGrade)) fallbackGrade = `Grade ${fallbackGrade}`;
      }
      if (fallbackGrade && fallbackSection) {
        const r = await axios.get(`${API}/students?grade=${encodeURIComponent(fallbackGrade)}&section=${encodeURIComponent(fallbackSection)}`);
        allStudents = r.data?.data || r.data || [];
      } else if (mappings?.sections?.length > 0) {
        // Subject teacher — fetch from all assigned sections
        for (const sec of mappings.sections) {
          const r = await axios.get(`${API}/students?grade=${encodeURIComponent(sec.grade)}&section=${encodeURIComponent(sec.section)}`);
          const list = r.data?.data || r.data || [];
          allStudents.push(...list);
        }
        // Deduplicate
        const seen = new Set();
        allStudents = allStudents.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
      }
      setStudents(allStudents.filter((s: any) => s.is_active !== false));
    } catch { }
    setLoadingStudents(false);
  };

  const openPortfolio = async (student: any) => {
    setSelectedStudent(student);
    setPortfolio(null);
    setLoadingPortfolio(true);
    try {
      const subjectsParam = isClassTeacher ? "" : teacherSubjects.join(",");
      const [pasaRes, baselineRes, activitiesRes] = await Promise.all([
        axios.get(`${API}/pasa/portfolio/student/${student.id}${subjectsParam ? `?subjects=${encodeURIComponent(subjectsParam)}` : ""}`),
        (isClassTeacher || isEnglishTeacher || isMathTeacher)
          ? axios.get(`${API}/baseline/student/${student.id}/portfolio`)
          : Promise.resolve({ data: { assessments: [] } }),
        axios.get(`${API}/activities/longitudinal/student/${student.id}`),
      ]);

      // Transform baseline assessments → years structure for portfolio display
      const baselineAssessments: any[] = baselineRes.data?.assessments || [];
      const byYear: Record<string, any[]> = {};
      baselineAssessments.forEach((a: any) => {
        if (!byYear[a.academic_year]) byYear[a.academic_year] = [];
        byYear[a.academic_year].push(a);
      });
      const baselineYears = Object.entries(byYear).sort(([a],[b]) => a > b ? 1 : -1).map(([year, recs]) => {
        const latest = recs[recs.length - 1];
        return {
          academic_year: year,
          grade: latest?.grade || "",
          rounds: recs.length,
          literacy: latest?.literacy_total != null ? {
            avg: +latest.literacy_total,
            stage: latest.stage,
            pct: latest.literacy_pct || {},
          } : null,
          numeracy: latest?.numeracy_total != null ? {
            avg: +latest.numeracy_total,
            stage: latest.stage,
            pct: latest.numeracy_pct || {},
          } : null,
          overall: latest?.overall_score != null ? +latest.overall_score : null,
          level: latest?.level || null,
        };
      });

      setPortfolio({
        pasa: pasaRes.data,
        baseline: { years: baselineYears },
        activities: activitiesRes.data,
      });
    } catch { }
    setLoadingPortfolio(false);
  };

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_no?.toLowerCase().includes(search.toLowerCase())
  );

  // If a student is selected, show their portfolio
  if (selectedStudent) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedStudent(null); setPortfolio(null); }}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg flex items-center gap-1">
            ← Back
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">📁 {selectedStudent.name}</h2>
            <p className="text-xs text-gray-500">{selectedStudent.admission_no} · Full history across all years</p>
          </div>
        </div>

        {loadingPortfolio ? (
          <div className="bg-white rounded-xl shadow p-10 text-center">
            <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-sm text-gray-400">Loading portfolio...</p>
          </div>
        ) : portfolio ? (
          <div className="space-y-4">
            {/* Portfolio sub-tabs */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setPortfolioTab("pasa")}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${portfolioTab==="pasa" ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-indigo-50"}`}>
                📊 PA/SA Marks
              </button>
              {(isClassTeacher || isEnglishTeacher || isMathTeacher) && (
                <button onClick={() => setPortfolioTab("baseline")}
                  className={`px-4 py-2 text-sm rounded-lg font-medium ${portfolioTab==="baseline" ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-indigo-50"}`}>
                  📈 Baseline
                </button>
              )}
              <button onClick={() => setPortfolioTab("activities")}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${portfolioTab==="activities" ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-indigo-50"}`}>
                🎯 Activities
              </button>
              <button onClick={() => setPortfolioTab("homework")}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${portfolioTab==="homework" ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-indigo-50"}`}>
                📝 Homework & AI Records
              </button>
            </div>

            {/* PASA Portfolio */}
            {portfolioTab === "pasa" && (
              <div className="space-y-4">
                {!portfolio.pasa?.years?.length ? (
                  <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">No PA/SA data found for this student.</div>
                ) : portfolio.pasa.years.map((yr: any) => (
                  <div key={yr.academic_year} className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="px-4 py-3 bg-indigo-700 text-white flex items-center justify-between">
                      <span className="font-bold text-sm">{yr.academic_year}</span>
                      <span className="text-xs text-indigo-200">{yr.grade}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-gray-600">Exam</th>
                            {yr.subjects?.map((sub: string) => (
                              <th key={sub} className="px-3 py-2 text-center text-gray-600">{sub}</th>
                            ))}
                            <th className="px-3 py-2 text-center text-gray-600 font-bold">Overall %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yr.exams?.map((exam: any, i: number) => (
                            <tr key={exam.exam} className={i%2===0?"bg-white":"bg-gray-50"}>
                              <td className="px-3 py-2 font-medium text-gray-700">{exam.exam}</td>
                              {yr.subjects?.map((sub: string) => {
                                const sd = exam.subjects?.[sub];
                                return (
                                  <td key={sub} className="px-3 py-2 text-center">
                                    {sd?.percentage !== null && sd?.percentage !== undefined
                                      ? <span className={`font-medium ${sd.percentage>=80?"text-green-600":sd.percentage>=60?"text-blue-600":sd.percentage>=40?"text-yellow-600":"text-red-600"}`}>
                                          {sd.percentage}%
                                        </span>
                                      : <span className="text-gray-300">—</span>}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-center font-bold">
                                {exam.grand_percentage !== null
                                  ? <span className={exam.grand_percentage>=80?"text-green-600":exam.grand_percentage>=60?"text-blue-600":exam.grand_percentage>=40?"text-yellow-600":"text-red-600"}>
                                      {exam.grand_percentage}%
                                    </span>
                                  : "—"}
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

            {/* Baseline Portfolio */}
            {portfolioTab === "baseline" && (
              <div className="space-y-4">
                {!portfolio.baseline?.years?.length ? (
                  <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">No baseline data found for this student.</div>
                ) : portfolio.baseline.years.map((yr: any) => (
                  <div key={yr.academic_year} className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="px-4 py-3 bg-green-700 text-white flex items-center justify-between">
                      <span className="font-bold text-sm">{yr.academic_year}</span>
                      <span className="text-xs text-green-200">{yr.grade} · {yr.rounds} round(s)</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      {(isClassTeacher || isEnglishTeacher) && yr.literacy && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-700 mb-1">📖 Literacy</p>
                          <p className="text-2xl font-bold text-blue-800">{yr.literacy.avg != null ? yr.literacy.avg.toFixed(1) : "—"}<span className="text-sm font-normal text-blue-500">%</span></p>
                          <p className="text-xs text-blue-600 mt-1">Stage: {yr.literacy.stage || "—"}</p>
                        </div>
                      )}
                      {(isClassTeacher || isMathTeacher) && yr.numeracy && (
                        <div className="bg-purple-50 rounded-lg p-3">
                          <p className="text-xs font-bold text-purple-700 mb-1">🔢 Numeracy</p>
                          <p className="text-2xl font-bold text-purple-800">{yr.numeracy.avg != null ? yr.numeracy.avg.toFixed(1) : "—"}<span className="text-sm font-normal text-purple-500">%</span></p>
                          <p className="text-xs text-purple-600 mt-1">Stage: {yr.numeracy.stage || "—"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Homework Portfolio */}
            {portfolioTab === "homework" && (
              <HomeworkPortfolioSection
                student={selectedStudent}
                grade={selectedStudent?.current_class}
                section={selectedStudent?.section}
                subject={isClassTeacher ? undefined : teacherSubjects[0]}
                isClassTeacher={isClassTeacher}
                API={API}
              />
            )}

            {/* Activities Portfolio */}
            {portfolioTab === "activities" && (
              <div className="space-y-4">
                {!portfolio.activities?.timeline?.length ? (
                  <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">No activities data found for this student.</div>
                ) : portfolio.activities.timeline.map((yr: any) => {
                  const subjects = portfolio.activities.subjects || [];
                  const filteredSubjects = isClassTeacher ? subjects : subjects.filter((sub: string) => teacherSubjects.some((ts: string) => ts.toLowerCase() === sub.toLowerCase()));
                  return (
                  <div key={yr.academic_year} className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="px-4 py-3 bg-orange-700 text-white flex items-center justify-between">
                      <span className="font-bold text-sm">{yr.academic_year}</span>
                      <span className="text-xs text-orange-200">{yr.grade}</span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-bold text-gray-700">Overall</span>
                        <span className={`text-sm font-bold ${yr.overall>=80?"text-green-600":yr.overall>=60?"text-blue-600":yr.overall>=40?"text-yellow-600":"text-red-600"}`}>
                          {yr.overall?.toFixed(1) ?? "—"}%
                        </span>
                      </div>
                      {filteredSubjects.map((sub: string) => (
                        <div key={sub} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <span className="text-sm text-gray-700">{sub}</span>
                          <span className={`text-sm font-bold ${yr[sub]>=80?"text-green-600":yr[sub]>=60?"text-blue-600":yr[sub]>=40?"text-yellow-600":"text-red-600"}`}>
                            {yr[sub]?.toFixed(1) ?? "—"}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );})}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  // Student list view
  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h2 className="text-sm font-bold text-indigo-800 mb-1">📁 Student Portfolio</h2>
        <p className="text-xs text-indigo-600">
          Click any student to view their complete history across all academic years.
          {isClassTeacher ? " As class teacher you can see all subjects." : ` As subject teacher you can see: ${teacherSubjects.join(", ")}.`}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search student by name or admission no..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
      </div>

      {loadingStudents ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Loading students...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm">No students found in your current assignment.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-700">{filteredStudents.length} Students</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredStudents.map((s: any) => (
              <button key={s.id} onClick={() => openPortfolio(s)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-indigo-50 transition-colors text-left">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.admission_no} · {s.current_class} {s.section}</p>
                </div>
                <span className="text-xs text-indigo-600 font-medium">View Portfolio →</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PromotionTab({ user, mappings }: any) {
  const GRADE_ORDER = ["Pre-KG","LKG","UKG","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];

  // Derive class teacher info
  const rawCTO = (mappings?.class_teacher_of || user?.class_teacher_of || "").trim();
  const ctoParts = rawCTO.split(' ').filter(Boolean);
  const rawGrade = mappings?.class_grade || (ctoParts.length >= 3 ? ctoParts.slice(0,-1).join(' ') : ctoParts.length === 2 ? ctoParts[0] : "");
  const rawSection = mappings?.class_section || (ctoParts.length >= 2 ? ctoParts[ctoParts.length-1] : "");
  const classGrade = rawGrade && !/^grade\s/i.test(rawGrade) && !["Pre-KG","LKG","UKG"].includes(rawGrade) && /^\d+$/.test(rawGrade.trim()) ? `Grade ${rawGrade.trim()}` : rawGrade;
  const classSection = rawSection;
  const isClassTeacher = !!(classGrade && classSection);

  const nextGradeIdx = GRADE_ORDER.indexOf(classGrade) + 1;
  const nextGrade = nextGradeIdx < GRADE_ORDER.length ? GRADE_ORDER[nextGradeIdx] : null;
  const isGrade10 = classGrade === "Grade 10";

  const [students, setStudents] = useState<any[]>([]);
  const [nextSections, setNextSections] = useState<string[]>([]);
  const [studentSections, setStudentSections] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [defaultSection, setDefaultSection] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [step, setStep] = useState<"preview"|"confirm"|"done">("preview");
  const [loading, setLoading] = useState(false);
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear().toString());

  // Load students and next grade sections
  const loadStudents = async () => {
    setLoading(true);
    try {
      const [studRes, secRes] = await Promise.all([
        axios.get(`${API}/students?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}`),
        nextGrade ? axios.get(`${API}/students/sections/${encodeURIComponent(nextGrade)}`) : Promise.resolve({ data: { sections: [] } }),
      ]);
      const list = (studRes.data?.data || studRes.data || []).filter((s:any) => s.is_active !== false);
      setStudents(list);
      setSelectedIds(list.map((s:any) => s.id));
      const initSections: Record<string,string> = {};
      list.forEach((s:any) => { initSections[s.id] = ""; });
      setStudentSections(initSections);
      setNextSections(secRes.data?.sections || []);
      setStep("confirm");
    } catch { setMsg("❌ Could not load students."); }
    setLoading(false);
  };

  const applyDefaultSection = (section: string) => {
    setDefaultSection(section);
    const updated = { ...studentSections };
    selectedIds.forEach(id => { updated[id] = section; });
    setStudentSections(updated);
  };

  const executePromotion = async () => {
    const missing = selectedIds.filter(id => !studentSections[id]);
    if (missing.length) { setMsg(`❌ Please select a section for all ${missing.length} student(s).`); return; }
    setPromoting(true);
    try {
      const sectionGroups: Record<string, string[]> = {};
      selectedIds.forEach(id => {
        const sec = studentSections[id];
        if (!sectionGroups[sec]) sectionGroups[sec] = [];
        sectionGroups[sec].push(id);
      });
      let totalPromoted = 0;
      for (const [targetSection, ids] of Object.entries(sectionGroups)) {
        const r = await axios.post(`${API}/students/promotion/execute`, {
          grade: classGrade, section: classSection,
          new_section: targetSection, student_ids: ids,
        });
        totalPromoted += r.data?.promoted_count || ids.length;
      }
      setResult({ promoted: totalPromoted, type: "promotion" });
      setStep("done");
    } catch { setMsg("❌ Promotion failed. Try again."); }
    setPromoting(false);
  };

  const executeGraduation = async () => {
    if (!graduationYear) { setMsg("❌ Enter graduation year"); return; }
    setPromoting(true);
    try {
      const r = await axios.post(`${API}/students/graduation/execute`, {
        grade: classGrade, section: classSection,
        student_ids: selectedIds, graduation_year: graduationYear,
      });
      setResult({ promoted: r.data?.graduated || selectedIds.length, type: "graduation" });
      setStep("done");
    } catch { setMsg("❌ Graduation failed. Try again."); }
    setPromoting(false);
  };

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (!isClassTeacher) {
    return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Only class teachers can access the Promotion tab.</div>;
  }

  return (
    <div className="space-y-4 w-full max-w-4xl">
      <div className={`border rounded-xl p-4 ${isGrade10 ? "bg-amber-50 border-amber-200" : "bg-indigo-50 border-indigo-200"}`}>
        <h3 className={`text-sm font-bold mb-1 ${isGrade10 ? "text-amber-800" : "text-indigo-800"}`}>
          {isGrade10 ? "🎓 Student Graduation" : "🎓 Student Promotion"}
        </h3>
        <p className={`text-xs ${isGrade10 ? "text-amber-600" : "text-indigo-600"}`}>
          {isGrade10
            ? `Graduate students from ${classGrade} · ${classSection}. They will be marked as alumni and their data preserved.`
            : `Promote students from ${classGrade} · ${classSection} to ${nextGrade}. Assign each student to their new section.`}
        </p>
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {step === "preview" && (
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <p className="text-sm text-gray-600 mb-1">Your class: <strong>{classGrade} · {classSection}</strong></p>
          {isGrade10 ? (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">These students will be graduated and marked as alumni.</p>
              <div className="flex items-center justify-center gap-3">
                <label className="text-sm text-gray-600">Graduation Year:</label>
                <input type="text" value={graduationYear} onChange={e => setGraduationYear(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm w-24 text-center" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 mb-4">Will be promoted to: <strong>{nextGrade}</strong></p>
          )}
          <button onClick={loadStudents} disabled={loading}
            className={`px-6 py-2.5 text-white text-sm rounded-lg font-semibold disabled:opacity-50 ${isGrade10 ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {loading ? "Loading..." : "📋 Load Student List"}
          </button>
        </div>
      )}

      {step === "confirm" && students.length > 0 && (
        <div className="space-y-4">
          {/* For promotion — section selector */}
          {!isGrade10 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Apply same section to all students</h3>
              {nextSections.length > 0 ? (
                <div className="flex gap-3 items-center flex-wrap">
                  <select value={defaultSection} onChange={e => applyDefaultSection(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 max-w-xs">
                    <option value="">-- Select default section for all --</option>
                    {nextSections.map(s => <option key={s} value={s}>{nextGrade} · {s}</option>)}
                  </select>
                  <span className="text-xs text-gray-400">Or assign individually per student below</span>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-700">⚠️ No sections found for {nextGrade}. Please add sections in Section Management first, or sections will be created when students are assigned.</p>
                  <input type="text" placeholder="Type section name manually (e.g. KARANTHA)"
                    value={defaultSection} onChange={e => applyDefaultSection(e.target.value.toUpperCase())}
                    className="mt-2 border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
                </div>
              )}
            </div>
          )}

          {/* Student list */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                {students.length} students in {classGrade} · {classSection}
                <span className="ml-2 text-xs text-gray-400">({selectedIds.length} selected)</span>
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds(students.map(s => s.id))} className="text-xs text-indigo-600 hover:underline">Select All</button>
                <button onClick={() => setSelectedIds([])} className="text-xs text-gray-400 hover:underline">Clear All</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-white text-xs ${isGrade10 ? "bg-amber-700" : "bg-indigo-700"}`}>
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2 text-left">Student Name</th>
                    <th className="px-3 py-2 text-left">Admission No</th>
                    {!isGrade10 && <th className="px-3 py-2 text-left min-w-[200px]">New Section in {nextGrade} *</th>}
                    {isGrade10 && <th className="px-3 py-2 text-center">Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s:any, i:number) => (
                    <tr key={s.id} className={`${i%2===0?"bg-white":"bg-gray-50"} ${!selectedIds.includes(s.id)?"opacity-40":""}`}>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleStudent(s.id)} className="accent-indigo-600" />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">{s.name}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{s.admission_no || "—"}</td>
                      {!isGrade10 && (
                        <td className="px-3 py-2">
                          {nextSections.length > 0 ? (
                            <select value={studentSections[s.id] || ""} onChange={e => setStudentSections(prev => ({ ...prev, [s.id]: e.target.value }))}
                              disabled={!selectedIds.includes(s.id)}
                              className={`border rounded px-2 py-1 text-xs w-full ${!studentSections[s.id] && selectedIds.includes(s.id) ? "border-red-300 bg-red-50" : "border-gray-300"}`}>
                              <option value="">-- Select section --</option>
                              {nextSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                            </select>
                          ) : (
                            <input type="text" value={studentSections[s.id] || ""} placeholder="Enter section"
                              onChange={e => setStudentSections(prev => ({ ...prev, [s.id]: e.target.value.toUpperCase() }))}
                              disabled={!selectedIds.includes(s.id)}
                              className="border border-gray-300 rounded px-2 py-1 text-xs w-full" />
                          )}
                        </td>
                      )}
                      {isGrade10 && (
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">Will Graduate {graduationYear}</span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`border rounded-xl p-4 ${isGrade10 ? "bg-amber-50 border-amber-200" : "bg-yellow-50 border-yellow-200"}`}>
            <p className={`text-sm font-bold mb-1 ${isGrade10 ? "text-amber-800" : "text-yellow-800"}`}>⚠️ Important</p>
            <ul className={`text-xs space-y-1 list-disc ml-4 ${isGrade10 ? "text-amber-700" : "text-yellow-700"}`}>
              {isGrade10 ? (
                <>
                  <li>Selected students will be marked as graduated alumni for {graduationYear}.</li>
                  <li>All their data (baseline, PASA, activities) is permanently preserved.</li>
                  <li>They will no longer appear in active class lists.</li>
                  <li>This cannot be undone from the teacher dashboard.</li>
                </>
              ) : (
                <>
                  <li>Students will be moved to {nextGrade} with their selected sections immediately.</li>
                  <li>All historical data (PA/SA marks, activities, baseline) is preserved.</li>
                  <li>Unselected students remain in {classGrade} · {classSection}.</li>
                  <li>This cannot be undone from the teacher dashboard.</li>
                </>
              )}
            </ul>
          </div>

          <button onClick={isGrade10 ? executeGraduation : executePromotion} disabled={promoting || !selectedIds.length}
            className={`px-6 py-2.5 text-white text-sm rounded-lg font-semibold disabled:opacity-50 ${isGrade10 ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}`}>
            {promoting ? "Processing..." : isGrade10
              ? `🎓 Graduate ${selectedIds.length} Students (${graduationYear})`
              : `✅ Promote ${selectedIds.length} Students to ${nextGrade}`}
          </button>
        </div>
      )}

      {step === "done" && result && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="text-5xl mb-4">{result.type === "graduation" ? "🎓" : "🎉"}</div>
          <h3 className="text-xl font-bold text-green-700 mb-2">
            {result.type === "graduation" ? "Graduation Complete!" : "Promotion Complete!"}
          </h3>
          <p className="text-gray-600">
            {result.promoted} students {result.type === "graduation" ? `graduated (${graduationYear})` : `promoted to ${nextGrade}`}
          </p>
          <button onClick={() => { setStep("preview"); setStudents([]); setResult(null); setMsg(""); }}
            className="mt-4 px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
            ↩ Back
          </button>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// LEARNING RESOURCES TAB — AI resources mapped to teacher's baseline gaps
// ─────────────────────────────────────────────────────────────────
function LearningResourcesTab({ user, academicYear }: any) {
  const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
  const API = "https://cbas-backend-production.up.railway.app";

  const RESOURCE_GRADE: Record<string,string> = {
    foundation:"Grade 2", preparatory:"Grade 5", middle:"Grade 8", secondary:"Grade 10",
  };
  const LIT_DOMAINS = ["Listening","Speaking","Reading","Writing"];
  const NUM_DOMAINS = ["Operations","Base 10","Measurement","Geometry"];

  const [baselineData, setBaselineData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState(0);
  const [resources, setResources] = useState<Record<string,string>>({});
  const [generating, setGenerating] = useState<Record<string,boolean>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchBaseline(); }, [academicYear]);

  const fetchBaseline = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/baseline/teacher/${user.id}?academic_year=${academicYear}`);
      setBaselineData(r.data);
    } catch {}
    setLoading(false);
  };

  const getRoundGaps = (roundIdx: number) => {
    if (!baselineData?.assessments?.length) return [];
    const allRounds = [...baselineData.assessments].sort((a:any,b:any) => a.round > b.round ? 1 : -1);
    const a = allRounds[roundIdx];
    if (!a) return [];
    const gaps: any[] = [];
    const stage = a.stage || "foundation";
    const grade = RESOURCE_GRADE[stage] || "Grade 2";

    if (a.literacy_pct) {
      const litStage = (a.gaps as any)?.lit_stage || a.stage || "foundation";
      const litGrade = RESOURCE_GRADE[litStage] || "Grade 2";
      Object.entries(a.literacy_pct).forEach(([domain, pct]: [string, any]) => {
        if (+pct < 60) gaps.push({ subject:"literacy", domain, score:+pct, stage:litStage, grade:litGrade, round: roundIdx+1 });
      });
    }
    if (a.numeracy_pct) {
      const numStage = (a.gaps as any)?.num_stage || a.stage || "foundation";
      const numGrade = RESOURCE_GRADE[numStage] || "Grade 2";
      Object.entries(a.numeracy_pct).forEach(([domain, pct]: [string, any]) => {
        if (+pct < 60) gaps.push({ subject:"numeracy", domain, score:+pct, stage:numStage, grade:numGrade, round: roundIdx+1 });
      });
    }
    return gaps;
  };

  const generateResources = async (gap: any) => {
    const key = `${gap.subject}_${gap.domain}_${selectedRound}`;
    if (resources[key]) return; // already cached
    setGenerating(p => ({ ...p, [key]: true }));
    try {
      const compRes = await axios.get(`${API}/activities/competencies?subject=${gap.subject}&grade=${encodeURIComponent(gap.grade)}`);
      const allComps = compRes.data?.competencies || compRes.data || [];
      const filtered = allComps.filter((c: any) => {
        const d = (c.domain || c.name || "").toLowerCase();
        return d.includes(gap.domain.toLowerCase()) || gap.domain.toLowerCase().includes(d.split(" ")[0]);
      }).slice(0, 5);
      const compList = filtered.map((c: any) => `- ${c.code || ""}: ${c.name || c.description || ""}`).join("\n");

      const prompt = `You are an expert educational resource curator for teacher professional development in India.

Teacher gap area:
- Subject: ${gap.subject} — ${gap.domain}
- Stage: ${gap.stage} | Target Grade: ${gap.grade}
- Current Score: ${gap.score.toFixed(0)}%

Competencies in this area:
${compList || "General competencies for " + gap.domain}

For EACH competency provide:
1. ONE TEXT resource (article/guide) — Title, real URL, 1-sentence relevance
2. ONE VIDEO resource (YouTube/Khan Academy) — Title, real URL, 1-sentence relevance

Use sources: readingrockets.org, edutopia.org, ncert.nic.in, khanacademy.org, mathigon.org, nrich.maths.org

Format exactly:
## [COMPETENCY_CODE or SHORT_NAME]
📄 TEXT: [Title] — [URL]
   ↳ [How it helps the teacher]
🎥 VIDEO: [Title] — [URL]
   ↳ [How it helps]`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], max_tokens: 1500, temperature: 0.5 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResources(p => ({ ...p, [key]: `⚠️ GROQ Error ${res.status}: ${data.error?.message || JSON.stringify(data)}` }));
      } else {
        const result = data.choices?.[0]?.message?.content || "Could not generate resources.";
        setResources(p => ({ ...p, [key]: result }));
      }
    } catch(e:any) { setResources(p => ({ ...p, [key]: `⚠️ Generation failed: ${e.message}` })); }
    setGenerating(p => ({ ...p, [key]: false }));
  };

  const downloadResource = (content: string, domain: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Resources_${domain.replace(" ","_")}_${new Date().toISOString().slice(0,10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Loading baseline data...</div>;

  if (!baselineData?.assessments?.length) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
        <p className="text-2xl mb-2">📊</p>
        <p className="text-sm">No baseline assessment found for {academicYear}. Your assessment needs to be completed first.</p>
      </div>
    );
  }

  // Get available rounds
  const roundNums = [...new Set(baselineData.assessments.map((a: any) => a.round_number || 1))].sort() as number[];
  const gaps = getRoundGaps(selectedRound);

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <h2 className="text-sm font-bold text-purple-800 mb-1">📚 Learning Resources</h2>
        <p className="text-xs text-purple-600">AI-generated resources mapped to your baseline gap competencies. Resources are cached once generated.</p>
      </div>

      {/* Round selector */}
      <div className="bg-white rounded-xl shadow p-3 flex gap-3 items-center flex-wrap">
        <label className="text-xs text-gray-500">Assessment Round:</label>
        {roundNums.map((rn, i) => (
          <button key={rn} onClick={() => setSelectedRound(i)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium ${selectedRound === i ? "bg-purple-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-purple-50"}`}>
            Round {rn}
          </button>
        ))}
      </div>

      {gaps.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm font-medium text-green-700">No gap areas in this round! All domains above average.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white rounded-xl shadow p-3">
            <p className="text-xs font-bold text-gray-700">{gaps.length} Gap Areas in Round {roundNums[selectedRound]}</p>
            <p className="text-xs text-gray-500 mt-0.5">Domains where you scored below your subject average. Click "Generate Resources" to load AI-curated materials.</p>
          </div>
          {gaps.map((gap: any) => {
            const key = `${gap.subject}_${gap.domain}_${selectedRound}`;
            const isGenerating = generating[key];
            const result = resources[key];
            const isLit = gap.subject === "literacy";
            return (
              <div key={key} className="bg-white rounded-xl shadow overflow-hidden">
                <div className={`px-4 py-3 flex items-center justify-between flex-wrap gap-2 ${isLit ? "bg-blue-700" : "bg-purple-700"} text-white`}>
                  <div>
                    <span className="text-sm font-bold">{isLit ? "📖" : "🔢"} {gap.subject === "literacy" ? "Literacy" : "Numeracy"} — {gap.domain}</span>
                    <span className="text-xs ml-2 opacity-75">Score: {gap.score.toFixed(0)}% · {gap.stage} · {gap.grade}</span>
                  </div>
                  {!result && (
                    <button onClick={() => generateResources(gap)} disabled={isGenerating}
                      className="px-3 py-1.5 bg-white text-indigo-700 text-xs rounded font-medium hover:bg-indigo-50 disabled:opacity-50">
                      {isGenerating ? "Loading..." : "🔍 Generate Resources"}
                    </button>
                  )}
                  {result && !result.startsWith("⚠️") && (
                    <button onClick={() => downloadResource(result, gap.domain)}
                      className="px-3 py-1.5 bg-white text-indigo-700 text-xs rounded font-medium hover:bg-indigo-50">
                      📥 Download
                    </button>
                  )}
                </div>
                {result && (
                  <div className="p-4">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
                  </div>
                )}
                {isGenerating && (
                  <div className="p-4 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-1"></div>
                    <p className="text-xs text-gray-400">Loading resources for {gap.domain}...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HomeworkTab({ user, mappings, academicYear }: any) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [gapSource, setGapSource] = useState<"baseline" | "pasa" | "activities">("baseline");
  const [questionType, setQuestionType] = useState<"MCQ" | "Short" | "Fill" | "Mixed">("Mixed");
  const [numQuestions, setNumQuestions] = useState(10);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [studentList, setStudentList] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Build subject list from mappings
  useEffect(() => {
    if (mappings?.mappings?.length) {
      const subs = [...new Set(mappings.mappings.map((m: any) => m.subject))] as string[];
      setSubjects(subs);
      if (subs.length) setSubject(subs[0]);
      setGrade(mappings.mappings[0]?.grade || "");
    }
  }, [mappings]);

  // Load students when grade/subject changes
  useEffect(() => {
    if (!grade) return;
    const fetchStudents = async () => {
      try {
        const r = await axios.get(`${API}/students?limit=2000`);
        const st = r.data?.data || r.data || [];
        const names = st.filter((s: any) => s.current_class === grade).map((s: any) => s.name).filter(Boolean).sort();
        setStudentList(names);
      } catch { }
    };
    fetchStudents();
  }, [grade]);

  const toggleStudent = (name: string) => {
    setSelectedStudents(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const generate = async () => {
    if (!selectedStudents.length) { setError("Select at least one student."); return; }
    if (!subject) { setError("Select a subject."); return; }
    setError(""); setGenerating(true); setOutput("");

    const studentNames = selectedStudents.join(", ");
    const prompt = `You are an expert teacher creating personalized homework for students.

Students: ${studentNames}
Grade: ${grade}
Subject: ${subject}
Academic Year: ${academicYear}
Gap Source: ${gapSource} assessment data
Question Type: ${questionType}
Number of Questions: ${numQuestions}

Create ${numQuestions} personalized homework questions for these students based on their ${gapSource} assessment learning gaps in ${subject}.

Requirements:
- Questions should address common learning gaps identified in ${gapSource} assessments
- Mix difficulty: 30% easy (recall), 50% medium (application), 20% hard (analysis)
- Question type: ${questionType === "Mixed" ? "mix of MCQ, Short Answer, and Fill in the Blanks" : questionType}
- Each question must have a clear answer key
- Format clearly with numbered questions and answers at the end

Format:
## Homework — ${subject} (${grade})
### Students: ${studentNames}

**Questions:**
[numbered questions]

**Answer Key:**
[answers]`;

    try {
      const res = await fetch(GROQ_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        setOutput(data.choices[0].message.content);
      } else {
        setError("No response from AI. Check API key.");
      }
    } catch { setError("Failed to connect to AI. Check your network."); }
    setGenerating(false);
  };

  const copyOutput = () => { navigator.clipboard.writeText(output); };

  const downloadOutput = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Homework_${subject}_${grade}_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printOutput = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Homework</title><style>body{font-family:sans-serif;padding:2rem;max-width:800px;margin:0 auto}h2{color:#4338ca}h3{color:#374151}pre{white-space:pre-wrap}</style></head><body><pre>${output}</pre></body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="space-y-4 w-full max-w-4xl">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-800 mb-1">🤖 AI-Powered Homework Generator</h3>
        <p className="text-xs text-indigo-600">Uses Groq LLaMA 3.3 to generate personalized homework based on student assessment gaps.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Configuration */}
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Configuration</h3>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Grade</label>
            <select value={grade} onChange={e => setGrade(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
              {[...new Set(mappings?.mappings?.map((m: any) => m.grade) || [])].map((g: any) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Gap Source</label>
            <div className="flex gap-2">
              {[{ id: "baseline", label: "📈 Baseline" }, { id: "pasa", label: "📊 PA/SA" }, { id: "activities", label: "🎯 Activities" }].map(o => (
                <button key={o.id} onClick={() => setGapSource(o.id as any)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border font-medium ${gapSource === o.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Question Type</label>
            <div className="flex gap-1 flex-wrap">
              {["MCQ", "Short", "Fill", "Mixed"].map(qt => (
                <button key={qt} onClick={() => setQuestionType(qt as any)}
                  className={`px-3 py-1 text-xs rounded-lg border font-medium ${questionType === qt ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300"}`}>
                  {qt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Number of Questions: <strong>{numQuestions}</strong></label>
            <input type="range" min={5} max={30} step={5} value={numQuestions} onChange={e => setNumQuestions(+e.target.value)}
              className="w-full accent-indigo-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>5</span><span>30</span></div>
          </div>
        </div>

        {/* Student selector */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Select Students
            <button onClick={() => setSelectedStudents(studentList)} className="ml-2 text-xs text-indigo-600 hover:underline">All</button>
            <button onClick={() => setSelectedStudents([])} className="ml-2 text-xs text-gray-400 hover:underline">Clear</button>
            <span className="ml-2 text-xs text-gray-400">({selectedStudents.length} selected)</span>
          </h3>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {studentList.map(name => (
              <label key={name} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 ${selectedStudents.includes(name) ? "bg-indigo-50" : ""}`}>
                <input type="checkbox" checked={selectedStudents.includes(name)} onChange={() => toggleStudent(name)} className="accent-indigo-600" />
                <span className="text-xs text-gray-700">{name}</span>
              </label>
            ))}
            {!studentList.length && <p className="text-xs text-gray-400 text-center py-4">Select a grade to load students</p>}
          </div>
        </div>
      </div>

      {/* Generate button */}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
      <button onClick={generate} disabled={generating}
        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all">
        {generating ? "🤖 Generating homework..." : "✨ Generate Homework"}
      </button>

      {/* Output */}
      {output && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Generated Homework</h3>
            <div className="flex gap-2">
              <button onClick={copyOutput} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">📋 Copy</button>
              <button onClick={downloadOutput} className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">⬇️ Download</button>
              <button onClick={printOutput} className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium">🖨️ Print</button>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto border border-gray-200">
            {output}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BASELINE ENTRY TAB — matches Python app structure exactly
// Literacy: Listening, Speaking, Reading, Writing
// Numeracy: Operations, Base 10, Measurement, Geometry
// Unlimited rounds, stage progression, promotion at 80%
// ─────────────────────────────────────────────────────────────────
const LITERACY_DOMAINS = ["Listening", "Speaking", "Reading", "Writing"];
const NUMERACY_DOMAINS = ["Operations", "Base 10", "Measurement", "Geometry"];
const STAGES = ["foundation", "preparatory", "middle", "secondary"];
const STAGE_LABELS: Record<string, string> = { foundation: "Foundation", preparatory: "Preparatory", middle: "Middle", secondary: "Secondary" };
const GRADE_TO_STAGE: Record<string, string> = {
  "Pre-KG": "foundation", "LKG": "foundation", "UKG": "foundation",
  "Grade 1": "foundation", "Grade 2": "foundation",
  "Grade 3": "preparatory", "Grade 4": "preparatory", "Grade 5": "preparatory",
  "Grade 6": "middle", "Grade 7": "middle", "Grade 8": "middle",
  "Grade 9": "secondary", "Grade 10": "secondary",
};

function getLevel(score: number) {
  if (score >= 80) return { label: "Advanced", color: "#059669", bg: "bg-green-100 text-green-800" };
  if (score >= 60) return { label: "Proficient", color: "#0284C7", bg: "bg-blue-100 text-blue-800" };
  if (score >= 40) return { label: "Developing", color: "#D97706", bg: "bg-yellow-100 text-yellow-800" };
  return { label: "Beginning", color: "#DC2626", bg: "bg-red-100 text-red-800" };
}


// ─────────────────────────────────────────────────────────────────
// EXAM CONFIG TAB
// ─────────────────────────────────────────────────────────────────

function BaselineDashTab({ user, mappings, academicYear }: any) {
  const API = "https://cbas-backend-production.up.railway.app";
  const ROUNDS = [
    { value: "baseline_1", label: "Round 1" },
    { value: "baseline_2", label: "Round 2" },
    { value: "baseline_3", label: "Round 3" },
  ];

  const rawCTO = (mappings?.class_teacher_of || user?.class_teacher_of || "").trim();
  const ctoParts = rawCTO.split(' ').filter(Boolean);
  const classGrade = mappings?.class_grade || (ctoParts.length >= 3 ? ctoParts.slice(0,-1).join(' ') : ctoParts.length === 2 ? ctoParts[0] : "");
  const classSection = mappings?.class_section || (ctoParts.length >= 2 ? ctoParts[ctoParts.length-1] : "");
  const myGrades = [...new Set((mappings?.mappings || []).map((m: any) => m.grade).filter(Boolean))] as string[];

  const [dashTab, setDashTab] = useState<"section"|"grade"|"alerts">("section");
  const [round, setRound] = useState("baseline_1");
  const [sectionDash, setSectionDash] = useState<any>(null);
  const [gradeDash, setGradeDash] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const scoreBg = (v: number) => v >= 80 ? "bg-green-100 text-green-800" : v >= 60 ? "bg-blue-100 text-blue-800" : v >= 40 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

  useEffect(() => {
    if (dashTab === "section" && classGrade && classSection) fetchSectionDash();
    if (dashTab === "grade" && classGrade) fetchGradeDash();
    if (dashTab === "alerts") fetchAlerts();
  }, [dashTab, round, classGrade, classSection, academicYear]);

  const fetchSectionDash = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/baseline/section/rounds?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}&academic_year=${academicYear}`);
      setSectionDash(r.data);
    } catch { setSectionDash(null); }
    setLoading(false);
  };

  const fetchGradeDash = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/baseline/dashboard/grade/${encodeURIComponent(classGrade)}?academic_year=${academicYear}&round=${round}`);
      setGradeDash(r.data);
    } catch { setGradeDash(null); }
    setLoading(false);
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/baseline/alerts/students?academic_year=${academicYear}`);
      const all = r.data || [];
      const myGradesLower = myGrades.map(g => g.toLowerCase());
      const filtered = myGrades.length
        ? all.filter((a: any) => myGradesLower.includes((a.grade||"").toLowerCase()))
        : all;
      setAlerts(filtered);
    } catch { setAlerts([]); }
    setLoading(false);
  };

  const DASH_TABS = [
    { id: "section", label: "🏫 My Section" },
    { id: "grade",   label: "📊 My Grade" },
    { id: "alerts",  label: "⚠️ Alerts" },
  ];

  // Compute section stats from rounds data — JSONB aware
  const computeSectionStats = () => {
    if (!sectionDash?.students?.length) return null;
    const students = sectionDash.students;
    const latestRound = sectionDash.rounds?.[sectionDash.rounds.length - 1];
    if (!latestRound) return null;

    const studentStats = students.map((s: any) => {
      const rnd = s.rounds?.find((r: any) => r.round === latestRound);
      if (!rnd?.exists) return null;
      const lit = rnd.literacy_total ? +rnd.literacy_total : null;
      const num = rnd.numeracy_total ? +rnd.numeracy_total : null;
      const overall = rnd.overall ? +rnd.overall : (lit !== null && num !== null ? (lit+num)/2 : lit ?? num ?? null);
      if (overall === null) return null;
      const level = overall >= 80 ? "L4" : overall >= 60 ? "L3" : overall >= 40 ? "L2" : "L1";
      return { name: s.student_name, lit, num, overall, level };
    }).filter(Boolean);

    if (!studentStats.length) return null;
    const avg = (arr: (number|null)[]) => { const v = arr.filter(x => x !== null) as number[]; return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0; };
    const litAvg = avg(studentStats.map((s: any) => s.lit));
    const numAvg = avg(studentStats.map((s: any) => s.num));
    const overallAvg = avg(studentStats.map((s: any) => s.overall));
    const levelDist = { L4:0, L3:0, L2:0, L1:0 } as Record<string,number>;
    studentStats.forEach((s: any) => levelDist[s.level] = (levelDist[s.level]||0)+1);
    return { studentStats, litAvg, numAvg, overallAvg, levelDist, total: studentStats.length };
  };

  const stats = dashTab === "section" ? computeSectionStats() : null;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-4 items-end flex-wrap">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Round</label>
          <select value={round} onChange={e => setRound(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            {ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="text-xs text-gray-500">
          Class: <span className="font-bold text-indigo-700">{classGrade} · {classSection}</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {DASH_TABS.map(t => (
          <button key={t.id} onClick={() => setDashTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium border ${dashTab === t.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">Loading...</div>}

      {/* ── MY SECTION ── */}
      {!loading && dashTab === "section" && (
        <div className="space-y-4">
          {stats ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Students Assessed", value: stats.total, color: "border-indigo-500" },
                  { label: "Literacy Avg", value: `${stats.litAvg.toFixed(1)}%`, color: "border-blue-500" },
                  { label: "Numeracy Avg", value: `${stats.numAvg.toFixed(1)}%`, color: "border-purple-500" },
                  { label: "Overall Avg", value: `${stats.overallAvg.toFixed(1)}%`, color: "border-green-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Level Distribution */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Level Distribution — {classGrade} · {classSection}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "L4", label: "Level 4 – Exceeding", color: "#10b981", bg: "bg-green-50 border-green-200" },
                    { key: "L3", label: "Level 3 – Meeting",   color: "#6366f1", bg: "bg-blue-50 border-blue-200" },
                    { key: "L2", label: "Level 2 – Approaching", color: "#f59e0b", bg: "bg-yellow-50 border-yellow-200" },
                    { key: "L1", label: "Level 1 – Beginning", color: "#ef4444", bg: "bg-red-50 border-red-200" },
                  ].map(l => (
                    <div key={l.key} className={`rounded-xl p-4 text-center border ${l.bg}`}>
                      <p className="text-xs font-medium mb-1" style={{ color: l.color }}>{l.label}</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.levelDist[l.key] || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stats.total > 0 ? (((stats.levelDist[l.key]||0) / stats.total) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student breakdown table */}
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Student Breakdown — {classGrade} · {classSection}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-left">Student</th>
                        <th className="px-3 py-2 text-center">Literacy Avg</th>
                        <th className="px-3 py-2 text-center">Numeracy Avg</th>
                        <th className="px-3 py-2 text-center">Overall Avg</th>
                        <th className="px-3 py-2 text-center">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.studentStats
                        .sort((a: any, b: any) => b.overall - a.overall)
                        .map((s: any, i: number) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 font-medium text-gray-800">{s.name}</td>
                          <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.lit)}`}>{s.lit.toFixed(1)}%</span></td>
                          <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.num)}`}>{s.num.toFixed(1)}%</span></td>
                          <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.overall)}`}>{s.overall.toFixed(1)}%</span></td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.overall)}`}>{s.level}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">
              No baseline data for {classGrade} · {classSection}. Enter baseline data first.
            </div>
          )}
        </div>
      )}

      {/* ── MY GRADE ── */}
      {!loading && dashTab === "grade" && (
        <div className="space-y-4">
          {gradeDash ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Assessed", value: gradeDash.totalAssessed, color: "border-indigo-500" },
                  { label: "Literacy Avg", value: `${gradeDash.literacyAvg}%`, color: "border-blue-500" },
                  { label: "Numeracy Avg", value: `${gradeDash.numeracyAvg}%`, color: "border-purple-500" },
                  { label: "Overall Avg", value: `${gradeDash.overallAvg}%`, color: "border-green-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Section comparison bar chart */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Section-wise Overall Average — {classGrade}</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={(gradeDash.sections || []).map((s: any) => ({ name: s.section, overall: s.overallAvg, lit: s.literacyAvg, num: s.numeracyAvg, atRisk: s.atRisk, count: s.count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any, _, p) => [`${v}% (${p.payload.count} students)`, p.payload.name]} />
                    <Bar dataKey="overall" radius={[4,4,0,0]}>
                      {(gradeDash.sections||[]).map((s: any, i: number) => (
                        <Cell key={i} fill={s.section.toLowerCase() === classSection.toLowerCase() ? "#4f46e5" : s.overallAvg >= 60 ? "#6366f1" : s.overallAvg >= 40 ? "#f59e0b" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-indigo-600 mt-1">Dark bar = your section ({classSection})</p>
              </div>

              {/* Section details table */}
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
                    {(gradeDash.sections||[]).map((s: any, i: number) => (
                      <tr key={s.section} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${s.section.toLowerCase() === classSection.toLowerCase() ? "ring-2 ring-indigo-400" : ""}`}>
                        <td className="px-3 py-2 font-semibold text-gray-800">
                          {s.section} {s.section.toLowerCase() === classSection.toLowerCase() && <span className="text-indigo-600 text-xs ml-1">(My Section)</span>}
                        </td>
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
          ) : (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">
              No baseline data for {classGrade}. Enter student baseline data first.
            </div>
          )}
        </div>
      )}

      {/* ── ALERTS ── */}
      {!loading && dashTab === "alerts" && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-yellow-800 mb-1">⚠️ Consecutive Decline Alert</h3>
            <p className="text-xs text-yellow-600">Students in your sections whose baseline scores declined consecutively.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No consecutive decline alerts in your sections. 🎉</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((a: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{a.entity_name || a.student_name}</p>
                      <p className="text-xs text-gray-500">{a.grade} · {a.section}</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        {(a.scores||[]).map((s: any) => `${s.round}: ${s.overall?.toFixed(1)}%`).join(" → ")}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-600">▼ {a.drop?.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BaselineEntryTab({ user, mappings, academicYear }: any) {
  const API = "https://cbas-backend-production.up.railway.app";
  const GRADE_TO_STAGE: Record<string, string> = {
    "Pre-KG":"foundation","LKG":"foundation","UKG":"foundation",
    "Grade 1":"foundation","Grade 2":"foundation",
    "Grade 3":"preparatory","Grade 4":"preparatory","Grade 5":"preparatory",
    "Grade 6":"middle","Grade 7":"middle","Grade 8":"middle",
    "Grade 9":"secondary","Grade 10":"secondary",
  };

  const classGrade = mappings?.class_grade || (user?.class_teacher_of||"").trim().split(' ').slice(0,-1).join(' ');
  const classSection = mappings?.class_section || (user?.class_teacher_of||"").trim().split(' ').pop();
  const stage = GRADE_TO_STAGE[classGrade] || "foundation";

  const [sectionData, setSectionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [activeRoundIdx, setActiveRoundIdx] = useState(0);
  const [newRoundOpen, setNewRoundOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<string|null>(null);
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);

  // Configurable domains
  const [litDomains, setLitDomains] = useState(["Listening","Speaking","Reading","Writing"]);
  const [numDomains, setNumDomains] = useState(["Operations","Base 10","Measurement","Geometry"]);
  const [newLitDomain, setNewLitDomain] = useState("");
  const [newNumDomain, setNewNumDomain] = useState("");
  const [maxMarks, setMaxMarks] = useState<Record<string,string>>({});
  const [scores, setScores] = useState<Record<string,Record<string,string>>>({});

  // Excel import
  const xlFileRef = useRef<HTMLInputElement>(null);
  const [xlParsing, setXlParsing] = useState(false);

  useEffect(() => { if (classGrade && classSection) fetchRounds(); }, [classGrade, classSection, academicYear]);

  const fetchRounds = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/baseline/section/rounds?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}&academic_year=${academicYear}`);
      setSectionData(r.data);
      setNewRoundOpen(!r.data?.total_rounds);
      setActiveRoundIdx(Math.max(0, (r.data?.total_rounds||1) - 1));
      const students = r.data?.students || [];
      const anyRound = students[0]?.rounds?.find((rnd: any) => rnd.exists);
      if (anyRound) {
        if (anyRound.literacy_scores && Object.keys(anyRound.literacy_scores).length) setLitDomains(Object.keys(anyRound.literacy_scores));
        if (anyRound.numeracy_scores && Object.keys(anyRound.numeracy_scores).length) setNumDomains(Object.keys(anyRound.numeracy_scores));
        if (anyRound.max_marks) {
          const mm: Record<string,string> = {};
          Object.entries(anyRound.max_marks).forEach(([d,v]) => { mm[d] = String(v); });
          setMaxMarks(mm);
        }
      }
    } catch { setSectionData(null); }
    setLoading(false);
  };

  const getLvl = (s: number) => s >= 80 ? {label:"Exceeding",bg:"bg-green-100 text-green-800"} : s >= 60 ? {label:"Meeting",bg:"bg-blue-100 text-blue-800"} : s >= 40 ? {label:"Approaching",bg:"bg-yellow-100 text-yellow-800"} : {label:"Beginning",bg:"bg-red-100 text-red-800"};

  const calcPct = (domain: string, raw: string) => {
    const v = parseFloat(raw); if (isNaN(v) || v < 0) return null;
    if (v === 0) return 0;
    const max = parseFloat(maxMarks[domain]||"0");
    const pct = max > 0 ? (v/max)*100 : v;
    return Math.min(100, pct);
  };

  const calcAvgPct = (studentId: string, domains: string[]) => {
    const sc = scores[studentId] || {};
    const vals = domains.map(d => calcPct(d, sc[d]||"")).filter(v => v !== null) as number[];
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  };

  const scoreCellBg = (val: string, domain: string) => {
    const raw = parseFloat(val);
    if (isNaN(raw) || val === "") return "border-gray-200";
    const max = parseFloat(maxMarks[domain]||"0");
    if (max > 0 && raw > max) return "border-orange-500 bg-orange-50"; // exceeds max — data entry error
    const pct = max > 0 ? (raw/max)*100 : raw;
    if (pct >= 80) return "border-green-400 bg-green-50";
    if (pct >= 60) return "border-blue-300 bg-blue-50";
    if (pct >= 40) return "border-yellow-400 bg-yellow-50";
    return "border-red-400 bg-red-50";
  };

  const initScoresForRound = (roundKey?: string) => {
    const newScores: Record<string,Record<string,string>> = {};
    (sectionData?.students||[]).forEach((s: any) => {
      if (roundKey) {
        const rnd = s.rounds?.find((r: any) => r.round === roundKey);
        if (rnd?.exists) {
          const sc: Record<string,string> = {};
          if (rnd.literacy_scores) Object.entries(rnd.literacy_scores).forEach(([d,v]) => { sc[d] = String(v); });
          if (rnd.numeracy_scores) Object.entries(rnd.numeracy_scores).forEach(([d,v]) => { sc[d] = String(v); });
          if (rnd.literacy_scores && Object.keys(rnd.literacy_scores).length) setLitDomains(Object.keys(rnd.literacy_scores));
          if (rnd.numeracy_scores && Object.keys(rnd.numeracy_scores).length) setNumDomains(Object.keys(rnd.numeracy_scores));
          if (rnd.max_marks) {
            const mm: Record<string,string> = {};
            Object.entries(rnd.max_marks).forEach(([d,v]) => { mm[d] = String(v); });
            setMaxMarks(mm);
          }
          newScores[s.student_id] = sc;
          return;
        }
      }
      newScores[s.student_id] = {};
    });
    setScores(newScores);
  };

  const saveRound = async (roundKey: string) => {
    setSaving(true);
    try {
      const entries = (sectionData?.students||[]).map((s: any) => {
        const sc = scores[s.student_id] || {};
        const litScores: Record<string,number> = {};
        const numScores: Record<string,number> = {};
        const mm: Record<string,number> = {};
        litDomains.forEach(d => { const v = parseFloat(sc[d]||""); if (!isNaN(v)) { litScores[d] = v; mm[d] = parseFloat(maxMarks[d]||"0")||0; } });
        numDomains.forEach(d => { const v = parseFloat(sc[d]||""); if (!isNaN(v)) { numScores[d] = v; mm[d] = parseFloat(maxMarks[d]||"0")||0; } });
        const hasAny = Object.keys(litScores).length > 0 || Object.keys(numScores).length > 0;
        if (!hasAny) return null;
        return { student_id: s.student_id, student_name: s.student_name, literacy_scores: litScores, numeracy_scores: numScores, max_marks: mm };
      }).filter(Boolean);
      if (!entries.length) { setMsg("❌ No scores entered to save"); setSaving(false); setTimeout(()=>setMsg(""),3000); return; }
      await axios.post(`${API}/baseline/section/round`, {
        grade: classGrade, section: classSection, academic_year: academicYear,
        round: roundKey, stage, assessment_date: assessmentDate, entries,
      });
      setMsg(`✅ Round saved — ${entries.length} students`); fetchRounds(); setNewRoundOpen(false); setEditingRound(null);
    } catch { setMsg("❌ Error saving"); }
    setSaving(false); setTimeout(() => setMsg(""), 3000);
  };

  const handleXlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlParsing(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const students = sectionData?.students || [];

      let targetSheet = wb.SheetNames[0];
      const gradeNums: Record<string,string> = {"1":"Grade 1","2":"Grade 2","3":"Grade 3","4":"Grade 4","5":"Grade 5","6":"Grade 6","7":"Grade 7","8":"Grade 8","9":"Grade 9","10":"Grade 10"};
      for (const sn of wb.SheetNames) {
        const m = sn.trim().match(/[Gg](\d{1,2})\s+(.+)/);
        if (m && gradeNums[m[1]]?.toLowerCase() === classGrade.toLowerCase()) { targetSheet = sn; break; }
      }

      const ws = wb.Sheets[targetSheet];
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header:1, defval:null });
      if (rows.length < 2) { setMsg("❌ No data in Excel"); setXlParsing(false); return; }

      let hdrIdx = 1;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        if (rows[i]?.some((c:any) => typeof c === "string" && c.toLowerCase().includes("listen"))) { hdrIdx = i; break; }
      }
      const hdr = rows[hdrIdx] || [];
      const grpRow = rows[0] || [];
      let litStart = -1, numStart = -1;
      grpRow.forEach((c:any, ci:number) => {
        if (typeof c === "string") {
          if (c.toLowerCase().includes("literacy")) litStart = ci;
          if (c.toLowerCase().includes("numeracy")) numStart = ci;
        }
      });
      const litCols: Array<{name:string;col:number}> = [];
      const numCols: Array<{name:string;col:number}> = [];
      hdr.forEach((c:any, ci:number) => {
        if (!c || typeof c !== "string" || ci === 0) return;
        const clean = c.trim().replace(/\s*\([^)]*\)/g,"").replace(/\d+marks?/gi,"").trim();
        if (!clean) return;
        if (numStart > 0 && ci >= numStart) { if (!clean.toLowerCase().includes("student")) numCols.push({name:clean,col:ci}); }
        else if (litStart >= 0 && ci >= litStart) { if (!clean.toLowerCase().includes("student")) litCols.push({name:clean,col:ci}); }
        else {
          const l = clean.toLowerCase();
          if (l.includes("listen")||l.includes("speak")||l.includes("read")||l.includes("writ")) litCols.push({name:clean,col:ci});
          else if (l.includes("operat")||l.includes("base")||l.includes("measur")||l.includes("geom")) numCols.push({name:clean,col:ci});
        }
      });

      if (litCols.length) setLitDomains(litCols.map(c=>c.name));
      if (numCols.length) setNumDomains(numCols.map(c=>c.name));

      const parseVal = (raw:any) => {
        if (raw===null||raw===undefined) return null;
        const s = String(raw).trim().toLowerCase();
        if (!s||s==="ab"||s==="abs"||s==="absent"||s==="-") return null;
        const n = parseFloat(s); return isNaN(n)?null:n;
      };

      const newScores = {...scores};
      let matched = 0;
      for (let i = hdrIdx+1; i < rows.length; i++) {
        const row = rows[i];
        if (!row||!row[0]) continue;
        const excelName = String(row[0]).trim().toUpperCase().replace(/\s+/g," ");
        if (!excelName||excelName==="TOTAL"||excelName==="AVERAGE") continue;
        const match = students.find((s:any) => {
          const dbName = s.student_name.toUpperCase().replace(/\s+/g," ");
          return dbName===excelName || dbName.split(" ").sort().join(" ")===excelName.split(" ").sort().join(" ");
        });
        if (!match) continue;
        const sc: Record<string,string> = {};
        [...litCols,...numCols].forEach(({name:d,col}) => { const v=parseVal(row[col]); if(v!==null) sc[d]=String(v); });
        newScores[match.student_id] = sc;
        matched++;
      }
      setScores(newScores);
      setMsg(`✅ Excel imported — ${matched} students matched`);
    } catch (err:any) { setMsg("❌ Excel import failed: "+err.message); }
    setXlParsing(false);
    if (xlFileRef.current) xlFileRef.current.value = "";
    setTimeout(()=>setMsg(""),4000);
  };

  if (!classGrade || !classSection) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No class assigned. Only class teachers can enter baseline data.</div>;
  if (loading) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Loading...</div>;

  const rounds = sectionData?.rounds || [];
  const students = sectionData?.students || [];
  const nextRound = `baseline_${rounds.length + 1}`;
  const allDomains = [...litDomains, ...numDomains];
  const isEntryOpen = newRoundOpen || !!editingRound;
  const activeRoundKey = editingRound || nextRound;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-indigo-800">{classGrade} — {classSection}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Stage: {stage.charAt(0).toUpperCase()+stage.slice(1)} · {students.length} students · {rounds.length} round(s) completed</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={xlFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlUpload} />
          <button onClick={() => xlFileRef.current?.click()} disabled={xlParsing}
            className="px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center gap-1.5">
            {xlParsing ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"/>Parsing...</> : "📂 Import Excel"}
          </button>
          <button onClick={() => { setNewRoundOpen(true); setEditingRound(null); initScoresForRound(); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
            + New Round
          </button>
        </div>
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅")?"bg-green-50 border-green-300 text-green-800":"bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* Domain configuration */}
      <div className="bg-white rounded-xl shadow border border-indigo-100 p-4">
        <h3 className="text-xs font-bold text-indigo-800 mb-3">⚙️ Domain Configuration — {classGrade} · {classSection}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-2">📚 Literacy Domains</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {litDomains.map((d, i) => (
                <span key={d} className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                  {d}
                  <button onClick={() => setLitDomains(prev => prev.filter((_,j) => j !== i))} className="text-blue-400 hover:text-red-500 ml-0.5">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input value={newLitDomain} onChange={e => setNewLitDomain(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter"&&newLitDomain.trim()){setLitDomains(p=>[...p,newLitDomain.trim()]);setNewLitDomain("");}}}
                placeholder="Add domain (Enter)" className="border border-gray-300 rounded px-2 py-1 text-xs flex-1" />
              <button onClick={() => {if(newLitDomain.trim()){setLitDomains(p=>[...p,newLitDomain.trim()]);setNewLitDomain("");}}}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded">+</button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-700 mb-2">🔢 Numeracy Domains</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {numDomains.map((d, i) => (
                <span key={d} className="flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                  {d}
                  <button onClick={() => setNumDomains(prev => prev.filter((_,j) => j !== i))} className="text-purple-400 hover:text-red-500 ml-0.5">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input value={newNumDomain} onChange={e => setNewNumDomain(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter"&&newNumDomain.trim()){setNumDomains(p=>[...p,newNumDomain.trim()]);setNewNumDomain("");}}}
                placeholder="Add domain (Enter)" className="border border-gray-300 rounded px-2 py-1 text-xs flex-1" />
              <button onClick={() => {if(newNumDomain.trim()){setNumDomains(p=>[...p,newNumDomain.trim()]);setNewNumDomain("");}}}
                className="px-2 py-1 bg-purple-600 text-white text-xs rounded">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Round tabs */}
      {rounds.length > 0 && (
        <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
          {rounds.map((rk: string, i: number) => (
            <button key={rk} onClick={() => { setActiveRoundIdx(i); setNewRoundOpen(false); setEditingRound(null); }}
              className={`px-4 py-2 text-sm rounded-lg font-medium border ${activeRoundIdx===i && !isEntryOpen?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300"}`}>
              Round {i+1}
            </button>
          ))}
        </div>
      )}

      {/* Entry form (new round or editing existing) */}
      {isEntryOpen && (
        <div className="bg-white rounded-xl shadow border border-indigo-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-200 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-indigo-800">
              {editingRound ? `✏️ Editing Round ${rounds.indexOf(editingRound)+1}` : `+ Round ${rounds.length+1}`} — {classGrade} {classSection}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">Date:</label>
                <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <button onClick={() => saveRound(activeRoundKey)} disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                {saving ? "Saving..." : "💾 Save"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth:`${300+(litDomains.length+numDomains.length)*75+220}px` }}>
              <thead>
                <tr className="bg-indigo-700 text-white">
                  <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[180px]">Student</th>
                  {litDomains.map(d => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[75px] bg-blue-700">{d}</th>)}
                  <th className="px-2 py-2 text-center border-l border-indigo-500 bg-blue-800 min-w-[60px]">Lit%</th>
                  {numDomains.map(d => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[75px] bg-purple-700">{d}</th>)}
                  <th className="px-2 py-2 text-center border-l border-indigo-500 bg-purple-800 min-w-[60px]">Num%</th>
                  <th className="px-2 py-2 text-center border-l border-indigo-500 min-w-[65px]">Overall</th>
                  <th className="px-2 py-2 text-center min-w-[65px]">Level</th>
                  <th className="px-2 py-2 text-left min-w-[120px]">Gaps</th>
                </tr>
                <tr className="bg-amber-50 border-b-2 border-amber-300">
                  <td className="px-3 py-1 text-xs font-bold text-amber-800 sticky left-0 bg-amber-50">📐 Max Marks</td>
                  {litDomains.map(d => (
                    <td key={`litmax-${d}`} className="px-1 py-1 text-center border-l border-amber-200">
                      <input type="number" min={1} step={1} value={maxMarks[d]||""} placeholder="max"
                        onChange={e => setMaxMarks(p => ({...p,[d]:e.target.value}))}
                        className="w-14 text-center text-xs border border-amber-300 bg-amber-50 rounded px-1 py-0.5 font-bold text-amber-800" />
                    </td>
                  ))}
                  <td className="px-1 py-1 text-center text-xs text-amber-400 border-l border-amber-200">—</td>
                  {numDomains.map(d => (
                    <td key={`nummax-${d}`} className="px-1 py-1 text-center border-l border-amber-200">
                      <input type="number" min={1} step={1} value={maxMarks[d]||""} placeholder="max"
                        onChange={e => setMaxMarks(p => ({...p,[d]:e.target.value}))}
                        className="w-14 text-center text-xs border border-amber-300 bg-amber-50 rounded px-1 py-0.5 font-bold text-amber-800" />
                    </td>
                  ))}
                  <td className="px-1 py-1 text-center text-xs text-amber-400 border-l border-amber-200">—</td>
                  <td className="px-1 py-1 text-center text-xs text-amber-400 border-l border-amber-200">—</td>
                  <td className="px-1 py-1 text-center text-xs text-amber-400">—</td>
                  <td className="px-1 py-1 text-xs text-amber-400 italic">Enter max per domain</td>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any, i: number) => {
                  const sc = scores[s.student_id] || {};
                  const litAvg = calcAvgPct(s.student_id, litDomains);
                  const numAvg = calcAvgPct(s.student_id, numDomains);
                  const overall = litAvg !== null && numAvg !== null ? (litAvg+numAvg)/2 : litAvg ?? numAvg;
                  const bg = i%2===0?"bg-white":"bg-gray-50";
                  const gaps: string[] = [];
                  allDomains.forEach(d => {
                    const raw = parseFloat(sc[d]||"");
                    const max = parseFloat(maxMarks[d]||"0");
                    if (!isNaN(raw) && raw >= 0) { const pct = max > 0 ? (raw/max)*100 : raw; if (pct < 60) gaps.push(d); }
                  });
                  return (
                    <tr key={s.student_id} className={`border-b border-gray-100 ${bg}`}>
                      <td className={`px-3 py-1.5 font-medium text-gray-800 sticky left-0 bg-inherit border-r border-gray-200`}>{s.student_name}</td>
                      {litDomains.map(d => (
                        <td key={d} className="px-1 py-1 text-center border-l border-gray-100">
                          <input type="number" min={0} step={0.5} value={sc[d]??""} placeholder="—"
                            onChange={e => setScores(p => ({...p,[s.student_id]:{...(p[s.student_id]||{}),[d]:e.target.value}}))}
                            className={`w-14 text-center text-xs border rounded px-1 py-0.5 ${scoreCellBg(sc[d]||"",d)}`} />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center border-l border-gray-200">
                        {litAvg!==null?<span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(litAvg).bg}`}>{litAvg.toFixed(1)}%</span>:<span className="text-gray-300">—</span>}
                      </td>
                      {numDomains.map(d => (
                        <td key={d} className="px-1 py-1 text-center border-l border-gray-100">
                          <input type="number" min={0} step={0.5} value={sc[d]??""} placeholder="—"
                            onChange={e => setScores(p => ({...p,[s.student_id]:{...(p[s.student_id]||{}),[d]:e.target.value}}))}
                            className={`w-14 text-center text-xs border rounded px-1 py-0.5 ${scoreCellBg(sc[d]||"",d)}`} />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center border-l border-gray-200">
                        {numAvg!==null?<span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(numAvg).bg}`}>{numAvg.toFixed(1)}%</span>:<span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-2 py-1.5 text-center border-l border-gray-200">
                        {overall!==null?<span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(overall).bg}`}>{overall.toFixed(1)}%</span>:<span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {overall!==null?<span className={`text-xs px-1.5 py-0.5 rounded ${getLvl(overall).bg}`}>{getLvl(overall).label}</span>:<span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-2 py-1.5">
                        {gaps.length>0
                          ? <div className="flex flex-wrap gap-1">{gaps.map(g=><span key={g} className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">⚠️ {g}</span>)}</div>
                          : overall!==null?<span className="text-xs text-green-600">✅ No gaps</span>:null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Previous round view (read-only with Edit button) */}
      {!isEntryOpen && rounds.length > 0 && (() => {
        const roundKey = rounds[activeRoundIdx];
        const rndLitDomains = new Set<string>();
        const rndNumDomains = new Set<string>();
        students.forEach((s: any) => {
          const rnd = s.rounds?.find((r: any) => r.round === roundKey);
          if (rnd?.exists) {
            Object.keys(rnd.literacy_scores||{}).forEach((d:string) => rndLitDomains.add(d));
            Object.keys(rnd.numeracy_scores||{}).forEach((d:string) => rndNumDomains.add(d));
          }
        });
        const litD = rndLitDomains.size ? [...rndLitDomains] : litDomains;
        const numD = rndNumDomains.size ? [...rndNumDomains] : numDomains;

        return (
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">Round {activeRoundIdx+1} Results — {classGrade} {classSection}</h3>
              <button onClick={() => { setEditingRound(roundKey); setNewRoundOpen(false); initScoresForRound(roundKey); }}
                className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs rounded-lg hover:bg-indigo-200 font-medium border border-indigo-200">
                ✏️ Edit Round
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" style={{ minWidth:`${300+(litD.length+numD.length)*70}px` }}>
                <thead>
                  <tr className="bg-indigo-700 text-white">
                    <th className="px-3 py-2 text-left min-w-[180px]">Student</th>
                    {litD.map(d => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600 bg-blue-700">{d.substring(0,6)}</th>)}
                    <th className="px-2 py-2 text-center border-l border-indigo-500 bg-blue-800">Lit%</th>
                    {numD.map(d => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600 bg-purple-700">{d.substring(0,6)}</th>)}
                    <th className="px-2 py-2 text-center border-l border-indigo-500 bg-purple-800">Num%</th>
                    <th className="px-2 py-2 text-center border-l border-indigo-500">Overall</th>
                    <th className="px-2 py-2 text-center">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s: any, i: number) => {
                    const rnd = s.rounds?.find((r: any) => r.round === roundKey);
                    if (!rnd?.exists) return (
                      <tr key={s.student_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                        <td className="px-3 py-2 text-gray-400">{s.student_name}</td>
                        <td colSpan={litD.length+numD.length+3} className="px-2 py-2 text-gray-300 text-center">No data</td>
                      </tr>
                    );
                    const litPct = rnd.literacy_pct || {};
                    const numPct = rnd.numeracy_pct || {};
                    const litAvg = rnd.literacy_total ? +rnd.literacy_total : null;
                    const numAvg = rnd.numeracy_total ? +rnd.numeracy_total : null;
                    const overall = rnd.overall ? +rnd.overall : null;
                    return (
                      <tr key={s.student_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                        <td className="px-3 py-2 font-medium text-gray-800">{s.student_name}</td>
                        {litD.map(d => (
                          <td key={d} className="px-2 py-2 text-center border-l border-gray-100">
                            <span className="text-gray-700">{rnd.literacy_scores?.[d]??<span className="text-gray-300">—</span>}</span>
                            {litPct[d]!==undefined && <span className="text-gray-400 ml-1">({litPct[d].toFixed(0)}%)</span>}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center border-l border-gray-200">
                          {litAvg!==null?<span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(litAvg).bg}`}>{litAvg.toFixed(1)}%</span>:<span className="text-gray-300">—</span>}
                        </td>
                        {numD.map(d => (
                          <td key={d} className="px-2 py-2 text-center border-l border-gray-100">
                            <span className="text-gray-700">{rnd.numeracy_scores?.[d]??<span className="text-gray-300">—</span>}</span>
                            {numPct[d]!==undefined && <span className="text-gray-400 ml-1">({numPct[d].toFixed(0)}%)</span>}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center border-l border-gray-200">
                          {numAvg!==null?<span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(numAvg).bg}`}>{numAvg.toFixed(1)}%</span>:<span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {overall!==null?<span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(overall).bg}`}>{overall.toFixed(1)}%</span>:<span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {overall!==null?<span className={`text-xs px-1.5 py-0.5 rounded ${getLvl(overall).bg}`}>{getLvl(overall).label}</span>:<span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
