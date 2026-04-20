import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "https://cbas-backend-production.up.railway.app";
const ACADEMIC_YEAR = "2025-26";

const GRADE_ORDER = ["Nursery","LKG","UKG","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];

const STAGE_GRADES: Record<string,string[]> = {
  Foundation:   ["Pre-KG","LKG","UKG","Nursery","Grade 1","Grade 2"],
  Preparatory:  ["Grade 3","Grade 4","Grade 5"],
  Middle:       ["Grade 6","Grade 7","Grade 8"],
  Secondary:    ["Grade 9","Grade 10"],
};
const STAGE_ORDER_LIST = ["Foundation","Preparatory","Middle","Secondary"];
function primaryStageOrder(assigned_classes: string[]): number {
  if (!assigned_classes?.length) return 99;
  let min = 99;
  assigned_classes.forEach(cls => {
    const idx = STAGE_ORDER_LIST.findIndex(s => STAGE_GRADES[s]?.includes(cls));
    if (idx !== -1 && idx < min) min = idx;
  });
  return min;
}
// Accepted qualifications per grade — exact match against dropdown values
const GRADE_CAPS: Record<string,{quals:string[],cap:number}> = {
  "Nursery":  {quals:["NTT","NST"],                                                    cap:17000},
  "LKG":      {quals:["NTT","NST"],                                                    cap:17000},
  "UKG":      {quals:["NTT","NST"],                                                    cap:17000},
  "Grade 1":  {quals:["NST","BED","DED"],                                              cap:19000},
  "Grade 2":  {quals:["NST","BED","DED"],                                              cap:19000},
  "Grade 3":  {quals:["NST","BED","DED"],                                              cap:19000},
  "Grade 4":  {quals:["BED","DED"],                                                    cap:21000},
  "Grade 5":  {quals:["BED","DED"],                                                    cap:21000},
  "Grade 6":  {quals:["BED","Graduation with BED"],                                    cap:23000},
  "Grade 7":  {quals:["BED","Graduation with BED"],                                    cap:23000},
  "Grade 8":  {quals:["Post Graduation with BED","Post Graduation"],                   cap:26000},
  "Grade 9":  {quals:["Post Graduation with BED","Post Graduation"],                   cap:26000},
  "Grade 10": {quals:["Post Graduation with BED","Post Graduation"],                   cap:26000},
};

function calcIncrement(overallPct: number, respCount: number, salary: number|null, highestGrade: string|null, qualification: string|null) {
  if (!overallPct) return { base: 0, extra: 0, penalty: 0, total: 0, note: "-" };
  const cap = highestGrade ? (GRADE_CAPS[highestGrade]?.cap || null) : null;
  const overCap = salary && cap ? salary > cap : false;

  let base = 0;
  if (overallPct >= 80)      base = overCap ? 10 : 15;
  else if (overallPct >= 70) base = overCap ? 8  : 12;
  else if (overallPct >= 51) base = overCap ? 6  : 8;
  else if (overallPct >= 50) base = 5;
  else                       base = 3;

  const extra = respCount > 0 ? respCount * 7 : 0;

  // Qualification penalty — null means not yet entered, no penalty applied
  const acceptedQuals = highestGrade ? (GRADE_CAPS[highestGrade]?.quals || []) : [];
  const hasQualPenalty = qualification !== null && acceptedQuals.length > 0 && respCount > 0
    && !acceptedQuals.includes(qualification);
  const penalty = hasQualPenalty ? 2 : 0;

  const total = base + extra - penalty;
  const note = `Base:${base}%${extra>0?` + Resp:${extra}%`:""}${penalty>0?` - Penalty:${penalty}%`:""}`;
  return { base, extra, penalty, total, note };
}

const Select = ({ value, onChange, options }: any) => (
  <select value={value||""} onChange={(e)=>onChange(e.target.value)}
    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white min-w-[160px]">
    <option value="">--</option>
    {options.map((o:string)=><option key={o} value={o}>{o}</option>)}
  </select>
);

const Num = ({ value, onChange }: any) => (
  <input type="number" min={0} max={100} value={value||""}
    onChange={(e)=>onChange(e.target.value)}
    className="w-14 text-xs border border-gray-300 rounded px-1 py-0.5 text-center" />
);

const Check = ({ value, onChange }: any) => (
  <input type="checkbox" checked={!!value} onChange={(e)=>onChange(e.target.checked)}
    className="w-4 h-4 accent-indigo-600" />
);

const Score = ({ value, max }: any) => {
  const v = value ? +value : 0;
  const pct = max ? ((v/max)*100).toFixed(1) : (v*100).toFixed(1);
  return (
    <td className="px-2 py-1 text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-gray-200">
      {value ? pct+"%" : "-"}
    </td>
  );
};

// Cell with optional comment
const CellWithComment = ({ children, tid, field, comment, onComment }: any) => {
  const [open, setOpen] = useState(false);
  return (
    <td className="px-2 py-1 border border-gray-200">
      <div className="flex items-center gap-1">
        <div className="flex-1">{children}</div>
        <button onClick={()=>setOpen(!open)} title="Add comment"
          className={`text-xs px-1 rounded ${comment?"text-yellow-600 font-bold":"text-gray-300 hover:text-gray-500"}`}>
          💬
        </button>
      </div>
      {open && (
        <textarea value={comment||""} onChange={e=>onComment(field+"_comment", e.target.value)}
          placeholder="Optional comment..."
          className="mt-1 w-full text-xs border border-gray-200 rounded px-1 py-0.5 resize-none"
          rows={2} />
      )}
    </td>
  );
};

const NURSERY_GRADES = ["Pre-KG","LKG","UKG","Nursery"];
function isNurseryTeacher(assigned_classes: string[]): boolean {
  if (!assigned_classes?.length) return false;
  return assigned_classes.every(c => NURSERY_GRADES.includes(c));
}

export default function AppraisalPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<Record<string,any>>({});
  const [teacherGrades, setTeacherGrades] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState<string|null>(null);
  const [sharing, setSharing] = useState<string|null>(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"nursery"|"others">("nursery");
  const theadRef = useRef<HTMLTableSectionElement>(null);

  useEffect(()=>{ fetchData(); fetchTeacherGrades(); },[]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/appraisal?academic_year=${ACADEMIC_YEAR}`);
      const sorted = [...res.data].sort((a:any,b:any) => {
        const stageDiff = primaryStageOrder(a.assigned_classes) - primaryStageOrder(b.assigned_classes);
        if (stageDiff !== 0) return stageDiff;
        return (a.teacher_name||"").localeCompare(b.teacher_name||"");
      });
      setTeachers(sorted);
      const map:Record<string,any> = {};
      res.data.forEach((t:any)=>{ map[t.teacher_id] = t.appraisal||{}; });
      setAppraisals(map);
    } catch { setTeachers([]); }
  };

  const fetchTeacherGrades = async () => {
    try {
      const res = await axios.get(`${API}/mappings/all?academic_year=${ACADEMIC_YEAR}`);
      const gradeMap: Record<string,string> = {};
      (res.data||[]).forEach((m:any) => {
        const tid = m.teacher_id;
        const g = m.grade;
        if (!g) return;
        const current = gradeMap[tid];
        if (!current || GRADE_ORDER.indexOf(g) > GRADE_ORDER.indexOf(current)) {
          gradeMap[tid] = g;
        }
      });
      setTeacherGrades(gradeMap);
    } catch {}
  };

  const update = (tid:string, field:string, value:any) => {
    setAppraisals(prev=>({...prev,[tid]:{...prev[tid],[field]:value}}));
  };

  const updateObs = (tid:string, i:number, value:string) => {
    const obs = [...((appraisals[tid]?.classroom_observations as any[])||[{},{},{},{}])];
    obs[i] = { band: value };
    update(tid, "classroom_observations", obs);
  };

  const save = async (tid:string, name:string) => {
    setSaving(tid);
    try {
      await axios.post(`${API}/appraisal/${tid}`,{...appraisals[tid], academic_year:ACADEMIC_YEAR, teacher_name:name});
      setMessage(`✅ Saved — ${name}`);
      fetchData();
    } catch { setMessage(`❌ Error saving ${name}`); }
    setSaving(null);
    setTimeout(()=>setMessage(""),3000);
  };

  const share = async (id:string, name:string) => {
    setSharing(id);
    try {
      await axios.patch(`${API}/appraisal/share/${id}`);
      setMessage(`✅ Shared with ${name}`);
      fetchData();
    } catch { setMessage("❌ Error sharing"); }
    setSharing(null);
    setTimeout(()=>setMessage(""),3000);
  };

  // Options — all include NOT APPLICABLE
  const NA = "NOT APPLICABLE :- 0 MARKS";
  const WO = ["ATTENDED 41 TO 50:- 2 MARKS","ATTENDED 21 TO 40:- 1.5 MARKS","ATTENDED 10 TO 20:- 1 MARK", NA];
  const TR = ["CONDUCTED 2 TRAINING:- 2 MARKS","CONDUCTED 1 TRAINING:- 1 MARK", NA];
  const BR = ["8 & ABOVE:- 2 MARKS","6 TO 8:- 1.5 MARKS","4 TO 6:- 1 MARK", NA];
  const AR = ["2 & ABOVE:- 2 MARKS","1 TO 2:- 1 MARK", NA];
  const ST = ["2 & ABOVE:- 2 MARKS","1 TO 2:- 1 MARK", NA];
  const TW = ["HIGHLY CO-OPERATIVE: 2 MARKS","GENERALLY CO-OPERATIVE: 1 MARK","SOMETIMES CO-OPERATIVE: 0 MARKS"];
  const AT = ["RESPECTFUL & FAIR TOWARDS STUDENTS:- 2 MARKS","SOMETIMES RESPECTFUL & FAIR:- 1 MARK","UNFAIR:- 0 MARKS"];
  const CV = ["FULLY COMMITTED & ACTIVELY PROMOTES SCHOOL VALUES:- 2 MARKS","GENERALLY COMMITTED & SUPPORTS SCHOOL VALUES:- 1 MARK","RARELY FOLLOWS & COMMITTED:- 0 MARKS"];
  const AD = ["HIGHLY ADAPTABLE & FLEXIBLE:- 2 MARKS","GENERALLY ADAPTABLE & FLEXIBLE:- 1 MARK","STRUGGLES WITH ADAPTABILITY:- 0 MARKS"];
  const DR = ["ALWAYS CLEAN, NEAT & WELL PRESENTED PROFESSIONALLY:- 2 MARKS","GENERALLY CLEAN & NEAT WITH OCCASIONAL LAPSES:- 1 MARK","FREQUENTLY UNTIDY:- 0 MARKS"];
  const FB = ["BELOW 3:- 10%","BELOW 5:- 8%","BELOW 10:- 5%","MORE THAN 10:- 2%"];
  const CL = ["BELOW 10:- 3 MARKS","11 TO 15:- 5 MARKS","16 TO 19:- 8 MARKS","20 & ABOVE:- 10 MARKS"];
  const EN = ["BELOW 3:- 10%","BELOW 5:- 8%","BELOW 10:- 5%","MORE THAN 10:- 2%"];
  const COMM = ["LEAD","MEMBER","NOT INVOLVED"];
  const RESP = [
    {key:"resp_phonics",label:"Phonics"},
    {key:"resp_math",label:"Math"},
    {key:"resp_reading",label:"Reading"},
    {key:"resp_handwriting",label:"Handwriting"},
    {key:"resp_kannada_reading",label:"Kannada Reading"},
    {key:"resp_notes_hw",label:"Notes/HW"},
    {key:"resp_library",label:"Library"},
    {key:"resp_parental_engagement",label:"Parental Engagement"},
    {key:"resp_below_a_students",label:"Below A Students"},
    {key:"resp_english_grammar",label:"English Grammar"},
    {key:"resp_others",label:"Others"},
  ];

  const th = "px-2 py-2 text-center text-xs font-semibold text-gray-700 border border-gray-200 whitespace-nowrap";
  const td = "px-2 py-1 border border-gray-200";

  return (
    <div className="p-4">
      <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Teachers Appraisal — {ACADEMIC_YEAR}</h1>
          <p className="text-sm text-gray-500">Principal View · Single Sheet</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {["Foundation","Preparatory","Middle","Secondary"].map(stage => {
            const count = teachers.filter(t => primaryStageOrder(t.assigned_classes) === STAGE_ORDER_LIST.indexOf(stage)).length;
            if (!count) return null;
            const colors: Record<string,string> = {
              Foundation:"bg-green-100 text-green-800", Preparatory:"bg-blue-100 text-blue-800",
              Middle:"bg-purple-100 text-purple-800", Secondary:"bg-orange-100 text-orange-800"
            };
            return <span key={stage} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${colors[stage]}`}>{stage}: {count}</span>;
          })}
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">Total: {teachers.length}</span>
        </div>
      </div>
      {message && <div className="mb-3 px-4 py-2 bg-green-50 border border-green-300 rounded text-sm text-green-800">{message}</div>}

      {/* ── TABS ── */}
      <div className="flex gap-2 mb-3">
        {([["nursery","Pre-KG / LKG / UKG"],["others","Grade 1 onwards"]] as const).map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${activeTab===tab?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}>
            {label} ({tab==="nursery"
              ? teachers.filter(t=>isNurseryTeacher(t.assigned_classes)).length
              : teachers.filter(t=>!isNurseryTeacher(t.assigned_classes)).length})
          </button>
        ))}
      </div>

      {/* ── NURSERY TABLE ── */}
      {activeTab==="nursery" && (
      <div className="overflow-auto rounded-lg shadow border border-gray-200" style={{maxHeight:"80vh"}}>
        <table className="text-xs bg-white border-collapse" style={{minWidth:"2000px"}}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th className={`${th} bg-indigo-700 text-white sticky left-0 z-30`} rowSpan={2}>Teacher Name</th>
              <th className={`${th} bg-pink-200 text-pink-900`} colSpan={2}>LITERACY (10%)</th>
              <th className={`${th} bg-blue-200 text-blue-900`} colSpan={2}>NUMERACY (10%)</th>
              <th className={`${th} bg-green-100 text-green-800`} colSpan={6}>SKILLS & KNOWLEDGE (10%)</th>
              <th className={`${th} bg-yellow-100 text-yellow-800`} colSpan={6}>BEHAVIOUR & ATTITUDE (10%)</th>
              <th className={`${th} bg-pink-100 text-pink-800`} colSpan={2}>PARENTS FEEDBACK (20%)</th>
              <th className={`${th} bg-purple-100 text-purple-800`} colSpan={2}>CLASSROOM TEACHING (20%)</th>
              <th className={`${th} bg-orange-100 text-orange-800`} colSpan={2}>ENGLISH COMM (20%)</th>
              <th className={`${th} bg-teal-100 text-teal-800`} colSpan={12}>RESPONSIBILITIES (Extra)</th>
              <th className={`${th} bg-rose-100 text-rose-800`} colSpan={2}>COMMITTEE</th>
              <th className={`${th} bg-indigo-100 text-indigo-800`} colSpan={4}>SUMMARY</th>
            </tr>
            <tr>
              {["Band","Score"].map(h=><th key={"lit"+h} className={`${th} bg-pink-50`}>{h}</th>)}
              {["Band","Score"].map(h=><th key={"num"+h} className={`${th} bg-blue-50`}>{h}</th>)}
              {["Workshops","Training","Books Read","Articles","Strategies","Score"].map(h=><th key={h} className={`${th} bg-green-50`}>{h}</th>)}
              {["Team Work","Attitude","Commitment","Adaptability","Dressing","Score"].map(h=><th key={h} className={`${th} bg-yellow-50`}>{h}</th>)}
              {["Feedback Band","Score"].map(h=><th key={"pf"+h} className={`${th} bg-pink-50`}>{h}</th>)}
              {["Observation","Score"].map(h=><th key={"cl"+h} className={`${th} bg-purple-50`}>{h}</th>)}
              {["Band","Score"].map(h=><th key={"en"+h} className={`${th} bg-orange-50`}>{h}</th>)}
              {RESP.map(r=><th key={r.key} className={`${th} bg-teal-50`}>{r.label}</th>)}
              <th className={`${th} bg-teal-50`}>Score</th>
              {["Role","Committee Name"].map(h=><th key={h} className={`${th} bg-rose-50`}>{h}</th>)}
              {["Overall %","Salary Increment","Shared","Action"].map(h=><th key={h} className={`${th} bg-indigo-50`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {teachers.filter(t=>isNurseryTeacher(t.assigned_classes)).length===0&&(
              <tr><td colSpan={40} className="text-center py-10 text-gray-400">No Pre-KG / LKG / UKG teachers found.</td></tr>
            )}
            {teachers.filter(t=>isNurseryTeacher(t.assigned_classes)).map((t,idx)=>{
              const a = appraisals[t.teacher_id]||{};
              const obs = (a.classroom_observations as any[])||[{}];
              const respCount = RESP.filter(r=>a[r.key]).length;
              const highestGrade = teacherGrades[t.teacher_id]||null;
              const qualification: string|null = t.appraisal_qualification||null;
              const salary: number|null = t.salary ? +t.salary : null;
              const inc = calcIncrement(a.overall_percentage ? +a.overall_percentage : 0, respCount, salary, highestGrade, qualification);
              const LIT = [
                "CREATIVE METHODS FOR PHONICS, VOCABULARY, READING & WRITING - EXCELLENT - 5",
                "REGULAR LITERACY PRACTICE USING STORIES, SONGS & WRITING - GOOD - 3",
                "IRREGULAR OR LESS ENGAGING LITERACY ACTIVITIES - NEEDS IMPROVEMENT - 2",
              ];
              const NUM = [
                "HANDS ON NUMBER CONCEPTS (COUNTING, PATTERNS, ETC) - EXCELLENT - 5 MARKS",
                "REGULAR USE OF BASIC MATH THROUGH WORKSHEETS & OBJECTS - GOOD - 3 MARKS",
                "LIMITED STRATEGIES OR IRREGULAR TEACHING - NEEDS IMPROVEMENT - 2 MARKS",
              ];
              return (
                <tr key={t.teacher_id} className={idx%2===0?"bg-white":"bg-gray-50"}>
                  <td className={`${td} font-semibold text-gray-800 sticky left-0 bg-white z-10 min-w-[160px]`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{t.teacher_name}</span>
                      <button onClick={()=>save(t.teacher_id,t.teacher_name)} disabled={saving===t.teacher_id}
                        className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
                        {saving===t.teacher_id?"...":"Save"}
                      </button>
                    </div>
                  </td>
                  {/* LITERACY */}
                  <td className={td}><Select value={a.literacy_band} onChange={(v:any)=>update(t.teacher_id,"literacy_band",v)} options={LIT}/></td>
                  <Score value={a.literacy_score} max={0.1}/>
                  {/* NUMERACY */}
                  <td className={td}><Select value={a.numeracy_band} onChange={(v:any)=>update(t.teacher_id,"numeracy_band",v)} options={NUM}/></td>
                  <Score value={a.numeracy_score} max={0.1}/>
                  {/* SKILLS */}
                  <CellWithComment tid={t.teacher_id} field="workshops" comment={a["workshops_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.workshops} onChange={(v:any)=>update(t.teacher_id,"workshops",v)} options={WO}/>
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="training_sessions" comment={a["training_sessions_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.training_sessions} onChange={(v:any)=>update(t.teacher_id,"training_sessions",v)} options={TR}/>
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="books_read" comment={a["books_read_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.books_read} onChange={(v:any)=>update(t.teacher_id,"books_read",v)} options={BR}/>
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="articles_published" comment={a["articles_published_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.articles_published} onChange={(v:any)=>update(t.teacher_id,"articles_published",v)} options={AR}/>
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="teaching_strategies" comment={a["teaching_strategies_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.teaching_strategies} onChange={(v:any)=>update(t.teacher_id,"teaching_strategies",v)} options={ST}/>
                  </CellWithComment>
                  <Score value={a.skills_score} max={0.1}/>
                  {/* BEHAVIOUR */}
                  <CellWithComment tid={t.teacher_id} field="team_work" comment={a["team_work_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.team_work} onChange={(v:any)=>update(t.teacher_id,"team_work",v)} options={TW}/>
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="attitude_towards_students" comment={a["attitude_towards_students_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.attitude_towards_students} onChange={(v:any)=>update(t.teacher_id,"attitude_towards_students",v)} options={AT}/>
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="commitment_to_values" comment={a["commitment_to_values_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.commitment_to_values} onChange={(v:any)=>update(t.teacher_id,"commitment_to_values",v)} options={CV}/>
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="adaptability" comment={a["adaptability_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.adaptability} onChange={(v:any)=>update(t.teacher_id,"adaptability",v)} options={AD}/>
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="dressing" comment={a["dressing_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.dressing} onChange={(v:any)=>update(t.teacher_id,"dressing",v)} options={DR}/>
                  </CellWithComment>
                  <Score value={a.behaviour_score} max={0.1}/>
                  {/* PARENTS FEEDBACK (20%) */}
                  <CellWithComment tid={t.teacher_id} field="parents_feedback_band" comment={a["parents_feedback_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.parents_feedback_band} onChange={(v:any)=>update(t.teacher_id,"parents_feedback_band",v)} options={FB}/>
                  </CellWithComment>
                  <Score value={a.parents_feedback_score} max={0.2}/>
                  {/* CLASSROOM (20%) */}
                  <CellWithComment tid={t.teacher_id} field="obs_0" comment={a["obs_0_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={obs[0]?.band} onChange={(v:string)=>updateObs(t.teacher_id,0,v)} options={CL}/>
                  </CellWithComment>
                  <Score value={a.classroom_score} max={0.2}/>
                  {/* ENGLISH (20%) */}
                  <CellWithComment tid={t.teacher_id} field="english_comm_band" comment={a["english_comm_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.english_comm_band} onChange={(v:any)=>update(t.teacher_id,"english_comm_band",v)} options={EN}/>
                  </CellWithComment>
                  <Score value={a.english_comm_score} max={0.2}/>
                  {/* RESPONSIBILITIES */}
                  {RESP.map(r=>(
                    <td key={r.key} className={`${td} text-center`}>
                      <Check value={a[r.key]} onChange={(v:boolean)=>update(t.teacher_id,r.key,v)}/>
                    </td>
                  ))}
                  <Score value={a.responsibilities_score} max={0.05}/>
                  {/* COMMITTEE */}
                  <CellWithComment tid={t.teacher_id} field="committee_role" comment={a["committee_role_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.committee_role} onChange={(v:any)=>update(t.teacher_id,"committee_role",v)} options={COMM}/>
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="committee_name" comment={a["committee_name_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <input type="text" value={a.committee_name||""} onChange={e=>update(t.teacher_id,"committee_name",e.target.value)}
                      placeholder="Committee name..." className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 min-w-[120px]"/>
                  </CellWithComment>
                  {/* SUMMARY */}
                  <td className={`${td} text-center font-bold text-indigo-800`}>
                    {a.overall_percentage ? (+a.overall_percentage).toFixed(1)+"%" : "-"}
                  </td>
                  <td className={`${td} text-center min-w-[120px]`}>
                    {a.overall_percentage ? (
                      <div>
                        <span className={`font-bold text-sm ${inc.total>=15?"text-green-700":inc.total>=8?"text-blue-700":"text-orange-700"}`}>{inc.total}%</span>
                        <p className="text-xs text-gray-400 leading-tight mt-0.5">{inc.note}</p>
                        {!qualification&&<p className="text-xs text-gray-300 italic">Qual: pending</p>}
                      </div>
                    ) : "-"}
                  </td>
                  <td className={`${td} text-center`}>
                    {a.is_shared?<span className="text-green-600 font-semibold text-xs">✅ Shared</span>:<span className="text-gray-400 text-xs">No</span>}
                  </td>
                  <td className={`${td} text-center`}>
                    <div className="flex flex-col gap-1 items-center">
                      <button onClick={()=>save(t.teacher_id,t.teacher_name)} disabled={saving===t.teacher_id}
                        className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50 w-full">
                        {saving===t.teacher_id?"...":"Save"}
                      </button>
                      {a.id&&!a.is_shared&&(
                        <button onClick={()=>share(a.id,t.teacher_name)} disabled={sharing===a.id}
                          className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50 w-full">
                          {sharing===a.id?"...":"Share"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* ── GRADE 1 ONWARDS TABLE ── */}
      {activeTab==="others" && (
      <div className="overflow-auto rounded-lg shadow border border-gray-200" style={{maxHeight:"80vh"}}>
        <table className="text-xs bg-white border-collapse" style={{minWidth:"2800px"}}>
          <thead ref={theadRef} className="sticky top-0 z-20">
            <tr>
              <th className={`${th} bg-indigo-700 text-white sticky left-0 z-30`} rowSpan={2}>Teacher Name</th>
              <th className={`${th} bg-blue-100 text-blue-800`} colSpan={7}>EXAM MARKS (50%)</th>
              <th className={`${th} bg-green-100 text-green-800`} colSpan={6}>SKILLS & KNOWLEDGE (10%)</th>
              <th className={`${th} bg-yellow-100 text-yellow-800`} colSpan={6}>BEHAVIOUR & ATTITUDE (10%)</th>
              <th className={`${th} bg-pink-100 text-pink-800`} colSpan={2}>PARENTS FEEDBACK (10%)</th>
              <th className={`${th} bg-purple-100 text-purple-800`} colSpan={2}>CLASSROOM TEACHING (10%)</th>
              <th className={`${th} bg-orange-100 text-orange-800`} colSpan={2}>ENGLISH COMM (5%)</th>
              <th className={`${th} bg-teal-100 text-teal-800`} colSpan={12}>RESPONSIBILITIES (5%)</th>
              <th className={`${th} bg-rose-100 text-rose-800`} colSpan={2}>COMMITTEE</th>
              <th className={`${th} bg-indigo-100 text-indigo-800`} colSpan={4}>SUMMARY</th>
            </tr>
            <tr>
              {["PA 1","PA 2","PA 3","PA 4","SA 1","SA 2","Score"].map(h=><th key={h} className={`${th} bg-blue-50`}>{h}</th>)}
              {["Workshops","Training","Books Read","Articles","Strategies","Score"].map(h=><th key={h} className={`${th} bg-green-50`}>{h}</th>)}
              {["Team Work","Attitude","Commitment","Adaptability","Dressing","Score"].map(h=><th key={h} className={`${th} bg-yellow-50`}>{h}</th>)}
              {["Feedback Band","Score"].map(h=><th key={h} className={`${th} bg-pink-50`}>{h}</th>)}
              {["Observation","Score"].map(h=><th key={h} className={`${th} bg-purple-50`}>{h}</th>)}
              {["Band","Score"].map(h=><th key={h} className={`${th} bg-orange-50`}>{h}</th>)}
              {RESP.map(r=><th key={r.key} className={`${th} bg-teal-50`}>{r.label}</th>)}
              <th className={`${th} bg-teal-50`}>Score</th>
              {["Role","Committee Name"].map(h=><th key={h} className={`${th} bg-rose-50`}>{h}</th>)}
              {["Overall %","Salary Increment","Shared","Action"].map(h=><th key={h} className={`${th} bg-indigo-50`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {teachers.filter(t=>!isNurseryTeacher(t.assigned_classes)).length===0&&(
              <tr><td colSpan={55} className="text-center py-10 text-gray-400">No teachers found.</td></tr>
            )}
            {teachers.filter(t=>!isNurseryTeacher(t.assigned_classes)).map((t,idx)=>{
              const a = appraisals[t.teacher_id]||{};
              const obs = (a.classroom_observations as any[])||[{},{},{},{}];
              const respCount = RESP.filter(r=>a[r.key]).length;
              const highestGrade = teacherGrades[t.teacher_id]||null;
              const qualification: string|null = t.appraisal_qualification||null;
              const salary: number|null = t.salary ? +t.salary : null;
              const inc = calcIncrement(a.overall_percentage ? +a.overall_percentage : 0, respCount, salary, highestGrade, qualification);

              return (
                <tr key={t.teacher_id} className={idx%2===0?"bg-white":"bg-gray-50"}>
                  <td className={`${td} font-semibold text-gray-800 sticky left-0 bg-white z-10 min-w-[160px]`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{t.teacher_name}</span>
                      <button onClick={()=>save(t.teacher_id,t.teacher_name)} disabled={saving===t.teacher_id}
                        className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
                        {saving===t.teacher_id?"...":"Save"}
                      </button>
                    </div>
                  </td>

                  {/* EXAM MARKS */}
                  {["pa1","pa2","pa3","pa4","sa1","sa2"].map(f=>(
                    <CellWithComment key={f} tid={t.teacher_id} field={f} comment={a[f+"_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                      <Num value={a[f]} onChange={(v:any)=>update(t.teacher_id,f,v)} />
                    </CellWithComment>
                  ))}
                  <Score value={a.exam_score} max={0.5} />

                  {/* SKILLS */}
                  <CellWithComment tid={t.teacher_id} field="workshops" comment={a["workshops_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.workshops} onChange={(v:any)=>update(t.teacher_id,"workshops",v)} options={WO} />
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="training_sessions" comment={a["training_sessions_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.training_sessions} onChange={(v:any)=>update(t.teacher_id,"training_sessions",v)} options={TR} />
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="books_read" comment={a["books_read_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.books_read} onChange={(v:any)=>update(t.teacher_id,"books_read",v)} options={BR} />
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="articles_published" comment={a["articles_published_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.articles_published} onChange={(v:any)=>update(t.teacher_id,"articles_published",v)} options={AR} />
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="teaching_strategies" comment={a["teaching_strategies_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.teaching_strategies} onChange={(v:any)=>update(t.teacher_id,"teaching_strategies",v)} options={ST} />
                  </CellWithComment>
                  <Score value={a.skills_score} max={0.1} />

                  {/* BEHAVIOUR */}
                  <CellWithComment tid={t.teacher_id} field="team_work" comment={a["team_work_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.team_work} onChange={(v:any)=>update(t.teacher_id,"team_work",v)} options={TW} />
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="attitude_towards_students" comment={a["attitude_towards_students_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.attitude_towards_students} onChange={(v:any)=>update(t.teacher_id,"attitude_towards_students",v)} options={AT} />
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="commitment_to_values" comment={a["commitment_to_values_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.commitment_to_values} onChange={(v:any)=>update(t.teacher_id,"commitment_to_values",v)} options={CV} />
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="adaptability" comment={a["adaptability_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.adaptability} onChange={(v:any)=>update(t.teacher_id,"adaptability",v)} options={AD} />
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="dressing" comment={a["dressing_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.dressing} onChange={(v:any)=>update(t.teacher_id,"dressing",v)} options={DR} />
                  </CellWithComment>
                  <Score value={a.behaviour_score} max={0.1} />

                  {/* PARENTS */}
                  <CellWithComment tid={t.teacher_id} field="parents_feedback_band" comment={a["parents_feedback_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.parents_feedback_band} onChange={(v:any)=>update(t.teacher_id,"parents_feedback_band",v)} options={FB} />
                  </CellWithComment>
                  <Score value={a.parents_feedback_score} max={0.1} />

                  {/* CLASSROOM — Single Observation */}
                  <CellWithComment tid={t.teacher_id} field="obs_0" comment={a["obs_0_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={obs[0]?.band} onChange={(v:string)=>updateObs(t.teacher_id,0,v)} options={CL} />
                  </CellWithComment>
                  <Score value={a.classroom_score} max={0.1} />

                  {/* ENGLISH */}
                  <CellWithComment tid={t.teacher_id} field="english_comm_band" comment={a["english_comm_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.english_comm_band} onChange={(v:any)=>update(t.teacher_id,"english_comm_band",v)} options={EN} />
                  </CellWithComment>
                  <Score value={a.english_comm_score} max={0.05} />

                  {/* RESPONSIBILITIES */}
                  {RESP.map(r=>(
                    <td key={r.key} className={`${td} text-center`}>
                      <Check value={a[r.key]} onChange={(v:any)=>update(t.teacher_id,r.key,v)} />
                    </td>
                  ))}
                  <Score value={a.responsibilities_score} max={0.05} />

                  {/* COMMITTEE */}
                  <CellWithComment tid={t.teacher_id} field="committee_role" comment={a["committee_role_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.committee_role} onChange={(v:any)=>update(t.teacher_id,"committee_role",v)} options={COMM} />
                  </CellWithComment>
                  <CellWithComment tid={t.teacher_id} field="committee_name" comment={a["committee_name_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <input type="text" value={a.committee_name||""} onChange={e=>update(t.teacher_id,"committee_name",e.target.value)}
                      placeholder="Committee name..."
                      className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 min-w-[140px]" />
                  </CellWithComment>

                  {/* SUMMARY */}
                  <td className={`${td} text-center font-bold text-indigo-800`}>
                    {a.overall_percentage ? (+a.overall_percentage).toFixed(1)+"%" : "-"}
                  </td>
                  <td className={`${td} text-center min-w-[120px]`}>
                    {a.overall_percentage ? (
                      <div>
                        <span className={`font-bold text-sm ${inc.total>=15?"text-green-700":inc.total>=8?"text-blue-700":"text-orange-700"}`}>
                          {inc.total}%
                        </span>
                        <p className="text-xs text-gray-400 leading-tight mt-0.5">{inc.note}</p>
                        {!qualification && <p className="text-xs text-gray-300 italic">Qual: pending</p>}
                      </div>
                    ) : "-"}
                  </td>
                  <td className={`${td} text-center`}>
                    {a.is_shared
                      ? <span className="text-green-600 font-semibold text-xs">✅ Shared</span>
                      : <span className="text-gray-400 text-xs">No</span>}
                  </td>
                  <td className={`${td} text-center`}>
                    {a.id&&!a.is_shared&&(
                      <button onClick={()=>share(a.id,t.teacher_name)} disabled={sharing===a.id}
                        className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50">
                        {sharing===a.id?"...":"Share"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
