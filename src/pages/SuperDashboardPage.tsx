import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

const API = "https://cbas-backend-production.up.railway.app";

const YEARS = ["2025-26", "2026-27"];
const YEAR_COLORS: Record<string, string> = {
  "2025-26": "#6366f1",
  "2026-27": "#22c55e",
};

const ROUNDS = Array.from({ length: 10 }, (_, i) => ({
  value: `baseline_${i + 1}`,
  label: `Round ${i + 1}`,
}));

const LEVEL_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#a855f7"];
const LEVEL_KEYS = ["L1", "L2", "L3", "L4"];
const LEVEL_LABELS: Record<string, string> = {
  L1: "L1 <40%", L2: "L2 40-60%", L3: "L3 60-80%", L4: "L4 >80%",
};

const DIM_LABELS: Record<string, string> = {
  skills: "Skills",
  behaviour: "Behaviour",
  classroom: "Classroom",
  parents_feedback: "Parent Feedback",
  english_comm: "English",
  responsibilities: "Responsibilities",
  exam: "Exam Marks",
};

const scoreColor = (v: number) =>
  v >= 70 ? "#22c55e" : v >= 50 ? "#f59e0b" : "#ef4444";

const scoreBg = (v: number) =>
  v >= 70 ? "bg-green-50 border-green-200" : v >= 50 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

const scoreText = (v: number) =>
  v >= 70 ? "text-green-700" : v >= 50 ? "text-yellow-700" : "text-red-700";

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold text-gray-800">{title}</h2>
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

// Custom tooltip for year-on-year charts
const YoYTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold" style={{ color: p.fill }}>{p.value ? `${p.value}%` : "No data"}</span>
        </div>
      ))}
    </div>
  );
};

export default function SuperDashboardPage() {
  const [round, setRound] = useState("baseline_1");
  const [loading, setLoading] = useState(false);

  // All data keyed by year
  const [yearData, setYearData] = useState<Record<string, any>>({});

  // Grade drill-down
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [gradeYearData, setGradeYearData] = useState<Record<string, any>>({});
  const [gradeLoading, setGradeLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [studentMetric, setStudentMetric] = useState<"overall" | "literacy" | "numeracy">("overall");

  // Fetch all years in parallel
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          YEARS.map(y =>
            Promise.all([
              axios.get(`${API}/baseline/dashboard/school`, { params: { academic_year: y, round } }),
              axios.get(`${API}/baseline/dashboard/teachers`, { params: { academic_year: y, round } }),
              axios.get(`${API}/appraisal/summary`, { params: { academic_year: y } }),
            ])
          )
        );
        const data: Record<string, any> = {};
        YEARS.forEach((y, i) => {
          const r = results[i];
          if (r.status === "fulfilled") {
            data[y] = {
              school: r.value[0].data,
              teacherBaseline: r.value[1].data,
              appraisal: r.value[2].data,
            };
          }
        });
        setYearData(data);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    setSelectedGrade(null);
    setSelectedSection(null);
    setGradeYearData({});
  }, [round]);

  // Fetch grade drill-down for all years when grade changes
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
        if (r.status === "fulfilled") data[y] = r.value.data;
      });
      setGradeYearData(data);
    }).finally(() => setGradeLoading(false));
  }, [selectedGrade, round]);

  // ── Derived chart data ──────────────────────────────────────────

  // All grades that appear across any year
  const allGrades = (() => {
    const gSet = new Set<string>();
    YEARS.forEach(y => (yearData[y]?.school?.gradeWise ?? []).forEach((g: any) => gSet.add(g.grade)));
    // Sort by numeric grade order
    return [...gSet].sort((a, b) => {
      const order = ["Pre-KG", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
        "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];
      return order.indexOf(a) - order.indexOf(b);
    });
  })();

  // Grade year-on-year chart data
  const gradeYoYData = allGrades.map(grade => {
    const entry: any = { grade: grade.replace("Grade ", "G") };
    const fullGrade = grade;
    YEARS.forEach(y => {
      const gw = yearData[y]?.school?.gradeWise?.find((g: any) => g.grade === fullGrade);
      const metricKey = studentMetric === "overall" ? "overallAvg" : studentMetric === "literacy" ? "literacyAvg" : "numeracyAvg";
      entry[y] = gw ? gw[metricKey] : null;
      entry[`${y}_grade`] = fullGrade;
    });
    return entry;
  });

  // Level distribution year-on-year
  const levelYoYData = LEVEL_KEYS.map(level => {
    const entry: any = { level: LEVEL_LABELS[level] };
    YEARS.forEach(y => {
      entry[y] = yearData[y]?.school?.levelDist?.[level] ?? 0;
    });
    return entry;
  });

  // Teacher appraisal dimension year-on-year
  const allDimKeys = Object.keys(DIM_LABELS);
  const dimYoYData = allDimKeys.map(key => {
    const entry: any = { dim: DIM_LABELS[key] };
    YEARS.forEach(y => {
      entry[y] = yearData[y]?.appraisal?.dimensionAverages?.[key] ?? null;
    });
    return entry;
  });

  // Appraisal overall YoY
  const appraisalYoY = YEARS.map(y => ({
    year: y,
    avg: yearData[y]?.appraisal?.avgOverallPct ?? 0,
    color: YEAR_COLORS[y],
  }));

  // Teacher baseline overall YoY
  const teacherBaselineYoY = YEARS.map(y => ({
    year: y,
    literacy: yearData[y]?.teacherBaseline?.literacyAvg ?? 0,
    numeracy: yearData[y]?.teacherBaseline?.numeracyAvg ?? 0,
    overall: yearData[y]?.teacherBaseline?.overallAvg ?? 0,
  }));

  // Latest year for KPIs (last year that has data)
  const latestYear = [...YEARS].reverse().find(y => yearData[y]) ?? YEARS[YEARS.length - 1];
  const latest = yearData[latestYear];

  // Sections for selected grade (latest year with data)
  const latestGradeYear = [...YEARS].reverse().find(y => gradeYearData[y]) ?? YEARS[YEARS.length - 1];
  const latestSections: any[] = gradeYearData[latestGradeYear]?.sections ?? [];
  const sectionDetail = latestSections.find(s => s.section === selectedSection);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── STICKY HEADER ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <h1 className="text-sm font-bold text-gray-700">Super Dashboard</h1>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-xs text-gray-400">Baseline Round:</span>
          <select
            value={round}
            onChange={e => setRound(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
          >
            {ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {loading && <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live · Comparing {YEARS.join(" vs ")}</span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-6">

        {/* ── KPI CARDS (latest year) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Students" value={latest?.school?.totalStudents ?? "—"}
            sub={`${latest?.school?.assessed ?? 0} baselined`} color="border-indigo-500" />
          <KpiCard label="Baseline Coverage"
            value={latest?.school ? `${Math.round((latest.school.assessed / (latest.school.totalStudents || 1)) * 100)}%` : "—"}
            sub={`${latest?.school?.pending ?? "—"} pending`} color="border-sky-500" />
          <KpiCard label="Student Avg"
            value={latest?.school ? `${latest.school.overallAvg}%` : "—"}
            sub={`Lit ${latest?.school?.literacyAvg ?? "—"}%  ·  Num ${latest?.school?.numeracyAvg ?? "—"}%`}
            color="border-teal-500" />
          <KpiCard label="Total Teachers" value={latest?.appraisal?.totalTeachers ?? "—"}
            sub={`${latest?.appraisal?.appraised ?? 0} appraised`} color="border-purple-500" />
          <KpiCard label="Appraisal Coverage"
            value={latest?.appraisal ? `${Math.round((latest.appraisal.appraised / (latest.appraisal.totalTeachers || 1)) * 100)}%` : "—"}
            sub={`${latest?.appraisal?.pending ?? "—"} pending`} color="border-orange-500" />
          <KpiCard label="Teacher Appraisal Avg"
            value={latest?.appraisal ? `${latest.appraisal.avgOverallPct.toFixed(1)}%` : "—"}
            sub={latestYear} color="border-rose-500" />
        </div>

        {/* ══════════════════════════════════════════════════════════
            STUDENT BASELINE — YEAR ON YEAR
        ══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <SectionHeader
              title="Student Baseline — Year on Year"
              sub="Click any grade bar to drill into sections"
            />
            {/* Metric toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(["overall", "literacy", "numeracy"] as const).map(m => (
                <button key={m}
                  onClick={() => setStudentMetric(m)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                    studentMetric === m ? "bg-white shadow text-indigo-700" : "text-gray-500 hover:text-gray-700"
                  }`}
                >{m}</button>
              ))}
            </div>
          </div>

          {gradeYoYData.length === 0 ? (
            <div className="text-center py-12 text-gray-300 text-sm">No baseline data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={gradeYoYData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                onClick={d => {
                  if (!d?.activePayload?.[0]) return;
                  const grade = d.activePayload[0].payload[`${YEARS[0]}_grade`] ||
                                d.activePayload[0].payload[`${YEARS[1]}_grade`];
                  if (!grade) return;
                  setSelectedGrade(prev => prev === grade ? null : grade);
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip content={<YoYTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                {YEARS.map(y => (
                  <Bar key={y} dataKey={y} name={y} fill={YEAR_COLORS[y]} radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  >
                    {gradeYoYData.map((entry, i) => (
                      <Cell key={i}
                        fill={selectedGrade && entry[`${y}_grade`] === selectedGrade
                          ? (y === YEARS[0] ? "#4338ca" : "#16a34a")
                          : YEAR_COLORS[y]}
                        opacity={selectedGrade && entry[`${y}_grade`] !== selectedGrade ? 0.4 : 1}
                      />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* ── Grade drill-down ── */}
          {selectedGrade && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">{selectedGrade} — Sections</h3>
                <button onClick={() => { setSelectedGrade(null); setSelectedSection(null); }}
                  className="text-xs text-gray-400 hover:text-gray-700">✕ Close</button>
              </div>
              {gradeLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex gap-4 flex-col lg:flex-row">
                  {/* Section grid */}
                  <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {latestSections.map((sec: any) => (
                      <button key={sec.section}
                        onClick={() => setSelectedSection(prev => prev === sec.section ? null : sec.section)}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${
                          selectedSection === sec.section
                            ? "border-indigo-500 bg-indigo-50 shadow-md"
                            : `${scoreBg(sec.overallAvg)} hover:border-indigo-300`
                        }`}
                      >
                        <p className="text-xs font-bold text-gray-600 truncate">{sec.section}</p>
                        <p className={`text-lg font-extrabold ${scoreText(sec.overallAvg)}`}>{sec.overallAvg}%</p>
                        <div className="text-xs text-gray-400 space-y-0.5 mt-1">
                          <div className="flex justify-between"><span>Lit</span><span>{sec.literacyAvg}%</span></div>
                          <div className="flex justify-between"><span>Num</span><span>{sec.numeracyAvg}%</span></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{sec.count} students
                          {sec.atRisk > 0 && <span className="text-red-500 ml-1">⚠{sec.atRisk}</span>}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Section detail panel */}
                  {sectionDetail && (
                    <div className="w-full lg:w-72 flex-shrink-0 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-semibold text-indigo-500">{selectedGrade}</p>
                          <p className="text-base font-bold text-gray-800">Section {selectedSection}</p>
                        </div>
                        <button onClick={() => setSelectedSection(null)} className="text-gray-400 text-lg">✕</button>
                      </div>
                      <div className="space-y-2 mb-4">
                        {[
                          { label: "📖 Literacy Avg", value: sectionDetail.literacyAvg },
                          { label: "🔢 Numeracy Avg", value: sectionDetail.numeracyAvg },
                          { label: "📊 Overall Avg", value: sectionDetail.overallAvg },
                        ].map(({ label, value }) => (
                          <div key={label} className={`rounded-lg border px-3 py-2 ${scoreBg(value)}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">{label}</span>
                              <span className={`text-xl font-extrabold ${scoreText(value)}`}>{value}%</span>
                            </div>
                            <div className="mt-1.5 bg-white bg-opacity-60 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(value, 100)}%`, background: scoreColor(value) }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1 border-t pt-2">
                        <div className="flex justify-between"><span>Students assessed</span><span className="font-semibold">{sectionDetail.count}</span></div>
                        <div className="flex justify-between"><span>At risk (&lt;40%)</span>
                          <span className={`font-semibold ${sectionDetail.atRisk > 0 ? "text-red-500" : "text-gray-400"}`}>{sectionDetail.atRisk}</span>
                        </div>
                        <p className="text-gray-400 mt-1">{latestGradeYear} data</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            LEVEL DISTRIBUTION — YEAR ON YEAR
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <SectionHeader title="Level Distribution — Year on Year" sub="How many students at each level" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={levelYoYData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="level" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<YoYTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                {YEARS.map(y => (
                  <Bar key={y} dataKey={y} name={y} fill={YEAR_COLORS[y]} radius={[3, 3, 0, 0]} maxBarSize={30} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* School-wide literacy vs numeracy per year */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <SectionHeader title="School Literacy vs Numeracy" sub="Average scores per academic year" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={YEARS.map(y => ({
                  year: y,
                  Literacy: yearData[y]?.school?.literacyAvg ?? 0,
                  Numeracy: yearData[y]?.school?.numeracyAvg ?? 0,
                  Overall: yearData[y]?.school?.overallAvg ?? 0,
                }))}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Literacy" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Numeracy" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Overall" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            TEACHER APPRAISAL — YEAR ON YEAR
        ══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Teacher Appraisal — Year on Year" sub="Overall and dimension-wise performance" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall avg bars */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">Overall Appraisal Average</p>
              <div className="space-y-3">
                {appraisalYoY.map(({ year, avg, color }) => (
                  <div key={year}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="font-semibold">{year}</span>
                      <span style={{ color }}>{avg ? `${avg.toFixed(1)}%` : "No data"}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(avg, 100)}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Appraised count per year */}
              <div className="mt-5 space-y-2">
                {YEARS.map(y => {
                  const ap = yearData[y]?.appraisal;
                  if (!ap) return null;
                  const pct = Math.round((ap.appraised / (ap.totalTeachers || 1)) * 100);
                  return (
                    <div key={y}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{y} — Appraised {ap.appraised} of {ap.totalTeachers}</span>
                        <span style={{ color: YEAR_COLORS[y] }}>{pct}%</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: YEAR_COLORS[y] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dimension bars — grouped by year */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">Dimension Averages</p>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={dimYoYData} layout="vertical" margin={{ top: 0, right: 30, left: 90, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} unit="%" />
                  <YAxis type="category" dataKey="dim" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={(v: any) => v ? `${v.toFixed(1)}%` : "No data"} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                  {YEARS.map(y => (
                    <Bar key={y} dataKey={y} name={y} fill={YEAR_COLORS[y]} radius={[0, 3, 3, 0]} maxBarSize={10} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top/Bottom teachers — latest year */}
          {latest?.appraisal && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">🏆 Top 5 ({latestYear})</p>
                <div className="space-y-2">
                  {(latest.appraisal.top5 ?? []).map((t: any, i: number) => (
                    <div key={t.name} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{t.name}</span>
                      <span className="text-sm font-bold text-green-600">{t.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">⚠️ Needs Attention ({latestYear})</p>
                <div className="space-y-2">
                  {(latest.appraisal.bottom5 ?? []).map((t: any, i: number) => (
                    <div key={t.name} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{t.name}</span>
                      <span className="text-sm font-bold text-red-500">{t.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Qualification breakdown latest year */}
              {latest.appraisal.qualificationBreakdown?.length > 0 && (
                <div className="md:col-span-2 border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-3">By Qualification ({latestYear})</p>
                  <div className="space-y-2">
                    {latest.appraisal.qualificationBreakdown.map((q: any) => (
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
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            TEACHER BASELINE — YEAR ON YEAR
        ══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Teacher Baseline — Year on Year" sub="Teacher self-assessment scores across rounds" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Year-on-year grouped bar */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">Literacy · Numeracy · Overall</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={teacherBaselineYoY} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="literacy" name="Literacy" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="numeracy" name="Numeracy" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="overall" name="Overall" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stage distribution latest year */}
            {latest?.teacherBaseline?.stageData?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">Stage Distribution ({latestYear})</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={latest.teacherBaseline.stageData} cx="50%" cy="50%"
                      innerRadius={45} outerRadius={75} dataKey="count" nameKey="stage"
                    >
                      {latest.teacherBaseline.stageData.map((_: any, i: number) => (
                        <Cell key={i} fill={LEVEL_COLORS[i % LEVEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top/Bottom teachers — baseline */}
            {latest?.teacherBaseline?.top5?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">🏆 Top 5 Baseline ({latestYear})</p>
                <div className="space-y-2">
                  {latest.teacherBaseline.top5.map((t: any, i: number) => (
                    <div key={t.name} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{t.name}</span>
                      <span className="text-sm font-bold text-purple-600">{(+t.overall).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {latest?.teacherBaseline?.bottom5?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">⚠️ Needs Support ({latestYear})</p>
                <div className="space-y-2">
                  {latest.teacherBaseline.bottom5.map((t: any, i: number) => (
                    <div key={t.name} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{t.name}</span>
                      <span className="text-sm font-bold text-red-500">{(+t.overall).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            DOMAIN GAPS
        ══════════════════════════════════════════════════════════ */}
        {(latest?.school?.topLiteracyGaps?.length > 0 || latest?.school?.topNumeracyGaps?.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <SectionHeader title="Top Domain Gaps (School-wide)" sub={`Most common gaps · ${latestYear}`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-2">Literacy Gaps</p>
                {latest.school.topLiteracyGaps.map((g: any) => (
                  <div key={g.domain} className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{g.domain}</span>
                    <span className="font-semibold text-red-500">{g.count} students</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-green-600 mb-2">Numeracy Gaps</p>
                {latest.school.topNumeracyGaps.map((g: any) => (
                  <div key={g.domain} className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{g.domain}</span>
                    <span className="font-semibold text-red-500">{g.count} students</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
