import { useState, useEffect } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line } from "recharts";

const API = "https://cbas-backend-production.up.railway.app";
const ACADEMIC_YEAR = "2025-26";
const CLASSES = ["Pre-KG", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];
const LEVEL_COLORS_ARR = ["#ef4444", "#f59e0b", "#22c55e", "#a855f7"];
const SUBJECT_COLORS_ARR = ["#3b82f6","#22c55e","#a855f7","#f97316","#ec4899","#f59e0b","#06b6d4","#84cc16","#14b8a6","#6366f1"];

const RATING_COLOR: Record<string, string> = {
  beginning: "bg-red-100 text-red-700",
  approaching: "bg-yellow-100 text-yellow-700",
  meeting: "bg-green-100 text-green-700",
  exceeding: "bg-purple-100 text-purple-700",
};

const SUBJECT_COLOR: Record<string, string> = {
  language: "#3b82f6",
  numeracy: "#22c55e",
  science: "#a855f7",
  social_science: "#f97316",
  arts: "#ec4899",
  foundation: "#f59e0b",
};

const KPICard = ({ label, value, color }: any) => (
  <div className={`bg-white rounded-xl shadow p-4 border-l-4 ${color}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
  </div>
);

const ratingBadge = (rating: string) => rating ? (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RATING_COLOR[rating] || "bg-gray-100 text-gray-600"}`}>
    {rating.charAt(0).toUpperCase() + rating.slice(1)}
  </span>
) : <span className="text-gray-300 text-xs">—</span>;

export default function ActivitiesDashboard() {
  const [activeTab, setActiveTab] = useState<"school" | "grade" | "section" | "student" | "coverage" | "longitudinal">("school");
  const [selectedGrade, setSelectedGrade] = useState("Grade 1");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [schoolData, setSchoolData] = useState<any>(null);
  const [gradeData, setGradeData] = useState<any>(null);
  const [sectionData, setSectionData] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [coverageData, setCoverageData] = useState<any>(null);
  const [longitudinalData, setLongitudinalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (activeTab === "school") fetchSchool(); }, [activeTab]);
  useEffect(() => { if (activeTab === "grade") fetchGrade(); }, [activeTab, selectedGrade]);
  useEffect(() => { if (activeTab === "section" && selectedSection) fetchSection(); }, [activeTab, selectedGrade, selectedSection]);
  useEffect(() => { if (activeTab === "student" && selectedStudentId) fetchStudent(); }, [activeTab, selectedStudentId]);
  useEffect(() => { if (activeTab === "coverage" && selectedSection) fetchCoverage(); }, [activeTab, selectedGrade, selectedSection]);
  useEffect(() => { if (activeTab === "longitudinal" && selectedStudentId) fetchLongitudinal(); }, [activeTab, selectedStudentId]);
  useEffect(() => { fetchSections(); }, [selectedGrade]);
  useEffect(() => { if (selectedSection) fetchStudents(); }, [selectedGrade, selectedSection]);

  const fetchSections = async () => {
    try {
      const res = await axios.get(`${API}/students?grade=${selectedGrade}`);
      const unique = [...new Set(res.data.map((s: any) => s.section).filter(Boolean))] as string[];
      setSections(unique.sort());
      if (unique.length > 0) setSelectedSection(unique[0]);
    } catch { setSections([]); }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API}/students?grade=${selectedGrade}&section=${selectedSection}`);
      setStudents(res.data);
    } catch { setStudents([]); }
  };

  const fetchSchool = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/activities/dashboard/school?academic_year=${ACADEMIC_YEAR}`);
      setSchoolData(res.data);
    } catch { }
    setLoading(false);
  };

  const fetchGrade = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/activities/dashboard/grade/${encodeURIComponent(selectedGrade)}?academic_year=${ACADEMIC_YEAR}`);
      setGradeData(res.data);
    } catch { }
    setLoading(false);
  };

  const fetchSection = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/activities/dashboard/section/${encodeURIComponent(selectedGrade)}/${encodeURIComponent(selectedSection)}?academic_year=${ACADEMIC_YEAR}`);
      setSectionData(res.data);
    } catch { }
    setLoading(false);
  };

  const fetchStudent = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/activities/dashboard/student/${selectedStudentId}?academic_year=${ACADEMIC_YEAR}`);
      setStudentData(res.data);
    } catch { }
    setLoading(false);
  };

  const fetchCoverage = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/activities/coverage/section/${encodeURIComponent(selectedGrade)}/${encodeURIComponent(selectedSection)}?academic_year=${ACADEMIC_YEAR}`);
      setCoverageData(res.data);
    } catch { }
    setLoading(false);
  };

  const fetchLongitudinal = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/activities/longitudinal/student/${selectedStudentId}`);
      setLongitudinalData(res.data);
    } catch { }
    setLoading(false);
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Activities & Competency Dashboard</h1>
        <p className="text-sm text-gray-500">Competency performance across all levels — {ACADEMIC_YEAR}</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-5 flex-wrap items-end">
        {(activeTab === "grade" || activeTab === "section" || activeTab === "student" || activeTab === "coverage" || activeTab === "longitudinal") && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Grade</label>
            <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {(activeTab === "section" || activeTab === "student" || activeTab === "coverage" || activeTab === "longitudinal") && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Section</label>
            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        {(activeTab === "student" || activeTab === "longitudinal") && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Student</label>
            <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              <option value="">Select student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 flex-nowrap items-center">
        {[
          { id: "school", label: "🏫 School" },
          { id: "grade", label: "📚 Grade" },
          { id: "section", label: "🏷️ Section" },
          { id: "student", label: "🎓 Student" },
          { id: "coverage", label: "🗺️ Coverage" },
          { id: "longitudinal", label: "📈 Longitudinal" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${activeTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
        <button onClick={() => {
          if (activeTab==="school") fetchSchool();
          else if (activeTab==="grade") fetchGrade();
          else if (activeTab==="section") fetchSection();
          else if (activeTab==="student") fetchStudent();
        }} className="ml-auto px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1">
          🔄 Refresh
        </button>
      </div>

      {loading && <div className="text-center py-10 text-gray-400">Loading...</div>}

      {/* ── SCHOOL DASHBOARD ── */}
      {activeTab === "school" && schoolData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard label="Total Students" value={schoolData.total_students} color="border-indigo-500" />
            <KPICard label="Assessed" value={schoolData.assessed} color="border-green-500" />
            <KPICard label="Not Assessed" value={schoolData.total_students - schoolData.assessed} color="border-red-400" />
            <KPICard label="Overall Avg" value={schoolData.overall_avg ? `${schoolData.overall_avg}/4` : "—"} color="border-purple-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Level Distribution */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Level Distribution</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[
                    { name: "L1 Beginning", value: schoolData.levelDist?.L1 || 0 },
                    { name: "L2 Approaching", value: schoolData.levelDist?.L2 || 0 },
                    { name: "L3 Meeting", value: schoolData.levelDist?.L3 || 0 },
                    { name: "L4 Exceeding", value: schoolData.levelDist?.L4 || 0 },
                  ]} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                    {LEVEL_COLORS_ARR.map((color, i) => <Cell key={i} fill={color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Subject-wise */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Average</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={schoolData.subjects}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 4]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="avg" name="Avg Score" radius={[4, 4, 0, 0]}>
                    {schoolData.subjects?.map((s: any, i: number) => (
                      <Cell key={i} fill={SUBJECT_COLOR[s.subject] || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grade-wise */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Grade-wise Performance</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={schoolData.grades}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 4]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avg" name="Avg Score" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top and Bottom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">🏆 Top 5 Students</h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Grade</th>
                    <th className="px-3 py-2 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolData.top5?.map((s: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1 font-medium">{s.name}</td>
                      <td className="px-3 py-1 text-gray-500 text-xs">{s.grade} {s.section}</td>
                      <td className="px-3 py-1 text-center font-bold text-indigo-700">{s.avg}/4</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">⚠️ Bottom 5 Students</h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Grade</th>
                    <th className="px-3 py-2 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolData.bottom5?.map((s: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1 font-medium">{s.name}</td>
                      <td className="px-3 py-1 text-gray-500 text-xs">{s.grade} {s.section}</td>
                      <td className="px-3 py-1 text-center font-bold text-red-600">{s.avg}/4</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── GRADE DASHBOARD ── */}
      {activeTab === "grade" && gradeData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard label="Grade" value={gradeData.grade} color="border-indigo-500" />
            <KPICard label="Total Students" value={gradeData.total_students} color="border-blue-500" />
            <KPICard label="Assessed" value={gradeData.total_assessed} color="border-green-500" />
            <KPICard label="Sections" value={gradeData.sections?.length || 0} color="border-purple-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Section-wise Performance</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gradeData.sections}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="section" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="avg" name="Avg Score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Performance</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gradeData.subjects}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 4]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="avg" name="Avg Score" radius={[4, 4, 0, 0]}>
                    {gradeData.subjects?.map((s: any, i: number) => (
                      <Cell key={i} fill={SUBJECT_COLOR[s.subject] || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">🏆 Top 5 in {gradeData.grade}</h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Section</th>
                    <th className="px-3 py-2 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeData.top5?.map((s: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1 font-medium">{s.name}</td>
                      <td className="px-3 py-1 text-gray-500">{s.section}</td>
                      <td className="px-3 py-1 text-center font-bold text-indigo-700">{s.avg}/4</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">⚠️ Bottom 5 in {gradeData.grade}</h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Section</th>
                    <th className="px-3 py-2 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeData.bottom5?.map((s: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1 font-medium">{s.name}</td>
                      <td className="px-3 py-1 text-gray-500">{s.section}</td>
                      <td className="px-3 py-1 text-center font-bold text-red-600">{s.avg}/4</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION DASHBOARD ── */}
      {activeTab === "section" && sectionData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <KPICard label="Section" value={`${sectionData.grade} — ${sectionData.section}`} color="border-indigo-500" />
            <KPICard label="Total Students" value={sectionData.total_students} color="border-blue-500" />
            <KPICard label="Weakest Areas" value={sectionData.weakest?.length || 0} color="border-red-400" />
          </div>

          {/* Weakest Competencies */}
          {sectionData.weakest?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">⚠️ Weakest Competencies in this Section</h2>
              <div className="space-y-2">
                {sectionData.weakest.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-700">{c.competency_code || c.competency_id}</span>
                      <span className="text-xs text-gray-500 ml-2">{c.domain} · {c.subject}</span>
                    </div>
                    <span className="text-xs font-bold text-red-600">{c.avg}/4</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student heatmap */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Student Performance Overview</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-center">Overall Avg</th>
                    <th className="px-3 py-2 text-center">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionData.students?.sort((a: any, b: any) => b.overall_avg - a.overall_avg).map((s: any, i: number) => (
                    <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-gray-800">
                        <button onClick={() => { setSelectedStudentId(s.student_id); setActiveTab("student"); }}
                          className="text-indigo-700 hover:underline">
                          {s.student_name}
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-center font-bold text-indigo-700">
                        {s.overall_avg > 0 ? `${s.overall_avg}/4` : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-center">{ratingBadge(s.level?.toLowerCase().split('–')[1]?.trim() || "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── STUDENT DASHBOARD ── */}
      {activeTab === "student" && studentData && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-800">{studentData.student?.name}</h2>
                <p className="text-xs text-gray-500">{studentData.student?.current_class} — {studentData.student?.section} · {ACADEMIC_YEAR}</p>
              </div>
              {studentData.subjectSummary?.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Overall Average</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {(studentData.subjectSummary.reduce((sum: number, s: any) => sum + s.avg, 0) / studentData.subjectSummary.length).toFixed(2)}/4
                  </p>
                </div>
              )}
            </div>
          </div>

          {studentData.subjectSummary?.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              No competency assessments yet for this student. Enter marks through the Activities page.
            </div>
          )}

          {/* Subject summary */}
          {studentData.subjectSummary?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Performance</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={studentData.subjectSummary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="avg" name="Avg Score" radius={[4, 4, 0, 0]}>
                      {studentData.subjectSummary.map((s: any, i: number) => (
                        <Cell key={i} fill={SUBJECT_COLOR[s.subject] || "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar chart */}
              {studentData.domainSummary?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Domain Radar</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={studentData.domainSummary.slice(0, 8)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="domain" tick={{ fontSize: 9 }} />
                      <Radar name="Score" dataKey="avg" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Subject breakdown cards */}
          {studentData.subjectSummary?.map((s: any) => (
            <div key={s.subject} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 capitalize">{s.subject.replace('_', ' ')}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-indigo-700">{s.avg}/4</span>
                  {ratingBadge(s.avg >= 3.5 ? "exceeding" : s.avg >= 2.5 ? "meeting" : s.avg >= 1.5 ? "approaching" : "beginning")}
                </div>
              </div>

              {/* Domain breakdown for this subject */}
              <div className="space-y-2">
                {studentData.domainSummary?.filter((d: any) => d.subject === s.subject).map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-32 truncate">{d.domain}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(d.avg / 4) * 100}%`,
                          backgroundColor: d.avg >= 3.5 ? "#a855f7" : d.avg >= 2.5 ? "#22c55e" : d.avg >= 1.5 ? "#f59e0b" : "#ef4444"
                        }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-10 text-right">{d.avg}/4</span>
                    {ratingBadge(d.avg >= 3.5 ? "exceeding" : d.avg >= 2.5 ? "meeting" : d.avg >= 1.5 ? "approaching" : "beginning")}
                  </div>
                ))}
              </div>

              {/* Individual competency scores */}
              <div className="mt-3 space-y-1">
                {studentData.scores?.filter((sc: any) => sc.subject === s.subject).map((sc: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                    <span className="font-mono font-semibold text-indigo-600">{sc.competency_code}</span>
                    <span className="text-gray-500 text-xs truncate max-w-xs mx-2">{sc.competency_name?.substring(0, 60)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{sc.attempt_count}x</span>
                      {ratingBadge(sc.best_rating)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── COVERAGE TAB ── */}
      {activeTab === "coverage" && (
        <div className="space-y-5">
          {!selectedSection ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Select a grade and section above to view coverage.</div>
          ) : !coverageData ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">{loading ? "Loading..." : "No coverage data found."}</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
                  <p className="text-xs text-gray-500">Total Competencies</p>
                  <p className="text-2xl font-bold text-gray-800">{coverageData.total_competencies}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                  <p className="text-xs text-gray-500">Covered via Activities</p>
                  <p className="text-2xl font-bold text-green-700">{coverageData.activity_covered}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{coverageData.activity_coverage_percent}%</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-400">
                  <p className="text-xs text-gray-500">Not Yet Covered</p>
                  <p className="text-2xl font-bold text-red-600">{coverageData.total_competencies - coverageData.activity_covered}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Overall Coverage — {selectedGrade} · {selectedSection}</h3>
                  <span className="text-sm font-bold text-indigo-600">{coverageData.activity_coverage_percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="h-4 rounded-full bg-indigo-500 transition-all" style={{ width: `${coverageData.activity_coverage_percent}%` }} />
                </div>
              </div>

              {/* By Subject */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Coverage by Subject</h3>
                <div className="space-y-3">
                  {coverageData.bySubject?.map((s: any, i: number) => (
                    <div key={s.subject}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{s.subject}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-green-600 font-bold">{s.covered} covered</span>
                          <span className="text-red-500">{s.uncovered} not covered</span>
                          <span className="font-bold text-indigo-600">{s.coverage_percent}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full transition-all"
                          style={{ width: `${s.coverage_percent}%`, backgroundColor: SUBJECT_COLORS_ARR[i % SUBJECT_COLORS_ARR.length] }} />
                      </div>
                      {/* Uncovered competencies list */}
                      {s.uncovered_competencies?.length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">
                            ▶ {s.uncovered_competencies.length} not yet covered
                          </summary>
                          <div className="mt-1 ml-3 space-y-0.5">
                            {s.uncovered_competencies.map((c: any, j: number) => (
                              <div key={j} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                                <span className="font-mono text-red-600 font-semibold">{c.competency_code}</span>
                                <span className="truncate">{c.description?.substring(0, 80)}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Student-wise coverage table */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Student-wise Coverage Ranking</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-center w-10">Rank</th>
                        <th className="px-3 py-2 text-left min-w-[160px]">Student</th>
                        <th className="px-3 py-2 text-center">Covered</th>
                        <th className="px-3 py-2 text-center">Total</th>
                        <th className="px-3 py-2 text-center min-w-[120px]">Coverage %</th>
                        <th className="px-3 py-2 text-center">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coverageData.studentCoverage?.map((s: any, i: number) => (
                        <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 text-center text-gray-400 font-bold">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{s.student_name}</td>
                          <td className="px-3 py-2 text-center text-green-700 font-bold">{s.covered}</td>
                          <td className="px-3 py-2 text-center text-gray-500">{s.total}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="h-2 rounded-full bg-indigo-500"
                                  style={{ width: `${s.coverage_percent}%` }} />
                              </div>
                              <span className="font-bold text-indigo-600 w-10 text-right">{s.coverage_percent}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              s.avg_score >= 3.5 ? "bg-purple-100 text-purple-700" :
                              s.avg_score >= 2.5 ? "bg-green-100 text-green-700" :
                              s.avg_score >= 1.5 ? "bg-yellow-100 text-yellow-700" :
                              s.avg_score > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-400"
                            }`}>
                              {s.avg_score > 0 ? s.avg_score.toFixed(2) : "—"}
                            </span>
                          </td>
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
      {activeTab === "longitudinal" && (
        <div className="space-y-5">
          {!selectedStudentId ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Select a grade, section and student above to view their journey.</div>
          ) : !longitudinalData ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">{loading ? "Loading..." : "No longitudinal data found. Student may not have any activity assessments yet."}</div>
          ) : (
            <>
              {/* Student header */}
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
                <h2 className="text-base font-bold text-gray-800">{longitudinalData.student?.name}</h2>
                <p className="text-sm text-gray-500">Current Grade: {longitudinalData.student?.current_class} · Section: {longitudinalData.student?.section}</p>
                <p className="text-xs text-gray-400 mt-0.5">Competency journey across {longitudinalData.academicYears?.length} academic year(s)</p>
              </div>

              {/* Grade-wise overall progress — THE KEY LONGITUDINAL CHART */}
              {longitudinalData.gradeTimeline?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">📈 Overall Journey — Pre-KG to Grade 10</h3>
                  <p className="text-xs text-gray-400 mb-3">Average competency score per grade · Scale 1–4 (Beginning → Exceeding)</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={longitudinalData.gradeTimeline} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]}
                        tickFormatter={(v) => v === 1 ? "Beg" : v === 2 ? "App" : v === 3 ? "Meet" : "Exc"}
                        tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: any) => [
                        `${Number(v).toFixed(2)} — ${Number(v) >= 3.5 ? "Exceeding" : Number(v) >= 2.5 ? "Meeting" : Number(v) >= 1.5 ? "Approaching" : "Beginning"}`,
                        "Avg Score"
                      ]} />
                      <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={3}
                        dot={{ fill: "#6366f1", r: 6 }} activeDot={{ r: 8 }}
                        label={{ position: "top", fontSize: 10, fill: "#6366f1", formatter: (v: any) => Number(v).toFixed(1) }} />
                    </LineChart>
                  </ResponsiveContainer>
                  {/* Level indicators */}
                  <div className="flex gap-3 mt-2 flex-wrap justify-center">
                    {[
                      { label: "Exceeding (4)", color: "#a855f7" }, { label: "Meeting (3)", color: "#22c55e" },
                      { label: "Approaching (2)", color: "#f59e0b" }, { label: "Beginning (1)", color: "#ef4444" },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1 text-xs text-gray-500">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Academic year timeline — per subject */}
              {longitudinalData.timeline?.length > 0 && longitudinalData.subjects?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">📊 Subject-wise Scores by Academic Year</h3>
                  <p className="text-xs text-gray-400 mb-3">Each line = one subject · Dashed = Overall average</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={longitudinalData.timeline} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="academic_year" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]}
                        tickFormatter={(v) => v === 1 ? "Beg" : v === 2 ? "App" : v === 3 ? "Meet" : "Exc"}
                        tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: any, name: any) => [
                        v ? `${Number(v).toFixed(2)}` : "Not assessed", name
                      ]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                      {longitudinalData.subjects?.map((sub: string, i: number) => (
                        <Line key={sub} type="monotone" dataKey={sub}
                          stroke={SUBJECT_COLORS_ARR[i % SUBJECT_COLORS_ARR.length]}
                          strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                      ))}
                      <Line type="monotone" dataKey="overall" stroke="#374151" strokeWidth={3}
                        strokeDasharray="5 5" dot={{ r: 5 }} activeDot={{ r: 7 }} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Year-wise summary table */}
              {longitudinalData.timeline?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Year-wise Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-700 text-white">
                          <th className="px-3 py-2 text-left">Academic Year</th>
                          <th className="px-3 py-2 text-center">Grade</th>
                          {longitudinalData.subjects?.map((s: string) => (
                            <th key={s} className="px-3 py-2 text-center border-l border-indigo-600">{s}</th>
                          ))}
                          <th className="px-3 py-2 text-center border-l border-indigo-600">Overall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {longitudinalData.timeline?.map((row: any, i: number) => (
                          <tr key={row.academic_year} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 font-bold text-indigo-700">{row.academic_year}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{row.grade}</td>
                            {longitudinalData.subjects?.map((sub: string) => (
                              <td key={sub} className="px-3 py-2 text-center border-l border-gray-100">
                                {row[sub] != null ? (
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    row[sub] >= 3.5 ? "bg-purple-100 text-purple-700" :
                                    row[sub] >= 2.5 ? "bg-green-100 text-green-700" :
                                    row[sub] >= 1.5 ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                                  }`}>{Number(row[sub]).toFixed(1)}</span>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-center border-l border-gray-100">
                              {row.overall != null ? (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  row.overall >= 3.5 ? "bg-purple-100 text-purple-700" :
                                  row.overall >= 2.5 ? "bg-green-100 text-green-700" :
                                  row.overall >= 1.5 ? "bg-yellow-100 text-yellow-700" :
                                  "bg-red-100 text-red-700"
                                }`}>{Number(row.overall).toFixed(2)}</span>
                              ) : <span className="text-gray-300">—</span>}
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
    </div>
  );
}