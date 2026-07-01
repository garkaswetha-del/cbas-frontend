import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { currentAcademicYear } from "../utils/academicYear";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

const API = "https://cbas-backend-production.up.railway.app";

const ACADEMIC_YEARS = (() => {
  const y = [];
  for (let i = 2025; i <= 2035; i++) y.push(`${i}-${String(i + 1).slice(2)}`);
  return y;
})();

const ROUNDS = Array.from({ length: 10 }, (_, i) => ({
  value: `baseline_${i + 1}`,
  label: `Round ${i + 1}`,
}));

const scoreColor = (v: number) => {
  if (v >= 70) return "#22c55e";
  if (v >= 50) return "#f59e0b";
  return "#ef4444";
};

const scoreBg = (v: number) => {
  if (v >= 70) return "bg-green-50 border-green-200";
  if (v >= 50) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
};

const scoreText = (v: number) => {
  if (v >= 70) return "text-green-700";
  if (v >= 50) return "text-yellow-700";
  return "text-red-700";
};

const LEVEL_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#a855f7"];
const DIM_LABELS: Record<string, string> = {
  skills: "Skills & Knowledge",
  behaviour: "Behaviour",
  classroom: "Class Observation",
  parents_feedback: "Parent Feedback",
  english_comm: "English Comm.",
  responsibilities: "Responsibilities",
  exam: "Exam Marks",
};

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 p-4 ${color}`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right" style={{ color }}>{value.toFixed(1)}%</span>
    </div>
  );
}

export default function SuperDashboardPage() {
  const [year, setYear] = useState(currentAcademicYear);
  const [round, setRound] = useState("baseline_1");
  const [tab, setTab] = useState<"students" | "teachers">("students");

  // School-level student baseline data
  const [schoolData, setSchoolData] = useState<any>(null);
  const [schoolLoading, setSchoolLoading] = useState(false);

  // Grade drill-down
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [gradeData, setGradeData] = useState<any>(null);
  const [gradeLoading, setGradeLoading] = useState(false);

  // Section detail panel
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Teacher data
  const [teacherBaselineData, setTeacherBaselineData] = useState<any>(null);
  const [appraisalSummary, setAppraisalSummary] = useState<any>(null);
  const [teacherLoading, setTeacherLoading] = useState(false);

  // Appraisal sub-tab
  const [teacherTab, setTeacherTab] = useState<"appraisal" | "baseline">("appraisal");

  const fetchSchool = useCallback(async () => {
    setSchoolLoading(true);
    try {
      const r = await axios.get(`${API}/baseline/dashboard/school`, {
        params: { academic_year: year, round },
      });
      setSchoolData(r.data);
    } catch {
      setSchoolData(null);
    } finally {
      setSchoolLoading(false);
    }
  }, [year, round]);

  const fetchTeachers = useCallback(async () => {
    setTeacherLoading(true);
    try {
      const [bl, ap] = await Promise.all([
        axios.get(`${API}/baseline/dashboard/teachers`, { params: { academic_year: year, round } }),
        axios.get(`${API}/appraisal/summary`, { params: { academic_year: year } }),
      ]);
      setTeacherBaselineData(bl.data);
      setAppraisalSummary(ap.data);
    } catch {
      setTeacherBaselineData(null);
      setAppraisalSummary(null);
    } finally {
      setTeacherLoading(false);
    }
  }, [year, round]);

  const fetchGrade = useCallback(async (grade: string) => {
    setGradeLoading(true);
    setSelectedSection(null);
    try {
      const r = await axios.get(`${API}/baseline/dashboard/grade/${encodeURIComponent(grade)}`, {
        params: { academic_year: year, round },
      });
      setGradeData(r.data);
    } catch {
      setGradeData(null);
    } finally {
      setGradeLoading(false);
    }
  }, [year, round]);

  useEffect(() => {
    fetchSchool();
    fetchTeachers();
    setSelectedGrade(null);
    setSelectedSection(null);
    setGradeData(null);
  }, [year, round]);

  const handleGradeClick = (grade: string) => {
    if (selectedGrade === grade) {
      setSelectedGrade(null);
      setGradeData(null);
      setSelectedSection(null);
    } else {
      setSelectedGrade(grade);
      fetchGrade(grade);
    }
  };

  const sectionDetail = gradeData?.sections?.find((s: any) => s.section === selectedSection);

  // Level distribution from school data
  const levelData = schoolData?.levelDist
    ? [
        { name: "L1 <40%", value: schoolData.levelDist.L1, color: LEVEL_COLORS[0] },
        { name: "L2 40-60%", value: schoolData.levelDist.L2, color: LEVEL_COLORS[1] },
        { name: "L3 60-80%", value: schoolData.levelDist.L3, color: LEVEL_COLORS[2] },
        { name: "L4 >80%", value: schoolData.levelDist.L4, color: LEVEL_COLORS[3] },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── TOP CONTROLS ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</span>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {ACADEMIC_YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Round</span>
          <select
            value={round}
            onChange={e => setRound(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {/* ── KPI ROW ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <KpiCard
            label="Total Students"
            value={schoolData?.totalStudents ?? "—"}
            sub={`${schoolData?.assessed ?? 0} baselined`}
            color="border-indigo-500"
          />
          <KpiCard
            label="Baseline Coverage"
            value={schoolData ? `${Math.round((schoolData.assessed / (schoolData.totalStudents || 1)) * 100)}%` : "—"}
            sub={`${schoolData?.pending ?? "—"} pending`}
            color="border-sky-500"
          />
          <KpiCard
            label="Student Avg Score"
            value={schoolData ? `${schoolData.overallAvg}%` : "—"}
            sub={`Lit: ${schoolData?.literacyAvg ?? "—"}%  Num: ${schoolData?.numeracyAvg ?? "—"}%`}
            color="border-teal-500"
          />
          <KpiCard
            label="Total Teachers"
            value={appraisalSummary?.totalTeachers ?? "—"}
            sub={`${appraisalSummary?.appraised ?? 0} appraised`}
            color="border-purple-500"
          />
          <KpiCard
            label="Appraisal Coverage"
            value={appraisalSummary ? `${Math.round((appraisalSummary.appraised / (appraisalSummary.totalTeachers || 1)) * 100)}%` : "—"}
            sub={`${appraisalSummary?.pending ?? "—"} pending`}
            color="border-orange-500"
          />
          <KpiCard
            label="Teacher Appraisal Avg"
            value={appraisalSummary ? `${appraisalSummary.avgOverallPct.toFixed(1)}%` : "—"}
            sub="overall percentage"
            color="border-rose-500"
          />
        </div>

        {/* ── TAB SWITCHER ── */}
        <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
          {(["students", "teachers"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === t ? "bg-indigo-600 text-white shadow" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t === "students" ? "🎓 Students" : "🧑‍🏫 Teachers"}
            </button>
          ))}
        </div>

        {/* ════════════ STUDENTS TAB ════════════ */}
        {tab === "students" && (
          <div className="flex gap-4 flex-col lg:flex-row">
            {/* LEFT: Grade grid */}
            <div className="flex-1 min-w-0">
              {schoolLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Grade cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                    {(schoolData?.gradeWise ?? []).map((g: any) => (
                      <button
                        key={g.grade}
                        onClick={() => handleGradeClick(g.grade)}
                        className={`rounded-xl border-2 p-3 text-left transition-all shadow-sm hover:shadow-md ${
                          selectedGrade === g.grade
                            ? "border-indigo-500 bg-indigo-50 shadow-md"
                            : `border ${scoreBg(g.overallAvg)} hover:border-indigo-300`
                        }`}
                      >
                        <p className="text-sm font-bold text-gray-700">{g.grade}</p>
                        <p className={`text-xl font-extrabold mt-1 ${scoreText(g.overallAvg)}`}>
                          {g.overallAvg}%
                        </p>
                        <div className="mt-1.5 space-y-0.5">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Lit</span><span className="font-medium">{g.literacyAvg}%</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Num</span><span className="font-medium">{g.numeracyAvg}%</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                          <span>{g.count} assessed</span>
                          {g.atRisk > 0 && (
                            <span className="text-red-500 font-semibold">⚠ {g.atRisk}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Section drill-down */}
                  {selectedGrade && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-700 text-sm">
                          {selectedGrade} — Sections
                          {gradeLoading && <span className="ml-2 text-xs text-gray-400">Loading...</span>}
                        </h3>
                        <span className="text-xs text-gray-400">Click a section to see details</span>
                      </div>
                      {gradeData && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                          {(gradeData.sections ?? []).map((sec: any) => (
                            <button
                              key={sec.section}
                              onClick={() => setSelectedSection(selectedSection === sec.section ? null : sec.section)}
                              className={`rounded-lg border-2 p-3 text-left transition-all ${
                                selectedSection === sec.section
                                  ? "border-indigo-500 bg-indigo-50"
                                  : `border ${scoreBg(sec.overallAvg)} hover:border-indigo-300`
                              }`}
                            >
                              <p className="text-xs font-bold text-gray-600">{sec.section}</p>
                              <p className={`text-lg font-extrabold ${scoreText(sec.overallAvg)}`}>
                                {sec.overallAvg}%
                              </p>
                              <p className="text-xs text-gray-400">{sec.count} students</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* School-level charts */}
                  {!selectedSection && schoolData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Grade comparison bar chart */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">Grade-wise Average Scores</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={schoolData.gradeWise} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="grade" tick={{ fontSize: 10 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: any) => `${v}%`} />
                            <Bar dataKey="literacyAvg" name="Literacy" fill="#6366f1" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="numeracyAvg" name="Numeracy" fill="#22c55e" radius={[3, 3, 0, 0]} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Level distribution pie */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">School-wide Level Distribution</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={levelData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                              dataKey="value" label={({ name, value }: any) => `${name}: ${value}`}
                              labelLine={false}
                            >
                              {levelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Top gaps */}
                      {(schoolData.topLiteracyGaps?.length > 0 || schoolData.topNumeracyGaps?.length > 0) && (
                        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                          <h3 className="text-sm font-semibold text-gray-600 mb-3">Top Domain Gaps (school-wide)</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-indigo-600 mb-2">Literacy Gaps</p>
                              {schoolData.topLiteracyGaps.map((g: any) => (
                                <div key={g.domain} className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>{g.domain}</span>
                                  <span className="font-semibold text-red-500">{g.count} students</span>
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-green-600 mb-2">Numeracy Gaps</p>
                              {schoolData.topNumeracyGaps.map((g: any) => (
                                <div key={g.domain} className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>{g.domain}</span>
                                  <span className="font-semibold text-red-500">{g.count} students</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* RIGHT: Section detail panel */}
            {sectionDetail && (
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-sm p-4 sticky top-20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">{selectedGrade}</p>
                      <h3 className="text-lg font-bold text-gray-800">Section {selectedSection}</h3>
                    </div>
                    <button onClick={() => setSelectedSection(null)} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
                  </div>

                  {/* Big three stats */}
                  <div className="space-y-3 mb-4">
                    {[
                      { label: "Literacy Avg", value: sectionDetail.literacyAvg, icon: "📖" },
                      { label: "Numeracy Avg", value: sectionDetail.numeracyAvg, icon: "🔢" },
                      { label: "Overall Avg", value: sectionDetail.overallAvg, icon: "📊" },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className={`rounded-xl border px-4 py-3 ${scoreBg(value)}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{icon} {label}</span>
                          <span className={`text-2xl font-extrabold ${scoreText(value)}`}>{value}%</span>
                        </div>
                        <div className="mt-2 bg-white bg-opacity-60 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(value, 100)}%`, background: scoreColor(value) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Students assessed</span><span className="font-semibold">{sectionDetail.count}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>At risk (&lt;40%)</span>
                      <span className={`font-semibold ${sectionDetail.atRisk > 0 ? "text-red-500" : "text-gray-400"}`}>
                        {sectionDetail.atRisk}
                      </span>
                    </div>
                  </div>

                  {/* Grade-level domain gaps */}
                  {gradeData && (
                    <div className="mt-4 border-t pt-3">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Grade Domain Averages</p>
                      {gradeData.literacyDomains?.slice(0, 5).map((d: any) => (
                        <div key={d.domain} className="mb-1.5">
                          <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                            <span className="truncate mr-2">{d.domain}</span>
                          </div>
                          <MiniBar value={d.avg} color={scoreColor(d.avg)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ TEACHERS TAB ════════════ */}
        {tab === "teachers" && (
          <div>
            {/* Teacher sub-tabs */}
            <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
              {(["appraisal", "baseline"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTeacherTab(t)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                    teacherTab === t ? "bg-purple-600 text-white shadow" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {t === "appraisal" ? "📋 Appraisal" : "📈 Baseline"}
                </button>
              ))}
            </div>

            {teacherLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* ── APPRAISAL SUB-TAB ── */}
                {teacherTab === "appraisal" && appraisalSummary && (
                  <div className="space-y-4">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 col-span-2 md:col-span-1">
                        <p className="text-xs text-gray-500">Appraised</p>
                        <p className="text-3xl font-extrabold text-purple-600 mt-1">{appraisalSummary.appraised}</p>
                        <p className="text-xs text-gray-400">of {appraisalSummary.totalTeachers} teachers</p>
                        <div className="mt-2 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-purple-500"
                            style={{ width: `${Math.round((appraisalSummary.appraised / (appraisalSummary.totalTeachers || 1)) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <p className="text-xs text-gray-500">School Average</p>
                        <p className="text-3xl font-extrabold text-indigo-600 mt-1">{appraisalSummary.avgOverallPct.toFixed(1)}%</p>
                        <p className="text-xs text-gray-400">overall percentage</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <p className="text-xs text-gray-500">Top Teacher</p>
                        <p className="text-base font-bold text-green-700 mt-1 truncate">{appraisalSummary.top5?.[0]?.name ?? "—"}</p>
                        <p className="text-lg font-extrabold text-green-600">{appraisalSummary.top5?.[0]?.pct ?? "—"}%</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <p className="text-xs text-gray-500">Pending</p>
                        <p className="text-3xl font-extrabold text-orange-500 mt-1">{appraisalSummary.pending}</p>
                        <p className="text-xs text-gray-400">yet to submit</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Dimension bars */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-gray-600 mb-4">Dimension Averages</h3>
                        <div className="space-y-3">
                          {Object.entries(appraisalSummary.dimensionAverages).map(([key, val]: any) => (
                            <div key={key}>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>{DIM_LABELS[key] || key}</span>
                              </div>
                              <MiniBar value={val} color={scoreColor(val)} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Qualification breakdown */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-gray-600 mb-4">By Qualification</h3>
                        <div className="space-y-3">
                          {appraisalSummary.qualificationBreakdown.map((q: any) => (
                            <div key={q.qualification}>
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span className="font-medium">{q.qualification}</span>
                                <span className="text-gray-400">{q.count} teachers · avg {q.avgPct.toFixed(1)}%</span>
                              </div>
                              <MiniBar value={q.avgPct} color="#6366f1" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top 5 */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">🏆 Top 5 Teachers</h3>
                        <div className="space-y-2">
                          {appraisalSummary.top5.map((t: any, i: number) => (
                            <div key={t.name} className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                              <span className="text-sm text-gray-700 flex-1 truncate">{t.name}</span>
                              <span className="text-sm font-bold text-green-600">{t.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom 5 */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">⚠️ Needs Attention</h3>
                        <div className="space-y-2">
                          {appraisalSummary.bottom5.map((t: any, i: number) => (
                            <div key={t.name} className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                              <span className="text-sm text-gray-700 flex-1 truncate">{t.name}</span>
                              <span className="text-sm font-bold text-red-500">{t.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── BASELINE (TEACHERS) SUB-TAB ── */}
                {teacherTab === "baseline" && teacherBaselineData && (
                  <div className="space-y-4">
                    {/* Summary row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <KpiCard label="Teachers Assessed" value={`${teacherBaselineData.assessed} / ${teacherBaselineData.totalTeachers}`} color="border-purple-500" />
                      <KpiCard label="Literacy Avg" value={`${teacherBaselineData.literacyAvg}%`} color="border-indigo-500" />
                      <KpiCard label="Numeracy Avg" value={`${teacherBaselineData.numeracyAvg}%`} color="border-teal-500" />
                      <KpiCard label="Overall Avg" value={`${teacherBaselineData.overallAvg}%`} color="border-green-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Teacher bar chart */}
                      {teacherBaselineData.teacherBarData?.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                          <h3 className="text-sm font-semibold text-gray-600 mb-3">Teacher Scores</h3>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={teacherBaselineData.teacherBarData.slice(0, 15)} layout="vertical"
                              margin={{ top: 0, right: 10, left: 80, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                              <Tooltip formatter={(v: any) => `${v}%`} />
                              <Bar dataKey="overall" name="Overall" radius={[0, 3, 3, 0]}>
                                {teacherBaselineData.teacherBarData.slice(0, 15).map((entry: any, i: number) => (
                                  <Cell key={i} fill={scoreColor(entry.overall)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Stage distribution */}
                      {teacherBaselineData.stageData?.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                          <h3 className="text-sm font-semibold text-gray-600 mb-3">Stage Distribution</h3>
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie data={teacherBaselineData.stageData} cx="50%" cy="50%"
                                innerRadius={50} outerRadius={85} dataKey="count"
                                nameKey="stage" label={({ stage, count }: any) => `${stage}: ${count}`}
                                labelLine={false}
                              >
                                {teacherBaselineData.stageData.map((_: any, i: number) => (
                                  <Cell key={i} fill={LEVEL_COLORS[i % LEVEL_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Top 5 teachers */}
                      {teacherBaselineData.top5?.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                          <h3 className="text-sm font-semibold text-gray-600 mb-3">🏆 Top 5 Teachers (Baseline)</h3>
                          <div className="space-y-2">
                            {teacherBaselineData.top5.map((t: any, i: number) => (
                              <div key={t.name} className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                <span className="text-sm text-gray-700 flex-1 truncate">{t.name}</span>
                                <span className="text-sm font-bold text-purple-600">{(+t.overall).toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bottom 5 teachers */}
                      {teacherBaselineData.bottom5?.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                          <h3 className="text-sm font-semibold text-gray-600 mb-3">⚠️ Needs Support</h3>
                          <div className="space-y-2">
                            {teacherBaselineData.bottom5.map((t: any, i: number) => (
                              <div key={t.name} className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                <span className="text-sm text-gray-700 flex-1 truncate">{t.name}</span>
                                <span className="text-sm font-bold text-red-500">{(+t.overall).toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Domain averages */}
                      {teacherBaselineData.domainData?.length > 0 && (
                        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                          <h3 className="text-sm font-semibold text-gray-600 mb-3">Domain Performance</h3>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={teacherBaselineData.domainData} margin={{ top: 0, right: 8, left: -10, bottom: 30 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="domain" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(v: any) => `${(+v).toFixed(1)}%`} />
                              <Bar dataKey="avg" name="Avg %" radius={[3, 3, 0, 0]}>
                                {teacherBaselineData.domainData.map((d: any, i: number) => (
                                  <Cell key={i} fill={scoreColor(d.avg)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(!teacherBaselineData && !appraisalSummary) && (
                  <div className="text-center py-16 text-gray-400">
                    <p className="text-4xl mb-2">📭</p>
                    <p className="text-sm">No data available for {year}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
