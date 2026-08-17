import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { getAPI } from '../utils/api';
import { deriveAHMStage } from '../utils/stage';

const API = getAPI();

const ROUNDS = Array.from({ length: 10 }, (_, i) => ({
  value: `baseline_${i + 1}`, label: `Round ${i + 1}`,
}));

const EXAM_TYPES = ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'];

const scoreColor = (v: number) => v >= 70 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444';
const scoreBg    = (v: number) => v >= 70 ? 'bg-green-100 text-green-700' : v >= 50 ? 'bg-yellow-100 text-yellow-700' : v > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400';

function KPI({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`bg-white rounded-xl shadow p-4 border-l-4 ${color}`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-0.5">{value ?? '—'}</p>
    </div>
  );
}

// ── Teachers sub-tab ──────────────────────────────────────────────

function TeachersTab({ academicYear, stageInfo }: { academicYear: string; stageInfo: { stage: string; grades: string[] } }) {
  const [round, setRound] = useState('baseline_1');
  const [loading, setLoading] = useState(false);
  const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
  const [stageAggs, setStageAggs] = useState<{ total: number; assessed: number; pending: number; literacyAvg: number; numeracyAvg: number; overallAvg: number } | null>(null);
  const [domainData, setDomainData] = useState<{ domain: string; score: number; type: string }[]>([]);

  useEffect(() => { load(); }, [academicYear, round]);

  const load = async () => {
    setLoading(true);
    try {
      const [mappingsRes, blRes] = await Promise.all([
        axios.get(`${API}/mappings/teachers`, { params: { academic_year: academicYear } }),
        axios.get(`${API}/baseline/dashboard/teachers`, { params: { academic_year: academicYear, round } }),
      ]);

      const allTeachers: any[] = Array.isArray(mappingsRes.data) ? mappingsRes.data : [];
      const stageIds = new Set<string>(
        allTeachers
          .filter(t => (t.mappings || []).some((m: any) => stageInfo.grades.includes(m.grade)))
          .map(t => t.id as string)
      );

      const blData = blRes.data || {};
      const allBL: any[] = blData.teachers || [];
      const stageTeachers = allBL.filter(t => stageIds.has(t.teacher?.id));
      setFilteredTeachers(stageTeachers);

      const assessed = stageTeachers.filter(t => t.assessed);
      const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
      setStageAggs({
        total: stageIds.size,
        assessed: assessed.length,
        pending: stageIds.size - assessed.length,
        literacyAvg: avg(assessed.filter(t => t.litAvg !== null).map(t => +t.litAvg)),
        numeracyAvg: avg(assessed.filter(t => t.numAvg !== null).map(t => +t.numAvg)),
        overallAvg:  avg(assessed.filter(t => t.overall !== null).map(t => +t.overall)),
      });

      const litDomains: Record<string, number[]> = {};
      const numDomains: Record<string, number[]> = {};
      assessed.forEach(t => {
        if (t.literacy_pct)  Object.entries(t.literacy_pct).forEach(([d, v])  => { if (!litDomains[d]) litDomains[d] = []; litDomains[d].push(+(v as number)); });
        if (t.numeracy_pct)  Object.entries(t.numeracy_pct).forEach(([d, v])  => { if (!numDomains[d]) numDomains[d] = []; numDomains[d].push(+(v as number)); });
      });
      const avgD = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
      setDomainData([
        ...Object.entries(litDomains).map(([domain, vals]) => ({ domain, score: avgD(vals), type: 'Literacy' })),
        ...Object.entries(numDomains).map(([domain, vals]) => ({ domain, score: avgD(vals), type: 'Numeracy' })),
      ]);
    } catch {}
    setLoading(false);
  };

  const barData = filteredTeachers
    .filter(t => t.assessed)
    .sort((a, b) => (b.overall || 0) - (a.overall || 0))
    .map(t => ({
      name: (t.teacher?.name || '').split(' ')[0],
      fullName: t.teacher?.name || '',
      overall: t.overall || 0,
      literacy: t.litAvg || 0,
      numeracy: t.numAvg || 0,
    }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-gray-500 font-medium">Baseline Round</label>
        <select value={round} onChange={e => setRound(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          {ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPI label="Stage Teachers"  value={stageAggs?.total ?? '—'}                                color="border-indigo-500" />
            <KPI label="Assessed"        value={stageAggs?.assessed ?? '—'}                            color="border-green-500"  />
            <KPI label="Pending"         value={stageAggs?.pending ?? '—'}                             color="border-yellow-500" />
            <KPI label="Literacy Avg"    value={stageAggs?.literacyAvg != null ? `${stageAggs.literacyAvg}%` : '—'} color="border-blue-500"   />
            <KPI label="Numeracy Avg"    value={stageAggs?.numeracyAvg != null ? `${stageAggs.numeracyAvg}%` : '—'} color="border-purple-500" />
          </div>

          {barData.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Teacher Performance — {round.replace('_', ' ')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any, n: any) => [`${v}%`, n]}
                    labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.fullName || ''} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="overall"  name="Overall"   fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="literacy" name="Literacy"  fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="numeracy" name="Numeracy"  fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {domainData.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Stage-wide Domain Averages</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(['Literacy', 'Numeracy'] as const).map(type => {
                  const data = domainData.filter(d => d.type === type).sort((a, b) => a.score - b.score);
                  if (!data.length) return null;
                  return (
                    <div key={type}>
                      <p className="text-xs font-semibold text-gray-500 mb-2">{type}</p>
                      <div className="space-y-2">
                        {data.map(d => (
                          <div key={d.domain} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-28 truncate">{d.domain}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full"
                                style={{ width: `${Math.min(d.score, 100)}%`, background: scoreColor(d.score) }} />
                            </div>
                            <span className="text-xs font-bold w-10 text-right" style={{ color: scoreColor(d.score) }}>{d.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredTeachers.length > 0 ? (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">Teacher Details</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                    <tr>
                      <th className="px-4 py-2 text-left">Teacher</th>
                      <th className="px-4 py-2 text-center">Literacy</th>
                      <th className="px-4 py-2 text-center">Numeracy</th>
                      <th className="px-4 py-2 text-center">Overall</th>
                      <th className="px-4 py-2 text-center">Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTeachers
                      .sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1))
                      .map((t, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{t.teacher?.name}</td>
                          <td className="px-4 py-2.5 text-center">
                            {t.assessed
                              ? <span className={`px-2 py-0.5 rounded text-xs font-bold ${scoreBg(t.litAvg || 0)}`}>{t.litAvg}%</span>
                              : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {t.assessed
                              ? <span className={`px-2 py-0.5 rounded text-xs font-bold ${scoreBg(t.numAvg || 0)}`}>{t.numAvg}%</span>
                              : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {t.assessed
                              ? <span className={`px-2 py-0.5 rounded text-xs font-bold ${scoreBg(t.overall || 0)}`}>{t.overall}%</span>
                              : <span className="text-gray-400 text-xs">Not assessed</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs text-gray-600">{t.level || '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">
              No teachers found for {stageInfo.stage} stage in {academicYear}.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Students sub-tab ──────────────────────────────────────────────

function StudentsTab({ academicYear, stageInfo }: { academicYear: string; stageInfo: { stage: string; grades: string[] } }) {
  const [round, setRound] = useState('baseline_1');
  const [examType, setExamType] = useState('');
  const [pasaData, setPasaData] = useState<any[]>([]);
  const [blData, setBlData]   = useState<any[]>([]);

  useEffect(() => { loadPASA(); }, [academicYear, examType]);
  useEffect(() => { loadBaseline(); }, [academicYear, round]);

  const loadPASA = async () => {
    try {
      const results = await Promise.all(
        stageInfo.grades.map(grade =>
          axios.get(`${API}/pasa/dashboard/grade/${encodeURIComponent(grade)}`, {
            params: { academic_year: academicYear, ...(examType ? { exam_type: examType } : {}) },
          }).then(r => ({ grade, ...r.data }))
            .catch(() => ({ grade, sectionSummary: [], subjectSummary: [] }))
        )
      );
      setPasaData(results);
    } catch {}
  };

  const loadBaseline = async () => {
    try {
      const results = await Promise.all(
        stageInfo.grades.map(grade =>
          axios.get(`${API}/baseline/dashboard/grade/${encodeURIComponent(grade)}`, {
            params: { academic_year: academicYear, round },
          }).then(r => ({ grade, ...r.data }))
            .catch(() => ({ grade, totalAssessed: 0, literacyAvg: 0, numeracyAvg: 0, overallAvg: 0 }))
        )
      );
      setBlData(results);
    } catch {}
  };

  // PA/SA aggregates
  const pasaGradeChart = pasaData
    .map(g => {
      const secs: any[] = g.sectionSummary || [];
      const avg = secs.length ? +(secs.reduce((s, x) => s + (x.avg || 0), 0) / secs.length).toFixed(1) : 0;
      return { grade: g.grade, avg };
    })
    .filter(g => g.avg > 0);

  const stageAvg = pasaGradeChart.length
    ? +(pasaGradeChart.reduce((s, g) => s + g.avg, 0) / pasaGradeChart.length).toFixed(1)
    : null;

  const subjectMap: Record<string, number[]> = {};
  pasaData.forEach(g =>
    (g.subjectSummary || []).forEach((sub: any) => {
      if (!subjectMap[sub.subject]) subjectMap[sub.subject] = [];
      subjectMap[sub.subject].push(sub.avg);
    })
  );
  const subjectKPIs = Object.entries(subjectMap).map(([subject, avgs]) => ({
    subject,
    avg: +(avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1),
  }));

  // Baseline aggregates
  const blGradeChart = blData
    .filter(g => g.totalAssessed > 0)
    .map(g => ({ grade: g.grade, Literacy: g.literacyAvg || 0, Numeracy: g.numeracyAvg || 0 }));

  const blAssessed = blData.filter(g => g.totalAssessed > 0);
  const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
  const blAvgLit = avg(blAssessed.map(g => g.literacyAvg || 0));
  const blAvgNum = avg(blAssessed.map(g => g.numeracyAvg || 0));

  return (
    <div className="space-y-8">

      {/* PA/SA section */}
      <div>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <h2 className="text-sm font-bold text-gray-700">📝 PA/SA Performance</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Exam</label>
            <select value={examType} onChange={e => setExamType(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">All Exams</option>
              {EXAM_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <KPI label="Stage Average" value={stageAvg != null ? `${stageAvg}%` : '—'} color="border-indigo-500" />
          {subjectKPIs.map(s => (
            <KPI key={s.subject} label={s.subject}
              value={`${s.avg}%`}
              color={s.avg >= 70 ? 'border-green-500' : s.avg >= 50 ? 'border-yellow-500' : 'border-red-500'} />
          ))}
        </div>

        {pasaGradeChart.length > 0 ? (
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">Grade-wise Average</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pasaGradeChart} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${v}%`, 'Avg']} />
                <Bar dataKey="avg" name="Avg %" radius={[3, 3, 0, 0]}>
                  {pasaGradeChart.map((g, i) => <Cell key={i} fill={scoreColor(g.avg)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">
            No PA/SA data for {stageInfo.stage} stage in {academicYear}{examType ? ` — ${examType}` : ''}.
          </div>
        )}
      </div>

      {/* Baseline section */}
      <div>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <h2 className="text-sm font-bold text-gray-700">📈 Baseline Assessment</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Round</label>
            <select value={round} onChange={e => setRound(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              {ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <KPI label="Stage Literacy Avg"  value={blAvgLit != null ? `${blAvgLit}%` : '—'} color="border-blue-500"   />
          <KPI label="Stage Numeracy Avg"  value={blAvgNum != null ? `${blAvgNum}%` : '—'} color="border-purple-500" />
        </div>

        {blGradeChart.length > 0 ? (
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">Grade-wise Baseline (Literacy vs Numeracy)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={blGradeChart} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any, n: any) => [`${v}%`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Literacy" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Numeracy" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">
            No baseline data for {stageInfo.stage} stage in {academicYear} — {round.replace('_', ' ')}.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────

export default function AHMStageOverviewPage({
  mappings,
  academicYear,
}: {
  user: any;
  mappings: any;
  academicYear: string;
}) {
  const [subTab, setSubTab] = useState<'teachers' | 'students'>('teachers');

  if (!mappings) {
    return (
      <div className="p-6 flex items-center justify-center text-gray-400 text-sm">
        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2" />
        Loading stage info…
      </div>
    );
  }

  const stageInfo = deriveAHMStage(mappings);

  if (!stageInfo) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm">
        No grade mappings found for this year. Ask admin to assign grades to your account.
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">📊 Stage Overview</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {stageInfo.stage} Stage · {stageInfo.grades.filter(g => g !== 'Nursery').join(' · ')}
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {(['teachers', 'students'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${
              subTab === t
                ? 'bg-teal-600 text-white shadow'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-teal-50'
            }`}>
            {t === 'teachers' ? '👩‍🏫 My Teachers' : '🎓 My Students'}
          </button>
        ))}
      </div>

      {subTab === 'teachers' && (
        <TeachersTab academicYear={academicYear} stageInfo={stageInfo} />
      )}
      {subTab === 'students' && (
        <StudentsTab academicYear={academicYear} stageInfo={stageInfo} />
      )}
    </div>
  );
}
