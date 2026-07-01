import { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";

const API = "https://cbas-backend-production.up.railway.app";

const YEARS = ["2025-26", "2026-27"];

const ROUNDS = Array.from({ length: 10 }, (_, i) => ({
  value: `baseline_${i + 1}`,
  label: `Round ${i + 1}`,
}));

const LEVEL_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#a855f7"];

const DIM_LABELS: Record<string, string> = {
  skills: "Skills",
  behaviour: "Behaviour",
  classroom: "Classroom",
  parents_feedback: "Parent Feedback",
  english_comm: "English Comm.",
  responsibilities: "Responsibilities",
  exam: "Exam Marks",
};

// One distinct colour per grade line
const GRADE_COLORS = [
  "#6366f1","#22c55e","#f59e0b","#ef4444","#a855f7",
  "#06b6d4","#ec4899","#84cc16","#f97316","#0ea5e9",
  "#14b8a6","#8b5cf6","#e11d48",
];

const scoreColor = (v: number) => v >= 70 ? "#22c55e" : v >= 50 ? "#f59e0b" : "#ef4444";
const scoreBg   = (v: number) => v >= 70 ? "bg-green-50 border-green-200" : v >= 50 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
const scoreText = (v: number) => v >= 70 ? "text-green-700" : v >= 50 ? "text-yellow-700" : "text-red-700";

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

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
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right" style={{ color }}>{value.toFixed(1)}%</span>
    </div>
  );
}

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.stroke }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-bold" style={{ color: p.stroke }}>
            {p.value != null ? `${p.value}%` : "No data"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function SuperDashboardPage() {
  const [round, setRound]   = useState("baseline_1");
  const [loading, setLoading] = useState(false);
  const [yearData, setYearData] = useState<Record<string, any>>({});

  // Grade drill-down
  const [selectedGrade, setSelectedGrade]     = useState<string | null>(null);
  const [gradeYearData, setGradeYearData]     = useState<Record<string, any>>({});
  const [gradeLoading, setGradeLoading]       = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // ── Fetch all years in parallel ────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.allSettled(
      YEARS.map(y =>
        Promise.all([
          axios.get(`${API}/baseline/dashboard/school`,   { params: { academic_year: y, round } }),
          axios.get(`${API}/baseline/dashboard/teachers`, { params: { academic_year: y, round } }),
          axios.get(`${API}/appraisal/summary`,           { params: { academic_year: y } }),
        ])
      )
    ).then(results => {
      const data: Record<string, any> = {};
      YEARS.forEach((y, i) => {
        const r = results[i];
        if (r.status === "fulfilled") {
          const school     = r.value[0].data;
          const teacherBL  = r.value[1].data;
          const appraisal  = r.value[2].data;
          data[y] = {
            // null out school baseline if nothing assessed
            school:     (school?.assessed    ?? 0) > 0 ? school    : null,
            teacherBL:  (teacherBL?.assessed ?? 0) > 0 ? teacherBL : null,
            // null out appraisal if nothing submitted
            appraisal:  (appraisal?.appraised ?? 0) > 0 ? appraisal : null,
            // keep raw counts even when zeroed (for KPI cards)
            raw: { school, teacherBL, appraisal },
          };
        }
      });
      setYearData(data);
    }).finally(() => setLoading(false));

    setSelectedGrade(null);
    setSelectedSection(null);
    setGradeYearData({});
  }, [round]);

  // ── Grade drill-down ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedGrade) return;
    setGradeLoading(true);
    setSelectedSection(null);
    Promise.allSettled(
      YEARS.map(y =>
        axios.get(`${API}/baseline/dashboard/grade/${encodeURIComponent(selectedGrade)}`, {
          params: { academic_year: y, round },
        })
      )
    ).then(results => {
      const data: Record<string, any> = {};
      YEARS.forEach((y, i) => {
        const r = results[i];
        if (r.status === "fulfilled" && (r.value.data?.totalAssessed ?? 0) > 0) {
          data[y] = r.value.data;
        }
      });
      setGradeYearData(data);
    }).finally(() => setGradeLoading(false));
  }, [selectedGrade, round]);

  // ── Derived data ───────────────────────────────────────────────

  // Latest year that has actual baseline data (for KPIs)
  const latestSchoolYear   = [...YEARS].reverse().find(y => yearData[y]?.school)   ?? YEARS[0];
  const latestAppraisalYear= [...YEARS].reverse().find(y => yearData[y]?.appraisal) ?? YEARS[0];
  const latestTeacherBLYear= [...YEARS].reverse().find(y => yearData[y]?.teacherBL) ?? YEARS[0];

  const latestSchool    = yearData[latestSchoolYear]?.school;
  const latestAppraisal = yearData[latestAppraisalYear]?.appraisal;
  const latestTeacherBL = yearData[latestTeacherBLYear]?.teacherBL;
  // Raw for coverage counts (may be 0)
  const rawAppraisalLatest = yearData[YEARS[YEARS.length-1]]?.raw?.appraisal ?? yearData[YEARS[0]]?.raw?.appraisal;

  // All grades ordered
  const allGrades = (() => {
    const order = ["Pre-KG","LKG","UKG","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
      "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];
    const s = new Set<string>();
    YEARS.forEach(y => (yearData[y]?.school?.gradeWise ?? []).forEach((g: any) => s.add(g.grade)));
    return [...s].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  })();

  // ── Line chart: School overall / literacy / numeracy by year ──
  const schoolLineData = YEARS.map(y => {
    const sd = yearData[y]?.school;
    return {
      year: y,
      Overall:   sd ? sd.overallAvg   : null,
      Literacy:  sd ? sd.literacyAvg  : null,
      Numeracy:  sd ? sd.numeracyAvg  : null,
    };
  });

  // ── Line chart: one line per grade, across years ──────────────
  const gradeLineData = YEARS.map(y => {
    const entry: any = { year: y };
    allGrades.forEach(g => {
      const gw = yearData[y]?.school?.gradeWise?.find((gd: any) => gd.grade === g);
      entry[g] = gw ? gw.overallAvg : null;
    });
    return entry;
  });

  // ── Line chart: Grade drill — each section line over years ────
  const allSections = (() => {
    const s = new Set<string>();
    YEARS.forEach(y => (gradeYearData[y]?.sections ?? []).forEach((sec: any) => s.add(sec.section)));
    return [...s].sort();
  })();

  const sectionLineData = YEARS.map(y => {
    const entry: any = { year: y };
    allSections.forEach(sec => {
      const sd = gradeYearData[y]?.sections?.find((s: any) => s.section === sec);
      entry[sec]           = sd ? sd.overallAvg   : null;
      entry[`${sec}_lit`]  = sd ? sd.literacyAvg  : null;
      entry[`${sec}_num`]  = sd ? sd.numeracyAvg  : null;
    });
    return entry;
  });

  // Sections for the latest year (for card grid)
  const latestGradeYear = [...YEARS].reverse().find(y => gradeYearData[y]) ?? YEARS[0];
  const latestSections: any[] = gradeYearData[latestGradeYear]?.sections ?? [];
  const sectionDetail = latestSections.find(s => s.section === selectedSection);

  // ── Line chart: Teacher appraisal by year ─────────────────────
  const appraisalLineData = YEARS.map(y => ({
    year: y,
    "Avg %": yearData[y]?.appraisal ? yearData[y].appraisal.avgOverallPct : null,
  }));

  // ── Line chart: Teacher baseline by year ──────────────────────
  const teacherBLLineData = YEARS.map(y => {
    const d = yearData[y]?.teacherBL;
    return {
      year: y,
      Overall:  d ? d.overallAvg  : null,
      Literacy: d ? d.literacyAvg : null,
      Numeracy: d ? d.numeracyAvg : null,
    };
  });

  // Level distribution data (bar — works better than line for counts)
  const levelBarData = [
    { level: "L1 <40%",   ...Object.fromEntries(YEARS.map(y => [y, yearData[y]?.school?.levelDist?.L1 ?? 0])) },
    { level: "L2 40-60%", ...Object.fromEntries(YEARS.map(y => [y, yearData[y]?.school?.levelDist?.L2 ?? 0])) },
    { level: "L3 60-80%", ...Object.fromEntries(YEARS.map(y => [y, yearData[y]?.school?.levelDist?.L3 ?? 0])) },
    { level: "L4 >80%",   ...Object.fromEntries(YEARS.map(y => [y, yearData[y]?.school?.levelDist?.L4 ?? 0])) },
  ];

  // Appraisal dimension latest year bar data
  const dimBarData = Object.entries(DIM_LABELS).map(([key, label]) => ({
    dim: label,
    value: latestAppraisal?.dimensionAverages?.[key] ?? 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <h1 className="text-sm font-bold text-gray-700">Super Dashboard</h1>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-xs text-gray-400">Baseline Round</span>
          <select value={round} onChange={e => setRound(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
            {ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {loading && <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-5">

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Students"
            value={latestSchool?.totalStudents ?? rawAppraisalLatest?.totalTeachers != null ? (yearData[YEARS[YEARS.length-1]]?.raw?.school?.totalStudents ?? "—") : "—"}
            sub={`${latestSchool?.assessed ?? 0} baselined · ${latestSchoolYear}`} color="border-indigo-500" />
          <KpiCard label="Baseline Coverage"
            value={latestSchool ? `${Math.round((latestSchool.assessed/(latestSchool.totalStudents||1))*100)}%` : "—"}
            sub={`${latestSchool?.pending ?? "—"} pending`} color="border-sky-500" />
          <KpiCard label="Student Avg"
            value={latestSchool ? `${latestSchool.overallAvg}%` : "—"}
            sub={`Lit ${latestSchool?.literacyAvg??'—'}%  ·  Num ${latestSchool?.numeracyAvg??'—'}%`}
            color="border-teal-500" />
          <KpiCard label="Total Teachers"
            value={rawAppraisalLatest?.totalTeachers ?? "—"}
            sub={`${rawAppraisalLatest?.appraised ?? 0} appraised`} color="border-purple-500" />
          <KpiCard label="Appraisal Coverage"
            value={rawAppraisalLatest ? `${Math.round((rawAppraisalLatest.appraised/(rawAppraisalLatest.totalTeachers||1))*100)}%` : "—"}
            sub={`${rawAppraisalLatest?.pending ?? "—"} pending`} color="border-orange-500" />
          <KpiCard label="Appraisal Avg"
            value={latestAppraisal ? `${latestAppraisal.avgOverallPct.toFixed(1)}%` : "No data yet"}
            sub={latestAppraisal ? latestAppraisalYear : "—"} color="border-rose-500" />
        </div>

        {/* ══════════════════════════════════════════════════════════
            STUDENT BASELINE — YEAR ON YEAR (LINE CHARTS)
        ══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Student Baseline — Year on Year"
            sub="School-wide averages and grade-wise trends · click a grade line to drill into sections" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* School overall line chart */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">School Average (Literacy · Numeracy · Overall)</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={schoolLineData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip content={<LineTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Overall"  stroke="#6366f1" strokeWidth={2.5} dot={{ r: 5 }} connectNulls={false} />
                  <Line type="monotone" dataKey="Literacy" stroke="#22c55e" strokeWidth={2}   dot={{ r: 4 }} connectNulls={false} />
                  <Line type="monotone" dataKey="Numeracy" stroke="#f59e0b" strokeWidth={2}   dot={{ r: 4 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Grade-wise line chart */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">
                Grade-wise Overall — click a grade name in the legend to isolate
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={gradeLineData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip content={<LineTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  {allGrades.map((grade, i) => (
                    <Line key={grade} type="monotone" dataKey={grade}
                      stroke={GRADE_COLORS[i % GRADE_COLORS.length]}
                      strokeWidth={selectedGrade === grade ? 3 : 1.5}
                      dot={{ r: selectedGrade === grade ? 6 : 3,
                             fill: GRADE_COLORS[i % GRADE_COLORS.length],
                             cursor: "pointer" }}
                      opacity={selectedGrade && selectedGrade !== grade ? 0.25 : 1}
                      connectNulls={false}
                      onClick={() => setSelectedGrade(g => g === grade ? null : grade)}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Grade drill-down ── */}
          {selectedGrade && (
            <div className="mt-5 border-t pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">{selectedGrade} — Section Breakdown</h3>
                <button onClick={() => { setSelectedGrade(null); setSelectedSection(null); }}
                  className="text-xs text-gray-400 hover:text-gray-700 border rounded px-2 py-0.5">✕ Close</button>
              </div>

              {gradeLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Section line chart — overall per year */}
                  {allSections.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Section Overall — Year on Year</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={sectionLineData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} unit="%" />
                          <Tooltip content={<LineTooltip />} />
                          <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                          {allSections.map((sec, i) => (
                            <Line key={sec} type="monotone" dataKey={sec}
                              stroke={GRADE_COLORS[i % GRADE_COLORS.length]}
                              strokeWidth={selectedSection === sec ? 3 : 1.5}
                              dot={{ r: selectedSection === sec ? 6 : 3,
                                     fill: GRADE_COLORS[i % GRADE_COLORS.length],
                                     cursor: "pointer" }}
                              opacity={selectedSection && selectedSection !== sec ? 0.25 : 1}
                              connectNulls={false}
                              onClick={() => setSelectedSection(s => s === sec ? null : sec)}
                              style={{ cursor: "pointer" }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Section cards — latest year */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      Sections · {latestGradeYear} — click for details
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {latestSections.map((sec: any) => (
                        <button key={sec.section}
                          onClick={() => setSelectedSection(s => s === sec.section ? null : sec.section)}
                          className={`rounded-xl border-2 p-2 text-left transition-all ${
                            selectedSection === sec.section
                              ? "border-indigo-500 bg-indigo-50 shadow"
                              : `${scoreBg(sec.overallAvg)} hover:border-indigo-300`
                          }`}
                        >
                          <p className="text-xs font-bold text-gray-600 truncate">{sec.section}</p>
                          <p className={`text-base font-extrabold ${scoreText(sec.overallAvg)}`}>{sec.overallAvg}%</p>
                          <div className="text-xs text-gray-400 mt-0.5">
                            <div className="flex justify-between"><span>Lit</span><span>{sec.literacyAvg}%</span></div>
                            <div className="flex justify-between"><span>Num</span><span>{sec.numeracyAvg}%</span></div>
                          </div>
                          {sec.atRisk > 0 && <p className="text-xs text-red-500 mt-0.5">⚠ {sec.atRisk} at risk</p>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section detail panel */}
                  {sectionDetail && (
                    <div className="md:col-span-2 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-gray-800">{selectedGrade} · Section {selectedSection}</p>
                        <button onClick={() => setSelectedSection(null)} className="text-gray-400">✕</button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "📖 Literacy", value: sectionDetail.literacyAvg },
                          { label: "🔢 Numeracy", value: sectionDetail.numeracyAvg },
                          { label: "📊 Overall",  value: sectionDetail.overallAvg  },
                        ].map(({ label, value }) => (
                          <div key={label} className={`rounded-xl border p-3 ${scoreBg(value)}`}>
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className={`text-2xl font-extrabold ${scoreText(value)}`}>{value}%</p>
                            <div className="mt-2 bg-white bg-opacity-60 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(value,100)}%`, background: scoreColor(value) }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{sectionDetail.count} students assessed · {sectionDetail.atRisk} at risk · {latestGradeYear}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            LEVEL DISTRIBUTION
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <SectionHeader title="Student Level Distribution" sub="How many students at each performance level" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={levelBarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="level" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                {YEARS.map((y, i) => (
                  <Bar key={y} dataKey={y} name={y} fill={["#6366f1","#22c55e"][i]} radius={[3,3,0,0]} maxBarSize={28} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top domain gaps */}
          {latestSchool && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionHeader title="Top Domain Gaps" sub={`Most students below threshold · ${latestSchoolYear}`} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 mb-2">Literacy</p>
                  {(latestSchool.topLiteracyGaps ?? []).map((g: any) => (
                    <div key={g.domain} className="flex justify-between text-xs text-gray-600 mb-1.5">
                      <span className="truncate mr-2">{g.domain}</span>
                      <span className="font-semibold text-red-500 flex-shrink-0">{g.count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-2">Numeracy</p>
                  {(latestSchool.topNumeracyGaps ?? []).map((g: any) => (
                    <div key={g.domain} className="flex justify-between text-xs text-gray-600 mb-1.5">
                      <span className="truncate mr-2">{g.domain}</span>
                      <span className="font-semibold text-red-500 flex-shrink-0">{g.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            TEACHER APPRAISAL — YEAR ON YEAR
        ══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Teacher Appraisal — Year on Year" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Line chart: overall avg */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">Overall Average %</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={appraisalLineData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip content={<LineTooltip />} />
                  <Line type="monotone" dataKey="Avg %" stroke="#a855f7" strokeWidth={2.5}
                    dot={{ r: 5 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
              {/* Coverage per year */}
              <div className="mt-3 space-y-1.5">
                {YEARS.map(y => {
                  const raw = yearData[y]?.raw?.appraisal;
                  if (!raw) return null;
                  const pct = Math.round((raw.appraised/(raw.totalTeachers||1))*100);
                  return (
                    <div key={y}>
                      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                        <span>{y} — {raw.appraised}/{raw.totalTeachers} appraised</span>
                        <span className="text-purple-600 font-semibold">{pct}%</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-purple-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dimension bar — latest year only */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">
                Dimensions · {latestAppraisalYear}
                {!latestAppraisal && <span className="text-red-400 ml-1">(no data)</span>}
              </p>
              {latestAppraisal ? (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={dimBarData} layout="vertical" margin={{ top: 0, right: 30, left: 95, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0,100]} tick={{ fontSize: 9 }} unit="%" />
                    <YAxis type="category" dataKey="dim" tick={{ fontSize: 9 }} width={95} />
                    <Tooltip formatter={(v: any) => `${(+v).toFixed(1)}%`} />
                    <Bar dataKey="value" name="Score" radius={[0,3,3,0]} maxBarSize={12}>
                      {dimBarData.map((d, i) => <Cell key={i} fill={scoreColor(d.value)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-300 text-sm">
                  No appraisals submitted yet for this year
                </div>
              )}
            </div>

            {/* Top / Bottom */}
            <div className="space-y-4">
              {latestAppraisal ? (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">🏆 Top 5 · {latestAppraisalYear}</p>
                    <div className="space-y-1.5">
                      {(latestAppraisal.top5 ?? []).map((t: any, i: number) => (
                        <div key={t.name} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                          <span className="text-xs text-gray-700 flex-1 truncate">{t.name}</span>
                          <span className="text-xs font-bold text-green-600">{t.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">⚠️ Needs Attention · {latestAppraisalYear}</p>
                    <div className="space-y-1.5">
                      {(latestAppraisal.bottom5 ?? []).map((t: any, i: number) => (
                        <div key={t.name} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                          <span className="text-xs text-gray-700 flex-1 truncate">{t.name}</span>
                          <span className="text-xs font-bold text-red-500">{t.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Qualification breakdown */}
                  {latestAppraisal.qualificationBreakdown?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">By Qualification</p>
                      <div className="space-y-1.5">
                        {latestAppraisal.qualificationBreakdown.map((q: any) => (
                          <div key={q.qualification}>
                            <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                              <span>{q.qualification} ({q.count})</span>
                              <span>{q.avgPct.toFixed(1)}%</span>
                            </div>
                            <MiniBar value={q.avgPct} color="#6366f1" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-300 text-sm text-center">
                  <div>
                    <p className="text-3xl mb-2">📋</p>
                    <p>Appraisals for {YEARS[YEARS.length-1]} not yet submitted</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            TEACHER BASELINE — YEAR ON YEAR
        ══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Teacher Baseline — Year on Year" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Line chart */}
            <div className="md:col-span-1">
              <p className="text-xs font-semibold text-gray-500 mb-3">Avg Scores (Literacy · Numeracy · Overall)</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={teacherBLLineData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip content={<LineTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Overall"  stroke="#6366f1" strokeWidth={2.5} dot={{ r: 5 }} connectNulls={false} />
                  <Line type="monotone" dataKey="Literacy" stroke="#22c55e" strokeWidth={2}   dot={{ r: 4 }} connectNulls={false} />
                  <Line type="monotone" dataKey="Numeracy" stroke="#f59e0b" strokeWidth={2}   dot={{ r: 4 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stage distribution pie */}
            {latestTeacherBL?.stageData?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">Stage Distribution · {latestTeacherBLYear}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={latestTeacherBL.stageData} cx="50%" cy="50%"
                      innerRadius={45} outerRadius={75} dataKey="count" nameKey="stage">
                      {latestTeacherBL.stageData.map((_: any, i: number) => (
                        <Cell key={i} fill={LEVEL_COLORS[i % LEVEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top / Bottom */}
            {latestTeacherBL && (
              <div className="space-y-4">
                {latestTeacherBL.top5?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">🏆 Top 5 Baseline · {latestTeacherBLYear}</p>
                    <div className="space-y-1.5">
                      {latestTeacherBL.top5.map((t: any, i: number) => (
                        <div key={t.name} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                          <span className="text-xs text-gray-700 flex-1 truncate">{t.name}</span>
                          <span className="text-xs font-bold text-purple-600">{(+t.overall).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {latestTeacherBL.bottom5?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">⚠️ Needs Support · {latestTeacherBLYear}</p>
                    <div className="space-y-1.5">
                      {latestTeacherBL.bottom5.map((t: any, i: number) => (
                        <div key={t.name} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                          <span className="text-xs text-gray-700 flex-1 truncate">{t.name}</span>
                          <span className="text-xs font-bold text-red-500">{(+t.overall).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
