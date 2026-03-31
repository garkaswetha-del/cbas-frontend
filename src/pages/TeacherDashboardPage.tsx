import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const API = "http://localhost:3000";
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = "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";

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
  const [activeTab, setActiveTab] = useState<"profile" | "students" | "class" | "pasa" | "activities" | "promotion" | "examconfig" | "alerts" | "appraisal" | "baseline" | "homework">("profile");
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

  const TABS = [
    { id: "profile",    label: "👤 My Profile",      show: true },
    { id: "students",   label: "📚 My Students",     show: true },
    { id: "class",      label: "🏛 My Class",        show: !!mappings?.is_class_teacher },
    { id: "pasa",       label: "✏️ PA/SA",            show: true },
    { id: "examconfig", label: "⚙️ Exam Config",      show: !!mappings?.is_class_teacher },
    { id: "activities", label: "🎯 Activities",       show: true },
    { id: "alerts",     label: "⚠️ Alerts",           show: true },
    { id: "promotion",  label: "🎓 Promotion",        show: !!mappings?.is_class_teacher },
    { id: "appraisal",  label: "📋 My Appraisal",    show: true },
    { id: "baseline",   label: "📈 My Baseline",     show: true },
    { id: "homework",   label: "🤖 AI Homework",     show: true },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Teacher Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome, {user?.name} · {user?.role}</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.filter(t => t.show).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${activeTab === t.id ? "bg-indigo-600 text-white shadow" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "profile"     && <ProfileTab user={user} />}
      {activeTab === "students"    && <StudentsTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "class"       && <ClassTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "pasa"        && <PASATab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "examconfig"  && <ExamConfigTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "activities"  && <ActivitiesTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "alerts"      && <AlertsTab user={user} mappings={mappings} academicYear={academicYear} />}
      {activeTab === "promotion"   && <PromotionTab user={user} mappings={mappings} />}
      {activeTab === "appraisal"   && <AppraisalTab user={user} academicYear={academicYear} />}
      {activeTab === "baseline"    && <BaselineTab user={user} academicYear={academicYear} />}
      {activeTab === "homework"    && <HomeworkTab user={user} mappings={mappings} academicYear={academicYear} />}
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
              <div className="grid grid-cols-4 gap-3">
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
                <div className="grid grid-cols-2 gap-4">
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

  const fetchData = async () => {
    setLoading(true);
    try {
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
        <div className="flex gap-2 flex-wrap">
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
          students={[]}
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
  const [sectionData, setSectionData] = useState<Record<string, any>>({});
  const [baselineData, setBaselineData] = useState<any[]>([]);
  const [activitiesData, setActivitiesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const classGrade = mappings?.class_grade || "";
  const classSection = mappings?.class_section || "";

  useEffect(() => {
    if (classGrade && classSection) fetchData();
  }, [classGrade, classSection, academicYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const examData: Record<string, any> = {};
      await Promise.all(EXAM_TYPES.map(async exam => {
        try {
          const r = await axios.get(`${API}/pasa/analysis/section?academic_year=${academicYear}&exam_type=${exam}&grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}`);
          if (r.data?.students_ranked?.length) examData[exam] = r.data;
        } catch { }
      }));
      setSectionData(examData);
      try { const r = await axios.get(`${API}/baseline/section?academic_year=${academicYear}&grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}`); setBaselineData(r.data || []); } catch { }
      try { const r = await axios.get(`${API}/activities/section?academic_year=${academicYear}&grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}`); setActivitiesData(r.data || []); } catch { }
    } catch { }
    setLoading(false);
  };

  if (!mappings?.is_class_teacher) {
    return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400"><p className="text-sm">You are not assigned as a class teacher.</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-indigo-800">🏛 Class Teacher — {classGrade} · Section {classSection}</p>
        <p className="text-xs text-indigo-600 mt-0.5">Showing all subjects for your full class</p>
      </div>
      {loading ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400"><p className="text-sm">Loading...</p></div>
      ) : (
        <StudentAnalysisView
          students={[]}
          subjects={null}
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
  if (!data) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400"><p className="text-sm">No appraisal data found for {academicYear}.</p></div>;

  const score = n(data.total_score || data.final_score);
  const maxScore = n(data.max_score || 100);
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;

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
            <p className="text-3xl font-bold" style={{ color: pct >= 80 ? "#10b981" : pct >= 60 ? "#6366f1" : pct >= 40 ? "#f59e0b" : "#ef4444" }}>{score}</p>
            <p className="text-xs text-gray-400">out of {maxScore}</p>
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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [academicYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/baseline/teacher/${user.id}?academic_year=${academicYear}`);
      setData(r.data);
    } catch { setData(null); }
    setLoading(false);
  };

  if (loading) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400"><p className="text-sm">Loading...</p></div>;
  if (!data) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400"><p className="text-sm">No baseline data found for {academicYear}.</p></div>;

  // Assessments array — one per round
  const assessments: any[] = data.assessments || [];
  // Current year assessment (or latest)
  const current = assessments.find((a: any) => a.academic_year === academicYear) || assessments[assessments.length - 1];

  const domains = [
    { key: "listening_score",  label: "Listening" },
    { key: "speaking_score",   label: "Speaking" },
    { key: "reading_score",    label: "Reading" },
    { key: "writing_score",    label: "Writing" },
    { key: "operations_score", label: "Operations" },
    { key: "base10_score",     label: "Base 10" },
    { key: "measurement_score",label: "Measurement" },
    { key: "geometry_score",   label: "Geometry" },
  ].filter(d => current?.[d.key] != null);

  // Longitudinal: overall_score across rounds/years
  const longitudinal = assessments
    .filter((a: any) => a.overall_score != null)
    .sort((a: any, b: any) => (a.academic_year > b.academic_year ? 1 : -1))
    .map((a: any) => ({
      year: a.academic_year,
      round: a.round,
      overall: +a.overall_score,
      literacy: a.literacy_total ? +a.literacy_total : null,
      numeracy: a.numeracy_total ? +a.numeracy_total : null,
      label: `${a.academic_year} (${a.round || "R1"})`,
    }));

  // Consecutive decline: last 3 entries declining
  const hasDecline = longitudinal.length >= 3 &&
    longitudinal[longitudinal.length - 1].overall < longitudinal[longitudinal.length - 2].overall &&
    longitudinal[longitudinal.length - 2].overall < longitudinal[longitudinal.length - 3].overall;

  // Download Report Card as HTML
  const downloadReportCard = () => {
    const domainRows = domains.map(d => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${d.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:bold;color:${+(current[d.key]||0)>=80?"#16a34a":+(current[d.key]||0)>=60?"#2563eb":+(current[d.key]||0)>=40?"#d97706":"#dc2626"}">
          ${+(current[d.key]||0).toFixed(1)}%
        </td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Baseline Report Card — ${user?.name}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 720px; margin: 40px auto; color: #111; }
  h1 { color: #4338ca; margin-bottom: 4px; }
  .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
  .kpi { display: flex; gap: 16px; margin-bottom: 24px; }
  .kpi-card { flex: 1; background: #f5f3ff; border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 8px; }
  .kpi-card .val { font-size: 22px; font-weight: bold; color: #4338ca; }
  .kpi-card .lbl { font-size: 12px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { background: #4338ca; color: white; padding: 10px 12px; text-align: left; }
  tr:nth-child(even) { background: #f9fafb; }
  .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  .alert { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; color: #dc2626; font-size: 13px; }
</style></head>
<body>
  <h1>Baseline Assessment Report Card</h1>
  <p class="subtitle">${user?.name} &nbsp;·&nbsp; ${user?.role} &nbsp;·&nbsp; Academic Year: ${current?.academic_year || academicYear} &nbsp;·&nbsp; Round: ${current?.round || "—"} &nbsp;·&nbsp; Stage: ${current?.stage || "—"}</p>
  ${hasDecline ? `<div class="alert">⚠️ Consecutive Decline Detected — Overall score has dropped in the last 3 assessments.</div>` : ""}
  <div class="kpi">
    <div class="kpi-card"><div class="val">${current?.overall_score != null ? (+current.overall_score).toFixed(1) + "%" : "—"}</div><div class="lbl">Overall Score</div></div>
    <div class="kpi-card"><div class="val">${current?.literacy_total != null ? (+current.literacy_total).toFixed(1) + "%" : "—"}</div><div class="lbl">Literacy Total</div></div>
    <div class="kpi-card"><div class="val">${current?.numeracy_total != null ? (+current.numeracy_total).toFixed(1) + "%" : "—"}</div><div class="lbl">Numeracy Total</div></div>
    <div class="kpi-card"><div class="val">${current?.level || current?.proficiency_level || "—"}</div><div class="lbl">Level</div></div>
  </div>
  <table>
    <thead><tr><th>Domain</th><th>Score</th></tr></thead>
    <tbody>${domainRows}</tbody>
  </table>
  ${current?.learning_gaps?.length ? `<h3 style="margin-top:24px;color:#dc2626;">Learning Gaps</h3><p style="font-size:13px;color:#374151;">${Array.isArray(current.learning_gaps) ? current.learning_gaps.join(", ") : current.learning_gaps}</p>` : ""}
  ${longitudinal.length > 1 ? `
  <h3 style="margin-top:24px;">Longitudinal — Overall Score Trend</h3>
  <table>
    <thead><tr><th>Year</th><th>Round</th><th>Overall %</th><th>Literacy %</th><th>Numeracy %</th></tr></thead>
    <tbody>${longitudinal.map(r => `<tr><td style="padding:6px 12px">${r.year}</td><td style="padding:6px 12px">${r.round}</td><td style="padding:6px 12px;font-weight:bold">${r.overall.toFixed(1)}%</td><td style="padding:6px 12px">${r.literacy != null ? r.literacy.toFixed(1)+"%" : "—"}</td><td style="padding:6px 12px">${r.numeracy != null ? r.numeracy.toFixed(1)+"%" : "—"}</td></tr>`).join("")}</tbody>
  </table>` : ""}
  <div class="footer">Generated by CBAS — Wisdom Techno School &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Baseline_ReportCard_${user?.name?.replace(/\s+/g, "_")}_${academicYear}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const subjects = data.subjects || Object.keys(data.subject_scores || {});

  return (
    <div className="max-w-3xl space-y-4">
      {/* Consecutive Decline Alert */}
      {hasDecline && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-red-800">Consecutive Decline Detected</p>
            <p className="text-xs text-red-600 mt-0.5">Your overall baseline score has dropped in the last 3 consecutive assessments: {longitudinal.slice(-3).map(r => `${r.overall.toFixed(1)}%`).join(" → ")}</p>
          </div>
        </div>
      )}

      {/* Summary + Download */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">{user?.name} — Baseline Assessment</h2>
            <p className="text-sm text-gray-500">{current?.academic_year || academicYear} · Round: {current?.round || "—"} · Stage: {current?.stage || "—"}</p>
          </div>
          <button onClick={downloadReportCard}
            className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-1">
            ⬇️ Download Report Card
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Overall Score", value: current?.overall_score != null ? fmtPct(n(current.overall_score)) : "—", color: "border-indigo-500" },
            { label: "Literacy", value: current?.literacy_total != null ? fmtPct(n(current.literacy_total)) : "—", color: "border-blue-500" },
            { label: "Numeracy", value: current?.numeracy_total != null ? fmtPct(n(current.numeracy_total)) : "—", color: "border-green-500" },
            { label: "Level", value: current?.level || current?.proficiency_level || "—", color: "border-purple-500" },
          ].map(s => (
            <div key={s.label} className={`bg-gray-50 rounded-xl p-4 border-l-4 ${s.color}`}>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-bold text-gray-800">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Domain breakdown */}
      {domains.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Scores</h3>
          <div className="space-y-2">
            {domains.map((d, i) => {
              const score = n(current[d.key]);
              return (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 w-28 shrink-0">{d.label}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(score, 100)}%`, backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                  </div>
                  <span className={`text-xs font-bold w-14 text-right ${scoreBg(score)} px-1.5 py-0.5 rounded-full`}>{score.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      {domains.length > 1 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain Score Chart</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={domains.map(d => ({ name: d.label, score: n(current[d.key]) }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
              <Tooltip formatter={(v: any) => [`${v}%`, "Score"]} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {domains.map((_, i) => <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Longitudinal trend */}
      {longitudinal.length > 1 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">📈 Longitudinal — Score Trend Across Rounds</h3>
          <p className="text-xs text-gray-400 mb-3">Overall % · Literacy · Numeracy across all assessed rounds</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={longitudinal} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any, name: any) => [`${Number(v).toFixed(1)}%`, name]} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line type="monotone" dataKey="overall" name="Overall" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="literacy" name="Literacy" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="numeracy" name="Numeracy" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>

          {/* Year-wise table */}
          <table className="w-full text-xs border-collapse mt-3">
            <thead>
              <tr className="bg-indigo-700 text-white">
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-center">Round</th>
                <th className="px-3 py-2 text-center">Overall %</th>
                <th className="px-3 py-2 text-center">Literacy %</th>
                <th className="px-3 py-2 text-center">Numeracy %</th>
                <th className="px-3 py-2 text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {longitudinal.map((row, i) => {
                const prev = i > 0 ? longitudinal[i - 1].overall : null;
                const trend = prev == null ? "—" : row.overall > prev ? "▲" : row.overall < prev ? "▼" : "→";
                const tColor = trend === "▲" ? "text-green-600" : trend === "▼" ? "text-red-500" : "text-gray-400";
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 font-bold text-indigo-700">{row.year}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{row.round}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${scoreBg(row.overall)}`}>{row.overall.toFixed(1)}%</span>
                    </td>
                    <td className="px-3 py-2 text-center">{row.literacy != null ? `${row.literacy.toFixed(1)}%` : "—"}</td>
                    <td className="px-3 py-2 text-center">{row.numeracy != null ? `${row.numeracy.toFixed(1)}%` : "—"}</td>
                    <td className={`px-3 py-2 text-center font-bold text-lg ${tColor}`}>{trend}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Learning gaps */}
      {(current?.learning_gaps?.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-2">📌 Learning Gaps</h3>
          <div className="flex gap-2 flex-wrap">
            {(Array.isArray(current.learning_gaps) ? current.learning_gaps : [current.learning_gaps]).map((g: string, i: number) => (
              <span key={i} className="text-xs bg-white text-red-700 border border-red-300 px-2 py-1 rounded-lg">{g}</span>
            ))}
          </div>
        </div>
      )}

      {/* Subject-wise (legacy fallback) */}
      {subjects.length > 0 && !domains.length && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Performance</h3>
          <div className="space-y-3">
            {subjects.map((sub: string, i: number) => {
              const score = n(data.subject_scores?.[sub] ?? data.subjects?.[i]?.score);
              const max = n(data.subject_max?.[sub] ?? data.subjects?.[i]?.max ?? 100);
              const pct = max > 0 ? (score / max) * 100 : 0;
              return (
                <div key={sub} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{sub}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(pct)}`}>{score}/{max} ({fmtPct(pct)})</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// PA/SA TAB — Marks Entry + Full Analysis (teacher's subjects only)
// ─────────────────────────────────────────────────────────────────
function PASATab({ user, mappings, academicYear }: any) {
  const API = "http://localhost:3000";
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
      // If no configs but students exist, build a minimal table with just the teacher's subject
      let data = r.data;
      if ((!data?.configs?.length || !data?.subjects?.length) && data?.students?.length) {
        // Inject teacher's subject as a config so marks can still be entered
        data = {
          ...data,
          subjects: [selectedCombo.subject],
          configs: [{ subject: selectedCombo.subject, max_marks: 100, exam_type: selectedExam, grade: selectedCombo.grade }],
          students: data.students.map((s: any) => ({
            ...s,
            subjects: { ...s.subjects, [selectedCombo.subject]: s.subjects?.[selectedCombo.subject] || { marks: null, max_marks: 100, percentage: null, is_absent: false } },
          })),
        };
      }
      // If no students at all, fetch them directly
      if (!data?.students?.length) {
        const sr = await axios.get(`${API}/students?grade=${encodeURIComponent(selectedCombo.grade)}&section=${encodeURIComponent(selectedCombo.section)}`);
        const students = (sr.data?.data || sr.data || []).filter((s: any) => s.is_active !== false);
        data = {
          students: students.map((s: any) => ({
            student_id: s.id, student_name: s.name, roll_number: s.admission_no,
            subjects: { [selectedCombo.subject]: { marks: null, max_marks: 100, percentage: null, is_absent: false } },
          })),
          subjects: [selectedCombo.subject],
          configs: [{ subject: selectedCombo.subject, max_marks: 100 }],
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
      // Even on error, try to load students directly
      try {
        const sr = await axios.get(`${API}/students?grade=${encodeURIComponent(selectedCombo.grade)}&section=${encodeURIComponent(selectedCombo.section)}`);
        const students = (sr.data?.data || sr.data || []).filter((s: any) => s.is_active !== false);
        const data = {
          students: students.map((s: any) => ({
            student_id: s.id, student_name: s.name, roll_number: s.admission_no,
            subjects: { [selectedCombo.subject]: { marks: null, max_marks: 100, percentage: null, is_absent: false } },
          })),
          subjects: [selectedCombo.subject],
          configs: [{ subject: selectedCombo.subject, max_marks: 100 }],
        };
        setMarksTable(data);
        const m: Record<string, Record<string, any>> = {};
        students.forEach((s: any) => { m[s.name] = { [selectedCombo.subject]: { marks: "", is_absent: false } }; });
        setMarks(m);
      } catch { setMarksTable(null); }
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
      <div className="flex gap-2 flex-wrap">
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
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No marks table found for {selectedCombo?.grade} · {selectedCombo?.section} · {selectedExam}. Config may not be set up yet.</div>
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
              <div className="grid grid-cols-4 gap-3">
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
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
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
// ACTIVITIES TAB — Create + Marks Entry + Graphical Analysis
// ─────────────────────────────────────────────────────────────────
function ActivitiesTab({ user, mappings, academicYear }: any) {
  const API = "http://localhost:3000";
  const ACTIVITY_TYPES = ["Individual","Group","Project","Assessment","Workshop","Other"];
  const STAGES = ["foundation","preparatory","middle","secondary"];
  const RATING_COLORS: Record<string, string> = { beginning: "bg-red-100 text-red-700 border-red-300", approaching: "bg-yellow-100 text-yellow-700 border-yellow-300", meeting: "bg-green-100 text-green-700 border-green-300", exceeding: "bg-purple-100 text-purple-700 border-purple-300" };
  const CROSS_CURRICULAR = ["Arts","Vocational Education","Interdisciplinary"];

  const [subTab, setSubTab] = useState<"create" | "marks" | "analysis">("create");
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [combinedMarks, setCombinedMarks] = useState<any>(null);
  const [localRatings, setLocalRatings] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [sectionDash, setSectionDash] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Build teacher's grade+section+subject combos
  const combos: { grade: string; section: string; subject: string }[] = [];
  const gradeSet = new Set<string>();
  if (mappings?.mappings) {
    const seen = new Set<string>();
    mappings.mappings.forEach((m: any) => {
      if (!m.subject) return;
      const key = `${m.grade}||${m.section}||${m.subject}`;
      if (!seen.has(key)) { seen.add(key); combos.push({ grade: m.grade, section: m.section, subject: m.subject }); }
      gradeSet.add(m.grade);
    });
  }

  const allSubjects = [...new Set(combos.map(c => c.subject))].sort();
  const allGrades = [...gradeSet].sort();
  const allSections = [...new Set(combos.map(c => c.section))].sort();

  // Form state — multi-subject support
  const [form, setForm] = useState({
    name: "", description: "", grade: allGrades[0] || "", section: allSections[0] || "",
    subject: allSubjects[0] || "", activity_type: "Individual", stage: "preparatory",
    activity_date: new Date().toISOString().split("T")[0],
    competency_areas: [] as string[], // can include cross-curricular
    competency_mappings: [] as string[], apply_to_all_sections: false,
  });
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [extraCompetencies, setExtraCompetencies] = useState<any[]>([]);

  useEffect(() => { fetchActivities(); }, [academicYear]);
  useEffect(() => { if (form.grade && form.subject) fetchCompetencies(); }, [form.grade, form.subject]);
  useEffect(() => { if (form.competency_areas.length) fetchExtraCompetencies(); }, [form.competency_areas, form.grade]);
  useEffect(() => { if (selectedActivity && selectedActivity.grade && selectedActivity.section && selectedActivity.subject) fetchCombinedMarks(); }, [selectedActivity]);
  useEffect(() => { if (subTab === "analysis" && selectedSection && allGrades[0]) fetchSectionDash(); }, [subTab, selectedSection]);

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams({ academic_year: academicYear });
      combos.forEach(c => { /* filter by teacher's grades */ });
      if (allGrades[0]) params.append("grade", allGrades[0]);
      const r = await axios.get(`${API}/activities?${params}`);
      setActivities(r.data || []);
    } catch { }
  };

  const fetchCompetencies = async () => {
    try {
      const r = await axios.get(`${API}/activities/competencies?grade=${encodeURIComponent(form.grade)}&subject=${encodeURIComponent(form.subject)}`);
      setCompetencies(r.data || []);
    } catch { setCompetencies([]); }
  };

  const fetchExtraCompetencies = async () => {
    const all: any[] = [];
    for (const area of form.competency_areas) {
      try {
        const r = await axios.get(`${API}/activities/competencies?grade=${encodeURIComponent(form.grade)}&subject=${encodeURIComponent(area)}`);
        all.push(...(r.data || []));
      } catch { }
    }
    setExtraCompetencies(all);
  };

  const fetchCombinedMarks = async () => {
    if (!selectedActivity) return;
    try {
      const r = await axios.get(`${API}/activities/combined-marks/${encodeURIComponent(selectedActivity.grade)}/${encodeURIComponent(selectedActivity.section)}/${encodeURIComponent(selectedActivity.subject)}?academic_year=${academicYear}`);
      setCombinedMarks(r.data);
      const init: Record<string, Record<string, Record<string, string>>> = {};
      (r.data?.students || []).forEach((s: any) => {
        init[s.student_id] = {};
        (r.data?.activities || []).forEach((act: any) => { init[s.student_id][act.id] = { ...(s.activity_data?.[act.id] || {}) }; });
      });
      setLocalRatings(init);
    } catch { }
  };

  const fetchSectionDash = async () => {
    try {
      const grade = allGrades[0];
      const r = await axios.get(`${API}/activities/dashboard/section/${encodeURIComponent(grade)}/${encodeURIComponent(selectedSection)}?academic_year=${academicYear}`);
      setSectionDash(r.data);
    } catch { setSectionDash(null); }
  };

  const saveActivity = async () => {
    if (!form.name || !form.grade || !form.subject) { setMsg("❌ Name, Grade and Subject are required"); setTimeout(() => setMsg(""), 3000); return; }
    try {
      const allCompetencies = [...form.competency_mappings];
      await axios.post(`${API}/activities`, { ...form, academic_year: academicYear, created_by: user?.id });
      setMsg("✅ Activity created");
      setShowForm(false);
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
    setLocalRatings(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [activityId]: { ...(prev[studentId]?.[activityId] || {}), [competencyId]: rating } } }));
  };

  const saveActivityMarks = async (activityId: string) => {
    if (!combinedMarks) return;
    setSaving(true);
    try {
      const entries = (combinedMarks.students || []).map((s: any) => ({ student_id: s.student_id, student_name: s.student_name, competency_ratings: localRatings[s.student_id]?.[activityId] || {} }));
      await axios.post(`${API}/activities/${activityId}/marks`, { academic_year: academicYear, entries });
      setMsg("✅ Marks saved"); fetchCombinedMarks();
    } catch { setMsg("❌ Error saving marks"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const allDisplayCompetencies = [...competencies, ...extraCompetencies];

  if (!combos.length) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No subject assignments found. Contact admin.</div>;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[{ id: "create", label: "📋 Activities" }, { id: "marks", label: "✏️ Marks Entry" }, { id: "analysis", label: "📊 Analysis" }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium border ${subTab === t.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>{t.label}</button>
        ))}
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* CREATE / LIST */}
      {subTab === "create" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
              {showForm ? "✕ Cancel" : "+ Create Activity"}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl shadow border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-700">New Activity</h3>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">Activity Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Story Writing" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Grade *</label><select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value, competency_mappings: [] }))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">{allGrades.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Subject *</label><select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value, competency_mappings: [] }))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">{allSubjects.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Section</label><select value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">{allSections.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Type</label><select value={form.activity_type} onChange={e => setForm(p => ({ ...p, activity_type: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">{ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Date</label><input type="date" value={form.activity_date} onChange={e => setForm(p => ({ ...p, activity_date: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>
              </div>

              {/* Cross-curricular areas */}
              <div>
                <label className="text-xs text-gray-500 block mb-1 font-semibold">Also maps to cross-curricular areas (optional)</label>
                <div className="flex gap-2 flex-wrap">
                  {CROSS_CURRICULAR.map(area => (
                    <label key={area} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${form.competency_areas.includes(area) ? "bg-purple-100 border-purple-400 text-purple-700 font-bold" : "bg-white border-gray-300 text-gray-600"}`}>
                      <input type="checkbox" checked={form.competency_areas.includes(area)} onChange={() => setForm(p => ({ ...p, competency_areas: p.competency_areas.includes(area) ? p.competency_areas.filter(x => x !== area) : [...p.competency_areas, area] }))} className="accent-purple-600" />
                      {area}
                    </label>
                  ))}
                </div>
              </div>

              {/* Competency selector */}
              {allDisplayCompetencies.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1 font-semibold">Select Competencies ({form.competency_mappings.length} selected)</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {allDisplayCompetencies.map((c: any) => (
                      <label key={c.id} className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 text-xs ${form.competency_mappings.includes(c.id) ? "bg-indigo-50" : ""}`}>
                        <input type="checkbox" checked={form.competency_mappings.includes(c.id)} onChange={() => setForm(p => ({ ...p, competency_mappings: p.competency_mappings.includes(c.id) ? p.competency_mappings.filter(x => x !== c.id) : [...p.competency_mappings, c.id] }))} className="accent-indigo-600 mt-0.5" />
                        <span className="font-mono text-indigo-600 font-semibold shrink-0">{c.competency_code}</span>
                        <span className="text-gray-600 truncate">{c.description?.substring(0, 80)}</span>
                        {c.subject !== form.subject && <span className="shrink-0 text-purple-600 text-xs font-bold">[{c.subject}]</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
                      <p className="text-xs text-gray-400">{a.grade} · {a.section} · {a.subject} · {a.activity_date}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedActivity(a); setSubTab("marks"); }} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs rounded-lg hover:bg-indigo-200 font-medium">✏️ Enter Marks</button>
                      <button onClick={() => deleteActivity(a.id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 font-medium">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MARKS ENTRY */}
      {subTab === "marks" && (
        <div className="space-y-4">
          {/* Activity selector */}
          <div className="bg-white rounded-xl shadow p-4">
            <label className="text-xs text-gray-500 block mb-2">Select Activity for Marks Entry</label>
            <select value={selectedActivity?.id || ""} onChange={e => { const a = activities.find(x => x.id === e.target.value); setSelectedActivity(a || null); }}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-md">
              <option value="">-- Select activity --</option>
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} — {a.grade} · {a.section} · {a.subject}</option>)}
            </select>
          </div>

          {selectedActivity && combinedMarks && (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-700">{selectedActivity.name} — {selectedActivity.grade} · {selectedActivity.section}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{combinedMarks.students?.length} students · {combinedMarks.activities?.length} activities</p>
              </div>
              <div className="overflow-x-auto p-4">
                {combinedMarks.activities?.filter((act: any) => act.id === selectedActivity.id).map((act: any) => (
                  <div key={act.id} className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-indigo-700">{act.name}</h4>
                      <button onClick={() => saveActivityMarks(act.id)} disabled={saving} className="px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                        {saving ? "Saving..." : "💾 Save Marks"}
                      </button>
                    </div>
                    <table className="w-full text-xs border-collapse" style={{ minWidth: `${300 + (combinedMarks.domains?.length || 0) * 120}px` }}>
                      <thead>
                        <tr className="bg-indigo-700 text-white">
                          <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[160px]">Student</th>
                          {combinedMarks.competencies?.filter((c: any) => act.competency_mappings?.includes(c.id)).map((c: any) => (
                            <th key={c.id} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[110px]">
                              <div className="font-mono text-xs">{c.competency_code}</div>
                              <div className="text-indigo-300 text-xs font-normal truncate max-w-[100px]">{c.domain}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {combinedMarks.students?.map((student: any, i: number) => (
                          <tr key={student.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit">{student.student_name}</td>
                            {combinedMarks.competencies?.filter((c: any) => act.competency_mappings?.includes(c.id)).map((c: any) => (
                              <td key={c.id} className="px-2 py-2 text-center border-l border-gray-100">
                                <div className="flex flex-col gap-1">
                                  {["beginning","approaching","meeting","exceeding"].map(r => (
                                    <label key={r} className={`flex items-center gap-1 px-1.5 py-1 rounded border cursor-pointer text-xs ${localRatings[student.student_id]?.[act.id]?.[c.id] === r ? RATING_COLORS[r] : "border-gray-200 text-gray-400 hover:bg-gray-50"}`}>
                                      <input type="radio" name={`${student.student_id}-${act.id}-${c.id}`} value={r} checked={localRatings[student.student_id]?.[act.id]?.[c.id] === r} onChange={() => updateRating(student.student_id, act.id, c.id, r)} className="hidden" />
                                      {r.charAt(0).toUpperCase() + r.slice(1)}
                                    </label>
                                  ))}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ANALYSIS */}
      {subTab === "analysis" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Section:</label>
            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">Select section</option>
              {allSections.map(s => <option key={s} value={s}>{allGrades[0]} · {s}</option>)}
            </select>
            <button onClick={fetchSectionDash} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs rounded-lg hover:bg-indigo-200 font-medium">Load</button>
          </div>

          {sectionDash && (
            <div className="space-y-4">
              {/* KPI */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total Students", value: sectionDash.total_students, color: "border-indigo-500" },
                  { label: "Overall Avg", value: sectionDash.overall_avg ? `${sectionDash.overall_avg}/4` : "—", color: "border-green-500" },
                  { label: "Competencies Assessed", value: sectionDash.competencyAvgs?.length || 0, color: "border-blue-500" },
                  { label: "Weakest Domain", value: sectionDash.weakest?.[0]?.domain || "—", color: "border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-lg font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Domain avg chart */}
              {sectionDash.domains?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Average Score</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={sectionDash.domains?.map((d: any) => ({ name: d.domain, avg: d.avg }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 4]} ticks={[1,2,3,4]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip formatter={(v: any) => [`${v}/4`, "Avg"]} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                        {sectionDash.domains?.map((_: any, i: number) => <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Student ranking by overall activity score */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Rankings by Competency Score</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-center w-10">Rank</th>
                        <th className="px-3 py-2 text-left min-w-[160px]">Student</th>
                        <th className="px-3 py-2 text-center">Overall Avg</th>
                        <th className="px-3 py-2 text-center">Level</th>
                        {sectionDash.domains?.slice(0, 4).map((d: any) => <th key={d.domain} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[80px]">{d.domain.substring(0,12)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...(sectionDash.studentDomainBreakdown || [])].sort((a: any, b: any) => b.overall_avg - a.overall_avg).map((s: any, i: number) => (
                        <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 text-center font-bold text-gray-400">{i+1}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{s.student_name}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.overall_avg >= 3.5 ? "bg-purple-100 text-purple-700" : s.overall_avg >= 2.5 ? "bg-green-100 text-green-700" : s.overall_avg >= 1.5 ? "bg-yellow-100 text-yellow-700" : s.overall_avg > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-400"}`}>
                              {s.overall_avg > 0 ? s.overall_avg.toFixed(2) : "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-gray-500">{s.overall_avg >= 3.5 ? "Exceeding" : s.overall_avg >= 2.5 ? "Meeting" : s.overall_avg >= 1.5 ? "Approaching" : s.overall_avg > 0 ? "Beginning" : "—"}</td>
                          {sectionDash.domains?.slice(0, 4).map((d: any) => (
                            <td key={d.domain} className="px-2 py-2 text-center border-l border-gray-100">
                              {s.domain_avgs?.[d.domain] > 0 ? <span className="text-xs font-bold">{s.domain_avgs[d.domain].toFixed(1)}</span> : <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Weakest competencies */}
              {sectionDash.weakest?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">🔴 Weakest Competencies (needs attention)</h3>
                  <div className="space-y-2">
                    {sectionDash.weakest.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg border border-red-100">
                        <div>
                          <span className="font-mono text-xs font-bold text-red-700">{c.competency_code}</span>
                          <span className="text-xs text-gray-500 ml-2">{c.domain} · {c.subject}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.avg >= 2.5 ? "bg-green-100 text-green-700" : c.avg >= 1.5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                          {c.avg.toFixed(2)}/4
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// EXAM CONFIG TAB — class teacher configures exams for their grade
// Shared DB with admin — changes reflect in both directions
// ─────────────────────────────────────────────────────────────────
function ExamConfigTab({ user, mappings, academicYear }: any) {
  const API = "http://localhost:3000";
  const EXAM_TYPES = ["PA1","PA2","SA1","PA3","PA4","SA2","Custom"];
  const grade = mappings?.class_grade || "";

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
      } else {
        setSubjects([]);
      }
    } catch { }
  };

  const saveConfig = async () => {
    if (!grade) { setMsg("❌ No class assigned. Contact admin."); return; }
    if (!effectiveExam) { setMsg("❌ Enter exam name."); return; }
    if (!subjects.length) { setMsg("❌ Add at least one subject."); return; }
    try {
      await axios.post(`${API}/pasa/config`, { academic_year: academicYear, exam_type: effectiveExam, grade, subjects, exam_date: examDate || undefined });
      setMsg("✅ Config saved — visible to all teachers for this grade and in admin login");
      setSaved(true);
    } catch { setMsg("❌ Error saving config"); }
    setTimeout(() => setMsg(""), 4000);
  };

  const addSubject = () => {
    if (!newSubject.trim()) return;
    if (subjects.find(s => s.subject.toLowerCase() === newSubject.toLowerCase())) { setMsg("Subject already added"); setTimeout(() => setMsg(""), 2000); return; }
    setSubjects(prev => [...prev, { subject: newSubject.trim().toUpperCase(), max_marks: newMax }]);
    setNewSubject(""); setNewMax(100); setSaved(false);
  };

  if (!mappings?.is_class_teacher) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Only class teachers can configure exams.</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-800">⚙️ Exam Configuration — {grade}</h3>
        <p className="text-xs text-indigo-600 mt-0.5">Configure subjects and max marks for each exam. This is shared — changes reflect in admin login and all subject teachers for {grade}.</p>
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Exam Type</label>
            <select value={examType} onChange={e => { setExamType(e.target.value); setSaved(false); }} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
              {EXAM_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {examType === "Custom" && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Custom Name</label>
              <input value={customExam} onChange={e => setCustomExam(e.target.value)} placeholder="e.g. Unit Test 1" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Exam Date (optional)</label>
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Grade (auto)</label>
            <input value={grade} disabled className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full bg-gray-50 text-gray-400" />
          </div>
        </div>

        {/* Current subjects */}
        {subjects.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {subjects.map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-bold text-indigo-700">{s.subject}</span>
                <span className="text-xs text-gray-400">Max:</span>
                <input type="number" value={s.max_marks}
                  onChange={e => setSubjects(prev => prev.map((x, j) => j === i ? { ...x, max_marks: +e.target.value } : x))}
                  className="w-16 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center font-bold text-indigo-700" />
                <button onClick={() => { setSubjects(prev => prev.filter((_, j) => j !== i)); setSaved(false); }} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add subject */}
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Add Subject</label>
            <input value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubject()}
              placeholder="e.g. MATHEMATICS" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-44" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Max Marks</label>
            <input type="number" value={newMax} onChange={e => setNewMax(+e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-24" />
          </div>
          <button onClick={addSubject} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200">+ Add</button>
          <button onClick={saveConfig} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">💾 Save Config</button>
        </div>
        {saved && <p className="text-xs text-green-600">✅ Config saved for {grade} · {effectiveExam} · {academicYear}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ALERTS TAB — PA/SA consecutive decline + Activities decline
// ─────────────────────────────────────────────────────────────────
function AlertsTab({ user, mappings, academicYear }: any) {
  const API = "http://localhost:3000";
  const [pasaAlerts, setPasaAlerts] = useState<any[]>([]);
  const [actAlerts, setActAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get teacher's grades to filter alerts to only their sections
  const myGrades = [...new Set((mappings?.mappings || []).map((m: any) => m.grade))] as string[];
  const mySections = [...new Set((mappings?.mappings || []).map((m: any) => m.section))] as string[];

  useEffect(() => { fetchAlerts(); }, [academicYear]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const [pa, ac] = await Promise.all([
        axios.get(`${API}/pasa/alerts/decline?academic_year=${academicYear}`),
        axios.get(`${API}/activities/alerts/decline?academic_year=${academicYear}`),
      ]);
      // Filter to teacher's own sections
      const filterMine = (arr: any[]) => myGrades.length
        ? arr.filter((a: any) => myGrades.includes(a.grade) && mySections.includes(a.section))
        : arr;
      setPasaAlerts(filterMine(pa.data || []));
      setActAlerts(filterMine(ac.data || []));
    } catch { }
    setLoading(false);
  };

  if (loading) return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Loading alerts...</div>;

  const total = pasaAlerts.length + actAlerts.length;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className={`rounded-xl p-4 border ${total > 0 ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300"}`}>
        <h3 className={`text-sm font-bold ${total > 0 ? "text-red-800" : "text-green-800"}`}>
          {total > 0 ? `⚠️ ${total} student(s) need attention across your sections` : "✅ No consecutive decline alerts in your sections"}
        </h3>
        <p className="text-xs mt-0.5 text-gray-500">Students with 3+ consecutive declining scores in PA/SA exams or Activities</p>
      </div>

      {/* PA/SA Decline */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          📊 PA/SA Consecutive Decline
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pasaAlerts.length > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{pasaAlerts.length}</span>
        </h3>
        {pasaAlerts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No PA/SA consecutive declines in your sections.</p>
        ) : (
          <div className="space-y-2">
            {pasaAlerts.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="text-sm font-bold text-gray-800">{s.student_name}</p>
                  <p className="text-xs text-gray-500">{s.grade} · {s.section}</p>
                  <p className="text-xs text-red-600 mt-0.5">{s.scores?.map((sc: any) => `${sc.exam}: ${sc.percentage?.toFixed(1) ?? sc.grand_percentage?.toFixed(1) ?? "—"}%`).join(" → ")}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-red-600">▼ {s.drop?.toFixed(1)}%</span>
                  <p className="text-xs text-gray-400">drop</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activities Decline */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          🎯 Activities Consecutive Decline
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${actAlerts.length > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>{actAlerts.length}</span>
        </h3>
        {actAlerts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No activity consecutive declines in your sections.</p>
        ) : (
          <div className="space-y-2">
            {actAlerts.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 bg-orange-50 rounded-lg border border-orange-100">
                <div>
                  <p className="text-sm font-bold text-gray-800">{s.student_name}</p>
                  <p className="text-xs text-gray-500">{s.grade} · {s.section}</p>
                  <p className="text-xs text-orange-600 mt-0.5">{s.scores?.map((sc: any) => `${sc.name}: ${sc.avg?.toFixed(2)}`).join(" → ")}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-orange-600">▼ {s.drop?.toFixed(2)}</span>
                  <p className="text-xs text-gray-400">score drop</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PROMOTION TAB — class teacher only
// ─────────────────────────────────────────────────────────────────
function PromotionTab({ user, mappings }: any) {
  const API = "http://localhost:3000";
  const GRADE_ORDER = ["Pre-KG","LKG","UKG","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];
  const ALL_SECTIONS = ["Duke","Popeye","Daisy","Lotus","Orchid","Tulip","Eagle","Robin","Skylark","Asteroid","Comet","Galaxy","Apus","Pavo","Volans","Edison","Einstein","Kalam","Raman","Diamond","Emerald","Ruby","Ganga","Godavari","Kaveri","Sathya","Shanthi","Vedha","Jupiter","Mars","Mercury","Venus","Centaurus","Orion","Pegasus","Himalaya","Meru","Vindhya","Bendre","Karanth","Kuvempu"];

  const classGrade = mappings?.class_grade || "";
  const classSection = mappings?.class_section || "";

  const nextGradeIdx = GRADE_ORDER.indexOf(classGrade) + 1;
  const nextGrade = nextGradeIdx < GRADE_ORDER.length ? GRADE_ORDER[nextGradeIdx] : null;

  const [preview, setPreview] = useState<any>(null);
  const [newSection, setNewSection] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [promoting, setPromoting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [step, setStep] = useState<"preview" | "confirm" | "done">("preview");

  const loadPreview = async () => {
    try {
      const r = await axios.get(`${API}/students/promotion/preview?grade=${encodeURIComponent(classGrade)}&section=${encodeURIComponent(classSection)}`);
      setPreview(r.data);
      setSelectedIds(r.data.students.map((s: any) => s.id));
      setStep("confirm");
    } catch { setMsg("❌ Could not load preview. Check backend."); }
  };

  const executePromotion = async () => {
    if (!newSection) { setMsg("❌ Please select the new section for next year."); return; }
    setPromoting(true);
    try {
      const r = await axios.post(`${API}/students/promotion/execute`, {
        grade: classGrade,
        section: classSection,
        new_section: newSection,
        student_ids: selectedIds,
      });
      setResult(r.data);
      setStep("done");
    } catch { setMsg("❌ Promotion failed. Try again."); }
    setPromoting(false);
  };

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (!mappings?.is_class_teacher) {
    return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Only class teachers can access the Promotion tab.</div>;
  }

  if (!nextGrade) {
    return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Grade 10 is the final grade. No further promotion possible.</div>;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-800 mb-1">🎓 Student Promotion</h3>
        <p className="text-xs text-indigo-600">
          Promote students from <strong>{classGrade} · {classSection}</strong> to <strong>{nextGrade}</strong>.
          After promotion, their grade in the system is automatically updated.
        </p>
      </div>

      {msg && <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {/* Step 1 — Preview */}
      {step === "preview" && (
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <p className="text-sm text-gray-600 mb-1">Your class: <strong>{classGrade} · {classSection}</strong></p>
          <p className="text-sm text-gray-600 mb-4">Will be promoted to: <strong>{nextGrade}</strong></p>
          <button onClick={loadPreview}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">
            📋 Load Student List
          </button>
        </div>
      )}

      {/* Step 2 — Confirm */}
      {step === "confirm" && preview && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {preview.student_count} students in {classGrade} · {classSection}
              <span className="ml-2 text-xs text-gray-400">({selectedIds.length} selected for promotion)</span>
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto border border-gray-100 rounded-lg p-2">
              {preview.students?.map((s: any) => (
                <label key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:bg-gray-50 ${selectedIds.includes(s.id) ? "bg-indigo-50" : ""}`}>
                  <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleStudent(s.id)} className="accent-indigo-600" />
                  <span className="text-sm font-medium text-gray-800">{s.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{s.admission_no}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setSelectedIds(preview.students.map((s: any) => s.id))} className="text-xs text-indigo-600 hover:underline">Select All</button>
              <button onClick={() => setSelectedIds([])} className="text-xs text-gray-400 hover:underline">Clear All</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              New Section for {nextGrade} <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">Select which section these students will be assigned to in {nextGrade}. This can be different from their current section.</p>
            <select value={newSection} onChange={e => setNewSection(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-xs">
              <option value="">-- Select new section --</option>
              {ALL_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-bold text-yellow-800 mb-1">⚠️ Important</p>
            <ul className="text-xs text-yellow-700 space-y-1 list-disc ml-4">
              <li>This will update the grade and section for {selectedIds.length} student(s) in the database immediately.</li>
              <li>All their historical PA/SA marks, activities, and competency scores are preserved.</li>
              <li>Students not selected will remain in {classGrade} · {classSection}.</li>
              <li>This action cannot be undone from the teacher dashboard.</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button onClick={executePromotion} disabled={promoting || !newSection || !selectedIds.length}
              className="px-6 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50">
              {promoting ? "Promoting..." : `✅ Promote ${selectedIds.length} Students to ${nextGrade}`}
            </button>
            <button onClick={() => { setStep("preview"); setPreview(null); }}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === "done" && result && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-6 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-base font-bold text-green-800">{result.message}</p>
          <p className="text-sm text-green-600 mt-2">
            {result.promoted_count} student(s) moved from <strong>{result.from_grade} · {result.from_section}</strong> to <strong>{result.to_grade} · {result.to_section}</strong>
          </p>
          <button onClick={() => { setStep("preview"); setPreview(null); setResult(null); setNewSection(""); setSelectedIds([]); setMsg(""); }}
            className="mt-4 px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
            Promote Another Section
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 6: AI HOMEWORK GENERATOR
// ─────────────────────────────────────────────────────────────────
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
    <div className="space-y-4 max-w-4xl">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-800 mb-1">🤖 AI-Powered Homework Generator</h3>
        <p className="text-xs text-indigo-600">Uses Groq LLaMA 3.3 to generate personalized homework based on student assessment gaps.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
