import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { currentAcademicYear, generateAcademicYears } from "../utils/academicYear";

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

function calcIncrement(overallPct: number, respCount: number, overCap: boolean, highestGrade: string|null, qualification: string|null) {
  if (!overallPct) return { base: 0, extra: 0, penalty: 0, total: 0, note: "-", overCap: false, band: "" };

  let base = 0, band = "";
  if (overCap) {
    if (overallPct >= 80)      { base = 10; band = "≥ 80% (capped)"; }
    else if (overallPct >= 70) { base = 8;  band = "70–79% (capped)"; }
    else if (overallPct >= 51) { base = 6;  band = "51–69% (capped)"; }
    else                       { base = 5;  band = "≤ 50% (capped)"; }
  } else {
    if (overallPct >= 81)      { base = 15; band = "≥ 81%"; }
    else if (overallPct >= 75) { base = 12; band = "75–80%"; }
    else if (overallPct >= 61) { base = 10; band = "61–74%"; }
    else if (overallPct >= 51) { base = 8;  band = "51–60%"; }
    else                       { base = 5;  band = "≤ 50%"; }
  }

  const extra = respCount > 0 ? 7 : 0;

  const acceptedQuals = highestGrade ? (GRADE_CAPS[highestGrade]?.quals || []) : [];
  const hasQualPenalty = qualification !== null && acceptedQuals.length > 0
    && !acceptedQuals.includes(qualification);
  const penalty = hasQualPenalty ? 2 : 0;

  const total = base + extra - penalty;
  const note = `Base:${base}%${extra>0?` + Resp:${extra}%`:""}${penalty>0?` - Penalty:${penalty}%`:""}`;
  return { base, extra, penalty, total, note, overCap, band };
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
    title={value||""}
    className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white">
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
  const pct = (v * 100).toFixed(1);
  const maxPct = max ? max * 100 : 100;
  const ratio = maxPct > 0 ? v * 100 / maxPct : 0;
  const color = ratio >= 0.8 ? "text-green-700" : ratio >= 0.5 ? "text-indigo-700" : "text-orange-600";
  return (
    <td className={`px-2 py-1 text-center text-xs font-bold bg-indigo-50 border border-gray-200 ${color}`}>
      {value ? pct+"%" : "-"}
    </td>
  );
};

const SectionCommentCell = ({ field, comment, onComment, bg = "bg-white" }: any) => (
  <td className={`px-2 py-1 border border-gray-200 min-w-[160px] ${bg}`}>
    <textarea
      value={comment || ""}
      onChange={e => onComment(field, e.target.value)}
      placeholder="Principal's comment…"
      rows={2}
      className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 resize-none focus:outline-none focus:border-indigo-400"
    />
  </td>
);

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

const YEARS = generateAcademicYears();

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

const WO_MAP: Record<string,string> = {
  "4":"ATTENDED 41 TO 50:- 2 MARKS","3":"ATTENDED 21 TO 40:- 1.5 MARKS",
  "2":"ATTENDED 10 TO 20:- 1 MARK","0":"NOT APPLICABLE :- 0 MARKS",
};
const TR_MAP: Record<string,string> = {
  "2":"CONDUCTED 2 TRAINING:- 2 MARKS","1":"CONDUCTED 1 TRAINING:- 1 MARK","0":"NOT APPLICABLE :- 0 MARKS",
};
const BR_MAP: Record<string,string> = {
  "3":"8 & ABOVE:- 2 MARKS","2":"6 TO 8:- 1.5 MARKS","1":"4 TO 6:- 1 MARK","0":"NOT APPLICABLE :- 0 MARKS",
};
const AR_MAP: Record<string,string> = {
  "2":"2 & ABOVE:- 2 MARKS","1":"1 TO 2:- 1 MARK","0":"NOT APPLICABLE :- 0 MARKS",
};
const ST_MAP: Record<string,string> = {
  "2":"2 & ABOVE:- 2 MARKS","1":"1 TO 2:- 1 MARK","0":"NOT APPLICABLE :- 0 MARKS",
};
const TW_MAP: Record<string,string> = {
  "2":"HIGHLY CO-OPERATIVE: 2 MARKS","1":"GENERALLY CO-OPERATIVE: 1 MARK","0":"SOMETIMES CO-OPERATIVE: 0 MARKS",
};
const AT_MAP: Record<string,string> = {
  "2":"RESPECTFUL & FAIR TOWARDS STUDENTS:- 2 MARKS","1":"SOMETIMES RESPECTFUL & FAIR:- 1 MARK","0":"UNFAIR:- 0 MARKS",
};
const CV_MAP: Record<string,string> = {
  "2":"FULLY COMMITTED & ACTIVELY PROMOTES SCHOOL VALUES:- 2 MARKS",
  "1":"GENERALLY COMMITTED & SUPPORTS SCHOOL VALUES:- 1 MARK","0":"RARELY FOLLOWS & COMMITTED:- 0 MARKS",
};
const AD_MAP: Record<string,string> = {
  "2":"HIGHLY ADAPTABLE & FLEXIBLE:- 2 MARKS","1":"GENERALLY ADAPTABLE & FLEXIBLE:- 1 MARK","0":"STRUGGLES WITH ADAPTABILITY:- 0 MARKS",
};
const DR_MAP: Record<string,string> = {
  "2":"ALWAYS CLEAN, NEAT & WELL PRESENTED PROFESSIONALLY:- 2 MARKS",
  "1":"GENERALLY CLEAN & NEAT WITH OCCASIONAL LAPSES:- 1 MARK","0":"FREQUENTLY UNTIDY:- 0 MARKS",
};
const FB_MAP: Record<string,string> = {
  "1":"BELOW 3:- 10%","2":"BELOW 5:- 8%","3":"BELOW 10:- 5%","4":"MORE THAN 10:- 2%",
};
const CL_MAP: Record<string,string> = {
  "1":"BELOW 10:- 3 MARKS","2":"11 TO 15:- 5 MARKS","3":"16 TO 19:- 8 MARKS","4":"20 & ABOVE:- 10 MARKS",
};
const EN_MAP: Record<string,string> = {
  "1":"BELOW 3:- 10%","2":"BELOW 5:- 8%","3":"BELOW 10:- 5%","4":"MORE THAN 10:- 2%",
};
const COMM_MAP: Record<string,string> = {
  "LEAD":"LEAD","MEMBER":"MEMBER","NONE":"NOT INVOLVED",
};
const LIT_MAP: Record<string,string> = {
  "E":"CREATIVE METHODS FOR PHONICS, VOCABULARY, READING & WRITING - EXCELLENT - 5",
  "G":"REGULAR LITERACY PRACTICE USING STORIES, SONGS & WRITING - GOOD - 3",
  "N":"IRREGULAR OR LESS ENGAGING LITERACY ACTIVITIES - NEEDS IMPROVEMENT - 2",
};
const NUM_MAP: Record<string,string> = {
  "E":"HANDS ON NUMBER CONCEPTS (COUNTING, PATTERNS, ETC) - EXCELLENT - 5 MARKS",
  "G":"REGULAR USE OF BASIC MATH THROUGH WORKSHEETS & OBJECTS - GOOD - 3 MARKS",
  "N":"LIMITED STRATEGIES OR IRREGULAR TEACHING - NEEDS IMPROVEMENT - 2 MARKS",
};

export default function AppraisalPage() {
  const [year, setYear] = useState(currentAcademicYear);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<Record<string,any>>({});
  const [teacherGrades, setTeacherGrades] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState<string|null>(null);
  const [sharing, setSharing] = useState<string|null>(null);
  const [unsharing, setUnsharing] = useState<string|null>(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"nursery"|"foundation"|"preparatory"|"middle"|"secondary">("nursery");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<""|"pending"|"saved"|"shared">("");
  const [filterMin, setFilterMin] = useState<string>("");
  const [filterMax, setFilterMax] = useState<string>("");
  const [activeBand, setActiveBand] = useState<string>("");
  const [modalTeacher, setModalTeacher] = useState<any|null>(null);
  const [showShareConfirm, setShowShareConfirm] = useState<{id:string,name:string}|null>(null);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ok:number,fail:number}|null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const importFileRef = useRef<HTMLInputElement>(null);

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

  const mapCode = (map: Record<string,string>, val: any): string|undefined => {
    if (val === undefined || val === null || val === "") return undefined;
    const key = String(val).trim().toUpperCase();
    return map[key] ?? map[String(val).trim()] ?? undefined;
  };

  const toYN = (val: any): boolean => {
    if (!val) return false;
    const s = String(val).trim().toUpperCase();
    return s === "Y" || s === "YES" || s === "1" || s === "TRUE";
  };

  const rowToAppraisal = (row: any, isNursery: boolean): any => {
    const g = (k: string) => row[k];
    const payload: any = {
      workshops:                   mapCode(WO_MAP, g("Workshops")),
      training_sessions:           mapCode(TR_MAP, g("Training")),
      books_read:                  mapCode(BR_MAP, g("Books Read")),
      articles_published:          mapCode(AR_MAP, g("Articles")),
      teaching_strategies:         mapCode(ST_MAP, g("Strategies")),
      team_work:                   mapCode(TW_MAP, g("Team Work")),
      attitude_towards_students:   mapCode(AT_MAP, g("Attitude")),
      commitment_to_values:        mapCode(CV_MAP, g("Commitment")),
      adaptability:                mapCode(AD_MAP, g("Adaptability")),
      dressing:                    mapCode(DR_MAP, g("Dressing")),
      parents_feedback_band:       mapCode(FB_MAP, g("Parents Feedback")),
      classroom_observation_band:  mapCode(CL_MAP, g("Classroom")),
      english_comm_band:           mapCode(EN_MAP, g("English Comm")),
      committee_role:              g("Committee Role") ? (mapCode(COMM_MAP, g("Committee Role")) || String(g("Committee Role"))) : undefined,
      committee_name:              g("Committee Name") || undefined,
    };
    RESP.forEach(r => { payload[r.key] = toYN(g(r.label)); });
    if (isNursery) {
      payload.literacy_band = mapCode(LIT_MAP, g("Literacy Band"));
      payload.numeracy_band = mapCode(NUM_MAP, g("Numeracy Band"));
    } else {
      ["PA1","PA2","PA3","PA4","SA1","SA2"].forEach(f => {
        const v = g(f);
        payload[f.toLowerCase()] = (v !== undefined && v !== "") ? +v : undefined;
      });
    }
    Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
    return payload;
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const g1Headers = [
      "Teacher Name","PA1","PA2","PA3","PA4","SA1","SA2",
      "Workshops","Training","Books Read","Articles","Strategies",
      "Team Work","Attitude","Commitment","Adaptability","Dressing",
      "Parents Feedback","Classroom","English Comm",
      ...RESP.map(r => r.label),
      "Committee Role","Committee Name",
    ];
    const g1Rows = teachers.filter(t => !isNurseryTeacher(t.assigned_classes)).map(t => {
      const row: any = Object.fromEntries(g1Headers.map(h => [h, ""]));
      row["Teacher Name"] = t.teacher_name;
      return row;
    });
    const ws1 = XLSX.utils.json_to_sheet(g1Rows.length > 0 ? g1Rows : [Object.fromEntries(g1Headers.map(h => [h, ""]))]);
    XLSX.utils.book_append_sheet(wb, ws1, "Grade1+ Teachers");

    const nursHeaders = [
      "Teacher Name","Literacy Band","Numeracy Band",
      "Workshops","Training","Books Read","Articles","Strategies",
      "Team Work","Attitude","Commitment","Adaptability","Dressing",
      "Parents Feedback","Classroom","English Comm",
      ...RESP.map(r => r.label),
      "Committee Role","Committee Name",
    ];
    const nursRows = teachers.filter(t => isNurseryTeacher(t.assigned_classes)).map(t => {
      const row: any = Object.fromEntries(nursHeaders.map(h => [h, ""]));
      row["Teacher Name"] = t.teacher_name;
      return row;
    });
    const ws2 = XLSX.utils.json_to_sheet(nursRows.length > 0 ? nursRows : [Object.fromEntries(nursHeaders.map(h => [h, ""]))]);
    XLSX.utils.book_append_sheet(wb, ws2, "Nursery Teachers");

    const refRows = [
      {Field:"Workshops",Code:"4",Meaning:"ATTENDED 41 TO 50:- 2 MARKS"},{Field:"",Code:"3",Meaning:"ATTENDED 21 TO 40:- 1.5 MARKS"},
      {Field:"",Code:"2",Meaning:"ATTENDED 10 TO 20:- 1 MARK"},{Field:"",Code:"0",Meaning:"NOT APPLICABLE :- 0 MARKS"},
      {Field:"Training",Code:"2",Meaning:"CONDUCTED 2 TRAINING:- 2 MARKS"},{Field:"",Code:"1",Meaning:"CONDUCTED 1 TRAINING:- 1 MARK"},
      {Field:"",Code:"0",Meaning:"NOT APPLICABLE :- 0 MARKS"},
      {Field:"Books Read",Code:"3",Meaning:"8 & ABOVE:- 2 MARKS"},{Field:"",Code:"2",Meaning:"6 TO 8:- 1.5 MARKS"},
      {Field:"",Code:"1",Meaning:"4 TO 6:- 1 MARK"},{Field:"",Code:"0",Meaning:"NOT APPLICABLE :- 0 MARKS"},
      {Field:"Articles",Code:"2",Meaning:"2 & ABOVE:- 2 MARKS"},{Field:"",Code:"1",Meaning:"1 TO 2:- 1 MARK"},
      {Field:"",Code:"0",Meaning:"NOT APPLICABLE :- 0 MARKS"},
      {Field:"Strategies",Code:"2",Meaning:"2 & ABOVE:- 2 MARKS"},{Field:"",Code:"1",Meaning:"1 TO 2:- 1 MARK"},
      {Field:"",Code:"0",Meaning:"NOT APPLICABLE :- 0 MARKS"},
      {Field:"Team Work",Code:"2",Meaning:"HIGHLY CO-OPERATIVE: 2 MARKS"},{Field:"",Code:"1",Meaning:"GENERALLY CO-OPERATIVE: 1 MARK"},
      {Field:"",Code:"0",Meaning:"SOMETIMES CO-OPERATIVE: 0 MARKS"},
      {Field:"Attitude",Code:"2",Meaning:"RESPECTFUL & FAIR TOWARDS STUDENTS:- 2 MARKS"},{Field:"",Code:"1",Meaning:"SOMETIMES RESPECTFUL & FAIR:- 1 MARK"},
      {Field:"",Code:"0",Meaning:"UNFAIR:- 0 MARKS"},
      {Field:"Commitment",Code:"2",Meaning:"FULLY COMMITTED & ACTIVELY PROMOTES SCHOOL VALUES:- 2 MARKS"},
      {Field:"",Code:"1",Meaning:"GENERALLY COMMITTED & SUPPORTS SCHOOL VALUES:- 1 MARK"},{Field:"",Code:"0",Meaning:"RARELY FOLLOWS & COMMITTED:- 0 MARKS"},
      {Field:"Adaptability",Code:"2",Meaning:"HIGHLY ADAPTABLE & FLEXIBLE:- 2 MARKS"},{Field:"",Code:"1",Meaning:"GENERALLY ADAPTABLE & FLEXIBLE:- 1 MARK"},
      {Field:"",Code:"0",Meaning:"STRUGGLES WITH ADAPTABILITY:- 0 MARKS"},
      {Field:"Dressing",Code:"2",Meaning:"ALWAYS CLEAN, NEAT & WELL PRESENTED PROFESSIONALLY:- 2 MARKS"},
      {Field:"",Code:"1",Meaning:"GENERALLY CLEAN & NEAT WITH OCCASIONAL LAPSES:- 1 MARK"},{Field:"",Code:"0",Meaning:"FREQUENTLY UNTIDY:- 0 MARKS"},
      {Field:"Parents Feedback",Code:"1",Meaning:"BELOW 3:- 10%"},{Field:"",Code:"2",Meaning:"BELOW 5:- 8%"},
      {Field:"",Code:"3",Meaning:"BELOW 10:- 5%"},{Field:"",Code:"4",Meaning:"MORE THAN 10:- 2%"},
      {Field:"Classroom",Code:"1",Meaning:"BELOW 10:- 3 MARKS"},{Field:"",Code:"2",Meaning:"11 TO 15:- 5 MARKS"},
      {Field:"",Code:"3",Meaning:"16 TO 19:- 8 MARKS"},{Field:"",Code:"4",Meaning:"20 & ABOVE:- 10 MARKS"},
      {Field:"English Comm",Code:"1",Meaning:"BELOW 3:- 10%"},{Field:"",Code:"2",Meaning:"BELOW 5:- 8%"},
      {Field:"",Code:"3",Meaning:"BELOW 10:- 5%"},{Field:"",Code:"4",Meaning:"MORE THAN 10:- 2%"},
      {Field:"Committee Role",Code:"LEAD",Meaning:"LEAD"},{Field:"",Code:"MEMBER",Meaning:"MEMBER"},
      {Field:"",Code:"NONE",Meaning:"NOT INVOLVED"},
      {Field:"Literacy Band (Nursery)",Code:"E",Meaning:"CREATIVE METHODS - EXCELLENT - 5"},
      {Field:"",Code:"G",Meaning:"REGULAR PRACTICE - GOOD - 3"},{Field:"",Code:"N",Meaning:"IRREGULAR - NEEDS IMPROVEMENT - 2"},
      {Field:"Numeracy Band (Nursery)",Code:"E",Meaning:"HANDS ON NUMBER CONCEPTS - EXCELLENT - 5 MARKS"},
      {Field:"",Code:"G",Meaning:"REGULAR BASIC MATH - GOOD - 3 MARKS"},{Field:"",Code:"N",Meaning:"LIMITED STRATEGIES - NEEDS IMPROVEMENT - 2 MARKS"},
      {Field:"Responsibilities",Code:"Y or N",Meaning:"Y = active, N = not active"},
      {Field:"Exam Marks PA1-SA2",Code:"0-100",Meaning:"Enter numeric marks"},
    ];
    const ws3 = XLSX.utils.json_to_sheet(refRows);
    XLSX.utils.book_append_sheet(wb, ws3, "Options Reference");
    XLSX.writeFile(wb, `appraisal_template_${year}.xlsx`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const rows: any[] = [];
      const ws1 = wb.Sheets["Grade1+ Teachers"];
      if (ws1) XLSX.utils.sheet_to_json<any>(ws1).forEach(r => { if (r["Teacher Name"]) rows.push({...r, _isNursery: false}); });
      const ws2 = wb.Sheets["Nursery Teachers"];
      if (ws2) XLSX.utils.sheet_to_json<any>(ws2).forEach(r => { if (r["Teacher Name"]) rows.push({...r, _isNursery: true}); });
      const resolved = rows.map(row => {
        const name = String(row["Teacher Name"]).trim();
        const teacher = teachers.find(t => t.teacher_name?.trim().toLowerCase() === name.toLowerCase());
        return { ...row, _teacherId: teacher?.teacher_id || null, _teacherName: name };
      });
      setImportRows(resolved);
      setImportResult(null);
      setImportErrors([]);
    };
    reader.readAsArrayBuffer(file);
  };

  const runImport = async () => {
    setImporting(true);
    setImportErrors([]);
    let ok = 0, fail = 0;
    const errors: string[] = [];
    for (const row of importRows) {
      if (!row._teacherId) {
        errors.push(`"${row._teacherName}" — teacher not found in system`);
        fail++;
        continue;
      }
      try {
        const payload = rowToAppraisal(row, row._isNursery);
        payload.academic_year = year;
        payload.teacher_name = row._teacherName;
        await axios.post(`${API}/appraisal/${row._teacherId}`, payload);
        ok++;
      } catch (err: any) {
        errors.push(`"${row._teacherName}" — ${err?.response?.data?.message || "save failed"}`);
        fail++;
      }
    }
    setImportResult({ ok, fail });
    setImportErrors(errors);
    setImporting(false);
    if (ok > 0) { fetchData(); showMsg(`✅ Imported ${ok} appraisal${ok > 1 ? "s" : ""}`); }
  };

  const toggleCapStatus = async (tid: string, newStatus: boolean) => {
    try {
      await axios.patch(`${API}/users/${tid}/cap-status`, { over_salary_cap: newStatus });
      await fetchData();
      showMsg(`✅ Cap status updated`);
    } catch { showMsg(`❌ Error updating cap status`); }
  };

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
      const inc = calcIncrement(a.overall_percentage ? +a.overall_percentage : 0, rc, t.over_salary_cap || false, hg, q);
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

  const BANDS = [
    { label:"≥ 81%",   hike:"15%", min:81, max:100, color:"bg-green-50 border-green-400 text-green-800",    active:"bg-green-500 text-white border-green-500" },
    { label:"75–80%",  hike:"12%", min:75, max:80,  color:"bg-teal-50 border-teal-400 text-teal-800",       active:"bg-teal-500 text-white border-teal-500" },
    { label:"61–74%",  hike:"10%", min:61, max:74,  color:"bg-blue-50 border-blue-400 text-blue-800",       active:"bg-blue-500 text-white border-blue-500" },
    { label:"51–60%",  hike:"8%",  min:51, max:60,  color:"bg-yellow-50 border-yellow-400 text-yellow-800", active:"bg-yellow-500 text-white border-yellow-500" },
    { label:"≤ 50%",   hike:"5%",  min:0,  max:50,  color:"bg-red-50 border-red-400 text-red-800",          active:"bg-red-500 text-white border-red-500" },
  ];

  const filteredTeachers = teachers.filter(t => {
    if (search && !t.teacher_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && getStatus(t) !== filterStatus) return false;
    const pct = t.appraisal?.overall_percentage ? +t.appraisal.overall_percentage : null;
    if (activeBand) {
      const band = BANDS.find(b => b.label === activeBand);
      if (band) {
        if (pct === null || pct < band.min || pct > band.max) return false;
      }
    } else if (filterMin !== "" || filterMax !== "") {
      if (pct === null) return false;
      if (filterMin !== "" && pct < +filterMin) return false;
      if (filterMax !== "" && pct > +filterMax) return false;
    }
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
            <button onClick={()=>setModalTeacher(t)} className="font-semibold text-xs text-indigo-700 hover:underline truncate text-left">{t.teacher_name}</button>
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
    const inc = calcIncrement(a.overall_percentage ? +a.overall_percentage : 0, rc, t.over_salary_cap || false, hg, q);
    return (
      <>
        <td className={`${td} text-center font-bold text-indigo-800`}>
          {a.overall_percentage ? (+a.overall_percentage).toFixed(1)+"%" : "-"}
        </td>
        <td className={`${td} text-center min-w-[160px]`}>
          {a.overall_percentage ? (
            <div>
              <span className={`font-bold text-sm ${inc.total>=15?"text-green-700":inc.total>=8?"text-blue-700":"text-orange-700"}`}>{inc.total}%</span>
              <p className="text-xs text-gray-400 leading-tight mt-0.5">{inc.note}</p>
              {!q && <p className="text-xs text-gray-300 italic">Qual: pending</p>}
            </div>
          ) : "-"}
          <button
            onClick={() => toggleCapStatus(t.teacher_id, !t.over_salary_cap)}
            title={t.over_salary_cap ? "Click to mark Below Cap" : "Click to mark Above Cap"}
            className={`mt-1 text-xs px-2 py-0.5 rounded-full font-semibold border transition-colors ${t.over_salary_cap ? "bg-red-100 text-red-700 border-red-300 hover:bg-red-200" : "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"}`}>
            {t.over_salary_cap ? "↑ ABOVE CAP" : "↓ BELOW CAP"}
          </button>
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
          const inc = calcIncrement(+a.overall_percentage, rc, t.over_salary_cap||false, teacherGrades[t.teacher_id]||null, t.appraisal_qualification||null);
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

  const nurseryRows     = filteredTeachers.filter(t=>isNurseryTeacher(t.assigned_classes));
  const foundationRows  = filteredTeachers.filter(t=>!isNurseryTeacher(t.assigned_classes) && getStage(t.assigned_classes)==="Foundation");
  const preparatoryRows = filteredTeachers.filter(t=>getStage(t.assigned_classes)==="Preparatory");
  const middleRows      = filteredTeachers.filter(t=>getStage(t.assigned_classes)==="Middle");
  const secondaryRows   = filteredTeachers.filter(t=>getStage(t.assigned_classes)==="Secondary");
  const standardRows    = activeTab==="foundation" ? foundationRows : activeTab==="preparatory" ? preparatoryRows : activeTab==="middle" ? middleRows : activeTab==="secondary" ? secondaryRows : [];

  const filterActive = !!(search || activeBand || filterMin || filterMax);

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
            <select value={year} onChange={e=>{ setYear(e.target.value); setSearch(""); setFilterStatus(""); }}
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

      {/* ── BAND ANALYSIS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {BANDS.map(b => {
          const count = teachers.filter(t => {
            const pct = t.appraisal?.overall_percentage ? +t.appraisal.overall_percentage : null;
            return pct !== null && pct >= b.min && pct <= b.max;
          }).length;
          const isActive = activeBand === b.label;
          return (
            <button key={b.label} onClick={()=>{ setActiveBand(isActive ? "" : b.label); setFilterMin(""); setFilterMax(""); }}
              className={`rounded-lg border-2 px-3 py-2 text-left transition-all ${isActive ? b.active : b.color}`}>
              <p className="text-xs font-bold">{b.label}</p>
              <p className="text-lg font-bold">{count} teachers</p>
              <p className="text-xs opacity-80">Hike: {b.hike}</p>
            </button>
          );
        })}
      </div>

      {/* ── FILTER BAR ── */}
      <div className="flex gap-3 mb-3 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Search Teacher</label>
          <input type="text" placeholder="Name..." value={search} onChange={e=>setSearch(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-44" />
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
        <div>
          <label className="text-xs text-gray-500 block mb-1">Score Range (%)</label>
          <div className="flex items-center gap-1">
            <input type="number" min={0} max={100} placeholder="Min" value={filterMin}
              onChange={e=>{ setFilterMin(e.target.value); setActiveBand(""); }}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-16 text-center" />
            <span className="text-gray-400 text-xs">–</span>
            <input type="number" min={0} max={100} placeholder="Max" value={filterMax}
              onChange={e=>{ setFilterMax(e.target.value); setActiveBand(""); }}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-16 text-center" />
          </div>
        </div>
        {(search||filterStatus||activeBand||filterMin||filterMax) && (
          <button onClick={()=>{ setSearch(""); setFilterStatus(""); setActiveBand(""); setFilterMin(""); setFilterMax(""); }}
            className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50 self-end">
            Clear All
          </button>
        )}
        <div className="ml-auto self-end flex gap-2">
          <button onClick={()=>{ setShowImport(v=>!v); setImportRows([]); setImportResult(null); setImportErrors([]); }}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
            📥 Import Excel
          </button>
          <button onClick={exportToExcel}
            className="px-4 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium">
            📤 Export Excel
          </button>
        </div>
      </div>

      {/* ── IMPORT PANEL ── */}
      {showImport && (
        <div className="mb-4 border border-indigo-200 rounded-xl bg-indigo-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-indigo-800">Import Appraisals from Excel</h3>
            <button onClick={()=>setShowImport(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Step 1 */}
            <div className="bg-white rounded-lg border border-indigo-100 p-3">
              <p className="text-xs font-semibold text-indigo-700 mb-1">Step 1 — Download Template</p>
              <p className="text-xs text-gray-500 mb-2">
                Template pre-fills teacher names from the <strong>{year}</strong> year.
                Sheet 1: Grade 1+ (PA1–SA2 marks). Sheet 2: Nursery (literacy/numeracy bands).
                See the <em>Options Reference</em> sheet for valid codes.
              </p>
              <button onClick={downloadTemplate}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-medium">
                ⬇ Download Template
              </button>
            </div>
            {/* Step 2 */}
            <div className="bg-white rounded-lg border border-indigo-100 p-3">
              <p className="text-xs font-semibold text-indigo-700 mb-1">Step 2 — Upload Filled Template</p>
              <p className="text-xs text-gray-500 mb-2">Upload the same Excel file after filling it in.</p>
              <input ref={importFileRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile}
                className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-indigo-600 file:text-white file:cursor-pointer" />
            </div>
          </div>

          {/* Preview */}
          {importRows.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-indigo-700 mb-1">{importRows.length} row{importRows.length>1?"s":""} detected — preview:</p>
              <div className="overflow-auto max-h-40 border border-gray-200 rounded-lg bg-white">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-gray-600 font-medium">Teacher</th>
                      <th className="px-3 py-1.5 text-left text-gray-600 font-medium">Type</th>
                      <th className="px-3 py-1.5 text-left text-gray-600 font-medium">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((r,i) => (
                      <tr key={i} className={i%2===0?"bg-white":"bg-gray-50"}>
                        <td className="px-3 py-1">{r._teacherName}</td>
                        <td className="px-3 py-1">{r._isNursery ? "Nursery" : "Grade 1+"}</td>
                        <td className="px-3 py-1">
                          {r._teacherId
                            ? <span className="text-green-600 font-medium">✓ Found</span>
                            : <span className="text-red-500 font-medium">✗ Not found</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={runImport} disabled={importing || importRows.every(r=>!r._teacherId)}
                  className="px-4 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                  {importing ? "Importing…" : `Import ${importRows.filter(r=>r._teacherId).length} records`}
                </button>
                {importResult && (
                  <span className="text-xs text-gray-600">
                    ✅ {importResult.ok} imported · {importResult.fail > 0 ? `❌ ${importResult.fail} failed` : ""}
                  </span>
                )}
              </div>
              {importErrors.length > 0 && (
                <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                  {importErrors.map((e,i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TABS ── */}
      {!filterActive && <div className="flex gap-2 mb-3 flex-wrap">
        {([
          {tab:"nursery",     label:"Nursery",              count:nurseryRows.length,     active:"bg-green-600 border-green-600",   inactive:"text-green-700 border-green-300 hover:border-green-500"},
          {tab:"foundation",  label:"Foundation (Gr 1-2)",  count:foundationRows.length,  active:"bg-green-600 border-green-600",   inactive:"text-green-700 border-green-300 hover:border-green-500"},
          {tab:"preparatory", label:"Preparatory (Gr 3-5)", count:preparatoryRows.length, active:"bg-blue-600 border-blue-600",     inactive:"text-blue-700 border-blue-300 hover:border-blue-500"},
          {tab:"middle",      label:"Middle (Gr 6-8)",      count:middleRows.length,      active:"bg-purple-600 border-purple-600", inactive:"text-purple-700 border-purple-300 hover:border-purple-500"},
          {tab:"secondary",   label:"Secondary (Gr 9-10)",  count:secondaryRows.length,   active:"bg-orange-500 border-orange-500", inactive:"text-orange-700 border-orange-300 hover:border-orange-500"},
        ]).map(({tab,label,count,active,inactive})=>(
          <button key={tab} onClick={()=>setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all bg-white ${activeTab===tab?`${active} text-white`:inactive}`}>
            {label} ({count})
          </button>
        ))}
      </div>}

      {/* ── COMBINED SEARCH RESULTS (all stages) ── */}
      {filterActive && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">
              Results: <span className="text-indigo-700">{filteredTeachers.length}</span> teacher{filteredTeachers.length !== 1 ? "s" : ""} across all stages
            </p>
            <button onClick={()=>{ setSearch(""); setActiveBand(""); setFilterMin(""); setFilterMax(""); setFilterStatus(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline">Clear filters</button>
          </div>
          {filteredTeachers.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">No teachers match this filter.</div>
          ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600 font-semibold w-8">#</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-semibold min-w-[160px]">Teacher Name</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-semibold">Stage</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-semibold">Classes</th>
                    <th className="px-3 py-2 text-center text-gray-600 font-semibold">Status</th>
                    <th className="px-3 py-2 text-center text-gray-600 font-semibold">Overall %</th>
                    <th className="px-3 py-2 text-center text-gray-600 font-semibold">Hike %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((t, i) => {
                    const a = appraisals[t.teacher_id] || {};
                    const pct = a.overall_percentage ? +a.overall_percentage : 0;
                    const rc = RESP.filter(r => a[r.key]).length;
                    const hg = teacherGrades[t.teacher_id] || null;
                    const inc = calcIncrement(pct, rc, t.over_salary_cap || false, hg, t.appraisal_qualification || null);
                    const stage = isNurseryTeacher(t.assigned_classes) ? "Nursery" : getStage(t.assigned_classes);
                    const stageColors: Record<string,string> = {
                      Nursery:"bg-green-100 text-green-700", Foundation:"bg-green-100 text-green-700",
                      Preparatory:"bg-blue-100 text-blue-700", Middle:"bg-purple-100 text-purple-700",
                      Secondary:"bg-orange-100 text-orange-700",
                    };
                    const pctColor = pct >= 81 ? "text-green-700" : pct >= 75 ? "text-teal-700" : pct >= 61 ? "text-blue-700" : pct >= 51 ? "text-yellow-700" : pct > 0 ? "text-red-600" : "text-gray-400";
                    return (
                      <tr key={t.teacher_id} className={`border-b border-gray-100 hover:bg-indigo-50/30 ${i%2===0?"bg-white":"bg-gray-50"}`}>
                        <td className="px-3 py-2 text-gray-400">{i+1}</td>
                        <td className="px-3 py-2">
                          <button onClick={()=>setModalTeacher(t)} className="font-semibold text-indigo-700 hover:underline text-left">{t.teacher_name}</button>
                          {t.appraisal_qualification && <p className="text-gray-400 text-xs">{t.appraisal_qualification}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${stageColors[stage]||"bg-gray-100 text-gray-500"}`}>{stage}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{(t.assigned_classes||[]).join(", ")||"—"}</td>
                        <td className="px-3 py-2 text-center"><StatusBadge status={getStatus(t)} /></td>
                        <td className={`px-3 py-2 text-center font-bold ${pctColor}`}>{pct > 0 ? pct.toFixed(1)+"%" : "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {pct > 0 ? (
                            <span className={`font-bold ${inc.total >= 15 ? "text-green-700" : inc.total >= 10 ? "text-blue-700" : "text-orange-700"}`}>{inc.total}%</span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── NURSERY TABLE ── */}
      {!filterActive && activeTab==="nursery" && (
      <div className="overflow-auto rounded-lg shadow border border-gray-200" style={{maxHeight:"80vh"}}>
        <table className="text-xs bg-white border-collapse" style={{minWidth:"2000px"}}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th className={`${th} bg-indigo-700 text-white sticky left-0 z-30`} rowSpan={2}>Teacher Name</th>
              <th className={`${th} bg-pink-200 text-pink-900`} colSpan={3}>LITERACY (10%)</th>
              <th className={`${th} bg-blue-200 text-blue-900`} colSpan={3}>NUMERACY (10%)</th>
              <th className={`${th} bg-green-100 text-green-800`} colSpan={7}>SKILLS & KNOWLEDGE (10%)</th>
              <th className={`${th} bg-yellow-100 text-yellow-800`} colSpan={7}>BEHAVIOUR & ATTITUDE (10%)</th>
              <th className={`${th} bg-pink-100 text-pink-800`} colSpan={3}>PARENTS FEEDBACK (20%)</th>
              <th className={`${th} bg-purple-100 text-purple-800`} colSpan={3}>CLASSROOM TEACHING (20%)</th>
              <th className={`${th} bg-orange-100 text-orange-800`} colSpan={3}>ENGLISH COMM (20%)</th>
              <th className={`${th} bg-teal-100 text-teal-800`} colSpan={13}>RESPONSIBILITIES (Extra)</th>
              <th className={`${th} bg-rose-100 text-rose-800`} colSpan={2}>COMMITTEE</th>
              <th className={`${th} bg-indigo-100 text-indigo-800`} colSpan={4}>SUMMARY</th>
            </tr>
            <tr>
              {["Band","Score","Comment"].map(h=><th key={"lit"+h} className={`${th} bg-pink-50`}>{h}</th>)}
              {["Band","Score","Comment"].map(h=><th key={"num"+h} className={`${th} bg-blue-50`}>{h}</th>)}
              {["Workshops","Training","Books Read","Articles","Strategies","Score","Comment"].map(h=><th key={h} className={`${th} bg-green-50`}>{h}</th>)}
              {["Team Work","Attitude","Commitment","Adaptability","Dressing","Score","Comment"].map(h=><th key={h} className={`${th} bg-yellow-50`}>{h}</th>)}
              {["Feedback Band","Score","Comment"].map(h=><th key={"pf"+h} className={`${th} bg-pink-50`}>{h}</th>)}
              {["Observation","Score","Comment"].map(h=><th key={"cl"+h} className={`${th} bg-purple-50`}>{h}</th>)}
              {["Band","Score","Comment"].map(h=><th key={"en"+h} className={`${th} bg-orange-50`}>{h}</th>)}
              {RESP.map(r=><th key={r.key} className={`${th} bg-teal-50`}>{r.label}</th>)}
              {["Score","Comment"].map(h=><th key={"resp"+h} className={`${th} bg-teal-50`}>{h}</th>)}
              {["Role","Committee Name"].map(h=><th key={h} className={`${th} bg-rose-50`}>{h}</th>)}
              {["Overall %","Salary Increment","Shared","Action"].map(h=><th key={h} className={`${th} bg-indigo-50`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {nurseryRows.length===0&&(
              <tr><td colSpan={49} className="text-center py-10 text-gray-400">No Pre-KG / LKG / UKG teachers found.</td></tr>
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
                  <SectionCommentCell field="literacy_section_comment" comment={a.literacy_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-pink-50"/>
                  <td className={td}><Select value={a.numeracy_band} onChange={(v:any)=>update(t.teacher_id,"numeracy_band",v)} options={NUM}/></td>
                  <Score value={a.numeracy_score} max={0.1}/>
                  <SectionCommentCell field="numeracy_section_comment" comment={a.numeracy_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-blue-50"/>
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
                  <SectionCommentCell field="skills_section_comment" comment={a.skills_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-green-50"/>
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
                  <SectionCommentCell field="behaviour_section_comment" comment={a.behaviour_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-yellow-50"/>
                  <CellWithComment field="parents_feedback_band" comment={a["parents_feedback_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.parents_feedback_band} onChange={(v:any)=>update(t.teacher_id,"parents_feedback_band",v)} options={FB}/>
                  </CellWithComment>
                  <Score value={a.parents_feedback_score} max={0.2}/>
                  <SectionCommentCell field="parents_feedback_section_comment" comment={a.parents_feedback_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-pink-50"/>
                  <CellWithComment field="obs_0" comment={a["obs_0_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.classroom_observation_band} onChange={(v:string)=>update(t.teacher_id,"classroom_observation_band",v)} options={CL}/>
                  </CellWithComment>
                  <Score value={a.classroom_score} max={0.2}/>
                  <SectionCommentCell field="classroom_section_comment" comment={a.classroom_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-purple-50"/>
                  <CellWithComment field="english_comm_band" comment={a["english_comm_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.english_comm_band} onChange={(v:any)=>update(t.teacher_id,"english_comm_band",v)} options={EN}/>
                  </CellWithComment>
                  <Score value={a.english_comm_score} max={0.2}/>
                  <SectionCommentCell field="english_comm_section_comment" comment={a.english_comm_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-orange-50"/>
                  {RESP.map(r=>(
                    <td key={r.key} className={`${td} text-center`}>
                      <Check value={a[r.key]} onChange={(v:boolean)=>update(t.teacher_id,r.key,v)}/>
                    </td>
                  ))}
                  <Score value={a.responsibilities_score} max={0.05}/>
                  <SectionCommentCell field="responsibilities_section_comment" comment={a.responsibilities_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-teal-50"/>
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
          {renderFooter(nurseryRows, 49)}
        </table>
      </div>
      )}

      {/* ── GRADE 1 ONWARDS TABLE ── */}
      {!filterActive && activeTab!=="nursery" && (
      <div className="overflow-auto rounded-lg shadow border border-gray-200" style={{maxHeight:"80vh"}}>
        <table className="text-xs bg-white border-collapse" style={{minWidth:"2800px"}}>
          <thead ref={theadRef} className="sticky top-0 z-20">
            <tr>
              <th className={`${th} bg-indigo-700 text-white sticky left-0 z-30`} rowSpan={2}>Teacher Name</th>
              <th className={`${th} bg-blue-100 text-blue-800`} colSpan={8}>EXAM MARKS (50%)</th>
              <th className={`${th} bg-green-100 text-green-800`} colSpan={7}>SKILLS & KNOWLEDGE (10%)</th>
              <th className={`${th} bg-yellow-100 text-yellow-800`} colSpan={7}>BEHAVIOUR & ATTITUDE (10%)</th>
              <th className={`${th} bg-pink-100 text-pink-800`} colSpan={3}>PARENTS FEEDBACK (10%)</th>
              <th className={`${th} bg-purple-100 text-purple-800`} colSpan={3}>CLASSROOM TEACHING (10%)</th>
              <th className={`${th} bg-orange-100 text-orange-800`} colSpan={3}>ENGLISH COMM (5%)</th>
              <th className={`${th} bg-teal-100 text-teal-800`} colSpan={13}>RESPONSIBILITIES (5%)</th>
              <th className={`${th} bg-rose-100 text-rose-800`} colSpan={2}>COMMITTEE</th>
              <th className={`${th} bg-indigo-100 text-indigo-800`} colSpan={4}>SUMMARY</th>
            </tr>
            <tr>
              {["PA 1","PA 2","PA 3","PA 4","SA 1","SA 2","Score","Comment"].map(h=><th key={h} className={`${th} bg-blue-50`}>{h}</th>)}
              {["Workshops","Training","Books Read","Articles","Strategies","Score","Comment"].map(h=><th key={h} className={`${th} bg-green-50`}>{h}</th>)}
              {["Team Work","Attitude","Commitment","Adaptability","Dressing","Score","Comment"].map(h=><th key={h} className={`${th} bg-yellow-50`}>{h}</th>)}
              {["Feedback Band","Score","Comment"].map(h=><th key={h} className={`${th} bg-pink-50`}>{h}</th>)}
              {["Observation","Score","Comment"].map(h=><th key={h} className={`${th} bg-purple-50`}>{h}</th>)}
              {["Band","Score","Comment"].map(h=><th key={h} className={`${th} bg-orange-50`}>{h}</th>)}
              {RESP.map(r=><th key={r.key} className={`${th} bg-teal-50`}>{r.label}</th>)}
              {["Score","Comment"].map(h=><th key={"resp"+h} className={`${th} bg-teal-50`}>{h}</th>)}
              {["Role","Committee Name"].map(h=><th key={h} className={`${th} bg-rose-50`}>{h}</th>)}
              {["Overall %","Salary Increment","Shared","Action"].map(h=><th key={h} className={`${th} bg-indigo-50`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {standardRows.length===0&&(
              <tr><td colSpan={51} className="text-center py-10 text-gray-400">No teachers found.</td></tr>
            )}
            {standardRows.map((t,idx)=>{
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
                  <SectionCommentCell field="exam_section_comment" comment={a.exam_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-blue-50"/>
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
                  <SectionCommentCell field="skills_section_comment" comment={a.skills_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-green-50"/>
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
                  <SectionCommentCell field="behaviour_section_comment" comment={a.behaviour_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-yellow-50"/>
                  <CellWithComment field="parents_feedback_band" comment={a["parents_feedback_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.parents_feedback_band} onChange={(v:any)=>update(t.teacher_id,"parents_feedback_band",v)} options={FB} />
                  </CellWithComment>
                  <Score value={a.parents_feedback_score} max={0.1} />
                  <SectionCommentCell field="parents_feedback_section_comment" comment={a.parents_feedback_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-pink-50"/>
                  <CellWithComment field="obs_0" comment={a["obs_0_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.classroom_observation_band} onChange={(v:string)=>update(t.teacher_id,"classroom_observation_band",v)} options={CL} />
                  </CellWithComment>
                  <Score value={a.classroom_score} max={0.1} />
                  <SectionCommentCell field="classroom_section_comment" comment={a.classroom_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-purple-50"/>
                  <CellWithComment field="english_comm_band" comment={a["english_comm_band_comment"]} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)}>
                    <Select value={a.english_comm_band} onChange={(v:any)=>update(t.teacher_id,"english_comm_band",v)} options={EN} />
                  </CellWithComment>
                  <Score value={a.english_comm_score} max={0.05} />
                  <SectionCommentCell field="english_comm_section_comment" comment={a.english_comm_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-orange-50"/>
                  {RESP.map(r=>(
                    <td key={r.key} className={`${td} text-center`}>
                      <Check value={a[r.key]} onChange={(v:any)=>update(t.teacher_id,r.key,v)} />
                    </td>
                  ))}
                  <Score value={a.responsibilities_score} max={0.05} />
                  <SectionCommentCell field="responsibilities_section_comment" comment={a.responsibilities_section_comment} onComment={(k:string,v:string)=>update(t.teacher_id,k,v)} bg="bg-teal-50"/>
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
          {renderFooter(standardRows, 51)}
        </table>
      </div>
      )}

      {/* ── TEACHER PERFORMANCE MODAL ── */}
      {modalTeacher && (() => {
        const t = modalTeacher;
        const a = appraisals[t.teacher_id] || {};
        const pct = a.overall_percentage ? +a.overall_percentage : 0;
        const hg = teacherGrades[t.teacher_id] || null;
        const rc = RESP.filter(r => a[r.key]).length;
        const inc = calcIncrement(pct, rc, t.over_salary_cap || false, hg, t.appraisal_qualification || null);
        const isNursery = isNurseryTeacher(t.assigned_classes);
        const pctColor = pct >= 81 ? "#10b981" : pct >= 75 ? "#0d9488" : pct >= 61 ? "#6366f1" : pct >= 51 ? "#f59e0b" : pct > 0 ? "#ef4444" : "#9ca3af";

        type MS = { label:string; weight:string; score:number; max:number; comment:string|null; color:string };
        const sections: MS[] = isNursery ? [
          { label:"Literacy",             weight:"10%",   score:+(a.literacy_score||0),         max:0.1,  comment:a.literacy_section_comment||null,         color:"bg-pink-50 border-pink-300" },
          { label:"Numeracy",             weight:"10%",   score:+(a.numeracy_score||0),         max:0.1,  comment:a.numeracy_section_comment||null,         color:"bg-blue-50 border-blue-300" },
          { label:"Skills & Knowledge",   weight:"10%",   score:+(a.skills_score||0),           max:0.1,  comment:a.skills_section_comment||null,           color:"bg-green-50 border-green-300" },
          { label:"Behaviour & Attitude", weight:"10%",   score:+(a.behaviour_score||0),        max:0.1,  comment:a.behaviour_section_comment||null,        color:"bg-yellow-50 border-yellow-300" },
          { label:"Parents Feedback",     weight:"20%",   score:+(a.parents_feedback_score||0), max:0.2,  comment:a.parents_feedback_section_comment||null, color:"bg-rose-50 border-rose-300" },
          { label:"Classroom Teaching",   weight:"20%",   score:+(a.classroom_score||0),        max:0.2,  comment:a.classroom_section_comment||null,        color:"bg-purple-50 border-purple-300" },
          { label:"English Comm",         weight:"20%",   score:+(a.english_comm_score||0),     max:0.2,  comment:a.english_comm_section_comment||null,     color:"bg-orange-50 border-orange-300" },
          { label:"Responsibilities",     weight:"Extra", score:+(a.responsibilities_score||0), max:0.05, comment:a.responsibilities_section_comment||null, color:"bg-teal-50 border-teal-300" },
        ] : [
          { label:"Exam Marks",           weight:"50%",   score:+(a.exam_score||0),             max:0.5,  comment:a.exam_section_comment||null,             color:"bg-blue-50 border-blue-300" },
          { label:"Skills & Knowledge",   weight:"10%",   score:+(a.skills_score||0),           max:0.1,  comment:a.skills_section_comment||null,           color:"bg-green-50 border-green-300" },
          { label:"Behaviour & Attitude", weight:"10%",   score:+(a.behaviour_score||0),        max:0.1,  comment:a.behaviour_section_comment||null,        color:"bg-yellow-50 border-yellow-300" },
          { label:"Parents Feedback",     weight:"10%",   score:+(a.parents_feedback_score||0), max:0.1,  comment:a.parents_feedback_section_comment||null, color:"bg-rose-50 border-rose-300" },
          { label:"Classroom Teaching",   weight:"10%",   score:+(a.classroom_score||0),        max:0.1,  comment:a.classroom_section_comment||null,        color:"bg-purple-50 border-purple-300" },
          { label:"English Comm",         weight:"5%",    score:+(a.english_comm_score||0),     max:0.05, comment:a.english_comm_section_comment||null,     color:"bg-orange-50 border-orange-300" },
          { label:"Responsibilities",     weight:"5%",    score:+(a.responsibilities_score||0), max:0.05, comment:a.responsibilities_section_comment||null, color:"bg-teal-50 border-teal-300" },
        ];

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setModalTeacher(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-base font-bold text-gray-800">{t.teacher_name}</h2>
                  <p className="text-xs text-gray-400">{t.appraisal_qualification||"—"} · {(t.assigned_classes||[]).join(", ")||"No class"} · {year}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${t.over_salary_cap ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {t.over_salary_cap ? "↑ ABOVE CAP — Reduced rates apply" : "↓ BELOW CAP — Standard rates apply"}
                  </span>
                </div>
                <button onClick={()=>setModalTeacher(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none font-bold">×</button>
              </div>

              <div className="p-5 space-y-4">
                {/* Score + Hike summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Overall Score</p>
                    <p className="text-3xl font-bold" style={{color:pctColor}}>{pct > 0 ? pct.toFixed(1)+"%" : "—"}</p>
                    <p className="text-xs text-gray-400 mt-1">{getStatus(t) === "shared" ? "✅ Shared" : getStatus(t) === "saved" ? "💾 Saved" : "⏳ Pending"}</p>
                  </div>
                  <div className={`rounded-xl p-4 text-center border-2 ${inc.total >= 15 ? "bg-green-50 border-green-400" : inc.total >= 10 ? "bg-blue-50 border-blue-400" : inc.total > 0 ? "bg-yellow-50 border-yellow-400" : "bg-gray-50 border-gray-200"}`}>
                    <p className="text-xs text-gray-500 mb-1">Salary Hike</p>
                    <p className={`text-3xl font-bold ${inc.total >= 15 ? "text-green-700" : inc.total >= 10 ? "text-blue-700" : inc.total > 0 ? "text-yellow-700" : "text-gray-400"}`}>{pct > 0 ? inc.total+"%" : "—"}</p>
                    {pct > 0 && <p className="text-xs text-gray-500 mt-1">{inc.note}</p>}
                  </div>
                </div>

                {/* Hike breakdown */}
                {pct > 0 && (() => {
                  const nextBandSuggestion = (() => {
                    if (inc.overCap) return null;
                    if (pct >= 81) return null;
                    if (pct >= 75) return { needed: 81, hike: 15, current: 12, gap: (81 - pct).toFixed(1) };
                    if (pct >= 61) return { needed: 75, hike: 12, current: 10, gap: (75 - pct).toFixed(1) };
                    if (pct >= 51) return { needed: 61, hike: 10, current: 8,  gap: (61 - pct).toFixed(1) };
                    if (pct >= 50) return { needed: 51, hike: 8,  current: 5,  gap: (51 - pct).toFixed(1) };
                    return { needed: 50, hike: 5, current: 3, gap: (50 - pct).toFixed(1) };
                  })();
                  return (
                    <>
                      <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-800 space-y-1">
                        <p className="font-semibold mb-1">Hike Breakdown</p>
                        <div className="flex justify-between"><span>Score {pct.toFixed(1)}% → Band: {inc.band}</span><span className="font-bold">{inc.base}% base</span></div>
                        {inc.overCap && <div className="flex justify-between text-orange-600"><span>Salary above grade cap</span><span>Reduced (capping) rates applied</span></div>}
                        {rc > 0 && <div className="flex justify-between"><span>Extra responsibilities ({rc})</span><span className="font-bold text-green-700">+ {inc.extra}%</span></div>}
                        {inc.penalty > 0 && <div className="flex justify-between"><span>Unqualified for grade</span><span className="font-bold text-red-600">− {inc.penalty}%</span></div>}
                        <div className="flex justify-between border-t border-indigo-200 pt-1 font-bold"><span>Total</span><span>{inc.total}%</span></div>
                      </div>
                      {nextBandSuggestion && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                          <p className="font-semibold mb-1">To reach the next hike band:</p>
                          <p>Improve score by <strong>{nextBandSuggestion.gap}%</strong> → reach <strong>{nextBandSuggestion.needed}%</strong> to get <strong>{nextBandSuggestion.hike}% hike</strong> (currently {nextBandSuggestion.current}%)</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Section breakdown */}
                {pct > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600">Section-wise Performance</p>
                    {sections.map((s, i) => {
                      const sPct = s.max > 0 ? Math.min((s.score / s.max) * 100, 100) : 0;
                      const barColor = sPct >= 80 ? "#10b981" : sPct >= 60 ? "#6366f1" : sPct >= 40 ? "#f59e0b" : "#ef4444";
                      return (
                        <div key={i} className={`rounded-lg border-l-4 p-3 ${s.color}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-800">{s.label} <span className="text-gray-400 font-normal">({s.weight})</span></span>
                            <span className="text-xs font-bold text-gray-800">{sPct.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
                            <div className="h-1.5 rounded-full" style={{width:`${sPct}%`, backgroundColor:barColor}} />
                          </div>
                          {s.comment && <p className="text-xs text-gray-600 italic">💬 {s.comment}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {pct === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">No appraisal data filled yet.</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
