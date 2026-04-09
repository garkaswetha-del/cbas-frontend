import { useState, useEffect } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API = "https://cbas-backend-production.up.railway.app";
const ACADEMIC_YEAR = "2025-26";
const ROUNDS = [{ value: "baseline_1", label: "Baseline 1" }, { value: "baseline_2", label: "Baseline 2" }];
const CLASSES = ["Pre-KG", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];
const LEVEL_COLORS_ARR = ["#ef4444", "#f59e0b", "#22c55e", "#a855f7"];

const LEVEL_COLOR: Record<string, string> = {
  "Level 4 – Exceeding": "bg-purple-100 text-purple-800",
  "Level 3 – Meeting": "bg-green-100 text-green-800",
  "Level 2 – Approaching": "bg-yellow-100 text-yellow-800",
  "Level 1 – Beginning": "bg-red-100 text-red-800",
};

const levelBadge = (level: string) => level ? (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLOR[level] || "bg-gray-100 text-gray-600"}`}>{level}</span>
) : <span className="text-gray-300 text-xs">Not assessed</span>;

const KPICard = ({ label, value, color }: any) => (
  <div className={`bg-white rounded-xl shadow p-4 border-l-4 ${color}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
  </div>
);

const getDomainColor = (score: number) => {
  if (score >= 80) return "#a855f7";
  if (score >= 60) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
};

export default function BaselineDashboard() {
  const [activeTab, setActiveTab] = useState<"school" | "grade" | "teachers">("school");
  const [round, setRound] = useState("baseline_1");
  const [selectedGrade, setSelectedGrade] = useState("Grade 1");
  const [schoolData, setSchoolData] = useState<any>(null);
  const [gradeData, setGradeData] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "school") fetchSchool();
    if (activeTab === "grade") fetchGrade();
    if (activeTab === "teachers") fetchTeachers();
  }, [activeTab, round, selectedGrade]);

  const fetchSchool = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/baseline/dashboard/school?academic_year=${ACADEMIC_YEAR}&round=${round}`);
      setSchoolData(res.data);
    } catch { }
    setLoading(false);
  };

  const fetchGrade = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/baseline/dashboard/grade/${encodeURIComponent(selectedGrade)}?academic_year=${ACADEMIC_YEAR}&round=${round}`);
      setGradeData(res.data);
    } catch { }
    setLoading(false);
  };

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/baseline/dashboard/teachers?academic_year=${ACADEMIC_YEAR}&round=${round}`);
      setTeacherData(res.data);
    } catch { }
    setLoading(false);
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Baseline Assessment Dashboard</h1>
        <p className="text-sm text-gray-500">School-wide competency overview — {ACADEMIC_YEAR}</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-5 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Round</label>
          <select value={round} onChange={e => setRound(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            {ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {activeTab === "grade" && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Grade</label>
            <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm">
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 flex-nowrap items-center">
        {[{ id: "school", label: "🏫 School" }, { id: "grade", label: "📚 Grade" }, { id: "teachers", label: "👩‍🏫 Teachers" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${activeTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
        <button onClick={() => {
          if (activeTab==="school") fetchSchool();
          else if (activeTab==="grade") fetchGrade();
          else fetchTeachers();
        }} className="ml-auto px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
          🔄 Refresh
        </button>
      </div>

      {loading && <div className="text-center py-10 text-gray-400">Loading...</div>}

      {/* ── SCHOOL DASHBOARD ── */}
      {activeTab === "school" && schoolData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <KPICard label="Total Students" value={schoolData.totalStudents} color="border-indigo-500" />
            <KPICard label="Assessed" value={schoolData.assessed} color="border-green-500" />
            <KPICard label="Pending" value={schoolData.pending} color="border-red-400" />
            <KPICard label="Literacy Avg" value={`${schoolData.literacyAvg}%`} color="border-blue-500" />
            <KPICard label="Numeracy Avg" value={`${schoolData.numeracyAvg}%`} color="border-teal-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Level Distribution</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[
                    { name: "L1 Beginning", value: schoolData.levelDist.L1 },
                    { name: "L2 Approaching", value: schoolData.levelDist.L2 },
                    { name: "L3 Meeting", value: schoolData.levelDist.L3 },
                    { name: "L4 Exceeding", value: schoolData.levelDist.L4 },
                  ]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {LEVEL_COLORS_ARR.map((color, i) => <Cell key={i} fill={color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Grade-wise Average</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={schoolData.gradeWise}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#6366f1" name="Overall Avg %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">🏆 Top 5 Students</h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Grade</th>
                    <th className="px-3 py-2 text-left">Score</th>
                    <th className="px-3 py-2 text-left">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolData.top5.map((s: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1 font-medium">{s.name}</td>
                      <td className="px-3 py-1 text-gray-500 text-xs">{s.grade} {s.section}</td>
                      <td className="px-3 py-1 font-bold text-indigo-700">{s.score.toFixed(1)}%</td>
                      <td className="px-3 py-1">{levelBadge(s.level)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">⚠️ Bottom 5 At-Risk</h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Grade</th>
                    <th className="px-3 py-2 text-left">Score</th>
                    <th className="px-3 py-2 text-left">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolData.bottom5.map((s: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1 font-medium">{s.name}</td>
                      <td className="px-3 py-1 text-gray-500 text-xs">{s.grade} {s.section}</td>
                      <td className="px-3 py-1 font-bold text-red-600">{s.score.toFixed(1)}%</td>
                      <td className="px-3 py-1">{levelBadge(s.level)}</td>
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
            <KPICard label="Total Assessed" value={gradeData.totalAssessed} color="border-green-500" />
            <KPICard label="Sections" value={gradeData.sections.length} color="border-blue-500" />
            <KPICard label="At-Risk" value={gradeData.sections.reduce((a: number, s: any) => a + s.atRisk, 0)} color="border-red-400" />
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Section-wise Performance</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gradeData.sections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="section" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="literacyAvg" name="Literacy %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="numeracyAvg" name="Numeracy %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overallAvg" name="Overall %" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Section Summary</h2>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Section</th>
                  <th className="px-3 py-2 text-center">Students</th>
                  <th className="px-3 py-2 text-center">Literacy %</th>
                  <th className="px-3 py-2 text-center">Numeracy %</th>
                  <th className="px-3 py-2 text-center">Overall %</th>
                  <th className="px-3 py-2 text-center">At Risk</th>
                </tr>
              </thead>
              <tbody>
                {gradeData.sections.map((s: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 font-medium">{s.section}</td>
                    <td className="px-3 py-2 text-center">{s.count}</td>
                    <td className="px-3 py-2 text-center text-blue-600 font-semibold">{s.literacyAvg}%</td>
                    <td className="px-3 py-2 text-center text-green-600 font-semibold">{s.numeracyAvg}%</td>
                    <td className="px-3 py-2 text-center text-indigo-700 font-bold">{s.overallAvg}%</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.atRisk > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {s.atRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    <th className="px-3 py-2 text-left">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeData.top5.map((s: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1 font-medium">{s.name}</td>
                      <td className="px-3 py-1 text-gray-500">{s.section}</td>
                      <td className="px-3 py-1 font-bold text-indigo-700">{s.score.toFixed(1)}%</td>
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
                    <th className="px-3 py-2 text-left">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeData.bottom5.map((s: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1 font-medium">{s.name}</td>
                      <td className="px-3 py-1 text-gray-500">{s.section}</td>
                      <td className="px-3 py-1 font-bold text-red-600">{s.score.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TEACHERS DASHBOARD ── */}
      {activeTab === "teachers" && teacherData && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <KPICard label="Total Teachers" value={teacherData.totalTeachers} color="border-indigo-500" />
            <KPICard label="Assessed" value={teacherData.assessed} color="border-green-500" />
            <KPICard label="Pending" value={teacherData.pending} color="border-red-400" />
            <KPICard label="Literacy Avg" value={`${teacherData.literacyAvg}%`} color="border-blue-500" />
            <KPICard label="Numeracy Avg" value={`${teacherData.numeracyAvg}%`} color="border-teal-500" />
            <KPICard label="Overall Avg" value={`${teacherData.overallAvg}%`} color="border-purple-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Level Distribution */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Level Distribution</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[
                    { name: "L1 Beginning", value: teacherData.levelDist.L1 },
                    { name: "L2 Approaching", value: teacherData.levelDist.L2 },
                    { name: "L3 Meeting", value: teacherData.levelDist.L3 },
                    { name: "L4 Exceeding", value: teacherData.levelDist.L4 },
                  ]} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                    {LEVEL_COLORS_ARR.map((color, i) => <Cell key={i} fill={color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Stage-wise Performance */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Stage-wise Average Score</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={teacherData.stageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg" name="Avg Score %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="assessed" name="Assessed Count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Domain-wise competency chart */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Competency Domain-wise Average (All Teachers)</h2>
            <p className="text-xs text-gray-400 mb-3">Shows average score per domain — identifies school-wide weak areas</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={teacherData.domainData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="domain" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Bar dataKey="score" name="Avg Score %">
                  {teacherData.domainData.map((entry: any, i: number) => (
                    <Cell key={i} fill={getDomainColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-center text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>≥80% Exceeding</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>60–79% Meeting</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>40–59% Approaching</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>&lt;40% Beginning</span>
            </div>
          </div>

          {/* Top 5 and Bottom 5 Teachers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">🏆 Top 5 Teachers</h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-center">Lit %</th>
                    <th className="px-3 py-2 text-center">Num %</th>
                    <th className="px-3 py-2 text-center">Overall</th>
                    <th className="px-3 py-2 text-left">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherData.top5.map((t: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1 font-medium">{t.name}</td>
                      <td className="px-3 py-1 text-center text-blue-600">{t.literacy ?? "—"}</td>
                      <td className="px-3 py-1 text-center text-green-600">{t.numeracy ?? "—"}</td>
                      <td className="px-3 py-1 text-center font-bold text-indigo-700">{t.overall}%</td>
                      <td className="px-3 py-1">{levelBadge(t.level)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">⚠️ Bottom 5 Teachers (Need Support)</h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-center">Lit %</th>
                    <th className="px-3 py-2 text-center">Num %</th>
                    <th className="px-3 py-2 text-center">Overall</th>
                    <th className="px-3 py-2 text-left">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherData.bottom5.map((t: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1 font-medium">{t.name}</td>
                      <td className="px-3 py-1 text-center text-blue-600">{t.literacy ?? "—"}</td>
                      <td className="px-3 py-1 text-center text-green-600">{t.numeracy ?? "—"}</td>
                      <td className="px-3 py-1 text-center font-bold text-red-600">{t.overall}%</td>
                      <td className="px-3 py-1">{levelBadge(t.level)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full Teachers Table */}
          <div className="bg-white rounded-xl shadow border border-gray-200">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                All Teachers — {teacherData.assessed} assessed / {teacherData.totalTeachers} total
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Teacher</th>
                    <th className="px-4 py-2 text-center">Stage</th>
                    <th className="px-4 py-2 text-center">Literacy %</th>
                    <th className="px-4 py-2 text-center">Numeracy %</th>
                    <th className="px-4 py-2 text-center">Overall %</th>
                    <th className="px-4 py-2 text-center">Level</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherData.teacherList.map((t: any, i: number) => (
                    <tr key={t.teacher_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{t.teacher_name}</td>
                      <td className="px-4 py-2 text-center text-gray-500 text-xs">{t.assessment?.stage || "—"}</td>
                      <td className="px-4 py-2 text-center font-semibold text-blue-600">
                        {t.assessment?.literacy_total ? `${(+t.assessment.literacy_total).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-2 text-center font-semibold text-green-600">
                        {t.assessment?.numeracy_total ? `${(+t.assessment.numeracy_total).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-2 text-center font-bold text-indigo-700">
                        {t.assessment?.overall_score ? `${(+t.assessment.overall_score).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-2 text-center">{levelBadge(t.assessment?.level)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.assessment ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {t.assessment ? "✅ Assessed" : "⏳ Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}