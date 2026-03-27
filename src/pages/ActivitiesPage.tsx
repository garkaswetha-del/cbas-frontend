import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

const API = "http://localhost:3000";

const generateAcademicYears = () => {
  const years = [];
  for (let i = 2025; i <= 2035; i++) years.push(`${i}-${String(i + 1).slice(2)}`);
  return years;
};
const ACADEMIC_YEARS = generateAcademicYears();

const CLASSES = [
  "Pre-KG", "LKG", "UKG",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
];

const ACTIVITY_TYPES = ["Individual", "Group", "Project", "Assessment", "Workshop", "Other"];
const STAGES = ["foundation", "preparatory", "middle", "secondary"];

const RATING_COLORS: Record<string, string> = {
  beginning: "bg-red-100 text-red-700 border-red-300",
  approaching: "bg-yellow-100 text-yellow-700 border-yellow-300",
  meeting: "bg-blue-100 text-blue-700 border-blue-300",
  exceeding: "bg-green-100 text-green-700 border-green-300",
};

const RATING_SCORE: Record<string, number> = {
  beginning: 1, approaching: 2, meeting: 3, exceeding: 4,
};

const scoreColor = (s: number) =>
  s >= 3.5 ? "text-green-600" : s >= 2.5 ? "text-blue-600" : s >= 1.5 ? "text-yellow-600" : s > 0 ? "text-red-500" : "text-gray-400";

const scoreBg = (s: number) =>
  s >= 3.5 ? "bg-green-100 text-green-800" : s >= 2.5 ? "bg-blue-100 text-blue-800" : s >= 1.5 ? "bg-yellow-100 text-yellow-800" : s > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-400";

const DOMAIN_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#14b8a6",
];

export default function ActivitiesPage() {
  const [activeTab, setActiveTab] = useState<"activities" | "marks" | "dashboard">("activities");
  const [academicYear, setAcademicYear] = useState("2025-26");

  // Activities tab
  const [activities, setActivities] = useState<any[]>([]);
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editActivity, setEditActivity] = useState<any>(null);
  const [message, setMessage] = useState("");

  // Competencies
  const [competencies, setCompetencies] = useState<any[]>([]);

  // New activity form
  const [form, setForm] = useState({
    name: "", description: "", subject: "", stage: "foundation",
    grade: "", section: "", activity_type: "Individual",
    activity_date: new Date().toISOString().split("T")[0],
    competency_mappings: [] as string[], apply_to_all_sections: false,
  });

  // Marks tab
  const [marksGrade, setMarksGrade] = useState("");
  const [marksSection, setMarksSection] = useState("");
  const [marksSubject, setMarksSubject] = useState("");
  const [marksSections, setMarksSections] = useState<string[]>([]);
  const [marksSubjects, setMarksSubjects] = useState<string[]>([]);
  const [combinedMarks, setCombinedMarks] = useState<any>(null);
  const [localRatings, setLocalRatings] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [saving, setSaving] = useState(false);

  // Dashboard tab
  const [dashTab, setDashTab] = useState<"school" | "grade" | "section" | "student" | "alerts">("school");
  const [dashGrade, setDashGrade] = useState("");
  const [dashSection, setDashSection] = useState("");
  const [dashSections, setDashSections] = useState<string[]>([]);
  const [schoolDash, setSchoolDash] = useState<any>(null);
  const [gradeDash, setGradeDash] = useState<any>(null);
  const [sectionDash, setSectionDash] = useState<any>(null);
  const [studentDash, setStudentDash] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentList, setStudentList] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // ── EFFECTS ───────────────────────────────────────────────────

  useEffect(() => { fetchActivities(); }, [filterGrade, filterSection, filterSubject, academicYear]);
  useEffect(() => { if (filterGrade) fetchSections(filterGrade, setSections); }, [filterGrade]);
  useEffect(() => { if (filterGrade) fetchSubjects(filterGrade); }, [filterGrade]);
  useEffect(() => { if (marksGrade) fetchSections(marksGrade, setMarksSections); }, [marksGrade]);
  useEffect(() => { if (marksGrade) { axios.get(`${API}/activities/subjects-for-grade/${encodeURIComponent(marksGrade)}`).then(r => setMarksSubjects(r.data || [])).catch(() => {}); } }, [marksGrade]);
  useEffect(() => { if (marksGrade && marksSection && marksSubject) fetchCombinedMarks(); }, [marksGrade, marksSection, marksSubject, academicYear]);
  useEffect(() => { fetchCompetencies(); }, [form.grade, form.subject]);
  useEffect(() => {
    if (dashTab === "school") fetchSchoolDash();
    if (dashTab === "grade" && dashGrade) fetchGradeDash();
    if (dashTab === "section" && dashGrade && dashSection) fetchSectionDash();
    if (dashTab === "alerts") fetchAlerts();
  }, [dashTab, dashGrade, dashSection, academicYear]);
  useEffect(() => { if (dashGrade) fetchSections(dashGrade, setDashSections); }, [dashGrade]);

  // ── FETCH HELPERS ─────────────────────────────────────────────

  const fetchSections = async (grade: string, setter: (s: string[]) => void) => {
    try {
      const r = await axios.get(`${API}/students?limit=2000`);
      const students = r.data?.data || r.data || [];
      const secs = ([...new Set(students.filter((s: any) => s.current_class === grade).map((s: any) => s.section).filter(Boolean))] as string[]).sort();
      setter(secs);
    } catch { }
  };

  const fetchSubjects = async (grade: string) => {
    try {
      const r = await axios.get(`${API}/activities/subjects-for-grade/${encodeURIComponent(grade)}`);
      setSubjects(r.data || []);
    } catch { }
  };

  const fetchCompetencies = async () => {
    if (!form.grade || !form.subject) return;
    try {
      const r = await axios.get(`${API}/activities/competencies?grade=${encodeURIComponent(form.grade)}&subject=${encodeURIComponent(form.subject)}`);
      setCompetencies(r.data || []);
    } catch { }
  };

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams({ academic_year: academicYear });
      if (filterGrade) params.append("grade", filterGrade);
      if (filterSection) params.append("section", filterSection);
      if (filterSubject) params.append("subject", filterSubject);
      const r = await axios.get(`${API}/activities?${params}`);
      setActivities(r.data || []);
    } catch { }
  };

  const fetchCombinedMarks = async () => {
    try {
      const r = await axios.get(`${API}/activities/combined-marks/${encodeURIComponent(marksGrade)}/${encodeURIComponent(marksSection)}/${encodeURIComponent(marksSubject)}?academic_year=${academicYear}`);
      setCombinedMarks(r.data);
      // Initialize local ratings from existing data
      const init: Record<string, Record<string, Record<string, string>>> = {};
      (r.data?.students || []).forEach((s: any) => {
        init[s.student_id] = {};
        (r.data?.activities || []).forEach((act: any) => {
          init[s.student_id][act.id] = { ...(s.activity_data?.[act.id] || {}) };
        });
      });
      setLocalRatings(init);
    } catch { }
  };

  const fetchSchoolDash = async () => {
    try { const r = await axios.get(`${API}/activities/dashboard/school?academic_year=${academicYear}`); setSchoolDash(r.data); } catch { }
  };

  const fetchGradeDash = async () => {
    try { const r = await axios.get(`${API}/activities/dashboard/grade/${encodeURIComponent(dashGrade)}?academic_year=${academicYear}`); setGradeDash(r.data); } catch { }
  };

  const fetchSectionDash = async () => {
    try { const r = await axios.get(`${API}/activities/dashboard/section/${encodeURIComponent(dashGrade)}/${encodeURIComponent(dashSection)}?academic_year=${academicYear}`); setSectionDash(r.data); } catch { }
  };

  const fetchAlerts = async () => {
    try { const r = await axios.get(`${API}/activities/alerts/decline?academic_year=${academicYear}`); setAlerts(r.data || []); } catch { }
  };

  const fetchStudentList = async (grade: string, section: string) => {
    try {
      const r = await axios.get(`${API}/students?limit=2000`);
      const students = r.data?.data || r.data || [];
      setStudentList(students.filter((s: any) => s.current_class === grade && s.section === section));
    } catch { }
  };

  const fetchStudentDash = async (studentId: string) => {
    try { const r = await axios.get(`${API}/activities/dashboard/student/${studentId}?academic_year=${academicYear}`); setStudentDash(r.data); } catch { }
  };

  // ── ACTIVITY CRUD ─────────────────────────────────────────────

  const saveActivity = async () => {
    if (!form.name || !form.grade || !form.subject) {
      setMessage("❌ Name, Grade and Subject are required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    try {
      if (editActivity) {
        await axios.put(`${API}/activities/${editActivity.id}`, { ...form, academic_year: academicYear });
        setMessage("✅ Activity updated");
      } else {
        await axios.post(`${API}/activities`, { ...form, academic_year: academicYear });
        setMessage("✅ Activity created");
      }
      setShowAddForm(false);
      setEditActivity(null);
      resetForm();
      fetchActivities();
    } catch { setMessage("❌ Error saving activity"); }
    setTimeout(() => setMessage(""), 3000);
  };

  const deleteActivity = async (id: string) => {
    if (!confirm("Delete this activity?")) return;
    try {
      await axios.delete(`${API}/activities/${id}`);
      setMessage("✅ Deleted");
      fetchActivities();
    } catch { setMessage("❌ Error"); }
    setTimeout(() => setMessage(""), 3000);
  };

  const resetForm = () => setForm({
    name: "", description: "", subject: "", stage: "foundation",
    grade: filterGrade || "", section: filterSection || "",
    activity_type: "Individual",
    activity_date: new Date().toISOString().split("T")[0],
    competency_mappings: [], apply_to_all_sections: false,
  });

  // ── MARKS ENTRY ───────────────────────────────────────────────

  const updateRating = (studentId: string, activityId: string, competencyId: string, rating: string) => {
    setLocalRatings(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [activityId]: { ...(prev[studentId]?.[activityId] || {}), [competencyId]: rating },
      },
    }));
  };

  const saveActivityMarks = async (activityId: string) => {
    if (!combinedMarks) return;
    setSaving(true);
    try {
      const entries = (combinedMarks.students || []).map((s: any) => ({
        student_id: s.student_id,
        student_name: s.student_name,
        competency_ratings: localRatings[s.student_id]?.[activityId] || {},
      }));
      await axios.post(`${API}/activities/${activityId}/marks`, {
        academic_year: academicYear,
        entries,
      });
      setMessage("✅ Marks saved");
      fetchCombinedMarks();
    } catch { setMessage("❌ Error saving marks"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  // ── RENDER ────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Activities & Competency Assessment — Module 2</h1>
        <p className="text-sm text-gray-500">Manage activities, enter competency marks and view analysis</p>
      </div>

      {/* Global selectors */}
      <div className="flex gap-3 mb-4 items-end flex-wrap">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "activities", label: "📋 Activities" },
          { id: "marks", label: "✏️ Marks Entry" },
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

      {/* ── ACTIVITIES TAB ── */}
      {activeTab === "activities" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={filterGrade} onChange={e => { setFilterGrade(e.target.value); setFilterSection(""); }}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="">All Grades</option>
                  {CLASSES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {filterGrade && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Section</label>
                  <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    <option value="">All Sections</option>
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {filterGrade && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Subject</label>
                  <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    <option value="">All Subjects</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <button onClick={() => { setShowAddForm(true); setEditActivity(null); resetForm(); }}
                className="ml-auto px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
                + Add Activity
              </button>
            </div>
          </div>

          {/* Add/Edit form */}
          {showAddForm && (
            <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-700 mb-3">{editActivity ? "Edit Activity" : "New Activity"}</h2>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Activity Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Story Writing" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Grade *</label>
                  <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value, section: "", competency_mappings: [] }))}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    <option value="">Select Grade</option>
                    {CLASSES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Subject *</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value, competency_mappings: [] }))}
                    placeholder="e.g. English" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Section</label>
                  <select value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))}
                    disabled={form.apply_to_all_sections}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full disabled:opacity-50">
                    <option value="">Select Section</option>
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Stage</label>
                  <select value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Activity Type</label>
                  <select value={form.activity_type} onChange={e => setForm(p => ({ ...p, activity_type: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Date</label>
                  <input type="date" value={form.activity_date} onChange={e => setForm(p => ({ ...p, activity_date: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-gray-500 block mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={2} placeholder="Activity description..."
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full resize-none" />
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <input type="checkbox" checked={form.apply_to_all_sections}
                    onChange={e => setForm(p => ({ ...p, apply_to_all_sections: e.target.checked }))}
                    className="w-4 h-4 accent-indigo-600" />
                  <label className="text-sm text-gray-700">Apply to all sections of this grade</label>
                </div>
              </div>

              {/* Competency mapping */}
              {competencies.length > 0 && (
                <div className="mb-3">
                  <label className="text-xs font-semibold text-gray-600 block mb-2">
                    Map Competencies ({form.competency_mappings.length} selected)
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {Object.entries(
                      competencies.reduce((acc: any, c: any) => {
                        const d = c.domain || "General";
                        if (!acc[d]) acc[d] = [];
                        acc[d].push(c);
                        return acc;
                      }, {})
                    ).map(([domain, comps]: [string, any]) => (
                      <div key={domain}>
                        <p className="text-xs font-bold text-indigo-700 mb-1 mt-2">{domain}</p>
                        {comps.map((c: any) => (
                          <label key={c.id} className="flex items-start gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox"
                              checked={form.competency_mappings.includes(c.id)}
                              onChange={e => setForm(p => ({
                                ...p,
                                competency_mappings: e.target.checked
                                  ? [...p.competency_mappings, c.id]
                                  : p.competency_mappings.filter(x => x !== c.id),
                              }))}
                              className="mt-0.5 w-3.5 h-3.5 accent-indigo-600 flex-shrink-0" />
                            <div>
                              <span className="text-xs font-medium text-indigo-600">{c.competency_code}</span>
                              <span className="text-xs text-gray-600 ml-1">{c.description?.substring(0, 80)}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={saveActivity} className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
                  {editActivity ? "Update" : "Create Activity"}
                </button>
                <button onClick={() => { setShowAddForm(false); setEditActivity(null); }}
                  className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Activities list */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Activities ({activities.length})</h2>
            </div>
            {activities.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No activities found. Create one above.</div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Grade</th>
                    <th className="px-3 py-2 text-left">Section</th>
                    <th className="px-3 py-2 text-left">Subject</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-center">Competencies</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((act: any, i: number) => (
                    <tr key={act.id} className={i % 2 === 0 ? "bg-white border-b border-gray-100" : "bg-gray-50 border-b border-gray-100"}>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{act.name}</td>
                      <td className="px-3 py-2.5 text-gray-600">{act.grade}</td>
                      <td className="px-3 py-2.5 text-gray-600">{act.section}</td>
                      <td className="px-3 py-2.5">
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">{act.subject}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{act.activity_type}</td>
                      <td className="px-3 py-2.5 text-gray-500">{act.activity_date}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                          {(act.competency_mappings || []).length} mapped
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => {
                            setEditActivity(act);
                            setForm({ ...act, competency_mappings: act.competency_mappings || [], apply_to_all_sections: false });
                            setShowAddForm(true);
                          }} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs">✏️</button>
                          <button onClick={() => deleteActivity(act.id)}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── MARKS ENTRY TAB ── */}
      {activeTab === "marks" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Select Class & Subject</h2>
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={marksGrade} onChange={e => { setMarksGrade(e.target.value); setMarksSection(""); setMarksSubject(""); setCombinedMarks(null); }}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="">Select Grade</option>
                  {CLASSES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {marksGrade && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Section</label>
                  <select value={marksSection} onChange={e => { setMarksSection(e.target.value); setCombinedMarks(null); }}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    <option value="">Select Section</option>
                    {marksSections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {marksGrade && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Subject</label>
                  <select value={marksSubject} onChange={e => { setMarksSubject(e.target.value); setCombinedMarks(null); }}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    <option value="">Select Subject</option>
                    {marksSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {combinedMarks && (
            <div className="space-y-6">
              {/* One table per activity — newest first (leftmost activities) */}
              {(combinedMarks.activities || []).map((activity: any, actIdx: number) => {
                const actCompetencies = (activity.competency_mappings || [])
                  .map((id: string) => combinedMarks.competencies?.find((c: any) => c.id === id))
                  .filter(Boolean);

                if (!actCompetencies.length) return null;

                // Group by domain
                const byDomain = actCompetencies.reduce((acc: any, c: any) => {
                  const d = c.domain || "General";
                  if (!acc[d]) acc[d] = [];
                  acc[d].push(c);
                  return acc;
                }, {});

                return (
                  <div key={activity.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">
                          {actIdx === 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded mr-2">Latest</span>}
                          Activity {combinedMarks.activities.length - actIdx}: {activity.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {activity.activity_date} · {activity.activity_type} · {actCompetencies.length} competencies
                        </p>
                      </div>
                      <button onClick={() => saveActivityMarks(activity.id)} disabled={saving}
                        className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                        {saving ? "Saving..." : "💾 Save"}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse"
                        style={{ minWidth: `${280 + actCompetencies.length * 110}px` }}>
                        <thead>
                          <tr className="bg-indigo-700 text-white">
                            <th className="px-3 py-2 text-left sticky left-0 z-20 bg-indigo-700 border-r border-indigo-600 min-w-[180px]">Student</th>
                            {Object.entries(byDomain).map(([domain, comps]: [string, any]) => (
                              comps.map((c: any, ci: number) => (
                                <th key={c.id} className={`px-2 py-2 text-center min-w-[100px] ${ci === 0 ? "border-l border-indigo-500" : ""}`}>
                                  <div className="text-xs text-indigo-200">{domain}</div>
                                  <div className="text-xs">{c.competency_code}</div>
                                </th>
                              ))
                            ))}
                            <th className="px-3 py-2 text-center sticky right-0 z-20 bg-indigo-700 border-l border-indigo-600 min-w-[90px]">Avg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(combinedMarks.students || []).map((student: any, si: number) => {
                            const bg = si % 2 === 0 ? "bg-white" : "bg-gray-50";
                            const studentRatings = localRatings[student.student_id]?.[activity.id] || {};
                            const vals = actCompetencies.map((c: any) => RATING_SCORE[studentRatings[c.id]] || 0).filter(v => v > 0);
                            const avg = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
                            return (
                              <tr key={student.student_id} className={`border-b border-gray-100 ${bg}`}>
                                <td className={`px-3 py-1.5 font-medium text-gray-800 sticky left-0 z-10 border-r border-gray-200 ${bg}`}>
                                  {student.student_name}
                                </td>
                                {actCompetencies.map((c: any) => {
                                  const rating = studentRatings[c.id] || "";
                                  return (
                                    <td key={c.id} className={`px-1 py-1 text-center border-l border-gray-100 ${bg}`}>
                                      <select value={rating}
                                        onChange={e => updateRating(student.student_id, activity.id, c.id, e.target.value)}
                                        className={`text-xs border rounded px-1 py-0.5 w-full ${rating ? RATING_COLORS[rating] : "border-gray-200"}`}>
                                        <option value="">—</option>
                                        <option value="beginning">Beginning</option>
                                        <option value="approaching">Approaching</option>
                                        <option value="meeting">Meeting</option>
                                        <option value="exceeding">Exceeding</option>
                                      </select>
                                    </td>
                                  );
                                })}
                                <td className={`px-3 py-1.5 text-center sticky right-0 z-10 border-l border-gray-200 ${bg}`}>
                                  {avg > 0 ? (
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(avg)}`}>
                                      {avg.toFixed(1)}
                                    </span>
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Competency averages summary */}
              {combinedMarks.students?.length > 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">
                    Competency Averages — {marksGrade} {marksSection} ({combinedMarks.students.length} students)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse"
                      style={{ minWidth: `${280 + (combinedMarks.competencies?.length || 0) * 90}px` }}>
                      <thead>
                        <tr className="bg-indigo-700 text-white">
                          <th className="px-3 py-2 text-left sticky left-0 z-20 bg-indigo-700 border-r border-indigo-600 min-w-[180px]">Student</th>
                          {(combinedMarks.competencies || []).map((c: any) => (
                            <th key={c.id} className="px-2 py-2 text-center border-l border-indigo-600 min-w-[85px]">
                              <div className="text-xs text-indigo-200">{c.domain}</div>
                              <div className="text-xs">{c.competency_code}</div>
                            </th>
                          ))}
                          {combinedMarks.domains?.map((d: string) => (
                            <th key={d} className="px-2 py-2 text-center border-l border-indigo-500 min-w-[90px] bg-indigo-800">
                              <div className="text-xs text-indigo-200">Domain Avg</div>
                              <div className="text-xs">{d}</div>
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center sticky right-0 z-20 bg-indigo-700 border-l border-indigo-600 min-w-[90px]">Overall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...(combinedMarks.students || [])].sort((a: any, b: any) => b.overall_avg - a.overall_avg).map((student: any, si: number) => {
                          const bg = si % 2 === 0 ? "bg-white" : "bg-gray-50";
                          return (
                            <tr key={student.student_id} className={`border-b border-gray-100 ${bg}`}>
                              <td className={`px-3 py-1.5 font-medium text-gray-800 sticky left-0 z-10 border-r border-gray-200 ${bg}`}>
                                {student.student_name}
                              </td>
                              {(combinedMarks.competencies || []).map((c: any) => {
                                const data = student.competency_avgs?.[c.id];
                                return (
                                  <td key={c.id} className={`px-2 py-1.5 text-center border-l border-gray-100 ${bg}`}>
                                    {data ? (
                                      <div>
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(data.avg)}`}>
                                          {data.avg.toFixed(1)}
                                        </span>
                                        <div className="text-xs text-gray-400 mt-0.5">{data.rating}</div>
                                        <div className="text-xs text-gray-300">{data.count}x</div>
                                      </div>
                                    ) : <span className="text-gray-300">—</span>}
                                  </td>
                                );
                              })}
                              {combinedMarks.domains?.map((d: string) => {
                                const domAvg = student.domain_avgs?.[d] || 0;
                                return (
                                  <td key={d} className={`px-2 py-1.5 text-center border-l border-gray-100 bg-indigo-50 ${bg}`}>
                                    {domAvg > 0 ? (
                                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(domAvg)}`}>
                                        {domAvg.toFixed(1)}
                                      </span>
                                    ) : <span className="text-gray-300">—</span>}
                                  </td>
                                );
                              })}
                              <td className={`px-3 py-1.5 text-center sticky right-0 z-10 border-l border-gray-200 ${bg}`}>
                                {student.overall_avg > 0 ? (
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(student.overall_avg)}`}>
                                    {student.overall_avg.toFixed(2)}
                                  </span>
                                ) : <span className="text-gray-300">—</span>}
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

          {!combinedMarks && marksGrade && marksSection && marksSubject && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              <p className="text-sm">No activities found for {marksGrade} — {marksSection} — {marksSubject}</p>
            </div>
          )}
        </div>
      )}

      {/* ── DASHBOARD TAB ── */}
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

          {/* Grade/Section selectors */}
          {(dashTab === "grade" || dashTab === "section" || dashTab === "student") && (
            <div className="flex gap-3 mb-4 items-end flex-wrap">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={dashGrade} onChange={e => { setDashGrade(e.target.value); setDashSection(""); }}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="">Select Grade</option>
                  {CLASSES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {(dashTab === "section" || dashTab === "student") && dashGrade && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Section</label>
                  <select value={dashSection} onChange={e => {
                    setDashSection(e.target.value);
                    if (dashTab === "student") fetchStudentList(dashGrade, e.target.value);
                  }}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    <option value="">Select Section</option>
                    {dashSections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {dashTab === "student" && dashSection && (
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-gray-500 block mb-1">Student</label>
                  <select onChange={e => { if (e.target.value) fetchStudentDash(e.target.value); }}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    <option value="">Select Student</option>
                    {studentList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── SCHOOL DASHBOARD ── */}
          {dashTab === "school" && schoolDash && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total Students", value: schoolDash.total_students, color: "border-indigo-500" },
                  { label: "Assessed", value: schoolDash.assessed, color: "border-green-500" },
                  { label: "Overall Avg", value: schoolDash.overall_avg?.toFixed(2), color: "border-blue-500" },
                  { label: "Level Distribution", value: `L4: ${schoolDash.levelDist?.L4 || 0}`, color: "border-purple-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Grade averages */}
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Grade-wise Average (1-4 scale)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={(schoolDash.grades || []).map((g: any) => ({ name: g.grade.replace("Grade ", "G"), avg: g.avg, full: g.grade }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any, _, p) => [`${v}/4`, p.payload.full]} />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {(schoolDash.grades || []).map((_: any, i: number) => (
                          <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Domain averages */}
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Average</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={(schoolDash.domains || []).map((d: any) => ({ name: d.domain, avg: d.avg }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip formatter={(v: any) => [`${v}/4`, "Avg"]} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                        {(schoolDash.domains || []).map((_: any, i: number) => (
                          <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subject averages */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Average</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={(schoolDash.subjects || []).map((s: any) => ({ name: s.subject, avg: s.avg }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [`${v}/4`, "Avg"]} />
                    <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                      {(schoolDash.subjects || []).map((_: any, i: number) => (
                        <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />
                      ))}
                    </Bar>
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
                      <p className="text-3xl font-bold text-gray-800">{schoolDash.levelDist?.[l.key] || 0}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top competencies */}
              {schoolDash.competencies?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Individual Competency Averages (Top 15)</h3>
                  <ResponsiveContainer width="100%" height={Math.min(400, schoolDash.competencies.slice(0, 15).length * 28)}>
                    <BarChart data={schoolDash.competencies.slice(0, 15).map((c: any) => ({ name: c.competency_code, avg: c.avg, domain: c.domain, level: c.level }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip formatter={(v: any, _, p) => [`${v}/4 — ${p.payload.domain}`, p.payload.level]} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                        {schoolDash.competencies.slice(0, 15).map((c: any, i: number) => (
                          <Cell key={i} fill={c.avg >= 3.5 ? "#10b981" : c.avg >= 2.5 ? "#6366f1" : c.avg >= 1.5 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── GRADE DASHBOARD ── */}
          {dashTab === "grade" && gradeDash && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total Students", value: gradeDash.total_students, color: "border-indigo-500" },
                  { label: "Assessed", value: gradeDash.total_assessed, color: "border-green-500" },
                  { label: "Overall Avg", value: gradeDash.overall_avg?.toFixed(2), color: "border-blue-500" },
                  { label: "Grade", value: gradeDash.grade, color: "border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Section-wise Average</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={(gradeDash.sections || []).map((s: any) => ({ name: s.section, avg: s.avg }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => [`${v}/4`, "Avg"]} />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {(gradeDash.sections || []).map((_: any, i: number) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Average</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={(gradeDash.domains || []).map((d: any) => ({ name: d.domain, avg: d.avg }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip formatter={(v: any) => [`${v}/4`, "Avg"]} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                        {(gradeDash.domains || []).map((_: any, i: number) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subject averages */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Average</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={(gradeDash.subjects || []).map((s: any) => ({ name: s.subject, avg: s.avg }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [`${v}/4`, "Avg"]} />
                    <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                      {(gradeDash.subjects || []).map((_: any, i: number) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Competency averages */}
              {gradeDash.competencies?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Competency Averages</h3>
                  <ResponsiveContainer width="100%" height={Math.min(400, gradeDash.competencies.slice(0, 15).length * 28)}>
                    <BarChart data={gradeDash.competencies.slice(0, 15).map((c: any) => ({ name: c.competency_code, avg: c.avg, domain: c.domain }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip formatter={(v: any, _, p) => [`${v}/4 — ${p.payload.domain}`, "Avg"]} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                        {gradeDash.competencies.slice(0, 15).map((c: any, i: number) => (
                          <Cell key={i} fill={c.avg >= 3.5 ? "#10b981" : c.avg >= 2.5 ? "#6366f1" : c.avg >= 1.5 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Student rankings */}
              {gradeDash.studentRankings?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Rankings</h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {gradeDash.studentRankings.map((s: any, i: number) => (
                      <div key={s.student_id} className="flex items-center justify-between p-2 rounded border border-gray-100 hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-6">{i + 1}.</span>
                          <span className="text-xs font-medium text-gray-800">{s.name}</span>
                          <span className="text-xs text-gray-400">{s.section}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.avg)}`}>{s.avg.toFixed(2)}/4</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION DASHBOARD ── */}
          {dashTab === "section" && sectionDash && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total Students", value: sectionDash.total_students, color: "border-indigo-500" },
                  { label: "Overall Avg", value: sectionDash.overall_avg?.toFixed(2), color: "border-green-500" },
                  { label: "Grade", value: sectionDash.grade, color: "border-blue-500" },
                  { label: "Section", value: sectionDash.section, color: "border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Domain averages */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Average</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={(sectionDash.domains || []).map((d: any) => ({ name: d.domain, avg: d.avg }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip formatter={(v: any) => [`${v}/4`, "Avg"]} />
                    <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                      {(sectionDash.domains || []).map((_: any, i: number) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Weakest competencies */}
              {sectionDash.weakest?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">⚠️ Weakest Competencies</h3>
                  <div className="space-y-2">
                    {sectionDash.weakest.map((c: any) => (
                      <div key={c.competency_id} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                        <div>
                          <span className="text-xs font-bold text-red-700">{c.competency_code}</span>
                          <span className="text-xs text-gray-500 ml-2">{c.domain}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(c.avg)}`}>{c.avg.toFixed(2)}/4</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Student domain breakdown table */}
              {sectionDash.studentDomainBreakdown?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Student × Domain Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-700 text-white">
                          <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 border-r border-indigo-600 min-w-[160px]">Student</th>
                          {(sectionDash.domains || []).map((d: any) => (
                            <th key={d.domain} className="px-3 py-2 text-center border-l border-indigo-600 min-w-[90px]">{d.domain}</th>
                          ))}
                          <th className="px-3 py-2 text-center border-l border-indigo-600 min-w-[80px]">Overall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionDash.studentDomainBreakdown.map((s: any, i: number) => (
                          <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit border-r border-gray-200">{s.student_name}</td>
                            {(sectionDash.domains || []).map((d: any) => {
                              const val = s.domain_avgs?.[d.domain] || 0;
                              return (
                                <td key={d.domain} className="px-3 py-2 text-center border-l border-gray-100">
                                  {val > 0 ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(val)}`}>{val.toFixed(1)}</span> : <span className="text-gray-300">—</span>}
                                </td>
                              );
                            })}
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
            </div>
          )}

          {/* ── STUDENT DASHBOARD ── */}
          {dashTab === "student" && studentDash && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
                <p className="text-lg font-bold text-gray-800">{studentDash.student?.name}</p>
                <p className="text-sm text-gray-500">{studentDash.student?.current_class} — {studentDash.student?.section}</p>
              </div>

              {/* Subject summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Average</h3>
                  <div className="space-y-2">
                    {(studentDash.subjectSummary || []).map((s: any) => (
                      <div key={s.subject} className="flex items-center justify-between p-2 rounded border border-gray-100">
                        <span className="text-xs font-medium text-gray-700">{s.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.avg)}`}>{s.avg.toFixed(2)}/4</span>
                          <span className="text-xs text-gray-400">{s.level?.split("–")[0].trim()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Domain summary */}
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain-wise Average</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={(studentDash.domainSummary || []).map((d: any) => ({ name: d.domain, avg: d.avg, subject: d.subject }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                      <Tooltip formatter={(v: any, _, p) => [`${v}/4 (${p.payload.subject})`, "Avg"]} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                        {(studentDash.domainSummary || []).map((_: any, i: number) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Individual competency scores */}
              {studentDash.competencyScores?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Individual Competency Scores</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-700 text-white">
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-left">Domain</th>
                          <th className="px-3 py-2 text-left">Subject</th>
                          <th className="px-3 py-2 text-center">Score</th>
                          <th className="px-3 py-2 text-center">Rating</th>
                          <th className="px-3 py-2 text-center">Attempts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentDash.competencyScores.map((c: any, i: number) => (
                          <tr key={c.competency_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 font-medium text-indigo-700">{c.competency_code}</td>
                            <td className="px-3 py-2 text-gray-600">{c.domain}</td>
                            <td className="px-3 py-2 text-gray-600">{c.subject}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(c.avg)}`}>{c.avg.toFixed(2)}/4</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded border ${RATING_COLORS[c.rating?.toLowerCase()] || "bg-gray-100"}`}>{c.rating}</span>
                            </td>
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

          {/* ── ALERTS ── */}
          {dashTab === "alerts" && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-yellow-800 mb-1">⚠️ Consecutive Decline Alert</h3>
                <p className="text-xs text-yellow-600">
                  Students whose overall competency average has dropped in 3 consecutive activities — needs attention.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Students with Consecutive Decline ({alerts.length})
                </h3>
                {alerts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No students with 3 consecutive declines found</p>
                ) : (
                  <div className="space-y-3">
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
                        <div className="flex gap-2 flex-wrap">
                          {s.scores.map((sc: any, j: number) => (
                            <div key={j} className={`text-center rounded px-2 py-1 text-xs border ${scoreBg(sc.avg)}`}>
                              <p className="font-bold">{sc.avg?.toFixed(2)}/4</p>
                              <p className="text-gray-500 text-xs truncate max-w-[80px]">{sc.name}</p>
                              <p className="text-gray-400 text-xs">{sc.date}</p>
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

          {/* Empty states */}
          {dashTab === "school" && !schoolDash && (
            <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400"><p className="text-sm">No data for {academicYear}. Add activities and enter marks first.</p></div>
          )}
          {dashTab === "grade" && !gradeDash && dashGrade && (
            <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400"><p className="text-sm">No data for {dashGrade}.</p></div>
          )}
          {dashTab === "section" && !sectionDash && dashSection && (
            <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400"><p className="text-sm">No data for {dashGrade} — {dashSection}.</p></div>
          )}
          {dashTab === "student" && !studentDash && dashSection && (
            <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400"><p className="text-sm">Select a student above to view their profile.</p></div>
          )}
        </div>
      )}
    </div>
  );
}