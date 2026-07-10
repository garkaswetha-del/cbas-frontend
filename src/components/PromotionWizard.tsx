import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://cbas-backend-production.up.railway.app";
const GRADE_ORDER = [
  "Pre-KG", "LKG", "UKG",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
];

function getNextGrade(grade: string): string | null {
  const idx = GRADE_ORDER.indexOf(grade);
  if (idx === -1 || idx === GRADE_ORDER.length - 1) return null;
  return GRADE_ORDER[idx + 1];
}

// "2025-26" → "2026-27"
function getNextYear(year: string): string {
  const startYear = parseInt(year.split("-")[0], 10);
  if (isNaN(startYear)) return year;
  return `${startYear + 1}-${String(startYear + 2).slice(-2)}`;
}

interface Props {
  academicYear: string;
  // Teacher mode: grade/section are fixed to their own class, skip selector step
  fixedGrade?: string;
  fixedSection?: string;
  onComplete?: () => void; // called after successful promotion/graduation
  onClose?: () => void;    // called when wizard should close (admin modal close)
}

export default function PromotionWizard({ academicYear, fixedGrade, fixedSection, onComplete, onClose }: Props) {
  const isTeacherMode = !!(fixedGrade && fixedSection);

  const [step, setStep] = useState<"select" | "assign" | "done">(isTeacherMode ? "assign" : "select");
  const [grade, setGrade] = useState(fixedGrade || "");
  const [section, setSection] = useState(fixedSection || "");
  const [gradeSections, setGradeSections] = useState<string[]>([]);

  const [students, setStudents] = useState<any[]>([]);
  const [nextSections, setNextSections] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkSection, setBulkSection] = useState("");
  const [gradYear, setGradYear] = useState(new Date().getFullYear().toString());

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<{ count: number; type: "promotion" | "graduation"; toGrade?: string } | null>(null);

  const ng = getNextGrade(grade);
  const isGrade10 = grade === "Grade 10";

  // Load students and sections for next grade
  const loadStudents = async (g: string, s: string) => {
    const targetNext = getNextGrade(g);
    setLoading(true);
    setMsg("");
    try {
      const [studRes, secRes] = await Promise.all([
        axios.get(`${API}/students/promotion/preview`, { params: { grade: g, section: s } }),
        targetNext
          ? axios.get(`${API}/sections`, { params: { grade: targetNext, academic_year: academicYear } })
          : Promise.resolve({ data: [] }),
      ]);

      const list: any[] = studRes.data?.students || [];
      setStudents(list);
      setSelected([]); // nothing pre-selected — teacher picks groups manually
      const init: Record<string, string> = {};
      list.forEach(st => { init[st.id] = ""; });
      setAssignments(init);

      let sections: string[] = (Array.isArray(secRes.data) ? secRes.data : [])
        .map((s: any) => s.name || s).filter(Boolean);

      // Fallback: derive from students already in the next grade
      if (sections.length === 0 && targetNext) {
        try {
          const fbRes = await axios.get(`${API}/students`, { params: { grade: targetNext } });
          const fbStudents: any[] = fbRes.data?.data || fbRes.data || [];
          sections = [...new Set(
            fbStudents.filter((s: any) => s.is_active !== false && s.section)
                      .map((s: any) => (s.section as string).toUpperCase())
          )].sort() as string[];
        } catch { }
      }

      setNextSections(sections);
      setStep("assign");
    } catch { setMsg("❌ Could not load students."); }
    setLoading(false);
  };

  // Teacher mode: auto-load on mount
  useEffect(() => {
    if (isTeacherMode && fixedGrade && fixedSection) {
      loadStudents(fixedGrade, fixedSection);
    }
  }, []);

  // Admin: load sections for selected grade
  const loadGradeSections = async (g: string) => {
    setGrade(g); setSection(""); setGradeSections([]);
    if (!g) return;
    try {
      const res = await axios.get(`${API}/students/sections/${encodeURIComponent(g)}`);
      setGradeSections(res.data?.sections || []);
    } catch { setGradeSections([]); }
  };

  const assignSelected = () => {
    if (!bulkSection || selected.length === 0) return;
    setAssignments(prev => {
      const next = { ...prev };
      selected.forEach(id => { next[id] = bulkSection; });
      return next;
    });
    setSelected([]);
    setBulkSection("");
  };

  const executePromotion = async () => {
    const unassigned = students.filter(s => !assignments[s.id]);
    if (unassigned.length > 0) { setMsg(`❌ ${unassigned.length} student(s) not assigned to a section`); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/students/promotion/execute-batch`, {
        from_grade: grade,
        assignments: students.map(s => ({ student_id: s.id, to_section: assignments[s.id] })),
        to_year: getNextYear(academicYear),
      });
      setResult({ count: res.data?.promoted_count || students.length, type: "promotion", toGrade: ng || "" });
      setStep("done");
      onComplete?.();
    } catch { setMsg("❌ Promotion failed. Try again."); }
    setSubmitting(false);
  };

  const executeGraduation = async () => {
    if (!gradYear) { setMsg("❌ Enter graduation year"); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/students/graduation/execute`, {
        grade, section, student_ids: students.map(s => s.id), graduation_year: gradYear,
      });
      setResult({ count: res.data?.graduated || students.length, type: "graduation" });
      setStep("done");
      onComplete?.();
    } catch { setMsg("❌ Graduation failed. Try again."); }
    setSubmitting(false);
  };

  const tally = () => {
    const counts: Record<string, number> = {};
    let unassigned = 0;
    students.forEach(s => {
      const sec = assignments[s.id];
      if (sec) counts[sec] = (counts[sec] || 0) + 1;
      else unassigned++;
    });
    return { counts, unassigned };
  };

  const resetForNext = () => {
    setStudents([]); setAssignments({}); setSelected([]); setBulkSection("");
    setNextSections([]); setResult(null); setMsg("");
    if (isTeacherMode) {
      setStep("assign");
      loadStudents(grade, section);
    } else {
      setGrade(""); setSection(""); setGradeSections([]);
      setStep("select");
    }
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className={`border rounded-xl p-4 ${isGrade10 ? "bg-amber-50 border-amber-200" : "bg-indigo-50 border-indigo-200"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-sm font-bold ${isGrade10 ? "text-amber-800" : "text-indigo-800"}`}>
              {isGrade10 ? "🎓 Student Graduation" : "🎓 Student Promotion"}
            </h3>
            {grade && section && (
              <p className={`text-xs mt-0.5 ${isGrade10 ? "text-amber-600" : "text-indigo-600"}`}>
                {grade} · {section}{ng ? ` → ${ng}` : " → Alumni"}
              </p>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {msg}
        </div>
      )}

      {/* ── STEP 1: Select grade/section (admin only) ── */}
      {step === "select" && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <p className="text-xs text-gray-500">Select the current grade and section to promote students to the next grade.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Current Grade</label>
              <select value={grade} onChange={e => loadGradeSections(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full">
                <option value="">-- Select Grade --</option>
                {GRADE_ORDER.map(c => <option key={c} value={c}>{c}{c === "Grade 10" ? " (→ Alumni)" : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Current Section</label>
              <select value={section} onChange={e => setSection(e.target.value)} disabled={!grade}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full disabled:opacity-50">
                <option value="">-- Select Section --</option>
                {gradeSections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => loadStudents(grade, section)}
            disabled={!grade || !section || loading}
            className="px-6 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold">
            {loading ? "Loading..." : "Preview Students →"}
          </button>
        </div>
      )}

      {/* ── STEP 2: Assign ── */}
      {step === "assign" && loading && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">Loading students...</div>
      )}

      {step === "assign" && !loading && students.length === 0 && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No active students found in {grade} · {section}.</div>
      )}

      {step === "assign" && !loading && students.length > 0 && (
        isGrade10 ? (
          /* Graduation flow */
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <p className="text-sm text-gray-600">{students.length} students will be graduated and marked as alumni.</p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Graduation Year:</label>
              <input type="text" value={gradYear} onChange={e => setGradYear(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-24 text-center" />
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-amber-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Adm. No.</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="px-3 py-1.5 font-medium text-gray-700">{s.name}</td>
                      <td className="px-3 py-1.5 text-gray-500">{s.admission_no || "—"}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">Will Graduate {gradYear}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={executeGraduation} disabled={submitting}
                className="flex-1 px-6 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 font-semibold">
                {submitting ? "Graduating..." : "🎓 Graduate to Alumni"}
              </button>
              {!isTeacherMode && (
                <button onClick={() => setStep("select")}
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">← Back</button>
              )}
            </div>
          </div>
        ) : (
          /* Promotion flow */
          <div className="space-y-3">

            {/* Step A: select students → pick section → assign */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">① Check students &nbsp;→&nbsp; ② Pick section &nbsp;→&nbsp; ③ Click Assign</p>
              <div className="flex items-center gap-2">
                <select value={bulkSection} onChange={e => setBulkSection(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                  <option value="">-- select target section --</option>
                  {nextSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={assignSelected}
                  disabled={!bulkSection || selected.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold whitespace-nowrap">
                  Assign {selected.length > 0 ? `(${selected.length})` : ""} →
                </button>
              </div>
            </div>

            {/* Tally */}
            {(() => {
              const { counts, unassigned } = tally();
              return (
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {Object.entries(counts).map(([sec, count]) => (
                    <span key={sec} className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{sec}: {count}</span>
                  ))}
                  {unassigned > 0 && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Unassigned: {unassigned}</span>
                  )}
                </div>
              );
            })()}

            {/* Student table with checkboxes */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">
                        <input type="checkbox"
                          checked={selected.length === students.filter(s => !assignments[s.id]).length && students.filter(s => !assignments[s.id]).length > 0}
                          onChange={e => setSelected(e.target.checked ? students.filter(s => !assignments[s.id]).map(s => s.id) : [])}
                          className="h-4 w-4 cursor-pointer accent-indigo-600"
                          title="Select all unassigned"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Adm. No.</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">→ {ng}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const assigned = assignments[s.id];
                      const isChecked = selected.includes(s.id);
                      return (
                        <tr key={s.id}
                          className={`border-t border-gray-100 cursor-pointer select-none
                            ${assigned ? "bg-green-50" : isChecked ? "bg-indigo-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                          onClick={() => {
                            if (assigned) return; // already assigned, can't re-select
                            setSelected(prev => isChecked ? prev.filter(id => id !== s.id) : [...prev, s.id]);
                          }}
                        >
                          <td className="px-3 py-2 text-center">
                            {assigned ? (
                              <span className="text-green-500 text-base">✓</span>
                            ) : (
                              <input type="checkbox" checked={isChecked} readOnly
                                className="h-4 w-4 accent-indigo-600 pointer-events-none" />
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-800">{s.name}</td>
                          <td className="px-3 py-2 text-gray-400 text-xs">{s.admission_no || "—"}</td>
                          <td className="px-3 py-2">
                            {assigned ? (
                              <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                                {assigned}
                                <button onClick={e => { e.stopPropagation(); setAssignments(prev => { const n = { ...prev }; delete n[s.id]; return n; }); }}
                                  className="text-green-600 hover:text-red-500 font-bold leading-none ml-0.5">×</button>
                              </span>
                            ) : (
                              <span className="text-orange-400 text-xs">— unassigned —</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {nextSections.length === 0 && (
              <p className="text-xs text-orange-500">No sections found for {ng}. Add them in Section Management first.</p>
            )}

            {(() => {
              const { unassigned } = tally();
              return (
                <div className="space-y-1.5">
                  {unassigned > 0 && (
                    <p className="text-xs text-orange-600 text-center font-medium">
                      {unassigned} student{unassigned > 1 ? "s" : ""} still unassigned — assign all before confirming
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={executePromotion}
                      disabled={submitting || unassigned > 0}
                      className="flex-1 px-6 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold">
                      {submitting ? "Promoting..." : "✅ Confirm Promotion"}
                    </button>
                    {!isTeacherMode && (
                      <button onClick={() => setStep("select")}
                        className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">← Back</button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )
      )}

      {/* ── STEP 3: Done ── */}
      {step === "done" && result && (
        <div className="bg-white rounded-xl shadow p-10 text-center">
          <div className="text-5xl mb-4">{result.type === "graduation" ? "🎓" : "🎉"}</div>
          <h3 className="text-lg font-bold text-green-700 mb-2">
            {result.type === "graduation" ? "Graduation Complete!" : "Promotion Complete!"}
          </h3>
          <p className="text-sm text-gray-600">
            {result.count} students {result.type === "graduation"
              ? `graduated to Alumni (${gradYear})`
              : `promoted to ${result.toGrade}`}.
          </p>
          <div className="flex justify-center gap-3 mt-4">
            {onClose && (
              <button onClick={onClose}
                className="px-6 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">
                Close
              </button>
            )}
            {!isTeacherMode && (
              <button onClick={resetForNext}
                className="px-6 py-2 border border-indigo-300 text-indigo-600 text-sm rounded-lg hover:bg-indigo-50 font-semibold">
                Promote Another Class
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
