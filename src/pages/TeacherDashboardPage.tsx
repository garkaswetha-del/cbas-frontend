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
  const [activeTab, setActiveTab] = useState<"students" | "classview" | "pasa" | "examconfig" | "activities" | "baseline_entry" | "baseline_dash" | "student_ai" | "alerts" | "promotion" | "profile" | "self_baseline" | "appraisal" | "self_ai" | "homework">("students");
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
    { id: "examconfig",     label: "⚙️ Exam Config",       show: isClassTeacher },
    { id: "pasa",           label: "✏️ PA/SA Marks",       show: true },
    { id: "baseline_entry", label: "📊 Baseline Entry",    show: isClassTeacher },
    { id: "baseline_dash",  label: "📈 Baseline Dashboard", show: true },
    { id: "activities",     label: "🎯 Activities",        show: true },
    { id: "student_ai",     label: "🤖 Student AI",        show: true },
    { id: "alerts",         label: "⚠️ Alerts",            show: true },
    { id: "promotion",      label: "🎓 Promotion",         show: isClassTeacher },
  ];

  const SELF_TABS = [
    { id: "profile",        label: "👤 My Profile",       show: true },
    { id: "self_baseline",  label: "📈 My Baseline",      show: true },
    { id: "appraisal",      label: "📋 My Appraisal",     show: true },
    { id: "self_ai",        label: "🤖 AI Learning",      show: true },
    { id: "homework",       label: "📝 AI Homework Gen",  show: true },
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
      {activeTab === "examconfig"     && <ExamConfigTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "pasa"           && <PASATab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "baseline_entry" && <BaselineEntryTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "baseline_dash"  && <BaselineDashTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "activities"     && <ActivitiesTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "student_ai"     && <StudentAITab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "alerts"         && <AlertsTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "promotion"      && <PromotionTab user={user} mappings={mappings} />}

      {/* Self Management tabs */}
      {activeTab === "profile"        && <ProfileTab user={user} />}
      {activeTab === "self_baseline"  && <BaselineTab user={user} academicYear={academicYear} />}
      {activeTab === "appraisal"      && <AppraisalTab user={user} academicYear={academicYear} />}
      {activeTab === "self_ai"        && <SelfAITab user={user} academicYear={academicYear} />}
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
  const LIT_DOMAINS = ["listening_score","speaking_score","reading_score","writing_score"];
  const NUM_DOMAINS = ["operations_score","base10_score","measurement_score","geometry_score"];
  const LIT_LABELS  = ["Listening","Speaking","Reading","Writing"];
  const NUM_LABELS  = ["Operations","Base 10","Measurement","Geometry"];
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

  // Group by subject
  const litRounds = assessments.filter((a:any) => a.subject === "literacy").sort((a:any,b:any) => a.round > b.round ? 1 : -1);
  const numRounds = assessments.filter((a:any) => a.subject === "numeracy").sort((a:any,b:any) => a.round > b.round ? 1 : -1);

  const hasLit = litRounds.length > 0;
  const hasNum = numRounds.length > 0;

  // Latest per subject
  const latestLit = litRounds[litRounds.length - 1];
  const latestNum = numRounds[numRounds.length - 1];

  const litAvg = latestLit ? (LIT_DOMAINS.reduce((s,d) => s + +(latestLit[d]||0),0)/LIT_DOMAINS.length) : null;
  const numAvg = latestNum ? (NUM_DOMAINS.reduce((s,d) => s + +(latestNum[d]||0),0)/NUM_DOMAINS.length) : null;
  const overall = litAvg !== null && numAvg !== null ? (litAvg+numAvg)/2 : (litAvg ?? numAvg ?? 0);

  const litStage = latestLit?.stage || "foundation";
  const numStage = latestNum?.stage || "foundation";
  const litGrade = STAGE_GRADE[litStage];
  const numGrade = STAGE_GRADE[numStage];

  // Gaps = domains below subject avg
  const litGaps = hasLit ? LIT_DOMAINS.filter(d => litAvg !== null && +(latestLit[d]||0) < litAvg).map((d,i) => LIT_LABELS[LIT_DOMAINS.indexOf(d)]) : [];
  const numGaps = hasNum ? NUM_DOMAINS.filter(d => numAvg !== null && +(latestNum[d]||0) < numAvg).map((d,i) => NUM_LABELS[NUM_DOMAINS.indexOf(d)]) : [];

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

  // Chart data for a subject: one point per round
  const buildTrendData = (rounds: any[], domains: string[], labels: string[]) =>
    rounds.map((r:any, i:number) => {
      const obj: any = { name: `R${i+1}`, round: r.round };
      labels.forEach((l,j) => { obj[l] = +(r[domains[j]]||0); });
      const vals = domains.map(d => +(r[d]||0)).filter(v=>v>0);
      obj["Avg"] = vals.length ? +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : 0;
      return obj;
    });

  const litTrend = buildTrendData(litRounds, LIT_DOMAINS, LIT_LABELS);
  const numTrend = buildTrendData(numRounds, NUM_DOMAINS, NUM_LABELS);

  const litStageGroups = getStageGroups(litRounds, LIT_DOMAINS);
  const numStageGroups = getStageGroups(numRounds, NUM_DOMAINS);

  const scoreBadge = (v: number) => v >= 80 ? "bg-green-100 text-green-800" : v >= 60 ? "bg-blue-100 text-blue-800" : v >= 40 ? "bg-yellow-100 text-yellow-800" : v > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-400";

  const SubjectCharts = ({ rounds, trend, domains, labels, stageGroups, subj }: any) => {
    if (!rounds.length) return null;
    const latest = rounds[rounds.length-1];
    const avg = domains.reduce((s:number,d:string)=>s + Number(latest[d]||0),0)/domains.length;
    const promoted = latest?.promoted;
    const promotedTo = latest?.promoted_to_stage;

    return (
      <div className="space-y-4">
        {/* Stage journey */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500 font-medium">Stage Journey:</span>
          {STAGE_ORDER.map((s,i) => {
            const hasStage = !!stageGroups[s];
            const isCurrentStage = (latest?.stage || "foundation") === s;
            const wasPromoted = rounds.some((r:any) => r.stage === s && r.promoted);
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
              <p className="text-xs text-green-600">Promoted to <strong>{promotedTo}</strong> stage · Grade: {STAGE_GRADE[promotedTo?.toLowerCase()||"foundation"]}</p>
            </div>
          </div>
        )}

        {/* Domain scores — latest round */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-xs font-bold text-gray-600 mb-3">Latest Round — {STAGE_LABELS[latest?.stage||"foundation"]} Stage ({STAGE_GRADE[latest?.stage||"foundation"]})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {labels.map((label:string, i:number) => {
              const val = +(latest[domains[i]]||0);
              return (
                <div key={label} className={`rounded-lg p-3 text-center ${scoreBadge(val)}`}>
                  <div className="text-lg font-bold">{val > 0 ? val.toFixed(1)+"%" : "—"}</div>
                  <div className="text-xs mt-0.5">{label}</div>
                  {avg > 0 && val > 0 && val < avg && <div className="text-xs mt-0.5">⚠️ gap</div>}
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
              <BarChart data={labels.map((l:string,i:number) => ({ domain:l, score: +(latest[domains[i]]||0), threshold:80 }))} margin={{top:5,right:10,bottom:5,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="domain" tick={{ fontSize:10 }} />
                <YAxis domain={[0,100]} tick={{ fontSize:10 }} tickFormatter={v=>`${v}%`} />
                <Tooltip formatter={(v:any)=>`${(+v).toFixed(1)}%`} />
                <Bar dataKey="score" radius={[4,4,0,0]}>
                  {labels.map((_:string,i:number) => {
                    const val = +(latest[domains[i]]||0);
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
              {latestLit?.promoted && <div className="text-xs text-green-700 font-bold mt-1">🎉 Promoted to {latestLit.promoted_to_stage}</div>}
            </div>
          )}
          {hasNum && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-xs text-purple-600 font-semibold mb-1">🔢 Numeracy</div>
              <div className="text-sm font-bold text-purple-800">{STAGE_LABELS[numStage]} Stage</div>
              <div className="text-xs text-purple-600">Assessed on {numGrade} competencies</div>
              {latestNum?.promoted && <div className="text-xs text-green-700 font-bold mt-1">🎉 Promoted to {latestNum.promoted_to_stage}</div>}
            </div>
          )}
        </div>
      </div>

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
        <SubjectCharts rounds={litRounds} trend={litTrend} domains={LIT_DOMAINS} labels={LIT_LABELS} stageGroups={litStageGroups} subj="literacy" />
      )}
      {(!hasLit || !hasNum || activeSubj === "numeracy") && hasNum && (
        <SubjectCharts rounds={numRounds} trend={numTrend} domains={NUM_DOMAINS} labels={NUM_LABELS} stageGroups={numStageGroups} subj="numeracy" />
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
  const nv = (v: any) => +(v ?? 0);
  const fmtP = (v: number) => `${v.toFixed(1)}%`;
  const sBg = (p: number) => p >= 80 ? "bg-green-100 text-green-800" : p >= 60 ? "bg-blue-100 text-blue-800" : p >= 40 ? "bg-yellow-100 text-yellow-800" : p > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-400";
  const sColor = (p: number) => p >= 80 ? "text-green-600" : p >= 60 ? "text-blue-600" : p >= 40 ? "text-yellow-600" : p > 0 ? "text-red-500" : "text-gray-400";
  const inputBg = (p: number | null) => p === null ? "border-gray-300" : p >= 80 ? "border-green-300 bg-green-50 text-green-800" : p >= 60 ? "border-blue-300 bg-blue-50 text-blue-800" : p >= 33 ? "border-yellow-300 bg-yellow-50 text-yellow-800" : "border-red-300 bg-red-50 text-red-800";

  const [subTab, setSubTab] = useState<"entry" | "analysis">("entry");
  const [selectedCombo, setSelectedCombo] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState("PA1");
  const [marksTable, setMarksTable] = useState<any>(null);
  const [marks, setMarks] = useState<Record<string, Record<string, any>>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [sectionData, setSectionData] = useState<any>(null);
  const [longData, setLongData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Build combos from mappings
  const combos: { grade: string; section: string; subject: string }[] = [];
  if (mappings?.mappings) {
    const seen = new Set<string>();
    mappings.mappings.forEach((m: any) => {
      if (!m.subject) return;
      const key = `${m.grade}||${m.section}||${m.subject}`;
      if (!seen.has(key)) { seen.add(key); combos.push({ grade: m.grade, section: m.section, subject: m.subject }); }
    });
  }

  useEffect(() => { if (combos.length && !selectedCombo) setSelectedCombo(combos[0]); }, [mappings]);
  useEffect(() => { if (selectedCombo && selectedExam) { fetchMarksTable(); if (subTab === "analysis") fetchAnalysis(); } }, [selectedCombo, selectedExam, academicYear]);
  useEffect(() => { if (subTab === "analysis" && selectedCombo) { fetchAnalysis(); fetchLong(); } }, [subTab]);

  const fetchMarksTable = async () => {
    if (!selectedCombo) return;
    try {
      const r = await axios.get(`${API}/pasa/marks/table?academic_year=${academicYear}&exam_type=${selectedExam}&grade=${encodeURIComponent(selectedCombo.grade)}&section=${encodeURIComponent(selectedCombo.section)}`);
      let data = r.data;

      // Only show marks table if exam config actually exists for this grade
      // Do NOT inject default 100 marks - teacher must configure exam first
      if (!data?.configs?.length) {
        setMarksTable({ no_config: true, grade: selectedCombo.grade, exam_type: selectedExam });
        setMarks({});
        return;
      }

      // Filter configs to only show teacher's subject
      if (data?.configs?.length) {
        data = {
          ...data,
          configs: data.configs.filter((c: any) => c.subject === selectedCombo.subject),
          subjects: (data.subjects || []).filter((s: any) => s === selectedCombo.subject),
          students: data.students.map((s: any) => ({
            ...s,
            subjects: Object.fromEntries(
              Object.entries(s.subjects || {}).filter(([k]) => k === selectedCombo.subject)
            ),
          })),
        };
      }

      setMarksTable(data);
      const m: Record<string, Record<string, any>> = {};
      (data?.students || []).forEach((s: any) => {
        m[s.student_name] = {};
        Object.keys(s.subjects || {}).forEach(sub => {
          m[s.student_name][sub] = { marks: s.subjects[sub].marks != null ? String(s.subjects[sub].marks) : "", is_absent: s.subjects[sub].is_absent || false };
        });
      });
      setMarks(m);
    } catch (e) {
      setMarksTable({ no_config: true, grade: selectedCombo.grade, exam_type: selectedExam });
      setMarks({});
    }
  };

  const fetchAnalysis = async () => {
    if (!selectedCombo) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API}/pasa/analysis/section?academic_year=${academicYear}&exam_type=${selectedExam}&grade=${encodeURIComponent(selectedCombo.grade)}&section=${encodeURIComponent(selectedCombo.section)}`);
      setSectionData(r.data);
    } catch { setSectionData(null); }
    setLoading(false);
  };

  const fetchLong = async () => {
    if (!selectedCombo) return;
    try {
      const r = await axios.get(`${API}/pasa/analysis/longitudinal?academic_year=${academicYear}&grade=${encodeURIComponent(selectedCombo.grade)}&section=${encodeURIComponent(selectedCombo.section)}`);
      setLongData(r.data);
    } catch { }
  };

  const updateMark = (name: string, sub: string, val: string) => {
    setMarks(prev => ({ ...prev, [name]: { ...(prev[name] || {}), [sub]: { ...((prev[name] || {})[sub] || {}), marks: val } } }));
  };

  const toggleAbsent = (name: string, sub: string) => {
    setMarks(prev => { const cur = prev[name]?.[sub]?.is_absent || false; return { ...prev, [name]: { ...(prev[name] || {}), [sub]: { marks: "", is_absent: !cur } } }; });
  };

  const saveMarks = async () => {
    if (!marksTable || !selectedCombo) return;
    setSaving(true);
    try {
      const entries: any[] = [];
      marksTable.students.forEach((student: any) => {
        // Only save for teacher's own subject
        const sub = selectedCombo.subject;
        const cfg = marksTable.configs?.find((c: any) => c.subject === sub);
        const md = marks[student.student_name]?.[sub];
        const maxMarks = nv(cfg?.max_marks) || 100;
        const marksObtained = md?.is_absent ? null : (md?.marks === "" || md?.marks === undefined ? null : parseFloat(String(md.marks)));
        entries.push({ student_id: student.student_id, student_name: student.student_name, roll_number: student.roll_number, subject: sub, marks_obtained: isNaN(marksObtained as number) ? null : marksObtained, max_marks: maxMarks, is_absent: md?.is_absent || false });
      });
      await axios.post(`${API}/pasa/marks`, { academic_year: academicYear, exam_type: selectedExam, grade: selectedCombo.grade, section: selectedCombo.section, entries });
      setMsg("✅ Marks saved successfully");
      fetchMarksTable();
    } catch { setMsg("❌ Error saving marks"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  if (!combos.length) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No subject assignments found. Contact admin.</div>;

  return (
    <div className="space-y-4">
      {/* Sub-tab + exam selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          {[{ id: "entry", label: "✏️ Marks Entry" }, { id: "analysis", label: "📊 Analysis" }].map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id as any)}
              className={`px-4 py-2 text-sm rounded-lg font-medium border ${subTab === t.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>{t.label}</button>
          ))}
        </div>
        <div>
          <label className="text-xs text-gray-500 mr-1">Exam:</label>
          <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {["PA1","PA2","SA1","PA3","PA4","SA2"].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Section selector */}
      <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
        {combos.map(c => (
          <button key={`${c.grade}-${c.section}-${c.subject}`}
            onClick={() => setSelectedCombo(c)}
            className={`px-3 py-2 text-xs rounded-lg font-medium border ${selectedCombo?.grade === c.grade && selectedCombo?.section === c.section && selectedCombo?.subject === c.subject ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>
            {c.grade} · {c.section} · {c.subject}
          </button>
        ))}
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* MARKS ENTRY */}
      {subTab === "entry" && (
        <div>
          {!marksTable ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Loading...</div>
          ) : marksTable.no_config ? (
            <div className="bg-white rounded-xl shadow p-10 text-center">
              <p className="text-gray-500 text-sm font-medium">⚠️ No exam configuration found for {marksTable.grade} — {marksTable.exam_type}</p>
              <p className="text-gray-400 text-xs mt-2">Admin needs to configure the exam for this grade first via Exam Config tab.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div>
                  <h2 className="text-sm font-bold text-gray-700">{selectedCombo?.grade} — {selectedCombo?.section} — {selectedExam} — {selectedCombo?.subject}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{marksTable.students?.length} students · You can only enter marks for your subject</p>
                </div>
                <button onClick={saveMarks} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold">
                  {saving ? "Saving..." : "💾 Save Marks"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-indigo-700 text-white">
                      <th className="px-3 py-2 text-center w-10">#</th>
                      <th className="px-3 py-2 text-left min-w-[180px]">Student</th>
                      <th className="px-3 py-2 text-center">Roll No</th>
                      <th className="px-3 py-2 text-center min-w-[150px]">{selectedCombo?.subject} (Max: {marksTable.configs?.find((c: any) => c.subject === selectedCombo?.subject)?.max_marks || 100})</th>
                      <th className="px-3 py-2 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksTable.students?.map((student: any, idx: number) => {
                      const sub = selectedCombo?.subject;
                      const cfg = marksTable.configs?.find((c: any) => c.subject === sub);
                      const md = marks[student.student_name]?.[sub] || {};
                      const maxMarks = nv(cfg?.max_marks) || 100;
                      const markVal = parseFloat(String(md.marks));
                      const subPct = !md.is_absent && !isNaN(markVal) && md.marks !== "" ? (markVal / maxMarks) * 100 : null;
                      const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                      return (
                        <tr key={student.student_name} className={`border-b border-gray-100 ${bg}`}>
                          <td className={`px-3 py-2 text-center text-gray-400 ${bg}`}>{idx + 1}</td>
                          <td className={`px-3 py-2 font-medium text-gray-800 ${bg}`}>{student.student_name}</td>
                          <td className="px-3 py-2 text-center text-gray-500">{student.roll_number || "—"}</td>
                          <td className={`px-2 py-1.5 text-center ${bg}`}>
                            {md.is_absent ? (
                              <div className="flex items-center gap-1 justify-center">
                                <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">ABSENT</span>
                                <button onClick={() => toggleAbsent(student.student_name, sub)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 justify-center">
                                <input type="number" value={md.marks ?? ""} min={0} max={maxMarks} step={0.25}
                                  onChange={e => updateMark(student.student_name, sub, e.target.value)}
                                  className={`w-20 text-center border rounded px-1 py-0.5 text-xs font-medium ${inputBg(subPct)}`} />
                                <button onClick={() => toggleAbsent(student.student_name, sub)} className="text-xs text-gray-300 hover:text-red-500 font-bold" title="Mark absent">AB</button>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {subPct !== null ? <span className={`text-xs font-bold ${sColor(subPct)}`}>{subPct.toFixed(1)}%</span> : <span className="text-gray-300">—</span>}
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
      )}

      {/* ANALYSIS */}
      {subTab === "analysis" && (
        <div className="space-y-4">
          {loading ? <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Loading...</div> :
          !sectionData ? <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No analysis data for {selectedCombo?.grade} · {selectedCombo?.section} · {selectedExam}.</div> : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Students", value: sectionData.total_students, color: "border-indigo-500" },
                  { label: "Section Avg", value: fmtP(nv(sectionData.section_avg)), color: "border-green-500" },
                  { label: "Subjects", value: sectionData.subjects?.length, color: "border-blue-500" },
                  { label: "Exam", value: selectedExam, color: "border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-lg font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Advancing / Retracting */}
              {(sectionData.advancing?.length > 0 || sectionData.retracting?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow p-4 border-t-4 border-green-400">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">📈 Advancing <span className="ml-auto bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{sectionData.advancing?.length}</span></h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sectionData.advancing?.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-green-50 rounded text-xs border border-green-100">
                          <span className="font-medium">{s.student_name}</span>
                          <span className="text-green-700 font-bold">{nv(s.prev_percentage).toFixed(1)}% → {nv(s.grand_percentage).toFixed(1)}% ▲+{nv(s.change).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-4 border-t-4 border-red-400">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">📉 Retracting <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{sectionData.retracting?.length}</span></h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sectionData.retracting?.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-red-50 rounded text-xs border border-red-100">
                          <span className="font-medium">{s.student_name}</span>
                          <span className="text-red-700 font-bold">{nv(s.prev_percentage).toFixed(1)}% → {nv(s.grand_percentage).toFixed(1)}% ▼{Math.abs(nv(s.change)).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Student rankings */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Rankings · ▲ Advancing · ▼ Retracting</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ minWidth: `${350 + (sectionData.subjects?.length || 0) * 100}px` }}>
                    <thead>
                      <tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-center sticky left-0 bg-indigo-700 w-10">Rank</th>
                        <th className="px-3 py-2 text-left sticky left-[40px] bg-indigo-700 min-w-[160px]">Student</th>
                        {sectionData.subjects?.map((sub: string) => <th key={sub} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[90px]">{sub}</th>)}
                        <th className="px-3 py-2 text-center border-l border-indigo-600">Grand %</th>
                        <th className="px-3 py-2 text-center">Band</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(sectionData.students_ranked || [])].sort((a, b) => nv(b.grand_percentage) - nv(a.grand_percentage)).map((s: any, i: number) => {
                        const isAdv = sectionData.advancing?.some((a: any) => a.student_name === s.student_name);
                        const isRet = sectionData.retracting?.some((r: any) => r.student_name === s.student_name);
                        return (
                          <tr key={s.student_name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 text-center font-bold text-gray-400 sticky left-0 bg-inherit">{s.rank || i+1}</td>
                            <td className="px-3 py-2 sticky left-[40px] bg-inherit font-medium text-gray-800">
                              {s.student_name}
                              {isAdv && <span className="ml-1 text-green-500 font-bold">▲</span>}
                              {isRet && <span className="ml-1 text-red-500 font-bold">▼</span>}
                            </td>
                            {sectionData.subjects?.map((sub: string) => {
                              const sd = s.subjects?.[sub];
                              return (
                                <td key={sub} className="px-2 py-2 text-center border-l border-gray-100">
                                  {sd?.is_absent ? <span className="text-red-400 font-bold">AB</span>
                                    : sd?.percentage != null ? <div><span className="font-bold">{sd.marks}</span><br/><span className={`text-xs px-1 rounded ${sBg(nv(sd.percentage))}`}>{nv(sd.percentage).toFixed(0)}%</span></div>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center border-l border-gray-100">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sBg(nv(s.grand_percentage))}`}>{s.grand_percentage ? fmtP(nv(s.grand_percentage)) : "—"}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {s.band && <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: (BAND_COLORS[s.band]||"#999") + "20", color: BAND_COLORS[s.band]||"#999" }}>{s.band}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Subject avg chart */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Average %</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.entries(sectionData.subject_averages || {}).map(([s, v]) => ({ name: s, avg: nv(v) }))} layout="vertical">
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

              {/* Pass/Fail per subject */}
              {sectionData.pass_fail && Object.keys(sectionData.pass_fail).length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Pass/Fail per Subject (pass = 33%+)</h3>
                  <div className="space-y-2">
                    {Object.entries(sectionData.pass_fail).map(([sub, data]: [string, any]) => (
                      <div key={sub} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700 w-28 truncate">{sub}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-5 overflow-hidden flex">
                          <div className="bg-green-500 h-full flex items-center justify-center text-white text-xs font-bold" style={{ width: `${data.pass_pct}%` }}>{data.pass_pct > 15 ? data.pass : ""}</div>
                          <div className="bg-red-400 h-full flex items-center justify-center text-white text-xs font-bold" style={{ width: `${100 - data.pass_pct}%` }}>{(100-data.pass_pct) > 15 ? data.fail : ""}</div>
                        </div>
                        <span className="text-xs text-green-700 font-bold w-16 text-right">{data.pass_pct}% pass</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Longitudinal */}
              {longData?.data?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">📈 Longitudinal — Subject Average across Exams</h3>
                  <p className="text-xs text-gray-400 mb-3">X = Exam · Y = Avg % · Each line = one subject · Dashed = Overall</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={longData.data} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exam" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any, name: any) => [`${v}%`, name]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                      {sectionData.subjects?.map((sub: string, i: number) => (
                        <Line key={sub} type="monotone" dataKey={sub} stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                      ))}
                      <Line type="monotone" dataKey="Overall" stroke="#374151" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* YoY panels */}
              {(sectionData.yoy_advancing?.length > 0 || sectionData.yoy_retracting?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow p-4 border-t-4 border-emerald-400">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">🚀 Year-on-Year Advancing <span className="text-xs font-normal text-gray-400">(vs last year)</span></h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sectionData.yoy_advancing?.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-emerald-50 rounded text-xs border border-emerald-100">
                          <span>{s.student_name}</span><span className="text-emerald-700 font-bold">▲+{nv(s.change).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-4 border-t-4 border-orange-400">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">⚠️ Year-on-Year Retracting <span className="text-xs font-normal text-gray-400">(vs last year)</span></h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sectionData.yoy_retracting?.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-orange-50 rounded text-xs border border-orange-100">
                          <span>{s.student_name}</span><span className="text-orange-700 font-bold">▼{nv(s.change).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
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
  const CROSS_CURRICULAR = ["arts","vocational_education","interdisciplinary"];
  const CROSS_LABELS: Record<string,string> = { arts: "Arts", vocational_education: "Vocational Education", interdisciplinary: "Interdisciplinary" };
  const RATING_COLORS: Record<string, string> = {
    beginning: "bg-red-100 text-red-700 border-red-300",
    approaching: "bg-yellow-100 text-yellow-700 border-yellow-300",
    meeting: "bg-green-100 text-green-700 border-green-300",
    exceeding: "bg-purple-100 text-purple-700 border-purple-300"
  };
  const GRADE_TO_STAGE: Record<string, string> = {
    "Pre-KG":"foundation","LKG":"foundation","UKG":"foundation",
    "Grade 1":"foundation","Grade 2":"foundation",
    "Grade 3":"preparatory","Grade 4":"preparatory","Grade 5":"preparatory",
    "Grade 6":"middle","Grade 7":"middle","Grade 8":"middle",
    "Grade 9":"secondary","Grade 10":"secondary",
  };
  const normalizeSubject = (s: string) => s.trim().toLowerCase().replace(/\s+/g,'_').replace(/[()]/g,'');

  const [subTab, setSubTab] = useState<"create"|"marks"|"coverage"|"analysis">("create");
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [combinedMarks, setCombinedMarks] = useState<any>(null);
  const [localRatings, setLocalRatings] = useState<Record<string,Record<string,Record<string,string>>>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [coverage, setCoverage] = useState<any>(null);
  const [coverageGrade, setCoverageGrade] = useState("");

  // Build teacher's combos
  const combos: { grade: string; section: string; subject: string }[] = [];
  const gradeSet = new Set<string>();
  const sectionsByGrade: Record<string,string[]> = {};
  if (mappings?.mappings) {
    const seen = new Set<string>();
    mappings.mappings.forEach((m: any) => {
      if (!m.subject) return;
      const key = `${m.grade}||${m.section}||${m.subject}`;
      if (!seen.has(key)) { seen.add(key); combos.push({ grade: m.grade, section: m.section, subject: m.subject }); }
      gradeSet.add(m.grade);
      if (!sectionsByGrade[m.grade]) sectionsByGrade[m.grade] = [];
      if (!sectionsByGrade[m.grade].includes(m.section)) sectionsByGrade[m.grade].push(m.section);
    });
  }
  const allSubjects = [...new Set(combos.map(c => c.subject))].sort();
  const allGrades = [...gradeSet].sort();

  // Form state
  const [form, setForm] = useState({
    name: "", description: "", grade: allGrades[0] || "",
    sections: [] as string[], // multi-section
    subject: allSubjects[0] || "", activity_type: "Individual",
    activity_date: new Date().toISOString().split("T")[0],
    competency_areas: [] as string[],
    competency_mappings: [] as string[],
  });
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [crossCompetencies, setCrossCompetencies] = useState<Record<string,any[]>>({});

  const sectionsForGrade = sectionsByGrade[form.grade] || [];

  useEffect(() => { fetchActivities(); }, [academicYear]);
  useEffect(() => {
    if (form.grade && form.subject) fetchCompetencies();
    // Reset sections when grade changes
    setForm(p => ({ ...p, sections: [], competency_mappings: [] }));
  }, [form.grade, form.subject]);
  useEffect(() => { if (form.competency_areas.length) fetchCrossCompetencies(); }, [form.competency_areas, form.grade]);
  useEffect(() => { if (selectedActivity) fetchCombinedMarks(); }, [selectedActivity]);
  useEffect(() => { if (subTab === "coverage" && coverageGrade) fetchCoverage(); }, [subTab, coverageGrade]);

  const fetchActivities = async () => {
    try {
      const results = await Promise.all(allGrades.map(async grade => {
        try {
          const r = await axios.get(`${API}/activities?academic_year=${academicYear}&grade=${encodeURIComponent(grade)}`);
          return r.data || [];
        } catch { return []; }
      }));
      const merged = results.flat();
      const seen = new Set<string>();
      setActivities(merged.filter((a: any) => { if (seen.has(a.id)) return false; seen.add(a.id); return true; }));
    } catch {}
  };

  const fetchCompetencies = async () => {
    try {
      const subjectNorm = normalizeSubject(form.subject);
      const stage = GRADE_TO_STAGE[form.grade] || "middle";
      let data: any[] = [];
      // Try grade + subject first
      const r = await axios.get(`${API}/activities/competencies?grade=${encodeURIComponent(form.grade)}&subject=${encodeURIComponent(subjectNorm)}`);
      data = r.data || [];
      // Fallback: try stage + subject
      if (!data.length) {
        const r2 = await axios.get(`${API}/activities/competencies?stage=${encodeURIComponent(stage)}&subject=${encodeURIComponent(subjectNorm)}`);
        data = r2.data || [];
      }
      setCompetencies(data);
    } catch { setCompetencies([]); }
  };

  const fetchCrossCompetencies = async () => {
    const map: Record<string,any[]> = {};
    for (const area of form.competency_areas) {
      try {
        const stage = GRADE_TO_STAGE[form.grade] || "middle";
        const r = await axios.get(`${API}/activities/competencies?stage=${encodeURIComponent(stage)}&subject=${encodeURIComponent(area)}`);
        map[area] = r.data || [];
      } catch { map[area] = []; }
    }
    setCrossCompetencies(map);
  };

  const fetchCombinedMarks = async () => {
    if (!selectedActivity) return;
    try {
      const r = await axios.get(`${API}/activities/combined-marks/${encodeURIComponent(selectedActivity.grade)}/${encodeURIComponent(selectedActivity.section)}/${encodeURIComponent(selectedActivity.subject)}?academic_year=${academicYear}`);
      setCombinedMarks(r.data);
      const init: Record<string,Record<string,Record<string,string>>> = {};
      (r.data?.students || []).forEach((s: any) => {
        init[s.student_id] = {};
        (r.data?.activities || []).forEach((act: any) => { init[s.student_id][act.id] = { ...(s.activity_data?.[act.id] || {}) }; });
      });
      setLocalRatings(init);
    } catch {}
  };

  const fetchCoverage = async () => {
    if (!coverageGrade) return;
    try {
      // Try with section-based coverage first (most accurate)
      const sectionForGrade = (mappings?.mappings || []).find((m: any) => m.grade === coverageGrade)?.section;
      if (sectionForGrade) {
        const r = await axios.get(`${API}/activities/coverage/section/${encodeURIComponent(coverageGrade)}/${encodeURIComponent(sectionForGrade)}?academic_year=${academicYear}`);
        if (r.data?.total > 0) { setCoverage(r.data); return; }
      }
      // Try subject-based coverage
      const subjectNorm = normalizeSubject(allSubjects[0] || "");
      const r = await axios.get(`${API}/activities/coverage/detail/${encodeURIComponent(coverageGrade)}/${encodeURIComponent(subjectNorm)}?academic_year=${academicYear}`);
      let data = r.data;
      if (!data?.total) {
        const ar = await axios.get(`${API}/activities?academic_year=${academicYear}&grade=${encodeURIComponent(coverageGrade)}`);
        const acts = ar.data || [];
        const allMappedIds = new Set<string>();
        acts.forEach((a: any) => (a.competency_mappings || []).forEach((id: string) => allMappedIds.add(id)));
        data = { total: allMappedIds.size, covered: allMappedIds.size, uncovered: 0, coverage_percent: allMappedIds.size > 0 ? 100 : 0, covered_competencies: [], uncovered_competencies: [], note: "Coverage based on activities created." };
      }
      setCoverage(data);
    } catch { setCoverage(null); }
  };

  const saveActivity = async () => {
    if (!form.name || !form.grade || !form.subject || !form.sections.length) {
      setMsg("❌ Name, Grade, Subject and at least one Section are required");
      setTimeout(() => setMsg(""), 3000); return;
    }
    try {
      const stage = GRADE_TO_STAGE[form.grade] || "middle";
      // Create activity for each selected section
      await Promise.all(form.sections.map(section =>
        axios.post(`${API}/activities`, {
          ...form, section, stage, academic_year: academicYear, created_by: user?.id
        })
      ));
      setMsg(`✅ Activity created for ${form.sections.length} section(s)`);
      setShowForm(false);
      setForm(p => ({ ...p, name: "", description: "", sections: [], competency_mappings: [], competency_areas: [] }));
      fetchActivities();
    } catch { setMsg("❌ Error creating activity"); }
    setTimeout(() => setMsg(""), 3000);
  };

  const deleteActivity = async (id: string) => {
    if (!confirm("Delete this activity?")) return;
    try { await axios.delete(`${API}/activities/${id}`); setMsg("✅ Deleted"); fetchActivities(); } catch { setMsg("❌ Error"); }
    setTimeout(() => setMsg(""), 3000);
  };

  const updateRating = (studentId: string, activityId: string, competencyId: string, rating: string) => {
    setLocalRatings(prev => ({ ...prev, [studentId]: { ...(prev[studentId]||{}), [activityId]: { ...(prev[studentId]?.[activityId]||{}), [competencyId]: rating } } }));
  };

  const saveActivityMarks = async (activityId: string) => {
    if (!combinedMarks) return;
    setSaving(true);
    try {
      const entries = (combinedMarks.students || []).map((s: any) => ({
        student_id: s.student_id, student_name: s.student_name,
        competency_ratings: localRatings[s.student_id]?.[activityId] || {}
      }));
      await axios.post(`${API}/activities/${activityId}/marks`, { academic_year: academicYear, entries });
      setMsg("✅ Marks saved"); fetchCombinedMarks();
    } catch { setMsg("❌ Error saving marks"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const toggleSection = (s: string) => {
    setForm(p => ({ ...p, sections: p.sections.includes(s) ? p.sections.filter(x => x !== s) : [...p.sections, s] }));
  };

  const toggleCompetency = (id: string) => {
    setForm(p => ({ ...p, competency_mappings: p.competency_mappings.includes(id) ? p.competency_mappings.filter(x => x !== id) : [...p.competency_mappings, id] }));
  };

  const allCrossCompetencies = Object.values(crossCompetencies).flat();

  if (!combos.length) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No subject assignments found. Contact admin.</div>;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
        {[
          { id: "create", label: "📋 Activities" },
          { id: "marks", label: "✏️ Marks Entry" },
          { id: "coverage", label: "📊 Coverage" },
          { id: "analysis", label: "📈 Analysis" },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium border ${subTab === t.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>{t.label}</button>
        ))}
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* ── CREATE / LIST ── */}
      {subTab === "create" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
              {showForm ? "✕ Cancel" : "+ Create Activity"}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-700">New Activity</h3>

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Activity Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Story Writing" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Grade *</label>
                  <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Subject *</label>
                  <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value, competency_mappings: [] }))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Activity Type</label>
                  <select value={form.activity_type} onChange={e => setForm(p => ({ ...p, activity_type: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Date</label>
                  <input type="date" value={form.activity_date} onChange={e => setForm(p => ({ ...p, activity_date: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>
              </div>

              {/* Multi-section selector */}
              <div>
                <label className="text-xs text-gray-500 block mb-1 font-semibold">
                  Sections * ({form.sections.length} selected)
                  <button onClick={() => setForm(p => ({ ...p, sections: sectionsForGrade }))} className="ml-2 text-indigo-600 hover:underline text-xs font-normal">Select All</button>
                  <button onClick={() => setForm(p => ({ ...p, sections: [] }))} className="ml-2 text-gray-400 hover:underline text-xs font-normal">Clear</button>
                </label>
                <div className="flex flex-wrap gap-2">
                  {sectionsForGrade.map(s => (
                    <button key={s} onClick={() => toggleSection(s)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${form.sections.includes(s) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Competencies from registry — live from backend */}
              <div>
                <label className="text-xs text-gray-500 block mb-1 font-semibold">
                  Competencies — {form.subject} · {form.grade} ({competencies.length} available, {form.competency_mappings.length} selected)
                  <button onClick={() => setForm(p => ({ ...p, competency_mappings: competencies.map((c:any) => c.id) }))} className="ml-2 text-indigo-600 hover:underline text-xs font-normal">Select All</button>
                  <button onClick={() => setForm(p => ({ ...p, competency_mappings: [] }))} className="ml-2 text-gray-400 hover:underline text-xs font-normal">Clear</button>
                </label>
                {competencies.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No competencies found for {form.subject} — {form.grade}. Add them in Admin → Competency Registry.</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {/* Group by domain */}
                    {[...new Set(competencies.map((c:any) => c.domain))].map(domain => (
                      <div key={domain}>
                        {domain && <div className="text-xs font-semibold text-indigo-700 px-1 py-0.5 mt-1">{domain}</div>}
                        {competencies.filter((c:any) => c.domain === domain).map((c: any) => (
                          <label key={c.id} className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 text-xs ${form.competency_mappings.includes(c.id) ? "bg-indigo-50" : ""}`}>
                            <input type="checkbox" checked={form.competency_mappings.includes(c.id)} onChange={() => toggleCompetency(c.id)} className="accent-indigo-600 mt-0.5 shrink-0" />
                            <span className="font-mono text-indigo-600 font-semibold shrink-0">{c.competency_code}</span>
                            <span className="text-gray-600">{c.description}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cross-curricular areas */}
              <div>
                <label className="text-xs text-gray-500 block mb-1 font-semibold">Cross-curricular areas (optional)</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {CROSS_CURRICULAR.map(area => (
                    <label key={area} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${form.competency_areas.includes(area) ? "bg-purple-100 border-purple-400 text-purple-700 font-bold" : "bg-white border-gray-300 text-gray-600"}`}>
                      <input type="checkbox" checked={form.competency_areas.includes(area)}
                        onChange={() => setForm(p => ({ ...p, competency_areas: p.competency_areas.includes(area) ? p.competency_areas.filter(x => x !== area) : [...p.competency_areas, area] }))}
                        className="accent-purple-600" />
                      {CROSS_LABELS[area]}
                    </label>
                  ))}
                </div>
                {/* Cross-curricular competencies dropdown */}
                {allCrossCompetencies.length > 0 && (
                  <div className="max-h-36 overflow-y-auto border border-purple-200 rounded-lg p-2 space-y-1 bg-purple-50">
                    <div className="text-xs font-semibold text-purple-700 mb-1">Cross-curricular competencies ({allCrossCompetencies.length})</div>
                    {allCrossCompetencies.map((c: any) => (
                      <label key={c.id} className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-purple-100 text-xs ${form.competency_mappings.includes(c.id) ? "bg-purple-100" : ""}`}>
                        <input type="checkbox" checked={form.competency_mappings.includes(c.id)} onChange={() => toggleCompetency(c.id)} className="accent-purple-600 mt-0.5 shrink-0" />
                        <span className="font-mono text-purple-600 font-semibold shrink-0">{c.competency_code}</span>
                        <span className="text-gray-600">{c.description}</span>
                        <span className="text-purple-500 text-xs shrink-0">[{c.subject}]</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div><label className="text-xs text-gray-500 block mb-1">Description (optional)</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button onClick={saveActivity} className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">💾 Save Activity</button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          {/* Activities list */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Activities ({activities.length})</h3>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No activities yet. Create one above.</p>
            ) : (
              <div className="space-y-2">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.grade} · {a.section} · {a.subject} · {a.activity_date} · {(a.competency_mappings||[]).length} competencies</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedActivity(a); setSubTab("marks"); }} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs rounded-lg hover:bg-indigo-200 font-medium">✏️ Marks</button>
                      <button onClick={() => deleteActivity(a.id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 font-medium">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MARKS ENTRY ── */}
      {subTab === "marks" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <label className="text-xs text-gray-500 block mb-2">Select Activity</label>
            <select value={selectedActivity?.id || ""} onChange={e => { const a = activities.find(x => x.id === e.target.value); setSelectedActivity(a || null); }}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-md">
              <option value="">-- Select activity --</option>
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} — {a.grade} · {a.section} · {a.subject}</option>)}
            </select>
          </div>

          {selectedActivity && (
            <MarksEntryPanel
              activity={selectedActivity}
              combinedMarks={combinedMarks}
              localRatings={localRatings}
              updateRating={updateRating}
              saveActivityMarks={saveActivityMarks}
              saving={saving}
              RATING_COLORS={RATING_COLORS}
              API={API}
              academicYear={academicYear}
            />
          )}
        </div>
      )}

      {/* ── COVERAGE TAB ── */}
      {subTab === "coverage" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={coverageGrade} onChange={e => setCoverageGrade(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                  <option value="">-- Select grade --</option>
                  {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <button onClick={fetchCoverage} className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Check Coverage</button>
            </div>

            {coverage && (
              <div>
                {/* Summary KPIs */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Total Competencies", value: coverage.total, color: "text-gray-700" },
                    { label: "Covered", value: coverage.covered, color: "text-green-700" },
                    { label: "Pending", value: coverage.uncovered, color: "text-red-600" },
                    { label: "Coverage %", value: `${coverage.coverage_percent}%`, color: coverage.coverage_percent >= 80 ? "text-green-700" : coverage.coverage_percent >= 50 ? "text-yellow-600" : "text-red-600" },
                  ].map(k => (
                    <div key={k.label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                      <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* Coverage bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Coverage Progress</span><span>{coverage.coverage_percent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${coverage.coverage_percent >= 80 ? "bg-green-500" : coverage.coverage_percent >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${coverage.coverage_percent}%` }} />
                  </div>
                </div>

                {/* Covered competencies */}
                {coverage.covered_competencies?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-green-700 mb-2">✅ Covered ({coverage.covered_competencies.length})</div>
                    <div className="grid grid-cols-1 gap-1">
                      {coverage.covered_competencies.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded text-xs">
                          <span className="font-mono text-green-700 font-semibold shrink-0">{c.competency_code}</span>
                          <span className="text-gray-600">{c.description}</span>
                          {c.domain && <span className="text-green-500 shrink-0 ml-auto">{c.domain}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uncovered competencies */}
                {coverage.uncovered_competencies?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-red-600 mb-2">⏳ Pending ({coverage.uncovered_competencies.length})</div>
                    <div className="grid grid-cols-1 gap-1">
                      {coverage.uncovered_competencies.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs">
                          <span className="font-mono text-red-600 font-semibold shrink-0">{c.competency_code}</span>
                          <span className="text-gray-600">{c.description}</span>
                          {c.domain && <span className="text-red-400 shrink-0 ml-auto">{c.domain}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ANALYSIS TAB ── */}
      {subTab === "analysis" && (
        <ActivityAnalysisPanel
          allGrades={allGrades.length ? allGrades : (user?.assigned_classes || []).map((c:string) => c.startsWith("Grade") || ["Pre-KG","LKG","UKG"].includes(c) ? c : `Grade ${c}`).filter((v:string,i:number,a:string[])=>a.indexOf(v)===i)}
          sectionsByGrade={Object.keys(sectionsByGrade).length ? sectionsByGrade : (() => { const m: Record<string,string[]> = {}; (user?.assigned_classes||[]).forEach((g:string)=>{ const ng = g.startsWith("Grade")||["Pre-KG","LKG","UKG"].includes(g)?g:`Grade ${g}`; m[ng]=(user?.assigned_sections||[]); }); return m; })()}
          allSubjects={allSubjects.length ? allSubjects : (user?.subjects || [])}
          academicYear={academicYear}
          API={API}
        />
      )}
    </div>
  );
}


// ── ACTIVITY ANALYSIS PANEL — mirrors admin activities dashboard ──
function ActivityAnalysisPanel({ allGrades, sectionsByGrade, allSubjects, academicYear, API }: any) {
  const DOMAIN_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];
  const scoreBg = (v: number) => v >= 3.5 ? "bg-green-100 text-green-800" : v >= 2.5 ? "bg-blue-100 text-blue-800" : v >= 1.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  const RATING_COLORS: Record<string,string> = { beginning:"bg-red-100 text-red-700 border-red-200", approaching:"bg-yellow-100 text-yellow-700 border-yellow-200", meeting:"bg-green-100 text-green-700 border-green-200", exceeding:"bg-purple-100 text-purple-700 border-purple-200" };

  if (!allGrades?.length) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No grade assignments found. Contact admin.</div>;

  const [dashTab, setDashTab] = useState<"grade"|"section"|"student"|"alerts"|"coverage">("grade");
  const [dashGrade, setDashGrade] = useState(allGrades[0] || "");
  const [dashSection, setDashSection] = useState("");
  const [gradeDash, setGradeDash] = useState<any>(null);
  const [sectionDash, setSectionDash] = useState<any>(null);
  const [studentDash, setStudentDash] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [coverageData, setCoverageData] = useState<any>(null);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);

  const sectionsForGrade = sectionsByGrade[dashGrade] || [];

  useEffect(() => { if (sectionsForGrade.length) setDashSection(sectionsForGrade[0]); }, [dashGrade]);
  useEffect(() => {
    if (dashTab === "grade" && dashGrade) fetchGradeDash();
    if (dashTab === "section" && dashGrade && dashSection) fetchSectionDash();
    if (dashTab === "alerts") fetchAlerts();
    if (dashTab === "coverage" && dashGrade && dashSection) fetchCoverage();
  }, [dashTab, dashGrade, dashSection, academicYear]);
  useEffect(() => { if (dashTab === "student" && dashGrade && dashSection) fetchStudentList(); }, [dashSection, dashTab]);

  const fetchGradeDash = async () => { setLoading(true); try { const r = await axios.get(`${API}/activities/dashboard/grade/${encodeURIComponent(dashGrade)}?academic_year=${academicYear}`); setGradeDash(r.data); } catch {} setLoading(false); };
  const fetchSectionDash = async () => { setLoading(true); try { const r = await axios.get(`${API}/activities/dashboard/section/${encodeURIComponent(dashGrade)}/${encodeURIComponent(dashSection)}?academic_year=${academicYear}`); setSectionDash(r.data); } catch {} setLoading(false); };
  const fetchAlerts = async () => {
    try {
      const r = await axios.get(`${API}/activities/alerts/decline?academic_year=${academicYear}`);
      const myGrades = Object.keys(sectionsByGrade).map(g => g.toLowerCase());
      const myAlerts = (r.data||[]).filter((a:any) =>
        myGrades.includes((a.grade||"").toLowerCase())
      );
      setAlerts(myAlerts);
    } catch { setAlerts([]); }
  };
  const fetchCoverage = async () => {
    try {
      const subject = (allSubjects[0]||"").toLowerCase().replace(/\s+/g,"_").replace(/[()]/g,"");
      const r = await axios.get(`${API}/activities/coverage/section/${encodeURIComponent(dashGrade)}/${encodeURIComponent(dashSection)}?academic_year=${academicYear}`);
      setCoverageData(r.data);
    } catch { setCoverageData(null); }
  };
  const fetchStudentList = async () => { try { const r = await axios.get(`${API}/students?grade=${encodeURIComponent(dashGrade)}&section=${encodeURIComponent(dashSection)}`); setStudentList(r.data?.data||r.data||[]); } catch {} };
  const fetchStudentDash = async (id: string) => { try { const r = await axios.get(`${API}/activities/dashboard/student/${id}?academic_year=${academicYear}`); setStudentDash(r.data); } catch {} };

  const DASH_TABS = [
    { id:"grade", label:"📊 Grade" },
    { id:"section", label:"🏫 Section" },
    { id:"student", label:"👤 Student" },
    { id:"alerts", label:"⚠️ Alerts" },
    { id:"coverage", label:"📋 Coverage" },
  ];

  return (
    <div className="space-y-4">
      {/* Grade + Section selector */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-4 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Grade</label>
          <select value={dashGrade} onChange={e => { setDashGrade(e.target.value); setGradeDash(null); setSectionDash(null); }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            {allGrades.map((g:string) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {(dashTab==="section"||dashTab==="student"||dashTab==="coverage") && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Section</label>
            <select value={dashSection} onChange={e => setDashSection(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              {sectionsForGrade.map((s:string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
        {DASH_TABS.map(t => (
          <button key={t.id} onClick={() => setDashTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium border ${dashTab===t.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">Loading...</div>}

      {/* ── GRADE DASHBOARD ── */}
      {!loading && dashTab==="grade" && (
        <div className="space-y-4">
          {gradeDash ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:"Total Students", value:gradeDash.total_students, color:"border-indigo-500" },
                  { label:"Assessed", value:gradeDash.total_assessed, color:"border-green-500" },
                  { label:"Overall Avg", value:gradeDash.overall_avg?.toFixed(2)+"/4", color:"border-blue-500" },
                  { label:"Grade", value:gradeDash.grade, color:"border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Section-wise Average</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={(gradeDash.sections||[]).map((s:any)=>({name:s.section,avg:s.avg}))}>
                      <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis domain={[0,4]} ticks={[0,1,2,3,4]} tick={{fontSize:10}}/>
                      <Tooltip formatter={(v:any)=>[`${v}/4`,"Avg"]}/>
                      <Bar dataKey="avg" radius={[4,4,0,0]}>{(gradeDash.sections||[]).map((_:any,i:number)=><Cell key={i} fill={DOMAIN_COLORS[i%DOMAIN_COLORS.length]}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Average</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={(gradeDash.domains||[]).map((d:any)=>({name:d.domain,avg:d.avg}))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3"/><XAxis type="number" domain={[0,4]} tick={{fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fontSize:10}} width={120}/>
                      <Tooltip formatter={(v:any)=>[`${v}/4`,"Avg"]}/>
                      <Bar dataKey="avg" radius={[0,4,4,0]}>{(gradeDash.domains||[]).map((_:any,i:number)=><Cell key={i} fill={DOMAIN_COLORS[i%DOMAIN_COLORS.length]}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {gradeDash.competencies?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Competency Averages</h3>
                  <ResponsiveContainer width="100%" height={Math.min(400,gradeDash.competencies.slice(0,15).length*28)}>
                    <BarChart data={gradeDash.competencies.slice(0,15).map((c:any)=>({name:c.competency_code,avg:c.avg,domain:c.domain}))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3"/><XAxis type="number" domain={[0,4]} tick={{fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fontSize:10}} width={80}/>
                      <Tooltip formatter={(v:any,_,p)=>[`${v}/4 — ${p.payload.domain}`,"Avg"]}/>
                      <Bar dataKey="avg" radius={[0,4,4,0]}>{gradeDash.competencies.slice(0,15).map((c:any,i:number)=><Cell key={i} fill={c.avg>=3.5?"#10b981":c.avg>=2.5?"#6366f1":c.avg>=1.5?"#f59e0b":"#ef4444"}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {gradeDash.studentRankings?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Rankings</h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {gradeDash.studentRankings.map((s:any,i:number)=>(
                      <div key={s.student_id} className="flex items-center justify-between p-2 rounded border border-gray-100 hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-6">{i+1}.</span>
                          <span className="text-xs font-medium text-gray-800">{s.name}</span>
                          <span className="text-xs text-gray-400">{s.section}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.avg)}`}>{s.avg.toFixed(2)}/4</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No data for {dashGrade}. Create activities and enter marks first.</div>}
        </div>
      )}

      {/* ── SECTION DASHBOARD ── */}
      {!loading && dashTab==="section" && (
        <div className="space-y-4">
          {sectionDash ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {label:"Total Students",value:sectionDash.total_students,color:"border-indigo-500"},
                  {label:"Overall Avg",value:sectionDash.overall_avg?.toFixed(2)+"/4",color:"border-green-500"},
                  {label:"Grade",value:sectionDash.grade,color:"border-blue-500"},
                  {label:"Section",value:sectionDash.section,color:"border-orange-500"},
                ].map(s=>(
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Average</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={(sectionDash.domains||[]).map((d:any)=>({name:d.domain,avg:d.avg}))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3"/><XAxis type="number" domain={[0,4]} tick={{fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fontSize:10}} width={120}/>
                    <Tooltip formatter={(v:any)=>[`${v}/4`,"Avg"]}/>
                    <Bar dataKey="avg" radius={[0,4,4,0]}>{(sectionDash.domains||[]).map((_:any,i:number)=><Cell key={i} fill={DOMAIN_COLORS[i%DOMAIN_COLORS.length]}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {sectionDash.weakest?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">⚠️ Weakest Competencies</h3>
                  <div className="space-y-2">
                    {sectionDash.weakest.map((c:any)=>(
                      <div key={c.competency_id} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                        <div><span className="text-xs font-bold text-red-700">{c.competency_code}</span><span className="text-xs text-gray-500 ml-2">{c.domain}</span></div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(c.avg)}`}>{c.avg.toFixed(2)}/4</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sectionDash.studentDomainBreakdown?.length > 0 && (
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
                        {sectionDash.studentDomainBreakdown.map((s:any,i:number)=>(
                          <tr key={s.student_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit">{s.student_name}</td>
                            {(sectionDash.domains||[]).map((d:any)=>{const val=s.domain_avgs?.[d.domain]||0;return(
                              <td key={d.domain} className="px-3 py-2 text-center border-l border-gray-100">
                                {val>0?<span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(val)}`}>{val.toFixed(1)}</span>:<span className="text-gray-300">—</span>}
                              </td>
                            );})}
                            <td className="px-3 py-2 text-center border-l border-gray-200">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.overall_avg)}`}>{s.overall_avg.toFixed(2)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No data for {dashGrade} — {dashSection}.</div>}
        </div>
      )}

      {/* ── STUDENT DASHBOARD ── */}
      {!loading && dashTab==="student" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <label className="text-xs text-gray-500 block mb-2">Select Student</label>
            <select value={selectedStudentId} onChange={e => { setSelectedStudentId(e.target.value); if(e.target.value) fetchStudentDash(e.target.value); }}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-md">
              <option value="">-- Select student --</option>
              {studentList.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {studentDash && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
                <p className="text-lg font-bold text-gray-800">{studentDash.student?.name}</p>
                <p className="text-sm text-gray-500">{studentDash.student?.current_class} — {studentDash.student?.section}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Average</h3>
                  <div className="space-y-2">
                    {(studentDash.subjectSummary||[]).map((s:any)=>(
                      <div key={s.subject} className="flex items-center justify-between p-2 rounded border border-gray-100">
                        <span className="text-xs font-medium text-gray-700">{s.subject}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.avg)}`}>{s.avg.toFixed(2)}/4</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Average</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={(studentDash.domainSummary||[]).map((d:any)=>({name:d.domain,avg:d.avg}))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3"/><XAxis type="number" domain={[0,4]} tick={{fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fontSize:9}} width={100}/>
                      <Tooltip formatter={(v:any)=>[`${v}/4`,"Avg"]}/>
                      <Bar dataKey="avg" radius={[0,4,4,0]}>{(studentDash.domainSummary||[]).map((_:any,i:number)=><Cell key={i} fill={DOMAIN_COLORS[i%DOMAIN_COLORS.length]}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {studentDash.competencyScores?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Individual Competency Scores</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead><tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-left">Domain</th><th className="px-3 py-2 text-center">Score</th>
                        <th className="px-3 py-2 text-center">Rating</th><th className="px-3 py-2 text-center">Attempts</th>
                      </tr></thead>
                      <tbody>
                        {studentDash.competencyScores.map((c:any,i:number)=>(
                          <tr key={c.competency_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-2 font-medium text-indigo-700">{c.competency_code}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{c.description}</td>
                            <td className="px-3 py-2 text-gray-500">{c.domain}</td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(c.avg)}`}>{c.avg.toFixed(2)}/4</span></td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded border ${RATING_COLORS[c.rating?.toLowerCase()]||"bg-gray-100"}`}>{c.rating}</span></td>
                            <td className="px-3 py-2 text-center text-gray-400">{c.assessment_count}x</td>
                          </tr>
                        ))}
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
      {!loading && dashTab==="alerts" && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-yellow-800 mb-1">⚠️ Consecutive Decline Alert</h3>
            <p className="text-xs text-yellow-600">Students in your sections whose competency average dropped in 3 consecutive activities.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Students with Consecutive Decline ({alerts.length})</h3>
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No students with 3 consecutive declines in your sections.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((s:any,i:number)=>(
                  <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div><span className="text-sm font-bold text-red-800">{s.student_name}</span><span className="text-xs text-gray-500 ml-2">{s.grade} — {s.section}</span></div>
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Drop: {s.decline_from} → {s.decline_to} (-{s.drop})</span>
                    </div>
                    <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
                      {s.scores?.map((sc:any,j:number)=>(
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
      )}

      {/* ── COVERAGE ── */}
      {!loading && dashTab==="coverage" && (
        <div className="space-y-4">
          {coverageData ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {label:"Total Competencies",value:coverageData.total,color:"text-gray-700"},
                  {label:"Covered",value:coverageData.covered,color:"text-green-700"},
                  {label:"Pending",value:coverageData.uncovered,color:"text-red-600"},
                  {label:"Coverage %",value:`${coverageData.coverage_percent}%`,color:coverageData.coverage_percent>=80?"text-green-700":coverageData.coverage_percent>=50?"text-yellow-600":"text-red-600"},
                ].map(k=>(
                  <div key={k.label} className="bg-white rounded-xl shadow p-4 text-center border border-gray-200">
                    <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className={`h-3 rounded-full transition-all ${coverageData.coverage_percent>=80?"bg-green-500":coverageData.coverage_percent>=50?"bg-yellow-500":"bg-red-500"}`}
                  style={{width:`${coverageData.coverage_percent}%`}}/>
              </div>
              {coverageData.covered_competencies?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-green-700 mb-2">✅ Covered ({coverageData.covered_competencies.length})</h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {coverageData.covered_competencies.map((c:any)=>(
                      <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded text-xs">
                        <span className="font-mono text-green-700 font-semibold shrink-0">{c.competency_code}</span>
                        <span className="text-gray-600">{c.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {coverageData.uncovered_competencies?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-red-600 mb-2">⏳ Pending ({coverageData.uncovered_competencies.length})</h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {coverageData.uncovered_competencies.map((c:any)=>(
                      <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs">
                        <span className="font-mono text-red-600 font-semibold shrink-0">{c.competency_code}</span>
                        <span className="text-gray-600">{c.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No coverage data for {dashGrade} — {dashSection}. Add competencies to the registry first.</div>}
        </div>
      )}
    </div>
  );
}

// ── MARKS ENTRY PANEL — fetches students directly, works even before any marks entered ──
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
  const allDomains = [...LITERACY_DOMAINS, ...NUMERACY_DOMAINS];

  // Compute class stats for this round
  const assessed = sectionData.students.filter((s: any) => s.rounds[activeRoundIdx]?.exists);
  if (!assessed.length) return null;

  const litAvgs = assessed.map((s: any) => s.rounds[activeRoundIdx].literacy.avg || 0);
  const numAvgs = assessed.map((s: any) => s.rounds[activeRoundIdx].numeracy.avg || 0);
  const overallAvgs = assessed.map((s: any) => s.rounds[activeRoundIdx].overall || 0);
  const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;

  const classLitAvg = avg(litAvgs);
  const classNumAvg = avg(numAvgs);
  const classOverall = avg(overallAvgs);

  // Level distribution
  const levelDist: Record<string, number> = { "Exceeding": 0, "Meeting": 0, "Approaching": 0, "Beginning": 0 };
  overallAvgs.forEach(o => { const lv = getLevel(o); levelDist[lv.label] = (levelDist[lv.label] || 0) + 1; });

  // Domain averages across all students for this round
  const domainData = allDomains.map((d: string, i: number) => {
    const isLit = LITERACY_DOMAINS.includes(d);
    const vals = assessed.map((s: any) => s.rounds[activeRoundIdx][isLit ? "literacy" : "numeracy"][d] || 0);
    return { domain: d, avg: avg(vals), type: isLit ? "literacy" : "numeracy" };
  });

  // Progress over rounds
  const progressData = sectionData.rounds.map((rk: string, i: number) => {
    const roundStudents = sectionData.students.filter((s: any) => s.rounds[i]?.exists);
    if (!roundStudents.length) return null;
    const ovs = roundStudents.map((s: any) => s.rounds[i].overall || 0);
    const lits = roundStudents.map((s: any) => s.rounds[i].literacy.avg || 0);
    const nums = roundStudents.map((s: any) => s.rounds[i].numeracy.avg || 0);
    return { name: `Round ${i + 1}`, overall: avg(ovs), literacy: avg(lits), numeracy: avg(nums) };
  }).filter(Boolean);

  // Download class report
  const downloadReport = () => {
    const rows = assessed.map((s: any) => {
      const r = s.rounds[activeRoundIdx];
      return [s.student_name,
        ...LITERACY_DOMAINS.map((d: string) => r.literacy[d] || 0),
        r.literacy.avg?.toFixed(1),
        ...NUMERACY_DOMAINS.map((d: string) => r.numeracy[d] || 0),
        r.numeracy.avg?.toFixed(1),
        r.overall?.toFixed(1),
        getLevel(r.overall).label,
        r.promoted ? `Promoted → ${r.promoted_to_stage}` : "In progress"
      ].join(",");
    });
    const header = ["Student", ...LITERACY_DOMAINS, "Lit%", ...NUMERACY_DOMAINS, "Num%", "Overall%", "Level", "Status"].join(",");
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Baseline_${grade}_${section}_Round${activeRoundIdx + 1}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadHTMLReport = () => {
    const rows = assessed.map((s: any) => {
      const r = s.rounds[activeRoundIdx];
      const lv = getLevel(r.overall);
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">${s.student_name}</td>
        ${LITERACY_DOMAINS.map((d: string) => `<td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${r.literacy[d] || 0}</td>`).join("")}
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;color:#2563eb">${r.literacy.avg?.toFixed(1)}%</td>
        ${NUMERACY_DOMAINS.map((d: string) => `<td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${r.numeracy[d] || 0}</td>`).join("")}
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;color:#d97706">${r.numeracy.avg?.toFixed(1)}%</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;color:${lv.label === "Exceeding" ? "#16a34a" : lv.label === "Meeting" ? "#2563eb" : lv.label === "Approaching" ? "#d97706" : "#dc2626"}">${r.overall?.toFixed(1)}%</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${lv.label}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;color:${r.promoted ? "#16a34a" : "#6b7280"}">${r.promoted ? "🎉 Promoted" : "In progress"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Baseline Report — ${grade} ${section} Round ${activeRoundIdx + 1}</title>
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
    <p style="color:#6b7280">${grade} — ${section} &nbsp;·&nbsp; Round ${activeRoundIdx + 1} &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</p>
    <div class="kpi">
      <div class="kpi-card"><div class="val">${assessed.length}</div><div class="lbl">Students Assessed</div></div>
      <div class="kpi-card"><div class="val">${classLitAvg}%</div><div class="lbl">Class Literacy Avg</div></div>
      <div class="kpi-card"><div class="val">${classNumAvg}%</div><div class="lbl">Class Numeracy Avg</div></div>
      <div class="kpi-card"><div class="val">${classOverall}%</div><div class="lbl">Class Overall Avg</div></div>
      <div class="kpi-card"><div class="val">${assessed.filter((s: any) => s.rounds[activeRoundIdx].promoted).length}</div><div class="lbl">Promoted (≥80%)</div></div>
    </div>
    <table><thead><tr>
      <th style="text-align:left">Student</th>
      ${LITERACY_DOMAINS.map((d: string) => `<th>${d.substring(0,5)}</th>`).join("")}<th>📖%</th>
      ${NUMERACY_DOMAINS.map((d: string) => `<th>${d.substring(0,5)}</th>`).join("")}<th>🔢%</th>
      <th>Overall</th><th>Level</th><th>Status</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <p style="margin-top:30px;color:#9ca3af;font-size:12px">Generated by CBAS — Wisdom Techno School</p>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Baseline_Report_${grade}_${section}_Round${activeRoundIdx + 1}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const LEVEL_COLORS: Record<string, string> = { "Exceeding": "#16a34a", "Meeting": "#2563eb", "Approaching": "#d97706", "Beginning": "#dc2626" };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">📊 Analytics — Round {activeRoundIdx + 1}</h3>
        <div className="flex gap-2">
          <button onClick={downloadReport} className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">⬇️ CSV</button>
          <button onClick={downloadHTMLReport} className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium">⬇️ Report Card</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Assessed", value: assessed.length, color: "border-indigo-500" },
          { label: "Lit Avg", value: `${classLitAvg}%`, color: "border-blue-500" },
          { label: "Num Avg", value: `${classNumAvg}%`, color: "border-orange-500" },
          { label: "Overall Avg", value: `${classOverall}%`, color: "border-green-500" },
          { label: "Promoted", value: assessed.filter((s: any) => s.rounds[activeRoundIdx].promoted).length, color: "border-purple-500" },
        ].map(k => (
          <div key={k.label} className={`bg-white rounded-xl shadow p-3 border-l-4 ${k.color}`}>
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-lg font-bold text-gray-800">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Level distribution */}
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Level Distribution</h4>
          <div className="space-y-2">
            {Object.entries(levelDist).map(([level, count]) => {
              const pct = assessed.length > 0 ? (count / assessed.length) * 100 : 0;
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-600">{level}</span>
                    <span className="text-xs font-bold" style={{ color: LEVEL_COLORS[level] }}>{count} students ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: LEVEL_COLORS[level] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Domain averages */}
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Domain Averages</h4>
          <div className="space-y-1.5">
            {domainData.map((d: any, i: number) => (
              <div key={d.domain} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-24 shrink-0">{d.domain}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full" style={{ width: `${Math.min(d.avg, 100)}%`, backgroundColor: DOMAIN_COLORS[i % 8] }} />
                </div>
                <span className="text-xs font-bold w-12 text-right" style={{ color: DOMAIN_COLORS[i % 8] }}>{d.avg}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress chart — only if multiple rounds */}
      {progressData.length > 1 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">📈 Class Progress Across Rounds</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`]} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line type="monotone" dataKey="overall" name="Overall" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="literacy" name="Literacy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="numeracy" name="Numeracy" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey={() => 80} name="Target (80%)" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Student ranking table for this round */}
      <div className="bg-white rounded-xl shadow p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Student Rankings — Round {activeRoundIdx + 1}</h4>
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
                .sort((a: any, b: any) => (b.rounds[activeRoundIdx].overall || 0) - (a.rounds[activeRoundIdx].overall || 0))
                .map((s: any, i: number) => {
                  const r = s.rounds[activeRoundIdx];
                  const lv = getLevel(r.overall || 0);
                  return (
                    <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 text-center font-bold text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800">{s.student_name}</td>
                      <td className="px-3 py-2 text-center font-bold text-blue-700">{r.literacy.avg?.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center font-bold text-orange-600">{r.numeracy.avg?.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lv.bg} ${lv.color}`}>{r.overall?.toFixed(1)}%</span>
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

// Sub-component: Read-only or editable marks table for existing rounds
function MarksTable({ students, roundKey, roundIdx, isEditing, localMarks, updateMark, LITERACY_DOMAINS, NUMERACY_DOMAINS, calcAvg, getLevel, onStudentClick }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" style={{ minWidth: `${400 + (LITERACY_DOMAINS.length + NUMERACY_DOMAINS.length) * 70}px` }}>
        <thead>
          <tr className="bg-indigo-700 text-white">
            <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[160px]">Student</th>
            {LITERACY_DOMAINS.map((d: string) => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[65px]"><span className="text-blue-200">📖</span> {d.substring(0, 5)}</th>)}
            <th className="px-2 py-2 text-center border-l border-indigo-500 bg-blue-800 min-w-[55px]">📖 Avg</th>
            {NUMERACY_DOMAINS.map((d: string) => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[65px]"><span className="text-orange-200">🔢</span> {d.substring(0, 5)}</th>)}
            <th className="px-2 py-2 text-center border-l border-indigo-500 bg-orange-800 min-w-[55px]">🔢 Avg</th>
            <th className="px-2 py-2 text-center border-l border-indigo-500 min-w-[65px]">Overall</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s: any, i: number) => {
            const rnd = s.rounds[roundIdx];
            const litVals = isEditing
              ? (localMarks[s.student_id]?.literacy || Object.fromEntries(LITERACY_DOMAINS.map((d: string) => [d, 0])))
              : (rnd?.exists ? rnd.literacy : Object.fromEntries(LITERACY_DOMAINS.map((d: string) => [d, 0])));
            const numVals = isEditing
              ? (localMarks[s.student_id]?.numeracy || Object.fromEntries(NUMERACY_DOMAINS.map((d: string) => [d, 0])))
              : (rnd?.exists ? rnd.numeracy : Object.fromEntries(NUMERACY_DOMAINS.map((d: string) => [d, 0])));
            const litAvg = calcAvg(litVals);
            const numAvg = calcAvg(numVals);
            const overall = (litAvg + numAvg) / 2;
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
                {LITERACY_DOMAINS.map((d: string) => (
                  <td key={d} className="px-1 py-1 text-center border-l border-gray-100">
                    {isEditing ? (
                      <input type="number" min={0} max={100} value={litVals[d] ?? 0}
                        onChange={e => updateMark(s.student_id, "literacy", d, +e.target.value)}
                        className="w-14 text-center border border-gray-300 rounded px-1 py-0.5 text-xs" />
                    ) : <span>{litVals[d] ?? 0}</span>}
                  </td>
                ))}
                <td className="px-2 py-2 text-center border-l border-blue-100 bg-blue-50">
                  <span className="font-bold text-blue-700">{litAvg.toFixed(0)}%</span>
                </td>
                {NUMERACY_DOMAINS.map((d: string) => (
                  <td key={d} className="px-1 py-1 text-center border-l border-gray-100">
                    {isEditing ? (
                      <input type="number" min={0} max={100} value={numVals[d] ?? 0}
                        onChange={e => updateMark(s.student_id, "numeracy", d, +e.target.value)}
                        className="w-14 text-center border border-gray-300 rounded px-1 py-0.5 text-xs" />
                    ) : <span>{numVals[d] ?? 0}</span>}
                  </td>
                ))}
                <td className="px-2 py-2 text-center border-l border-orange-100 bg-orange-50">
                  <span className="font-bold text-orange-700">{numAvg.toFixed(0)}%</span>
                </td>
                <td className="px-2 py-2 text-center border-l border-gray-100">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lv.bg} ${lv.color}`}>{overall.toFixed(0)}%</span>
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
    LITERACY_DOMAINS.forEach((d: string) => { domainAvgs[d] = domainAvgs[d] || []; domainAvgs[d].push(r.literacy[d] || 0); });
    NUMERACY_DOMAINS.forEach((d: string) => { domainAvgs[d] = domainAvgs[d] || []; domainAvgs[d].push(r.numeracy[d] || 0); });
  });
  const strengths: string[] = [], weaknesses: string[] = [];
  Object.entries(domainAvgs).forEach(([d, vals]) => {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (avg >= 80) strengths.push(`${d} — ${avg.toFixed(0)}%`);
    else if (avg < 60) weaknesses.push(`${d} — ${avg.toFixed(0)}%`);
  });

  const lastRound = rounds[rounds.length - 1];
  const litAvg = lastRound ? lastRound.literacy.avg : 0;
  const numAvg = lastRound ? lastRound.numeracy.avg : 0;
  const overall = lastRound ? lastRound.overall : 0;
  const lv = getLevel(overall);

  // Chart data for overall trend
  const chartData = rounds.map((r: any, i: number) => ({
    name: `Round ${i + 1}`,
    overall: r.overall,
    literacy: r.literacy.avg,
    numeracy: r.numeracy.avg,
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
                      <td className="px-3 py-2 text-center font-bold text-blue-700">{r.literacy.avg?.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center font-bold text-orange-600">{r.numeracy.avg?.toFixed(1)}%</td>
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
  const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
  const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
  const LITERACY_DOMAINS = ["Listening", "Speaking", "Reading", "Writing"];
  const NUMERACY_DOMAINS = ["Operations", "Base 10", "Measurement", "Geometry"];

  const combos: { grade: string; section: string }[] = [];
  if (mappings?.mappings) {
    const seen = new Set<string>();
    mappings.mappings.forEach((m: any) => {
      const key = `${m.grade}||${m.section}`;
      if (!seen.has(key)) { seen.add(key); combos.push({ grade: m.grade, section: m.section }); }
    });
  }

  const [selectedCombo, setSelectedCombo] = useState(combos[0] || null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [mode, setMode] = useState<"homework" | "assessment">("homework");
  const [numQ, setNumQ] = useState(10);
  const [qTypes, setQTypes] = useState("Mixed");
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { if (selectedCombo) fetchStudents(); }, [selectedCombo, academicYear]);

  const fetchStudents = async () => {
    try {
      const r = await axios.get(`${API}/baseline/section/rounds?grade=${encodeURIComponent(selectedCombo!.grade)}&section=${encodeURIComponent(selectedCombo!.section)}&academic_year=${academicYear}`);
      setStudents(r.data.students || []);
    } catch { }
  };

  const getStudentGaps = (student: any) => {
    const rounds = student.rounds.filter((r: any) => r.exists);
    if (!rounds.length) return { literacy: [], numeracy: [] };
    const last = rounds[rounds.length - 1];
    const litGaps = LITERACY_DOMAINS.filter(d => (last.literacy[d] || 0) < 60);
    const numGaps = NUMERACY_DOMAINS.filter(d => (last.numeracy[d] || 0) < 60);
    return { literacy: litGaps, numeracy: numGaps };
  };

  const generate = async () => {
    if (!selectedStudents.length) { setMsg("Select at least one student"); return; }
    setGenerating(true); setOutput(""); setMsg("");
    const selStudents = students.filter(s => selectedStudents.includes(s.student_id));

    const studentContext = selStudents.map(s => {
      const rounds = s.rounds.filter((r: any) => r.exists);
      const gaps = getStudentGaps(s);
      const last = rounds[rounds.length - 1];
      return `Student: ${s.student_name}
Overall: ${last ? last.overall.toFixed(1) + "%" : "Not assessed"}
Literacy gaps: ${gaps.literacy.join(", ") || "None"}
Numeracy gaps: ${gaps.numeracy.join(", ") || "None"}`;
    }).join("\n\n");

    const prompt = mode === "homework"
      ? `You are an expert school teacher creating a weekly homework plan for ${selectedCombo?.grade} students.

STUDENTS:
${studentContext}

Create a 5-day (Monday-Friday) homework plan addressing their gaps.
Each day must have minimum 3 questions per subject (Literacy and Numeracy).
Friday must have 5 check questions with answers.

FORMAT:
📖 LITERACY HOMEWORK
**MONDAY** — [Topic + competency code]
1. [task]
2. [task]
3. [task]
...
**FRIDAY — Mini Check**
1-5 questions + Answers

🔢 NUMERACY HOMEWORK
[Same format]

📝 Parent Note: [Brief note for each student]`
      : `You are an expert teacher creating a ${numQ}-question ${qTypes} assessment for ${selectedCombo?.grade} students.

STUDENTS AND GAPS:
${studentContext}

Create ${numQ} ${qTypes} questions targeting their specific gaps.
Include answer key at the end.
Questions must be appropriate for ${selectedCombo?.grade} level.`;

    try {
      const res = await fetch(GROQ_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], max_tokens: 2000 }),
      });
      const data = await res.json();
      setOutput(data.choices?.[0]?.message?.content || "No response from AI");
    } catch (e) { setMsg("❌ AI generation failed"); }
    setGenerating(false);
  };

  const download = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mode === "homework" ? "Homework" : "Assessment"}_${selectedCombo?.grade}_${selectedCombo?.section}_${new Date().toISOString().split("T")[0]}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (!combos.length) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No sections assigned.</div>;

  return (
    <div className="space-y-4 w-full max-w-4xl">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-purple-800 mb-1">🤖 AI Learning Module — Students</h3>
        <p className="text-xs text-purple-600">Generate personalized homework or assessment based on each student's baseline gaps.</p>
      </div>

      {/* Section selector */}
      <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
        {combos.map(c => (
          <button key={`${c.grade}-${c.section}`} onClick={() => setSelectedCombo(c)}
            className={`px-3 py-2 text-xs rounded-lg font-medium border ${selectedCombo?.grade === c.grade && selectedCombo?.section === c.section ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300"}`}>
            {c.grade} · {c.section}
          </button>
        ))}
      </div>

      {msg && <div className="px-4 py-2 bg-red-50 border border-red-300 rounded text-sm text-red-700">{msg}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Config */}
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Configuration</h3>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Mode</label>
            <div className="flex gap-2">
              {[{ id: "homework", label: "📝 Weekly Homework" }, { id: "assessment", label: "📋 Assessment Paper" }].map(m => (
                <button key={m.id} onClick={() => setMode(m.id as any)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border font-medium ${mode === m.id ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {mode === "assessment" && (
            <>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Questions: {numQ}</label>
                <input type="range" min={5} max={30} step={5} value={numQ} onChange={e => setNumQ(+e.target.value)} className="w-full accent-purple-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Type</label>
                <div className="flex gap-1 flex-wrap">
                  {["MCQ","Short","Fill","Mixed"].map(t => (
                    <button key={t} onClick={() => setQTypes(t)}
                      className={`px-3 py-1 text-xs rounded-lg border font-medium ${qTypes === t ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300"}`}>{t}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Student selector */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Select Students
            <button onClick={() => setSelectedStudents(students.map(s => s.student_id))} className="ml-2 text-xs text-purple-600 hover:underline">All</button>
            <button onClick={() => setSelectedStudents([])} className="ml-2 text-xs text-gray-400 hover:underline">Clear</button>
            <span className="ml-2 text-xs text-gray-400">({selectedStudents.length} selected)</span>
          </h3>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {students.map(s => {
              const gaps = getStudentGaps(s);
              const hasGaps = gaps.literacy.length + gaps.numeracy.length > 0;
              return (
                <label key={s.student_id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 ${selectedStudents.includes(s.student_id) ? "bg-purple-50" : ""}`}>
                  <input type="checkbox" checked={selectedStudents.includes(s.student_id)}
                    onChange={() => setSelectedStudents(prev => prev.includes(s.student_id) ? prev.filter(x => x !== s.student_id) : [...prev, s.student_id])}
                    className="accent-purple-600" />
                  <span className="text-xs text-gray-700">{s.student_name}</span>
                  {hasGaps && <span className="ml-auto text-xs text-red-500">⚠️ {gaps.literacy.length + gaps.numeracy.length} gaps</span>}
                </label>
              );
            })}
            {!students.length && <p className="text-xs text-gray-400 text-center py-4">No students assessed yet. Enter baseline marks first.</p>}
          </div>
        </div>
      </div>

      <button onClick={generate} disabled={generating}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50">
        {generating ? "🤖 Generating..." : `✨ Generate ${mode === "homework" ? "Homework Plan" : "Assessment Paper"}`}
      </button>

      {output && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Generated Output</h3>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(output)} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">📋 Copy</button>
              <button onClick={download} className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">⬇️ Download</button>
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
// SELF AI TAB — AI learning module for teacher's own baseline gaps
// ─────────────────────────────────────────────────────────────────
function SelfAITab({ user, academicYear }: any) {
  const GROQ_API2 = "https://api.groq.com/openai/v1/chat/completions";
  const GROQ_KEY2 = import.meta.env.VITE_GROQ_API_KEY || "";

  const STAGE_GRADE: Record<string,string> = { foundation:"Grade 2", preparatory:"Grade 5", middle:"Grade 8", secondary:"Grade 10" };
  const LIT_DOMAINS = ["Listening","Speaking","Reading","Writing"];
  const NUM_DOMAINS = ["Operations","Base 10","Measurement","Geometry"];
  const LIT_KEYS   = ["listening_score","speaking_score","reading_score","writing_score"];
  const NUM_KEYS   = ["operations_score","base10_score","measurement_score","geometry_score"];

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
    const litRounds = assessments.filter((a:any)=>a.subject==="literacy");
    const numRounds = assessments.filter((a:any)=>a.subject==="numeracy");
    const latestLit = litRounds[litRounds.length-1];
    const latestNum = numRounds[numRounds.length-1];

    const gaps: any[] = [];
    if (latestLit) {
      const avg = LIT_KEYS.reduce((s,k)=>s + Number(latestLit[k]||0),0)/LIT_KEYS.length;
      for (let i=0;i<LIT_KEYS.length;i++) {
        const sc = +(latestLit[LIT_KEYS[i]]||0);
        if (sc < avg && sc > 0) gaps.push({ domain:"Literacy", sub:LIT_DOMAINS[i], score:sc, subject:"literacy", stage:latestLit.stage||"foundation" });
      }
    }
    if (latestNum) {
      const avg = NUM_KEYS.reduce((s,k)=>s + Number(latestNum[k]||0),0)/NUM_KEYS.length;
      for (let i=0;i<NUM_KEYS.length;i++) {
        const sc = +(latestNum[NUM_KEYS[i]]||0);
        if (sc < avg && sc > 0) gaps.push({ domain:"Numeracy", sub:NUM_DOMAINS[i], score:sc, subject:"numeracy", stage:latestNum.stage||"foundation" });
      }
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
    const litRounds = assessments.filter((a:any)=>a.subject==="literacy");
    const numRounds = assessments.filter((a:any)=>a.subject==="numeracy");
    const latestLit = litRounds[litRounds.length-1];
    const latestNum = numRounds[numRounds.length-1];
    const litAvg = latestLit ? LIT_KEYS.reduce((s:number,k:string)=>s + Number(latestLit[k]||0),0)/LIT_KEYS.length : null;
    const numAvg = latestNum ? NUM_KEYS.reduce((s:number,k:string)=>s + Number(latestNum[k]||0),0)/NUM_KEYS.length : null;
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
Literacy Stage: ${latestLit?.stage||"—"} (Grade: ${STAGE_GRADE[latestLit?.stage||"foundation"]})
Numeracy Stage: ${latestNum?.stage||"—"} (Grade: ${STAGE_GRADE[latestNum?.stage||"foundation"]})

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
      setOutput(d.choices?.[0]?.message?.content || "No response from AI");
    } catch { setMsg("❌ AI generation failed. Check API key."); }
    setGenerating(false);
  };

  const assessments = baselineData?.assessments || [];
  const litRounds = assessments.filter((a:any)=>a.subject==="literacy");
  const numRounds = assessments.filter((a:any)=>a.subject==="numeracy");
  const latestLit = litRounds[litRounds.length-1];
  const latestNum = numRounds[numRounds.length-1];
  const litAvg = latestLit ? LIT_KEYS.reduce((s:number,k:string)=>s + Number(latestLit[k]||0),0)/LIT_KEYS.length : null;
  const numAvg = latestNum ? NUM_KEYS.reduce((s:number,k:string)=>s + Number(latestNum[k]||0),0)/NUM_KEYS.length : null;

  // Compute gaps for display
  const gapList: string[] = [];
  if (latestLit && litAvg !== null) LIT_DOMAINS.forEach((l,i) => { if (+(latestLit[LIT_KEYS[i]]||0) < litAvg!) gapList.push(`Literacy – ${l}`); });
  if (latestNum && numAvg !== null) NUM_DOMAINS.forEach((l,i) => { if (+(latestNum[NUM_KEYS[i]]||0) < numAvg!) gapList.push(`Numeracy – ${l}`); });

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

function PromotionTab({ user, mappings }: any) {
  const API = "https://cbas-backend-production.up.railway.app";
  const GRADE_ORDER = ["Pre-KG","LKG","UKG","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];
  const ALL_SECTIONS = ["Duke","Popeye","Daisy","Lotus","Orchid","Tulip","Eagle","Robin","Skylark","Asteroid","Comet","Galaxy","Apus","Pavo","Volans","Edison","Einstein","Kalam","Raman","Diamond","Emerald","Ruby","Ganga","Godavari","Kaveri","Sathya","Shanthi","Vedha","Jupiter","Mars","Mercury","Venus","Centaurus","Orion","Pegasus","Himalaya","Meru","Vindhya","Bendre","Karanth","Kuvempu"];

  // Derive class teacher info from mappings OR directly from user.class_teacher_of
  const rawCTO = (mappings?.class_teacher_of || user?.class_teacher_of || "").trim();
  const ctoParts = rawCTO.split(' ').filter(Boolean);
  const rawGrade = mappings?.class_grade || (ctoParts.length >= 3 ? ctoParts.slice(0,-1).join(' ') : ctoParts.length === 2 ? ctoParts[0] : "");
  const rawSection = mappings?.class_section || (ctoParts.length >= 2 ? ctoParts[ctoParts.length-1] : "");
  const classGrade = rawGrade && !/^grade\s/i.test(rawGrade) && !["Pre-KG","LKG","UKG"].includes(rawGrade) && /^\d+$/.test(rawGrade.trim()) ? `Grade ${rawGrade.trim()}` : rawGrade;
  const classSection = rawSection;
  const isClassTeacher = !!(classGrade && classSection);

  const nextGradeIdx = GRADE_ORDER.indexOf(classGrade) + 1;
  const nextGrade = nextGradeIdx < GRADE_ORDER.length ? GRADE_ORDER[nextGradeIdx] : null;

  const [students, setStudents] = useState<any[]>([]);
  // Per-student section selection
  const [studentSections, setStudentSections] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [defaultSection, setDefaultSection] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [step, setStep] = useState<"preview" | "confirm" | "done">("preview");
  const [loading, setLoading] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/students?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}`);
      const list = (r.data?.data || r.data || []).filter((s: any) => s.is_active !== false);
      setStudents(list);
      setSelectedIds(list.map((s: any) => s.id));
      // Default all students to same section
      const initSections: Record<string,string> = {};
      list.forEach((s: any) => { initSections[s.id] = ""; });
      setStudentSections(initSections);
      setStep("confirm");
    } catch { setMsg("❌ Could not load students."); }
    setLoading(false);
  };

  // Apply default section to all selected students
  const applyDefaultSection = (section: string) => {
    setDefaultSection(section);
    const updated: Record<string,string> = { ...studentSections };
    selectedIds.forEach(id => { updated[id] = section; });
    setStudentSections(updated);
  };

  const executePromotion = async () => {
    const missing = selectedIds.filter(id => !studentSections[id]);
    if (missing.length) { setMsg(`❌ Please select a section for all ${missing.length} student(s).`); return; }
    setPromoting(true);
    try {
      // Group students by their target section and promote each group
      const sectionGroups: Record<string, string[]> = {};
      selectedIds.forEach(id => {
        const sec = studentSections[id];
        if (!sectionGroups[sec]) sectionGroups[sec] = [];
        sectionGroups[sec].push(id);
      });

      let totalPromoted = 0;
      for (const [targetSection, ids] of Object.entries(sectionGroups)) {
        const r = await axios.post(`${API}/students/promotion/execute`, {
          grade: classGrade,
          section: classSection,
          new_section: targetSection,
          student_ids: ids,
        });
        totalPromoted += r.data?.promoted || ids.length;
      }
      setResult({ promoted: totalPromoted });
      setStep("done");
    } catch { setMsg("❌ Promotion failed. Try again."); }
    setPromoting(false);
  };

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (!isClassTeacher) {
    return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Only class teachers can access the Promotion tab.</div>;
  }

  if (!nextGrade) {
    return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Grade 10 is the final grade. No further promotion possible.</div>;
  }

  return (
    <div className="space-y-4 w-full max-w-4xl">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-800 mb-1">🎓 Student Promotion</h3>
        <p className="text-xs text-indigo-600">
          Promote students from <strong>{classGrade} · {classSection}</strong> to <strong>{nextGrade}</strong>.
          You can assign each student to a different section in {nextGrade}.
        </p>
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* Step 1 — Load */}
      {step === "preview" && (
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <p className="text-sm text-gray-600 mb-1">Your class: <strong>{classGrade} · {classSection}</strong></p>
          <p className="text-sm text-gray-600 mb-4">Will be promoted to: <strong>{nextGrade}</strong></p>
          <button onClick={loadStudents} disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50">
            {loading ? "Loading..." : "📋 Load Student List"}
          </button>
        </div>
      )}

      {/* Step 2 — Confirm with per-student section */}
      {step === "confirm" && students.length > 0 && (
        <div className="space-y-4">
          {/* Default section apply to all */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Apply same section to all students</h3>
            <div className="flex gap-3 items-center">
              <select value={defaultSection} onChange={e => applyDefaultSection(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 max-w-xs">
                <option value="">-- Select default section for all --</option>
                {ALL_SECTIONS.map(s => <option key={s} value={s}>{nextGrade} · {s}</option>)}
              </select>
              <span className="text-xs text-gray-400">Or assign individually per student below</span>
            </div>
          </div>

          {/* Student list with individual section selection */}
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
                  <tr className="bg-indigo-700 text-white text-xs">
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2 text-left">Student Name</th>
                    <th className="px-3 py-2 text-left">Admission No</th>
                    <th className="px-3 py-2 text-left min-w-[200px]">New Section in {nextGrade} *</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s: any, i: number) => (
                    <tr key={s.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${!selectedIds.includes(s.id) ? "opacity-40" : ""}`}>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleStudent(s.id)} className="accent-indigo-600" />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">{s.name}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{s.admission_no || "—"}</td>
                      <td className="px-3 py-2">
                        <select
                          value={studentSections[s.id] || ""}
                          onChange={e => setStudentSections(prev => ({ ...prev, [s.id]: e.target.value }))}
                          disabled={!selectedIds.includes(s.id)}
                          className={`border rounded px-2 py-1 text-xs w-full ${!studentSections[s.id] && selectedIds.includes(s.id) ? "border-red-300 bg-red-50" : "border-gray-300"}`}>
                          <option value="">-- Select section --</option>
                          {ALL_SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-bold text-yellow-800 mb-1">⚠️ Important</p>
            <ul className="text-xs text-yellow-700 space-y-1 list-disc ml-4">
              <li>Students will be moved to {nextGrade} with their selected sections immediately.</li>
              <li>All historical PA/SA marks, activities, and competency scores are preserved.</li>
              <li>Unselected students remain in {classGrade} · {classSection}.</li>
              <li>This cannot be undone from the teacher dashboard.</li>
            </ul>
          </div>

          <button onClick={executePromotion} disabled={promoting || !selectedIds.length}
            className="px-6 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50">
            {promoting ? "Promoting..." : `✅ Promote ${selectedIds.length} Students to ${nextGrade}`}
          </button>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === "done" && result && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-green-700 mb-2">Promotion Complete!</h3>
          <p className="text-gray-600">{result.promoted} students promoted to <strong>{nextGrade}</strong></p>
          <p className="text-sm text-gray-400 mt-1">Each student assigned to their selected section.</p>
          <button onClick={() => { setStep("preview"); setStudents([]); setResult(null); setMsg(""); }}
            className="mt-4 px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
            ↩ Back
          </button>
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
function ExamConfigTab({ user, mappings, academicYear }: any) {
  const API = "https://cbas-backend-production.up.railway.app";
  const EXAM_TYPES = ["PA1","PA2","SA1","PA3","PA4","SA2","Custom"];
  const grade = mappings?.class_grade || user?.class_teacher_of?.split(' ').slice(0,-1).join(' ') || "";

  const [examType, setExamType] = useState("PA1");
  const [customExam, setCustomExam] = useState("");
  const [subjects, setSubjects] = useState<{subject:string;max_marks:number}[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newMax, setNewMax] = useState(100);
  const [examDate, setExamDate] = useState("");
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);

  const effectiveExam = examType === "Custom" ? customExam : examType;

  useEffect(() => { if (grade && effectiveExam) loadConfig(); }, [grade, effectiveExam, academicYear]);

  const loadConfig = async () => {
    try {
      const r = await axios.get(`${API}/pasa/config?academic_year=${academicYear}&exam_type=${effectiveExam}&grade=${encodeURIComponent(grade)}`);
      if (r.data?.length) {
        setSubjects(r.data.map((c: any) => ({ subject: c.subject, max_marks: +c.max_marks })));
        setExamDate(r.data[0]?.exam_date || "");
      } else { setSubjects([]); }
    } catch {}
  };

  const saveConfig = async () => {
    if (!grade) { setMsg("❌ No class assigned."); return; }
    if (!effectiveExam) { setMsg("❌ Enter exam name."); return; }
    if (!subjects.length) { setMsg("❌ Add at least one subject."); return; }
    try {
      await axios.post(`${API}/pasa/config`, { academic_year: academicYear, exam_type: effectiveExam, grade, subjects, exam_date: examDate || undefined });
      setMsg("✅ Config saved — visible in admin login");
      setSaved(true);
    } catch { setMsg("❌ Error saving"); }
    setTimeout(() => setMsg(""), 4000);
  };

  const addSubject = () => {
    if (!newSubject.trim()) return;
    setSubjects(prev => [...prev, { subject: newSubject.trim().toUpperCase(), max_marks: newMax }]);
    setNewSubject(""); setNewMax(100); setSaved(false);
  };

  const isClassTeacher = !!(mappings?.class_grade || user?.class_teacher_of);
  if (!isClassTeacher) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Only class teachers can configure exams.</div>;

  return (
    <div className="space-y-4 w-full max-w-2xl">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-800">⚙️ Exam Configuration — {grade}</h3>
        <p className="text-xs text-indigo-600 mt-0.5">Configure subjects and max marks. Changes reflect in admin login.</p>
      </div>
      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Exam Type</label>
            <select value={examType} onChange={e => { setExamType(e.target.value); setSaved(false); }} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
              {EXAM_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {examType === "Custom" && (
            <div><label className="text-xs text-gray-500 block mb-1">Custom Name</label>
              <input value={customExam} onChange={e => setCustomExam(e.target.value)} placeholder="e.g. Unit Test 1" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>
          )}
          <div><label className="text-xs text-gray-500 block mb-1">Exam Date</label>
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>
        </div>
        {subjects.length > 0 && (
          <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
            {subjects.map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-bold text-indigo-700">{s.subject}</span>
                <span className="text-xs text-gray-400">Max:</span>
                <input type="number" value={s.max_marks}
                  onChange={e => setSubjects(prev => prev.map((x, j) => j === i ? { ...x, max_marks: +e.target.value } : x))}
                  className="w-16 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center font-bold text-indigo-700" />
                <button onClick={() => setSubjects(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end flex-wrap">
          <div><label className="text-xs text-gray-500 block mb-1">Add Subject</label>
            <input value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubject()} placeholder="e.g. MATHEMATICS" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-44" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Max Marks</label>
            <input type="number" value={newMax} onChange={e => setNewMax(+e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-24" /></div>
          <button onClick={addSubject} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200">+ Add</button>
          <button onClick={saveConfig} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">💾 Save Config</button>
        </div>
        {saved && <p className="text-xs text-green-600">✅ Saved for {grade} · {effectiveExam} · {academicYear}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BASELINE ENTRY TAB
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

  // Compute section stats from rounds data
  const computeSectionStats = () => {
    if (!sectionDash?.students?.length) return null;
    const students = sectionDash.students;
    // Get latest round data
    const latestRound = sectionDash.rounds?.[sectionDash.rounds.length - 1];
    if (!latestRound) return null;

    const calcAvg = (marks: Record<string,number>) => {
      const v = Object.entries(marks).filter(([k,x]) => k !== 'avg' && x > 0).map(([,x]) => x);
      return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0;
    };
    const getLvl = (s: number) => s >= 80 ? "L4" : s >= 60 ? "L3" : s >= 40 ? "L2" : "L1";

    const studentStats = students.map((s: any) => {
      const rnd = s.rounds?.find((r: any) => r.round === latestRound);
      if (!rnd?.exists) return null;
      const lit = calcAvg(rnd.literacy || {});
      const num = calcAvg(rnd.numeracy || {});
      const overall = (lit + num) / 2;
      return { name: s.student_name, lit, num, overall, level: getLvl(overall) };
    }).filter(Boolean);

    if (!studentStats.length) return null;
    const litAvg = studentStats.reduce((a: number, s: any) => a + s.lit, 0) / studentStats.length;
    const numAvg = studentStats.reduce((a: number, s: any) => a + s.num, 0) / studentStats.length;
    const overallAvg = studentStats.reduce((a: number, s: any) => a + s.overall, 0) / studentStats.length;
    const levelDist = { L4: 0, L3: 0, L2: 0, L1: 0 } as Record<string,number>;
    studentStats.forEach((s: any) => levelDist[s.level] = (levelDist[s.level] || 0) + 1);
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
  const LITERACY_DOMAINS2 = ["Listening", "Speaking", "Reading", "Writing"];
  const NUMERACY_DOMAINS2 = ["Operations", "Base 10", "Measurement", "Geometry"];
  const GRADE_TO_STAGE2: Record<string, string> = {
    "Pre-KG": "foundation", "LKG": "foundation", "UKG": "foundation",
    "Grade 1": "foundation", "Grade 2": "foundation",
    "Grade 3": "preparatory", "Grade 4": "preparatory", "Grade 5": "preparatory",
    "Grade 6": "middle", "Grade 7": "middle", "Grade 8": "middle",
    "Grade 9": "secondary", "Grade 10": "secondary",
  };

  const classGrade = mappings?.class_grade || (user?.class_teacher_of || "").trim().split(' ').slice(0,-1).join(' ');
  const classSection = mappings?.class_section || (user?.class_teacher_of || "").trim().split(' ').pop();

  const [sectionData, setSectionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [localMarks, setLocalMarks] = useState<Record<string, any>>({});
  const [activeRoundIdx, setActiveRoundIdx] = useState(0);
  const [newRoundOpen, setNewRoundOpen] = useState(false);

  useEffect(() => { if (classGrade && classSection) fetchRounds(); }, [classGrade, classSection, academicYear]);

  const fetchRounds = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/baseline/section/rounds?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}&academic_year=${academicYear}`);
      setSectionData(r.data);
      setNewRoundOpen(!r.data?.total_rounds);
      setActiveRoundIdx(Math.max(0, (r.data?.total_rounds || 1) - 1));
    } catch { setSectionData(null); }
    setLoading(false);
  };

  const stage = GRADE_TO_STAGE2[classGrade] || "middle";

  const initMarks = (roundData?: any) => {
    const m: Record<string, any> = {};
    (sectionData?.students || []).forEach((s: any) => {
      if (roundData) {
        const rnd = s.rounds?.find((r: any) => r.round === roundData.round);
        if (rnd?.exists) { m[s.student_id] = { literacy: { ...rnd.literacy }, numeracy: { ...rnd.numeracy } }; return; }
      }
      m[s.student_id] = { literacy: Object.fromEntries(LITERACY_DOMAINS2.map(d => [d, 0])), numeracy: Object.fromEntries(NUMERACY_DOMAINS2.map(d => [d, 0])) };
    });
    setLocalMarks(m);
  };

  const calcAvg = (marks: Record<string, number>) => { const vals = Object.values(marks).filter(v => v >= 0); return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; };

  const getLvl = (score: number) => score >= 80 ? { label: "Exceeding", bg: "bg-green-100 text-green-800" } : score >= 60 ? { label: "Meeting", bg: "bg-blue-100 text-blue-800" } : score >= 40 ? { label: "Approaching", bg: "bg-yellow-100 text-yellow-800" } : { label: "Beginning", bg: "bg-red-100 text-red-800" };

  const saveRound = async (roundKey: string) => {
    setSaving(true);
    try {
      const entries = (sectionData?.students || []).map((s: any) => ({ student_id: s.student_id, student_name: s.student_name, literacy: localMarks[s.student_id]?.literacy || {}, numeracy: localMarks[s.student_id]?.numeracy || {} }));
      await axios.post(`${API}/baseline/section/round`, { grade: classGrade, section: classSection, academic_year: academicYear, round: roundKey, stage, entries });
      setMsg("✅ Round saved"); fetchRounds(); setNewRoundOpen(false);
    } catch { setMsg("❌ Error saving"); }
    setSaving(false); setTimeout(() => setMsg(""), 3000);
  };

  if (!classGrade || !classSection) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No class assigned. Only class teachers can enter baseline data.</div>;
  if (loading) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Loading...</div>;

  const rounds = sectionData?.rounds || [];
  const students = sectionData?.students || [];
  const nextRound = `baseline_${(rounds.length + 1)}`;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-indigo-800">{classGrade} — {classSection}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Stage: {stage.charAt(0).toUpperCase() + stage.slice(1)} · {students.length} students · {rounds.length} round(s) completed</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setNewRoundOpen(true); initMarks(); }} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">+ New Round</button>
        </div>
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* Round tabs */}
      {rounds.length > 0 && (
        <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
          {rounds.map((rk: string, i: number) => (
            <button key={rk} onClick={() => { setActiveRoundIdx(i); setNewRoundOpen(false); initMarks(sectionData?.students?.[0]?.rounds?.find((r: any) => r.round === rk)); }}
              className={`px-4 py-2 text-sm rounded-lg font-medium border ${activeRoundIdx === i && !newRoundOpen ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300"}`}>
              Round {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* New round entry */}
      {newRoundOpen && (
        <div className="bg-white rounded-xl shadow border border-indigo-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-200">
            <h3 className="text-sm font-bold text-indigo-800">+ Entering Round {rounds.length + 1} — {classGrade} {classSection}</h3>
            <button onClick={() => saveRound(nextRound)} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
              {saving ? "Saving..." : "💾 Save Round"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: `${400 + (LITERACY_DOMAINS2.length + NUMERACY_DOMAINS2.length) * 70}px` }}>
              <thead>
                <tr className="bg-indigo-700 text-white">
                  <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[180px]">Student</th>
                  {LITERACY_DOMAINS2.map(d => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[70px]">📖 {d.substring(0,5)}</th>)}
                  <th className="px-2 py-2 text-center border-l border-indigo-500 bg-indigo-800">Lit%</th>
                  {NUMERACY_DOMAINS2.map(d => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[70px]">🔢 {d.substring(0,5)}</th>)}
                  <th className="px-2 py-2 text-center border-l border-indigo-500 bg-indigo-800">Num%</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any, i: number) => {
                  const marks = localMarks[s.student_id] || { literacy: {}, numeracy: {} };
                  const litAvg = calcAvg(marks.literacy);
                  const numAvg = calcAvg(marks.numeracy);
                  return (
                    <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit">{s.student_name}</td>
                      {LITERACY_DOMAINS2.map(d => (
                        <td key={d} className="px-1 py-1 text-center border-l border-gray-100">
                          <input type="number" min={0} max={100} value={marks.literacy[d] || 0}
                            onChange={e => setLocalMarks(prev => ({ ...prev, [s.student_id]: { ...prev[s.student_id], literacy: { ...prev[s.student_id]?.literacy, [d]: +e.target.value } } }))}
                            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs" />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center border-l border-gray-200">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(litAvg).bg}`}>{litAvg.toFixed(0)}%</span>
                      </td>
                      {NUMERACY_DOMAINS2.map(d => (
                        <td key={d} className="px-1 py-1 text-center border-l border-gray-100">
                          <input type="number" min={0} max={100} value={marks.numeracy[d] || 0}
                            onChange={e => setLocalMarks(prev => ({ ...prev, [s.student_id]: { ...prev[s.student_id], numeracy: { ...prev[s.student_id]?.numeracy, [d]: +e.target.value } } }))}
                            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs" />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center border-l border-gray-200">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(numAvg).bg}`}>{numAvg.toFixed(0)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Previous round view */}
      {!newRoundOpen && rounds.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700">Round {activeRoundIdx + 1} Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-indigo-700 text-white">
                  <th className="px-3 py-2 text-left">Student</th>
                  {LITERACY_DOMAINS2.map(d => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600">{d.substring(0,5)}</th>)}
                  <th className="px-2 py-2 text-center border-l border-indigo-500">Lit%</th>
                  {NUMERACY_DOMAINS2.map(d => <th key={d} className="px-2 py-2 text-center border-l border-indigo-600">{d.substring(0,5)}</th>)}
                  <th className="px-2 py-2 text-center border-l border-indigo-500">Num%</th>
                  <th className="px-2 py-2 text-center border-l border-indigo-500">Level</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any, i: number) => {
                  const rnd = s.rounds?.find((r: any) => r.round === rounds[activeRoundIdx]);
                  if (!rnd?.exists) return <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}><td className="px-3 py-2 text-gray-400">{s.student_name}</td><td colSpan={10} className="px-2 py-2 text-gray-300 text-center">No data</td></tr>;
                  const litAvg = calcAvg(rnd.literacy || {});
                  const numAvg = calcAvg(rnd.numeracy || {});
                  const overall = (litAvg + numAvg) / 2;
                  return (
                    <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 font-medium text-gray-800">{s.student_name}</td>
                      {LITERACY_DOMAINS2.map(d => <td key={d} className="px-2 py-2 text-center border-l border-gray-100">{rnd.literacy?.[d] ?? "—"}</td>)}
                      <td className="px-2 py-2 text-center border-l border-gray-200"><span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(litAvg).bg}`}>{litAvg.toFixed(0)}%</span></td>
                      {NUMERACY_DOMAINS2.map(d => <td key={d} className="px-2 py-2 text-center border-l border-gray-100">{rnd.numeracy?.[d] ?? "—"}</td>)}
                      <td className="px-2 py-2 text-center border-l border-gray-200"><span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(numAvg).bg}`}>{numAvg.toFixed(0)}%</span></td>
                      <td className="px-2 py-2 text-center border-l border-gray-200"><span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLvl(overall).bg}`}>{getLvl(overall).label}</span></td>
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
