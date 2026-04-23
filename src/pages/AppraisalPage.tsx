import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const API = "https://cbas-backend-production.up.railway.app";

const GRADE_ORDER = ["Nursery","LKG","UKG","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];

const STAGE_GRADES: Record<string,string[]> = {
  Foundation:   ["Pre-KG","LKG","UKG","Nursery","Grade 1","Grade 2"],
  Preparatory:  ["Grade 3","Grade 4","Grade 5"],
  Middle:       ["Grade 6","Grade 7","Grade 8"],
  Secondary:    ["Grade 9","Grade 10"],
};
const STAGE_ORDER_LIST = ["Foundation","Preparatory","Middle","Secondary"];

function getStage(assigned_classes: string[]): string {
  if (!assigned_classes?.length) return "";
  for (const s of STAGE_ORDER_LIST) {
    if (STAGE_GRADES[s]?.some(g => assigned_classes.includes(g))) return s;
  }
  return "";
}
function primaryStageOrder(assigned_classes: string[]): number {
  if (!assigned_classes?.length) return 99;
  let min = 99;
  assigned_classes.forEach(cls => {
    const idx = STAGE_ORDER_LIST.findIndex(s => STAGE_GRADES[s]?.includes(cls));
    if (idx !== -1 && idx < min) min = idx;
  });
  return min;
}

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

  const acceptedQuals = highestGrade ? (GRADE_CAPS[highestGrade]?.quals || []) : [];
  const hasQualPenalty = qualification !== null && acceptedQuals.length > 0 && respCount > 0
    && !acceptedQuals.includes(qualification);
  const penalty = hasQualPenalty ? 2 : 0;

  const total = base + extra - penalty;
  const note = `Base:${base}%${extra>0?` + Resp:${extra}%`:""}${penalty>0?` - Penalty:${penalty}%`:""}`;
  return { base, extra, penalty, total, note };
}

function timeAgo(dateStr: string|null|undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

function getStatus(t: any): "pending"|"saved"|"shared" {
  if (!t.appraisal) return "pending";
  if (t.appraisal.is_shared) return "shared";
  return "saved";
}

const StatusBadge = ({ status }: { status: "pending"|"saved"|"shared" }) => {
  if (status === "shared") return <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✅ Shared</span>;
  if (status === "saved")  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">💾 Saved</span>;
  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">⏳ Pending</span>;
};

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

const CellWithComment = ({ children, field, comment, onComment }: any) => {
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

const YEARS = ["2023-24","2024-25","2025-26","2026-27"];

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

export default function AppraisalPage() {
  const [year, setYear] = useState("2025-26");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<Record<string,any>>({});
  const [teacherGrades, setTeacherGrades] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState<string|null>(null);
  const [sharing, setSharing] = useState<string|null>(null);
  const [unsharing, setUnsharing] = useState<string|null>(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"nursery"|"others">("nursery");

  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterStatus, setFilterStatus] = useState<""|"pending"|"saved"|"shared">("");
  const [showShareConfirm, setShowShareConfirm] = useState<{id:string,name:string}|null>(null);

  const theadRef = useRef<HTMLTableSectionElement>(null);

  useEffect(()=>{ fetchData(); fetchTeacherGrades(); },[year]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/appraisal?academic_year=${year}`);
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
      const res = await axios.get(`${API}/mappings/all?academic_year=${year}`);
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

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(()=>setMessage(""),4000); };

  const update = (tid:string, field:string, value:any) => {
    setAppraisals(prev=>({...prev,[tid]:{...prev[tid],[field]:value}}));
  };

  const save = async (tid:string, name:string) => {
    setSaving(tid);
    try {
      await axios.post(`${API}/appraisal/${tid}`,{...appraisals[tid], academic_year:year, teacher_name:name});
      showMsg(`✅ Saved — ${name}`);
      fetchData();
    } catch { showMsg(`❌ Error saving ${name}`); }
    setSaving(null);
  };

  const share = async (id:string, name:string) => {
    setShowShareConfirm(null);
    setSharing(id);
    try {
      await axios.patch(`${API}/appraisal/share/${id}`);
      showMsg(`✅ Shared with ${name}`);
      fetchData();
    } catch { showMsg("❌ Error sharing"); }
    setSharing(null);
  };

  const unshare = async (id:string, name:string) => {
    setUnsharing(id);
    try {
      await axios.patch(`${API}/appraisal/unshare/${id}`);
      showMsg(`✅ Recalled appraisal for ${name}`);
      fetchData();
    } catch { showMsg("❌ Error recalling"); }
    setUnsharing(null);
  };

  const exportToExcel = () => {
    const rows = teachers.map(t => {
      const a = t.appraisal || {};
      const rc = RESP.filter(r=>a[r.key]).length;
      const hg = teacherGrades[t.teacher_id]||null;
      const q = t.appraisal_qualification||null;
      const inc = calcIncrement(a.overall_percentage ? +a.overall_percentage : 0, rc, t.salary?+t.salary:null, hg, q);
      return {
        "Name": t.teacher_name,
        "Qualification": q || "",
        "Stage": getStage(t.assigned_classes),
        "Classes": (t.assigned_classes||[]).join(", "),
        "Status": getStatus(t),
        "Overall %": a.overall_percentage ? (+a.overall_percentage).toFixed(1) : "",
        "Increment %": inc.total || "",
        "Increment Note": inc.note,
        "Shared": a.is_shared ? "Yes" : "No",
        "Last Saved": a.updated_at ? new Date(a.updated_at).toLocaleDateString() : "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Appraisals");
    XLSX.writeFile(wb, `appraisals_${year}.xlsx`);
  };

  const filteredTeachers = teachers.filter(t => {
    if (search && !t.teacher_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStage && getStage(t.assigned_classes) !== filterStage) return false;
    if (filterStatus && getStatus(t) !== filterStatus) return false;
    return true;
  });

  const sharedCount  = teachers.filter(t => t.appraisal?.is_shared).length;
  const savedCount   = teachers.filter(t => t.appraisal && !t.appraisal.is_shared).length;
  const pendingCount = teachers.filter(t => !t.appraisal).length;
  const scoredList   = teachers.filter(t => t.appraisal?.overall_percentage);
  const avgScore     = scoredList.length ? scoredList.reduce((s,t)=>s+(+t.appraisal.overall_percentage),0)/scoredList.length : 0;

  const NA = "NOT APPLICABLE :- 0 MARKS";
  const WO = ["ATTENDED 41 TO 50:- 2 MARKS","ATTENDED 21 TO 40:- 1.5 MARKS","ATTENDED 10 TO 20:- 1 MARK",NA];
  const TR = ["CONDUCTED 2 TRAINING:- 2 MARKS","CONDUCTED 1 TRAINING:- 1 MARK",NA];
  const BR = ["8 & ABOVE:- 2 MARKS","6 TO 8:- 1.5 MARKS","4 TO 6:- 1 MARK",NA];
  const AR = ["2 & ABOVE:- 2 MARKS","1 TO 2:- 1 MARK",NA];
  const ST = ["2 & ABOVE:- 2 MARKS","1 TO 2:- 1 MARK",NA];
  const TW = ["HIGHLY CO-OPERATIVE: 2 MARKS","GENERALLY CO-OPERATIVE: 1 MARK","SOMETIMES CO-OPERATIVE: 0 MARKS"];
  const AT = ["RESPECTFUL & FAIR TOWARDS STUDENTS:- 2 MARKS","SOMETIMES RESPECTFUL & FAIR:- 1 MARK","UNFAIR:- 0 MARKS"];
  const CV = ["FULLY COMMITTED & ACTIVELY PROMOTES SCHOOL VALUES:- 2 MARKS","GENERALLY COMMITTED & SUPPORTS SCHOOL VALUES:- 1 MARK","RARELY FOLLOWS & COMMITTED:- 0 MARKS"];
  const AD = ["HIGHLY ADAPTABLE & FLEXIBLE:- 2 MARKS","GENERALLY ADAPTABLE & FLEXIBLE:- 1 MARK","STRUGGLES WITH ADAPTABILITY:- 0 MARKS"];
  const DR = ["ALWAYS CLEAN, NEAT & WELL PRESENTED PROFESSIONALLY:- 2 MARKS","GENERALLY CLEAN & NEAT WITH OCCASIONAL LAPSES:- 1 MARK","FREQUENTLY UNTIDY:- 0 MARKS"];
  const FB = ["BELOW 3:- 10%","BELOW 5:- 8%","BELOW 10:- 5%","MORE THAN 10:- 2%"];
  const CL = ["BELOW 10:- 3 MARKS","11 TO 15:- 5 MARKS","16 TO 19:- 8 MARKS","20 & ABOVE:- 10 MARKS"];
  const EN = ["BELOW 3:- 10%","BELOW 5:- 8%","BELOW 10:- 5%","MORE THAN 10:- 2%"];
  const COMM = ["LEAD","MEMBER","NOT INVOLVED"];

  const th = "px-2 py-2 text-center text-xs font-semibold text-gray-700 border border-gray-200 whitespace-nowrap";
  const td = "px-2 py-1 border border-gray-200";

  const renderNameCell = (t: any) => {
    const a = appraisals[t.teacher_id]||{};
    const status = getStatus(t);
    return (
      <td className={`${td} sticky left-0 bg-white z-10 min-w-[170px]`}>
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-xs text-gray-800 truncate">{t.teacher_name}</div>
            <StatusBadge status={status} />
            {a.updated_at && <div className="text-xs text-gray-400 mt-0.5">{timeAgo(a.updated_at)}</div>}
            {t.appraisal_qualification && <div className="text-xs text-indigo-400 italic truncate">{t.appraisal_qualification}</div>}
          </div>
          <button onClick={()=>save(t.teacher_id,t.teacher_name)} disabled={saving===t.teacher_id}
            className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap shrink-0">
            {saving===t.teacher_id?"...":"Save"}
          </button>
        </div>
      </td>
    );
  };

  const renderSummaryCells = (t: any) => {
    const a = appraisals[t.teacher_id]||{};
    const rc = RESP.filter(r=>a[r.key]).length;
    const hg = teacherGrades[t.teacher_id]||null;
    const q: string|null = t.appraisal_qualification||null;
    const salary: number|null = t.salary ? +t.salary : null;
    const inc = calcIncrement(a.overall_percentage ? +a.overall_percentage : 0, rc, salary, hg, q);
    return (
      <>
        <td className={`${td} text-center font-bold text-indigo-800`}>
          {a.overall_percentage ? (+a.overall_percentage).toFixed(1)+"%" : "-"}
        </td>
        <td className={`${td} text-center min-w-[140px]`}>
          {a.overall_percentage ? (
            <div>
              <span className={`font-bold text-sm ${inc.total>=15?"text-green-700":inc.total>=8?"text-blue-700":"text-orange-700"}`}>{inc.total}%</span>
              <p className="text-xs text-gray-400 leading-tight mt-0.5">{inc.note}</p>
              {!q && <p className="text-xs text-gray-300 italic">Qual: pending</p>}
            </div>
          ) : "-"}
        </td>
        <td className={`${td} text-center`}>
          {a.is_shared ? <span className="text-green-600 font-semibold text-xs">✅ Shared</span> : <span className="text-gray-400 text-xs">No</span>}
        </td>
        <td className={`${td} text-center`}>
          <div className="flex flex-col gap-1 items-center">
            {a.id && !a.is_shared && (
              <button onClick={()=>setShowShareConfirm({id:a.id,name:t.teacher_name})} disabled={sharing===a.id}
                className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50 whitespace-nowrap">
                {sharing===a.id?"...":"Share"}
              </button>
            )}
            {a.id && a.is_shared && (
              <button onClick={()=>unshare(a.id,t.teacher_name)} disabled={unsharing===a.id}
                className="px-2 py-0.5 bg-orange-400 text-white text-xs rounded hover:bg-orange-500 disabled:opacity-50 whitespace-nowrap">
                {unsharing===a.id?"...":"Recall"}
              </button>
            )}
          </div>
        </td>
      </>
    );
  };

  const renderFooter = (rows: any[], colSpan: number) => {
    const evaluated = rows.filter(t => t.appraisal?.overall_percentage);
    const avgPct = evaluated.length ? evaluated.reduce((s,t)=>s+(+t.appraisal.overall_percentage),0)/evaluated.length : 0;
    const avgInc = evaluated.length
      ? evaluated.reduce((acc,t) => {
          const a = appraisals[t.teacher_id]||{};
          const rc = RESP.filter(r=>a[r.key]).length;
          const inc = calcIncrement(+a.overall_percentage, rc, t.salary?+t.salary:null, teacherGrades[t.teacher_id]||null, t.appraisal_qualification||null);
          return acc + inc.total;
        }, 0) / evaluated.length
      : 0;
    return (
      <tfoot>
        <tr className="bg-indigo-50 font-semibold text-xs text-indigo-800 border-t-2 border-indigo-200">
          <td className="px-2 py-2 sticky left-0 bg-indigo-50 z-10">
            {rows.length} teachers · {rows.length - evaluated.length} pending
          </td>
          <td colSpan={colSpan - 5} className="px-2 py-2 text-center text-indigo-500 text-xs">
            Evaluated: {evaluated.length} / {rows.length}
          </td>
          <td className="px-2 py-2 text-center">{avgPct > 0 ? avgPct.toFixed(1)+"%" : "-"}</td>
          <td className="px-2 py-2 text-center">{avgInc > 0 ? `~${avgInc.toFixed(1)}%` : "-"}</td>
          <td className="px-2 py-2 text-center">{rows.filter(t=>t.appraisal?.is_shared).length} shared</td>
          <td className="px-2 py-2"></td>
        </tr>
      </tfoot>
    );
  };

  const nurseryRows = filteredTeachers.filter(t=>isNurseryTeacher(t.assigned_classes));
  const otherRows   = filteredTeachers.filter(t=>!isNurseryTeacher(t.assigned_classes));

  return (
    <div className="p-4">
      {/* ── HEADER ── */}
      <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Teachers Appraisal</h1>
          <p className="text-sm text-gray-500">Principal View · Single Sheet</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Academic Year:</label>
            <select value={year} onChange={e=>{ setYear(e.target.value); setSearch(""); setFilterStage(""); setFilterStatus(""); }}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm font-semibold text-indigo-700 bg-white">
              {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {STAGE_ORDER_LIST.map(stage => {
            const count = teachers.filter(t => getStage(t.assigned_classes) === stage).length;
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

      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {[
          { label:"Total Teachers", value: teachers.length, color:"bg-gray-50 border-gray-200 text-gray-800" },
          { label:"Shared", value: sharedCount, color:"bg-green-50 border-green-200 text-green-800" },
          { label:"Saved (Not shared)", value: savedCount, color:"bg-yellow-50 border-yellow-200 text-yellow-800" },
          { label:"Pending", value: pendingCount, color:"bg-red-50 border-red-200 text-red-800" },
          { label:"Avg Score", value: avgScore > 0 ? avgScore.toFixed(1)+"%" : "-", color:"bg-indigo-50 border-indigo-200 text-indigo-800" },
        ].map(s=>(
          <div key={s.label} className={`rounded-lg border px-3 py-2 ${s.color}`}>
            <p className="text-xs opacity-70">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {message && <div className="mb-3 px-4 py-2 bg-green-50 border border-green-300 rounded text-sm text-green-800">{message}</div>}

      {/* ── FILTER BAR ── */}
      <div className="flex gap-3 mb-3 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Search Teacher</label>
          <input type="text" placeholder="Name..." value={search} onChange={e=>setSearch(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-44" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Stage</label>
          <select value={filterStage} onChange={e=>setFilterStage(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">All Stages</option>
            {STAGE_ORDER_LIST.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Status</label>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value as any)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">All</option>
            <option value="pending">⏳ Pending</option>
            <option value="saved">💾 Saved</option>
            <option value="shared">✅ Shared</option>
          </select>
        </div>
        {(search||filterStage||filterStatus) && (
          <button onClick={()=>{ setSearch(""); setFilterStage(""); setFilterStatus(""); }}
            className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50 self-end">
            Clear
          </button>
        )}
        <div className="ml-auto self-end">
          <button onClick={exportToExcel}
            className="px-4 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium">
            📤 Export Excel
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-2 mb-3">
        {([["nursery","Pre-KG / LKG / UKG"],["others","Grade 1 onwards"]] as const).map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${activeTab===tab?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}>
            {label} ({tab==="nursery" ? nurseryRows.length : otherRows.length})
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
            {nurseryRows.length===0&&(
              <tr><td colSpan={40} className="text-center py-10 text-gray-400">No Pre-KG / LKG / UKG teachers found.</td></tr>
            )}
            {nurseryRows.map((t,idx)=>{
              const a = appraisals[t.teacher_id]||{};
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
                  {renderNameCell(t)}
                  <td className={td}><Select value={a.literacy_band} onChange={(v:any)=>update(t.teacher_id,"literacy_band",v)} options={LIT}/></td>
                  <Score value={a.literacy_score} max={0.1}/>
                  <td className={td}><Select value={a.numeracy_band} onChange={(v:any)=>update(t.teacher_id,"numeracy_band",v)} options={NUM}/></td>
                  <Score value={a.numeracy_score} max={0.1}/>
                  <CellWithComment field="workshops" comment={a["workshops_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.workshops} onChange={(v:any)=>update(t.teacher_id,"workshops",v)} options={WO}/>
                  </CellWithComment>
                  <CellWithComment field="training_sessions" comment={a["training_sessions_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.training_sessions} onChange={(v:any)=>update(t.teacher_id,"training_sessions",v)} options={TR}/>
                  </CellWithComment>
                  <CellWithComment field="books_read" comment={a["books_read_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.books_read} onChange={(v:any)=>update(t.teacher_id,"books_read",v)} options={BR}/>
                  </CellWithComment>
                  <CellWithComment field="articles_published" comment={a["articles_published_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.articles_published} onChange={(v:any)=>update(t.teacher_id,"articles_published",v)} options={AR}/>
                  </CellWithComment>
                  <CellWithComment field="teaching_strategies" comment={a["teaching_strategies_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.teaching_strategies} onChange={(v:any)=>update(t.teacher_id,"teaching_strategies",v)} options={ST}/>
                  </CellWithComment>
                  <Score value={a.skills_score} max={0.1}/>
                  <CellWithComment field="team_work" comment={a["team_work_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.team_work} onChange={(v:any)=>update(t.teacher_id,"team_work",v)} options={TW}/>
                  </CellWithComment>
                  <CellWithComment field="attitude_towards_students" comment={a["attitude_towards_students_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.attitude_towards_students} onChange={(v:any)=>update(t.teacher_id,"attitude_towards_students",v)} options={AT}/>
                  </CellWithComment>
                  <CellWithComment field="commitment_to_values" comment={a["commitment_to_values_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.commitment_to_values} onChange={(v:any)=>update(t.teacher_id,"commitment_to_values",v)} options={CV}/>
                  </CellWithComment>
                  <CellWithComment field="adaptability" comment={a["adaptability_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.adaptability} onChange={(v:any)=>update(t.teacher_id,"adaptability",v)} options={AD}/>
                  </CellWithComment>
                  <CellWithComment field="dressing" comment={a["dressing_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.dressing} onChange={(v:any)=>update(t.teacher_id,"dressing",v)} options={DR}/>
                  </CellWithComment>
                  <Score value={a.behaviour_score} max={0.1}/>
                  <CellWithComment field="parents_feedback_band" comment={a["parents_feedback_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.parents_feedback_band} onChange={(v:any)=>update(t.teacher_id,"parents_feedback_band",v)} options={FB}/>
                  </CellWithComment>
                  <Score value={a.parents_feedback_score} max={0.2}/>
                  <CellWithComment field="obs_0" comment={a["obs_0_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.classroom_observation_band} onChange={(v:string)=>update(t.teacher_id,"classroom_observation_band",v)} options={CL}/>
                  </CellWithComment>
                  <Score value={a.classroom_score} max={0.2}/>
                  <CellWithComment field="english_comm_band" comment={a["english_comm_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.english_comm_band} onChange={(v:any)=>update(t.teacher_id,"english_comm_band",v)} options={EN}/>
                  </CellWithComment>
                  <Score value={a.english_comm_score} max={0.2}/>
                  {RESP.map(r=>(
                    <td key={r.key} className={`${td} text-center`}>
                      <Check value={a[r.key]} onChange={(v:boolean)=>update(t.teacher_id,r.key,v)}/>
                    </td>
                  ))}
                  <Score value={a.responsibilities_score} max={0.05}/>
                  <CellWithComment field="committee_role" comment={a["committee_role_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.committee_role} onChange={(v:any)=>update(t.teacher_id,"committee_role",v)} options={COMM}/>
                  </CellWithComment>
                  <CellWithComment field="committee_name" comment={a["committee_name_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <input type="text" value={a.committee_name||""} onChange={e=>update(t.teacher_id,"committee_name",e.target.value)}
                      placeholder="Committee name..." className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 min-w-[120px]"/>
                  </CellWithComment>
                  {renderSummaryCells(t)}
                </tr>
              );
            })}
          </tbody>
          {renderFooter(nurseryRows, 40)}
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
            {otherRows.length===0&&(
              <tr><td colSpan={55} className="text-center py-10 text-gray-400">No teachers found.</td></tr>
            )}
            {otherRows.map((t,idx)=>{
              const a = appraisals[t.teacher_id]||{};
              return (
                <tr key={t.teacher_id} className={idx%2===0?"bg-white":"bg-gray-50"}>
                  {renderNameCell(t)}
                  {["pa1","pa2","pa3","pa4","sa1","sa2"].map(f=>(
                    <CellWithComment key={f} field={f} comment={a[f+"_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                      <Num value={a[f]} onChange={(v:any)=>update(t.teacher_id,f,v)} />
                    </CellWithComment>
                  ))}
                  <Score value={a.exam_score} max={0.5} />
                  <CellWithComment field="workshops" comment={a["workshops_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.workshops} onChange={(v:any)=>update(t.teacher_id,"workshops",v)} options={WO} />
                  </CellWithComment>
                  <CellWithComment field="training_sessions" comment={a["training_sessions_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.training_sessions} onChange={(v:any)=>update(t.teacher_id,"training_sessions",v)} options={TR} />
                  </CellWithComment>
                  <CellWithComment field="books_read" comment={a["books_read_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.books_read} onChange={(v:any)=>update(t.teacher_id,"books_read",v)} options={BR} />
                  </CellWithComment>
                  <CellWithComment field="articles_published" comment={a["articles_published_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.articles_published} onChange={(v:any)=>update(t.teacher_id,"articles_published",v)} options={AR} />
                  </CellWithComment>
                  <CellWithComment field="teaching_strategies" comment={a["teaching_strategies_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.teaching_strategies} onChange={(v:any)=>update(t.teacher_id,"teaching_strategies",v)} options={ST} />
                  </CellWithComment>
                  <Score value={a.skills_score} max={0.1} />
                  <CellWithComment field="team_work" comment={a["team_work_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.team_work} onChange={(v:any)=>update(t.teacher_id,"team_work",v)} options={TW} />
                  </CellWithComment>
                  <CellWithComment field="attitude_towards_students" comment={a["attitude_towards_students_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.attitude_towards_students} onChange={(v:any)=>update(t.teacher_id,"attitude_towards_students",v)} options={AT} />
                  </CellWithComment>
                  <CellWithComment field="commitment_to_values" comment={a["commitment_to_values_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.commitment_to_values} onChange={(v:any)=>update(t.teacher_id,"commitment_to_values",v)} options={CV} />
                  </CellWithComment>
                  <CellWithComment field="adaptability" comment={a["adaptability_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.adaptability} onChange={(v:any)=>update(t.teacher_id,"adaptability",v)} options={AD} />
                  </CellWithComment>
                  <CellWithComment field="dressing" comment={a["dressing_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.dressing} onChange={(v:any)=>update(t.teacher_id,"dressing",v)} options={DR} />
                  </CellWithComment>
                  <Score value={a.behaviour_score} max={0.1} />
                  <CellWithComment field="parents_feedback_band" comment={a["parents_feedback_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.parents_feedback_band} onChange={(v:any)=>update(t.teacher_id,"parents_feedback_band",v)} options={FB} />
                  </CellWithComment>
                  <Score value={a.parents_feedback_score} max={0.1} />
                  <CellWithComment field="obs_0" comment={a["obs_0_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.classroom_observation_band} onChange={(v:string)=>update(t.teacher_id,"classroom_observation_band",v)} options={CL} />
                  </CellWithComment>
                  <Score value={a.classroom_score} max={0.1} />
                  <CellWithComment field="english_comm_band" comment={a["english_comm_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.english_comm_band} onChange={(v:any)=>update(t.teacher_id,"english_comm_band",v)} options={EN} />
                  </CellWithComment>
                  <Score value={a.english_comm_score} max={0.05} />
                  {RESP.map(r=>(
                    <td key={r.key} className={`${td} text-center`}>
                      <Check value={a[r.key]} onChange={(v:any)=>update(t.teacher_id,r.key,v)} />
                    </td>
                  ))}
                  <Score value={a.responsibilities_score} max={0.05} />
                  <CellWithComment field="committee_role" comment={a["committee_role_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.committee_role} onChange={(v:any)=>update(t.teacher_id,"committee_role",v)} options={COMM} />
                  </CellWithComment>
                  <CellWithComment field="committee_name" comment={a["committee_name_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <input type="text" value={a.committee_name||""} onChange={e=>update(t.teacher_id,"committee_name",e.target.value)}
                      placeholder="Committee name..."
                      className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 min-w-[140px]" />
                  </CellWithComment>
                  {renderSummaryCells(t)}
                </tr>
              );
            })}
          </tbody>
          {renderFooter(otherRows, 55)}
        </table>
      </div>
      )}

      {/* ── SHARE CONFIRM MODAL ── */}
      {showShareConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-2">Share Appraisal?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Share the appraisal result with <strong>{showShareConfirm.name}</strong>?
              You can recall it later using the <em>Recall</em> button if needed.
            </p>
            <div className="flex gap-2">
              <button onClick={()=>share(showShareConfirm.id, showShareConfirm.name)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 font-semibold">
                Yes, Share
              </button>
              <button onClick={()=>setShowShareConfirm(null)}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
