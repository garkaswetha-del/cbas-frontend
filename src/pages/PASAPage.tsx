import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://cbas-backend-production.up.railway.app";
const EXAM_TYPES = ["FA1", "FA2", "SA1", "FA3", "FA4", "SA2", "Custom"];
const ACADEMIC_YEARS = ["2025-26", "2024-25", "2026-27"];

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

export default function PASAPage() {
  const [activeTab, setActiveTab] = useState<"config" | "entry" | "dashboard" | "clear">("config");
  const [academicYear, setAcademicYear] = useState("2025-26");
  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">📝 PA/SA Marks</h1>
          <p className="text-xs text-gray-500">Competency-mapped exam system</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 flex-nowrap">
        {[{id:"config",label:"⚙️ Exam Configuration"},{id:"entry",label:"✏️ Marks Entry"},{id:"dashboard",label:"📊 Dashboard"},{id:"clear",label:"🗑️ Clear Data"}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap ${activeTab === t.id ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "config" && <ExamConfigTab academicYear={academicYear} />}
      {activeTab === "entry" && <MarksEntryTab academicYear={academicYear} />}
      {activeTab === "dashboard" && <PASADashboardTab academicYear={academicYear} />}
      {activeTab === "clear" && <ClearDataTab />}
    </div>
  );
}

function ExamConfigTab({ academicYear }: any) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ teacher_name:"", teacher_id:"", subject:"", grade:"", section:"", exam_type:"FA1", exam_date:"", description:"" });
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [loadingComps, setLoadingComps] = useState(false);
  const [selectedComps, setSelectedComps] = useState<any[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [filterGrade, setFilterGrade] = useState("");

  useEffect(() => { fetchConfigs(); fetchGrades(); }, [academicYear]);

  const fetchGrades = async () => {
    try {
      const r = await axios.get(`${API}/students/stats`);
      setGrades((r.data?.byGrade||[]).map((g:any)=>g.grade).sort());
    } catch {}
  };

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/pasa/config/section?grade=&section=&academic_year=${academicYear}`);
      setConfigs(r.data?.configs||[]);
    } catch {}
    setLoading(false);
  };

  const fetchCompetencies = async () => {
    if (!form.subject) return;
    setLoadingComps(true);
    try {
      const params = new URLSearchParams({ subject: form.subject });
      if (form.grade) params.append('grade', form.grade);
      const r = await axios.get(`${API}/activities/competencies?${params}`);
      const data = r.data?.competencies||r.data||[];
      setCompetencies(Array.isArray(data)?data:[]);
    } catch {}
    setLoadingComps(false);
  };

  useEffect(() => { if (form.subject) fetchCompetencies(); }, [form.subject, form.grade]);

  const toggleComp = (comp: any) => {
    setSelectedComps(prev => {
      const exists = prev.find((c:any)=>c.competency_id===comp.id);
      if (exists) return prev.filter((c:any)=>c.competency_id!==comp.id);
      return [...prev,{competency_id:comp.id,competency_code:comp.code,competency_name:comp.name,max_marks:10}];
    });
  };

  const updateMaxMarks = (cid: string, mm: number) => setSelectedComps(p=>p.map((c:any)=>c.competency_id===cid?{...c,max_marks:mm}:c));
  const totalMarks = selectedComps.reduce((s:number,c:any)=>s+(+c.max_marks||0),0);

  const saveConfig = async () => {
    if (!form.teacher_name||!form.subject||!form.grade||!form.section||!form.exam_type){setMsg("❌ Fill all required fields");return;}
    if (!selectedComps.length){setMsg("❌ Select at least one competency");return;}
    setSaving(true);
    try {
      const r = await axios.post(`${API}/pasa/config`,{...form,academic_year:academicYear,competencies:selectedComps});
      if (r.data?.success){setMsg("✅ Saved!");setShowForm(false);setSelectedComps([]);fetchConfigs();}
    } catch {setMsg("❌ Save failed");}
    setSaving(false); setTimeout(()=>setMsg(""),3000);
  };

  const deleteConfig = async (id:string) => {
    if (!confirm("Delete?")) return;
    await axios.delete(`${API}/pasa/config/${id}`);
    fetchConfigs();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <select value={filterGrade} onChange={e=>setFilterGrade(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Grades</option>
          {grades.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
        <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-lg">Exams are created by teachers in their login</span>
      </div>
      {msg&&<div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅")?"bg-green-50 border-green-300 text-green-800":"bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}
      {false&&(
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-700">New Exam Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[{k:"teacher_name",l:"Teacher Name *",p:"Teacher name"},{k:"teacher_id",l:"Teacher ID *",p:"Teacher ID"},{k:"subject",l:"Subject *",p:"e.g. Science"},{k:"section",l:"Section *",p:"e.g. Himalaya"},{k:"exam_date",l:"Exam Date",t:"date"},{k:"description",l:"Description",p:"Optional"}].map(f=>(
              <div key={f.k}>
                <label className="text-xs text-gray-500 block mb-1">{f.l}</label>
                <input type={f.t||"text"} value={(form as any)[f.k]} placeholder={f.p}
                  onChange={e=>setForm((p:any)=>({...p,[f.k]:e.target.value}))}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Grade *</label>
              <select value={form.grade} onChange={e=>setForm((p:any)=>({...p,grade:e.target.value}))} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
                <option value="">Select</option>
                {grades.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Exam Type *</label>
              <select value={form.exam_type} onChange={e=>setForm((p:any)=>({...p,exam_type:e.target.value}))} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
                {EXAM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Select Competencies</h4>
{loadingComps && <span className="text-xs text-indigo-500 animate-pulse">Loading competencies...</span>}
            </div>
            {competencies.length>0&&(
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {competencies.map((comp:any)=>{
                  const sel=selectedComps.find((c:any)=>c.competency_id===comp.id);
                  return (
                    <div key={comp.id} className={`px-3 py-2 flex items-center gap-3 ${sel?"bg-indigo-50":""}`}>
                      <input type="checkbox" checked={!!sel} onChange={()=>toggleComp(comp)} className="accent-indigo-600" />
                      <div className="flex-1">
                        <span className="text-xs font-medium text-indigo-700">[{comp.code}]</span>
                        <span className="text-xs text-gray-700 ml-2">{comp.name?.slice(0,80)}</span>
                      </div>
                      {sel&&(
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-gray-500">Marks:</label>
                          <input type="number" value={sel.max_marks} min={1} max={100}
                            onChange={e=>updateMaxMarks(comp.id,+e.target.value)}
                            className="border border-gray-300 rounded px-2 py-0.5 text-xs w-16 text-center" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {selectedComps.length>0&&(
              <div className="mt-3 bg-indigo-50 rounded-lg p-3">
                <p className="text-xs font-bold text-indigo-800 mb-2">{selectedComps.length} competencies · Total: {totalMarks} marks</p>
                {selectedComps.map((c:any)=>(
                  <div key={c.competency_id} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-indigo-700">[{c.competency_code}] {c.competency_name?.slice(0,50)}</span>
                    <span className="font-bold text-indigo-800">{c.max_marks} marks</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={saveConfig} disabled={saving} className="px-5 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
            {saving?"Saving...":"💾 Save Exam Config"}
          </button>
        </div>
      )}
      {loading?(
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Loading...</div>
      ):configs.filter((c:any)=>!filterGrade||c.grade===filterGrade).length===0?(
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400"><p className="text-2xl mb-2">📭</p><p className="text-sm">No configurations yet.</p></div>
      ):(
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b"><span className="text-sm font-semibold text-gray-700">{configs.filter((c:any)=>!filterGrade||c.grade===filterGrade).length} Configurations</span></div>
          <div className="divide-y divide-gray-100">
            {configs.filter((c:any)=>!filterGrade||c.grade===filterGrade).map((c:any)=>(
              <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">{c.exam_type}</span>
                    <span className="text-sm font-medium text-gray-800">{c.subject}</span>
                    <span className="text-xs text-gray-500">· {c.grade} {c.section} · {c.teacher_name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{(c.competencies as any[])?.length||0} competencies · Total: {c.total_marks} marks{c.exam_date?` · ${c.exam_date}`:""}</p>
                </div>
                <button onClick={()=>deleteConfig(c.id)} className="text-xs text-red-500 hover:text-red-700 ml-3">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MarksEntryTab({ academicYear }: any) {
  const [grade,setGrade]=useState("");
  const [section,setSection]=useState("");
  const [subject,setSubject]=useState("");
  const [examType,setExamType]=useState("FA1");
  const [grades,setGrades]=useState<string[]>([]);
  const [sections,setSections]=useState<string[]>([]);
  const [config,setConfig]=useState<any>(null);
  const [students,setStudents]=useState<any[]>([]);
  const [marks,setMarks]=useState<Record<string,Record<string,number|null>>>({});
  const [absent,setAbsent]=useState<Record<string,boolean>>({});
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");

  useEffect(()=>{fetchGrades();},[]);
  useEffect(()=>{if(grade)fetchSections();},[grade]);

  const fetchGrades=async()=>{try{const r=await axios.get(`${API}/students/stats`);setGrades((r.data?.byGrade||[]).map((g:any)=>g.grade).sort());}catch{}};
  const fetchSections=async()=>{try{const r=await axios.get(`${API}/students/sections/${encodeURIComponent(grade)}`);setSections(r.data?.sections||[]);}catch{}};

  const loadConfig=async()=>{
    if(!grade||!section||!subject||!examType){setMsg("❌ Fill all fields");return;}
    setLoading(true);setConfig(null);setStudents([]);
    try{
      const cr=await axios.get(`${API}/pasa/config/entry?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&subject=${encodeURIComponent(subject)}&exam_type=${examType}&academic_year=${academicYear}`);
      const cfg=cr.data;
      if(!cfg?.id){setMsg("❌ No config found. Create in Exam Configuration tab first.");setLoading(false);return;}
      setConfig(cfg);
      const sr=await axios.get(`${API}/pasa/marks/entry?exam_config_id=${cfg.id}&grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`);
      const sl=sr.data?.students||[];
      setStudents(sl);
      const im:Record<string,Record<string,number|null>>={};
      const ia:Record<string,boolean>={};
      sl.forEach((s:any)=>{
        im[s.student_id]={};
        ia[s.student_id]=s.existing_marks?.is_absent||false;
        const cs=s.existing_marks?.competency_scores||[];
        (cfg.competencies as any[]).forEach((c:any)=>{
          const ex=cs.find((x:any)=>x.competency_id===c.competency_id);
          im[s.student_id][c.competency_id]=ex?.marks_obtained??null;
        });
      });
      setMarks(im);setAbsent(ia);
    }catch{setMsg("❌ Failed to load.");}
    setLoading(false);
  };

  const calcTotal=(sid:string)=>{
    if(absent[sid]||!config)return{total:0,pct:0};
    let total=0;
    (config.competencies as any[]).forEach((c:any)=>{total+=+(marks[sid]?.[c.competency_id]||0);});
    return{total,pct:config.total_marks>0?+((total/config.total_marks)*100).toFixed(1):0};
  };

  const saveMarks=async()=>{
    if(!config||!students.length)return;
    setSaving(true);
    try{
      const entries=students.map((s:any)=>({
        student_id:s.student_id,student_name:s.student_name,is_absent:absent[s.student_id]||false,
        competency_scores:(config.competencies as any[]).map((c:any)=>({
          competency_id:c.competency_id,competency_code:c.competency_code,competency_name:c.competency_name,
          marks_obtained:absent[s.student_id]?null:(marks[s.student_id]?.[c.competency_id]??null),
          max_marks:c.max_marks,
        })),
      }));
      await axios.post(`${API}/pasa/marks`,{exam_config_id:config.id,grade,section,subject,exam_type:examType,academic_year:academicYear,teacher_id:config.teacher_id,entries});
      setMsg("✅ Marks saved!");
    }catch{setMsg("❌ Save failed.");}
    setSaving(false);setTimeout(()=>setMsg(""),3000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div><label className="text-xs text-gray-500 block mb-1">Grade</label>
          <select value={grade} onChange={e=>setGrade(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
            <option value="">Select</option>{grades.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
        <div><label className="text-xs text-gray-500 block mb-1">Section</label>
          <select value={section} onChange={e=>setSection(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
            <option value="">Select</option>{sections.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        <div><label className="text-xs text-gray-500 block mb-1">Subject</label>
          <input type="text" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Science" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" /></div>
        <div><label className="text-xs text-gray-500 block mb-1">Exam Type</label>
          <select value={examType} onChange={e=>setExamType(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
            {EXAM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div className="flex items-end">
          <button onClick={loadConfig} disabled={loading} className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
            {loading?"Loading...":"Load"}</button></div>
      </div>
      {msg&&<div className={`px-4 py-2 rounded text-sm border ${msg.startsWith("✅")?"bg-green-50 border-green-300 text-green-800":"bg-red-50 border-red-300 text-red-800"}`}>{msg}</div>}
      {config&&students.length>0&&(
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-bold text-indigo-800">{config.exam_type} — {config.subject} · {grade} {section}</p>
              <p className="text-xs text-indigo-600">{(config.competencies as any[]).length} competencies · Total: {config.total_marks} marks</p>
            </div>
            <button onClick={saveMarks} disabled={saving} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
              {saving?"Saving...":"💾 Save All Marks"}</button>
          </div>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-indigo-700 text-white">
                    <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 z-10 min-w-[160px]">Student</th>
                    <th className="px-2 py-2 text-center w-16">Absent</th>
                    {(config.competencies as any[]).map((c:any)=>(
                      <th key={c.competency_id} className="px-2 py-2 text-center min-w-[80px]">
                        <div className="text-xs font-medium">{c.competency_code}</div>
                        <div className="text-xs text-indigo-200">/{c.max_marks}</div>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center min-w-[60px]">Total/{config.total_marks}</th>
                    <th className="px-2 py-2 text-center min-w-[50px]">%</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s:any,i:number)=>{
                    const {total,pct}=calcTotal(s.student_id);
                    const isAbs=absent[s.student_id];
                    const band=pct>0?getBand(pct):null;
                    return (
                      <tr key={s.student_id} className={i%2===0?"bg-white":"bg-gray-50"}>
                        <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit">{s.student_name}</td>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={isAbs} onChange={e=>setAbsent(p=>({...p,[s.student_id]:e.target.checked}))} className="accent-red-500" /></td>
                        {(config.competencies as any[]).map((c:any)=>(
                          <td key={c.competency_id} className="px-2 py-2 text-center">
                            <input type="number" min={0} max={c.max_marks}
                              value={marks[s.student_id]?.[c.competency_id]??""}
                              disabled={isAbs}
                              onChange={e=>{
                                const v=e.target.value===""?null:Math.min(+e.target.value,c.max_marks);
                                setMarks(p=>({...p,[s.student_id]:{...p[s.student_id],[c.competency_id]:v}}));
                              }}
                              className="border border-gray-300 rounded px-1 py-0.5 w-14 text-center text-xs disabled:bg-gray-100" />
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center font-bold text-gray-700">
                          {isAbs?<span className="text-red-500 text-xs">Absent</span>:total}</td>
                        <td className="px-2 py-2 text-center">
                          {!isAbs&&pct>0&&band&&<span className={`px-1.5 py-0.5 rounded text-xs font-bold ${band.color}`}>{pct}%</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={saveMarks} disabled={saving} className="px-6 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
            {saving?"Saving...":"💾 Save All Marks"}</button>
        </div>
      )}
    </div>
  );
}

function PASADashboardTab({ academicYear }: any) {
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

  const fetchGrades=async()=>{try{const r=await axios.get(`${API}/students/stats`);setGrades((r.data?.byGrade||[]).map((g:any)=>g.grade).sort());}catch{}};
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
      {!loading&&dashTab==="alerts"&&data&&(
        <div className="space-y-3">
          {data.alerts?.length===0?(
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
  const API = "https://cbas-backend-production.up.railway.app";
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
