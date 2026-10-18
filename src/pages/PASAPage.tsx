import { useState, useEffect } from "react";
import axios from "axios";
import { currentAcademicYear } from "../utils/academicYear";
import AcademicYearSelect from "../components/AcademicYearSelect";

import { getAPI } from '../utils/api';
const API = getAPI();
const EXAM_TYPES = ["FA1", "FA2", "SA1", "FA3", "FA4", "SA2", "Custom"];

function getBand(pct: number) {
  if (pct >= 90) return { label: "A+", color: "text-green-700 bg-green-100" };
  if (pct >= 75) return { label: "A", color: "text-blue-700 bg-blue-100" };
  if (pct >= 60) return { label: "B", color: "text-indigo-700 bg-indigo-100" };
  if (pct >= 40) return { label: "C", color: "text-yellow-700 bg-yellow-100" };
  return { label: "D", color: "text-red-700 bg-red-100" };
}

function KPICard({ label, value, color }: any) {
  return (
    <div className={`bg-white rounded-xl shadow p-4 border-l-4 ${color}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value ?? "—"}</p>
    </div>
  );
}

export default function PASAPage({ allowedGrades }: { allowedGrades?: string[] } = {}) {
  const [activeTab, setActiveTab] = useState<"entry" | "bulk" | "dashboard" | "clear">("entry");
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">📝 PA/SA Marks</h1>
          <p className="text-xs text-gray-500">Subject-wise marks, per grade</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
          <AcademicYearSelect value={academicYear} onChange={setAcademicYear} />
        </div>
      </div>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 flex-nowrap">
        {[{id:"entry",label:"✏️ Marks Entry"},{id:"bulk",label:"📥 Bulk Import"},{id:"dashboard",label:"📊 Dashboard"},
          ...(allowedGrades?.length ? [] : [{id:"clear",label:"🗑️ Clear Data"}])].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap ${activeTab === t.id ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "entry" && <MarksSheetTab academicYear={academicYear} allowedGrades={allowedGrades} />}
      {activeTab === "bulk" && <BulkImportTab academicYear={academicYear} allowedGrades={allowedGrades} />}
      {activeTab === "dashboard" && <PASADashboardTab academicYear={academicYear} allowedGrades={allowedGrades} />}
      {activeTab === "clear" && !allowedGrades?.length && <ClearDataTab />}
    </div>
  );
}

function currentStaffIdentity() {
  try {
    const stored = localStorage.getItem("cbas_user");
    const u = stored ? JSON.parse(stored) : null;
    return { teacher_id: u?.id || "staff", teacher_name: u?.name || "Staff" };
  } catch { return { teacher_id: "staff", teacher_name: "Staff" }; }
}

function MarksSheetTab({ academicYear, allowedGrades }: any) {
  const [grade,setGrade]=useState("");
  const [section,setSection]=useState("");
  const [examType,setExamType]=useState("FA1");
  const [grades,setGrades]=useState<string[]>([]);
  const [sections,setSections]=useState<string[]>([]);
  const [gradeSubjects,setGradeSubjects]=useState<Record<string,string[]>>({});
  const [students,setStudents]=useState<any[]>([]);
  const [configs,setConfigs]=useState<any[]>([]);
  const [maxMarks,setMaxMarks]=useState<Record<string,string>>({});
  const [marks,setMarks]=useState<Record<string,Record<string,string>>>({});
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [importing,setImporting]=useState(false);
  const [msg,setMsg]=useState("");

  useEffect(()=>{fetchGrades();fetchGradeSubjects();},[]);
  useEffect(()=>{if(grade){fetchSections();setSection("");setStudents([]);setConfigs([]);setMaxMarks({});setMarks({});}},[grade]);
  useEffect(()=>{if(grade&&section)loadSheet();},[grade,section,examType,academicYear]);

  const fetchGrades=async()=>{try{const r=await axios.get(`${API}/students/stats`);const all:string[]=(r.data?.byGrade||[]).map((g:any)=>g.grade).sort();setGrades(allowedGrades?.length?all.filter((g:string)=>allowedGrades.includes(g)):all);}catch{}};
  const fetchSections=async()=>{try{const r=await axios.get(`${API}/students/sections/${encodeURIComponent(grade)}`);setSections(r.data?.sections||[]);}catch{}};
  const fetchGradeSubjects=async()=>{try{const r=await axios.get(`${API}/grade-subjects`);setGradeSubjects(r.data||{});}catch{}};

  const subjects:string[]=grade?(gradeSubjects[grade]||[]):[];

  const loadSheet=async()=>{
    setLoading(true);setMsg("");
    try{
      const [studentsRes,configsRes]=await Promise.all([
        axios.get(`${API}/students?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&academic_year=${academicYear}`),
        axios.get(`${API}/pasa/config/section?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&academic_year=${academicYear}`),
      ]);
      const sl=studentsRes.data||[];
      setStudents(sl);
      const relevantConfigs=(configsRes.data?.configs||[]).filter((c:any)=>c.exam_type===examType);
      setConfigs(relevantConfigs);

      const mm:Record<string,string>={};
      relevantConfigs.forEach((c:any)=>{mm[c.subject]=String(c.total_marks);});
      setMaxMarks(mm);

      const im:Record<string,Record<string,string>>={};
      sl.forEach((s:any)=>{im[s.id]={};});
      await Promise.all(relevantConfigs.map(async(c:any)=>{
        try{
          const r=await axios.get(`${API}/pasa/marks/entry?exam_config_id=${c.id}&grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`);
          (r.data?.students||[]).forEach((rs:any)=>{
            if(!im[rs.student_id])im[rs.student_id]={};
            const existing=rs.existing_marks;
            if(!existing)return;
            if(existing.is_absent){im[rs.student_id][c.subject]="AB";return;}
            const cs=(existing.competency_scores||[])[0];
            im[rs.student_id][c.subject]=cs?.marks_obtained!=null?String(cs.marks_obtained):"";
          });
        }catch{}
      }));
      setMarks(im);
    }catch{setMsg("❌ Failed to load sheet.");}
    setLoading(false);
  };

  const rowTotal=(sid:string)=>{
    let obtained=0,maxSum=0,any=false;
    subjects.forEach(sub=>{
      const mm=+(maxMarks[sub]||0);
      if(!mm)return;
      const cell=marks[sid]?.[sub];
      if(cell===undefined||cell==="")return;
      if(cell.trim().toLowerCase().startsWith("ab"))return;
      const n=Number(cell);
      if(isNaN(n))return;
      obtained+=Math.min(n,mm);maxSum+=mm;any=true;
    });
    return{obtained,maxSum,pct:maxSum>0?+((obtained/maxSum)*100).toFixed(1):0,any};
  };

  const saveSheet=async()=>{
    const activeSubjects=subjects.filter(sub=>+(maxMarks[sub]||0)>0);
    if(!activeSubjects.length){setMsg("❌ Enter Max Marks for at least one subject column");return;}
    setSaving(true);
    try{
      const {teacher_id,teacher_name}=currentStaffIdentity();
      for(const subject of activeSubjects){
        const mmVal=+maxMarks[subject];
        const existing=configs.find((c:any)=>c.subject===subject);
        let configId=existing?.id;
        if(!existing||+existing.total_marks!==mmVal){
          const competencies=[{competency_id:"TOTAL",competency_code:subject,competency_name:subject,max_marks:mmVal}];
          const r=await axios.post(`${API}/pasa/config`,{
            teacher_name,teacher_id,subject,grade,section,
            exam_type:examType,academic_year:academicYear,competencies,
          });
          configId=r.data?.config_id||configId;
        }
        if(!configId)continue;
        const entries=students.map((s:any)=>{
          const cell=marks[s.id]?.[subject]??"";
          const isAbsent=cell.trim().toLowerCase().startsWith("ab");
          const n=cell===""||isAbsent?null:Math.min(Number(cell),mmVal);
          return{
            student_id:s.id,student_name:s.name,is_absent:isAbsent,
            competency_scores:[{competency_id:"TOTAL",competency_code:subject,competency_name:subject,
              marks_obtained:isAbsent?null:(n!==null&&!isNaN(n)?n:null),max_marks:mmVal}],
          };
        });
        await axios.post(`${API}/pasa/marks`,{
          exam_config_id:configId,grade,section,subject,exam_type:examType,
          academic_year:academicYear,teacher_id,entries,
        });
      }
      setMsg("✅ Sheet saved!");
      loadSheet();
    }catch{setMsg("❌ Save failed.");}
    setSaving(false);setTimeout(()=>setMsg(""),3000);
  };

  const downloadTemplate=async()=>{
    if(!students.length||!subjects.length)return;
    const XLSX=await import("xlsx");
    const header=["Student Name",...subjects.map(s=>`${s} (out of ${maxMarks[s]||"?"}) — AB if absent`)];
    const rows=students.map((s:any)=>[s.name,...subjects.map(()=>"")]);
    const ws=XLSX.utils.aoa_to_sheet([header,...rows]);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Marks");
    XLSX.writeFile(wb,`${grade}_${section}_${examType}_template.xlsx`.replace(/\s+/g,"_"));
  };

  const importFromExcel=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setImporting(true);
    try{
      const XLSX=await import("xlsx");
      const buffer=await file.arrayBuffer();
      const wb=XLSX.read(buffer);
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows:any[][]=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
      if(rows.length<2){setMsg("❌ No data rows found in file");setImporting(false);e.target.value="";return;}
      const headerRow=rows[0];
      const colSubject:Record<number,string>={};
      for(let c=1;c<headerRow.length;c++){
        const text=(headerRow[c]??"").toString().trim().toLowerCase();
        const match=subjects.find(sub=>text.startsWith(sub.toLowerCase()));
        if(match)colSubject[c]=match;
      }
      if(!Object.keys(colSubject).length){setMsg("❌ Couldn't match any columns to this grade's subjects");setImporting(false);e.target.value="";return;}
      const norm=(v:any)=>(v??"").toString().trim().toLowerCase();
      const byName:Record<string,any>={};
      students.forEach((s:any)=>{byName[norm(s.name)]=s;});
      const newMarks={...marks};
      let matchedRows=0;
      for(let i=1;i<rows.length;i++){
        const row=rows[i];
        const name=row[0];
        if(!name)continue;
        const stu=byName[norm(name)];
        if(!stu)continue;
        matchedRows++;
        if(!newMarks[stu.id])newMarks[stu.id]={};
        Object.entries(colSubject).forEach(([idx,sub])=>{
          const cell=row[+idx];
          if(cell===""||cell===null||cell===undefined)return;
          newMarks[stu.id][sub]=cell.toString().trim();
        });
      }
      setMarks(newMarks);
      setMsg(`✅ Imported ${matchedRows} of ${rows.length-1} rows — review below, then Save`);
    }catch{setMsg("❌ Couldn't read that file — is it a valid .xlsx/.xls?");}
    setImporting(false);e.target.value="";setTimeout(()=>setMsg(""),6000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label className="text-xs text-gray-500 block mb-1">Grade</label>
          <select value={grade} onChange={e=>setGrade(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
            <option value="">Select grade</option>{grades.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
        <div><label className="text-xs text-gray-500 block mb-1">Section</label>
          <select value={section} onChange={e=>setSection(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
            <option value="">Select section</option>{sections.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        <div><label className="text-xs text-gray-500 block mb-1">Exam Type</label>
          <select value={examType} onChange={e=>setExamType(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
            {EXAM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
      </div>

      {msg&&<div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅")?"bg-green-50 border-green-300 text-green-800":"bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}

      {loading&&<div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Loading sheet...</div>}

      {!loading&&grade&&section&&subjects.length===0&&(
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          <p className="text-2xl mb-2">📭</p><p className="text-sm">No subjects configured for {grade} in the Subjects module yet.</p>
        </div>
      )}

      {!loading&&grade&&section&&subjects.length>0&&students.length===0&&(
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          <p className="text-2xl mb-2">📭</p><p className="text-sm">No students enrolled in {grade} {section} for {academicYear}.</p>
        </div>
      )}

      {!loading&&grade&&section&&subjects.length>0&&students.length>0&&(
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-bold text-indigo-800">{examType} · {grade} {section}</p>
              <p className="text-xs text-indigo-600">{students.length} students · set Max Marks per subject below, then enter marks</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={downloadTemplate} className="px-3 py-2 bg-white border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 font-medium">
                ⬇ Download Template</button>
              <label className="px-3 py-2 bg-white border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 font-medium cursor-pointer">
                {importing?"Importing...":"📤 Import from Excel"}
                <input type="file" accept=".xlsx,.xls" onChange={importFromExcel} disabled={importing} className="hidden" />
              </label>
              <button onClick={saveSheet} disabled={saving} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                {saving?"Saving...":"💾 Save Sheet"}</button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-indigo-700 text-white">
                    <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 z-10 min-w-[160px]">Student</th>
                    {subjects.map(sub=>(
                      <th key={sub} className="px-2 py-2 text-center min-w-[90px]">
                        <div className="text-xs font-medium">{sub}</div>
                        <input type="number" min={1} max={500} value={maxMarks[sub]||""} placeholder="Max"
                          onChange={e=>setMaxMarks(p=>({...p,[sub]:e.target.value}))}
                          className="mt-1 border border-indigo-300 rounded px-1 py-0.5 w-16 text-center text-xs text-gray-800" />
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center min-w-[60px]">Total</th>
                    <th className="px-2 py-2 text-center min-w-[50px]">%</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s:any,i:number)=>{
                    const {obtained,maxSum,pct,any}=rowTotal(s.id);
                    const band=any?getBand(pct):null;
                    return(
                      <tr key={s.id} className={i%2===0?"bg-white":"bg-gray-50"}>
                        <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit">{s.name}</td>
                        {subjects.map(sub=>{
                          const hasMax=!!maxMarks[sub];
                          return(
                            <td key={sub} className="px-2 py-2 text-center">
                              <input type="text" value={marks[s.id]?.[sub]??""}
                                disabled={!hasMax}
                                placeholder={hasMax?"":"set max"}
                                onChange={e=>{
                                  const v=e.target.value;
                                  setMarks(p=>({...p,[s.id]:{...p[s.id],[sub]:v}}));
                                }}
                                className="border border-gray-300 rounded px-1 py-0.5 w-14 text-center text-xs disabled:bg-gray-100" />
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center font-bold text-gray-700">
                          {any?`${obtained}/${maxSum}`:<span className="text-gray-300 font-normal">—</span>}</td>
                        <td className="px-2 py-2 text-center">
                          {any&&band&&<span className={`px-1.5 py-0.5 rounded text-xs font-bold ${band.color}`}>{pct}%</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={saveSheet} disabled={saving} className="px-6 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
            {saving?"Saving...":"💾 Save Sheet"}</button>
        </div>
      )}
    </div>
  );
}

const SUBJECT_SYNONYMS: Record<string,string> = { mathematics: "math", maths: "math" };
function subjectHeaderMatches(header: string, subject: string): boolean {
  const h = header.trim().toLowerCase();
  const s = subject.trim().toLowerCase();
  if (h === s) return true;
  if (SUBJECT_SYNONYMS[h] === s) return true;
  return false;
}
const normName = (v: any) => (v ?? "").toString().trim().toLowerCase();

interface BulkSheetPreview {
  sheetName: string;
  grade: string;
  section: string;
  subjects: string[];
  unmatchedSubjectHeaders: string[];
  matchedRows: { student: any; cellsBySubject: Record<string, any> }[];
  unmatchedNames: string[];
}

function BulkImportTab({ academicYear, allowedGrades }: any) {
  const [examType, setExamType] = useState("FA1");
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<{ sheets: BulkSheetPreview[]; unrecognized: string[] } | null>(null);
  const [maxMarksGrid, setMaxMarksGrid] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [saveLog, setSaveLog] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true); setMsg(""); setPreview(null); setSaveLog([]); setMaxMarksGrid({});
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const gradeSubjectsRes = await axios.get(`${API}/grade-subjects`);
      const gradeSubjects: Record<string,string[]> = gradeSubjectsRes.data || {};

      const sheets: BulkSheetPreview[] = [];
      const unrecognized: string[] = [];
      const sectionsCache: Record<string,string[]> = {};

      for (const sheetName of wb.SheetNames) {
        const gm = sheetName.match(/^g(?:rade)?\s*(\d+)/i);
        if (!gm) { unrecognized.push(sheetName); continue; }
        const grade = `Grade ${gm[1]}`;
        if (allowedGrades?.length && !allowedGrades.includes(grade)) { unrecognized.push(`${sheetName} (${grade} is outside your stage)`); continue; }

        if (!sectionsCache[grade]) {
          try { const r = await axios.get(`${API}/students/sections/${encodeURIComponent(grade)}`); sectionsCache[grade] = r.data?.sections || []; }
          catch { sectionsCache[grade] = []; }
        }
        const upperSheet = sheetName.toUpperCase();
        const section = sectionsCache[grade].find(s => upperSheet.includes(s.toUpperCase()));
        if (!section) { unrecognized.push(`${sheetName} (grade detected, no matching section name)`); continue; }

        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(3, rows.length); i++) {
          if (rows[i]?.some((c:any) => typeof c === "string" && /name/i.test(c))) { headerRowIdx = i; break; }
        }
        if (headerRowIdx === -1) { unrecognized.push(`${sheetName} (no header row with a Name column found)`); continue; }
        const header = rows[headerRowIdx].map((h:any) => (h ?? "").toString().trim());
        const nameColIdx = header.findIndex(h => /name/i.test(h));
        const gradeSubs = gradeSubjects[grade] || [];
        const subjectCols: { idx: number; subject: string }[] = [];
        const unmatchedSubjectHeaders: string[] = [];
        header.forEach((h, idx) => {
          if (idx === nameColIdx || !h) return;
          if (/grand percentage/i.test(h) || /roll/i.test(h)) return;
          const match = gradeSubs.find(s => subjectHeaderMatches(h, s));
          if (match) subjectCols.push({ idx, subject: match });
          else unmatchedSubjectHeaders.push(h);
        });

        let students: any[] = [];
        try {
          const r = await axios.get(`${API}/students?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&academic_year=${academicYear}`);
          students = r.data || [];
        } catch {}
        const byName: Record<string, any> = {};
        students.forEach(s => { byName[normName(s.name)] = s; });

        const matchedRows: { student: any; cellsBySubject: Record<string, any> }[] = [];
        const unmatchedNames: string[] = [];
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (typeof row?.[0] !== "number") break; // Roll No stops being numeric -> end of real roster
          const name = row[nameColIdx];
          if (!name) continue;
          const stu = byName[normName(name)];
          const cellsBySubject: Record<string, any> = {};
          subjectCols.forEach(({ idx, subject }) => { cellsBySubject[subject] = row[idx]; });
          if (stu) matchedRows.push({ student: stu, cellsBySubject });
          else unmatchedNames.push(name.toString());
        }

        sheets.push({ sheetName, grade, section, subjects: subjectCols.map(s => s.subject), unmatchedSubjectHeaders, matchedRows, unmatchedNames });
      }

      setPreview({ sheets, unrecognized });
    } catch { setMsg("❌ Couldn't parse that file — is it a valid .xlsx/.xls?"); }
    setParsing(false); e.target.value = "";
  };

  const allPairs = (): string[] => {
    const set = new Set<string>();
    preview?.sheets.forEach(s => s.subjects.forEach(sub => set.add(`${s.grade}__${sub}`)));
    return [...set].sort();
  };
  const canConfirm = !!preview && preview.sheets.length > 0 && allPairs().every(k => +(maxMarksGrid[k] || 0) > 0);

  const confirmSave = async () => {
    if (!preview) return;
    setSaving(true);
    const log: string[] = [];
    const { teacher_id, teacher_name } = currentStaffIdentity();
    for (const sheet of preview.sheets) {
      for (const subject of sheet.subjects) {
        const key = `${sheet.grade}__${subject}`;
        const mm = +(maxMarksGrid[key] || 0);
        if (!mm) continue;
        try {
          const competencies = [{ competency_id: "TOTAL", competency_code: subject, competency_name: subject, max_marks: mm }];
          const cfgRes = await axios.post(`${API}/pasa/config`, {
            teacher_id, teacher_name, subject, grade: sheet.grade, section: sheet.section,
            exam_type: examType, academic_year: academicYear, competencies,
          });
          const configId = cfgRes.data?.config_id;
          if (!configId) { log.push(`❌ ${sheet.sheetName} / ${subject}: no config id returned`); continue; }
          const entries = sheet.matchedRows.map(({ student, cellsBySubject }) => {
            const cell = cellsBySubject[subject];
            const isAbsent = typeof cell === "string" && cell.trim().toLowerCase().startsWith("ab");
            const n = (cell === "" || cell === null || cell === undefined || isAbsent) ? null : Math.min(Number(cell), mm);
            return {
              student_id: student.id, student_name: student.name, is_absent: isAbsent,
              competency_scores: [{ competency_id: "TOTAL", competency_code: subject, competency_name: subject,
                marks_obtained: isAbsent ? null : (n !== null && !isNaN(n) ? n : null), max_marks: mm }],
            };
          });
          await axios.post(`${API}/pasa/marks`, {
            exam_config_id: configId, grade: sheet.grade, section: sheet.section,
            subject, exam_type: examType, academic_year: academicYear, teacher_id, entries,
          });
          log.push(`✅ ${sheet.sheetName} / ${subject}: ${entries.length} students saved`);
        } catch (e:any) {
          log.push(`❌ ${sheet.sheetName} / ${subject}: ${e?.response?.data?.message || "save failed"}`);
        }
      }
    }
    setSaveLog(log);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <p className="text-sm text-gray-600">
          Upload one workbook covering as many grades as you like — one sheet per section, named like your real
          marks-analysis file (e.g. "G9 MERU"). The section name in the sheet must match a section currently
          registered for that grade, and each subject column header must match a name in that grade's Subjects
          module (e.g. "Mathematics" auto-matches "Math", but a renamed subject like "IT" → "CT & AI" won't —
          you'll see it flagged below if a column gets skipped). Sheets or columns that don't match are skipped, not guessed.
          {allowedGrades?.length ? ` Only sheets for your stage (${allowedGrades.join(", ")}) will be processed — others are skipped.` : ""}
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div><label className="text-xs text-gray-500 block mb-1">Exam Type</label>
            <select value={examType} onChange={e=>setExamType(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              {EXAM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className="text-xs text-gray-500 block mb-1">Workbook (.xlsx/.xls)</label>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} disabled={parsing} className="text-sm" /></div>
          {parsing && <span className="text-xs text-indigo-500 animate-pulse">Parsing and matching rosters...</span>}
        </div>
      </div>

      {msg && <div className="px-4 py-2 rounded text-sm border bg-red-50 border-red-300 text-red-800">{msg}</div>}

      {preview && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Detected Sheets ({preview.sheets.length})</h3>
            <div className="space-y-2">
              {preview.sheets.map(s => (
                <div key={s.sheetName} className="text-xs border border-gray-200 rounded-lg p-2">
                  <span className="font-medium text-gray-800">{s.sheetName}</span>
                  <span className="text-gray-500"> → {s.grade} · {s.section} · {s.subjects.join(", ") || "no matching subjects"}</span>
                  <span className={`ml-2 ${s.unmatchedNames.length ? "text-amber-600" : "text-green-600"}`}>
                    {s.matchedRows.length} matched{s.unmatchedNames.length ? `, ${s.unmatchedNames.length} unmatched` : ""}
                  </span>
                  {s.unmatchedNames.length > 0 && (
                    <p className="text-gray-400 mt-1">Unmatched students: {s.unmatchedNames.join(", ")}</p>
                  )}
                  {s.unmatchedSubjectHeaders.length > 0 && (
                    <p className="text-amber-600 mt-1">⚠ Column(s) not found in {s.grade}'s Subjects list, skipped: {s.unmatchedSubjectHeaders.join(", ")}</p>
                  )}
                </div>
              ))}
            </div>
            {preview.unrecognized.length > 0 && (
              <div className="mt-3 text-xs text-amber-600">
                <p className="font-medium">Skipped sheets:</p>
                <p>{preview.unrecognized.join(" · ")}</p>
              </div>
            )}
          </div>

          {allPairs().length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-1">Set Max Marks</h3>
              <p className="text-xs text-gray-500 mb-3">Required for every grade/subject before saving — these raw marks will be scaled against whatever you set here.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {allPairs().map(key => {
                  const [grade, subject] = key.split("__");
                  return (
                    <div key={key}>
                      <label className="text-xs text-gray-500 block mb-1">{grade} · {subject}</label>
                      <input type="number" min={1} max={500} value={maxMarksGrid[key] || ""} placeholder="Max"
                        onChange={e=>setMaxMarksGrid(p=>({...p,[key]:e.target.value}))}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button onClick={confirmSave} disabled={!canConfirm || saving}
            className="px-6 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
            {saving ? "Saving..." : "💾 Confirm & Save All"}
          </button>
          {!canConfirm && allPairs().length > 0 && <p className="text-xs text-red-500">Fill in Max Marks for every grade/subject above first.</p>}

          {saveLog.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Result</h3>
              <div className="space-y-1 text-xs max-h-80 overflow-y-auto">
                {saveLog.map((l, i) => <p key={i} className={l.startsWith("✅") ? "text-green-700" : "text-red-600"}>{l}</p>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PASADashboardTab({ academicYear, allowedGrades }: any) {
  const [dashTab,setDashTab]=useState<"school"|"grade"|"section"|"student"|"alerts">("school");
  const [grade,setGrade]=useState("");
  const [section,setSection]=useState("");
  const [examType,setExamType]=useState("");
  const [grades,setGrades]=useState<string[]>([]);
  const [sections,setSections]=useState<string[]>([]);
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{fetchGrades();},[]);
  useEffect(()=>{if(grade)fetchSections();},[grade]);
  useEffect(()=>{fetchData();},[dashTab,academicYear,grade,section,examType]);

  const fetchGrades=async()=>{try{const r=await axios.get(`${API}/students/stats`);const all:string[]=(r.data?.byGrade||[]).map((g:any)=>g.grade).sort();setGrades(allowedGrades?.length?all.filter((g:string)=>allowedGrades.includes(g)):all);}catch{}};
  const fetchSections=async()=>{try{const r=await axios.get(`${API}/students/sections/${encodeURIComponent(grade)}`);setSections(r.data?.sections||[]);}catch{}};

  const fetchData=async()=>{
    setLoading(true);setData(null);
    try{
      const et=examType?`&exam_type=${examType}`:"";
      if(dashTab==="school"){const r=await axios.get(`${API}/pasa/dashboard/school?academic_year=${academicYear}${et}`);setData(r.data);}
      else if(dashTab==="grade"&&grade){const r=await axios.get(`${API}/pasa/dashboard/grade/${encodeURIComponent(grade)}?academic_year=${academicYear}${et}`);setData(r.data);}
      else if(dashTab==="section"&&grade&&section){const r=await axios.get(`${API}/pasa/dashboard/section?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&academic_year=${academicYear}${et}`);setData(r.data);}
      else if(dashTab==="student"){} // handled by StudentDashboard component
      else if(dashTab==="alerts"){const r=await axios.get(`${API}/pasa/alerts/decline?academic_year=${academicYear}${grade?`&grade=${encodeURIComponent(grade)}`:""}${section?`&section=${encodeURIComponent(section)}`:""}`);setData(r.data);}
    }catch{}
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap items-center">
        {[{id:"school",label:"🏫 School"},{id:"grade",label:"📚 Grade"},{id:"section",label:"🏛 Section"},{id:"student",label:"👤 Student"},{id:"alerts",label:"⚠️ Alerts"}].map(t=>(
          <button key={t.id} onClick={()=>setDashTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap ${dashTab===t.id?"bg-indigo-600 text-white":"bg-white border border-gray-300 text-gray-600 hover:bg-indigo-50"}`}>
            {t.label}</button>
        ))}
        <button onClick={fetchData} className="ml-auto px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">🔄 Refresh</button>
      </div>
      <div className="bg-white rounded-xl shadow p-3 flex gap-3 flex-wrap items-end">
        <div><label className="text-xs text-gray-500 block mb-1">Exam Type</label>
          <select value={examType} onChange={e=>setExamType(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            <option value="">All</option>{EXAM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        {(dashTab==="grade"||dashTab==="section"||dashTab==="alerts"||dashTab==="student")&&(
          <div><label className="text-xs text-gray-500 block mb-1">Grade</label>
            <select value={grade} onChange={e=>setGrade(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">Select</option>{grades.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
        )}
        {(dashTab==="section"||dashTab==="alerts"||dashTab==="student")&&grade&&(
          <div><label className="text-xs text-gray-500 block mb-1">Section</label>
            <select value={section} onChange={e=>setSection(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">All</option>{sections.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        )}
      </div>
      {loading&&<div className="bg-white rounded-xl shadow p-8 text-center"><div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div><p className="text-sm text-gray-400">Loading...</p></div>}
      {!loading&&dashTab==="school"&&data&&(
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard label="Total Entries" value={data.total_entries} color="border-indigo-500" />
            <KPICard label="Grades" value={data.gradeSummary?.length} color="border-blue-500" />
            <KPICard label="Subjects" value={data.subjectSummary?.length} color="border-green-500" />
            <KPICard label="Weak Competencies" value={data.weakCompetencies?.length} color="border-red-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Grade-wise Performance</h3>
              {data.gradeSummary?.map((g:any)=>(
                <div key={g.grade} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-gray-600 w-20">{g.grade}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{width:`${g.avg}%`}}></div></div>
                  <span className="text-xs font-bold text-gray-700 w-12 text-right">{g.avg?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Subject-wise Performance</h3>
              {data.subjectSummary?.map((s:any)=>(
                <div key={s.subject} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-gray-600 w-20 truncate">{s.subject}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width:`${s.avg}%`}}></div></div>
                  <span className="text-xs font-bold text-gray-700 w-12 text-right">{s.avg?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
          {data.weakCompetencies?.length>0&&(
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">⚠️ Weakest Competencies School-wide</h3>
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b"><th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-center">Avg %</th></tr></thead>
                <tbody>{data.weakCompetencies.map((c:any,i:number)=>(
                  <tr key={i} className={i%2===0?"bg-white":"bg-gray-50"}>
                    <td className="px-3 py-2 font-medium text-red-700">{c.code}</td>
                    <td className="px-3 py-2 text-gray-600">{c.subject}</td>
                    <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold">{c.avg?.toFixed(1)}%</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {!loading&&dashTab==="grade"&&data&&(
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Section Performance</h3>
            {data.sectionSummary?.map((s:any)=>(
              <div key={s.section} className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-600 w-24">{s.section}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{width:`${s.avg}%`}}></div></div>
                <span className="text-xs font-bold text-gray-700 w-12 text-right">{s.avg?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Subject Performance</h3>
            {data.subjectSummary?.map((s:any)=>(
              <div key={s.subject} className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-600 w-24 truncate">{s.subject}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width:`${s.avg}%`}}></div></div>
                <span className="text-xs font-bold text-gray-700 w-12 text-right">{s.avg?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading&&dashTab==="section"&&data&&(
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Subject & Competency Overview</h3>
          {data.subjectSummary?.map((s:any)=>(
            <div key={s.subject} className="mb-4">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-medium text-gray-700 w-24 truncate">{s.subject}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{width:`${s.avg_percentage}%`}}></div></div>
                <span className="text-xs font-bold text-gray-700 w-20 text-right">{s.avg_percentage?.toFixed(1)}% ({s.assessed}/{s.total_students})</span>
              </div>
              {s.competency_avgs?.length>0&&(
                <div className="ml-28 flex gap-2 flex-wrap">
                  {s.competency_avgs.map((c:any)=>(
                    <span key={c.code} className={`px-1.5 py-0.5 rounded text-xs ${c.avg<60?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>{c.code}: {c.avg?.toFixed(0)}%</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {!loading&&dashTab==="student"&&(
        <StudentDashTab grade={grade} section={section} academicYear={academicYear} />
      )}
      {!loading&&dashTab==="alerts"&&Array.isArray(data?.alerts)&&(
        <div className="space-y-3">
          {data.alerts.length===0?(
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400"><p className="text-2xl mb-2">✅</p><p className="text-sm">No consecutive decline alerts.</p></div>
          ):(
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm font-bold text-amber-800">⚠️ {data.alerts.length} students showing consecutive decline</p>
                <p className="text-xs text-amber-600">Students who scored lower in 2 consecutive exams for the same competency.</p>
              </div>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50 border-b">
                      <th className="px-3 py-2 text-left">Student</th>
                      <th className="px-3 py-2 text-left">Subject</th>
                      <th className="px-3 py-2 text-left">Competency</th>
                      <th className="px-3 py-2 text-left">Exam Scores</th>
                      <th className="px-3 py-2 text-center">Drop</th>
                    </tr></thead>
                    <tbody>
                      {data.alerts.map((a:any,i:number)=>(
                        <tr key={i} className={i%2===0?"bg-white":"bg-gray-50"}>
                          <td className="px-3 py-2 font-medium text-gray-800">{a.student_name}</td>
                          <td className="px-3 py-2 text-gray-600">{a.subject}</td>
                          <td className="px-3 py-2 font-medium text-indigo-700">{a.competency_code}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              {a.exam_scores?.map((e:any,j:number)=>(
                                <span key={j} className={`px-1.5 py-0.5 rounded text-xs ${j>0&&e.pct<a.exam_scores[j-1]?.pct?"bg-red-100 text-red-700":"bg-gray-100 text-gray-700"}`}>
                                  {e.exam_type}: {e.pct?.toFixed(0)}%</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold">-{a.drop?.toFixed(1)}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StudentDashTab({ grade, section, academicYear }: any) {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { if (grade && section) fetchStudents(); }, [grade, section]);

  const fetchStudents = async () => {
    try {
      const r = await axios.get(`${API}/students?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`);
      setStudents((r.data?.data || r.data || []).filter((s: any) => s.is_active !== false));
    } catch {}
  };

  const loadAnalysis = async (student: any) => {
    setSelectedStudent(student); setAnalysis(null); setLoading(true);
    try {
      const r = await axios.get(`${API}/pasa/student/${student.id}/analysis?academic_year=${academicYear}`);
      setAnalysis(r.data);
    } catch {}
    setLoading(false);
  };

  const filtered = students.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()));

  if (!grade || !section) return (
    <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">Select a grade and section to view students.</div>
  );

  if (selectedStudent) return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => { setSelectedStudent(null); setAnalysis(null); }}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg">← Back</button>
        <div>
          <h2 className="text-sm font-bold text-gray-800">👤 {selectedStudent.name}</h2>
          <p className="text-xs text-gray-500">{grade} · {section} · {academicYear}</p>
        </div>
      </div>
      {loading && <div className="bg-white rounded-xl shadow p-8 text-center"><div className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}
      {!loading && !analysis && <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No PA/SA data for this student yet.</div>}
      {!loading && analysis && (
        <div className="space-y-4">
          {/* Exam summary table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-indigo-700 text-white"><p className="text-sm font-bold">Exam Performance</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="px-3 py-2 text-left">Exam</th>
                  {analysis.subjects?.map((s: string) => <th key={s} className="px-3 py-2 text-center">{s}</th>)}
                  <th className="px-3 py-2 text-center font-bold">Overall</th>
                  <th className="px-3 py-2 text-center">Band</th>
                </tr></thead>
                <tbody>
                  {analysis.examSummary?.map((exam: any, i: number) => (
                    <tr key={exam.exam} className={i%2===0?"bg-white":"bg-gray-50"}>
                      <td className="px-3 py-2 font-medium text-gray-700">{exam.exam}</td>
                      {analysis.subjects?.map((s: string) => {
                        const sd = exam.subjects?.[s];
                        return <td key={s} className="px-3 py-2 text-center">
                          {sd?.percentage != null ? <span className={`font-medium ${sd.percentage>=80?"text-green-600":sd.percentage>=60?"text-blue-600":sd.percentage>=40?"text-yellow-600":"text-red-600"}`}>{sd.percentage}%</span> : <span className="text-gray-300">—</span>}
                        </td>;
                      })}
                      <td className="px-3 py-2 text-center font-bold">
                        {exam.grand_percentage != null ? <span className={exam.grand_percentage>=80?"text-green-600":exam.grand_percentage>=60?"text-blue-600":exam.grand_percentage>=40?"text-yellow-600":"text-red-600"}>{exam.grand_percentage}%</span> : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {exam.band && <span className={`px-2 py-0.5 rounded text-xs font-bold ${exam.band==="A+"?"bg-green-100 text-green-700":exam.band==="A"?"bg-blue-100 text-blue-700":exam.band==="B"?"bg-indigo-100 text-indigo-700":exam.band==="C"?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700"}`}>{exam.band}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Competency profile */}
          {analysis.competencyProfile?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Competency Profile (avg across all exams)</h3>
              <div className="space-y-1.5">
                {analysis.competencyProfile.slice(0, 15).map((c: any) => (
                  <div key={c.code} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-16 flex-shrink-0">{c.code}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${c.avg>=80?"bg-green-500":c.avg>=60?"bg-blue-500":c.avg>=40?"bg-yellow-500":"bg-red-500"}`} style={{width:`${c.avg}%`}}></div>
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-10 text-right">{c.avg?.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search student..." className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No students found.</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b"><span className="text-sm font-semibold text-gray-700">{filtered.length} Students</span></div>
          <div className="divide-y divide-gray-100">
            {filtered.map((s: any) => (
              <button key={s.id} onClick={() => loadAnalysis(s)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-indigo-50 text-left">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.admission_no}</p>
                </div>
                <span className="text-xs text-indigo-600">View →</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClearDataTab() {
  const [clearing,setClearing]=useState(false);
  const [msg,setMsg]=useState("");
  const clearData=async()=>{
    if(!confirm("⚠️ Delete ALL PA/SA data? Cannot be undone."))return;
    if(!confirm("Confirm again?"))return;
    setClearing(true);
    try{await axios.delete(`${API}/pasa/clear-all`);setMsg("✅ All PA/SA data cleared.");}
    catch{setMsg("❌ Clear failed.");}
    setClearing(false);
  };
  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-red-800 mb-2">⚠️ Clear All PA/SA Data</h3>
        <p className="text-xs text-red-700">Permanently deletes all exam configurations and marks. Use to reset for the new competency-mapped system.</p>
      </div>
      {msg&&<div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅")?"bg-green-50 border-green-300 text-green-800":"bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}
      <button onClick={clearData} disabled={clearing} className="px-5 py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">
        {clearing?"Clearing...":"🗑️ Clear All PASA Data"}</button>
    </div>
  );
}
