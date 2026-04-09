import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts";

const API = "https://cbas-backend-production.up.railway.app";

const generateAcademicYears = () => {
  const years = [];
  for (let i = 2025; i <= 2035; i++) {
    years.push(`${i}-${String(i + 1).slice(2)}`);
  }
  return years;
};
const ACADEMIC_YEARS = generateAcademicYears();

const ROUNDS = [
  { value: "baseline_1", label: "Baseline 1" },
  { value: "baseline_2", label: "Baseline 2" },
  { value: "baseline_3", label: "Baseline 3" },
  { value: "midline", label: "Midline" },
  { value: "endline", label: "Endline" },
];

const GRADES = [
  "Pre-KG", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
];

const STAGES = [
  { value: "foundation", label: "Foundation (Pre-KG to Grade 2)" },
  { value: "preparatory", label: "Preparatory (Grade 3-5)" },
  { value: "middle", label: "Middle (Grade 6-8)" },
  { value: "secondary", label: "Secondary (Grade 9-10)" },
];

const levelBg = (level: string) => {
  if (level?.includes("4")) return "bg-green-100 text-green-800";
  if (level?.includes("3")) return "bg-blue-100 text-blue-800";
  if (level?.includes("2")) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

const scoreBg = (s: number) =>
  s >= 80 ? "bg-green-100 text-green-800" :
  s >= 60 ? "bg-blue-100 text-blue-800" :
  s >= 40 ? "bg-yellow-100 text-yellow-800" :
  s > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-400";

// ── Stage → highest grade mapping ──────────────────────────────
const STAGE_HIGHEST_GRADE: Record<string, string> = {
  foundation: "Grade 2",
  preparatory: "Grade 5",
  middle: "Grade 8",
  secondary: "Grade 10",
};

const STAGE_LABELS: Record<string, string> = {
  foundation: "Foundation (Pre-KG–G2)",
  preparatory: "Preparatory (G3–G5)",
  middle: "Middle (G6–G8)",
  secondary: "Secondary (G9–G10)",
};

const PROMOTION_THRESHOLD = 80;

function calcSubjectAvg(scores: Record<string, string>, domains: string[]): number {
  const vals = domains.map(d => parseFloat(scores[d] || "0")).filter(v => !isNaN(v) && v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function TeacherBaselineEntry({ teachers, academicYear, assessmentDate, setAssessmentDate, API }: any) {
  const LITERACY_DOMAINS = ["listening", "speaking", "reading", "writing"];
  const NUMERACY_DOMAINS = ["operations", "base10", "measurement", "geometry"];
  const ROUNDS = [
    { value: "baseline_1", label: "Round 1" },
    { value: "baseline_2", label: "Round 2" },
    { value: "baseline_3", label: "Round 3" },
    { value: "baseline_4", label: "Round 4" },
    { value: "baseline_5", label: "Round 5" },
  ];

  const [round, setRound] = useState("baseline_1");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  // Per teacher: { [teacher_id]: { lit_stage, num_stage, subjects, scores: {listening,speaking,...} } }
  const [entries, setEntries] = useState<Record<string, any>>({});
  // Existing rounds per teacher loaded from DB
  const [existingRounds, setExistingRounds] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadExistingRounds(); }, [round, academicYear]);

  const loadExistingRounds = async () => {
    setLoading(true);
    const result: Record<string, any[]> = {};
    await Promise.all(teachers.map(async (t: any) => {
      try {
        const r = await axios.get(`${API}/baseline/teacher/${t.id}?academic_year=${academicYear}`);
        result[t.id] = r.data?.assessments || [];
        // Pre-fill current round data if exists
        const roundData = result[t.id].filter((a: any) => a.round === round);
        if (roundData.length) {
          // Round exists — prefill with its data
          const lit = roundData.find((a: any) => a.subject === "literacy");
          const num = roundData.find((a: any) => a.subject === "numeracy");
          setEntries(prev => ({
            ...prev,
            [t.id]: {
              subjects: lit && num ? "both" : lit ? "literacy" : "numeracy",
              lit_stage: lit?.stage || "foundation",
              num_stage: num?.stage || "foundation",
              scores: {
                listening: lit?.listening_score?.toString() || "",
                speaking: lit?.speaking_score?.toString() || "",
                reading: lit?.reading_score?.toString() || "",
                writing: lit?.writing_score?.toString() || "",
                operations: num?.operations_score?.toString() || "",
                base10: num?.base10_score?.toString() || "",
                measurement: num?.measurement_score?.toString() || "",
                geometry: num?.geometry_score?.toString() || "",
              }
            }
          }));
        } else {
          // New round — check if previous round had a promotion, auto-advance stage
          const allRounds = result[t.id];
          const stageOrder = ["foundation","preparatory","middle","secondary"];

          // Find the latest lit/num stages from all previous rounds
          const prevLit = [...allRounds].filter((a:any) => a.subject==="literacy").sort((a:any,b:any) => a.round > b.round ? -1 : 1)[0];
          const prevNum = [...allRounds].filter((a:any) => a.subject==="numeracy").sort((a:any,b:any) => a.round > b.round ? -1 : 1)[0];

          // If promoted in last round, use promoted_to_stage; otherwise keep current stage
          const litStage = prevLit?.promoted && prevLit?.promoted_to_stage
            ? prevLit.promoted_to_stage
            : prevLit?.stage || "foundation";
          const numStage = prevNum?.promoted && prevNum?.promoted_to_stage
            ? prevNum.promoted_to_stage
            : prevNum?.stage || "foundation";

          const subjects = prevLit && prevNum ? "both" : prevLit ? "literacy" : prevNum ? "numeracy" : "both";

          if (allRounds.length > 0) {
            setEntries(prev => ({
              ...prev,
              [t.id]: {
                subjects,
                lit_stage: litStage,
                num_stage: numStage,
                scores: {}  // blank scores for new round
              }
            }));
          }
        }
      } catch { result[t.id] = []; }
    }));
    setExistingRounds(result);
    setLoading(false);
  };

  const updateEntry = (tid: string, field: string, value: string) => {
    setEntries(prev => ({
      ...prev,
      [tid]: { ...(prev[tid] || { subjects: "both", lit_stage: "foundation", num_stage: "foundation", scores: {} }), [field]: value }
    }));
  };

  const updateScore = (tid: string, field: string, value: string) => {
    setEntries(prev => ({
      ...prev,
      [tid]: {
        ...(prev[tid] || { subjects: "both", lit_stage: "foundation", num_stage: "foundation", scores: {} }),
        scores: { ...(prev[tid]?.scores || {}), [field]: value }
      }
    }));
  };

  const getEntry = (tid: string) => entries[tid] || { subjects: "both", lit_stage: "foundation", num_stage: "foundation", scores: {} };

  const saveAll = async () => {
    setSaving(true);
    let saved = 0;
    try {
      for (const teacher of teachers) {
        const entry = getEntry(teacher.id);
        const sc = entry.scores || {};
        const subjects = entry.subjects || "both";

        // Check if literacy should be saved
        const doLit = subjects === "literacy" || subjects === "both";
        const doNum = subjects === "numeracy" || subjects === "both";

        const litScores = LITERACY_DOMAINS.map(d => parseFloat(sc[d] || "0")).filter(v => v > 0);
        const numScores = NUMERACY_DOMAINS.map(d => parseFloat(sc[d] || "0")).filter(v => v > 0);

        if (doLit && litScores.length > 0) {
          const litAvg = litScores.reduce((a, b) => a + b, 0) / LITERACY_DOMAINS.length;
          const promoted = litAvg >= PROMOTION_THRESHOLD;
          const stageOrder = ["foundation", "preparatory", "middle", "secondary"];
          const currentIdx = stageOrder.indexOf(entry.lit_stage || "foundation");
          const promotedTo = promoted && currentIdx < 3 ? stageOrder[currentIdx + 1] : null;

          await axios.post(`${API}/baseline/teacher`, {
            teacher_id: teacher.id, teacher_name: teacher.name,
            academic_year: academicYear, round, subject: "literacy",
            stage: entry.lit_stage || "foundation",
            assessment_date: assessmentDate,
            listening_score: parseFloat(sc.listening) || undefined,
            speaking_score: parseFloat(sc.speaking) || undefined,
            reading_score: parseFloat(sc.reading) || undefined,
            writing_score: parseFloat(sc.writing) || undefined,
            promoted, promoted_to_stage: promotedTo,
          });
          saved++;
        }

        if (doNum && numScores.length > 0) {
          const numAvg = numScores.reduce((a, b) => a + b, 0) / NUMERACY_DOMAINS.length;
          const promoted = numAvg >= PROMOTION_THRESHOLD;
          const stageOrder = ["foundation", "preparatory", "middle", "secondary"];
          const currentIdx = stageOrder.indexOf(entry.num_stage || "foundation");
          const promotedTo = promoted && currentIdx < 3 ? stageOrder[currentIdx + 1] : null;

          await axios.post(`${API}/baseline/teacher`, {
            teacher_id: teacher.id, teacher_name: teacher.name,
            academic_year: academicYear, round, subject: "numeracy",
            stage: entry.num_stage || "foundation",
            assessment_date: assessmentDate,
            operations_score: parseFloat(sc.operations) || undefined,
            base10_score: parseFloat(sc.base10) || undefined,
            measurement_score: parseFloat(sc.measurement) || undefined,
            geometry_score: parseFloat(sc.geometry) || undefined,
            promoted, promoted_to_stage: promotedTo,
          });
          saved++;
        }
      }
      setMessage(`✅ Saved ${saved} records`);
      loadExistingRounds();
    } catch { setMessage("❌ Error saving"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 4000);
  };

  const scoreBgInput = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n) || val === "") return "border-gray-300";
    if (n >= 80) return "border-green-400 bg-green-50";
    if (n >= 60) return "border-blue-400 bg-blue-50";
    if (n >= 40) return "border-yellow-400 bg-yellow-50";
    return "border-red-400 bg-red-50";
  };

  const getTeacherRoundSummary = (tid: string) => {
    const rounds = existingRounds[tid] || [];
    return ROUNDS.map(r => {
      const lit = rounds.find((a: any) => a.round === r.value && a.subject === "literacy");
      const num = rounds.find((a: any) => a.round === r.value && a.subject === "numeracy");
      return { round: r.value, label: r.label, lit, num, hasData: !!(lit || num) };
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-4 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Round</label>
          <div className="flex gap-1 flex-wrap">
            {ROUNDS.map(r => (
              <button key={r.value} onClick={() => setRound(r.value)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium border ${round === r.value ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50"}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Assessment Date</label>
          <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </div>
        <button onClick={saveAll} disabled={saving}
          className="ml-auto px-6 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold">
          {saving ? "Saving..." : "💾 Save All"}
        </button>
      </div>

      {message && <div className={`px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{message}</div>}

      {loading && <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">Loading...</div>}

      {/* Teacher entry table */}
      {!loading && teachers.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-700">Teacher Baseline Entry — Round {round.split("_")[1]} — {academicYear}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{teachers.length} teachers · Scores out of 100 · Auto-promotes at {PROMOTION_THRESHOLD}%</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: "1200px" }}>
              <thead>
                <tr className="bg-indigo-700 text-white">
                  <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 z-20 min-w-[180px]">Teacher</th>
                  <th className="px-2 py-2 text-center min-w-[120px]">Subjects Taking</th>
                  <th className="px-2 py-2 text-center border-l border-indigo-500 bg-blue-700 min-w-[110px]">📖 Lit Stage</th>
                  <th className="px-2 py-2 text-center border-l border-indigo-500 bg-blue-700 min-w-[70px]">Listen</th>
                  <th className="px-2 py-2 text-center bg-blue-700 min-w-[70px]">Speak</th>
                  <th className="px-2 py-2 text-center bg-blue-700 min-w-[70px]">Read</th>
                  <th className="px-2 py-2 text-center bg-blue-700 min-w-[70px]">Write</th>
                  <th className="px-2 py-2 text-center bg-blue-700 min-w-[65px]">Lit Avg</th>
                  <th className="px-2 py-2 text-center border-l border-indigo-500 bg-purple-700 min-w-[110px]">🔢 Num Stage</th>
                  <th className="px-2 py-2 text-center bg-purple-700 min-w-[70px]">Ops</th>
                  <th className="px-2 py-2 text-center bg-purple-700 min-w-[70px]">Base10</th>
                  <th className="px-2 py-2 text-center bg-purple-700 min-w-[70px]">Measure</th>
                  <th className="px-2 py-2 text-center bg-purple-700 min-w-[70px]">Geom</th>
                  <th className="px-2 py-2 text-center bg-purple-700 min-w-[65px]">Num Avg</th>
                  <th className="px-2 py-2 text-center border-l border-indigo-500 min-w-[80px]">Overall</th>
                  <th className="px-2 py-2 text-center min-w-[90px]">Rounds Done</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher: any, idx: number) => {
                  const entry = getEntry(teacher.id);
                  const sc = entry.scores || {};
                  const subjects = entry.subjects || "both";
                  const doLit = subjects === "literacy" || subjects === "both";
                  const doNum = subjects === "numeracy" || subjects === "both";

                  const litAvg = doLit ? calcSubjectAvg(sc, LITERACY_DOMAINS) : null;
                  const numAvg = doNum ? calcSubjectAvg(sc, NUMERACY_DOMAINS) : null;
                  const overall = litAvg !== null && numAvg !== null ? (litAvg + numAvg) / 2
                    : litAvg ?? numAvg ?? 0;

                  const litPromoted = litAvg !== null && litAvg >= PROMOTION_THRESHOLD;
                  const numPromoted = numAvg !== null && numAvg >= PROMOTION_THRESHOLD;

                  const roundSummary = getTeacherRoundSummary(teacher.id);
                  const doneRounds = roundSummary.filter(r => r.hasData).length;

                  // Check if teacher was promoted in any previous round
                  const allAssessments = existingRounds[teacher.id] || [];
                  const litPromotion = allAssessments.find((a:any) => a.subject==="literacy" && a.promoted);
                  const numPromotion = allAssessments.find((a:any) => a.subject==="numeracy" && a.promoted);

                  const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";

                  const ScoreCell = ({ field }: { field: string }) => (
                    <td className="px-1 py-1 text-center">
                      <input type="number" min={0} max={100} step={0.5} value={sc[field] || ""}
                        onChange={e => updateScore(teacher.id, field, e.target.value)}
                        placeholder="—"
                        className={`w-14 text-center text-xs border rounded px-1 py-0.5 ${scoreBgInput(sc[field] || "")}`} />
                    </td>
                  );

                  return (
                    <tr key={teacher.id} className={`border-b border-gray-100 ${bg}`}>
                      {/* Teacher name */}
                      <td className={`px-3 py-2 font-medium text-gray-800 sticky left-0 z-10 border-r border-gray-200 ${bg}`}>
                        <div className="flex flex-col gap-0.5">
                          <span>{teacher.name}</span>
                          <div className="flex gap-1 flex-wrap">
                            {litPromotion && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                                📖 → {litPromotion.promoted_to_stage}
                              </span>
                            )}
                            {numPromotion && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">
                                🔢 → {numPromotion.promoted_to_stage}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subjects */}
                      <td className="px-1 py-1 text-center">
                        <select value={subjects} onChange={e => updateEntry(teacher.id, "subjects", e.target.value)}
                          className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full">
                          <option value="literacy">Literacy only</option>
                          <option value="numeracy">Numeracy only</option>
                          <option value="both">Both</option>
                        </select>
                      </td>

                      {/* Literacy stage */}
                      <td className="px-1 py-1 text-center border-l border-gray-200">
                        {doLit ? (
                          <select value={entry.lit_stage || "foundation"}
                            onChange={e => updateEntry(teacher.id, "lit_stage", e.target.value)}
                            className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full">
                            {Object.entries(STAGE_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l.split(" ")[0]}</option>
                            ))}
                          </select>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Literacy scores */}
                      {doLit ? (
                        <>
                          <ScoreCell field="listening" />
                          <ScoreCell field="speaking" />
                          <ScoreCell field="reading" />
                          <ScoreCell field="writing" />
                          <td className="px-2 py-1 text-center border-l border-gray-200">
                            {litAvg !== null && litAvg > 0 ? (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${litAvg >= 80 ? "bg-green-100 text-green-800" : litAvg >= 60 ? "bg-blue-100 text-blue-800" : litAvg >= 40 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                                {litAvg.toFixed(1)}%{litPromoted ? " 🎉" : ""}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </>
                      ) : (
                        <><td colSpan={5} className="text-center text-gray-300 border-l border-gray-200">—</td></>
                      )}

                      {/* Numeracy stage */}
                      <td className="px-1 py-1 text-center border-l border-gray-200">
                        {doNum ? (
                          <select value={entry.num_stage || "foundation"}
                            onChange={e => updateEntry(teacher.id, "num_stage", e.target.value)}
                            className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full">
                            {Object.entries(STAGE_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l.split(" ")[0]}</option>
                            ))}
                          </select>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Numeracy scores */}
                      {doNum ? (
                        <>
                          <ScoreCell field="operations" />
                          <ScoreCell field="base10" />
                          <ScoreCell field="measurement" />
                          <ScoreCell field="geometry" />
                          <td className="px-2 py-1 text-center border-l border-gray-200">
                            {numAvg !== null && numAvg > 0 ? (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${numAvg >= 80 ? "bg-green-100 text-green-800" : numAvg >= 60 ? "bg-blue-100 text-blue-800" : numAvg >= 40 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                                {numAvg.toFixed(1)}%{numPromoted ? " 🎉" : ""}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </>
                      ) : (
                        <><td colSpan={5} className="text-center text-gray-300 border-l border-gray-200">—</td></>
                      )}

                      {/* Overall */}
                      <td className="px-2 py-1 text-center border-l border-gray-200">
                        {overall > 0 ? (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${overall >= 80 ? "bg-green-100 text-green-800" : overall >= 60 ? "bg-blue-100 text-blue-800" : overall >= 40 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                            {overall.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Rounds done */}
                      <td className="px-2 py-1 text-center">
                        <div className="flex gap-1 justify-center">
                          {roundSummary.map(r => (
                            <span key={r.round} title={r.label}
                              className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${r.hasData ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-400"}`}>
                              {r.round.split("_")[1]}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Promotion legend */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex gap-4 text-xs text-gray-500">
            <span>🎉 = Promoted (≥{PROMOTION_THRESHOLD}%)</span>
            <span>Circles = rounds completed (filled = has data)</span>
            <span>Each subject promoted independently</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADMIN AI ASSESSMENT PAPER — generates competency-mapped papers
// ─────────────────────────────────────────────────────────────────
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

export default function BaselinePage() {
  const [activeTab, setActiveTab] = useState<"entry" | "teacher" | "dashboard" | "ai_paper" | "report_card">("entry");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [round, setRound] = useState("baseline_1");
  const [grade, setGrade] = useState("Grade 1");
  const [sections, setSections] = useState<string[]>([]);
  const [section, setSection] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [studentData, setStudentData] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Teacher entry
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherStage, setTeacherStage] = useState("foundation");
  const [teacherScores, setTeacherScores] = useState<Record<string, Record<string, string>>>({});
  const [savingTeacher, setSavingTeacher] = useState(false);

  // Dashboard
  const [dashTab, setDashTab] = useState<"school" | "grade" | "teachers" | "alerts">("school");
  const [schoolData, setSchoolData] = useState<any>(null);
  const [gradeData, setGradeData] = useState<any>(null);
  const [teacherDashData, setTeacherDashData] = useState<any>(null);
  const [studentAlerts, setStudentAlerts] = useState<any[]>([]);
  const [teacherAlerts, setTeacherAlerts] = useState<any[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashGrade, setDashGrade] = useState("Grade 1");
  const [schoolDashTab, setSchoolDashTab] = useState<"numeracy" | "literacy" | "overall">("overall");
  const [gradeDashTab, setGradeDashTab] = useState<"numeracy" | "literacy" | "overall">("overall");
  const [teacherDashTab, setTeacherDashTab] = useState<"overall" | "literacy" | "numeracy">("overall");

  useEffect(() => { if (grade) fetchSections(); }, [grade]);
  useEffect(() => { if (grade && section) fetchStudents(); }, [grade, section, academicYear, round]);
  useEffect(() => { fetchTeachers(); }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      if (dashTab === "school") fetchSchoolDash();
      else if (dashTab === "grade") fetchGradeDash();
      else if (dashTab === "teachers") fetchTeacherDash();
      else if (dashTab === "alerts") fetchAlerts();
    }
  }, [dashTab, academicYear, round, dashGrade, activeTab]);

  const fetchSections = async () => {
    try {
      const r = await axios.get(`${API}/students?limit=2000`);
      const students = r.data?.data || r.data || [];
      const secs = [...new Set(
        students.filter((s: any) => s.current_class === grade).map((s: any) => s.section).filter(Boolean)
      )] as string[];
      setSections(secs.sort());
      if (secs.length) setSection(secs[0]);
    } catch { }
  };

  const fetchStudents = async () => {
    try {
      const r = await axios.get(`${API}/baseline/section?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&academic_year=${academicYear}&round=${round}`);
      setStudentData(r.data || []);
      const s: Record<string, any> = {};
      (r.data || []).forEach((st: any) => {
        s[st.student_id] = {
          listening: st.assessment?.listening_score || "",
          speaking: st.assessment?.speaking_score || "",
          reading: st.assessment?.reading_score || "",
          writing: st.assessment?.writing_score || "",
          operations: st.assessment?.operations_score || "",
          base10: st.assessment?.base10_score || "",
          measurement: st.assessment?.measurement_score || "",
          geometry: st.assessment?.geometry_score || "",
          stage: st.assessment?.stage || "foundation",
        };
      });
      setScores(s);
    } catch { }
  };

  const fetchTeachers = async () => {
    try {
      const r = await axios.get(`${API}/users?role=teacher`);
      setTeachers(r.data || []);
    } catch { }
  };

  const fetchSchoolDash = async () => {
    setDashLoading(true); setSchoolData(null);
    try {
      const r = await axios.get(`${API}/baseline/dashboard/school?academic_year=${academicYear}&round=${round}`);
      setSchoolData(r.data);
    } catch { }
    setDashLoading(false);
  };

  const fetchGradeDash = async () => {
    setDashLoading(true); setGradeData(null);
    try {
      const r = await axios.get(`${API}/baseline/dashboard/grade/${encodeURIComponent(dashGrade)}?academic_year=${academicYear}&round=${round}`);
      setGradeData(r.data);
    } catch { }
    setDashLoading(false);
  };

  const fetchTeacherDash = async () => {
    setDashLoading(true); setTeacherDashData(null);
    try {
      const r = await axios.get(`${API}/baseline/dashboard/teachers?academic_year=${academicYear}&round=${round}`);
      setTeacherDashData(r.data);
    } catch { }
    setDashLoading(false);
  };

  const fetchAlerts = async () => {
    setDashLoading(true); setStudentAlerts([]); setTeacherAlerts([]);
    try {
      const [sr, tr] = await Promise.all([
        axios.get(`${API}/baseline/alerts/students?academic_year=${academicYear}`),
        axios.get(`${API}/baseline/alerts/teachers?academic_year=${academicYear}`),
      ]);
      setStudentAlerts(sr.data || []);
      setTeacherAlerts(tr.data || []);
    } catch { }
    setDashLoading(false);
  };

  const updateScore = (studentId: string, field: string, val: string) => {
    setScores(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [field]: val } }));
  };

  const saveScores = async () => {
    setSaving(true);
    try {
      const assessments = studentData.map(st => ({
        student_id: st.student_id,
        student_name: st.student_name,
        listening_score: scores[st.student_id]?.listening || undefined,
        speaking_score: scores[st.student_id]?.speaking || undefined,
        reading_score: scores[st.student_id]?.reading || undefined,
        writing_score: scores[st.student_id]?.writing || undefined,
        operations_score: scores[st.student_id]?.operations || undefined,
        base10_score: scores[st.student_id]?.base10 || undefined,
        measurement_score: scores[st.student_id]?.measurement || undefined,
        geometry_score: scores[st.student_id]?.geometry || undefined,
        stage: scores[st.student_id]?.stage || "foundation",
      }));
      await axios.post(`${API}/baseline/section`, { grade, section, academic_year: academicYear, round, assessment_date: assessmentDate, assessments });
      setMessage("✅ Saved successfully");
      fetchStudents();
    } catch { setMessage("❌ Error saving"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const saveTeacherScore = async () => {
    setSavingTeacher(true);
    let saved = 0;
    try {
      for (const teacher of teachers) {
        const sc = teacherScores[teacher.id];
        if (!sc) continue;
        const hasData = Object.values(sc).some(v => v && v !== "");
        if (!hasData) continue;
        await axios.post(`${API}/baseline/teacher`, {
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          academic_year: academicYear,
          round,
          stage: sc.stage || teacherStage,
          subject: "literacy",
          assessment_date: assessmentDate,
          listening_score: sc.listening || undefined,
          speaking_score: sc.speaking || undefined,
          reading_score: sc.reading || undefined,
          writing_score: sc.writing || undefined,
          operations_score: sc.operations || undefined,
          base10_score: sc.base10 || undefined,
          measurement_score: sc.measurement || undefined,
          geometry_score: sc.geometry || undefined,
        });
        saved++;
      }
      setMessage(`✅ Saved ${saved} teacher baseline records`);
    } catch { setMessage("❌ Error saving"); }
    setSavingTeacher(false);
    setTimeout(() => setMessage(""), 3000);
  };

  // Score input for students
  const ScoreInput = ({ studentId, field }: { studentId: string; field: string }) => {
    const val = scores[studentId]?.[field] || "";
    const num = parseFloat(val);
    const color = !isNaN(num) && val !== "" ? (num >= 80 ? "border-green-400 bg-green-50" : num >= 60 ? "border-blue-400 bg-blue-50" : num >= 40 ? "border-yellow-400 bg-yellow-50" : "border-red-400 bg-red-50") : "border-gray-300";
    return (
      <input type="number" min={0} max={100} step={0.5}
        value={val}
        onChange={e => updateScore(studentId, field, e.target.value)}
        placeholder="—"
        className={`w-14 text-center text-xs border rounded px-1 py-0.5 ${color}`} />
    );
  };

  const calcAverages = (sc: any) => {
    const litVals = [sc?.listening, sc?.speaking, sc?.reading, sc?.writing].map(v => parseFloat(v)).filter(v => !isNaN(v));
    const numVals = [sc?.operations, sc?.base10, sc?.measurement, sc?.geometry].map(v => parseFloat(v)).filter(v => !isNaN(v));
    const litAvg = litVals.length ? +(litVals.reduce((a, b) => a + b, 0) / litVals.length).toFixed(1) : null;
    const numAvg = numVals.length ? +(numVals.reduce((a, b) => a + b, 0) / numVals.length).toFixed(1) : null;
    const both = [litAvg, numAvg].filter(v => v !== null) as number[];
    const overall = both.length ? +(both.reduce((a, b) => a + b, 0) / both.length).toFixed(1) : null;
    const level = overall !== null ? (overall >= 80 ? "Level 4 – Exceeding" : overall >= 60 ? "Level 3 – Meeting" : overall >= 40 ? "Level 2 – Approaching" : "Level 1 – Beginning") : null;
    return { litAvg, numAvg, overall, level };
  };

  const EntryTableHeaders = () => (
    <>
      <tr className="bg-indigo-700 text-white">
        <th className="px-3 py-2 text-left sticky left-0 z-20 bg-indigo-700 border-r border-indigo-600 min-w-[180px]">Name</th>
        <th className="px-2 py-2 text-center min-w-[90px]">Stage</th>
        <th className="px-2 py-2 text-center border-l border-indigo-500 bg-blue-700" colSpan={4}>📚 Literacy</th>
        <th className="px-2 py-2 text-center border-l border-indigo-500 bg-purple-700" colSpan={4}>🔢 Numeracy</th>
        <th className="px-2 py-2 text-center border-l border-indigo-600 min-w-[70px]">Lit Avg</th>
        <th className="px-2 py-2 text-center min-w-[70px]">Num Avg</th>
        <th className="px-2 py-2 text-center min-w-[80px]">Overall</th>
        <th className="px-2 py-2 text-center min-w-[100px]">Level</th>
      </tr>
      <tr className="bg-gray-100 text-gray-600 text-xs">
        <th className="px-3 py-1.5 sticky left-0 z-20 bg-gray-100 border-r border-gray-200" />
        <th className="px-2 py-1.5" />
        <th className="px-2 py-1.5 text-center border-l border-gray-200">Listen</th>
        <th className="px-2 py-1.5 text-center">Speak</th>
        <th className="px-2 py-1.5 text-center">Read</th>
        <th className="px-2 py-1.5 text-center">Write</th>
        <th className="px-2 py-1.5 text-center border-l border-gray-200">Ops</th>
        <th className="px-2 py-1.5 text-center">Base10</th>
        <th className="px-2 py-1.5 text-center">Measure</th>
        <th className="px-2 py-1.5 text-center">Geom</th>
        <th colSpan={4} />
      </tr>
    </>
  );

  const ScoreCells = ({ sc, onUpdate, idKey }: { sc: any; onUpdate: (field: string, val: string) => void; idKey: string }) => {
    const { litAvg, numAvg, overall, level } = calcAverages(sc);
    const makeInput = (field: string) => {
      const val = sc?.[field] || "";
      const num = parseFloat(val);
      const color = !isNaN(num) && val !== "" ? (num >= 80 ? "border-green-400 bg-green-50" : num >= 60 ? "border-blue-400 bg-blue-50" : num >= 40 ? "border-yellow-400 bg-yellow-50" : "border-red-400 bg-red-50") : "border-gray-300";
      return (
        <input type="number" min={0} max={100} step={0.5} value={val}
          onChange={e => onUpdate(field, e.target.value)} placeholder="—"
          className={`w-14 text-center text-xs border rounded px-1 py-0.5 ${color}`} />
      );
    };
    return (
      <>
        <td className="px-1 py-1 text-center border-l border-gray-100">{makeInput("listening")}</td>
        <td className="px-1 py-1 text-center">{makeInput("speaking")}</td>
        <td className="px-1 py-1 text-center">{makeInput("reading")}</td>
        <td className="px-1 py-1 text-center">{makeInput("writing")}</td>
        <td className="px-1 py-1 text-center border-l border-gray-100">{makeInput("operations")}</td>
        <td className="px-1 py-1 text-center">{makeInput("base10")}</td>
        <td className="px-1 py-1 text-center">{makeInput("measurement")}</td>
        <td className="px-1 py-1 text-center">{makeInput("geometry")}</td>
        <td className="px-2 py-1.5 text-center border-l border-gray-200">
          {litAvg !== null ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(litAvg)}`}>{litAvg}</span> : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-2 py-1.5 text-center">
          {numAvg !== null ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(numAvg)}`}>{numAvg}</span> : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-2 py-1.5 text-center">
          {overall !== null ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBg(overall)}`}>{overall}</span> : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-2 py-1.5 text-center">
          {level ? <span className={`text-xs px-1.5 py-0.5 rounded ${levelBg(level)}`}>{level.split("–")[0].trim()}</span> : <span className="text-gray-300">—</span>}
        </td>
      </>
    );
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Baseline Assessment</h1>
        <p className="text-sm text-gray-500">Student and teacher literacy and numeracy baseline tracking</p>
      </div>

      {/* Global selectors */}
      <div className="flex gap-3 mb-4 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Round</label>
          <select value={round} onChange={e => setRound(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Assessment Date</label>
          <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-nowrap">
        {[
          { id: "entry",       label: "📝 Student Entry" },
          { id: "teacher",     label: "👩‍🏫 Teacher Entry" },
          { id: "dashboard",   label: "📊 Dashboard" },
          { id: "ai_paper",    label: "🤖 AI Assessment Paper" },
          { id: "report_card", label: "📄 Report Cards" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-xs sm:text-sm rounded-lg font-medium whitespace-nowrap flex-shrink-0 ${activeTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      {/* ── STUDENT ENTRY ── */}
      {activeTab === "entry" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Grade</label>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Section</label>
                <select value={section} onChange={e => setSection(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={saveScores} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold ml-auto">
                {saving ? "Saving..." : "💾 Save All"}
              </button>
            </div>
          </div>

          {studentData.length > 0 && (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-700">{grade} — {section} — {round}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{studentData.length} students · All scores out of 100</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: "1100px" }}>
                  <thead><EntryTableHeaders /></thead>
                  <tbody>
                    {studentData.map((st, idx) => {
                      const sc = scores[st.student_id] || {};
                      const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                      return (
                        <tr key={st.student_id} className={`border-b border-gray-100 ${bg}`}>
                          <td className={`px-3 py-1.5 font-medium text-gray-800 sticky left-0 z-10 border-r border-gray-200 ${bg}`}>
                            {st.student_name}
                            {st.assessment && <span className="ml-1 text-xs text-green-500">✓</span>}
                          </td>
                          <td className="px-1 py-1">
                            <select value={sc.stage || "foundation"}
                              onChange={e => updateScore(st.student_id, "stage", e.target.value)}
                              className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full">
                              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label.split(" ")[0]}</option>)}
                            </select>
                          </td>
                          <ScoreCells
                            sc={sc}
                            idKey={st.student_id}
                            onUpdate={(field, val) => updateScore(st.student_id, field, val)}
                          />
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

      {/* ── TEACHER ENTRY ── */}
      {activeTab === "teacher" && (
        <TeacherBaselineEntry
          teachers={teachers}
          academicYear={academicYear}
          assessmentDate={assessmentDate}
          setAssessmentDate={setAssessmentDate}
          API={API}
        />
      )}

      {/* ── DASHBOARD ── */}
      {activeTab === "dashboard" && (
        <div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-nowrap items-center">
            {[
              { id: "school", label: "🏫 School" },
              { id: "grade", label: "📚 Grade" },
              { id: "teachers", label: "👩‍🏫 Teachers" },
              { id: "alerts", label: "⚠️ Alerts" },
            ].map(t => (
              <button key={t.id} onClick={() => setDashTab(t.id as any)}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${dashTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                {t.label}
              </button>
            ))}
            <button onClick={() => {
              if (dashTab === "school") fetchSchoolDash();
              else if (dashTab === "grade") fetchGradeDash();
              else if (dashTab === "teachers") fetchTeacherDash();
              else fetchAlerts();
            }} className="ml-auto px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1">
              🔄 Refresh
            </button>
          </div>

          {/* Loading indicator */}
          {dashLoading && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-sm">Loading latest data...</p>
            </div>
          )}

          {/* ── SCHOOL DASHBOARD ── */}
          {!dashLoading && dashTab === "school" && schoolData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[
                  { label: "Total Students", value: schoolData.totalStudents, color: "border-indigo-500" },
                  { label: "Assessed", value: schoolData.assessed, color: "border-green-500" },
                  { label: "Pending", value: schoolData.pending, color: "border-red-500" },
                  { label: "School Avg", value: `${schoolData.overallAvg}%`, color: "border-blue-500" },
                  { label: "Round", value: ROUNDS.find(r => r.value === round)?.label, color: "border-orange-500" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Literacy / Numeracy / Overall avg cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Literacy Avg", value: schoolData.literacyAvg, color: "bg-blue-500" },
                  { label: "Numeracy Avg", value: schoolData.numeracyAvg, color: "bg-purple-500" },
                  { label: "Overall Avg", value: schoolData.overallAvg, color: "bg-indigo-500" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <div className={`text-2xl font-bold text-white ${s.color} rounded-xl px-4 py-2 inline-block`}>{s.value}%</div>
                  </div>
                ))}
              </div>

              {/* Grade-wise sub tabs */}
              {schoolData.gradeWise?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[
                      { id: "overall", label: "📊 Overall" },
                      { id: "literacy", label: "📚 Literacy" },
                      { id: "numeracy", label: "🔢 Numeracy" },
                    ].map(t => (
                      <button key={t.id} onClick={() => setSchoolDashTab(t.id as any)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium ${schoolDashTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Grade-wise {schoolDashTab === "overall" ? "Overall" : schoolDashTab === "literacy" ? "Literacy" : "Numeracy"} Average
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={schoolData.gradeWise.map((g: any) => ({
                        name: g.grade.replace("Grade ", "G"),
                        value: schoolDashTab === "overall" ? g.overallAvg : schoolDashTab === "literacy" ? g.literacyAvg : g.numeracyAvg,
                        count: g.count, full: g.grade,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any, _, p) => [`${v}% (${p.payload.count} students)`, p.payload.full]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}
                          fill={schoolDashTab === "overall" ? "#6366f1" : schoolDashTab === "literacy" ? "#3b82f6" : "#8b5cf6"} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

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
                      <p className="text-3xl font-bold text-gray-800">{schoolData.levelDist[l.key]}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {schoolData.assessed > 0 ? ((schoolData.levelDist[l.key] / schoolData.assessed) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── GRADE DASHBOARD ── */}
          {!dashLoading && dashTab === "grade" && (
            <div className="space-y-4">
              <div className="flex gap-3 items-end mb-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Grade</label>
                  <select value={dashGrade} onChange={e => setDashGrade(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {gradeData && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Assessed", value: gradeData.totalAssessed, color: "border-indigo-500" },
                      { label: "Literacy Avg", value: `${gradeData.literacyAvg}%`, color: "border-blue-500" },
                      { label: "Numeracy Avg", value: `${gradeData.numeracyAvg}%`, color: "border-purple-500" },
                      { label: "Overall Avg", value: `${gradeData.overallAvg}%`, color: "border-green-500" },
                    ].map(s => (
                      <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                        <p className="text-xs text-gray-500">{s.label}</p>
                        <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Grade sub-tabs */}
                  <div className="flex gap-2">
                    {[
                      { id: "overall", label: "📊 Overall" },
                      { id: "literacy", label: "📚 Literacy" },
                      { id: "numeracy", label: "🔢 Numeracy" },
                    ].map(t => (
                      <button key={t.id} onClick={() => setGradeDashTab(t.id as any)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium ${gradeDashTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Section-wise {gradeDashTab === "overall" ? "Overall" : gradeDashTab === "literacy" ? "Literacy" : "Numeracy"} Average — {dashGrade}
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={gradeData.sections.map((s: any) => ({
                        name: s.section,
                        value: gradeDashTab === "overall" ? s.overallAvg : gradeDashTab === "literacy" ? s.literacyAvg : s.numeracyAvg,
                        atRisk: s.atRisk, count: s.count,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any, _, p) => [`${v}% (${p.payload.count} students)`, p.payload.name]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}
                          fill={gradeDashTab === "overall" ? "#6366f1" : gradeDashTab === "literacy" ? "#3b82f6" : "#8b5cf6"} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Numeracy section */}
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">🔢 Numeracy Average per Section</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gradeData.sections.map((s: any) => ({ name: s.section, avg: s.numeracyAvg, count: s.count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any) => [`${v}%`, "Numeracy Avg"]} />
                        <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Literacy section */}
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">📚 Literacy Average per Section</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gradeData.sections.map((s: any) => ({ name: s.section, avg: s.literacyAvg, count: s.count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any) => [`${v}%`, "Literacy Avg"]} />
                        <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Overall section */}
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Overall Average per Section</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gradeData.sections.map((s: any) => ({ name: s.section, avg: s.overallAvg, atRisk: s.atRisk, count: s.count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any, _, p) => [`${v}% (${p.payload.atRisk} at risk)`, "Overall Avg"]} />
                        <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                          {gradeData.sections.map((s: any, i: number) => (
                            <Cell key={i} fill={s.overallAvg >= 60 ? "#6366f1" : s.overallAvg >= 40 ? "#f59e0b" : "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Section table */}
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Section Details</h3>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-700 text-white">
                          <th className="px-3 py-2 text-left">Section</th>
                          <th className="px-3 py-2 text-center">Students</th>
                          <th className="px-3 py-2 text-center">Literacy Avg</th>
                          <th className="px-3 py-2 text-center">Numeracy Avg</th>
                          <th className="px-3 py-2 text-center">Overall Avg</th>
                          <th className="px-3 py-2 text-center">At Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradeData.sections.map((s: any, i: number) => (
                          <tr key={s.section} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 font-semibold text-gray-800">{s.section}</td>
                            <td className="px-3 py-2 text-center">{s.count}</td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.literacyAvg)}`}>{s.literacyAvg}%</span></td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.numeracyAvg)}`}>{s.numeracyAvg}%</span></td>
                            <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(s.overallAvg)}`}>{s.overallAvg}%</span></td>
                            <td className="px-3 py-2 text-center">
                              {s.atRisk > 0 ? <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{s.atRisk} ⚠️</span> : <span className="text-gray-400">0</span>}
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

          {/* ── TEACHER DASHBOARD ── */}
          {!dashLoading && dashTab === "teachers" && teacherDashData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Total Teachers", value: teacherDashData.totalTeachers, color: "border-indigo-500" },
                  { label: "Assessed", value: teacherDashData.assessed, color: "border-green-500" },
                  { label: "Pending", value: teacherDashData.pending, color: "border-red-500" },
                  { label: "Literacy Avg", value: `${teacherDashData.literacyAvg}%`, color: "border-blue-500" },
                  { label: "Numeracy Avg", value: `${teacherDashData.numeracyAvg}%`, color: "border-purple-500" },
                  { label: "Overall Avg", value: `${teacherDashData.overallAvg}%`, color: "border-green-600" },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Teacher bar charts with tabs */}
              {teacherDashData.teacherBarData?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[
                      { id: "overall", label: "📊 Overall" },
                      { id: "literacy", label: "📚 Literacy" },
                      { id: "numeracy", label: "🔢 Numeracy" },
                    ].map(t => (
                      <button key={t.id} onClick={() => setTeacherDashTab(t.id as any)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium ${teacherDashTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      {teacherDashTab === "overall" ? "📊 Teacher Overall Scores" : teacherDashTab === "literacy" ? "📚 Teacher Literacy Scores" : "🔢 Teacher Numeracy Scores"}
                    </h3>
                    <ResponsiveContainer width="100%" height={Math.max(240, teacherDashData.teacherBarData.length * 32)}>
                      <BarChart data={teacherDashData.teacherBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip formatter={(v: any, _, p) => [`${v}%`, p.payload.fullName]} />
                        <Bar dataKey={teacherDashTab} radius={[0, 4, 4, 0]}>
                          {teacherDashData.teacherBarData.map((t: any, i: number) => {
                            const val = t[teacherDashTab];
                            return <Cell key={i} fill={val >= 80 ? "#10b981" : val >= 60 ? "#6366f1" : val >= 40 ? "#f59e0b" : "#ef4444"} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Domain averages */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Domain Averages</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={teacherDashData.domainData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="domain" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={(v: any) => [`${v}%`, "Avg"]} />
                    <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} />
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
                      <p className="text-3xl font-bold text-gray-800">{teacherDashData.levelDist[l.key]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher list */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">All Teachers</h3>
                <div className="space-y-1">
                  {teacherDashData.teacherList.map((t: any) => (
                    <div key={t.teacher_id} className={`flex items-center justify-between p-2 rounded border ${t.assessment ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
                      <span className="text-sm font-medium text-gray-800">{t.teacher_name}</span>
                      {t.assessment ? (
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(+(+t.assessment.literacy_total || 0).toFixed(1))}`}>Lit: {(+t.assessment.literacy_total || 0).toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(+(+t.assessment.numeracy_total || 0).toFixed(1))}`}>Num: {(+t.assessment.numeracy_total || 0).toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreBg(+(+t.assessment.overall_score || 0).toFixed(1))}`}>{(+t.assessment.overall_score || 0).toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${levelBg(t.assessment.level)}`}>{t.assessment.level?.split("–")[0].trim()}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Not assessed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ALERTS ── */}
          {!dashLoading && dashTab === "alerts" && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-yellow-800 mb-1">⚠️ Consecutive Decline Alert</h3>
                <p className="text-xs text-yellow-600">
                  Students and teachers who have scored lower in 3 consecutive assessments — persistent decline needing attention.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📉 Students with Consecutive Decline ({studentAlerts.length})</h3>
                {studentAlerts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No students with 3 consecutive declines found</p>
                ) : (
                  <div className="space-y-3">
                    {studentAlerts.map((s: any, i: number) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-sm font-bold text-red-800">{s.entity_name}</span>
                            <span className="text-xs text-gray-500 ml-2">{s.grade} — {s.section}</span>
                          </div>
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                            Drop: {s.decline_from} → {s.decline_to} (-{s.drop})
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {s.scores.map((sc: any, j: number) => (
                            <div key={j} className={`text-center rounded px-2 py-1 text-xs border ${scoreBg(sc.overall)}`}>
                              <p className="font-bold">{sc.overall}%</p>
                              <p className="text-gray-500">{sc.round?.replace("_", " ")}</p>
                              <p className="text-gray-400">{sc.academic_year}</p>
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
                {teacherAlerts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No teachers with 3 consecutive declines found</p>
                ) : (
                  <div className="space-y-3">
                    {teacherAlerts.map((t: any, i: number) => (
                      <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-orange-800">{t.entity_name}</span>
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                            Drop: {t.decline_from} → {t.decline_to} (-{t.drop})
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {t.scores.map((sc: any, j: number) => (
                            <div key={j} className={`text-center rounded px-2 py-1 text-xs border ${scoreBg(sc.overall)}`}>
                              <p className="font-bold">{sc.overall}%</p>
                              <p className="text-gray-500">{sc.round?.replace("_", " ")}</p>
                              <p className="text-gray-400">{sc.academic_year}</p>
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

      {/* ── AI ASSESSMENT PAPER ── */}
      {activeTab === "ai_paper" && (
        <AdminAIPaperTab teachers={teachers} academicYear={academicYear} API={API} />
      )}

      {/* ── REPORT CARDS ── */}
      {activeTab === "report_card" && (
        <ReportCardTab teachers={teachers} academicYear={academicYear} API={API} />
      )}
    </div>
  );
}