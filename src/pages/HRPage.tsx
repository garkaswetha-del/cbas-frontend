import { useState, useEffect, useRef, Fragment } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { getAPI } from "../utils/api";

const API = getAPI();

function normaliseKey(k: string) { return k.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function pick(row: any, ...candidates: string[]) {
  for (const c of candidates) {
    const hit = Object.keys(row).find(k => normaliseKey(k) === normaliseKey(c));
    if (hit && row[hit] !== undefined && row[hit] !== null && String(row[hit]).trim() !== "") return String(row[hit]).trim();
  }
  return "";
}
function fmtMoney(n: any) { return n === null || n === undefined || n === "" ? "—" : `₹${Number(n).toLocaleString("en-IN")}`; }
function fmtDate(d: any) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }

const STAGE_LABELS: Record<string, string> = {
  applied: "Applied", shortlisted: "Shortlisted", interview_scheduled: "Interview Scheduled",
  interviewed: "Interviewed", selected: "Selected", rejected: "Rejected", hired: "Hired",
};
const STAGE_COLORS: Record<string, string> = {
  applied: "bg-gray-100 text-gray-600", shortlisted: "bg-blue-100 text-blue-700",
  interview_scheduled: "bg-yellow-100 text-yellow-700", interviewed: "bg-purple-100 text-purple-700",
  selected: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700", hired: "bg-emerald-100 text-emerald-700",
};

type HiringSubTab = "applications" | "shortlist" | "interviews" | "scores" | "selection" | "induction";

export default function HRPage() {
  const [hiringSubTab, setHiringSubTab] = useState<HiringSubTab>("applications");

  const SUB_TABS: { id: HiringSubTab; label: string }[] = [
    { id: "applications", label: "Applications" },
    { id: "shortlist", label: "Shortlist" },
    { id: "interviews", label: "Interviews" },
    { id: "scores", label: "Scores" },
    { id: "selection", label: "Selection" },
    { id: "induction", label: "Induction" },
  ];

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">HR — Hiring</h1>
        <p className="text-sm text-gray-500">Applications → Shortlist → Interview → Score → Select → Induction</p>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setHiringSubTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
              hiringSubTab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {hiringSubTab === "applications" && <ApplicationsTab />}
      {hiringSubTab === "shortlist" && <ShortlistTab />}
      {hiringSubTab === "interviews" && <InterviewsTab />}
      {hiringSubTab === "scores" && <ScoresTab />}
      {hiringSubTab === "selection" && <SelectionTab />}
      {hiringSubTab === "induction" && <InductionAdminTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// APPLICATIONS
// ─────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "", email: "", contact_no: "", address: "", locality: "",
  qualification: "", experience_years: "", experience_detail: "", skills: "",
  guardian_name: "", religion: "", caste: "",
  previous_salary: "", expected_salary: "", subject_applied_for: "", school_stage: "", source_portal: "",
};

function ApplicationsTab() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [resumeFile, setResumeFile] = useState<string>("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);
  const resumesRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [uploadingResumes, setUploadingResumes] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/hr/applicants`, { params: { search: search || undefined, stage: stageFilter || undefined } });
      setApplicants(r.data || []);
    } catch { setApplicants([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, stageFilter]);

  const handleResumeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setResumeFile(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveNew = async () => {
    if (!form.name) { setMessage("❌ Name is required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/hr/applicants`, { ...form, resume_file: resumeFile || undefined });
      setMessage("✅ Applicant added");
      setForm(EMPTY_FORM); setResumeFile(""); setResumeFileName(""); setShowAdd(false);
      load();
    } catch { setMessage("❌ Error saving applicant"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const wb = XLSX.read(ev.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const parsed = rows.map(row => ({
        name: pick(row, "Name", "Candidate Name"),
        email: pick(row, "Email", "Email ID"),
        contact_no: pick(row, "Contact", "Phone", "Mobile", "Contact No"),
        address: pick(row, "Address"),
        locality: pick(row, "Locality", "Area", "Where they stay", "Location"),
        qualification: pick(row, "Qualification", "Education"),
        experience_years: pick(row, "Experience", "Experience (Years)", "Years of Experience") || undefined,
        experience_detail: pick(row, "Experience Detail"),
        skills: pick(row, "Skills", "Skill Set", "Key Skills"),
        guardian_name: pick(row, "Father Name", "Husband Name", "Father/Husband Name", "Guardian"),
        religion: pick(row, "Religion"),
        caste: pick(row, "Caste"),
        previous_salary: pick(row, "Previous Salary", "Current Salary") || undefined,
        expected_salary: pick(row, "Expected Salary") || undefined,
        subject_applied_for: pick(row, "Subject", "Subject Applied For", "Applying For"),
        source_portal: pick(row, "Portal", "Source"),
      })).filter(r => r.name || r.email || r.contact_no);
      if (parsed.length === 0) { setMessage("❌ No usable rows found in that file"); setTimeout(() => setMessage(""), 3000); return; }
      setImporting(true);
      try {
        const r = await axios.post(`${API}/hr/applicants/bulk`, { rows: parsed });
        setMessage(`✅ Imported ${r.data?.saved ?? parsed.length} applicants`);
        load();
      } catch { setMessage("❌ Error importing file"); }
      setImporting(false);
      setTimeout(() => setMessage(""), 4000);
      if (xlsxRef.current) xlsxRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleResumesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingResumes(true);
    setMessage("");
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append("files", f));
      const r = await axios.post(`${API}/hr/applicants/upload-resumes`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const failed = (r.data?.results || []).filter((x: any) => !x.created);
      setMessage(
        `✅ Parsed ${r.data?.created ?? 0} of ${r.data?.total ?? files.length} resume(s)` +
        (failed.length ? ` — couldn't read: ${failed.map((f: any) => f.filename).join(", ")}` : "")
      );
      load();
    } catch {
      setMessage("❌ Error uploading resumes");
    }
    setUploadingResumes(false);
    setTimeout(() => setMessage(""), 6000);
    if (resumesRef.current) resumesRef.current.value = "";
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, subject, locality..."
          className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]" />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">All stages</option>
          {Object.entries(STAGE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button onClick={() => resumesRef.current?.click()} disabled={uploadingResumes} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
          {uploadingResumes ? "Reading resumes..." : "📄 Upload Resumes (PDF/Word)"}
        </button>
        <input ref={resumesRef} type="file" accept=".pdf,.docx" multiple onChange={handleResumesUpload} className="hidden" />
        <button onClick={() => setShowAdd(s => !s)} className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded-lg hover:bg-gray-50 font-medium">
          {showAdd ? "Cancel" : "+ Add Manually"}
        </button>
        <button onClick={() => xlsxRef.current?.click()} disabled={importing} className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded-lg hover:bg-gray-50 font-medium">
          {importing ? "Importing..." : "⬆ Import Excel"}
        </button>
        <input ref={xlsxRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
      </div>
      <p className="text-xs text-gray-400 -mt-2 mb-4">
        "Upload Resumes" is the normal way in — pick one or more PDF/Word resumes and each becomes its own applicant, auto-filled from the file.
        "Import Excel" is only for when you already have a spreadsheet of candidates typed out somewhere.
      </p>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      {showAdd && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">New Applicant</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              ["name", "Name *"], ["email", "Email"], ["contact_no", "Contact No"],
              ["locality", "Locality / Where they stay"], ["qualification", "Qualification"], ["experience_years", "Experience (years)"],
              ["subject_applied_for", "Subject Applying For"], ["skills", "Skills"], ["guardian_name", "Father/Husband Name"], ["religion", "Religion"],
              ["caste", "Caste"], ["previous_salary", "Previous Salary"], ["expected_salary", "Expected Salary"],
              ["source_portal", "Source Portal"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 block mb-1">{label}</label>
                <input value={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Stage Applying For</label>
              <select value={form.school_stage || ""} onChange={e => setForm((f: any) => ({ ...f, school_stage: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                <option value="">— Select —</option>
                {["Foundation", "Preparatory", "Middle", "Secondary"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Address</label>
              <input value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Resume (optional)</label>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleResumeFile} className="text-xs" />
              {resumeFileName && <p className="text-xs text-gray-400 mt-1">{resumeFileName}</p>}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Leave anything blank if it's not on the resume — nothing here is required except name.</p>
          <button onClick={saveNew} disabled={saving} className="mt-3 px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold">
            {saving ? "Saving..." : "Save Applicant"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : applicants.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No applicants yet</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">Qualification</th>
                <th className="px-3 py-2 text-left">Experience</th>
                <th className="px-3 py-2 text-left">Locality</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-center">Stage</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map(a => (
                <Fragment key={a.id}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                    <td className="px-3 py-2 font-medium text-gray-800">{a.name || "—"}</td>
                    <td className="px-3 py-2">{a.subject_applied_for || "—"}</td>
                    <td className="px-3 py-2">{a.qualification || "—"}</td>
                    <td className="px-3 py-2">{a.experience_years ? `${a.experience_years} yrs` : "—"}</td>
                    <td className="px-3 py-2">{a.locality || "—"}</td>
                    <td className="px-3 py-2">{a.contact_no || a.email || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[a.stage] || "bg-gray-100 text-gray-500"}`}>
                        {STAGE_LABELS[a.stage] || a.stage}
                      </span>
                    </td>
                  </tr>
                  {expanded === a.id && (
                    <tr className="bg-indigo-50/40">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div><span className="text-gray-400">Email:</span> {a.email || "—"}</div>
                          <div><span className="text-gray-400">Address:</span> {a.address || "—"}</div>
                          <div className="col-span-2 sm:col-span-4"><span className="text-gray-400">Skills:</span> {a.skills || "—"}</div>
                          <div><span className="text-gray-400">Father/Husband:</span> {a.guardian_name || "—"}</div>
                          <div><span className="text-gray-400">Religion:</span> {a.religion || "—"}</div>
                          <div><span className="text-gray-400">Caste:</span> {a.caste || "—"}</div>
                          <div><span className="text-gray-400">Previous Salary:</span> {fmtMoney(a.previous_salary)}</div>
                          <div><span className="text-gray-400">Expected Salary:</span> {fmtMoney(a.expected_salary)}</div>
                          <div><span className="text-gray-400">Source:</span> {a.source_portal || "—"}</div>
                          <div><span className="text-gray-400">Applied:</span> {fmtDate(a.created_at)}</div>
                          {a.resume_file && <div><a href={a.resume_file} download={`${a.name || "resume"}`} className="text-indigo-600 underline">Resume</a></div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHORTLIST
// ─────────────────────────────────────────────────────────────────
function ShortlistTab() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyShortlisted, setOnlyShortlisted] = useState(true);
  const [qualFilter, setQualFilter] = useState("");
  const [minExp, setMinExp] = useState("");
  const [localityFilter, setLocalityFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/hr/applicants`);
      setApplicants(r.data || []);
    } catch { setApplicants([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (a: any) => {
    try {
      await axios.patch(`${API}/hr/applicants/${a.id}/shortlist`, { is_shortlisted: !a.is_shortlisted });
      load();
    } catch {}
  };

  const filtered = applicants.filter(a => {
    if (onlyShortlisted && !a.is_shortlisted) return false;
    if (qualFilter && !(a.qualification || "").toLowerCase().includes(qualFilter.toLowerCase())) return false;
    if (minExp && Number(a.experience_years || 0) < Number(minExp)) return false;
    if (localityFilter && !(a.locality || "").toLowerCase().includes(localityFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="flex items-center gap-1.5 text-sm text-gray-700">
          <input type="checkbox" checked={onlyShortlisted} onChange={e => setOnlyShortlisted(e.target.checked)} className="accent-indigo-600" />
          Shortlisted only
        </label>
        <input value={qualFilter} onChange={e => setQualFilter(e.target.value)} placeholder="Filter: qualification"
          className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
        <input value={minExp} onChange={e => setMinExp(e.target.value)} placeholder="Min experience (yrs)" type="number"
          className="border border-gray-300 rounded px-2 py-1.5 text-xs w-40" />
        <input value={localityFilter} onChange={e => setLocalityFilter(e.target.value)} placeholder="Filter: locality"
          className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No candidates match</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2 text-center">Shortlist</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">Qualification</th>
                <th className="px-3 py-2 text-left">Experience</th>
                <th className="px-3 py-2 text-left">Locality</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={a.is_shortlisted} onChange={() => toggle(a)} className="w-4 h-4 accent-indigo-600" />
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-800">{a.name || "—"}</td>
                  <td className="px-3 py-2">{a.subject_applied_for || "—"}</td>
                  <td className="px-3 py-2">{a.qualification || "—"}</td>
                  <td className="px-3 py-2">{a.experience_years ? `${a.experience_years} yrs` : "—"}</td>
                  <td className="px-3 py-2">{a.locality || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// INTERVIEWS
// ─────────────────────────────────────────────────────────────────
function InterviewsTab() {
  const [dateFilter, setDateFilter] = useState("");
  const [interviews, setInterviews] = useState<any[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [shortlisted, setShortlisted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedForm, setSchedForm] = useState({ applicant_id: "", interview_date: "", slot_time: "", interviewer_name: "" });
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [iv, cnt, apps] = await Promise.all([
        axios.get(`${API}/hr/interviews`, { params: { date: dateFilter || undefined } }),
        axios.get(`${API}/hr/interviews/counts-by-date`),
        axios.get(`${API}/hr/applicants`, { params: { shortlisted: "true" } }),
      ]);
      setInterviews(iv.data || []);
      setCounts(cnt.data || []);
      setShortlisted(apps.data || []);
    } catch { setInterviews([]); setCounts([]); setShortlisted([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [dateFilter]);

  const stored = localStorage.getItem("cbas_user");
  const currentUser = stored ? JSON.parse(stored) : null;

  const schedule = async () => {
    if (!schedForm.applicant_id || !schedForm.interview_date) { setMessage("❌ Pick a candidate and a date"); setTimeout(() => setMessage(""), 3000); return; }
    try {
      await axios.post(`${API}/hr/interviews/schedule`, { ...schedForm, scheduled_by: currentUser?.name });
      setMessage("✅ Interview scheduled");
      setSchedForm({ applicant_id: "", interview_date: "", slot_time: "", interviewer_name: "" });
      load();
    } catch { setMessage("❌ Error scheduling"); }
    setTimeout(() => setMessage(""), 3000);
  };

  const notify = async (id: string) => { await axios.patch(`${API}/hr/interviews/${id}/notified`); load(); };
  const attendance = async (id: string, attended: boolean) => { await axios.patch(`${API}/hr/interviews/${id}/attendance`, { attended }); load(); };

  const [questionsMap, setQuestionsMap] = useState<Record<string, string[]>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null);
  const genQuestions = async (applicantId: string) => {
    setLoadingQuestions(applicantId);
    try {
      const r = await axios.get(`${API}/hr/applicants/${applicantId}/interview-questions`);
      setQuestionsMap(p => ({ ...p, [applicantId]: r.data?.questions || [] }));
    } catch { setQuestionsMap(p => ({ ...p, [applicantId]: [] })); }
    setLoadingQuestions(null);
  };

  return (
    <div>
      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Schedule an interview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Candidate (shortlisted)</label>
            <select value={schedForm.applicant_id} onChange={e => setSchedForm(f => ({ ...f, applicant_id: e.target.value }))}
              className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
              <option value="">-- Select --</option>
              {shortlisted.map(a => <option key={a.id} value={a.id}>{a.name} · {a.subject_applied_for}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Date</label>
            <input type="date" value={schedForm.interview_date} onChange={e => setSchedForm(f => ({ ...f, interview_date: e.target.value }))}
              className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Time slot</label>
            <input value={schedForm.slot_time} onChange={e => setSchedForm(f => ({ ...f, slot_time: e.target.value }))} placeholder="10:30 AM"
              className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Interviewer</label>
            <input value={schedForm.interviewer_name} onChange={e => setSchedForm(f => ({ ...f, interviewer_name: e.target.value }))}
              className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
          </div>
        </div>
        <button onClick={schedule} className="mt-3 px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-semibold">Schedule</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-xs text-gray-500">Filter by date:</label>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
        {dateFilter && <button onClick={() => setDateFilter("")} className="text-xs text-indigo-600 underline">Clear</button>}
        <div className="flex flex-wrap gap-1.5 ml-2">
          {counts.map((c: any) => (
            <button key={c.interview_date} onClick={() => setDateFilter(c.interview_date)}
              className={`px-2 py-1 rounded-full text-xs border ${dateFilter === c.interview_date ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300"}`}>
              {fmtDate(c.interview_date)} ({c.count})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : interviews.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No interviews {dateFilter ? "on this date" : "scheduled yet"}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2 text-left">Candidate</th>
                <th className="px-3 py-2 text-left">Date / Time</th>
                <th className="px-3 py-2 text-left">Interviewer</th>
                <th className="px-3 py-2 text-center">Notified</th>
                <th className="px-3 py-2 text-center">Attendance</th>
                <th className="px-3 py-2 text-center">NCF Questions</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((iv: any) => (
                <>
                <tr key={iv.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{iv.applicant?.name || "—"}</td>
                  <td className="px-3 py-2">{fmtDate(iv.interview_date)} {iv.slot_time}</td>
                  <td className="px-3 py-2">{iv.interviewer_name || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    {iv.candidate_notified
                      ? <span className="text-green-600">✓ Notified</span>
                      : <button onClick={() => notify(iv.id)} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">Mark Notified</button>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {iv.attended === true && <span className="text-green-600">✓ Attended</span>}
                    {iv.attended === false && <span className="text-red-500">✗ Absent</span>}
                    {iv.attended === null && (
                      <span className="inline-flex gap-1">
                        <button onClick={() => attendance(iv.id, true)} className="px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200">Attended</button>
                        <button onClick={() => attendance(iv.id, false)} className="px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200">Absent</button>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => genQuestions(iv.applicant_id)} disabled={loadingQuestions === iv.applicant_id}
                      className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50">
                      {loadingQuestions === iv.applicant_id ? "Generating..." : questionsMap[iv.applicant_id] ? "🔄 Regenerate" : "🤖 Generate"}
                    </button>
                  </td>
                </tr>
                {questionsMap[iv.applicant_id] && (
                  <tr className="border-b border-gray-100 bg-purple-50">
                    <td colSpan={6} className="px-4 py-3">
                      {questionsMap[iv.applicant_id].length === 0 ? (
                        <p className="text-gray-400">No questions generated — check the Groq API key is configured.</p>
                      ) : (
                        <ol className="list-decimal list-inside space-y-1 text-gray-700">
                          {questionsMap[iv.applicant_id].map((q, i) => <li key={i}>{q}</li>)}
                        </ol>
                      )}
                    </td>
                  </tr>
                )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCORES
// ─────────────────────────────────────────────────────────────────
function ScoresTab() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/hr/interviews`);
      const attended = (r.data || []).filter((iv: any) => iv.attended === true);
      setInterviews(attended);
      const initial: Record<string, any> = {};
      attended.forEach((iv: any) => {
        initial[iv.id] = {
          written_marks: iv.written_marks ?? "", written_max: iv.written_max ?? "",
          oral_marks: iv.oral_marks ?? "", oral_max: iv.oral_max ?? "",
          demo_marks: iv.demo_marks ?? "", demo_max: iv.demo_max ?? "",
          notes: iv.notes ?? "",
        };
      });
      setEdits(initial);
    } catch { setInterviews([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (id: string) => {
    setSaving(id);
    try {
      const e = edits[id];
      await axios.patch(`${API}/hr/interviews/${id}/scores`, {
        written_marks: e.written_marks === "" ? null : Number(e.written_marks),
        written_max: e.written_max === "" ? null : Number(e.written_max),
        oral_marks: e.oral_marks === "" ? null : Number(e.oral_marks),
        oral_max: e.oral_max === "" ? null : Number(e.oral_max),
        demo_marks: e.demo_marks === "" ? null : Number(e.demo_marks),
        demo_max: e.demo_max === "" ? null : Number(e.demo_max),
        notes: e.notes,
      });
      setMessage("✅ Scores saved");
      load();
    } catch { setMessage("❌ Error saving scores"); }
    setSaving(null);
    setTimeout(() => setMessage(""), 3000);
  };

  const field = (id: string, key: string) => (
    <input
      type="number" step="0.5"
      value={edits[id]?.[key] ?? ""}
      onChange={e => setEdits(prev => ({ ...prev, [id]: { ...prev[id], [key]: e.target.value } }))}
      className="border border-gray-300 rounded px-1.5 py-1 text-xs w-16 text-right"
    />
  );

  return (
    <div>
      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : interviews.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No attended interviews to score yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="px-3 py-2 text-left">Candidate</th>
                  <th className="px-3 py-2 text-center" colSpan={2}>Written</th>
                  <th className="px-3 py-2 text-center" colSpan={2}>Oral</th>
                  <th className="px-3 py-2 text-center" colSpan={2}>Demo</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                  <th className="px-3 py-2 text-center">Save</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((iv: any) => (
                  <tr key={iv.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">{iv.applicant?.name || "—"}</td>
                    <td className="px-1 py-2">{field(iv.id, "written_marks")}</td>
                    <td className="px-1 py-2 text-gray-400">/ {field(iv.id, "written_max")}</td>
                    <td className="px-1 py-2">{field(iv.id, "oral_marks")}</td>
                    <td className="px-1 py-2 text-gray-400">/ {field(iv.id, "oral_max")}</td>
                    <td className="px-1 py-2">{field(iv.id, "demo_marks")}</td>
                    <td className="px-1 py-2 text-gray-400">/ {field(iv.id, "demo_max")}</td>
                    <td className="px-2 py-2">
                      <input value={edits[iv.id]?.notes ?? ""} onChange={e => setEdits(prev => ({ ...prev, [iv.id]: { ...prev[iv.id], notes: e.target.value } }))}
                        className="border border-gray-300 rounded px-1.5 py-1 text-xs w-32" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => save(iv.id)} disabled={saving === iv.id} className="px-2.5 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                        {saving === iv.id ? "..." : "💾"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SELECTION
// ─────────────────────────────────────────────────────────────────
function SelectionTab() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [emailPrompt, setEmailPrompt] = useState<{ id: string; email: string } | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [letter, setLetter] = useState<{ name: string; dataUri: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/hr/interviews`);
      const scored = (r.data || []).filter((iv: any) => iv.attended === true && iv.result === 'pending');
      scored.sort((a: any, b: any) => total(b) - total(a));
      setInterviews(scored);
    } catch { setInterviews([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const total = (iv: any) => (Number(iv.written_marks) || 0) + (Number(iv.oral_marks) || 0) + (Number(iv.demo_marks) || 0);
  const totalMax = (iv: any) => (Number(iv.written_max) || 0) + (Number(iv.oral_max) || 0) + (Number(iv.demo_max) || 0);

  const decide = async (iv: any, result: "selected" | "rejected" | "hold", email?: string) => {
    setDeciding(iv.id);
    try {
      const r = await axios.patch(`${API}/hr/interviews/${iv.id}/decide`, { result, email });
      if (result === "selected" && r.data?.temp_password) {
        setMessage(`✅ ${iv.applicant?.name} selected. Login created — temp password: ${r.data.temp_password} (share this with them; induction has been assigned)`);
      } else {
        setMessage(`✅ Marked ${result}`);
      }
      if (result === "selected" && r.data?.applicant_id) {
        try {
          const a = await axios.get(`${API}/hr/applicants/${r.data.applicant_id}`);
          if (a.data?.appointment_letter) setLetter({ name: a.data.name || "Candidate", dataUri: a.data.appointment_letter });
        } catch {}
      }
      setEmailPrompt(null);
      load();
    } catch (e: any) {
      setMessage("❌ " + (e?.response?.data?.message || "Error"));
    }
    setDeciding(null);
  };

  const trySelect = (iv: any) => {
    if (!iv.applicant?.email) { setEmailPrompt({ id: iv.id, email: "" }); return; }
    decide(iv, "selected");
  };

  return (
    <div>
      {message && (
        <div className="mb-4 px-4 py-2 rounded text-sm border bg-green-50 border-green-300 text-green-800 flex items-center justify-between flex-wrap gap-2">
          <span>{message}</span>
          {letter && (
            <a href={letter.dataUri} download={`${letter.name.replace(/\s+/g, "_")}_Appointment_Letter.pdf`}
              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 font-semibold whitespace-nowrap">
              ⬇ Download Appointment Letter
            </a>
          )}
        </div>
      )}

      {emailPrompt && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
          <p className="text-xs text-yellow-800 mb-2">No email on file for this candidate — needed to create their login.</p>
          <div className="flex gap-2">
            <input value={emailPrompt.email} onChange={e => setEmailPrompt(p => p && { ...p, email: e.target.value })} placeholder="email@example.com"
              className="border border-gray-300 rounded px-2 py-1 text-xs flex-1" />
            <button onClick={() => { const iv = interviews.find(i => i.id === emailPrompt.id); if (iv) decide(iv, "selected", emailPrompt.email); }}
              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Confirm & Select</button>
            <button onClick={() => setEmailPrompt(null)} className="px-3 py-1 bg-gray-100 text-xs rounded hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : interviews.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No scored, pending candidates right now</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2 text-left">Candidate</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-center">Decision</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((iv: any) => (
                <tr key={iv.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{iv.applicant?.name || "—"}</td>
                  <td className="px-3 py-2">{iv.applicant?.subject_applied_for || "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{total(iv)} / {totalMax(iv) || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex gap-1">
                      <button onClick={() => trySelect(iv)} disabled={deciding === iv.id} className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50">Select</button>
                      <button onClick={() => decide(iv, "hold")} disabled={deciding === iv.id} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50">Hold</button>
                      <button onClick={() => decide(iv, "rejected")} disabled={deciding === iv.id} className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50">Reject</button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// INDUCTION (admin side)
// ─────────────────────────────────────────────────────────────────
function InductionAdminTab() {
  const [videos, setVideos] = useState<any[]>([]);
  const [overview, setOverview] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoForm, setVideoForm] = useState({ title: "", description: "", video_url: "", duration_seconds: "", due_days: "" });
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [v, o, u] = await Promise.all([
        axios.get(`${API}/hr/induction/videos`),
        axios.get(`${API}/hr/induction/overview`),
        axios.get(`${API}/users`),
      ]);
      setVideos(v.data || []);
      setOverview(o.data || []);
      setUsers(u.data || []);
    } catch { setVideos([]); setOverview([]); setUsers([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addVideo = async () => {
    if (!videoForm.title || !videoForm.video_url) { setMessage("❌ Title and video URL are required"); return; }
    try {
      await axios.post(`${API}/hr/induction/videos`, {
        ...videoForm,
        duration_seconds: Number(videoForm.duration_seconds) || 0,
        due_days: videoForm.due_days ? Number(videoForm.due_days) : undefined,
        sort_order: videos.length,
      });
      setMessage("✅ Video added");
      setVideoForm({ title: "", description: "", video_url: "", duration_seconds: "", due_days: "" });
      setShowAddVideo(false);
      load();
    } catch { setMessage("❌ Error adding video"); }
    setTimeout(() => setMessage(""), 3000);
  };

  const byUser: Record<string, any[]> = {};
  overview.forEach((p: any) => { if (!byUser[p.user_id]) byUser[p.user_id] = []; byUser[p.user_id].push(p); });

  const nameFor = (userId: string) => users.find(u => u.id === userId)?.name || userId;

  const hire = async (userId: string) => {
    if (!confirm(`Mark ${nameFor(userId)} as hired? This gives them full teacher access.`)) return;
    try {
      await axios.patch(`${API}/hr/induction/hire/${userId}`);
      setMessage("✅ Hired — they'll now go through the normal teacher setup on next login");
      load();
    } catch { setMessage("❌ Error"); }
    setTimeout(() => setMessage(""), 4000);
  };

  return (
    <div>
      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">Induction Videos</h3>
          <button onClick={() => setShowAddVideo(s => !s)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-medium">
            {showAddVideo ? "Cancel" : "+ Add Video"}
          </button>
        </div>
        {showAddVideo && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 items-end">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Title</label>
              <input value={videoForm.title} onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Direct video URL (.mp4)</label>
              <input value={videoForm.video_url} onChange={e => setVideoForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://..." className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Duration (seconds)</label>
              <input type="number" value={videoForm.duration_seconds} onChange={e => setVideoForm(f => ({ ...f, duration_seconds: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Description</label>
              <input value={videoForm.description} onChange={e => setVideoForm(f => ({ ...f, description: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Due in (days)</label>
              <input type="number" value={videoForm.due_days} onChange={e => setVideoForm(f => ({ ...f, due_days: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
            </div>
            <button onClick={addVideo} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-semibold">Save</button>
          </div>
        )}
        {loading ? <p className="text-xs text-gray-400">Loading…</p> : videos.length === 0 ? (
          <p className="text-xs text-gray-400">No induction videos yet — new selects won't have anything assigned until you add some.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {videos.map(v => (
              <li key={v.id} className="flex items-center justify-between border-b border-gray-100 py-1.5">
                <span>{v.title} {!v.is_active && <span className="text-gray-400">(inactive)</span>}</span>
                <span className="text-gray-400">{v.duration_seconds ? `${Math.round(v.duration_seconds / 60)} min` : "—"} {v.due_days ? `· due in ${v.due_days}d` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-700">Candidates in Induction</h3>
        </div>
        {Object.keys(byUser).length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nobody in induction right now</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2 text-left">Candidate</th>
                <th className="px-3 py-2 text-left">Progress</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byUser).map(([userId, rows]) => {
                const done = rows.filter(r => r.completed).length;
                const allDone = done === rows.length;
                return (
                  <tr key={userId} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">{nameFor(userId)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {rows.map((r: any) => (
                          <span key={r.id} title={r.video?.title} className={`px-1.5 py-0.5 rounded text-xs ${r.completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {r.completed ? "✓" : `${r.video?.duration_seconds ? Math.round((Number(r.watched_seconds) / r.video.duration_seconds) * 100) : 0}%`} {r.video?.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {allDone
                        ? <button onClick={() => hire(userId)} className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium">Hire</button>
                        : <span className="text-gray-400">{done}/{rows.length} done</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
