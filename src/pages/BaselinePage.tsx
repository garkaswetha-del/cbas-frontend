import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts";

const API = "https://cbas-backend-production.up.railway.app";

// ── Section name corrections (Excel typos → DB names) ────────────
const SECTION_CORRECTIONS: Record<string, string> = {
  "asteriod": "ASTEROID", "einstien": "EINSTEIN", "dimond": "DIAMOND",
  "shanti": "SHANTHI", "satya": "SATHYA", "veda": "VEDHA", "centarus": "CENTAURUS",
};

const GRADE_NUM_MAP: Record<string, string> = {
  "1":"Grade 1","2":"Grade 2","3":"Grade 3","4":"Grade 4","5":"Grade 5",
  "6":"Grade 6","7":"Grade 7","8":"Grade 8","9":"Grade 9","10":"Grade 10",
  "pkg":"Pre-KG","lkg":"LKG","ukg":"UKG",
};

const GRADE_TO_STAGE: Record<string, string> = {
  "Pre-KG":"foundation","LKG":"foundation","UKG":"foundation",
  "Grade 1":"foundation","Grade 2":"foundation",
  "Grade 3":"preparatory","Grade 4":"preparatory","Grade 5":"preparatory",
  "Grade 6":"middle","Grade 7":"middle","Grade 8":"middle",
  "Grade 9":"secondary","Grade 10":"secondary",
};

// Default domains per subject
const DEFAULT_LIT_DOMAINS = ["Listening","Speaking","Reading","Writing"];
const DEFAULT_NUM_DOMAINS = ["Operations","Base 10","Measurement","Geometry"];

const generateAcademicYears = () => {
  const years = [];
  for (let i = 2025; i <= 2035; i++) years.push(`${i}-${String(i+1).slice(2)}`);
  return years;
};
const ACADEMIC_YEARS = generateAcademicYears();

const ROUNDS = [
  { value:"baseline_1",label:"Round 1"},{ value:"baseline_2",label:"Round 2"},
  { value:"baseline_3",label:"Round 3"},{ value:"baseline_4",label:"Round 4"},
  { value:"baseline_5",label:"Round 5"},{ value:"baseline_6",label:"Round 6"},
  { value:"baseline_7",label:"Round 7"},{ value:"baseline_8",label:"Round 8"},
  { value:"baseline_9",label:"Round 9"},{ value:"baseline_10",label:"Round 10"},
];

const GRADES = ["Pre-KG","LKG","UKG","Grade 1","Grade 2","Grade 3","Grade 4",
  "Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];

const STAGES = [
  { value:"foundation",label:"Foundation (Pre-KG to Grade 2)"},
  { value:"preparatory",label:"Preparatory (Grade 3-5)"},
  { value:"middle",label:"Middle (Grade 6-8)"},
  { value:"secondary",label:"Secondary (Grade 9-10)"},
];

const scoreBg = (s: number) =>
  s >= 80 ? "bg-green-100 text-green-800" : s >= 60 ? "bg-blue-100 text-blue-800" :
  s >= 40 ? "bg-yellow-100 text-yellow-800" : s > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-400";

const levelBg = (level: string) => {
  if (level?.includes("4")) return "bg-green-100 text-green-800";
  if (level?.includes("3")) return "bg-blue-100 text-blue-800";
  if (level?.includes("2")) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

// ── Excel parser ──────────────────────────────────────────────────
function parseSheetName(name: string): { grade: string; section: string } | null {
  const m = name.trim().match(/^[Gg](\d{1,2})\s+(.+)$/);
  if (!m) return null;
  const grade = GRADE_NUM_MAP[m[1]];
  if (!grade) return null;
  const raw = m[2].trim().toLowerCase();
  const section = SECTION_CORRECTIONS[raw] || raw.toUpperCase();
  return { grade, section };
}

function normalizeName(n: string) {
  return n.trim().toUpperCase().replace(/\s+/g," ").split(" ").sort().join(" ");
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a), nb = normalizeName(b);
  if (na === nb) return 100;
  const wa = na.split(" "), wb = nb.split(" ");
  const shorter = wa.length <= wb.length ? wa : wb;
  const longer  = wa.length <= wb.length ? wb : wa;
  if (shorter.every(w => longer.includes(w))) return 90;
  const shared = shorter.filter(w => longer.some(lw => lw.startsWith(w)||w.startsWith(lw)));
  const wordScore = shared.length / Math.max(shorter.length, longer.length);
  const bigrams = (s: string) => { const bg = new Set<string>(); for(let i=0;i<s.length-1;i++) bg.add(s.slice(i,i+2)); return bg; };
  const bgA = bigrams(na.replace(/ /g,"")), bgB = bigrams(nb.replace(/ /g,""));
  const inter = [...bgA].filter(x => bgB.has(x)).length;
  const union = new Set([...bgA,...bgB]).size;
  return Math.round((wordScore*0.6 + (union>0?inter/union:0)*0.4)*100);
}

function findSuggestions(name: string, dbStudents: any[], topN=4) {
  return dbStudents.map(s => ({ dbStudent: s, score: nameSimilarity(name, s.name) }))
    .filter(x => x.score >= 50).sort((a,b) => b.score-a.score).slice(0,topN);
}

function parseBaselineExcel(ws: XLSX.WorkSheet): {
  domains: { literacy: string[]; numeracy: string[] };
  rows: Array<{ name: string; scores: Record<string, number | null> }>;
} {
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header:1, defval:null });
  if (rows.length < 2) return { domains: { literacy: DEFAULT_LIT_DOMAINS, numeracy: DEFAULT_NUM_DOMAINS }, rows: [] };

  // Find sub-header row
  let hdrIdx = 1;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    if (rows[i]?.some((c:any) => typeof c === "string" && c.toLowerCase().includes("listen"))) { hdrIdx = i; break; }
  }

  const hdr = rows[hdrIdx] || [];
  const litCols: Array<{ name: string; col: number }> = [];
  const numCols: Array<{ name: string; col: number }> = [];

  // Detect literacy/numeracy group from row 0
  const grpRow = rows[0] || [];
  let litStart = -1, numStart = -1, numEnd = -1;
  grpRow.forEach((c:any, ci:number) => {
    if (typeof c === "string") {
      if (c.toLowerCase().includes("literacy")) litStart = ci;
      if (c.toLowerCase().includes("numeracy")) numStart = ci;
    }
  });

  hdr.forEach((c: any, ci: number) => {
    if (!c || typeof c !== "string") return;
    const clean = c.trim().replace(/\s*\([^)]*\)/g,"").replace(/\d+marks?/gi,"").trim();
    if (!clean) return;
    // Skip student name column
    if (ci === 0) return;
    // Assign to literacy or numeracy based on column group position
    if (numStart > 0 && ci >= numStart) {
      if (!clean.toLowerCase().includes("student")) numCols.push({ name: clean, col: ci });
    } else if (litStart >= 0 && ci >= litStart) {
      if (!clean.toLowerCase().includes("student")) litCols.push({ name: clean, col: ci });
    } else {
      // fallback — use domain keyword matching
      const l = clean.toLowerCase();
      if (l.includes("listen")||l.includes("speak")||l.includes("read")||l.includes("writ")) litCols.push({ name: clean, col: ci });
      else if (l.includes("operat")||l.includes("base")||l.includes("measur")||l.includes("geom")||l.includes("data")||l.includes("reason")) numCols.push({ name: clean, col: ci });
    }
  });

  const parseVal = (raw: any): number | null => {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim().toLowerCase();
    if (!s || s === "ab" || s === "abs" || s === "absent" || s === "-") return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  const dataRows = [];
  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    if (!name || name.toLowerCase() === "total" || name.toLowerCase() === "average") continue;
    const scores: Record<string, number | null> = {};
    [...litCols, ...numCols].forEach(({ name: dn, col }) => { scores[dn] = parseVal(row[col]); });
    dataRows.push({ name, scores });
  }

  const litDomains = litCols.length ? litCols.map(c => c.name) : DEFAULT_LIT_DOMAINS;
  const numDomains = numCols.length ? numCols.map(c => c.name) : DEFAULT_NUM_DOMAINS;

  return { domains: { literacy: litDomains, numeracy: numDomains }, rows: dataRows };
}

// ── TeacherBaselineEntry component ────────────────────────────────
function TeacherBaselineEntry({ teachers, academicYear, assessmentDate, setAssessmentDate, API: apiUrl }: any) {
  const LIT_DOMAINS = ["Listening","Speaking","Reading","Writing"];
  const NUM_DOMAINS = ["Operations","Base 10","Measurement","Geometry"];
  const TROUNDS = [
    {value:"baseline_1",label:"Round 1"},{value:"baseline_2",label:"Round 2"},
    {value:"baseline_3",label:"Round 3"},{value:"baseline_4",label:"Round 4"},
    {value:"baseline_5",label:"Round 5"},{value:"baseline_6",label:"Round 6"},
    {value:"baseline_7",label:"Round 7"},{value:"baseline_8",label:"Round 8"},
    {value:"baseline_9",label:"Round 9"},{value:"baseline_10",label:"Round 10"},
  ];
  const STAGE_ORDER = ["foundation","preparatory","middle","secondary"];

  const [round, setRound] = useState("baseline_1");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  // Per-teacher entry: { [tid]: { subjects, lit_stage, num_stage, litScores, numScores, lit_max, num_max } }
  const [entries, setEntries] = useState<Record<string, any>>({});
  const [existingData, setExistingData] = useState<Record<string, any[]>>({});

  useEffect(() => { loadExistingRounds(); }, [round, academicYear]);

  const loadExistingRounds = async () => {
    setLoading(true);
    const result: Record<string, any[]> = {};
    await Promise.all(teachers.map(async (t: any) => {
      try {
        const r = await axios.get(`${apiUrl}/baseline/teacher/${t.id}?academic_year=${academicYear}`);
        const assessments: any[] = r.data?.assessments || [];
        result[t.id] = assessments;

        // Find this round's data
        const roundData = assessments.find((a: any) => a.round === round);

        // Find previous round to check promotion
        const ROUND_ORDER = TROUNDS.map(r => r.value);
        const prevRoundIdx = ROUND_ORDER.indexOf(round) - 1;
        const prevRound = prevRoundIdx >= 0 ? ROUND_ORDER[prevRoundIdx] : null;
        const prevData = prevRound ? assessments.find((a: any) => a.round === prevRound) : null;

        if (roundData) {
          // Pre-fill from saved data for THIS round only
          const litScores: Record<string,string> = {};
          const numScores: Record<string,string> = {};
          const litMax: Record<string,string> = {};
          const numMax: Record<string,string> = {};
          LIT_DOMAINS.forEach(d => {
            litScores[d] = roundData.literacy_scores?.[d]?.toString() || "";
            litMax[d] = roundData.max_marks?.[d]?.toString() || "";
          });
          NUM_DOMAINS.forEach(d => {
            numScores[d] = roundData.numeracy_scores?.[d]?.toString() || "";
            numMax[d] = roundData.max_marks?.[d]?.toString() || "";
          });
          setEntries(prev => ({ ...prev, [t.id]: {
            subjects: "both",
            lit_stage: roundData.gaps?.lit_stage || roundData.stage || "foundation",
            num_stage: roundData.gaps?.num_stage || roundData.stage || "foundation",
            litScores, numScores, litMax, numMax,
          }}));
        } else {
          // No saved data for this round — start FRESH (empty marks)
          // Carry stage forward from previous round (with subject-wise promotion)
          const prevLitStage = prevData?.gaps?.lit_stage || prevData?.stage || "foundation";
          const prevNumStage = prevData?.gaps?.num_stage || prevData?.stage || "foundation";
          const litPromoted = prevData?.gaps?.lit_promoted === true;
          const numPromoted = prevData?.gaps?.num_promoted === true;
          const nextLitIdx = STAGE_ORDER.indexOf(prevLitStage) + (litPromoted ? 1 : 0);
          const nextNumIdx = STAGE_ORDER.indexOf(prevNumStage) + (numPromoted ? 1 : 0);
          const nextLitStage = STAGE_ORDER[Math.min(nextLitIdx, STAGE_ORDER.length - 1)] || prevLitStage;
          const nextNumStage = STAGE_ORDER[Math.min(nextNumIdx, STAGE_ORDER.length - 1)] || prevNumStage;
          setEntries(prev => ({ ...prev, [t.id]: {
            subjects: prev[t.id]?.subjects || "both",
            lit_stage: nextLitStage,
            num_stage: nextNumStage,
            // Always empty for a new round
            litScores: {}, numScores: {}, litMax: {}, numMax: {},
          }}));
        }
      } catch {}
    }));
    setExistingData(result);
    setLoading(false);
  };

  const getEntry = (tid: string) => entries[tid] || {
    subjects: "both", lit_stage: "foundation", num_stage: "foundation",
    litScores: {}, numScores: {}, litMax: {}, numMax: {},
  };

  const updateScore = (tid: string, subject: "lit"|"num", domain: string, value: string) => {
    const key = subject === "lit" ? "litScores" : "numScores";
    setEntries(prev => ({ ...prev, [tid]: { ...getEntry(tid), [key]: { ...(getEntry(tid)[key]||{}), [domain]: value } } }));
  };

  const updateMax = (tid: string, subject: "lit"|"num", domain: string, value: string) => {
    const key = subject === "lit" ? "litMax" : "numMax";
    setEntries(prev => ({ ...prev, [tid]: { ...getEntry(tid), [key]: { ...(getEntry(tid)[key]||{}), [domain]: value } } }));
  };

  const updateEntry = (tid: string, field: string, value: string) => {
    setEntries(prev => ({ ...prev, [tid]: { ...getEntry(tid), [field]: value } }));
  };

  // Calculate % using per-teacher max marks
  const calcPct = (score: string, maxMark: string) => {
    const s = parseFloat(score);
    const m = parseFloat(maxMark);
    if (isNaN(s) || s === 0) return null;
    if (isNaN(m) || m <= 0) return s; // treat as % if no max
    return (s / m) * 100;
  };

  const calcAvgPct = (scores: Record<string,string>, maxMarks: Record<string,string>, domains: string[]) => {
    const vals = domains.map(d => calcPct(scores[d]||"", maxMarks[d]||"")).filter(v => v !== null) as number[];
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  };

  const scoreBgInput = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n) || val === "") return "border-gray-300";
    if (n >= 80) return "border-green-400 bg-green-50";
    if (n >= 60) return "border-blue-400 bg-blue-50";
    if (n >= 40) return "border-yellow-400 bg-yellow-50";
    return "border-red-400 bg-red-50";
  };

  const saveAll = async () => {
    setSaving(true);
    let saved = 0;
    try {
      for (const teacher of teachers) {
        const entry = getEntry(teacher.id);
        const { litScores, numScores, litMax, numMax, lit_stage, num_stage, subjects } = entry;
        const doLit = subjects === "literacy" || subjects === "both";
        const doNum = subjects === "numeracy" || subjects === "both";
        const hasLit = doLit && LIT_DOMAINS.some(d => litScores[d] && litScores[d] !== "");
        const hasNum = doNum && NUM_DOMAINS.some(d => numScores[d] && numScores[d] !== "");
        if (!hasLit && !hasNum) continue;

        const literacyScores: Record<string,number> = {};
        const numeracyScores: Record<string,number> = {};
        const maxMarks: Record<string,number> = {};

        if (hasLit) LIT_DOMAINS.forEach(d => {
          const v = parseFloat(litScores[d]||"");
          if (!isNaN(v)) {
            literacyScores[d] = v;
            maxMarks[d] = parseFloat(litMax[d]||"0") || 0;
          }
        });
        if (hasNum) NUM_DOMAINS.forEach(d => {
          const v = parseFloat(numScores[d]||"");
          if (!isNaN(v)) {
            numeracyScores[d] = v;
            maxMarks[d] = parseFloat(numMax[d]||"0") || 0;
          }
        });

        // Calculate subject-wise % averages to determine promotion
        const litPctAvg = hasLit ? calcAvgPct(litScores, litMax, LIT_DOMAINS) : 0;
        const numPctAvg = hasNum ? calcAvgPct(numScores, numMax, NUM_DOMAINS) : 0;
        const lit_promoted = hasLit && litPctAvg >= 80;
        const num_promoted = hasNum && numPctAvg >= 80;

        // Primary stage = lit_stage (for backward compat with single stage field)
        const stage = hasLit ? (lit_stage || "foundation") : (num_stage || "foundation");

        await axios.post(`${apiUrl}/baseline/teacher`, {
          teacher_id: teacher.id, teacher_name: teacher.name,
          academic_year: academicYear, round,
          stage,
          lit_stage: lit_stage || "foundation",
          num_stage: num_stage || "foundation",
          lit_promoted,
          num_promoted,
          assessment_date: assessmentDate,
          literacy_scores: literacyScores,
          numeracy_scores: numeracyScores,
          max_marks: maxMarks,
        });
        saved++;
      }
      setMessage(`✅ Saved ${saved} teacher records`);
      loadExistingRounds();
    } catch { setMessage("❌ Error saving"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-4 flex gap-4 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Round</label>
          <select value={round} onChange={e => setRound(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {TROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Assessment Date</label>
          <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <p className="text-xs text-gray-500">Enter raw marks + max marks per teacher. % calculated automatically.</p>
          <button onClick={saveAll} disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold">
            {saving ? "Saving..." : "💾 Save All Teachers"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold border ${message.startsWith("✅")?"bg-green-600 text-white border-green-700":"bg-red-600 text-white border-red-700"}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <div className="space-y-3">
          {teachers.map((teacher: any, idx: number) => {
            const entry = getEntry(teacher.id);
            const { litScores={}, numScores={}, litMax={}, numMax={}, subjects="both", lit_stage="foundation", num_stage="foundation" } = entry;
            const doLit = subjects === "literacy" || subjects === "both";
            const doNum = subjects === "numeracy" || subjects === "both";
            const litAvgPct = doLit ? calcAvgPct(litScores, litMax, LIT_DOMAINS) : 0;
            const numAvgPct = doNum ? calcAvgPct(numScores, numMax, NUM_DOMAINS) : 0;
            const overall = doLit && doNum ? (litAvgPct+numAvgPct)/2 : doLit ? litAvgPct : numAvgPct;
            const isPromoted = overall >= 80;
            const prevAssessments = existingData[teacher.id] || [];
            const prevRound = prevAssessments.find((a:any) => a.round === TROUNDS[Math.max(0,TROUNDS.findIndex(r=>r.value===round)-1)]?.value);

            return (
              <div key={teacher.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                {/* Teacher header */}
                <div className={`px-4 py-3 flex items-center justify-between flex-wrap gap-2 ${isPromoted?"bg-green-50 border-b border-green-200":"bg-gray-50 border-b border-gray-200"}`}>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-bold text-sm text-gray-800">{teacher.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{(teacher.subjects||[]).join(", ")}</span>
                    </div>
                    {prevRound?.promoted && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">🎉 Promoted from prev round</span>
                    )}
                    {isPromoted && overall > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">🎉 Will Promote This Round</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Subject selection */}
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-500">Subject:</label>
                      <select value={subjects} onChange={e => updateEntry(teacher.id, "subjects", e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs min-w-[90px]">
                        <option value="both">Both</option>
                        <option value="literacy">Literacy only</option>
                        <option value="numeracy">Numeracy only</option>
                      </select>
                    </div>
                    {/* Stage per subject */}
                    {doLit && (
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-blue-600">Lit Stage:</label>
                        <select value={lit_stage} onChange={e => updateEntry(teacher.id, "lit_stage", e.target.value)}
                          className="border border-blue-300 rounded px-2 py-1 text-xs text-blue-700 min-w-[110px]">
                          {STAGES.map(s => <option key={s.value} value={s.value}>{s.label.split(" ")[0]}</option>)}
                        </select>
                      </div>
                    )}
                    {doNum && (
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-purple-600">Num Stage:</label>
                        <select value={num_stage} onChange={e => updateEntry(teacher.id, "num_stage", e.target.value)}
                          className="border border-purple-300 rounded px-2 py-1 text-xs text-purple-700 min-w-[110px]">
                          {STAGES.map(s => <option key={s.value} value={s.value}>{s.label.split(" ")[0]}</option>)}
                        </select>
                      </div>
                    )}
                    {/* Overall score badge */}
                    {overall > 0 && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${scoreBg(overall)}`}>
                        {overall.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Score entry */}
                <div className="p-3 overflow-x-auto">
                  <table className="text-xs border-collapse w-full" style={{minWidth:"600px"}}>
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left text-gray-500 w-20">Subject</th>
                        <th className="px-2 py-1 text-center text-gray-400 font-normal w-16">Row</th>
                        {[...LIT_DOMAINS.filter(()=>doLit), ...NUM_DOMAINS.filter(()=>doNum)].map((d,i) => {
                          const isLit = LIT_DOMAINS.includes(d);
                          return <th key={d+i} className={`px-2 py-1 text-center min-w-[70px] ${isLit?"text-blue-700":"text-purple-700"}`}>{d}</th>;
                        })}
                        <th className="px-2 py-1 text-center text-gray-600 w-16">Avg %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Literacy rows */}
                      {doLit && (<>
                        <tr className="bg-blue-50">
                          <td className="px-2 py-1.5 font-bold text-blue-700" rowSpan={2}>📖 Literacy</td>
                          <td className="px-2 py-1 text-center text-xs text-amber-700 font-bold bg-amber-50 border border-amber-200 rounded">Max</td>
                          {LIT_DOMAINS.map(d => (
                            <td key={d} className="px-1 py-1 text-center">
                              <input type="number" min={1} step={1}
                                value={litMax[d]||""}
                                onChange={e => updateMax(teacher.id, "lit", d, e.target.value)}
                                placeholder="max"
                                className="w-16 text-center text-xs border border-amber-300 bg-amber-50 rounded px-1 py-0.5 font-bold text-amber-800"
                              />
                            </td>
                          ))}
                          {doNum && NUM_DOMAINS.map(d => <td key={d} />)}
                          <td />
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="px-2 py-1 text-center text-xs text-blue-600 font-bold">Marks</td>
                          {LIT_DOMAINS.map(d => (
                            <td key={d} className="px-1 py-1 text-center">
                              <input type="number" min={0} step={0.5}
                                value={litScores[d]||""}
                                onChange={e => updateScore(teacher.id, "lit", d, e.target.value)}
                                placeholder="—"
                                className={`w-16 text-center text-xs border rounded px-1 py-0.5 ${scoreBgInput(litScores[d]||"")}`}
                              />
                              {litMax[d] && litScores[d] && <div className="text-gray-400 text-xs text-center mt-0.5">
                                {((parseFloat(litScores[d])/parseFloat(litMax[d]))*100).toFixed(0)}%
                              </div>}
                            </td>
                          ))}
                          {doNum && NUM_DOMAINS.map(d => <td key={d} />)}
                          <td className="px-2 text-center">
                            {litAvgPct > 0 && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(litAvgPct)}`}>{litAvgPct.toFixed(1)}%</span>}
                          </td>
                        </tr>
                      </>)}

                      {/* Numeracy rows */}
                      {doNum && (<>
                        <tr className="bg-purple-50">
                          <td className="px-2 py-1.5 font-bold text-purple-700" rowSpan={2}>🔢 Numeracy</td>
                          <td className="px-2 py-1 text-center text-xs text-amber-700 font-bold bg-amber-50 border border-amber-200 rounded">Max</td>
                          {doLit && LIT_DOMAINS.map(d => <td key={d} />)}
                          {NUM_DOMAINS.map(d => (
                            <td key={d} className="px-1 py-1 text-center">
                              <input type="number" min={1} step={1}
                                value={numMax[d]||""}
                                onChange={e => updateMax(teacher.id, "num", d, e.target.value)}
                                placeholder="max"
                                className="w-16 text-center text-xs border border-amber-300 bg-amber-50 rounded px-1 py-0.5 font-bold text-amber-800"
                              />
                            </td>
                          ))}
                          <td />
                        </tr>
                        <tr className="bg-purple-50">
                          <td className="px-2 py-1 text-center text-xs text-purple-600 font-bold">Marks</td>
                          {doLit && LIT_DOMAINS.map(d => <td key={d} />)}
                          {NUM_DOMAINS.map(d => (
                            <td key={d} className="px-1 py-1 text-center">
                              <input type="number" min={0} step={0.5}
                                value={numScores[d]||""}
                                onChange={e => updateScore(teacher.id, "num", d, e.target.value)}
                                placeholder="—"
                                className={`w-16 text-center text-xs border rounded px-1 py-0.5 ${scoreBgInput(numScores[d]||"")}`}
                              />
                              {numMax[d] && numScores[d] && <div className="text-gray-400 text-xs text-center mt-0.5">
                                {((parseFloat(numScores[d])/parseFloat(numMax[d]))*100).toFixed(0)}%
                              </div>}
                            </td>
                          ))}
                          <td className="px-2 text-center">
                            {numAvgPct > 0 && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(numAvgPct)}`}>{numAvgPct.toFixed(1)}%</span>}
                          </td>
                        </tr>
                      </>)}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Main BaselinePage export ──────────────────────────────────────
export default function BaselinePage() {
  const [activeTab, setActiveTab] = useState<"entry"|"teacher"|"dashboard"|"ai_paper"|"report_card">("entry");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [round, setRound] = useState("baseline_1");
  const [grade, setGrade] = useState("Grade 1");
  const [sections, setSections] = useState<string[]>([]);
  const [section, setSection] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [message, setMessage] = useState("");

  // ── Unified entry state ──────────────────────────────────────
  const [entryStudents, setEntryStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Domain config — editable per session
  const [litDomains, setLitDomains] = useState<string[]>([...DEFAULT_LIT_DOMAINS]);
  const [numDomains, setNumDomains] = useState<string[]>([...DEFAULT_NUM_DOMAINS]);
  const [newLitDomain, setNewLitDomain] = useState("");
  const [newNumDomain, setNewNumDomain] = useState("");

  // Max marks per domain — editable
  const [maxMarks, setMaxMarks] = useState<Record<string, string>>({});

  // Student scores — { [studentId]: { [domain]: string } }
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  // Excel upload state
  const xlFileRef = useRef<HTMLInputElement>(null);
  const [xlParsing, setXlParsing] = useState(false);
  const [xlSheets, setXlSheets] = useState<Array<{
    sheetName: string; grade: string; section: string;
    domains: { literacy: string[]; numeracy: string[] };
    matched: Array<{ dbStudent: any; excelRow: { name: string; scores: Record<string, number|null> } }>;
    unmatched: Array<{ excelRow: { name: string; scores: Record<string, number|null> }; suggestions: Array<{ dbStudent: any; score: number }> }>;
    dbStudents: any[];
  }>>([]);
  const [xlOverrides, setXlOverrides] = useState<Record<number, Record<string, any|null>>>({});
  const [xlActiveSheet, setXlActiveSheet] = useState(0);
  const [xlImported, setXlImported] = useState(false);

  // Teacher / Dashboard state
  const [teachers, setTeachers] = useState<any[]>([]);
  const [dashTab, setDashTab] = useState<"school"|"grade"|"teachers"|"alerts">("school");
  const [schoolData, setSchoolData] = useState<any>(null);
  const [gradeData, setGradeData] = useState<any>(null);
  const [teacherDashData, setTeacherDashData] = useState<any>(null);
  const [studentAlerts, setStudentAlerts] = useState<any[]>([]);
  const [teacherAlerts, setTeacherAlerts] = useState<any[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashGrade, setDashGrade] = useState("Grade 1");
  const [schoolDashTab, setSchoolDashTab] = useState<"overall"|"literacy"|"numeracy">("overall");
  const [gradeDashTab, setGradeDashTab] = useState<"overall"|"literacy"|"numeracy">("overall");
  const [teacherDashTab, setTeacherDashTab] = useState<"overall"|"literacy"|"numeracy">("overall");

  useEffect(() => { if (grade) fetchSections(); }, [grade]);
  useEffect(() => { if (grade && section) fetchStudents(); }, [grade, section, academicYear, round]);
  useEffect(() => { fetchTeachers(); }, []);
  useEffect(() => {
    if (activeTab === "dashboard") {
      if (dashTab === "school") fetchSchoolDash();
      else if (dashTab === "grade") fetchGradeDash();
      else if (dashTab === "teachers") fetchTeacherDash();
      else fetchAlerts();
    }
  }, [dashTab, academicYear, round, dashGrade, activeTab]);

  const fetchSections = async () => {
    try {
      const r = await axios.get(`${API}/students?limit=2000`);
      const students = r.data?.data || r.data || [];
      const secs = [...new Set(students.filter((s:any) => s.current_class === grade).map((s:any) => s.section).filter(Boolean))] as string[];
      setSections(secs.sort());
      if (secs.length) setSection(secs[0]);
    } catch {}
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const r = await axios.get(`${API}/baseline/section?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&academic_year=${academicYear}&round=${round}`);
      const data = r.data || [];
      setEntryStudents(data);
      // Pre-fill scores from existing data
      const newScores: Record<string, Record<string, string>> = {};
      const newMaxMarks: Record<string, string> = {};
      let detectedLitDomains: string[] | null = null;
      let detectedNumDomains: string[] | null = null;

      data.forEach((st: any) => {
        const sc: Record<string, string> = {};
        if (st.assessment) {
          const a = st.assessment;
          // Restore domains from saved data
          if (a.literacy_scores) Object.entries(a.literacy_scores).forEach(([d, v]) => { sc[d] = String(v); });
          if (a.numeracy_scores) Object.entries(a.numeracy_scores).forEach(([d, v]) => { sc[d] = String(v); });
          if (a.max_marks && !Object.keys(newMaxMarks).length) {
            Object.entries(a.max_marks).forEach(([d, v]) => { newMaxMarks[d] = String(v); });
          }
          if (!detectedLitDomains && a.literacy_scores) detectedLitDomains = Object.keys(a.literacy_scores);
          if (!detectedNumDomains && a.numeracy_scores) detectedNumDomains = Object.keys(a.numeracy_scores);
        }
        newScores[st.student_id] = sc;
      });

      setScores(newScores);
      if (Object.keys(newMaxMarks).length) setMaxMarks(newMaxMarks);
      if (detectedLitDomains && detectedLitDomains.length) setLitDomains(detectedLitDomains);
      if (detectedNumDomains && detectedNumDomains.length) setNumDomains(detectedNumDomains);
      setXlImported(false);
    } catch {}
    setLoadingStudents(false);
  };

  const fetchTeachers = async () => {
    try { const r = await axios.get(`${API}/users?role=teacher`); setTeachers(r.data||[]); } catch {}
  };

  const fetchSchoolDash = async () => {
    setDashLoading(true); setSchoolData(null);
    try { const r = await axios.get(`${API}/baseline/dashboard/school?academic_year=${academicYear}&round=${round}`); setSchoolData(r.data); } catch {}
    setDashLoading(false);
  };
  const fetchGradeDash = async () => {
    setDashLoading(true); setGradeData(null);
    try { const r = await axios.get(`${API}/baseline/dashboard/grade/${encodeURIComponent(dashGrade)}?academic_year=${academicYear}&round=${round}`); setGradeData(r.data); } catch {}
    setDashLoading(false);
  };
  const fetchTeacherDash = async () => {
    setDashLoading(true); setTeacherDashData(null);
    try { const r = await axios.get(`${API}/baseline/dashboard/teachers?academic_year=${academicYear}&round=${round}`); setTeacherDashData(r.data); } catch {}
    setDashLoading(false);
  };
  const fetchAlerts = async () => {
    setDashLoading(true);
    try {
      const [sr, tr] = await Promise.all([
        axios.get(`${API}/baseline/alerts/students?academic_year=${academicYear}`),
        axios.get(`${API}/baseline/alerts/teachers?academic_year=${academicYear}`),
      ]);
      setStudentAlerts(sr.data||[]); setTeacherAlerts(tr.data||[]);
    } catch {}
    setDashLoading(false);
  };

  // ── Score helpers ────────────────────────────────────────────
  const allDomains = [...litDomains, ...numDomains];

  const calcLiveAvg = (studentId: string, domains: string[]) => {
    const sc = scores[studentId] || {};
    const mm = maxMarks;
    const vals = domains.map(d => {
      const raw = parseFloat(sc[d]||"");
      if (isNaN(raw)) return null;
      const max = parseFloat(mm[d]||"0");
      return max > 0 ? (raw/max)*100 : raw; // treat as % if no max
    }).filter(v => v !== null) as number[];
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  };

  const calcOverall = (studentId: string) => {
    const litAvg = calcLiveAvg(studentId, litDomains);
    const numAvg = calcLiveAvg(studentId, numDomains);
    if (litAvg !== null && numAvg !== null) return (litAvg+numAvg)/2;
    return litAvg ?? numAvg;
  };

  const getLevelLabel = (score: number|null) => {
    if (score === null) return null;
    if (score >= 80) return "L4 – Exceeding";
    if (score >= 60) return "L3 – Meeting";
    if (score >= 40) return "L2 – Approaching";
    return "L1 – Beginning";
  };

  const scoreCellBg = (val: string, domain: string) => {
    const raw = parseFloat(val);
    if (isNaN(raw) || val === "") return "border-gray-200";
    const max = parseFloat(maxMarks[domain]||"0");
    const pct = max > 0 ? (raw/max)*100 : raw;
    if (pct >= 80) return "border-green-400 bg-green-50";
    if (pct >= 60) return "border-blue-300 bg-blue-50";
    if (pct >= 40) return "border-yellow-400 bg-yellow-50";
    return "border-red-400 bg-red-50";
  };

  // ── Save ─────────────────────────────────────────────────────
  const saveScores = async () => {
    setSaving(true);
    try {
      const stage = GRADE_TO_STAGE[grade] || "foundation";
      const assessments = entryStudents
        .map(st => {
          const sc = scores[st.student_id] || {};
          const litScores: Record<string,number> = {};
          const numScores: Record<string,number> = {};
          const mm: Record<string,number> = {};

          litDomains.forEach(d => {
            const v = parseFloat(sc[d]||"");
            if (!isNaN(v)) { litScores[d] = v; mm[d] = parseFloat(maxMarks[d]||"0") || 0; }
          });
          numDomains.forEach(d => {
            const v = parseFloat(sc[d]||"");
            if (!isNaN(v)) { numScores[d] = v; mm[d] = parseFloat(maxMarks[d]||"0") || 0; }
          });

          const hasAny = Object.keys(litScores).length > 0 || Object.keys(numScores).length > 0;
          if (!hasAny) return null;

          return {
            student_id: st.student_id,
            student_name: st.student_name,
            stage,
            literacy_scores: litScores,
            numeracy_scores: numScores,
            max_marks: mm,
          };
        })
        .filter(Boolean);

      if (!assessments.length) { setMessage("❌ No scores to save"); setSaving(false); setTimeout(()=>setMessage(""),3000); return; }

      await axios.post(`${API}/baseline/section`, {
        grade, section, academic_year: academicYear, round, assessment_date: assessmentDate, assessments,
      });
      setMessage(`✅ Saved ${assessments.length} students`);
      fetchStudents();
    } catch { setMessage("❌ Error saving"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  // ── Excel upload ─────────────────────────────────────────────
  const handleXlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlParsing(true);
    setXlSheets([]); setXlOverrides({});
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const studRes = await axios.get(`${API}/students?limit=5000`);
      const allDb: any[] = studRes.data?.data || studRes.data || [];

      const parsed: typeof xlSheets = [];

      for (const sheetName of wb.SheetNames) {
        const meta = parseSheetName(sheetName);
        if (!meta) continue;
        const { domains, rows } = parseBaselineExcel(wb.Sheets[sheetName]);
        if (!rows.length) continue;

        const dbStudents = allDb.filter((s:any) =>
          s.current_class?.toLowerCase() === meta.grade.toLowerCase() &&
          s.section?.toUpperCase() === meta.section.toUpperCase() &&
          s.is_active !== false
        );

        const matched: typeof parsed[0]["matched"] = [];
        const unmatched: typeof parsed[0]["unmatched"] = [];
        const usedIds = new Set<string>();

        for (const row of rows) {
          const excelSorted = normalizeName(row.name);
          let dbMatch = dbStudents.find((s:any) => !usedIds.has(s.id) &&
            (s.name.trim().toUpperCase().replace(/\s+/g," ") === row.name.trim().toUpperCase().replace(/\s+/g," ") ||
             normalizeName(s.name) === excelSorted));
          if (dbMatch) { usedIds.add(dbMatch.id); matched.push({ dbStudent: dbMatch, excelRow: row }); }
          else { unmatched.push({ excelRow: row, suggestions: findSuggestions(row.name, dbStudents.filter(s => !usedIds.has(s.id))) }); }
        }

        // If this sheet matches current grade/section, populate the entry table
        if (meta.grade.toLowerCase() === grade.toLowerCase() &&
            meta.section.toUpperCase() === section.toUpperCase()) {
          // Update domains from Excel
          setLitDomains(domains.literacy);
          setNumDomains(domains.numeracy);
          // Fill scores
          const newScores: Record<string, Record<string, string>> = { ...scores };
          matched.forEach(({ dbStudent, excelRow }) => {
            const sc: Record<string, string> = {};
            Object.entries(excelRow.scores).forEach(([d, v]) => { if (v !== null) sc[d] = String(v); });
            newScores[dbStudent.id] = sc;
          });
          setScores(newScores);
          setXlImported(true);
        }

        parsed.push({ sheetName, grade: meta.grade, section: meta.section, domains, matched, unmatched, dbStudents });
      }

      setXlSheets(parsed);
      setXlActiveSheet(parsed.findIndex(s =>
        s.grade.toLowerCase() === grade.toLowerCase() &&
        s.section.toUpperCase() === section.toUpperCase()
      ) || 0);
      setMessage(`✅ Excel loaded — ${parsed.length} sections parsed. Review unmatched names below.`);
      setTimeout(() => setMessage(""), 5000);
    } catch (err: any) {
      setMessage("❌ Failed to parse Excel: " + err.message);
      setTimeout(() => setMessage(""), 5000);
    }
    setXlParsing(false);
    if (xlFileRef.current) xlFileRef.current.value = "";
  };

  const applyOverrideToTable = (sheetIdx: number) => {
    const sheet = xlSheets[sheetIdx];
    if (!sheet) return;
    const ov = xlOverrides[sheetIdx] || {};
    const newScores = { ...scores };
    sheet.unmatched.forEach(u => {
      const dbStudent = ov[u.excelRow.name];
      if (dbStudent) {
        const sc: Record<string, string> = {};
        Object.entries(u.excelRow.scores).forEach(([d, v]) => { if (v !== null) sc[d] = String(v); });
        newScores[dbStudent.id] = { ...(newScores[dbStudent.id]||{}), ...sc };
      }
    });
    setScores(newScores);
    setMessage("✅ Overrides applied to table");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Baseline Assessment</h1>
        <p className="text-sm text-gray-500">Student and teacher literacy & numeracy baseline tracking</p>
      </div>

      {/* Global controls */}
      <div className="flex gap-3 mb-4 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Round</label>
          <select value={round} onChange={e => setRound(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Assessment Date</label>
          <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-nowrap">
        {[
          {id:"entry",label:"📝 Student Entry"},
          {id:"teacher",label:"👩‍🏫 Teacher Entry"},
          {id:"dashboard",label:"📊 Dashboard"},
          {id:"ai_paper",label:"🤖 AI Assessment Paper"},
          {id:"report_card",label:"📄 Report Cards"},
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-xs sm:text-sm rounded-lg font-medium whitespace-nowrap flex-shrink-0 ${activeTab===t.id?"bg-indigo-600 text-white":"bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sticky toast — visible regardless of scroll position */}
      {message && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold border flex items-center gap-2 ${message.startsWith("✅")?"bg-green-600 text-white border-green-700":"bg-red-600 text-white border-red-700"}`}>
          {message}
        </div>
      )}

      {/* ── STUDENT ENTRY ── */}
      {activeTab === "entry" && (
        <div className="space-y-4">

          {/* Controls row */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={grade} onChange={e => setGrade(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Section</label>
                <select value={section} onChange={e => setSection(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="ml-auto flex gap-2 items-center">
                <input ref={xlFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlUpload} />
                <button onClick={() => xlFileRef.current?.click()} disabled={xlParsing}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center gap-2">
                  {xlParsing ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"/>Parsing...</> : "📂 Import Excel"}
                </button>
                <button onClick={saveScores} disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold">
                  {saving ? "Saving..." : "💾 Save All"}
                </button>
              </div>
            </div>
          </div>

          {/* Domain config */}
          <div className="bg-white rounded-xl shadow border border-indigo-100 p-4">
            <h3 className="text-xs font-bold text-indigo-800 mb-3">⚙️ Domain Configuration — {grade} · {section}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-2">📚 Literacy Domains</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {litDomains.map((d, i) => (
                    <span key={d} className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {d}
                      <button onClick={() => setLitDomains(prev => prev.filter((_,j) => j !== i))} className="text-blue-400 hover:text-red-500 ml-0.5">✕</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input value={newLitDomain} onChange={e => setNewLitDomain(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter"&&newLitDomain.trim()){setLitDomains(p=>[...p,newLitDomain.trim()]);setNewLitDomain(""); }}}
                    placeholder="Add domain (Enter)" className="border border-gray-300 rounded px-2 py-1 text-xs flex-1" />
                  <button onClick={() => {if(newLitDomain.trim()){setLitDomains(p=>[...p,newLitDomain.trim()]);setNewLitDomain("");}}}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded">+</button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-700 mb-2">🔢 Numeracy Domains</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {numDomains.map((d, i) => (
                    <span key={d} className="flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                      {d}
                      <button onClick={() => setNumDomains(prev => prev.filter((_,j) => j !== i))} className="text-purple-400 hover:text-red-500 ml-0.5">✕</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input value={newNumDomain} onChange={e => setNewNumDomain(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter"&&newNumDomain.trim()){setNumDomains(p=>[...p,newNumDomain.trim()]);setNewNumDomain("");}}}
                    placeholder="Add domain (Enter)" className="border border-gray-300 rounded px-2 py-1 text-xs flex-1" />
                  <button onClick={() => {if(newNumDomain.trim()){setNumDomains(p=>[...p,newNumDomain.trim()]);setNewNumDomain("");}}}
                    className="px-2 py-1 bg-purple-600 text-white text-xs rounded">+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Unmatched names panel — shown after Excel import */}
          {xlSheets.length > 0 && xlSheets.some(s => s.unmatched.length > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-yellow-800 mb-2">⚠️ Unmatched Names from Excel — Review Required</h3>
              <div className="flex gap-1.5 flex-wrap mb-3 overflow-x-auto">
                {xlSheets.filter(s => s.unmatched.length > 0).map((s, si) => {
                  const realIdx = xlSheets.indexOf(s);
                  return (
                    <button key={si} onClick={() => setXlActiveSheet(realIdx)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium border flex-shrink-0 ${xlActiveSheet===realIdx?"bg-yellow-600 text-white border-yellow-600":"bg-white text-yellow-700 border-yellow-300"}`}>
                      {s.grade.replace("Grade ","G")} {s.section} · {s.unmatched.filter(u => (xlOverrides[realIdx]||{})[u.excelRow.name]===undefined).length} pending
                    </button>
                  );
                })}
              </div>
              {xlSheets[xlActiveSheet] && xlSheets[xlActiveSheet].unmatched.length > 0 && (() => {
                const sh = xlSheets[xlActiveSheet];
                const ov = xlOverrides[xlActiveSheet] || {};
                return (
                  <div className="space-y-2">
                    {sh.unmatched.map((u, i) => {
                      const confirmed = ov[u.excelRow.name];
                      const skipped = ov[u.excelRow.name] === null;
                      return (
                        <div key={i} className={`flex items-start gap-3 p-2 rounded-lg border text-xs ${confirmed?"bg-green-50 border-green-200":skipped?"bg-gray-50 border-gray-200 opacity-50":"bg-white border-yellow-200"}`}>
                          <div className="font-medium text-gray-700 min-w-[160px]">{u.excelRow.name}</div>
                          <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                            {confirmed ? (
                              <>
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ {confirmed.name}</span>
                                <button onClick={() => setXlOverrides(p => { const c={...p,[xlActiveSheet]:{...(p[xlActiveSheet]||{})}}; delete c[xlActiveSheet][u.excelRow.name]; return c; })} className="text-gray-400 hover:text-red-500 text-xs">undo</button>
                              </>
                            ) : skipped ? (
                              <>
                                <span className="bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">⏭ Skipped</span>
                                <button onClick={() => setXlOverrides(p => { const c={...p,[xlActiveSheet]:{...(p[xlActiveSheet]||{})}}; delete c[xlActiveSheet][u.excelRow.name]; return c; })} className="text-gray-400 hover:text-indigo-500 text-xs">undo</button>
                              </>
                            ) : (
                              <>
                                {u.suggestions.length > 0 ? u.suggestions.map((sg, si2) => (
                                  <button key={si2}
                                    onClick={() => setXlOverrides(p => ({...p,[xlActiveSheet]:{...(p[xlActiveSheet]||{}),[u.excelRow.name]:sg.dbStudent}}))}
                                    className={`px-2 py-0.5 rounded border font-medium hover:bg-green-50 hover:border-green-400 hover:text-green-700 border-gray-300 text-gray-600 flex items-center gap-1`}>
                                    {sg.dbStudent.name}
                                    <span className={`font-bold ml-0.5 ${sg.score>=85?"text-green-600":sg.score>=70?"text-yellow-600":"text-orange-500"}`}>{sg.score}%</span>
                                  </button>
                                )) : <span className="text-gray-400 italic">No close match found</span>}
                                <button onClick={() => setXlOverrides(p => ({...p,[xlActiveSheet]:{...(p[xlActiveSheet]||{}),[u.excelRow.name]:null}}))}
                                  className="px-2 py-0.5 rounded border border-gray-200 text-gray-400 hover:text-red-500">skip</button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {sh.unmatched.some(u => ov[u.excelRow.name] != null && ov[u.excelRow.name] !== null) && (
                      <button onClick={() => applyOverrideToTable(xlActiveSheet)}
                        className="mt-2 px-4 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 font-medium">
                        ✅ Apply confirmed matches to table
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Main entry table */}
          {loadingStudents ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">Loading students...</div>
          ) : entryStudents.length > 0 ? (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-700">{grade} — {section} — {ROUNDS.find(r=>r.value===round)?.label}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{entryStudents.length} students · Enter raw marks · Set max marks row below for % conversion</p>
                </div>
                {xlImported && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">📂 Excel data loaded</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: `${300 + allDomains.length*80}px` }}>
                  <thead>
                    <tr className="bg-indigo-700 text-white">
                      <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 min-w-[180px]">Name</th>
                      <th className="px-2 py-2 text-center min-w-[90px]">Stage</th>
                      {litDomains.map(d => <th key={d} className="px-2 py-2 text-center border-l border-indigo-500 bg-blue-700 min-w-[75px]">{d}</th>)}
                      <th className="px-2 py-2 text-center border-l border-indigo-400 bg-blue-800 min-w-[60px]">Lit%</th>
                      {numDomains.map(d => <th key={d} className="px-2 py-2 text-center border-l border-indigo-500 bg-purple-700 min-w-[75px]">{d}</th>)}
                      <th className="px-2 py-2 text-center border-l border-indigo-400 bg-purple-800 min-w-[60px]">Num%</th>
                      <th className="px-2 py-2 text-center border-l border-indigo-500 min-w-[70px]">Overall</th>
                      <th className="px-2 py-2 text-center min-w-[100px]">Level</th>
                    </tr>
                    {/* Max marks row — must match column order exactly */}
                    <tr className="bg-amber-50 border-b-2 border-amber-300">
                      <td className="px-3 py-1.5 text-xs font-bold text-amber-800 sticky left-0 bg-amber-50">📐 Max Marks</td>
                      <td className="px-2 py-1 text-center text-xs text-amber-500 italic">—</td>
                      {/* Literacy domain inputs */}
                      {litDomains.map(d => (
                        <td key={`litmax-${d}`} className="px-1 py-1 text-center border-l border-amber-200">
                          <input
                            type="number" min={1} step={1}
                            value={maxMarks[d] || ""}
                            onChange={e => setMaxMarks(prev => ({...prev,[d]:e.target.value}))}
                            placeholder="max"
                            className="w-14 text-center text-xs border border-amber-300 bg-amber-50 rounded px-1 py-0.5 font-bold text-amber-800"
                          />
                        </td>
                      ))}
                      {/* Empty cell for Lit% column */}
                      <td className="px-1 py-1 text-center text-xs text-amber-400 border-l border-amber-200">—</td>
                      {/* Numeracy domain inputs */}
                      {numDomains.map(d => (
                        <td key={`nummax-${d}`} className="px-1 py-1 text-center border-l border-amber-200">
                          <input
                            type="number" min={1} step={1}
                            value={maxMarks[d] || ""}
                            onChange={e => setMaxMarks(prev => ({...prev,[d]:e.target.value}))}
                            placeholder="max"
                            className="w-14 text-center text-xs border border-amber-300 bg-amber-50 rounded px-1 py-0.5 font-bold text-amber-800"
                          />
                        </td>
                      ))}
                      {/* Empty cells for Num%, Overall, Level columns */}
                      <td className="px-1 py-1 text-center text-xs text-amber-400 border-l border-amber-200">—</td>
                      <td className="px-1 py-1 text-center text-xs text-amber-400 border-l border-amber-200">—</td>
                      <td className="px-1 py-1 text-center text-xs text-amber-400">—</td>
                    </tr>
                  </thead>
                  <tbody>
                    {entryStudents.map((st, idx) => {
                      const sc = scores[st.student_id] || {};
                      const litAvg = calcLiveAvg(st.student_id, litDomains);
                      const numAvg = calcLiveAvg(st.student_id, numDomains);
                      const overall = calcOverall(st.student_id);
                      const level = getLevelLabel(overall);
                      const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                      const stage = GRADE_TO_STAGE[grade] || "foundation";

                      return (
                        <tr key={st.student_id} className={`border-b border-gray-100 ${bg}`}>
                          <td className={`px-3 py-1.5 font-medium text-gray-800 sticky left-0 z-10 border-r border-gray-200 ${bg}`}>
                            {st.student_name}
                            {st.assessment && <span className="ml-1 text-xs text-green-500" title="Has saved data">✓</span>}
                          </td>
                          <td className="px-1 py-1 text-center text-xs text-gray-500">{stage.charAt(0).toUpperCase()+stage.slice(1)}</td>
                          {litDomains.map(d => (
                            <td key={d} className="px-1 py-1 text-center border-l border-gray-100">
                              <input
                                type="number" min={0} step={0.5}
                                value={sc[d] ?? ""}
                                onChange={e => setScores(prev => ({...prev,[st.student_id]:{...(prev[st.student_id]||{}),[d]:e.target.value}}))}
                                placeholder="—"
                                className={`w-14 text-center text-xs border rounded px-1 py-0.5 ${scoreCellBg(sc[d]||"",d)}`}
                              />
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-center border-l border-gray-200">
                            {litAvg !== null ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(litAvg)}`}>{litAvg.toFixed(1)}%</span> : <span className="text-gray-300">—</span>}
                          </td>
                          {numDomains.map(d => (
                            <td key={d} className="px-1 py-1 text-center border-l border-gray-100">
                              <input
                                type="number" min={0} step={0.5}
                                value={sc[d] ?? ""}
                                onChange={e => setScores(prev => ({...prev,[st.student_id]:{...(prev[st.student_id]||{}),[d]:e.target.value}}))}
                                placeholder="—"
                                className={`w-14 text-center text-xs border rounded px-1 py-0.5 ${scoreCellBg(sc[d]||"",d)}`}
                              />
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-center border-l border-gray-200">
                            {numAvg !== null ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(numAvg)}`}>{numAvg.toFixed(1)}%</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {overall !== null ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(overall)}`}>{overall.toFixed(1)}%</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {level ? <span className={`text-xs px-1.5 py-0.5 rounded ${levelBg(level)}`}>{level.split("–")[0].trim()}</span> : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">
              Select a grade and section to start entering baseline data.
            </div>
          )}
        </div>
      )}

      {/* ── TEACHER ENTRY ── */}
      {activeTab === "teacher" && (
        <TeacherBaselineEntry
          teachers={teachers} academicYear={academicYear}
          assessmentDate={assessmentDate} setAssessmentDate={setAssessmentDate} API={API}
        />
      )}

      {/* ── DASHBOARD ── */}
      {activeTab === "dashboard" && (
        <div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-nowrap items-center">
            {[
              {id:"school",label:"🏫 School"},
              {id:"grade",label:"📚 Grade"},
              {id:"teachers",label:"👩‍🏫 Teachers"},
              {id:"alerts",label:"⚠️ Alerts"},
            ].map(t => (
              <button key={t.id} onClick={() => setDashTab(t.id as any)}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${dashTab===t.id?"bg-indigo-600 text-white":"bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                {t.label}
              </button>
            ))}
            <button onClick={() => {
              if(dashTab==="school") fetchSchoolDash();
              else if(dashTab==="grade") fetchGradeDash();
              else if(dashTab==="teachers") fetchTeacherDash();
              else fetchAlerts();
            }} className="ml-auto px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              🔄 Refresh
            </button>
          </div>

          {dashLoading && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm">Loading...</p>
            </div>
          )}

          {/* ── SCHOOL ── */}
          {!dashLoading && dashTab === "school" && schoolData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  {label:"Total Students",value:schoolData.totalStudents,color:"border-indigo-500"},
                  {label:"Assessed",value:schoolData.assessed,color:"border-green-500"},
                  {label:"Pending",value:schoolData.pending,color:"border-red-500"},
                  {label:"School Avg",value:`${schoolData.overallAvg}%`,color:"border-blue-500"},
                  {label:"Round",value:ROUNDS.find(r=>r.value===round)?.label,color:"border-orange-500"},
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Lit / Num / Overall avg cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {label:"Literacy Avg",value:schoolData.literacyAvg,color:"bg-blue-500"},
                  {label:"Numeracy Avg",value:schoolData.numeracyAvg,color:"bg-purple-500"},
                  {label:"Overall Avg",value:schoolData.overallAvg,color:"bg-indigo-500"},
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <div className={`text-2xl font-bold text-white ${s.color} rounded-xl px-4 py-2 inline-block`}>{s.value}%</div>
                  </div>
                ))}
              </div>

              {/* Grade-wise chart with sub-tabs */}
              {schoolData.gradeWise?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[{id:"overall",label:"📊 Overall"},{id:"literacy",label:"📚 Literacy"},{id:"numeracy",label:"🔢 Numeracy"}].map(t => (
                      <button key={t.id} onClick={() => setSchoolDashTab(t.id as any)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium ${schoolDashTab===t.id?"bg-indigo-600 text-white":"bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Grade-wise {schoolDashTab==="overall"?"Overall":schoolDashTab==="literacy"?"Literacy":"Numeracy"} Average
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={schoolData.gradeWise.map((g:any) => ({
                        name: g.grade.replace("Grade ","G"),
                        value: schoolDashTab==="overall"?g.overallAvg:schoolDashTab==="literacy"?g.literacyAvg:g.numeracyAvg,
                        count: g.count, full: g.grade,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{fontSize:10}} />
                        <YAxis domain={[0,100]} tick={{fontSize:10}} />
                        <Tooltip formatter={(v:any,_,p) => [`${v}% (${p.payload.count} students)`,p.payload.full]} />
                        <Bar dataKey="value" radius={[4,4,0,0]}
                          fill={schoolDashTab==="overall"?"#6366f1":schoolDashTab==="literacy"?"#3b82f6":"#8b5cf6"} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Level distribution */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Level Distribution — School Wide</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {key:"L4",label:"Level 4 – Exceeding",color:"#10b981",bg:"bg-green-50 border-green-200"},
                    {key:"L3",label:"Level 3 – Meeting",color:"#6366f1",bg:"bg-blue-50 border-blue-200"},
                    {key:"L2",label:"Level 2 – Approaching",color:"#f59e0b",bg:"bg-yellow-50 border-yellow-200"},
                    {key:"L1",label:"Level 1 – Beginning",color:"#ef4444",bg:"bg-red-50 border-red-200"},
                  ].map(l => (
                    <div key={l.key} className={`rounded-xl p-4 text-center border ${l.bg}`}>
                      <p className="text-xs font-medium mb-1" style={{color:l.color}}>{l.label}</p>
                      <p className="text-3xl font-bold text-gray-800">{schoolData.levelDist?.[l.key]||0}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {schoolData.assessed>0?(((schoolData.levelDist?.[l.key]||0)/schoolData.assessed)*100).toFixed(1):0}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top gaps */}
              {(schoolData.topLiteracyGaps?.length>0||schoolData.topNumeracyGaps?.length>0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {title:"📚 Top Literacy Gaps",data:schoolData.topLiteracyGaps,color:"text-blue-700"},
                    {title:"🔢 Top Numeracy Gaps",data:schoolData.topNumeracyGaps,color:"text-purple-700"},
                  ].map(({title,data,color}) => (
                    <div key={title} className="bg-white rounded-xl shadow p-4">
                      <h3 className={`text-sm font-semibold mb-3 ${color}`}>{title}</h3>
                      <div className="space-y-2">
                        {(data||[]).map((g:any) => (
                          <div key={g.domain} className="flex items-center justify-between">
                            <span className="text-xs text-gray-700">{g.domain}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-2 bg-red-400 rounded-full" style={{width:`${Math.min(100,(g.count/schoolData.assessed)*100)}%`}} />
                              </div>
                              <span className="text-xs font-bold text-red-600">{g.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── GRADE ── */}
          {!dashLoading && dashTab === "grade" && (
            <div className="space-y-4">
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Grade</label>
                  <select value={dashGrade} onChange={e => setDashGrade(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              {gradeData && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {label:"Assessed",value:gradeData.totalAssessed,color:"border-indigo-500"},
                      {label:"Literacy Avg",value:`${gradeData.literacyAvg}%`,color:"border-blue-500"},
                      {label:"Numeracy Avg",value:`${gradeData.numeracyAvg}%`,color:"border-purple-500"},
                      {label:"Overall Avg",value:`${gradeData.overallAvg}%`,color:"border-green-500"},
                    ].map(s => (
                      <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                        <p className="text-xs text-gray-500">{s.label}</p>
                        <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Grade sub-tabs */}
                  <div className="flex gap-2">
                    {[{id:"overall",label:"📊 Overall"},{id:"literacy",label:"📚 Literacy"},{id:"numeracy",label:"🔢 Numeracy"}].map(t => (
                      <button key={t.id} onClick={() => setGradeDashTab(t.id as any)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium ${gradeDashTab===t.id?"bg-indigo-600 text-white":"bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Section-wise {gradeDashTab==="overall"?"Overall":gradeDashTab==="literacy"?"Literacy":"Numeracy"} Average — {dashGrade}
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={(gradeData.sections||[]).map((s:any) => ({
                        name:s.section,
                        value:gradeDashTab==="overall"?s.overallAvg:gradeDashTab==="literacy"?s.literacyAvg:s.numeracyAvg,
                        atRisk:s.atRisk, count:s.count,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{fontSize:10}} />
                        <YAxis domain={[0,100]} tick={{fontSize:10}} />
                        <Tooltip formatter={(v:any,_,p) => [`${v}% (${p.payload.count} students)`,p.payload.name]} />
                        <Bar dataKey="value" radius={[4,4,0,0]}
                          fill={gradeDashTab==="overall"?"#6366f1":gradeDashTab==="literacy"?"#3b82f6":"#8b5cf6"} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Domain breakdown */}
                  {gradeData.literacyDomains?.length>0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl shadow p-4">
                        <h3 className="text-sm font-semibold text-blue-700 mb-3">📚 Literacy Domain Averages</h3>
                        <div className="space-y-2">
                          {gradeData.literacyDomains.map((d:any) => (
                            <div key={d.domain} className="flex items-center gap-2">
                              <span className="text-xs text-gray-700 w-24">{d.domain}</span>
                              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-4 rounded-full ${d.avg>=60?"bg-blue-400":d.avg>=40?"bg-yellow-400":"bg-red-400"}`} style={{width:`${d.avg}%`}} />
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-10 text-right">{d.avg.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl shadow p-4">
                        <h3 className="text-sm font-semibold text-purple-700 mb-3">🔢 Numeracy Domain Averages</h3>
                        <div className="space-y-2">
                          {gradeData.numeracyDomains.map((d:any) => (
                            <div key={d.domain} className="flex items-center gap-2">
                              <span className="text-xs text-gray-700 w-24">{d.domain}</span>
                              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-4 rounded-full ${d.avg>=60?"bg-purple-400":d.avg>=40?"bg-yellow-400":"bg-red-400"}`} style={{width:`${d.avg}%`}} />
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-10 text-right">{d.avg.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section table */}
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Section Details</h3>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-700 text-white">
                          <th className="px-3 py-2 text-left">Section</th>
                          <th className="px-3 py-2 text-center">Students</th>
                          <th className="px-3 py-2 text-center">Literacy%</th>
                          <th className="px-3 py-2 text-center">Numeracy%</th>
                          <th className="px-3 py-2 text-center">Overall%</th>
                          <th className="px-3 py-2 text-center">At Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(gradeData.sections||[]).map((s:any,i:number) => (
                          <tr key={s.section} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-2 font-semibold text-gray-800">{s.section}</td>
                            <td className="px-3 py-2 text-center">{s.count}</td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.literacyAvg)}`}>{s.literacyAvg}%</span></td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.numeracyAvg)}`}>{s.numeracyAvg}%</span></td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.overallAvg)}`}>{s.overallAvg}%</span></td>
                            <td className="px-3 py-2 text-center">
                              {s.atRisk>0?<span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{s.atRisk} ⚠️</span>:<span className="text-gray-400">0</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TEACHERS ── */}
          {!dashLoading && dashTab === "teachers" && teacherDashData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  {label:"Total Teachers",value:teacherDashData.totalTeachers,color:"border-indigo-500"},
                  {label:"Assessed",value:teacherDashData.assessed,color:"border-green-500"},
                  {label:"Pending",value:teacherDashData.pending,color:"border-red-500"},
                  {label:"Literacy Avg",value:`${teacherDashData.literacyAvg}%`,color:"border-blue-500"},
                  {label:"Numeracy Avg",value:`${teacherDashData.numeracyAvg}%`,color:"border-purple-500"},
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Teacher bar chart with sub-tabs */}
              {teacherDashData.teacherBarData?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[{id:"overall",label:"📊 Overall"},{id:"literacy",label:"📚 Literacy"},{id:"numeracy",label:"🔢 Numeracy"}].map(t => (
                      <button key={t.id} onClick={() => setTeacherDashTab(t.id as any)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium ${teacherDashTab===t.id?"bg-indigo-600 text-white":"bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      {teacherDashTab==="overall"?"📊 Teacher Overall Scores":teacherDashTab==="literacy"?"📚 Teacher Literacy Scores":"🔢 Teacher Numeracy Scores"}
                    </h3>
                    <ResponsiveContainer width="100%" height={Math.max(240,teacherDashData.teacherBarData.length*32)}>
                      <BarChart data={teacherDashData.teacherBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0,100]} tick={{fontSize:10}} />
                        <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={80} />
                        <Tooltip formatter={(v:any,_,p) => [`${v}%`,p.payload.fullName]} />
                        <Bar dataKey={teacherDashTab} radius={[0,4,4,0]}>
                          {teacherDashData.teacherBarData.map((t:any,i:number) => {
                            const val = t[teacherDashTab];
                            return <Cell key={i} fill={val>=80?"#10b981":val>=60?"#6366f1":val>=40?"#f59e0b":"#ef4444"} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Domain averages */}
              {teacherDashData.domainData?.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain Averages</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={teacherDashData.domainData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0,100]} tick={{fontSize:10}} />
                      <YAxis type="category" dataKey="domain" tick={{fontSize:10}} width={80} />
                      <Tooltip formatter={(v:any) => [`${v}%`,"Avg"]} />
                      <Bar dataKey="score" fill="#6366f1" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Level distribution */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Level Distribution</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {key:"L4",label:"Level 4 – Exceeding",color:"#10b981",bg:"bg-green-50 border-green-200"},
                    {key:"L3",label:"Level 3 – Meeting",color:"#6366f1",bg:"bg-blue-50 border-blue-200"},
                    {key:"L2",label:"Level 2 – Approaching",color:"#f59e0b",bg:"bg-yellow-50 border-yellow-200"},
                    {key:"L1",label:"Level 1 – Beginning",color:"#ef4444",bg:"bg-red-50 border-red-200"},
                  ].map(l => (
                    <div key={l.key} className={`rounded-xl p-4 text-center border ${l.bg}`}>
                      <p className="text-xs font-medium mb-1" style={{color:l.color}}>{l.label}</p>
                      <p className="text-3xl font-bold text-gray-800">{teacherDashData.levelDist?.[l.key]||0}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher list */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">All Teachers</h3>
                <div className="space-y-1">
                  {(teacherDashData.teacherList||[]).map((t:any) => (
                    <div key={t.teacher_id} className={`flex items-center justify-between p-2 rounded border ${t.assessment?"bg-green-50 border-green-100":"bg-gray-50 border-gray-100"}`}>
                      <span className="text-sm font-medium text-gray-800">{t.teacher_name}</span>
                      {t.assessment ? (
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(+(+t.assessment.literacy_total||0))}`}>Lit: {(+t.assessment.literacy_total||0).toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(+(+t.assessment.numeracy_total||0))}`}>Num: {(+t.assessment.numeracy_total||0).toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(+(+t.assessment.overall_score||0))}`}>{(+t.assessment.overall_score||0).toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${levelBg(t.assessment.level)}`}>{t.assessment.level?.split("–")[0].trim()}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Not assessed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── GAP ANALYSIS TABLE ── */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">🎯 Teacher Gap Analysis — {ROUNDS.find(r=>r.value===round)?.label}</h3>
                <p className="text-xs text-gray-400 mb-3">Domains below 60% are flagged as gaps. Grade shown = highest grade for the teacher's current stage.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-left min-w-[160px]">Teacher</th>
                        <th className="px-3 py-2 text-center">Lit Stage</th>
                        <th className="px-3 py-2 text-center">Num Stage</th>
                        <th className="px-3 py-2 text-center">Grade (Lit)</th>
                        <th className="px-3 py-2 text-center">Grade (Num)</th>
                        <th className="px-3 py-2 text-left">📚 Literacy Gaps</th>
                        <th className="px-3 py-2 text-left">🔢 Numeracy Gaps</th>
                        <th className="px-3 py-2 text-center">Lit Promoted</th>
                        <th className="px-3 py-2 text-center">Num Promoted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(teacherDashData.teacherList||[]).filter((t:any) => t.assessment).map((t:any, i:number) => {
                        const gaps = t.assessment.gaps || {};
                        const litGaps: string[] = gaps.literacy || [];
                        const numGaps: string[] = gaps.numeracy || [];
                        const litStage = gaps.lit_stage || t.assessment.stage || "foundation";
                        const numStage = gaps.num_stage || t.assessment.stage || "foundation";
                        const litPromoted = gaps.lit_promoted === true;
                        const numPromoted = gaps.num_promoted === true;
                        const STAGE_GRADE_MAP: Record<string,string> = { foundation:"Grade 2", preparatory:"Grade 5", middle:"Grade 8", secondary:"Grade 10" };
                        const litGrade = STAGE_GRADE_MAP[litStage] || litStage;
                        const numGrade = STAGE_GRADE_MAP[numStage] || numStage;
                        return (
                          <tr key={t.teacher_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-2 font-medium text-gray-800">{t.teacher_name}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">{litStage}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">{numStage}</span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs text-gray-600">{litGrade}</td>
                            <td className="px-3 py-2 text-center text-xs text-gray-600">{numGrade}</td>
                            <td className="px-3 py-2">
                              {litGaps.length > 0
                                ? <div className="flex flex-wrap gap-1">{litGaps.map((g:string) => <span key={g} className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs">{g}</span>)}</div>
                                : <span className="text-green-600 text-xs">✅ No gaps</span>}
                            </td>
                            <td className="px-3 py-2">
                              {numGaps.length > 0
                                ? <div className="flex flex-wrap gap-1">{numGaps.map((g:string) => <span key={g} className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs">{g}</span>)}</div>
                                : <span className="text-green-600 text-xs">✅ No gaps</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {litPromoted
                                ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">🎉 Yes → {gaps.lit_promoted_to || "next"}</span>
                                : <span className="text-xs text-gray-400">—</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {numPromoted
                                ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">🎉 Yes → {gaps.num_promoted_to || "next"}</span>
                                : <span className="text-xs text-gray-400">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── STAGE PROGRESSION TABLE ── */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">📈 Stage Progression — All Rounds</h3>
                <p className="text-xs text-gray-400 mb-3">Starting stage → progression round by round. 🎉 = promoted that round.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-indigo-700 text-white">
                        <th className="px-3 py-2 text-left min-w-[160px]">Teacher</th>
                        <th className="px-3 py-2 text-center">Subject</th>
                        {ROUNDS.slice(0,6).map(r => (
                          <th key={r.value} className="px-2 py-2 text-center min-w-[80px]">{r.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(teacherDashData.teacherStageProgression||[]).map((t:any, i:number) => (
                        <>
                          <tr key={t.teacher_id+"lit"} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-2 font-medium text-gray-800" rowSpan={2}>{t.teacher_name}</td>
                            <td className="px-3 py-2 text-center"><span className="text-blue-600 font-bold text-xs">📖 Lit</span></td>
                            {ROUNDS.slice(0,6).map(r => {
                              const rd = t.rounds?.[r.value];
                              return (
                                <td key={r.value} className="px-2 py-1.5 text-center">
                                  {rd ? (
                                    <div>
                                      <span className="text-xs capitalize text-gray-700">{rd.lit_stage||rd.stage||"—"}</span>
                                      {rd.lit_promoted && <div className="text-green-600 text-xs font-bold">🎉</div>}
                                    </div>
                                  ) : <span className="text-gray-200">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                          <tr key={t.teacher_id+"num"} className={i%2===0?"bg-white":"bg-gray-50"}>
                            <td className="px-3 py-2 text-center"><span className="text-purple-600 font-bold text-xs">🔢 Num</span></td>
                            {ROUNDS.slice(0,6).map(r => {
                              const rd = t.rounds?.[r.value];
                              return (
                                <td key={r.value} className="px-2 py-1.5 text-center">
                                  {rd ? (
                                    <div>
                                      <span className="text-xs capitalize text-gray-700">{rd.num_stage||rd.stage||"—"}</span>
                                      {rd.num_promoted && <div className="text-purple-600 text-xs font-bold">🎉</div>}
                                    </div>
                                  ) : <span className="text-gray-200">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        </>
                      ))}
                      {(!teacherDashData.teacherStageProgression?.length) && (
                        <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">No stage data yet. Save teacher assessments first.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ALERTS ── */}
          {!dashLoading && dashTab === "alerts" && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-yellow-800 mb-1">⚠️ Consecutive Decline Alert</h3>
                <p className="text-xs text-yellow-600">Students and teachers who scored lower in 3 consecutive assessments — persistent decline needing attention.</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📉 Students with Consecutive Decline ({studentAlerts.length})</h3>
                {studentAlerts.length===0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No students with 3 consecutive declines found 🎉</p>
                ) : (
                  <div className="space-y-3">
                    {studentAlerts.map((s:any,i:number) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-sm font-bold text-red-800">{s.entity_name}</span>
                            <span className="text-xs text-gray-500 ml-2">{s.grade} — {s.section}</span>
                          </div>
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">▼ {s.drop}%</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {(s.scores||[]).map((sc:any,j:number) => (
                            <div key={j} className={`text-center rounded px-2 py-1 text-xs border ${scoreBg(sc.overall)}`}>
                              <p className="font-bold">{sc.overall?.toFixed(1)}%</p>
                              <p className="text-gray-500">{sc.round?.replace("baseline_","R")}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📉 Teachers with Consecutive Decline ({teacherAlerts.length})</h3>
                {teacherAlerts.length===0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No teacher decline alerts 🎉</p>
                ) : (
                  <div className="space-y-3">
                    {teacherAlerts.map((t:any,i:number) => (
                      <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-orange-800">{t.entity_name}</span>
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">▼ {t.drop}%</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {(t.scores||[]).map((sc:any,j:number) => (
                            <div key={j} className={`text-center rounded px-2 py-1 text-xs border ${scoreBg(sc.overall)}`}>
                              <p className="font-bold">{sc.overall?.toFixed(1)}%</p>
                              <p className="text-gray-500">{sc.round?.replace("baseline_","R")}</p>
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
        </div>
      )}

      {/* ── AI PAPER + REPORT CARD — delegated to sub-components ── */}
      {activeTab === "ai_paper" && <AdminAIPaperTab teachers={teachers} academicYear={academicYear} API={API} />}
      {activeTab === "report_card" && <ReportCardTab teachers={teachers} academicYear={academicYear} API={API} />}

    </div>
  );
}
function AdminAIPaperTab({ teachers, academicYear, API }: any) {
  const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
  const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

  const STAGE_GRADE: Record<string, string> = {
    foundation: "Grade 2", preparatory: "Grade 5", middle: "Grade 8", secondary: "Grade 10",
  };
  const LIT_KEYS = ["listening_score","speaking_score","reading_score","writing_score"];
  const NUM_KEYS = ["operations_score","base10_score","measurement_score","geometry_score"];
  const LIT_LABELS = ["Listening","Speaking","Reading","Writing"];
  const NUM_LABELS = ["Operations","Base 10","Measurement","Geometry"];

  const [mode, setMode] = useState<"individual"|"bulk">("individual");
  const [selTeacher, setSelTeacher] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [numQ, setNumQ] = useState(10);
  const [qTypes, setQTypes] = useState(["MCQ","Short Answer","Case-Based"]);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [msg, setMsg] = useState("");
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  useEffect(() => {
    if (selTeacher) fetchTeacherData(selTeacher.id);
  }, [selTeacher, academicYear]);

  useEffect(() => {
    if (teachers.length && !selTeacher) setSelTeacher(teachers[0]);
  }, [teachers]);

  const fetchTeacherData = async (tid: string) => {
    try {
      const r = await axios.get(`${API}/baseline/teacher/${tid}?academic_year=${academicYear}`);
      setTeacherData(r.data);
    } catch { setTeacherData(null); }
  };

  const buildGaps = (assessments: any[]) => {
    const litRounds = assessments.filter((a:any) => a.subject === "literacy");
    const numRounds = assessments.filter((a:any) => a.subject === "numeracy");
    const latestLit = litRounds[litRounds.length - 1];
    const latestNum = numRounds[numRounds.length - 1];
    const gaps: any[] = [];

    if (latestLit) {
      const avg = LIT_KEYS.reduce((s,k) => s + +(latestLit[k]||0), 0) / LIT_KEYS.length;
      LIT_KEYS.forEach((k,i) => {
        const sc = +(latestLit[k]||0);
        if (sc < avg && sc > 0) gaps.push({ domain:"Literacy", sub:LIT_LABELS[i], score:sc, subject:"literacy", stage:latestLit.stage||"foundation" });
      });
    }
    if (latestNum) {
      const avg = NUM_KEYS.reduce((s,k) => s + +(latestNum[k]||0), 0) / NUM_KEYS.length;
      NUM_KEYS.forEach((k,i) => {
        const sc = +(latestNum[k]||0);
        if (sc < avg && sc > 0) gaps.push({ domain:"Numeracy", sub:NUM_LABELS[i], score:sc, subject:"numeracy", stage:latestNum.stage||"foundation" });
      });
    }
    return gaps;
  };

  const fetchCompsForGaps = async (gaps: any[]) => {
    return await Promise.all(gaps.map(async (g: any) => {
      const grade = STAGE_GRADE[g.stage] || "Grade 2";
      try {
        const r = await axios.get(`${API}/activities/competencies?subject=${g.subject}&stage=${g.stage}&grade=${encodeURIComponent(grade)}`);
        const all = r.data?.data || r.data || [];
        const comps = all.filter((c:any) => (c.domain||"").toLowerCase().includes(g.sub.toLowerCase())).slice(0,5);
        return { ...g, grade, competencies: comps };
      } catch { return { ...g, grade, competencies:[] }; }
    }));
  };

  const buildPrompt = (teacher: any, assessments: any[], gaps: any[], gapWithComps: any[]) => {
    const litRounds = assessments.filter((a:any) => a.subject === "literacy");
    const numRounds = assessments.filter((a:any) => a.subject === "numeracy");
    const latestLit = litRounds[litRounds.length-1];
    const latestNum = numRounds[numRounds.length-1];
    const litAvg = latestLit ? LIT_KEYS.reduce((s,k)=>s + Number(latestLit[k]||0),0)/LIT_KEYS.length : null;
    const numAvg = latestNum ? NUM_KEYS.reduce((s,k)=>s + Number(latestNum[k]||0),0)/NUM_KEYS.length : null;
    const overall = litAvg!==null&&numAvg!==null?(litAvg+numAvg)/2:litAvg??numAvg??0;

    const compBlock = gapWithComps.map((g:any) => {
      const lines = g.competencies.length
        ? g.competencies.map((c:any) => `  - [${c.competency_code}]: ${c.description||c.desc||""}`).join("\n")
        : "  - General competencies";
      return `DOMAIN: ${g.domain} – ${g.sub} | Stage: ${g.stage} | Grade: ${g.grade} | Score: ${g.score.toFixed(0)}%\nCompetencies:\n${lines}`;
    }).join("\n\n");

    return `You are an expert educational assessor for teacher professional development in India.

Generate an ASSESSMENT PAPER for teacher ${teacher.name}.

TEACHER PROFILE:
Name: ${teacher.name}
Overall: ${overall.toFixed(1)}%
Literacy Stage: ${latestLit?.stage||"—"} (Grade: ${STAGE_GRADE[latestLit?.stage||"foundation"]||"—"})
Numeracy Stage: ${latestNum?.stage||"—"} (Grade: ${STAGE_GRADE[latestNum?.stage||"foundation"]||"—"})
Rounds Completed: ${assessments.length}

GAP AREAS:
${gaps.map(g=>`- ${g.domain} – ${g.sub}: ${g.score.toFixed(0)}%`).join("\n") || "No specific gaps — general assessment"}

COMPETENCY FRAMEWORK:
${compBlock || "General teacher competencies"}

Generate exactly ${numQ} questions (${qTypes.join(", ")}).
- Tag every question with competency code [CODE]
- Mix: easy (recall), medium (application), hard (analysis/evaluation)
- MCQ: 4 options A/B/C/D, mark correct with ✓, include brief reason
- Short Answer: model answer 2–3 sentences
- Case-Based: 4–5 line classroom scenario + question + model answer

FORMAT:
══════════════════════════════════════
ASSESSMENT PAPER — ${teacher.name}
Gaps: ${gaps.map(g=>`${g.domain}–${g.sub}`).join(", ")||"General"}
Generated: ${new Date().toLocaleDateString()}
══════════════════════════════════════

[Questions 1 to ${numQ}]

ANSWER KEY:
[Numbered answers]`;
  };

  const generateIndividual = async () => {
    if (!selTeacher) { setMsg("Select a teacher first"); return; }
    const assessments = teacherData?.assessments || [];
    if (!assessments.length) { setMsg("No baseline data for this teacher in " + academicYear); return; }

    setGenerating(true); setOutput(""); setMsg("");
    const gaps = buildGaps(assessments);
    const gapWithComps = await fetchCompsForGaps(gaps);
    const prompt = buildPrompt(selTeacher, assessments, gaps, gapWithComps);

    try {
      const res = await fetch(GROQ_API, {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_KEY}`},
        body: JSON.stringify({ model:"llama-3.3-70b-versatile", messages:[{role:"user",content:prompt}], max_tokens:3000 }),
      });
      const d = await res.json();
      setOutput(d.choices?.[0]?.message?.content || "No response");
    } catch { setMsg("❌ AI generation failed"); }
    setGenerating(false);
  };

  const generateBulk = async () => {
    setBulkGenerating(true); setBulkResults([]);
    const results: any[] = [];
    for (const teacher of teachers) {
      try {
        const r = await axios.get(`${API}/baseline/teacher/${teacher.id}?academic_year=${academicYear}`);
        const assessments = r.data?.assessments || [];
        if (!assessments.length) { results.push({ name:teacher.name, status:"No data", output:"" }); continue; }
        const gaps = buildGaps(assessments);
        const gapWithComps = await fetchCompsForGaps(gaps);
        const prompt = buildPrompt(teacher, assessments, gaps, gapWithComps);
        const res = await fetch(GROQ_API, {
          method:"POST",
          headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_KEY}`},
          body: JSON.stringify({ model:"llama-3.3-70b-versatile", messages:[{role:"user",content:prompt}], max_tokens:2000 }),
        });
        const d = await res.json();
        const paper = d.choices?.[0]?.message?.content || "";
        results.push({ name:teacher.name, status:"Done", output:paper });
      } catch { results.push({ name:teacher.name, status:"Error", output:"" }); }
    }
    setBulkResults(results);
    setBulkGenerating(false);
  };

  const downloadTxt = (text: string, filename: string) => {
    const b = new Blob([text], { type:"text/plain" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u; a.download = filename; a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-800 mb-1">🤖 AI Assessment Paper Generator</h3>
        <p className="text-xs text-indigo-600">Generate competency-mapped assessment papers for teachers based on their gap analysis.</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        {[{id:"individual",label:"👤 Individual"},{id:"bulk",label:"📦 Bulk (All Teachers)"}].map(m => (
          <button key={m.id} onClick={() => setMode(m.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium border ${mode===m.id?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "individual" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Select Teacher</label>
                <select value={selTeacher?.id||""} onChange={e => setSelTeacher(teachers.find((t:any)=>t.id===e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                  {teachers.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Number of Questions</label>
                <select value={numQ} onChange={e=>setNumQ(+e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                  {[5,10,15,20].map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Question Types</label>
              <div className="flex flex-wrap gap-2">
                {["MCQ","Short Answer","Long Answer","True/False","Fill-in-Blank","Case-Based"].map(qt => (
                  <button key={qt} onClick={()=>setQTypes(prev=>prev.includes(qt)?prev.filter(x=>x!==qt):[...prev,qt])}
                    className={`px-3 py-1 rounded-full text-xs border font-medium ${qTypes.includes(qt)?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300"}`}>
                    {qt}
                  </button>
                ))}
              </div>
            </div>

            {/* Teacher summary */}
            {teacherData?.assessments?.length ? (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Teacher Summary — {selTeacher?.name}</p>
                <div className="flex flex-wrap gap-2">
                  {buildGaps(teacherData.assessments).map((g:any,i:number)=>(
                    <span key={i} className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">⚠️ {g.domain}–{g.sub} ({g.score.toFixed(0)}%)</span>
                  ))}
                  {buildGaps(teacherData.assessments).length===0 && <span className="text-xs text-green-700">✅ No gaps found</span>}
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-600 bg-amber-50 rounded p-2">⚠️ No baseline data for {selTeacher?.name} in {academicYear}</div>
            )}
          </div>

          {msg && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">{msg}</p>}

          <button onClick={generateIndividual} disabled={generating||!GROQ_KEY}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
            {generating ? "⏳ Generating..." : `🎯 Generate Assessment Paper (${numQ} questions)`}
          </button>
          {!GROQ_KEY && <p className="text-xs text-amber-600 text-center">⚠️ VITE_GROQ_API_KEY not set in .env</p>}

          {output && (
            <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-gray-800">Assessment Paper — {selTeacher?.name}</h4>
                <button onClick={()=>downloadTxt(output,`AssessmentPaper_${selTeacher?.name?.replace(/\s+/g,"_")}_${new Date().toISOString().split("T")[0]}.txt`)}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">📥 Download</button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto border border-gray-200">
                {output}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "bulk" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600 mb-3">Generate assessment papers for all <strong>{teachers.length}</strong> teachers with baseline data in {academicYear}.</p>
            <div className="flex gap-3 items-center">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Questions per teacher</label>
                <select value={numQ} onChange={e=>setNumQ(+e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {[5,10,15].map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              <button onClick={generateBulk} disabled={bulkGenerating||!GROQ_KEY}
                className="mt-4 px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50">
                {bulkGenerating ? "⏳ Generating..." : `📦 Generate All (${teachers.length} teachers)`}
              </button>
            </div>
          </div>

          {bulkResults.length > 0 && (
            <div className="space-y-3">
              {bulkResults.map((r:any, i:number) => (
                <div key={i} className="bg-white rounded-xl shadow border border-gray-200 p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-bold text-gray-800">{r.name}</span>
                      <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${r.status==="Done"?"bg-green-100 text-green-800":r.status==="Error"?"bg-red-100 text-red-800":"bg-gray-100 text-gray-500"}`}>{r.status}</span>
                    </div>
                    {r.output && (
                      <button onClick={()=>downloadTxt(r.output,`AssessmentPaper_${r.name.replace(/\s+/g,"_")}.txt`)}
                        className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">📥 Download</button>
                    )}
                  </div>
                  {r.output && (
                    <div className="mt-3 bg-gray-50 rounded p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto border border-gray-200">
                      {r.output.slice(0,500)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// REPORT CARD TAB — Teacher Marks Card download
// ─────────────────────────────────────────────────────────────────
function ReportCardTab({ teachers, academicYear, API }: any) {
  const STAGE_LABELS: Record<string,string> = { foundation:"Foundation", preparatory:"Preparatory", middle:"Middle", secondary:"Secondary" };
  const STAGE_GRADE: Record<string,string> = { foundation:"Grade 2", preparatory:"Grade 5", middle:"Grade 8", secondary:"Grade 10" };
  const STAGE_ORDER = ["foundation","preparatory","middle","secondary"];
  const LIT_KEYS = ["listening_score","speaking_score","reading_score","writing_score"];
  const NUM_KEYS = ["operations_score","base10_score","measurement_score","geometry_score"];
  const LIT_LABELS = ["Listening","Speaking","Reading","Writing"];
  const NUM_LABELS = ["Operations","Base 10","Measurement","Geometry"];

  const [selTeacher, setSelTeacher] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cardMode, setCardMode] = useState<"full"|"single">("full");
  const [selRound, setSelRound] = useState("");

  useEffect(() => { if (teachers.length && !selTeacher) setSelTeacher(teachers[0]); }, [teachers]);
  useEffect(() => { if (selTeacher) fetchData(selTeacher.id); }, [selTeacher, academicYear]);

  const fetchData = async (tid: string) => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/baseline/teacher/${tid}?academic_year=${academicYear}`);
      setTeacherData(r.data);
      const rounds = r.data?.assessments || [];
      if (rounds.length) setSelRound(rounds[rounds.length-1].round);
    } catch { setTeacherData(null); }
    setLoading(false);
  };

  const getLevel = (score: number) => {
    if (score >= 80) return "Level 4 — Exceeds Expectations";
    if (score >= 60) return "Level 3 — Meets Expectations";
    if (score >= 40) return "Level 2 — Approaching Expectations";
    return "Level 1 — Below Expectations";
  };

  const buildHtmlCard = (teacher: any, assessments: any[], roundFilter?: string) => {
    const litRounds = assessments.filter((a:any) => a.subject==="literacy").sort((a:any,b:any)=>a.round>b.round?1:-1);
    const numRounds = assessments.filter((a:any) => a.subject==="numeracy").sort((a:any,b:any)=>a.round>b.round?1:-1);
    const latestLit = litRounds[litRounds.length-1];
    const latestNum = numRounds[numRounds.length-1];
    const litAvg = latestLit ? LIT_KEYS.reduce((s,k)=>s + Number(latestLit[k]||0),0)/LIT_KEYS.length : null;
    const numAvg = latestNum ? NUM_KEYS.reduce((s,k)=>s + Number(latestNum[k]||0),0)/NUM_KEYS.length : null;
    const overall = litAvg!==null&&numAvg!==null?(litAvg+numAvg)/2:litAvg??numAvg??0;

    const filtered = roundFilter ? assessments.filter((a:any)=>a.round===roundFilter) : assessments;
    const groupedBySubj: Record<string,any[]> = {};
    filtered.forEach((a:any) => {
      if (!groupedBySubj[a.subject]) groupedBySubj[a.subject] = [];
      groupedBySubj[a.subject].push(a);
    });

    const subjSections = Object.entries(groupedBySubj).map(([subj, rounds]) => {
      const isLit = subj === "literacy";
      const domains = isLit ? LIT_KEYS : NUM_KEYS;
      const labels = isLit ? LIT_LABELS : NUM_LABELS;

      // Group by stage
      const stageGroups: Record<string,any[]> = {};
      (rounds as any[]).forEach(r => {
        const s = r.stage || "foundation";
        if (!stageGroups[s]) stageGroups[s] = [];
        stageGroups[s].push(r);
      });

      const stageHtml = STAGE_ORDER.filter(s => stageGroups[s]).map(stage => {
        const stageRounds = stageGroups[stage];
        const roundRows = stageRounds.map((r:any, i:number) => {
          const avg = domains.reduce((s,k)=>s + Number(r[k]||0),0)/domains.length;
          const domainRows = labels.map((l,j) => {
            const val = +(r[domains[j]]||0);
            const color = val>=80?"#16a34a":val>=60?"#2563eb":val>=40?"#d97706":"#dc2626";
            return `<tr><td style="padding:5px 10px;border:1px solid #e5e7eb">${l}</td>
              <td style="padding:5px 10px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;color:${color}">${val>0?val.toFixed(1)+"%":"—"}</td>
              <td style="padding:5px 10px;border:1px solid #e5e7eb;font-size:11px;color:#6b7280">${val>0?getLevel(val).split("—")[0].trim():"—"}</td>
            </tr>`;
          }).join("");
          const promoted = r.promoted;
          const promotionBanner = promoted ? `<div style="background:#dcfce7;border:1px solid #16a34a;border-radius:6px;padding:8px 12px;margin:8px 0;color:#15803d;font-weight:bold">
            🎉 STAGE PROMOTION — Promoted to ${r.promoted_to_stage} Stage (${STAGE_GRADE[r.promoted_to_stage?.toLowerCase()||"foundation"]})
          </div>` : "";
          return `<div style="margin-bottom:12px">
            <h4 style="margin:8px 0;color:#374151;font-size:13px">Round ${r.round?.replace("baseline_","R")} &nbsp;·&nbsp; ${r.assessment_date||""}</h4>
            ${promotionBanner}
            <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px">
              <thead><tr style="background:#4338ca;color:white">
                <th style="padding:5px 10px;text-align:left">Domain</th>
                <th style="padding:5px 10px;text-align:center">Score</th>
                <th style="padding:5px 10px;text-align:left">Level</th>
              </tr></thead>
              <tbody>${domainRows}</tbody>
            </table>
            <p style="margin:4px 0;font-size:12px;font-weight:bold;color:#374151">
              ${isLit?"Literacy":"Numeracy"} Average: ${avg>0?avg.toFixed(1)+"%":"—"} &nbsp;|&nbsp; ${avg>0?getLevel(avg):""}
            </p>
          </div>`;
        }).join("");

        return `<div style="margin-bottom:16px">
          <h3 style="background:#e0e7ff;color:#3730a3;padding:6px 12px;border-radius:4px;font-size:13px;margin:8px 0">
            ${STAGE_LABELS[stage]} Stage &nbsp;·&nbsp; Assessed on ${STAGE_GRADE[stage]} Competencies
          </h3>
          ${stageRounds.some((r:any)=>r.promoted)?`<p style="color:#16a34a;font-size:11px;font-style:italic">✓ Cleared this stage</p>`:""}
          ${stageRounds.every((r:any)=>r.stage===STAGE_ORDER[STAGE_ORDER.indexOf(stage)])&&!stageRounds.some((r:any)=>r.promoted)?`<p style="color:#6b7280;font-size:11px;font-style:italic">Current stage</p>`:""}
          ${roundRows}
        </div>`;
      }).join("");

      return `<div style="margin-bottom:24px">
        <h2 style="background:${isLit?"#1d4ed8":"#7c3aed"};color:white;padding:8px 16px;border-radius:6px;font-size:14px">
          ${isLit?"📖 Literacy":"🔢 Numeracy"}
        </h2>
        ${stageHtml}
      </div>`;
    }).join("");

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Teacher Marks Card — ${teacher.name}</title>
    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#111;padding:0 20px}
    h1{color:#4338ca;border-bottom:2px solid #4338ca;padding-bottom:8px}
    .meta{color:#6b7280;font-size:13px;margin-bottom:24px}
    .summary{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}
    .kpi{flex:1;min-width:120px;background:#f5f3ff;border-left:4px solid #6366f1;padding:12px 16px;border-radius:8px}
    .kpi .val{font-size:22px;font-weight:bold;color:#4338ca}
    .kpi .lbl{font-size:11px;color:#6b7280;margin-top:2px}
    .footer{margin-top:40px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}
    </style></head><body>
    <h1>Teacher Competency Marks Card</h1>
    <div class="meta">
      <strong>${teacher.name}</strong> &nbsp;·&nbsp;
      Academic Year: ${academicYear} &nbsp;·&nbsp;
      Generated: ${new Date().toLocaleDateString("en-IN")}
      ${roundFilter ? ` &nbsp;·&nbsp; Round: ${roundFilter.replace("baseline_","R")}` : " &nbsp;·&nbsp; All Rounds"}
    </div>
    <div class="summary">
      <div class="kpi"><div class="val">${overall>0?overall.toFixed(1)+"%":"—"}</div><div class="lbl">Overall</div></div>
      <div class="kpi"><div class="val">${litAvg!==null?litAvg.toFixed(1)+"%":"—"}</div><div class="lbl">Literacy Avg</div></div>
      <div class="kpi"><div class="val">${numAvg!==null?numAvg.toFixed(1)+"%":"—"}</div><div class="lbl">Numeracy Avg</div></div>
      <div class="kpi"><div class="val">${assessments.length}</div><div class="lbl">Total Rounds</div></div>
    </div>
    <div>
      <h2 style="font-size:14px;color:#374151;margin-bottom:8px">Current Stage</h2>
      ${latestLit?`<p style="font-size:12px">📖 Literacy: <strong>${STAGE_LABELS[latestLit.stage]||latestLit.stage}</strong> — Assessed on <strong>${STAGE_GRADE[latestLit.stage]||"Grade 2"}</strong> competencies</p>`:""}
      ${latestNum?`<p style="font-size:12px">🔢 Numeracy: <strong>${STAGE_LABELS[latestNum.stage]||latestNum.stage}</strong> — Assessed on <strong>${STAGE_GRADE[latestNum.stage]||"Grade 2"}</strong> competencies</p>`:""}
    </div>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb">
    ${subjSections}
    <div class="footer">Generated by CBAS — Wisdom Techno School</div>
    </body></html>`;
  };

  const downloadHtml = (html: string, filename: string) => {
    const b = new Blob([html], { type:"text/html" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u; a.download = filename; a.click();
    URL.revokeObjectURL(u);
  };

  const assessments = teacherData?.assessments || [];
  const rounds = [...new Set(assessments.map((a:any)=>a.round))];
  const scoreBadge = (v:number) => v>=80?"bg-green-100 text-green-800":v>=60?"bg-blue-100 text-blue-800":v>=40?"bg-yellow-100 text-yellow-800":v>0?"bg-red-100 text-red-800":"bg-gray-100 text-gray-400";

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-green-800 mb-1">📄 Teacher Marks Card</h3>
        <p className="text-xs text-green-600">Download teacher competency report cards as HTML (printable). Includes stage journey, promotion events, per-round scores.</p>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Select Teacher</label>
            <select value={selTeacher?.id||""} onChange={e=>setSelTeacher(teachers.find((t:any)=>t.id===e.target.value))}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
              {teachers.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Card Type</label>
            <div className="flex gap-2">
              {[{id:"full",label:"📋 All Rounds"},{id:"single",label:"📄 Single Round"}].map(m=>(
                <button key={m.id} onClick={()=>setCardMode(m.id as any)}
                  className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${cardMode===m.id?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {cardMode === "single" && rounds.length > 0 && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Select Round</label>
            <select value={selRound} onChange={e=>setSelRound(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full sm:w-auto">
              {rounds.map((r:any)=><option key={r} value={r}>{r.replace("baseline_","Round ")}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">Loading...</div>
      ) : !assessments.length ? (
        <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">No baseline data for {selTeacher?.name} in {academicYear}</div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 space-y-4">
          {/* Preview summary */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3">Preview — {selTeacher?.name}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" style={{minWidth:"500px"}}>
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
                  {assessments.map((a:any,i:number)=>{
                    const keys = a.subject==="literacy"?LIT_KEYS:NUM_KEYS;
                    const avg = keys.reduce((s:number,k:string)=>s + Number(a[k]||0),0)/keys.length;
                    return (
                      <tr key={i} className={`border-b border-gray-100 ${i%2===0?"bg-white":"bg-gray-50"}`}>
                        <td className="px-3 py-2 font-medium">{a.round?.replace("baseline_","R")}</td>
                        <td className="px-3 py-2 text-center">{a.subject==="literacy"?"📖":"🔢"} {a.subject}</td>
                        <td className="px-3 py-2 text-center capitalize">{STAGE_LABELS[a.stage]||a.stage}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{a.assessment_date||"—"}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold ${scoreBadge(avg)}`}>{avg>0?avg.toFixed(1)+"%":"—"}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {a.promoted?<span className="text-green-700 font-bold">🎉 → {a.promoted_to_stage}</span>:<span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Download buttons */}
          <div className="flex gap-3 flex-wrap pt-2 border-t border-gray-100">
            {cardMode === "full" ? (
              <button onClick={()=>downloadHtml(buildHtmlCard(selTeacher, assessments), `MarksCard_${selTeacher?.name?.replace(/\s+/g,"_")}_Full_${academicYear}.html`)}
                className="px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700">
                📥 Download Full Card (All Rounds)
              </button>
            ) : (
              <button onClick={()=>downloadHtml(buildHtmlCard(selTeacher, assessments, selRound), `MarksCard_${selTeacher?.name?.replace(/\s+/g,"_")}_${selRound}.html`)}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700">
                📥 Download {selRound?.replace("baseline_","Round ")} Card
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
