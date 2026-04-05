import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3000";
const ACADEMIC_YEAR = "2025-26";

const Select = ({ value, onChange, options }: any) => (
  <select
    value={value || ""}
    onChange={(e) => onChange(e.target.value)}
    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white min-w-[140px]"
  >
    <option value="">--</option>
    {options.map((o: string) => (
      <option key={o} value={o}>{o}</option>
    ))}
  </select>
);

const Num = ({ value, onChange }: any) => (
  <input
    type="number" min={0} max={100}
    value={value || ""}
    onChange={(e) => onChange(e.target.value)}
    className="w-14 text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
  />
);

const Check = ({ value, onChange }: any) => (
  <input type="checkbox" checked={!!value}
    onChange={(e) => onChange(e.target.checked)}
    className="w-4 h-4 accent-indigo-600"
  />
);

const Score = ({ value, max }: any) => {
  const v = value ? +value : 0;
  const pct = max ? ((v / max) * 100).toFixed(1) : (v * 100).toFixed(1);
  return (
    <td className="px-2 py-1 text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-gray-200">
      {value ? pct + "%" : "-"}
    </td>
  );
};

export default function AppraisalPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/appraisal?academic_year=${ACADEMIC_YEAR}`);
      setTeachers(res.data);
      const map: Record<string, any> = {};
      res.data.forEach((t: any) => { map[t.teacher_id] = t.appraisal || {}; });
      setAppraisals(map);
    } catch { setTeachers([]); }
  };

  const update = (tid: string, field: string, value: any) => {
    setAppraisals(prev => ({ ...prev, [tid]: { ...prev[tid], [field]: value } }));
  };

  const updateObs = (tid: string, i: number, value: string) => {
    const obs = [...((appraisals[tid]?.classroom_observations as any[]) || [{}, {}, {}, {}])];
    obs[i] = { band: value };
    update(tid, "classroom_observations", obs);
  };

  const save = async (tid: string, name: string) => {
    setSaving(tid);
    try {
      await axios.post(`${API}/appraisal/${tid}`, { ...appraisals[tid], academic_year: ACADEMIC_YEAR, teacher_name: name });
      setMessage(`✅ Saved — ${name}`);
      fetchData();
    } catch { setMessage(`❌ Error saving ${name}`); }
    setSaving(null);
    setTimeout(() => setMessage(""), 3000);
  };

  const share = async (id: string, name: string) => {
    setSharing(id);
    try {
      await axios.patch(`${API}/appraisal/share/${id}`);
      setMessage(`✅ Shared with ${name}`);
      fetchData();
    } catch { setMessage("❌ Error sharing"); }
    setSharing(null);
    setTimeout(() => setMessage(""), 3000);
  };

  const WO = ["ATTENDED 41 TO 50:-  2 MARKS", "ATTENDED 21 TO 30:- 1.5 MARKS", "ATTENDED 10 TO 20:- 1 MARKS"];
  const TR = ["CONDUCTED 2 TRAINING:- 2 MARKS", "CONDUCTED 1 TRAINING:- 1 MARKS"];
  const BR = ["8 & ABOVE:- 2 MARKS", "6 - 8:- 1.5 MARKS", "4 - 6:- 1 MARKS"];
  const AR = ["2 & ABOVE:- 2 MARKS", "1 - 2:- 1 MARKS"];
  const ST = ["2 & ABOVE:- 2 MARKS", "1 - 2:- 1 MARKS"];
  const TW = ["HIGHLY CO-OPERATIVE: 2 MARKS", "GENERALLY CO-OPERATIVE: 1 MARKS", "SOMETIMES CO-OPERATIVE: 0 MARKS"];
  const AT = ["RESPECTFULL & FAIR TOWARDS STUDENTS:- 2 MARKS", "SOMETIMES RESPECTFULL & FAIR:- 1 MARKS", "UNFAIR:- 0 MARKS"];
  const CV = ["FULLY COMMITTED & ACTIVITY PROMOTES SCHOOL VALUES:- 2 MARKS", "GENERALLY COMMITTED & SUPPORT TO SCHOOL VALUES:- 1 MARKS", "RARELY FOLLOWS & COMMITTED:- 0 MARKS"];
  const AD = ["HIGHLY ADAPTABLE & FLEXIBLE:- 2 MARKS", "GENERALLY ADAPTABLE & FLEXIBLE:- 1 MARKS", "STRUGGLES WITH ADAPTABILITY:- 0 MARKS"];
  const DR = ["ALWAYS CLEAN, NEAT & WELL PRESENTED PROFESIONALLY:- 2 MARKS", "GENERALLY CLEAN & NEAT WITH OCCASIONAL LAPSES:- 1 MARKS", "FREQUENTLY UNTIDY:- 0 MARKS"];
  const FB = ["BELOW 3:- 10%", "BELOW 5:- 8%", "BELOW 10:- 5%", "MORE THAN 10:- 2%"];
  const CL = ["BELOW 10 :- 3 MARKS", "11 TO 15 :- 5 MARKS", "16 TO 19 :- 8 MARKS", "20 & ABOVE :- 10 MARKS"];
  const EN = ["BELOW 3:- 10%", "BELOW 5:- 8%", "BELOW 10:- 5%", "MORE THAN 10:- 2%"];
  const RESP = [
    { key: "resp_phonics", label: "Phonics" },
    { key: "resp_math", label: "Math" },
    { key: "resp_reading", label: "Reading" },
    { key: "resp_handwriting", label: "Handwriting" },
    { key: "resp_kannada_reading", label: "Kannada Reading" },
    { key: "resp_notes_hw", label: "Notes/HW" },
    { key: "resp_library", label: "Library" },
    { key: "resp_parental_engagement", label: "Parental Engagement" },
    { key: "resp_below_a_students", label: "Below A Students" },
    { key: "resp_english_grammar", label: "English Grammar" },
    { key: "resp_others", label: "Others" },
  ];

  const th = "px-2 py-2 text-center text-xs font-semibold text-gray-700 border border-gray-200 bg-gray-50 whitespace-nowrap";
  const td = "px-2 py-1 border border-gray-200";

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800">Teachers Appraisal — {ACADEMIC_YEAR}</h1>
        <p className="text-sm text-gray-500">Principal View · All Teachers · Single Sheet</p>
      </div>

      {message && (
        <div className="mb-3 px-4 py-2 bg-green-50 border border-green-300 rounded text-sm text-green-800">{message}</div>
      )}

      <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
        <table className="text-xs bg-white border-collapse" style={{ minWidth: "2400px" }}>
          <thead>
            {/* Section heading row */}
            <tr>
              <th className={`${th} bg-indigo-700 text-white`} rowSpan={2}>Teacher Name</th>

              <th className={`${th} bg-blue-100 text-blue-800`} colSpan={7}>EXAM MARKS (50%)</th>
              <th className={`${th} bg-green-100 text-green-800`} colSpan={6}>SKILLS & KNOWLEDGE (10%)</th>
              <th className={`${th} bg-yellow-100 text-yellow-800`} colSpan={6}>BEHAVIOUR & ATTITUDE (10%)</th>
              <th className={`${th} bg-pink-100 text-pink-800`} colSpan={2}>PARENTS FEEDBACK (10%)</th>
              <th className={`${th} bg-purple-100 text-purple-800`} colSpan={5}>CLASSROOM TEACHING (10%)</th>
              <th className={`${th} bg-orange-100 text-orange-800`} colSpan={2}>ENGLISH COMM (5%)</th>
              <th className={`${th} bg-teal-100 text-teal-800`} colSpan={12}>RESPONSIBILITIES (5%)</th>
              <th className={`${th} bg-indigo-100 text-indigo-800`} colSpan={3}>SUMMARY</th>
            </tr>

            {/* Sub heading row */}
            <tr>
              {/* Exam */}
              {["PA 1","PA 2","PA 3","PA 4","SA 1","SA 2","Score"].map(h => <th key={h} className={th}>{h}</th>)}
              {/* Skills */}
              {["Workshops","Training","Books Read","Articles","Strategies","Score"].map(h => <th key={h} className={th}>{h}</th>)}
              {/* Behaviour */}
              {["Team Work","Attitude","Commitment","Adaptability","Dressing","Score"].map(h => <th key={h} className={th}>{h}</th>)}
              {/* Parents */}
              {["Feedback Band","Score"].map(h => <th key={h} className={th}>{h}</th>)}
              {/* Classroom */}
              {["Obs 1","Obs 2","Obs 3","Obs 4","Score"].map(h => <th key={h} className={th}>{h}</th>)}
              {/* English */}
              {["Band","Score"].map(h => <th key={h} className={th}>{h}</th>)}
              {/* Responsibilities */}
              {RESP.map(r => <th key={r.key} className={th}>{r.label}</th>)}
              <th className={th}>Score</th>
              {/* Summary */}
              {["Overall %","Shared","Action"].map(h => <th key={h} className={th}>{h}</th>)}
            </tr>
          </thead>

          <tbody>
            {teachers.length === 0 && (
              <tr>
                <td colSpan={50} className="text-center py-10 text-gray-400">
                  No teachers found. Add teachers from User Management first.
                </td>
              </tr>
            )}
            {teachers.map((t, idx) => {
              const a = appraisals[t.teacher_id] || {};
              const obs = (a.classroom_observations as any[]) || [{}, {}, {}, {}];
              return (
                <tr key={t.teacher_id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {/* Name + Save */}
                  <td className={`${td} font-semibold text-gray-800 sticky left-0 bg-white z-10 min-w-[160px]`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{t.teacher_name}</span>
                      <button
                        onClick={() => save(t.teacher_id, t.teacher_name)}
                        disabled={saving === t.teacher_id}
                        className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        {saving === t.teacher_id ? "..." : "Save"}
                      </button>
                    </div>
                  </td>

                  {/* EXAM MARKS */}
                  {["pa1","pa2","pa3","pa4","sa1","sa2"].map(f => (
                    <td key={f} className={td}><Num value={a[f]} onChange={(v: any) => update(t.teacher_id, f, v)} /></td>
                  ))}
                  <Score value={a.exam_score} max={0.5} />

                  {/* SKILLS */}
                  <td className={td}><Select value={a.workshops} onChange={(v: any) => update(t.teacher_id, "workshops", v)} options={WO} /></td>
                  <td className={td}><Select value={a.training_sessions} onChange={(v: any) => update(t.teacher_id, "training_sessions", v)} options={TR} /></td>
                  <td className={td}><Select value={a.books_read} onChange={(v: any) => update(t.teacher_id, "books_read", v)} options={BR} /></td>
                  <td className={td}><Select value={a.articles_published} onChange={(v: any) => update(t.teacher_id, "articles_published", v)} options={AR} /></td>
                  <td className={td}><Select value={a.teaching_strategies} onChange={(v: any) => update(t.teacher_id, "teaching_strategies", v)} options={ST} /></td>
                  <Score value={a.skills_score} max={0.1} />

                  {/* BEHAVIOUR */}
                  <td className={td}><Select value={a.team_work} onChange={(v: any) => update(t.teacher_id, "team_work", v)} options={TW} /></td>
                  <td className={td}><Select value={a.attitude_towards_students} onChange={(v: any) => update(t.teacher_id, "attitude_towards_students", v)} options={AT} /></td>
                  <td className={td}><Select value={a.commitment_to_values} onChange={(v: any) => update(t.teacher_id, "commitment_to_values", v)} options={CV} /></td>
                  <td className={td}><Select value={a.adaptability} onChange={(v: any) => update(t.teacher_id, "adaptability", v)} options={AD} /></td>
                  <td className={td}><Select value={a.dressing} onChange={(v: any) => update(t.teacher_id, "dressing", v)} options={DR} /></td>
                  <Score value={a.behaviour_score} max={0.1} />

                  {/* PARENTS */}
                  <td className={td}><Select value={a.parents_feedback_band} onChange={(v: any) => update(t.teacher_id, "parents_feedback_band", v)} options={FB} /></td>
                  <Score value={a.parents_feedback_score} max={0.1} />

                  {/* CLASSROOM */}
                  {[0,1,2,3].map(i => (
                    <td key={i} className={td}><Select value={obs[i]?.band} onChange={(v: string) => updateObs(t.teacher_id, i, v)} options={CL} /></td>
                  ))}
                  <Score value={a.classroom_score} max={0.1} />

                  {/* ENGLISH */}
                  <td className={td}><Select value={a.english_comm_band} onChange={(v: any) => update(t.teacher_id, "english_comm_band", v)} options={EN} /></td>
                  <Score value={a.english_comm_score} max={0.05} />

                  {/* RESPONSIBILITIES */}
                  {RESP.map(r => (
                    <td key={r.key} className={`${td} text-center`}>
                      <Check value={a[r.key]} onChange={(v: any) => update(t.teacher_id, r.key, v)} />
                    </td>
                  ))}
                  <Score value={a.responsibilities_score} max={0.05} />

                  {/* SUMMARY */}
                  <td className={`${td} text-center font-bold text-indigo-800`}>
                    {a.overall_percentage ? (+a.overall_percentage).toFixed(1) + "%" : "-"}
                  </td>
                  <td className={`${td} text-center`}>
                    {a.is_shared
                      ? <span className="text-green-600 font-semibold text-xs">✅ Shared</span>
                      : <span className="text-gray-400 text-xs">No</span>}
                  </td>
                  <td className={`${td} text-center`}>
                    {a.id && !a.is_shared && (
                      <button
                        onClick={() => share(a.id, t.teacher_name)}
                        disabled={sharing === a.id}
                        className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        {sharing === a.id ? "..." : "Share"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}