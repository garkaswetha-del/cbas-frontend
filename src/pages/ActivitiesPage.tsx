import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, Legend,
} from "recharts";

const API = "https://cbas-backend-production.up.railway.app";

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

const LEVEL_COLOR: Record<string,string> = {
  Beginning:"bg-red-100 text-red-700", Developing:"bg-orange-100 text-orange-700",
  Approaching:"bg-yellow-100 text-yellow-700", Meeting:"bg-lime-100 text-lime-700",
  Exceeding:"bg-green-100 text-green-700", Proficient:"bg-teal-100 text-teal-700",
  Advanced:"bg-blue-100 text-blue-700", Mastery:"bg-purple-100 text-purple-700",
};
const getLevel = (pct: number): string => {
  if (pct>=95) return "Mastery"; if (pct>=86) return "Advanced";
  if (pct>=76) return "Proficient"; if (pct>=66) return "Exceeding";
  if (pct>=51) return "Meeting"; if (pct>=36) return "Approaching";
  if (pct>=21) return "Developing"; return "Beginning";
};
const scoreBg = (pct: number) =>
  pct>=76?"bg-green-100 text-green-800":pct>=51?"bg-blue-100 text-blue-800":pct>=36?"bg-yellow-100 text-yellow-800":pct>0?"bg-red-100 text-red-800":"bg-gray-100 text-gray-400";

const DOMAIN_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#14b8a6",
];

export default function ActivitiesPage() {
  const [activeTab, setActiveTab] = useState<"activities" | "marks" | "report" | "dashboard">("activities");
  const [reportGrade, setReportGrade] = useState("");
  const [reportSection, setReportSection] = useState("");
  const [reportSections, setReportSections] = useState<string[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string|null>(null);
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
    grade: "", sections: [] as string[], activity_type: "Individual",
    activity_date: new Date().toISOString().split("T")[0],
    competency_mappings: [] as string[],
  });
  const [selectedComps, setSelectedComps] = useState<string[]>([]);
  const [rubrics, setRubrics] = useState<Record<string,{items:{name:string,max_marks:number}[]}>>({});

  // Multi-grade form helpers
  const [formGrades, setFormGrades] = useState<string[]>([]);
  const [formSubjects, setFormSubjects] = useState<string[]>([]);
  const [formSectionsMap, setFormSectionsMap] = useState<Record<string,string[]>>({});

  // Marks tab
  const [marksGrade, setMarksGrade] = useState("");
  const [marksSection, setMarksSection] = useState("");
  const [marksSubject, setMarksSubject] = useState("");
  const [marksSections, setMarksSections] = useState<string[]>([]);
  const [marksSubjects, setMarksSubjects] = useState<string[]>([]);
  const [combinedMarks, setCombinedMarks] = useState<any>(null);
  const [localMarks, setLocalMarks] = useState<Record<string,Record<string,Record<string,Record<string,number|null>>>>>({});
  const [saving, setSaving] = useState(false);

  // Dashboard tab
  const [dashTab, setDashTab] = useState<"school" | "grade" | "section" | "student" | "alerts" | "coverage" | "longitudinal">("school");
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
  const [coverageData, setCoverageData] = useState<any>(null);
  const [longitudinalData, setLongitudinalData] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // ── EFFECTS ───────────────────────────────────────────────────

  useEffect(() => { fetchActivities(); }, [filterGrade, filterSection, filterSubject, academicYear]);
  useEffect(() => { if (filterGrade) fetchSections(filterGrade, setSections); }, [filterGrade]);
  useEffect(() => { if (filterGrade) fetchSubjects(filterGrade); }, [filterGrade]);
  useEffect(() => { if (marksGrade) fetchSections(marksGrade, setMarksSections); }, [marksGrade]);
  useEffect(() => { if (marksGrade) { axios.get(`${API}/activities/subjects-for-grade/${encodeURIComponent(marksGrade)}`).then(r => setMarksSubjects(r.data || [])).catch(() => {}); } }, [marksGrade]);
  useEffect(() => { if (marksGrade && marksSection && marksSubject) fetchCombinedMarks(); }, [marksGrade, marksSection, marksSubject, academicYear]);
  useEffect(() => { if (reportGrade) { axios.get(`${API}/students/sections/${encodeURIComponent(reportGrade)}`).then(r=>setReportSections(r.data?.sections||[])).catch(()=>{}); } }, [reportGrade]);
  useEffect(() => { if (activeTab==="report" && reportGrade && reportSection) fetchReport(); }, [activeTab, reportGrade, reportSection, academicYear]);
  useEffect(() => { fetchCompetencies(); }, [form.grade, form.subject]);
  useEffect(() => {
    if (!formGrades.length) { setFormSubjects([]); setFormSectionsMap({}); setCompetencies([]); return; }
    const primary = formGrades[0];
    // Fetch subjects from competency mappings for this grade
    axios.get(`${API}/activities/competencies?grade=${encodeURIComponent(primary)}`).then(r=>{
      const comps: any[] = r.data?.competencies || (Array.isArray(r.data) ? r.data : []);
      const uniqueSubjects = [...new Set(comps.map((c:any)=>c.subject).filter(Boolean))].sort() as string[];
      setFormSubjects(uniqueSubjects);
    }).catch(()=>setFormSubjects([]));
    // Fetch sections for all selected grades
    axios.get(`${API}/students?limit=2000`).then(r=>{
      const students=r.data?.data||r.data||[];
      const map: Record<string,string[]>={};
      formGrades.forEach(g=>{ map[g]=([...new Set(students.filter((s:any)=>s.current_class===g).map((s:any)=>s.section).filter(Boolean))] as string[]).sort(); });
      setFormSectionsMap(map);
    }).catch(()=>{});
    setForm(p=>({...p, grade:primary, sections:[], subject:"", competency_mappings:[]}));
    setSelectedComps([]); setRubrics({}); setCompetencies([]);
  }, [JSON.stringify(formGrades)]);
  useEffect(() => {
    if (dashTab === "school") fetchSchoolDash();
    if (dashTab === "grade" && dashGrade) fetchGradeDash();
    if (dashTab === "section" && dashGrade && dashSection) fetchSectionDash();
    if (dashTab === "alerts") fetchAlerts();
    if (dashTab === "coverage" && dashGrade && dashSection) fetchCoverage();
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
      // Initialize localMarks per student per activity from saved competency_marks
      const marksInit: Record<string, Record<string, Record<string, Record<string, number|null>>>> = {};
      (r.data?.students || []).forEach((s: any) => {
        marksInit[s.student_id] = {};
        (r.data?.activities || []).forEach((act: any) => {
          marksInit[s.student_id][act.id] = {};
          const cm = s.activity_data?.[act.id]?.competency_marks || {};
          Object.entries(cm).forEach(([compId, rubricMarks]: [string, any]) => {
            marksInit[s.student_id][act.id][compId] = {};
            Object.entries(rubricMarks || {}).forEach(([idx, val]: [string, any]) => {
              marksInit[s.student_id][act.id][compId][idx] = val;
            });
          });
        });
      });
      setLocalMarks(marksInit);
      // Initialize local ratings
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

  const fetchCoverage = async () => {
    if (!dashGrade || !dashSection) return;
    try {
      const r = await axios.get(`${API}/activities/coverage/section/${encodeURIComponent(dashGrade)}/${encodeURIComponent(dashSection)}?academic_year=${academicYear}`);
      setCoverageData(r.data);
    } catch { setCoverageData(null); }
  };

  const fetchLongitudinal = async (studentId: string) => {
    if (!studentId) return;
    try {
      const r = await axios.get(`${API}/activities/longitudinal/student/${studentId}`);
      setLongitudinalData(r.data);
    } catch { setLongitudinalData(null); }
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

  const fetchReport = async () => {
    if (!reportGrade || !reportSection) return;
    setLoadingReport(true); setReportData(null);
    try {
      const r = await axios.get(`${API}/activities/report/subject-wise/${encodeURIComponent(reportGrade)}/${encodeURIComponent(reportSection)}?academic_year=${academicYear}`);
      setReportData(r.data);
    } catch {}
    setLoadingReport(false);
  };

  const updateMark = (studentId: string, activityId: string, compId: string, rubricIdx: string, value: number|null) => {
    setLocalMarks(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId]||{}),
        [activityId]: { ...(prev[studentId]?.[activityId]||{}),
          [compId]: { ...(prev[studentId]?.[activityId]?.[compId]||{}), [rubricIdx]: value }
        }
      }
    }));
  };

  const saveActivity = async () => {
    if (!form.name || (!editActivity && !formGrades.length) || !form.subject) { setMessage("❌ Name, Grade(s) and Subject are required"); setTimeout(()=>setMessage(""),3000); return; }
    if (!form.sections.length) { setMessage("❌ Select at least one section"); setTimeout(()=>setMessage(""),3000); return; }
    if (!selectedComps.length) { setMessage("❌ Select at least one competency"); setTimeout(()=>setMessage(""),3000); return; }
    try {
      const rubricsArr = selectedComps.map(cid=>{
        const comp=competencies.find((c:any)=>c.id===cid);
        const filteredItems=(rubrics[cid]?.items||[]).filter(item=>item.name.trim()||+item.max_marks>0);
        return {competency_id:cid, competency_code:comp?.competency_code||comp?.code||"", competency_name:comp?.description||comp?.name||"", rubric_items:filteredItems};
      });
      if (editActivity) {
        await axios.put(`${API}/activities/${editActivity.id}`, {...form, academic_year:academicYear, competency_mappings:selectedComps, rubrics:rubricsArr});
        setMessage("✅ Activity updated");
      } else {
        let totalCreated=0; const allSkipped: string[]=[];
        for (const grade of formGrades) {
          const gradeSecs=form.sections.filter(s=>(formSectionsMap[grade]||[]).includes(s));
          if (!gradeSecs.length) continue;
          const res=await axios.post(`${API}/activities`, {...form, grade, sections:gradeSecs, academic_year:academicYear, created_by:"admin", competency_mappings:selectedComps, rubrics:rubricsArr});
          totalCreated+=res.data?.created_count||0;
          allSkipped.push(...(res.data?.skipped_sections?.map((s:string)=>`${grade}-${s}`)||[]));
        }
        setMessage(allSkipped.length
          ? `✅ Created ${totalCreated} activity(ies). ⚠️ Skipped: ${allSkipped.join(", ")}`
          : `✅ Created ${totalCreated} activity(ies) across ${formGrades.length} grade(s)`);
      }
      setShowAddForm(false); setEditActivity(null); setSelectedComps([]); setRubrics({});
      setFormGrades([]); setFormSubjects([]); setFormSectionsMap({});
      setForm(p=>({...p,name:"",description:"",sections:[],grade:"",subject:"",competency_mappings:[]}));
      fetchActivities();
    } catch { setMessage("❌ Error saving"); }
    setTimeout(()=>setMessage(""),3000);
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

  const resetForm = () => {
    setFormGrades([]); setFormSubjects([]); setFormSectionsMap({}); setSelectedComps([]); setRubrics({}); setCompetencies([]);
    setForm({ name: "", description: "", subject: "", stage: "foundation", grade: "", sections: [], activity_type: "Individual", activity_date: new Date().toISOString().split("T")[0], competency_mappings: [] });
  };

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
        competency_marks: localMarks[s.student_id]?.[activityId] || {},
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
    <div className="p-3 sm:p-6">
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
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-nowrap">
        {[
          { id: "activities", label: "📋 Activities" },
          { id: "marks", label: "✏️ Marks Entry" },
          { id: "report", label: "📑 Subject Report" },
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
          {/* Filters — hidden when form is open */}
          <div className={`bg-white rounded-xl shadow border border-gray-200 p-4 ${showAddForm ? "hidden" : ""}`}>
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
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-5">
              <h2 className="text-sm font-bold text-gray-700">{editActivity ? "Edit Activity" : "New Activity"}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Activity Name *</label>
                  <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Story Writing" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"/></div>
                <div><label className="text-xs text-gray-500 block mb-1">Activity Type</label>
                  <select value={form.activity_type} onChange={e=>setForm(p=>({...p,activity_type:e.target.value}))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    {ACTIVITY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Date</label>
                  <input type="date" value={form.activity_date} onChange={e=>setForm(p=>({...p,activity_date:e.target.value}))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"/></div>
                <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Description</label>
                  <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full resize-none"/></div>
              </div>

              {/* Grade multi-select */}
              <div>
                <label className="text-xs text-gray-500 font-semibold block mb-1">
                  Grade(s) * ({formGrades.length} selected)
                  <button onClick={()=>setFormGrades([...CLASSES])} className="ml-2 text-indigo-600 hover:underline text-xs font-normal">All</button>
                  <button onClick={()=>setFormGrades([])} className="ml-2 text-gray-400 hover:underline text-xs font-normal">Clear</button>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CLASSES.map(g=>(
                    <button key={g} onClick={()=>setFormGrades(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g])}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${formGrades.includes(g)?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>{g}</button>
                  ))}
                </div>
              </div>

              {/* Subject + Stage */}
              {formGrades.length > 0 && (
                <div className="flex gap-4 flex-wrap items-end">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Subject *</label>
                    <select value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value,competency_mappings:[]}))}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[200px]">
                      <option value="">{formSubjects.length ? "Select Subject" : "No subjects mapped for this grade"}</option>
                      {formSubjects.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Stage</label>
                    <select value={form.stage} onChange={e=>setForm(p=>({...p,stage:e.target.value}))} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                      {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Sections across all selected grades */}
              {formGrades.length > 0 && (() => {
                const allSecs=[...new Set(Object.values(formSectionsMap).flat())].sort();
                if (!allSecs.length) return null;
                return (
                  <div>
                    <label className="text-xs text-gray-500 font-semibold block mb-1">
                      Sections * ({form.sections.length} selected)
                      <button onClick={()=>setForm(p=>({...p,sections:allSecs}))} className="ml-2 text-indigo-600 hover:underline text-xs font-normal">All</button>
                      <button onClick={()=>setForm(p=>({...p,sections:[]}))} className="ml-2 text-gray-400 hover:underline text-xs font-normal">Clear</button>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allSecs.map(s=>(
                        <button key={s} onClick={()=>setForm(p=>({...p,sections:p.sections.includes(s)?p.sections.filter(x=>x!==s):[...p.sections,s]}))}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${form.sections.includes(s)?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {competencies.length > 0 && (() => {
                const domains = [...new Set(competencies.map((c:any)=>c.domain||"General"))] as string[];
                const domColorMap: Record<string,string> = {};
                domains.forEach((d,i)=>{ domColorMap[d]=DOMAIN_COLORS[i%DOMAIN_COLORS.length]; });
                const grandTotal = selectedComps.reduce((sum,cid)=>sum+(rubrics[cid]?.items||[]).reduce((s,item)=>s+(+item.max_marks||0),0),0);
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
                      <table className="text-xs border-collapse w-full">
                        <thead>
                          <tr className="bg-indigo-700 text-white text-left">
                            <th className="px-2 py-2 w-8 text-center">✓</th>
                            <th className="px-3 py-2 min-w-[75px]">CG No.</th>
                            <th className="px-2 py-2 min-w-[100px]">Domain</th>
                            <th className="px-2 py-2 min-w-[220px]">Competency</th>
                            <th className="px-3 py-2 border-l border-indigo-600 min-w-[380px]">Rubrics (Name · /Max marks)</th>
                            <th className="px-2 py-2 text-center border-l border-indigo-600 min-w-[55px]">Total</th>
                            <th className="px-2 py-2 text-center min-w-[70px]">Coverage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competencies.map((c:any,idx:number)=>{
                            const checked=selectedComps.includes(c.id);
                            const rub=rubrics[c.id];
                            const items=rub?.items||[];
                            const compTotal=checked?items.reduce((s,item)=>s+(+item.max_marks||0),0):0;
                            const usedIn=activities.filter(a=>(a.rubrics||[]).some((r:any)=>r.competency_id===c.id)).length;
                            const domColor=domColorMap[c.domain||"General"]||"#6366f1";
                            return (
                              <tr key={c.id} className={`border-b border-gray-100 align-top ${checked?"bg-indigo-50":idx%2===0?"bg-white":"bg-gray-50"} hover:bg-indigo-50 transition-colors`}>
                                <td className="px-2 pt-3 text-center">
                                  <input type="checkbox" checked={checked}
                                    onChange={e=>{
                                      if(e.target.checked){
                                        setSelectedComps(p=>[...p,c.id]);
                                        setRubrics(r=>({...r,[c.id]:{items:[{name:"",max_marks:0}]}}));
                                        setForm(p=>({...p,competency_mappings:[...p.competency_mappings,c.id]}));
                                      } else {
                                        setSelectedComps(p=>p.filter(x=>x!==c.id));
                                        setRubrics(r=>{const n={...r};delete n[c.id];return n;});
                                        setForm(p=>({...p,competency_mappings:p.competency_mappings.filter(x=>x!==c.id)}));
                                      }
                                    }}
                                    className="w-4 h-4 accent-indigo-600 cursor-pointer"/>
                                </td>
                                <td className="px-3 pt-3 font-mono font-bold text-indigo-700 whitespace-nowrap">{c.competency_code||c.code||"—"}</td>
                                <td className="px-2 pt-3">
                                  <span className="px-1.5 py-0.5 rounded text-white font-medium leading-tight" style={{backgroundColor:domColor,fontSize:"10px",display:"inline-block"}}>
                                    {c.domain||"General"}
                                  </span>
                                </td>
                                <td className="px-2 py-2 text-gray-700">{c.description||c.name||""}</td>
                                <td className="px-3 py-2 border-l border-gray-100">
                                  {checked ? (
                                    <div className="space-y-1.5">
                                      {items.map((item,i)=>(
                                        <div key={i} className="flex items-center gap-1.5">
                                          <span className="text-gray-400 w-5 shrink-0 text-right">{i+1}.</span>
                                          <input value={item.name}
                                            onChange={e=>{const its=[...items];its[i]={...its[i],name:e.target.value};setRubrics(r=>({...r,[c.id]:{...(r[c.id]||{items:[]}),items:its}}));}}
                                            placeholder="Rubric name"
                                            className="border border-gray-300 rounded px-2 py-0.5 text-xs flex-1 bg-white min-w-[140px]"/>
                                          <input type="number" min={0} value={item.max_marks||""}
                                            onChange={e=>{const its=[...items];its[i]={...its[i],max_marks:+e.target.value};setRubrics(r=>({...r,[c.id]:{...(r[c.id]||{items:[]}),items:its}}));}}
                                            placeholder="0"
                                            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs w-14 text-center bg-white"/>
                                          <span className="text-gray-400 text-xs shrink-0">marks</span>
                                          {items.length>1&&(
                                            <button onClick={()=>{const its=items.filter((_,j)=>j!==i);setRubrics(r=>({...r,[c.id]:{...(r[c.id]||{items:[]}),items:its}}));}}
                                              className="text-red-400 hover:text-red-600 text-xs leading-none shrink-0">✕</button>
                                          )}
                                        </div>
                                      ))}
                                      <button onClick={()=>setRubrics(r=>({...r,[c.id]:{...(r[c.id]||{items:[]}),items:[...items,{name:"",max_marks:0}]}}))}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-0.5">+ Add Rubric</button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 italic">— select to add rubrics —</span>
                                  )}
                                </td>
                                <td className={`px-2 pt-3 text-center font-bold border-l border-gray-100 ${checked?"text-indigo-700":"text-gray-300"}`}>
                                  {checked?compTotal:"—"}
                                </td>
                                <td className="px-2 pt-3 text-center">
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
                              <td colSpan={3} className="px-3 py-2 font-bold text-indigo-700 text-xs text-right">Grand Total: {grandTotal} marks</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                );
              })()}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button onClick={saveActivity} className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">{editActivity?"Update":"Create Activity"}</button>
                <button onClick={()=>{setShowAddForm(false);setEditActivity(null);setSelectedComps([]);setRubrics({});}} className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}
          {/* Activities list — grouped by subject */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Activities ({activities.length})</h2>
            </div>
            {activities.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No activities found.</div>
            ) : (() => {
              const bySubject: Record<string,any[]> = {};
              activities.forEach((a:any)=>{const sub=a.subject||"General";if(!bySubject[sub])bySubject[sub]=[];bySubject[sub].push(a);});
              return (
                <div>
                  {Object.entries(bySubject).map(([subject,acts]:[string,any[]])=>(
                    <div key={subject}>
                      <div className="px-4 py-2 bg-indigo-50 border-y border-indigo-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 uppercase">{subject}</span>
                        <span className="text-xs text-indigo-500">{acts.length} activities</span>
                      </div>
                      <table className="w-full text-xs border-collapse">
                        <thead><tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                          <th className="px-4 py-2 text-left">Activity</th><th className="px-3 py-2 text-left">Grade · Section</th>
                          <th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Competencies</th><th className="px-3 py-2 text-center">Max Marks</th>
                          <th className="px-3 py-2 text-center">Actions</th>
                        </tr></thead>
                        <tbody>
                          {acts.map((a:any,i:number)=>(
                            <tr key={a.id} className={`border-b border-gray-50 ${i%2===0?"bg-white":"bg-gray-50"} hover:bg-indigo-50`}>
                              <td className="px-4 py-2.5 font-medium text-gray-800">{a.name}</td>
                              <td className="px-3 py-2.5 text-gray-500">{a.grade} · {a.section}</td>
                              <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{a.activity_type}</span></td>
                              <td className="px-3 py-2.5 text-gray-500">{a.activity_date||"-"}</td>
                              <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">
                                {((a.rubrics||[]) as any[]).slice(0,3).map((r:any)=>(<span key={r.competency_id} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">{r.competency_code}</span>))}
                                {(a.rubrics||[]).length>3&&<span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">+{(a.rubrics||[]).length-3}</span>}
                              </div></td>
                              <td className="px-3 py-2.5 text-center font-bold text-indigo-700">{a.total_max_marks||0}</td>
                              <td className="px-3 py-2.5 text-center"><div className="flex gap-1 justify-center">
                                <button onClick={()=>{setShowAddForm(true);setEditActivity(a);setSelectedComps((a.rubrics||[]).map((r:any)=>r.competency_id));setRubrics(Object.fromEntries((a.rubrics||[]).map((r:any)=>[r.competency_id,{items:(r.rubric_items||[]).length?r.rubric_items:[{name:"",max_marks:0}]}])));setForm({...a,sections:a.section?[a.section]:[]});}} className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">✏️</button>
                                <button onClick={()=>deleteActivity(a.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">🗑️</button>
                              </div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}


      {/* ── MARKS ENTRY TAB ── */}
      {activeTab === "marks" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4 flex gap-3 flex-wrap items-end">
            <div><label className="text-xs text-gray-500 block mb-1">Grade</label>
              <select value={marksGrade} onChange={e=>{setMarksGrade(e.target.value);setMarksSection("");setMarksSubject("");setCombinedMarks(null);}} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Select Grade</option>{CLASSES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
            {marksGrade&&<div><label className="text-xs text-gray-500 block mb-1">Section</label>
              <select value={marksSection} onChange={e=>{setMarksSection(e.target.value);setCombinedMarks(null);}} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Select Section</option>{marksSections.map(s=><option key={s} value={s}>{s}</option>)}</select></div>}
            {marksSection&&<div><label className="text-xs text-gray-500 block mb-1">Subject</label>
              <select value={marksSubject} onChange={e=>setMarksSubject(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Select Subject</option>{marksSubjects.map(s=><option key={s} value={s}>{s}</option>)}</select></div>}
          </div>
          {combinedMarks&&(
            <div className="space-y-6">
              {(combinedMarks.activities||[]).map((activity:any)=>{
                const rubricsList=activity.rubrics||[]; if(!rubricsList.length)return null;
                return (
                  <div key={activity.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between">
                      <div><p className="text-sm font-bold text-indigo-800">{activity.name}</p>
                        <p className="text-xs text-indigo-600">{activity.activity_date} · {rubricsList.length} competencies · Max: {activity.total_max_marks} marks</p></div>
                      <button onClick={()=>saveActivityMarks(activity.id)} disabled={saving} className="px-4 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">{saving?"Saving...":"💾 Save Marks"}</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-indigo-700 text-white">
                            <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[160px]">Student</th>
                            {rubricsList.map((rub:any)=>(
                              <th key={rub.competency_id} className="px-2 py-2 text-center border-l border-indigo-600" colSpan={(rub.rubric_items||[]).length+1}>
                                <div className="text-xs font-bold">[{rub.competency_code}]</div>
                                <div className="text-xs text-indigo-200 font-normal">{rub.competency_name?.slice(0,40)}</div>
                              </th>
                            ))}
                            <th className="px-2 py-2 text-center border-l border-indigo-600 min-w-[70px]">Total</th>
                            <th className="px-2 py-2 text-center min-w-[55px]">%</th>
                            <th className="px-2 py-2 text-center min-w-[90px]">Level</th>
                          </tr>
                          <tr className="bg-indigo-600 text-white">
                            <th className="px-3 py-1 sticky left-0 bg-indigo-600"></th>
                            {rubricsList.map((rub:any)=>(
                              <>{(rub.rubric_items||[]).map((item:any,i:number)=>(
                                <th key={i} className="px-2 py-1 text-center border-l border-indigo-500 min-w-[70px]">
                                  <div className="text-xs truncate max-w-[100px]">{item.name}</div>
                                  <div className="text-indigo-200 text-xs">/{item.max_marks}</div>
                                </th>
                              ))}
                              <th className="px-2 py-1 text-center border-l border-indigo-500 bg-indigo-800 min-w-[50px]">/{(rub.rubric_items||[]).reduce((s:number,it:any)=>s+(+it.max_marks||0),0)}</th></>
                            ))}
                            <th className="px-2 py-1 text-center border-l border-indigo-500 bg-indigo-800">/{activity.total_max_marks}</th>
                            <th className="px-2 py-1"></th><th className="px-2 py-1"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(combinedMarks.students||[]).map((s:any,idx:number)=>{
                            let obtained=0; let max=0;
                            rubricsList.forEach((rub:any)=>{(rub.rubric_items||[]).forEach((item:any,i:number)=>{max+=+(item.max_marks||0);obtained+=+(localMarks[s.student_id]?.[activity.id]?.[rub.competency_id]?.[String(i)]||0);});});
                            const pct=max>0?+((obtained/max)*100).toFixed(1):0; const level=getLevel(pct);
                            return (
                              <tr key={s.student_id} className={idx%2===0?"bg-white":"bg-gray-50"}>
                                <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit">{s.student_name}</td>
                                {rubricsList.map((rub:any)=>{
                                  const co=(rub.rubric_items||[]).reduce((sum:number,_:any,i:number)=>sum+(+(localMarks[s.student_id]?.[activity.id]?.[rub.competency_id]?.[String(i)]||0)),0);
                                  const cm=(rub.rubric_items||[]).reduce((sm:number,it:any)=>sm+(+it.max_marks||0),0);
                                  return (<>{(rub.rubric_items||[]).map((item:any,i:number)=>(
                                    <td key={i} className="px-2 py-1 text-center border-l border-gray-100">
                                      <input type="number" min={0} max={item.max_marks}
                                        value={localMarks[s.student_id]?.[activity.id]?.[rub.competency_id]?.[String(i)]??""}
                                        onChange={e=>{const v=e.target.value===""?null:Math.min(+e.target.value,item.max_marks);updateMark(s.student_id,activity.id,rub.competency_id,String(i),v);}}
                                        className="border border-gray-200 rounded px-1 py-0.5 w-14 text-center text-xs"/>
                                    </td>
                                  ))}
                                  <td className="px-2 py-1 text-center border-l border-gray-200 font-bold text-indigo-700 bg-indigo-50">{co}/{cm}</td></>);
                                })}
                                <td className="px-2 py-1 text-center border-l border-gray-200 font-bold">{obtained}/{max}</td>
                                <td className="px-2 py-1 text-center font-bold text-indigo-700">{pct>0?`${pct}%`:"-"}</td>
                                <td className="px-2 py-1 text-center">{pct>0&&<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLOR[level]||""}`}>{level}</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {(combinedMarks.activities||[]).length===0&&(
                <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No activities for {marksGrade} · {marksSection} · {marksSubject}</div>
              )}
            </div>
          )}
        </div>
      )}


      {activeTab === "report" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4 flex gap-4 flex-wrap items-end">
            <div><label className="text-xs text-gray-500 block mb-1">Grade</label>
              <select value={reportGrade} onChange={e=>{setReportGrade(e.target.value);setReportSection("");setReportData(null);}} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Select Grade</option>{CLASSES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
            {reportGrade&&<div><label className="text-xs text-gray-500 block mb-1">Section</label>
              <select value={reportSection} onChange={e=>{setReportSection(e.target.value);setReportData(null);}} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Select Section</option>{reportSections.map(s=><option key={s} value={s}>{s}</option>)}</select></div>}
            <button onClick={fetchReport} disabled={!reportGrade||!reportSection||loadingReport} className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loadingReport?"Loading...":"Generate Report"}</button>
          </div>
          {reportData&&!loadingReport&&(
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500"><p className="text-xs text-gray-500">Total Activities</p><p className="text-2xl font-bold">{reportData.report?.reduce((s:number,r:any)=>s+r.activities.length,0)||0}</p></div>
                <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500"><p className="text-xs text-gray-500">Subjects</p><p className="text-2xl font-bold">{reportData.report?.length||0}</p></div>
                <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange-500"><p className="text-xs text-gray-500">Competencies Mapped</p><p className="text-2xl font-bold">{reportData.report?.reduce((s:number,r:any)=>s+r.covered_competencies,0)||0}</p></div>
              </div>
              {(reportData.report||[]).map((subRep:any)=>(
                <div key={subRep.subject} className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                    <div><span className="text-sm font-bold text-indigo-800 uppercase">{subRep.subject}</span><span className="ml-3 text-xs text-indigo-600">{subRep.activities.length} activities</span></div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-indigo-700">{subRep.covered_competencies}/{subRep.total_competencies} ({subRep.coverage_percent}%)</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${subRep.coverage_percent>=80?"bg-green-500":subRep.coverage_percent>=50?"bg-yellow-500":"bg-red-500"}`} style={{width:`${subRep.coverage_percent}%`}}/></div>
                    </div>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                      <th className="px-4 py-2 text-left">Activity</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Competencies</th><th className="px-3 py-2 text-center">Marks</th><th className="px-3 py-2 text-center">Detail</th>
                    </tr></thead>
                    <tbody>
                      {subRep.activities.map((act:any,i:number)=>(
                        <>
                          <tr key={act.id} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{act.name}</td>
                            <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{act.activity_type}</span></td>
                            <td className="px-3 py-2.5 text-gray-500">{act.activity_date||"-"}</td>
                            <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{(act.rubrics||[]).map((r:any)=>(<span key={r.competency_id} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">{r.competency_code}</span>))}</div></td>
                            <td className="px-3 py-2.5 text-center font-bold text-indigo-700">{act.total_max_marks||0}</td>
                            <td className="px-3 py-2.5 text-center"><button onClick={()=>setExpandedActivity(expandedActivity===act.id?null:act.id)} className="text-xs text-indigo-600 hover:underline">{expandedActivity===act.id?"Hide":"View"}</button></td>
                          </tr>
                          {expandedActivity===act.id&&(<tr key={act.id+"_d"}><td colSpan={6} className="px-4 py-3 bg-indigo-50">
                            <div className="space-y-2">{(act.rubrics||[]).map((r:any)=>(
                              <div key={r.competency_id} className="bg-white rounded-lg p-3 border border-indigo-100">
                                <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-indigo-700">[{r.competency_code}]</span><span className="text-xs text-gray-600">{r.competency_name}</span><span className="ml-auto text-xs font-bold">{r.max_marks}m</span></div>
                                <div className="flex flex-wrap gap-2">{(r.rubric_items||[]).map((item:any,j:number)=>(<span key={j} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{item.name}: <strong>{item.max_marks}m</strong></span>))}</div>
                              </div>
                            ))}</div>
                          </td></tr>)}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* ── DASHBOARD TAB ── */}
      {activeTab === "dashboard" && (
        <div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-nowrap">
            {[
              { id: "school", label: "🏫 School" },
              { id: "grade", label: "📚 Grade" },
              { id: "section", label: "🏛 Section" },
              { id: "student", label: "👤 Student" },
              { id: "alerts", label: "⚠️ Alerts" },
              { id: "coverage", label: "🗺️ Coverage" },
              { id: "longitudinal", label: "📈 Longitudinal" },
            ].map(t => (
              <button key={t.id} onClick={() => setDashTab(t.id as any)}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${dashTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Grade/Section selectors */}
          {(dashTab === "grade" || dashTab === "section" || dashTab === "student" || dashTab === "coverage" || dashTab === "longitudinal") && (
            <div className="flex gap-3 mb-4 items-end flex-wrap">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={dashGrade} onChange={e => { setDashGrade(e.target.value); setDashSection(""); }}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="">Select Grade</option>
                  {CLASSES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {(dashTab === "section" || dashTab === "student" || dashTab === "coverage" || dashTab === "longitudinal") && dashGrade && (
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
              {(dashTab === "student" || dashTab === "longitudinal") && dashSection && (
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-gray-500 block mb-1">Student</label>
                  <select value={selectedStudentId} onChange={e => {
                    setSelectedStudentId(e.target.value);
                    if (e.target.value) {
                      if (dashTab === "student") fetchStudentDash(e.target.value);
                      if (dashTab === "longitudinal") fetchLongitudinal(e.target.value);
                    }
                  }} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                    <option value="">Select Student</option>
                    {studentList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── COVERAGE TAB ── */}
          {dashTab === "coverage" && (
            <div className="space-y-5 mt-4">
              {!dashSection ? (
                <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Select a grade and section above to view competency coverage.</div>
              ) : !coverageData ? (
                <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No coverage data yet. Create activities with competency mappings first.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500"><p className="text-xs text-gray-500">Total Competencies</p><p className="text-2xl font-bold text-gray-800">{coverageData.total_competencies}</p></div>
                    <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500"><p className="text-xs text-gray-500">Covered via Activities</p><p className="text-2xl font-bold text-green-700">{coverageData.activity_covered}</p><p className="text-xs text-gray-400">{coverageData.activity_coverage_percent}%</p></div>
                    <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-400"><p className="text-xs text-gray-500">Not Yet Covered</p><p className="text-2xl font-bold text-red-600">{coverageData.total_competencies - coverageData.activity_covered}</p></div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-gray-700">Overall Coverage — {dashGrade} · {dashSection}</h3><span className="text-sm font-bold text-indigo-600">{coverageData.activity_coverage_percent}%</span></div>
                    <div className="w-full bg-gray-200 rounded-full h-4"><div className="h-4 rounded-full bg-indigo-500" style={{ width: `${coverageData.activity_coverage_percent}%` }} /></div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Coverage by Subject</h3>
                    <div className="space-y-3">
                      {coverageData.bySubject?.map((s: any, i: number) => (
                        <div key={s.subject}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{s.subject}</span>
                            <div className="flex items-center gap-3 text-xs"><span className="text-green-600 font-bold">{s.covered} covered</span><span className="text-red-500">{s.uncovered} not covered</span><span className="font-bold text-indigo-600">{s.coverage_percent}%</span></div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5"><div className="h-2.5 rounded-full" style={{ width: `${s.coverage_percent}%`, backgroundColor: ["#3b82f6","#22c55e","#a855f7","#f97316","#ec4899","#f59e0b"][i%6] }} /></div>
                          {s.uncovered_competencies?.length > 0 && (
                            <details className="mt-1">
                              <summary className="text-xs text-red-500 cursor-pointer">▶ {s.uncovered_competencies.length} not yet covered</summary>
                              <div className="mt-1 ml-3 space-y-0.5">
                                {s.uncovered_competencies.map((c: any, j: number) => (
                                  <div key={j} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                                    <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                                    <span className="font-mono text-red-600 font-semibold">{c.competency_code}</span>
                                    <span className="truncate">{c.description?.substring(0,80)}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Student-wise Coverage Ranking</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead><tr className="bg-indigo-700 text-white"><th className="px-3 py-2 text-center w-10">Rank</th><th className="px-3 py-2 text-left min-w-[160px]">Student</th><th className="px-3 py-2 text-center">Covered</th><th className="px-3 py-2 text-center">Total</th><th className="px-3 py-2 text-center min-w-[120px]">Coverage %</th><th className="px-3 py-2 text-center">Avg Score</th></tr></thead>
                        <tbody>
                          {coverageData.studentCoverage?.map((s: any, i: number) => (
                            <tr key={s.student_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                              <td className="px-3 py-2 text-center text-gray-400 font-bold">{i+1}</td>
                              <td className="px-3 py-2 font-medium text-gray-800">{s.student_name}</td>
                              <td className="px-3 py-2 text-center text-green-700 font-bold">{s.covered}</td>
                              <td className="px-3 py-2 text-center text-gray-500">{s.total}</td>
                              <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="flex-1 bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-indigo-500" style={{width:`${s.coverage_percent}%`}} /></div><span className="font-bold text-indigo-600 w-10 text-right">{s.coverage_percent}%</span></div></td>
                              <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.avg_score>=3.5?"bg-purple-100 text-purple-700":s.avg_score>=2.5?"bg-green-100 text-green-700":s.avg_score>=1.5?"bg-yellow-100 text-yellow-700":s.avg_score>0?"bg-red-100 text-red-700":"bg-gray-100 text-gray-400"}`}>{s.avg_score>0?s.avg_score.toFixed(2):"—"}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── LONGITUDINAL TAB ── */}
          {dashTab === "longitudinal" && (
            <div className="space-y-5 mt-4">
              {!selectedStudentId ? (
                <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Select a grade, section and student above to view their Pre-KG → Grade 10 journey.</div>
              ) : !longitudinalData ? (
                <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No longitudinal data yet. Student needs activity assessments across multiple years.</div>
              ) : (
                <>
                  <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
                    <h2 className="text-base font-bold text-gray-800">{longitudinalData.student?.name}</h2>
                    <p className="text-sm text-gray-500">Current: {longitudinalData.student?.current_class} · Assessed across {longitudinalData.academicYears?.length} year(s)</p>
                  </div>
                  {longitudinalData.gradeTimeline?.length > 0 && (
                    <div className="bg-white rounded-xl shadow p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">📈 Overall Journey — Pre-KG to Grade 10</h3>
                      <p className="text-xs text-gray-400 mb-3">Average competency score per grade · 1=Beginning → 4=Exceeding</p>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={longitudinalData.gradeTimeline} margin={{top:10,right:20,left:0,bottom:10}}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="grade" tick={{fontSize:10}} />
                          <YAxis domain={[0,4]} ticks={[1,2,3,4]} tickFormatter={(v)=>v===1?"Beg":v===2?"App":v===3?"Meet":"Exc"} tick={{fontSize:9}} />
                          <Tooltip formatter={(v:any)=>[`${Number(v).toFixed(2)} — ${Number(v)>=3.5?"Exceeding":Number(v)>=2.5?"Meeting":Number(v)>=1.5?"Approaching":"Beginning"}`,"Avg Score"]} />
                          <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={3} dot={{fill:"#6366f1",r:6}} activeDot={{r:8}} label={{position:"top",fontSize:10,fill:"#6366f1",formatter:(v:any)=>Number(v).toFixed(1)}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {longitudinalData.timeline?.length > 0 && longitudinalData.subjects?.length > 0 && (
                    <div className="bg-white rounded-xl shadow p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">📊 Subject-wise Scores by Academic Year</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={longitudinalData.timeline} margin={{top:10,right:20,left:0,bottom:40}}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="academic_year" tick={{fontSize:10}} />
                          <YAxis domain={[0,4]} ticks={[1,2,3,4]} tickFormatter={(v)=>v===1?"Beg":v===2?"App":v===3?"Meet":"Exc"} tick={{fontSize:9}} />
                          <Tooltip formatter={(v:any,name:any)=>[v?`${Number(v).toFixed(2)}`:"Not assessed",name]} />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize:"10px",paddingTop:"8px"}} />
                          {longitudinalData.subjects?.map((sub:string,i:number)=>(
                            <Line key={sub} type="monotone" dataKey={sub} stroke={["#3b82f6","#22c55e","#a855f7","#f97316","#ec4899","#f59e0b","#06b6d4","#84cc16"][i%8]} strokeWidth={2} dot={{r:4}} connectNulls={false} />
                          ))}
                          <Line type="monotone" dataKey="overall" stroke="#374151" strokeWidth={3} strokeDasharray="5 5" dot={{r:5}} connectNulls={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {longitudinalData.timeline?.length > 0 && (
                    <div className="bg-white rounded-xl shadow p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Year-wise Summary</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-indigo-700 text-white"><th className="px-3 py-2 text-left">Year</th><th className="px-3 py-2 text-center">Grade</th>{longitudinalData.subjects?.map((s:string)=><th key={s} className="px-3 py-2 text-center border-l border-indigo-600">{s}</th>)}<th className="px-3 py-2 text-center border-l border-indigo-600">Overall</th></tr></thead>
                          <tbody>
                            {longitudinalData.timeline?.map((row:any,i:number)=>(
                              <tr key={row.academic_year} className={i%2===0?"bg-white":"bg-gray-50"}>
                                <td className="px-3 py-2 font-bold text-indigo-700">{row.academic_year}</td>
                                <td className="px-3 py-2 text-center text-gray-600">{row.grade}</td>
                                {longitudinalData.subjects?.map((sub:string)=>(
                                  <td key={sub} className="px-3 py-2 text-center border-l border-gray-100">
                                    {row[sub]!=null?<span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row[sub]>=3.5?"bg-purple-100 text-purple-700":row[sub]>=2.5?"bg-green-100 text-green-700":row[sub]>=1.5?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700"}`}>{Number(row[sub]).toFixed(1)}</span>:<span className="text-gray-300">—</span>}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center border-l border-gray-100">
                                  {row.overall!=null?<span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.overall>=3.5?"bg-purple-100 text-purple-700":row.overall>=2.5?"bg-green-100 text-green-700":row.overall>=1.5?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700"}`}>{Number(row.overall).toFixed(2)}</span>:<span className="text-gray-300">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {dashTab === "school" && schoolDash && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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